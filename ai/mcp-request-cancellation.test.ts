import * as http from "http"
import * as net from "net"
import { describe, expect, it } from "vitest"
import { createMcpRequestCancellationSignal } from "./mcp-request-cancellation"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

function within<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>
  const timed = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 2_000)
  })
  return Promise.race([promise, timed]).finally(() => clearTimeout(timeout))
}

function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
}

function startServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler)
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine test server port")))
        return
      }
      resolve({ server, port: address.port })
    })
  })
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function completeRequest(port: number, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      method: "POST",
      headers: { "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let response = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => { response += chunk })
      res.on("end", () => resolve(response))
    })
    req.on("error", reject)
    req.end(body)
  })
}

describe("MCP HTTP request cancellation", () => {
  it("does not abort after a normally completed request body", async () => {
    const observed = deferred<AbortSignal>()
    const { server, port } = await startServer((req, res) => {
      const signal = createMcpRequestCancellationSignal(req, res)
      req.resume()
      req.once("end", () => {
        observed.resolve(signal)
        res.end("ok")
      })
    })

    try {
      expect(await completeRequest(port, "complete")).toBe("ok")
      expect((await within(observed.promise, "completed request signal")).aborted).toBe(false)
    } finally {
      await stopServer(server)
    }
  })

  it("aborts when a complete request loses its response connection", async () => {
    const requestEnded = deferred<void>()
    const cancelled = deferred<void>()
    const { server, port } = await startServer((req, res) => {
      const signal = createMcpRequestCancellationSignal(req, res)
      void waitForAbort(signal).then(() => cancelled.resolve())
      req.resume()
      req.once("end", () => requestEnded.resolve())
    })

    try {
      const req = http.request({
        host: "127.0.0.1",
        port,
        method: "POST",
        headers: { "Content-Length": 8 },
      })
      req.on("error", () => {})
      req.end("complete")
      await within(requestEnded.promise, "completed request body")
      req.destroy()
      await within(cancelled.promise, "response-side cancellation")
    } finally {
      await stopServer(server)
    }
  })

  it("aborts when a client disconnects before its request body completes", async () => {
    const cancelled = deferred<void>()
    const { server, port } = await startServer((req, res) => {
      void waitForAbort(createMcpRequestCancellationSignal(req, res)).then(() => cancelled.resolve())
      req.resume()
    })

    try {
      const socket = net.createConnection({ host: "127.0.0.1", port })
      socket.on("error", () => {})
      await new Promise<void>((resolve) => socket.once("connect", resolve))
      socket.write([
        "POST /mcp HTTP/1.1",
        "Host: 127.0.0.1",
        "Content-Length: 64",
        "",
        "{\"jsonrpc\":\"2.0\"}",
      ].join("\r\n"))
      socket.destroy()
      await within(cancelled.promise, "incomplete request cancellation")
    } finally {
      await stopServer(server)
    }
  })
})
