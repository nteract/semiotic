import type { Datum } from "../../components/charts/shared/datumTypes"
import * as http from "http"
import * as net from "net"

/** Leave a chunked upload unfinished and observe the server closing its socket. */
export function openPartialMcpUpload(
  port: number,
  body = "{",
  headers: Record<string, string> = {},
  pathname = "/mcp"
) {
  const socket = net.createConnection({ host: "127.0.0.1", port })
  let output = ""
  const ready = new Promise<void>((resolve, reject) => {
    socket.on("data", (chunk) => {
      output += chunk.toString()
      if (output.includes("100 Continue")) resolve()
    })
    socket.once("error", reject)
    socket.once("connect", () => {
      socket.write(
        [
          `POST ${pathname} HTTP/1.1`,
          `Host: 127.0.0.1:${port}`,
          "Accept: application/json, text/event-stream",
          "Content-Type: application/json",
          "Transfer-Encoding: chunked",
          "Expect: 100-continue",
          ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
          "",
          `${Buffer.byteLength(body).toString(16)}\r\n${body}\r\n`
        ].join("\r\n")
      )
    })
  })
  const closed = new Promise<string>((resolve, reject) => {
    socket.once("close", () => resolve(output))
    socket.once("error", reject)
    socket.setTimeout(3000, () => {
      socket.destroy(new Error("Server did not close the partial upload"))
    })
  })
  // These promises may settle while the caller is checking another request.
  void ready.catch(() => {})
  void closed.catch(() => {})
  return { ready, closed, socket }
}

/** Send a complete request to verify admission, execution and recovery. */
export function requestHTTP(port: number, pathName: string, options: {
  method?: string
  host?: string
  body?: Datum
  headers?: Record<string, string>
} = {}): Promise<{
  body?: unknown
  headers: http.IncomingHttpHeaders
  status: number
  text: string
}> {
  return new Promise((resolve, reject) => {
    const bodyText = options.body ? JSON.stringify(options.body) : undefined
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathName,
      method: options.method ?? (bodyText ? "POST" : "GET"),
      headers: {
        ...(options.host ? { Host: options.host } : {}),
        ...(bodyText ? {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        } : {}),
        ...options.headers,
      },
    }, (res) => {
      let text = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => { text += chunk })
      res.on("end", () => {
        let body
        try {
          body = text ? JSON.parse(text) : undefined
        } catch {
          body = undefined
        }
        resolve({
          body,
          headers: res.headers,
          status: res.statusCode ?? 0,
          text,
        })
      })
    })
    req.on("error", reject)
    if (bodyText) req.write(bodyText)
    req.end()
  })
}
