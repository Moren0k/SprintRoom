import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
}) {
  return (
    <button
      className={classNames(
        buttonClasses(variant),
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className,
  variant = "secondary",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly href: string;
  readonly variant?: ButtonVariant;
}) {
  return (
    <Link
      href={href}
      className={classNames(buttonClasses(variant), className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-6 shadow-xs backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow !== undefined && (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
          {title}
        </h1>
        {description !== undefined && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {actions !== undefined && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <div className="mt-2">{children}</div>
      {hint !== undefined && (
        <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        "w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNames(
        "min-h-28 w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        "w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function ErrorBanner({ message }: { readonly message: string }) {
  if (message.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { readonly message: string }) {
  if (message.length === 0) return null;
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--hairline)] bg-[var(--glass)] p-8 text-center">
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {action !== undefined && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value }: { readonly value: number }) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--hairline)]">
      <div
        className="h-full rounded-full bg-[var(--foreground)] transition-all"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

export function Pill({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--hairline)] bg-[var(--glass-strong)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
      {children}
    </span>
  );
}

export function LoadingBlock({ label = "Cargando..." }: { readonly label?: string }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-8 text-center">
      <div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-[var(--hairline)] border-t-[var(--foreground)]" />
        <p className="mt-3 text-sm text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

export function classNames(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

function buttonClasses(variant: ButtonVariant): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.98]";
  if (variant === "primary") {
    return `${base} bg-[var(--foreground)] text-[var(--background)] hover:opacity-85`;
  }
  if (variant === "danger") {
    return `${base} bg-red-600 text-white hover:bg-red-700`;
  }
  if (variant === "ghost") {
    return `${base} text-[var(--muted)] hover:bg-[var(--glass)] hover:text-[var(--foreground)]`;
  }
  return `${base} border border-[var(--hairline)] bg-[var(--glass)] text-[var(--foreground)] hover:bg-[var(--glass-strong)]`;
}
