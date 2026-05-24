import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `Eres un Scrum Master y Product Owner senior. Tu tarea es analizar una conversación donde se definió un proyecto y extraer un plan estructurado en JSON con historias de usuario y tareas claras y ejecutables.

Debes devolver ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin texto adicional ni markdown:

{
  "projectName": "Nombre del proyecto",
  "description": "Descripción general del proyecto (2-4 oraciones)",
  "externalReference": "",
  "userStories": [
    {
      "title": "Título de la historia de usuario",
      "description": "Descripción detallada de la funcionalidad desde la perspectiva del usuario",
      "tasks": [
        {
          "title": "Nombre claro y accionable de la tarea",
          "description": "Descripción precisa de qué se debe hacer, dónde aplica, contexto relevante, qué existe ya y qué se debe crear o modificar. Incluye los criterios de aceptacion como checklist."
        }
      ]
    }
  ]
}

REGLAS ESTRICTAS PARA TAREAS:
- Las tareas deben ser CONCRETAS, CLARAS y ACCIONABLES.
- Cada tarea debe incluir en su descripcion los criterios de aceptacion como checklist.
- No uses terminos vagos como "implementar", "arreglar", "gestionar" o "hacer".
- Cada tarea debe ser entendible sin contexto adicional.
- Genera todas las tareas necesarias para cada historia, sin limite minimo ni maximo.
- Prioriza claridad y disposicion para ejecucion sobre velocidad.

Reglas generales:
- Extrae SOLO la información que el usuario ha proporcionado explícitamente o que se ha acordado en la conversación.
- NO inventes funcionalidades, historias o tareas que no hayan sido mencionadas.
- Cada historia debe tener al menos una tarea.
- Asegúrate de que el JSON sea válido y parseable.
- externalReference debe ser una cadena vacía siempre.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length < 2) {
      return NextResponse.json(
        { error: "Se necesita una conversación con al menos 2 mensajes." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-30),
        {
          role: "user",
          content: "Analiza la conversación anterior y genera el plan estructurado en JSON.",
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No se pudo generar el plan." },
        { status: 500 },
      );
    }

    let plan: unknown;
    try {
      plan = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "El plan generado no tiene un formato válido." },
        { status: 500 },
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Imagine compile API error:", error);
    return NextResponse.json(
      { error: "Error al compilar el plan." },
      { status: 500 },
    );
  }
}
