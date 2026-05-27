"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Card, ErrorBanner, TextArea } from "./ui";
import { readSafeExternalUrl } from "@/src/frontend/safe-url";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlannedTask {
  title: string;
  description: string;
}

interface PlannedUserStory {
  title: string;
  description: string;
  tasks: PlannedTask[];
}

interface CompiledPlan {
  projectName: string;
  description: string;
  externalReference: string;
  userStories: PlannedUserStory[];
}

type Phase = "chat" | "review" | "creating" | "error";

export default function ImagineClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente para definir proyectos. Cuéntame qué idea tienes en mente: ¿qué problema quieres resolver? ¿Quién usará la solución? ¿Cuáles son las funcionalidades principales?",
    },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("chat");
  const [compiledPlan, setCompiledPlan] = useState<CompiledPlan | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  async function handleSend() {
    const text = input.trim();
    if (!text || chatLoading) return;

    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setChatLoading(true);
    setError("");

    try {
      const res = await fetch("/api/imagine/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al obtener respuesta.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleFinalize() {
    setChatLoading(true);
    setError("");

    try {
      const res = await fetch("/api/imagine/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Error al compilar el plan.");
      }

      setCompiledPlan(data.plan);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al compilar el plan.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handlePlanProject() {
    if (!compiledPlan) return;

    setPhase("creating");
    setError("");

    try {
      const res = await fetch("/api/imagine/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compiledPlan),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message ?? data.error ?? "Error al crear el proyecto.";
        throw new Error(msg);
      }

      const projectId = data.data?.projectId ?? data.projectId;
      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el proyecto.");
      setPhase("review");
    }
  }

  function handleBackToChat() {
    setPhase("chat");
    setCompiledPlan(null);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (phase === "review") return;
      handleSend();
    }
  }

  if (phase === "review" && compiledPlan) {
    return (
      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Plan de proyecto
          </p>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            {compiledPlan.projectName}
          </h2>
        </div>

        <Card className="mb-8">
          <p className="text-sm leading-relaxed text-[var(--foreground)]">
            {compiledPlan.description}
          </p>
        </Card>

        <div className="mb-8 space-y-6">
          {compiledPlan.userStories.map((story, si) => (
            <Card key={si}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-xs font-bold text-[var(--background)]">
                  {si + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">
                    {story.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {story.description}
                  </p>
                </div>
              </div>

              <div className="ml-10 space-y-2">
                {story.tasks.map((task, ti) => (
                  <div
                    key={ti}
                    className="flex items-start gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--glass)] px-3 py-2"
                  >
                    <span className="mt-0.5 text-xs text-[var(--muted)]">
                      {ti + 1}.
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {task.title}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {task.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" onClick={handleBackToChat}>
            Seguir mejorando
          </Button>
          <Button variant="primary" onClick={handlePlanProject}>
            Planear proyecto
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-24" role="status" aria-live="polite">
        <div className="mb-6 flex items-center gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-[var(--foreground)] [animation-delay:0ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-[var(--foreground)] [animation-delay:150ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-[var(--foreground)] [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Creando proyecto con todas sus historias y tareas...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">
      {error && (
        <div className="mb-4 shrink-0">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Imagina tu proyecto
          </p>
          <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
            Asistente de ideas
          </h2>
        </div>
        <Button
          variant="primary"
          onClick={handleFinalize}
          disabled={messages.length < 3 || chatLoading}
        >
          Generar plan
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col mb-4">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--glass-strong)] text-[var(--foreground)]"
                    : "border border-[var(--hairline)] bg-[var(--glass)] text-[var(--foreground)]"
                }`}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-code:bg-[var(--glass-strong)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[var(--glass-strong)] prose-pre:border prose-pre:border-[var(--hairline)] prose-li:text-[var(--foreground)] prose-a:text-[var(--foreground)] prose-a:underline">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => {
                          const safeHref = readSafeExternalUrl(href);
                          return (
                            <a
                              href={safeHref ?? "#"}
                              target={safeHref?.startsWith("http") ? "_blank" : undefined}
                              rel={safeHref?.startsWith("http") ? "noopener noreferrer" : undefined}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--hairline)] bg-[var(--glass)] px-4 py-2.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </Card>

      <div className="flex shrink-0 items-end gap-2">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe tu idea de proyecto..."
          disabled={chatLoading}
          className="min-h-12 flex-1 resize-none"
          rows={2}
        />
        <Button
          variant="primary"
          onClick={handleSend}
          disabled={chatLoading || !input.trim()}
          className="mb-0.5 shrink-0"
          aria-label="Enviar mensaje"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </Button>
      </div>

      {messages.length >= 3 && !chatLoading && (
        <p className="mt-2 shrink-0 text-center text-xs text-[var(--muted)]">
          Cuando tengas clara tu idea, presiona &quot;Idea finalizada&quot; para
          generar el plan del proyecto.
        </p>
      )}
    </div>
  );
}
