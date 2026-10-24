import type { Datum } from "../../components/charts/shared/datumTypes"
import type { JsonRpcResponse } from "./mcpProtocolTypes"
import { spawn, type ChildProcess } from "child_process"
import { createRequire } from "node:module"
import * as path from "path"

export const SERVER_PATH = path.resolve(
  __dirname,
  "../../../ai/dist/mcp-server.js"
)

// Check source content as well as artifact content. A local run must not
// silently skip protocol coverage or validate a previously built revision.
const { assertFreshMcpBundles } = createRequire(import.meta.url)(
  "../../../scripts/lib/mcp-bundle-freshness.cjs"
) as { assertFreshMcpBundles: (root: string) => void }
assertFreshMcpBundles(path.resolve(__dirname, "../../.."))

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
