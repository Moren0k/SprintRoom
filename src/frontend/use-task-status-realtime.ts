"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserInsForgeClient } from "./insforge-client";

export interface TaskStatusChangedPayload {
  readonly projectId: string;
  readonly taskId: string;
  readonly userStoryId: string;
  readonly status: string;
  readonly isCompleted: boolean;
  readonly updatedOnUtc: string;
}

export function isValidPayload(
  value: unknown,
): value is TaskStatusChangedPayload {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.projectId === "string" &&
    typeof obj.taskId === "string" &&
    typeof obj.userStoryId === "string" &&
    typeof obj.status === "string" &&
    typeof obj.isCompleted === "boolean" &&
    typeof obj.updatedOnUtc === "string"
  );
}

export function useTaskStatusRealtime(
  projectId: string,
  onStatusChanged: (payload: TaskStatusChangedPayload) => void,
): { readonly isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onStatusChanged);

  useEffect(() => {
    callbackRef.current = onStatusChanged;
  });

  useEffect(() => {
    let cancelled = false;
    const channel = `project:${projectId}:tasks`;
    let retryTimer: number | null = null;
    let retryDelayMs = 1000;

    const client = getBrowserInsForgeClient();

    function scheduleReconnect() {
      if (cancelled || retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void connect();
      }, retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 15000);
    }

    async function connect(): Promise<void> {
      try {
        const tokenRes = await fetch("/api/auth/token");
        if (!tokenRes.ok || cancelled) {
          scheduleReconnect();
          return;
        }
        const body = (await tokenRes.json()) as {
          data?: { accessToken?: string };
        };
        const token = body.data?.accessToken;
        if (!token || cancelled) {
          scheduleReconnect();
          return;
        }

        client.setAccessToken(token);
        if (!client.realtime.isConnected) {
          await client.realtime.connect();
        }
        if (cancelled) {
          return;
        }

        const subResult = await client.realtime.subscribe(channel);
        if (!subResult.ok) {
          if (!cancelled) setIsConnected(false);
          scheduleReconnect();
          return;
        }

        if (!cancelled) {
          retryDelayMs = 1000;
          setIsConnected(true);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          scheduleReconnect();
        }
      }
    }

    const onDisconnect = () => {
      if (!cancelled) {
        setIsConnected(false);
        scheduleReconnect();
      }
    };
    const onConnect = () => {
      if (!cancelled) {
        setIsConnected(true);
      }
    };
    const onConnectError = () => {
      if (!cancelled) {
        setIsConnected(false);
        scheduleReconnect();
      }
    };
    const onTaskStatusChanged = (raw: unknown) => {
      const payload =
        typeof raw === "object" && raw !== null
          ? (raw as Record<string, unknown>).payload ?? raw
          : raw;
      if (isValidPayload(payload)) {
        callbackRef.current(payload);
      }
    };

    client.realtime.on("connect", onConnect);
    client.realtime.on("disconnect", onDisconnect);
    client.realtime.on("connect_error", onConnectError);
    client.realtime.on("task_status_changed", onTaskStatusChanged);

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      client.realtime.off("connect", onConnect);
      client.realtime.off("disconnect", onDisconnect);
      client.realtime.off("connect_error", onConnectError);
      client.realtime.off("task_status_changed", onTaskStatusChanged);
      void client.realtime.unsubscribe(channel);
    };
  }, [projectId]);

  return { isConnected };
}
