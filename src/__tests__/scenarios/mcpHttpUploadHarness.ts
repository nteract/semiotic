import * as net from "net"

/** Leave a chunked upload unfinished and observe the server closing its socket. */
export function openPartialMcpUpload(port: number, body = "{") {
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
          "POST /mcp HTTP/1.1",
          `Host: 127.0.0.1:${port}`,
          "Accept: application/json, text/event-stream",
          "Content-Type: application/json",
          "Transfer-Encoding: chunked",
          "Expect: 100-continue",
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
