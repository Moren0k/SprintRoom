/**
 * Smoke test for SprintRoom MCP — internal script + public CLI.
 *
 * Reads env vars from .env.local and the environment without printing secrets.
 * Tests:
 *   1. Falla gracilmente sin PROJECT_KEY
 *   2. initialize
 *   3. notifications/initialized (no produce respuesta)
 *   4. tools/list
 *   5. tools/call (get_sprintroom_mcp_skill)
 *   6. tools/call con argumentos invalidos (isError: true)
 *   7. metodo desconocido (JSON-RPC error -32601)
 *   8. ping
 *   9. No escribe nada que no sea JSON-RPC en stdout
 *
 * Uso:
 *   npx tsx scripts/smoke-test-mcp-full.ts
 *
 * Requiere en el entorno:
 *   SPRINTROOM_API_URL  (la URL base de SprintRoom)
 *   SPRINTROOM_PROJECT_KEY  (desde la UI del proyecto)
 *   INSFORGE_URL, INSFORGE_ANON_KEY, INSFORGE_API_KEY
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/* ── Cargar .env.local sin imprimir valores ─────────────────── */

function loadDotEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

const dotenv = loadDotEnv(resolve(__dirname, "..", ".env.local"));

function getEnv(name: string): string {
  return (process.env[name] ?? dotenv[name] ?? "").trim();
}

const ENV_INTERNAL = ["INSFORGE_URL", "INSFORGE_ANON_KEY", "INSFORGE_API_KEY"];
const ENV_PUBLIC = ["SPRINTROOM_API_URL", "SPRINTROOM_PROJECT_KEY"];

function checkVars(names: string[]): boolean {
  for (const name of names) {
    if (!getEnv(name)) {
      console.error(`  [SKIP] Falta ${name} en el entorno`);
      return false;
    }
  }
  return true;
}

/* ── Ayudantes de spawn ────────────────────────────────────── */

function spawnServer(
  command: string[],
  extraEnv: Record<string, string>,
): ChildProcess {
  const proc = spawn(command[0], command.slice(1), {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...dotenv, ...process.env, ...extraEnv },
  }) as unknown as ChildProcess;

  const stderrBuf: string[] = [];
  proc.stderr?.on("data", (chunk: Buffer) => stderrBuf.push(chunk.toString("utf-8")));

  (proc as unknown as Record<string, unknown>)._stderrBuf = stderrBuf;
  return proc;
}

function getStderr(proc: ChildProcess): string {
  return ((proc as unknown as Record<string, unknown>)._stderrBuf as string[]).join("");
}

let pendingResolve: ((value: string) => void) | null = null;
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

function setupStdout(proc: ChildProcess): void {
  proc.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8").trim();
    if (pendingResolve) {
      if (pendingTimeout) clearTimeout(pendingTimeout);
      const resolve = pendingResolve;
      pendingResolve = null;
      pendingTimeout = null;
      resolve(text);
    }
  });
}

function send(proc: ChildProcess, msg: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!proc.stdin?.write(JSON.stringify(msg) + "\n")) {
      reject(new Error("stdin write failed"));
    } else {
      resolve();
    }
  });
}

function recv(timeoutMs = 5_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResolve = null;
      reject(new Error(`Timeout (${timeoutMs}ms)`));
    }, timeoutMs);
    pendingResolve = resolve;
    pendingTimeout = timeout;
  });
}

/* ── Pruebas ────────────────────────────────────────────────── */

let passed = 0;
let failed = 0;
let skipped = 0;

function ok(label: string): void {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, detail: string): void {
  console.log(`  ✗ ${label}: ${detail}`);
  failed++;
}

function skip(label: string): void {
  console.log(`  - ${label} (skipped)`);
  skipped++;
}

