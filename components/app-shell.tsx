"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SessionProvider, useSession } from "@/src/frontend/session-context";
import { classNames } from "./ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: IconHome },
  { href: "/imagine", label: "Imagina", icon: IconSparkles },
  { href: "/projects", label: "Proyectos", icon: IconFolder },
  { href: "/tasks", label: "Mis tareas", icon: IconChecklist },
  { href: "/documentacion", label: "Docs", icon: IconBook },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--hairline)] bg-[var(--background)] lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--hairline)] px-5">
          <Link
            href="/dashboard"
            className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
          >
            SprintRoom
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                  active
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--hairline)] p-3">
          <Link
            href="/account"
            aria-label="Abrir cuenta y configuracion"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition hover:bg-[var(--glass)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--glass)] text-sm font-medium text-[var(--foreground)]">
              {(user.fullName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {user.systemRole}
              </p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
          >
            <IconLogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--hairline)] bg-[var(--background)]/80 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--foreground)] transition hover:bg-[var(--glass)]"
          aria-label="Abrir menú"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-[var(--foreground)]"
        >
          SprintRoom
        </Link>
        <Link
          href="/account"
          aria-label="Abrir cuenta y configuracion"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glass)] text-sm font-medium text-[var(--foreground)] outline-none transition hover:bg-[var(--glass-strong)] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25"
        >
          {(user.fullName ?? "?").charAt(0).toUpperCase()}
        </Link>
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--hairline)] bg-[var(--background)] transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--hairline)] px-5">
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            SprintRoom
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
            aria-label="Cerrar menú"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--hairline)] p-3">
          <Link
            href="/account"
            onClick={() => setSidebarOpen(false)}
            aria-label="Abrir cuenta y configuracion"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
          >
            <IconUser className="h-5 w-5 shrink-0" />
            {user.fullName}
          </Link>
          <button
            onClick={() => {
              logout();
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--glass)] hover:text-[var(--foreground)]"
          >
            <IconLogOut className="h-5 w-5 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-60">
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

type IconProps = { readonly className?: string };

function IconHome({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconSparkles({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function IconFolder({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconChecklist({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function IconBook({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function IconUser({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconLogOut({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IconMenu({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconX({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
