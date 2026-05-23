"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SessionProvider, useSession } from "@/src/frontend/session-context";
import { Button, classNames } from "./ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Proyectos" },
  { href: "/tasks", label: "Mis tareas" },
  { href: "/account", label: "Cuenta" },
] as const;

export default function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <SessionProvider>
      <ShellFrame>{children}</ShellFrame>
    </SessionProvider>
  );
}

function ShellFrame({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
            >
              SprintRoom
            </Link>
            <Button className="lg:hidden" variant="ghost" onClick={logout}>
              Salir
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {user.fullName}
              </p>
              <p className="text-xs text-[var(--muted)]">{user.systemRole}</p>
            </div>
            <Button variant="ghost" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
