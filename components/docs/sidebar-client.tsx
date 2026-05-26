"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { DocEntry } from "@/lib/docs/types";

export default function SidebarClient({
  docs,
}: {
  readonly docs: DocEntry[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentSlug = pathname.split("/").pop() ?? "";
  const currentTitle = docs.find((d) => d.slug === currentSlug)?.title;

  return (
    <>
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--hairline)] bg-[var(--glass)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--glass-strong)]"
        >
          <span className="truncate">
            {currentTitle ?? "Seleccionar documento"}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {open && (
          <div className="mt-1 rounded-xl border border-[var(--hairline)] bg-[var(--background)] p-1 shadow-sm">
            {docs.map((doc) => {
              const isActive = doc.slug === currentSlug;
              return (
                <Link
                  key={doc.slug}
                  href={`/documentacion/${doc.slug}`}
                  onClick={() => setOpen(false)}
                  className={classNames(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
                  )}
                >
                  <span className="truncate">{doc.title}</span>
                  {doc.isPrivate && (
                    <svg
                      className="h-3.5 w-3.5 shrink-0 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <aside className="hidden w-52 shrink-0 border-r border-[var(--hairline)] lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:p-5">
        <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Documentaci&oacute;n
        </h2>
        <nav className="space-y-1">
          {docs.map((doc) => {
            const isActive = doc.slug === currentSlug;
            return (
              <Link
                key={doc.slug}
                href={`/documentacion/${doc.slug}`}
                className={classNames(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]",
                )}
              >
                <span className="truncate">{doc.title}</span>
                {doc.isPrivate && (
                  <svg
                    className="h-3.5 w-3.5 shrink-0 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
