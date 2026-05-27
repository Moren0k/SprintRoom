import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const ENV_VARS = [
  "SPRINTROOM_PROJECT_KEY",
  "INSFORGE_URL",
  "INSFORGE_API_KEY",
  "INSFORGE_ANON_KEY",
] as const;

function checkEnv(): boolean {
  let ok = true;
  for (const name of ENV_VARS) {
    if (!process.env[name]?.trim()) {
      console.error(`Falta ${name} en el entorno.`);
      ok = false;
    }
  }
  return ok;
}

let pendingResolve: ((value: unknown) => void) | null = null;
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

function setupStdout(proc: ChildProcess): void {
  proc.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8").trim();
    if (pendingResolve) {
      if (pendingTimeout) clearTimeout(pendingTimeout);
      pendingResolve(text);
      pendingResolve = null;
      pendingTimeout = null;
    }
  });
}

function send(proc: ChildProcess, msg: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = proc.stdin?.write(JSON.stringify(msg) + "\n");
    if (!ok) reject(new Error("stdin write failed"));
    else resolve();
  });
}

function recv(timeoutMs = 5_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResolve = null;
      reject(new Error("Timeout esperando respuesta"));
    }, timeoutMs);
    pendingResolve = (raw) => {
      try {
        resolve(JSON.parse(raw as string));
      } catch {
        reject(new Error(`Respuesta no es JSON: ${raw}`));
      }
    };
    pendingTimeout = timeout;
  });
}

function expectField(obj: unknown, field: string, type: string): void {
  if (obj === null || typeof obj !== "object") {
    throw new Error(`Se esperaba objeto, se obtuvo ${typeof obj}`);
  }
  const val = (obj as Record<string, unknown>)[field];
  if (typeof val !== type) {
    throw new Error(`Se esperaba ${field} de tipo ${type}, se obtuvo ${typeof val}`);
  }
}

