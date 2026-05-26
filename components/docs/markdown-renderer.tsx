import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

export default function MarkdownRenderer({
  content,
}: {
  readonly content: string;
}) {
  return (
    <div className="prose prose-sm prose-zinc mx-auto w-full max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[[remarkGfm]]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-10 text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-8 text-lg font-medium tracking-tight text-[var(--foreground)]">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-7 text-[var(--muted)]">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-[var(--foreground)] underline underline-offset-2 decoration-[var(--hairline)] hover:decoration-[var(--foreground)] transition"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={
                href?.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc pl-6 text-[var(--muted)] marker:text-[var(--hairline)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal pl-6 text-[var(--muted)] marker:text-[var(--hairline)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1 leading-7">{children}</li>
          ),
          code: ({ children, className }) => {
            const isInline = className === undefined;
            if (isInline) {
              return (
                <code className="rounded-md bg-[var(--glass)] px-1.5 py-0.5 text-sm font-medium text-[var(--foreground)]">
                  {children}
                </code>
              );
            }
            return (
              <code className={className}>{children}</code>
            );
          },
          pre: ({ children }: { readonly children?: ReactNode }) => (
            <pre className="mb-6 overflow-x-auto rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] p-5 text-sm backdrop-blur-xl">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-2 border-[var(--foreground)] pl-5 italic text-[var(--muted)]">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-[var(--hairline)]" />
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ""}
              className="my-6 w-full rounded-2xl border border-[var(--hairline)]"
            />
          ),
          table: ({ children }) => (
            <div className="mb-6 overflow-x-auto rounded-2xl border border-[var(--hairline)]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--hairline)] bg-[var(--glass)]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-medium text-[var(--foreground)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-[var(--muted)]">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
