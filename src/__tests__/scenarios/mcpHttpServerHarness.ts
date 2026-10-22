import { spawn, type ChildProcess } from "child_process"
import * as net from "net"
import { SERVER_PATH } from "./mcpStdioHarness"

const HTTP_START_RETRIES = 3

/** Spawn the MCP server process in Streamable HTTP mode. */
export function spawnHTTPServer(
  port: number,
  env: NodeJS.ProcessEnv = {},
  args: string[] = []
): ChildProcess {
  return spawn(
    "node",
    [SERVER_PATH, "--http", "--port", String(port), ...args],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "test",
        MCP_HOST: "",
        MCP_ALLOWED_HOSTS: "",
        MCP_ALLOWED_ORIGINS: "",
        MCP_AUTH_TOKEN: "",
        SEMIOTIC_DEPLOYMENT_CHANNEL: "",
        SEMIOTIC_GIT_SHA: "",
        SEMIOTIC_BUILD_ID: "",
        SEMIOTIC_BUILD_TIME: "",
        ...env
      }
    }
  )
}

/** Reserve an open port long enough to avoid hard-coding one in tests. */
function getOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine open port")))
        return
      }
      server.close(() => resolve(address.port))
    })
  })
}

/**
 * Wait for the metadata-only HTTP startup event before sending requests.
 * The server intentionally no longer writes a human-readable host/port line:
 * all hosted-service logs use the bounded MCP metadata schema.
 */
function waitForHTTPServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = ""

    const cleanup = () => {
      clearTimeout(timeout)
      proc.stderr!.off("data", onData)
      proc.off("exit", onExit)
    }

    const onData = (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.includes('"event":"service_started"')) {
        cleanup()
        resolve()
      }
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`HTTP server exited with code ${code}: ${stderr}`))
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for HTTP server startup: ${stderr}`))
    }, 10000)

    proc.stderr!.on("data", onData)
    proc.on("exit", onExit)
  })
}

export function waitForProcessExit(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) {
      resolve()
      return
    }

    let settled = false

    const cleanup = () => {
      clearTimeout(graceTimeout)
      clearTimeout(forceTimeout)
      proc.off("exit", onExit)
    }

    const onExit = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const graceTimeout = setTimeout(() => {
      if (proc.exitCode !== null || proc.signalCode !== null) return
      try {
        proc.kill("SIGKILL")
      } catch {
        // The process may have exited between the state check and kill call.
      }
    }, 1000)

    const forceTimeout = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }, 5000)

    proc.once("exit", onExit)
  })
}

export async function spawnReadyHTTPServer(
  env: NodeJS.ProcessEnv = {},
  args: string[] = []
): Promise<{ proc: ChildProcess; port: number }> {
  let lastError: unknown

  for (let attempt = 0; attempt < HTTP_START_RETRIES; attempt++) {
    const port = await getOpenPort()
    const proc = spawnHTTPServer(port, env, args)
    try {
      await waitForHTTPServer(proc)
      return { proc, port }
    } catch (err) {
      lastError = err
      proc.kill("SIGTERM")
      await waitForProcessExit(proc)
    }
  }

  throw lastError
}