async function main(): Promise<void> {
  if (!checkEnv()) {
    console.error("\nEstablece las variables de entorno faltantes y vuelve a intentar.");
    process.exit(1);
  }

  const scriptPath = resolve(__dirname, "mcp-server.ts");

  const proc: ChildProcess = spawn("npx", ["tsx", scriptPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      SPRINTROOM_PROJECT_KEY: process.env.SPRINTROOM_PROJECT_KEY!,
      INSFORGE_URL: process.env.INSFORGE_URL!,
      INSFORGE_API_KEY: process.env.INSFORGE_API_KEY!,
      INSFORGE_ANON_KEY: process.env.INSFORGE_ANON_KEY!,
    },
  });

  const stderrChunks: string[] = [];
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk.toString("utf-8"));
  });

  setupStdout(proc);

  let passed = 0;
  let failed = 0;

  function ok(label: string): void {
    console.log(`  ✓ ${label}`);
    passed++;
  }

  function fail(label: string, detail: string): void {
    console.log(`  ✗ ${label}: ${detail}`);
    failed++;
  }

  try {
    // ── 1. initialize ──
    console.log("\n1. initialize");

    await send(proc, {
      jsonrpc: "2.0",
      id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "smoke-test", version: "1.0.0" },
        },
      });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      expectField(resp, "id", "number");
      const result = (resp as Record<string, unknown>).result;
      expectField(result, "protocolVersion", "string");
      expectField(result, "serverInfo", "object");
      const serverInfo = (result as Record<string, unknown>).serverInfo;
      expectField(serverInfo, "name", "string");
      expectField(serverInfo, "version", "string");
      const capabilities = (result as Record<string, unknown>).capabilities;
      expectField(capabilities, "tools", "object");
      ok("Respuesta initialize valida (protocolVersion, serverInfo, capabilities.tools)");
    }

    // ── 2. notifications/initialized (no debe responder) ──
    console.log("\n2. notifications/initialized (debe ignorarse)");

    await send(proc, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    // Wait 2s — if server responds, recv() resolves; if correctly silent, it times out
    let notifyResponded = false;
    try {
      await recv(2_000);
      notifyResponded = true;
    } catch {
      // timeout means no response — correct behavior
    }

    if (notifyResponded) {
      fail("notifications/initialized", "El servidor respondio a una notificacion (no deberia)");
    } else {
      ok("No se envio respuesta a notification");
    }

    // ── 3. tools/list ──
    console.log("\n3. tools/list");

    await send(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      expectField(resp, "id", "number");
      const result = (resp as Record<string, unknown>).result as Record<string, unknown>;
      expectField(result, "tools", "object");
      const tools = result.tools as Array<Record<string, unknown>>;
      if (!Array.isArray(tools)) throw new Error("tools debe ser un array");
      if (tools.length === 0) throw new Error("tools no debe estar vacio");
      for (const t of tools) {
        expectField(t, "name", "string");
        expectField(t, "description", "string");
        expectField(t, "inputSchema", "object");
      }
      ok(`${tools.length} herramientas con name, description, inputSchema`);
    }

    // ── 4. tools/call (get_sprintroom_mcp_skill) ──
    console.log("\n4. tools/call (get_sprintroom_mcp_skill)");

    await send(proc, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_sprintroom_mcp_skill", arguments: {} },
    });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      expectField(resp, "id", "number");
      const result = (resp as Record<string, unknown>).result as Record<string, unknown>;
      expectField(result, "content", "object");
      const content = result.content as Array<Record<string, unknown>>;
      if (!Array.isArray(content)) throw new Error("content debe ser un array");
      if (content.length === 0) throw new Error("content no debe estar vacio");
      const first = content[0];
      expectField(first, "type", "string");
      if (first.type !== "text") throw new Error(`Se esperaba type "text", se obtuvo "${first.type}"`);
      expectField(first, "text", "string");
      ok("Respuesta tools/call valida con content[{ type: text, text }]");
    }

    // ── 5. tools/call (argumentos invalidos -> isError) ──
    console.log("\n5. tools/call (error: taskId faltante)");

    await send(proc, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_task_by_id", arguments: {} },
    });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      expectField(resp, "id", "number");
      const result = (resp as Record<string, unknown>).result as Record<string, unknown>;
      expectField(result, "content", "object");
      const isError = result.isError;
      if (isError !== true) throw new Error("Se esperaba isError: true para argumentos invalidos");
      ok("tools/call con argumentos invalidos retorna isError: true");
    }

    // ── 6. Metodo desconocido ──
    console.log("\n6. Metodo desconocido");

    await send(proc, {
      jsonrpc: "2.0",
      id: 5,
      method: "unknown_method",
    });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      const error = (resp as Record<string, unknown>).error as Record<string, unknown>;
      expectField(error, "code", "number");
      expectField(error, "message", "string");
      if (error.code !== -32601) throw new Error(`Se esperaba codigo -32601, se obtuvo ${error.code}`);
      ok("Metodo desconocido retorna JSON-RPC error -32601");
    }

    // ── 7. ping ──
    console.log("\n7. ping");

    await send(proc, {
      jsonrpc: "2.0",
      id: 6,
      method: "ping",
    });

    {
      const resp = await recv();
      expectField(resp, "jsonrpc", "string");
      expectField(resp, "id", "number");
      const result = (resp as Record<string, unknown>).result;
      if (typeof result !== "object" || result === null) {
        throw new Error("result debe ser un objeto");
      }
      ok("ping responde con resultado valido");
    }

    // ── Resumen ──
    console.log(`\n${"=".repeat(40)}`);
    console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);
    console.log(`${"=".repeat(40)}`);

    proc.kill();

    const stderr = stderrChunks.join("");
    const logLines = stderr.split("\n").filter((l) => l.includes("[sprintroom-mcp]"));
    if (logLines.length > 0) {
      console.log("\nLogs del servidor (stderr):");
      for (const line of logLines) {
        console.log(`  ${line.trim()}`);
      }
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\nError fatal en smoke test:", error);
    proc.kill();
    process.exit(1);
  }
}

main();
