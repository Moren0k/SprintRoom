import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { assertSameOriginMutation } from "@/src/server/security";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/src/server/rate-limit";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const knowledgeBase = fs.readFileSync(
  path.join(process.cwd(), "docs", "chatbot-knowledge-base.md"),
  "utf-8",
);

const SYSTEM_PROMPT = `Eres un asistente formal y profesional de SprintRoom, una plataforma para organizar el trabajo de equipos mediante una estructura jerárquica de tres niveles: Proyecto → Historia de Usuario → Tarea.

Tu propósito es ayudar a los visitantes a comprender qué es SprintRoom, cómo funciona, sus beneficios y cualquier duda sobre la plataforma. Usa la siguiente base de conocimiento como tu única fuente de información.

Base de conocimiento:
${knowledgeBase}

Formato de respuesta:
- Usa formato Markdown para hacer tus respuestas más legibles: **negritas**, *cursivas*, listas con -, separa secciones con saltos de línea.
- Cuando menciones funciones o comandos usa código con formato inline.
- Separa en párrafos cortos para mejor lectura en pantalla.

Reglas de comportamiento:
- Saluda cordialmente y preséntate cuando te saluden. Ejemplo: "Buenos días. Soy el asistente de SprintRoom. ¿En qué puedo ayudarte?"
- Responde de forma formal, clara y profesional, siempre en español.
- Limítate a responder preguntas sobre SprintRoom usando exclusivamente la base de conocimiento proporcionada.
- Cuando la pregunta sea sobre un saludo o cortesía, responde el saludo de forma cordial y ofrece tu ayuda sobre SprintRoom.
- Si te preguntan algo que no está cubierto en la base de conocimiento, indícalo con honestidad y sugiere preguntar de otra forma.
- Si la pregunta está completamente fuera del ámbito de SprintRoom, responde: "Lo siento, solo puedo brindar información sobre SprintRoom. ¿Hay algo más en lo que pueda ayudarte?"
- Sé cordial, mantén un tono profesional y no inventes información.`;

export async function POST(request: NextRequest) {
  try {
    assertSameOriginMutation(request);
    const ip = getClientIp(request);
    const ipLimit = await checkRateLimit("chat", ip);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await request.json().catch(() => ({}));
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío." },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "El mensaje es demasiado largo (máximo 2000 caracteres)." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4-flash:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const response =
      completion.choices[0]?.message?.content ??
      "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 },
    );
  }
}
