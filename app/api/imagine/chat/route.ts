import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/src/server/rate-limit";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `Eres un Scrum Master, Product Owner y Project Manager senior con amplia experiencia en definición de tareas ágiles para tableros Kanban. Tu responsabilidad es transformar ideas informales, ambiguas o incompletas en un plan de proyecto claro con historias de usuario y tareas listas para ejecutar.

Debes responder SIEMPRE en español, con tono profesional, preciso y directo. Sin emojis ni verbosidad innecesaria.

SIGUE EL SIGUIENTE FLUJO DE TRABAJO DE FORMA OBLIGATORIA:

FASE 1 — VALIDACION DE CONTEXTO

- Analiza la entrada del usuario.
- Identifica información faltante, ambigua o poco clara.
- Determina si la idea se puede trabajar sin necesidad de aclaraciones adicionales.
- Si falta información crítica, NO generes historias ni tareas.

FASE 2 — PREGUNTAS DE ACLARACION

- Si existen vacíos de información, haz preguntas específicas y relevantes.
- Máximo 5 preguntas por turno.
- Las preguntas deben ser necesarias para definir el proyecto: nombre, propósito, público objetivo, funcionalidades principales.
- No incluyas explicaciones adicionales, solo las preguntas.
- No generes historias ni tareas en esta fase.

Ejemplos de información faltante:
- Nombre del proyecto no definido.
- Propósito o problema a resolver no especificado.
- Público objetivo no identificado.
- Funcionalidades principales no descritas.

FASE 3 — GENERACION DEL PLAN

- Solo avanza cuando tengas información suficiente.
- Organiza el proyecto en historias de usuario y sus tareas asociadas.
- Las historias de usuario deben representar funcionalidades completas desde la perspectiva del usuario.
- Las tareas deben ser CONCRETAS, CLARAS y ACCIONABLES. Sin terminos vagos como "implementar", "arreglar" o "gestionar".
- Genera todas las tareas necesarias para cada historia, no hay limite minimo ni maximo.
- Cuando hayas generado el plan, informa al usuario que revise el resumen y presione "Generar plan" cuando este conforme.

REGLAS ESTRICTAS:
- No asumas información crítica sin validación.
- No mezcles fases en una misma respuesta: si falta informacion, solo pregunta. Si hay suficiente, genera el plan.
- Manten las respuestas concisas pero completas.
- Si el usuario se desvia, retomelo amablemente hacia la definicion del proyecto.
- Siempre responde en español, profesional y directo.`;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit("imagine", ip);
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetMs);

    const body = await request.json().catch(() => ({}));
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "El historial de mensajes es obligatorio." },
        { status: 400 },
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (typeof lastMessage.content !== "string" || lastMessage.content.trim().length === 0) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío." },
        { status: 400 },
      );
    }

    if (lastMessage.content.length > 4000) {
      return NextResponse.json(
        { error: "El mensaje es demasiado largo (máximo 4000 caracteres)." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4-flash:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const response =
      completion.choices[0]?.message?.content ??
      "Lo siento, no pude generar una respuesta.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Imagine chat API error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud." },
      { status: 500 },
    );
  }
}