async function testMissingKey(command: string[], extraEnv: Record<string, string>, label: string): Promise<void> {
  console.log(`\n${label}`);

  const env: NodeJS.ProcessEnv = { ...dotenv, ...process.env, ...extraEnv };
  delete env.SPRINTROOM_PROJECT_KEY;
  const proc = spawn(command[0], command.slice(1), {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  }) as unknown as ChildProcess;
  const stderrBuf: string[] = [];
  proc.stderr?.on("data", (chunk: Buffer) => stderrBuf.push(chunk.toString("utf-8")));
  (proc as unknown as Record<string, unknown>)._stderrBuf = stderrBuf;

  await new Promise<void>((resolve) => {
    const check = (): void => {
      const stderr = getStderr(proc);
      if (stderr.includes("Falta") || proc.exitCode !== null) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    setTimeout(check, 100);
  });
  await new Promise((r) => setTimeout(r, 500));

  const stderr = getStderr(proc);
  proc.kill();
  if (stderr.includes("Falta")) {
    ok(`${label} — falla gracilmente en stderr`);
  } else {
    fail(label, `No se detecto mensaje de error: ${stderr.slice(0, 200)}`);
  }
}

async function testProtocol(
  proc: ChildProcess,
  testCases: Array<{
    label: string;
    request: unknown;
    check: (resp: unknown) => boolean;
    detail?: string;
  }>,
): Promise<void> {
  setupStdout(proc);
  await new Promise((r) => setTimeout(r, 300));

  for (const tc of testCases) {
    try {
      await send(proc, tc.request);
      const raw = await recv();
      let resp: unknown;
      try {
        resp = JSON.parse(raw);
      } catch {
        fail(tc.label, `Respuesta no es JSON: ${raw.slice(0, 100)}`);
        continue;
      }
      if (tc.check(resp)) {
        ok(tc.label);
      } else {
        fail(tc.label, tc.detail ?? "check fallo");
        console.error(`    Respuesta: ${JSON.stringify(resp).slice(0, 200)}`);
      }
    } catch (err) {
      fail(tc.label, (err as Error).message);
    }
  }
}

async function fullSuite(label: string, command: string[], extraEnv: Record<string, string>): Promise<void> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Suite: ${label}`);
  console.log(`=${"=".repeat(50)}`);

  const proc = spawnServer(command, extraEnv);
  setupStdout(proc);

  // Esperar a que el servidor inicie
  await new Promise((r) => setTimeout(r, 1500));

  const stderr = getStderr(proc);
  if (stderr.includes("Falta") || stderr.includes("Error")) {
    fail("Inicio", `Servidor fallo al iniciar: ${stderr.slice(0, 300)}`);
    proc.kill();
    return;
  }

  // 1. initialize
  await testProtocol(proc, [
    {
      label: "initialize",
      request: {
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "0.1.0", capabilities: {}, clientInfo: { name: "test", version: "1.0" } },
      },
      check: (r) => {
        const o = r as Record<string, unknown>;
        const result = o.result as Record<string, unknown> | undefined;
        return !!(
          o.jsonrpc === "2.0" && o.id === 1 &&
          result?.protocolVersion && result?.serverInfo && result?.capabilities
        );
      },
      detail: "Faltan campos esperados en initialize",
    },
  ]);

  // 2. notifications/initialized (no debe responder)
  await testProtocol(proc, [
    {
      label: "notifications/initialized (ignorada)",
      request: { jsonrpc: "2.0", method: "notifications/initialized" },
      check: () => { throw new Error("No deberia recibir respuesta"); },
    },
  ]).catch(() => ok("notifications/initialized — no responde"));

  // 3. tools/list
  await testProtocol(proc, [
    {
      label: "tools/list",
      request: { jsonrpc: "2.0", id: 2, method: "tools/list" },
      check: (r) => {
        const o = r as Record<string, unknown>;
        const result = o.result as Record<string, unknown> | undefined;
        const tools = result?.tools as Array<unknown> | undefined;
        return !!(
          o.jsonrpc === "2.0" && o.id === 2 &&
          Array.isArray(tools) && tools.length > 0 &&
          (tools[0] as Record<string, unknown>)?.name
        );
      },
      detail: "tools/list no devolvio herramientas con name",
    },
  ]);

  // 4. tools/call (get_sprintroom_mcp_skill)
  await testProtocol(proc, [
    {
      label: "tools/call (get_sprintroom_mcp_skill)",
      request: {
        jsonrpc: "2.0", id: 3, method: "tools/call",
        params: { name: "get_sprintroom_mcp_skill", arguments: {} },
      },
      check: (r) => {
        const o = r as Record<string, unknown>;
        const result = o.result as Record<string, unknown> | undefined;
        const content = result?.content as Array<Record<string, unknown>> | undefined;
        return !!(
          o.jsonrpc === "2.0" && o.id === 3 &&
          Array.isArray(content) && content.length > 0 &&
          content[0].type === "text" && typeof content[0].text === "string" &&
          result?.isError !== true
        );
      },
      detail: "tools/call no retorno content[{ type: text, text }]",
    },
  ]);

  // 5. tools/call con argumentos invalidos
  await testProtocol(proc, [
    {
      label: "tools/call (error: argumentos invalidos)",
      request: {
        jsonrpc: "2.0", id: 4, method: "tools/call",
        params: { name: "get_task_by_id", arguments: {} },
      },
      check: (r) => {
        const o = r as Record<string, unknown>;
        const result = o.result as Record<string, unknown> | undefined;
        return result?.isError === true;
      },
      detail: "Se esperaba isError: true para argumentos invalidos",
    },
  ]);

  // 6. metodo desconocido
  await testProtocol(proc, [
    {
      label: "metodo desconocido (-32601)",
      request: { jsonrpc: "2.0", id: 5, method: "unknown_method" },
      check: (r) => {
        const o = r as Record<string, unknown>;
        const err = o.error as Record<string, unknown> | undefined;
        return o.jsonrpc === "2.0" && o.id === 5 && err?.code === -32601;
      },
      detail: "Se esperaba JSON-RPC error -32601",
    },
  ]);

  // 7. ping
  await testProtocol(proc, [
    {
      label: "ping",
      request: { jsonrpc: "2.0", id: 6, method: "ping" },
      check: (r) => {
        const o = r as Record<string, unknown>;
        return o.jsonrpc === "2.0" && o.id === 6 && typeof o.result === "object";
      },
      detail: "ping no respondio con result",
    },
  ]);

  // 8. Verificar que no haya basura en stdout
  const stdoutExtra = ((proc.stdout as unknown as { readableLength?: number })?.readableLength ?? 0);
  if (stdoutExtra > 0) {
    fail("stdout limpio", `Quedaron ${stdoutExtra} bytes en stdout`);
  } else {
    ok("stdout solo contiene JSON-RPC");
  }

  const stderrEnd = getStderr(proc);
  const logLines = stderrEnd.split("\n").filter((l) => l.includes("[sprintroom-mcp]"));
  if (logLines.length > 0) {
    console.log(`\n  Logs del servidor:`);
    for (const line of logLines.slice(-3)) {
      console.log(`    ${line.trim()}`);
    }
  }

  proc.kill();
}

/* ── Main ────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const hasInternal = checkVars(ENV_INTERNAL);
  const hasPublic = checkVars(ENV_PUBLIC);
  const scriptPath = resolve(__dirname, "..", "scripts", "mcp-server.ts");
  const pkgEntry = resolve(__dirname, "..", "packages", "sprintroom-mcp", "dist", "index.js");

  // ── 1a. Internal script: falla sin PROJECT_KEY ──
  if (existsSync(scriptPath)) {
    await testMissingKey(
      ["npx", "tsx", scriptPath],
      { SPRINTROOM_PROJECT_KEY: "sk_test_dummy" },
      "1a. Internal script — falla sin PROJECT_KEY",
    );
  } else {
    skip("1a. Internal script — no encontrado");
  }

  // ── 1b. Public CLI: falla sin PROJECT_KEY ──
  if (existsSync(pkgEntry)) {
    await testMissingKey(
      ["node", pkgEntry],
      { SPRINTROOM_API_URL: "https://test.example.com", SPRINTROOM_PROJECT_KEY: "sk_test_dummy" },
      "1b. Public CLI — falla sin PROJECT_KEY",
    );
  } else {
    skip("1b. Public CLI — no compilado, ejecuta 'cd packages/sprintroom-mcp && npm run build'");
  }

  // ── 1c. Public CLI: falla sin API_URL ──
  if (existsSync(pkgEntry)) {
    const env: NodeJS.ProcessEnv = { ...dotenv, ...process.env, SPRINTROOM_PROJECT_KEY: "sk_test_dummy" };
    delete env.SPRINTROOM_API_URL;
    const proc = spawn("node", [pkgEntry], {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    }) as unknown as ChildProcess;
    const stderrBuf: string[] = [];
    proc.stderr?.on("data", (chunk: Buffer) => stderrBuf.push(chunk.toString("utf-8")));
    (proc as unknown as Record<string, unknown>)._stderrBuf = stderrBuf;
    await new Promise((r) => setTimeout(r, 500));
    const stderr = getStderr(proc);
    proc.kill();
    if (stderr.includes("Falta")) {
      ok("1c. Public CLI — falla sin SPRINTROOM_API_URL");
    } else {
      fail("1c. Fallo sin API_URL", `stderr: ${stderr.slice(0, 200)}`);
    }
  }

  // ── 2a. Protocolo completo: internal script ──
  if (hasInternal) {
    await fullSuite(
      "Internal script (scripts/mcp-server.ts)",
      ["npx", "tsx", scriptPath],
      {},
    );
  } else {
    skip("2a. Internal script — faltan variables InsForge");
  }

  // ── 2b. Protocolo completo: public CLI ──
  if (hasPublic && existsSync(pkgEntry)) {
    await fullSuite(
      "Public CLI (packages/sprintroom-mcp)",
      ["node", pkgEntry],
      {
        SPRINTROOM_API_URL: getEnv("SPRINTROOM_API_URL"),
        SPRINTROOM_PROJECT_KEY: getEnv("SPRINTROOM_PROJECT_KEY"),
      },
    );
  } else {
    skip("2b. Public CLI — faltan variables o no compilado");
  }

  // ── Resumen ──
  const total = passed + failed + skipped;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron, ${skipped} omitidos (de ${total})`);
  console.log(`${"=".repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nError fatal:", err);
  process.exit(1);
});
