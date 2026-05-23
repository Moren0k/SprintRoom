"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, apiRequest, getErrorMessage } from "./api-client";
import type { UserProfile } from "./types";

interface SessionContextValue {
  readonly user: UserProfile;
  readonly refresh: () => Promise<void>;
  readonly logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setStatus("loading");
      try {
        const profile = await fetchCurrentUser();
        if (cancelled) return;
        setUser(profile);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 401) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refresh() {
    const profile = await fetchCurrentUser();
    setUser(profile);
    setStatus("ready");
  }

  async function logout() {
    await apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => {
      // A failed logout should not trap the user in the UI.
    });
    setUser(null);
    router.replace("/login");
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-[var(--hairline)] border-t-[var(--foreground)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">Resolviendo sesion...</p>
        </div>
      </div>
    );
  }

  if (status === "error" || user === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] px-6 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-8 backdrop-blur-xl">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            No se pudo cargar la sesion
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">{errorMessage}</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-[var(--background)]"
          >
            Ir al inicio de sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === null) {
    throw new Error("useSession debe usarse dentro de SessionProvider.");
  }
  return context;
}

function fetchCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/account");
}
