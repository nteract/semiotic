import type { Datum } from "../../components/charts/shared/datumTypes"
import type { JsonRpcResponse } from "./mcpProtocolTypes"
import { spawn, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import * as path from "path"

export const SERVER_PATH = path.resolve(
  __dirname,
  "../../../ai/dist/mcp-server.js"
)

// The bundled server externalizes the library entry points (build:mcp passes
// --external:semiotic/ai etc.), which resolve through package.json `exports`
// to dist/*.min.js — Rollup output that only exists after `npm run dist`. On
// a fresh clone, plain `npm test` would otherwise fail every spawn with a
// cryptic "Process exited with code 1 before responding to initialize".
const REQUIRED_BUNDLES = [
  SERVER_PATH,
  // The server's runtime requires (mirrors the build:mcp --external flags):
  path.resolve(__dirname, "../../../dist/semiotic-ai.min.js"),
  path.resolve(__dirname, "../../../dist/geo.min.js"),
  path.resolve(__dirname, "../../../dist/server.min.js")
]
const MISSING_BUNDLES = REQUIRED_BUNDLES.filter((bundle) => !existsSync(bundle))
export const SERVER_DEPS_READY = MISSING_BUNDLES.length === 0
if (!SERVER_DEPS_READY) {
  const message =
    "[mcp-protocol.test] MCP server suites need built bundles — run `npm run dist` " +
    "(and `npm run build:mcp` if ai/dist is stale). Missing: " +
    MISSING_BUNDLES.join(", ")
  if (process.env.CI) {
    // In CI a missing bundle means the dist step was dropped or reordered —
    // fail loudly rather than silently skipping all MCP protocol coverage.
    throw new Error(message)
  }
  console.warn(message)
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Spawn the MCP server process. */
export function spawnServer(
  args: string[] = [],
  env: NodeJS.ProcessEnv = {}
): ChildProcess {
  return spawn("node", [SERVER_PATH, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      // Stable assertions must not inherit accidental deployment provenance
      // from a developer shell or a hosted test runner. Individual tests pass
      // an explicit nightly identity when that is the contract under test.
      SEMIOTIC_DEPLOYMENT_CHANNEL: "",
      SEMIOTIC_GIT_SHA: "",
      SEMIOTIC_BUILD_ID: "",
      SEMIOTIC_BUILD_TIME: "",
      ...env
    }
  })
}

export function sendRequest(
  proc: ChildProcess,
  method: string,
  params: Datum = {},
  id: string | number = 1
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    let buffer = ""

    const cleanup = () => {
      clearTimeout(timeout)
      proc.stdout!.off("data", onData)
      proc.off("exit", onExit)
    }

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      // MCP stdio transport sends newline-delimited JSON
      const lines = buffer.split("\n")
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim()
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.id === id) {
            cleanup()
            resolve(msg)
          }
        } catch {
          // Ignore non-JSON lines (e.g., log output)
        }
      }
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines[lines.length - 1]
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(
        new Error(
          `Process exited with code ${code} before responding to ${method}`
        )
      )
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for response to ${method}`))
    }, 10000)

    proc.stdout!.on("data", onData)
    proc.on("exit", onExit)

    const request = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params
    })
    proc.stdin!.write(request + "\n")
  })
}

/** Send initialize + initialized handshake, return the initialize result. */
export async function initializeServer(
  proc: ChildProcess
): Promise<JsonRpcResponse> {
  const initResult = await sendRequest(
    proc,
    "initialize",
    {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    },
    "init-1"
  )

  // Send initialized notification (no response expected)
  proc.stdin!.write(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    }) + "\n"
  )

  return initResult
}
