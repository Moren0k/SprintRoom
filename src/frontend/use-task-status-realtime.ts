"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@insforge/sdk";

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

    async function connect(): Promise<ReturnType<typeof createClient> | null> {
      try {
        const tokenRes = await fetch("/api/auth/token");
        if (!tokenRes.ok || cancelled) return null;
        const body = (await tokenRes.json()) as {
          data?: { accessToken?: string };
        };
        const token = body.data?.accessToken;
        if (!token || cancelled) return null;

        const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? "";
        const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "";
        const client = createClient({ baseUrl, anonKey });

        client.setAccessToken(token);
        await client.realtime.connect();
        if (cancelled) {
          client.realtime.disconnect();
          return null;
        }

        const subResult = await client.realtime.subscribe(channel);
        if (!subResult.ok) {
          if (!cancelled) setIsConnected(false);
          client.realtime.disconnect();
          return null;
        }

        if (!cancelled) setIsConnected(true);

        const onDisconnect = () => {
          if (!cancelled) setIsConnected(false);
        };
        const onConnectError = () => {
          if (!cancelled) setIsConnected(false);
        };

        client.realtime.on("disconnect", onDisconnect);
        client.realtime.on("connect_error", onConnectError);

        client.realtime.on("task_status_changed", (raw: unknown) => {
          const payload =
            typeof raw === "object" && raw !== null
              ? (raw as Record<string, unknown>).payload ?? raw
              : raw;
          if (isValidPayload(payload)) {
            callbackRef.current(payload);
          }
        });

        return client;
      } catch {
        if (!cancelled) setIsConnected(false);
        return null;
      }
    }

    let client: ReturnType<typeof createClient> | null = null;

    void connect().then((c) => {
      client = c;
    });

    return () => {
      cancelled = true;
      if (client !== null) {
        client.realtime.disconnect();
      }
    };
  }, [projectId]);

  return { isConnected };
}
