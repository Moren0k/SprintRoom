#!/usr/bin/env node
import { createInterface } from "node:readline";
import { MCP_TOOL_DEFINITIONS } from "./definitions.js";
const SERVER_NAME = "sprintroom-mcp";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "0.1.0";
function getEnv(name) {
    return (process.env[name] ?? "").trim();
}
const API_URL = getEnv("SPRINTROOM_API_URL").replace(/\/+$/, "");
const PROJECT_KEY = getEnv("SPRINTROOM_PROJECT_KEY");
function writeJson(data) {
    process.stdout.write(JSON.stringify(data) + "\n");
}
function logStderr(message) {
    process.stderr.write(`[sprintroom-mcp] ${message}\n`);
}
function jsonRpcError(id, code, message) {
    writeJson({ jsonrpc: "2.0", id, error: { code, message } });
}
function toolErrorResult(message) {
    return { content: [{ type: "text", text: message }], isError: true };
}
function handleInitialize(id) {
    writeJson({
        jsonrpc: "2.0",
        id,
        result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        },
    });
}
function handlePing(id) {
    writeJson({ jsonrpc: "2.0", id, result: {} });
}
function handleToolsList(id) {
    writeJson({
        jsonrpc: "2.0",
        id,
        result: {
            tools: MCP_TOOL_DEFINITIONS.map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
            })),
        },
    });
}
async function handleToolsCall(id, params) {
    const resp = await proxyToolsCall(params);
    writeJson({ jsonrpc: "2.0", id, ...resp });
}
async function proxyToolsCall(params) {
    const url = `${API_URL}/api/mcp`;
    const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params,
    });
    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Project-Key": PROJECT_KEY,
            },
            body,
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Error de conexion con SprintRoom.";
        logStderr(`proxy error: ${msg}`);
        return toolErrorResult(`Error de conexion: ${msg}`);
    }
    let data;
    try {
        data = (await response.json());
    }
    catch {
        return toolErrorResult("Respuesta invalida del servidor SprintRoom.");
    }
    if (data.error) {
        const err = data.error;
        const code = typeof err.code === "number" ? err.code : -32000;
        const message = typeof err.message === "string" ? err.message : "Error desconocido";
        return { error: { code, message } };
    }
    const result = data.result;
    if (result !== undefined) {
        if (typeof result === "object" &&
            result !== null &&
            "content" in result) {
            return { result };
        }
        return {
            result: {
                content: [{ type: "text", text: JSON.stringify(result) }],
            },
        };
    }
    return toolErrorResult("Respuesta inesperada del servidor SprintRoom.");
}
function isNotification(request) {
    return !("id" in request) || request.id === undefined;
}
async function handleLine(line) {
    let request;
    try {
        request = JSON.parse(line);
    }
    catch {
        writeJson({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Error de parseo JSON." },
        });
        return;
    }
    if (typeof request !== "object" || Array.isArray(request) || request === null) {
        writeJson({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "El mensaje debe ser un objeto JSON." },
        });
        return;
    }
    if (isNotification(request)) {
        return;
    }
    const id = request.id;
    const method = typeof request.method === "string" ? request.method : "";
    const params = typeof request.params === "object" &&
        request.params !== null &&
        !Array.isArray(request.params)
        ? request.params
        : {};
    if (method === "initialize") {
        handleInitialize(id);
    }
    else if (method === "ping") {
        handlePing(id);
    }
    else if (method === "tools/list") {
        handleToolsList(id);
    }
    else if (method === "tools/call") {
        await handleToolsCall(id, params);
    }
    else {
        jsonRpcError(id, -32601, `Metodo no soportado: ${method}. Soporta: initialize, ping, tools/list, tools/call`);
    }
}
async function main() {
    if (!API_URL) {
        logStderr("Falta SPRINTROOM_API_URL en las variables de entorno.");
        process.exit(1);
    }
    if (!PROJECT_KEY) {
        logStderr("Falta SPRINTROOM_PROJECT_KEY en las variables de entorno.");
        process.exit(1);
    }
    logStderr(`Conectado a ${API_URL}`);
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed.length === 0)
            continue;
        try {
            await handleLine(trimmed);
        }
        catch (error) {
            logStderr(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
        }
    }
}
main().catch((err) => {
    logStderr(`Error fatal: ${err instanceof Error ? err.message : "Error desconocido"}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map