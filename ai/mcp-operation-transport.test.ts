import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js"
import { withMcpOperationLimits } from "./mcp-operation-transport"

describe("MCP tool admission before SDK dispatch", () => {
  it("bounds tool results and protocol errors while preserving IDs, codes, and send options", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const send = vi.spyOn(inner, "send")
    const server = withMcpOperationLimits(
      inner,
      { maxRows: 10, maxCells: 10, maxNestingDepth: 3 },
      512
    )
    const received: JSONRPCMessage[] = []
    client.onmessage = (message) => received.push(message)
    await server.start()
    await client.start()
    try {
      const options = { relatedRequestId: "parent-request" }
      for (const id of [0, "", "sdk-error"]) {
        await server.send(
          {
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: "private-value".repeat(1000) }],
              ...(id === "sdk-error" ? { isError: true } : {})
            }
          },
          options
        )
        expect(received.at(-1)).toMatchObject({
          id,
          result: {
            isError: true,
            structuredContent: { code: "OUTPUT_LIMIT_EXCEEDED" }
          }
        })
        expect(send.mock.calls.at(-1)?.[1]).toBe(options)
      }
      await server.send(
        {
          jsonrpc: "2.0",
          id: 7,
          error: {
            code: -32602,
            message: "private-value".repeat(1000)
          }
        },
        options
      )
      expect(received.at(-1)).toMatchObject({
        id: 7,
        error: { code: -32602, data: { code: "OUTPUT_LIMIT_EXCEEDED" } }
      })
      expect(JSON.stringify(received)).not.toContain("private-value")
      expect(
        received.every(
          (value) => Buffer.byteLength(JSON.stringify(value)) < 512
        )
      ).toBe(true)
    } finally {
      await server.close()
      send.mockRestore()
    }
  })

  it("preserves metadata discovery and small result bodies without truncation", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const server = withMcpOperationLimits(
      inner,
      { maxRows: 10, maxCells: 10, maxNestingDepth: 3 },
      512
    )
    const received: JSONRPCMessage[] = []
    client.onmessage = (message) => received.push(message)
    await server.start()
    await client.start()
    const messages: JSONRPCMessage[] = [
      {
        jsonrpc: "2.0",
        id: 1,
        result: { tools: [{ name: "test", description: "x".repeat(1024) }] }
      },
      {
        jsonrpc: "2.0",
        id: 2,
        result: { contents: [{ text: "x".repeat(1024) }] }
      },
      {
        jsonrpc: "2.0",
        id: 3,
        result: {
          content: [],
          structuredContent: { props: { data: [{ value: 1 }] } }
        }
      },
      {
        jsonrpc: "2.0",
        id: 4,
        error: { code: -32602, message: "Invalid arguments" }
      }
    ]
    try {
      for (const message of messages) await server.send(message)
      expect(received).toEqual(messages)
    } finally {
      await server.close()
    }
  })

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
