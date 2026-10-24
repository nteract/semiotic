import { Transform, type Readable, type Writable } from "node:stream"

/** Bound each stdio JSON line before the SDK allocates/parses its JSON tree. */
export function boundedMcpStdin(
  input: Readable,
  output: Writable,
  maxBytes: number
): Transform {
  let bytes = 0
  let parts: Buffer[] = []
  let dropping = false
  const bounded = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      let start = 0
      while (start < chunk.length) {
        const newline = chunk.indexOf(10, start)
        const end = newline === -1 ? chunk.length : newline + 1
        const part = chunk.subarray(start, end)
        if (!dropping && bytes + part.length > maxBytes) {
          parts = []
          bytes = 0
          dropping = true
          output.write(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32600,
                message: "Stdio request exceeds MCP_MAX_BODY_BYTES."
              }
            }) + "\n"
          )
        }
        if (!dropping) {
          parts.push(part)
          bytes += part.length
        }
        if (newline !== -1) {
          if (!dropping) this.push(Buffer.concat(parts, bytes))
          parts = []
          bytes = 0
          dropping = false
        }
        start = end
      }
      done()
    }
  })
  input.pipe(bounded)
  return bounded
}
