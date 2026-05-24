import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
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
  ...props
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-6 shadow-xs backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h2>
        {description !== undefined && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {actions !== undefined && <div className="shrink-0">{actions}</div>}
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
        "w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10",
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
        "min-h-28 w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10",
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
        "w-full rounded-xl border border-[var(--hairline)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)]/10",
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
    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-700 dark:text-red-200">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { readonly message: string }) {
  if (message.length === 0) return null;
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-200">
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

export function Pill({ children, className = "" }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <span className={`inline-flex rounded-full border border-[var(--hairline)] bg-[var(--glass-strong)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] ${className}`}>
      {children}
    </span>
  );
}

export const STATUS_PILL_COLORS: Record<string, string> = {
  not_started: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  testing: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
  review: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  completed: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Sin Empezar",
  in_progress: "En Desarrollo",
  testing: "Probando",
  review: "En Revisión",
  completed: "Completada",
};

export function StatusPill({ status }: { readonly status: string }) {
  return (
    <Pill className={STATUS_PILL_COLORS[status] ?? ""}>
      {STATUS_LABELS[status] ?? status}
    </Pill>
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
    "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
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
