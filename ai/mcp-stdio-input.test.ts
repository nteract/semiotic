import { Readable, Writable } from "node:stream"
import { boundedMcpStdin } from "./mcp-stdio-input"

describe("bounded MCP stdio framing", () => {
  it("drops a split oversized UTF-8 line once and continues with valid requests", async () => {
    const errors: string[] = []
    const output = new Writable({
      write(chunk, _encoding, done) {
        errors.push(String(chunk))
        done()
      }
    })
    const valid = '{"id":2}\n'
    const input = Readable.from([
      Buffer.from('"éé'),
      Buffer.from("ééé"),
      Buffer.from('ééé"\n' + valid)
    ])
    const bounded = boundedMcpStdin(input, output, 12)
    const accepted: Buffer[] = []
    for await (const chunk of bounded) accepted.push(chunk)
    expect(Buffer.concat(accepted).toString()).toBe(valid)
    expect(errors).toHaveLength(1)
    expect(JSON.parse(errors[0])).toMatchObject({
      id: null,
      error: { message: expect.stringContaining("MCP_MAX_BODY_BYTES") }
    })
  })

  it("accepts exact-size lines and resets the budget for each message", async () => {
    const message = '{"id":1}\n'
    const write = vi.fn((_chunk, _encoding, done) => done())
    const bounded = boundedMcpStdin(
      Readable.from([Buffer.from(message.repeat(3))]),
      new Writable({ write }),
      Buffer.byteLength(message)
    )
    const accepted: Buffer[] = []
    for await (const chunk of bounded) accepted.push(chunk)
    expect(Buffer.concat(accepted).toString()).toBe(message.repeat(3))
    expect(write).not.toHaveBeenCalled()
  })
})
