import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js"
import { withMcpOperationLimits } from "./mcp-operation-transport"

describe("MCP tool admission before SDK dispatch", () => {
  it("rejects oversized arguments with the original id and forwards valid requests", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const server = withMcpOperationLimits(inner, {
      maxRows: 2,
      maxCells: 20,
      maxNestingDepth: 3
    })
    const received: JSONRPCMessage[] = []
    const dispatch = vi.fn()
    server.onmessage = dispatch
    client.onmessage = (message) => received.push(message)
    await server.start()
    await client.start()
    await client.send({
      jsonrpc: "2.0",
      id: "over-limit",
      method: "tools/call",
      params: { name: "renderChart", arguments: { props: { data: [1, 2, 3] } } }
    })
    expect(received).toEqual([
      {
        jsonrpc: "2.0",
        id: "over-limit",
        error: {
          code: -32602,
          message: expect.stringContaining("MCP_MAX_ROWS")
        }
      }
    ])
    expect(dispatch).not.toHaveBeenCalled()
    const valid = {
      jsonrpc: "2.0" as const,
      id: "valid",
      method: "tools/call",
      params: { name: "renderChart", arguments: { props: { data: [1] } } }
    }
    await client.send(valid)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(valid, {})
    const closed = vi.fn()
    server.onclose = closed
    await server.close()
    expect(closed).toHaveBeenCalledOnce()
  })
})
