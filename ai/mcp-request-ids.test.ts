import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import {
  CallToolRequestSchema,
  EmptyResultSchema,
  type JSONRPCMessage
} from "@modelcontextprotocol/sdk/types.js"
import { withMcpRequestIds } from "./mcp-request-ids"

const ids = [0, "", 7, "7", "0", "semiotic:request:0", 'semiotic:request:""']

describe("MCP client request identity", () => {
  it.each(ids)("cancels request %j through the real SDK", async (id) => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const server = new Server(
      { name: "cancellation-test", version: "1" },
      { capabilities: { tools: {} } }
    )
    let signal: AbortSignal | undefined
    const received: JSONRPCMessage[] = []
    client.onmessage = (message) => received.push(message)
    server.setRequestHandler(CallToolRequestSchema, async (_request, extra) => {
      signal = extra.signal
      await new Promise<void>((resolve) =>
        extra.signal.addEventListener("abort", () => resolve(), { once: true })
      )
      return { content: [] }
    })
    await server.connect(withMcpRequestIds(inner))
    await client.start()
    try {
      await client.send({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "wait" }
      })
      await vi.waitFor(() => expect(signal).toBeDefined())
      await client.send({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: id }
      })
      await vi.waitFor(() => expect(signal!.aborted).toBe(true))
      expect(received).toEqual([])
    } finally {
      await server.close()
    }
  })

  it("isolates concurrent numeric, string, empty and prefix-like IDs", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const server = new Server(
      { name: "identity-test", version: "1" },
      { capabilities: { tools: {} } }
    )
    const signals = new Map<unknown, AbortSignal>()
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      signals.set(request.params.arguments?.label, extra.signal)
      await new Promise<void>((resolve) =>
        extra.signal.addEventListener("abort", () => resolve(), { once: true })
      )
      return { content: [] }
    })
    await server.connect(withMcpRequestIds(inner))
    await client.start()
    try {
      for (const id of ids) {
        await client.send({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: { name: "wait", arguments: { label: id } }
        })
      }
      await vi.waitFor(() => expect(signals.size).toBe(ids.length))
      for (let index = 0; index < ids.length; index++) {
        await client.send({
          jsonrpc: "2.0",
          method: "notifications/cancelled",
          params: { requestId: ids[index] }
        })
        await vi.waitFor(() =>
          expect(signals.get(ids[index])?.aborted).toBe(true)
        )
        expect(ids.map((id) => signals.get(id)?.aborted)).toEqual(
          ids.map((_id, position) => position <= index)
        )
      }
    } finally {
      await server.close()
    }
  })

  it("round-trips successful and failed responses and reuses completed IDs", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const server = new Server(
      { name: "response-test", version: "1" },
      { capabilities: { tools: {} } }
    )
    const received: JSONRPCMessage[] = []
    client.onmessage = (message) => received.push(message)
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "fail") throw new Error("test failure")
      return { content: [{ type: "text", text: "complete" }] }
    })
    await server.connect(withMcpRequestIds(inner))
    await client.start()
    try {
      for (const id of ids) {
        for (const name of ["success", "fail", "success"]) {
          received.length = 0
          await client.send({
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name }
          })
          await vi.waitFor(() => expect(received).toHaveLength(1))
          expect(received[0]).toMatchObject(
            name === "fail"
              ? { id, error: { message: "test failure" } }
              : {
                  id,
                  result: { content: [{ type: "text", text: "complete" }] }
                }
          )
        }
      }
    } finally {
      await server.close()
    }
  })

  it("preserves server-originated IDs and translates related client routing only", async () => {
    const [client, inner] = InMemoryTransport.createLinkedPair()
    const send = vi.spyOn(inner, "send")
    const server = new Server(
      { name: "bidirectional-test", version: "1" },
      { capabilities: { tools: {} } }
    )
    const received: JSONRPCMessage[] = []
    client.onmessage = (message) => {
      received.push(message)
      if ("method" in message && message.method === "ping" && "id" in message) {
        void client.send({ jsonrpc: "2.0", id: message.id, result: {} })
      }
    }
    server.setRequestHandler(CallToolRequestSchema, async (_request, extra) => {
      expect(extra._meta?.progressToken).toBe(0)
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken: 0, progress: 1 }
      })
      await extra.sendRequest({ method: "ping" }, EmptyResultSchema)
      return { content: [] }
    })
    await server.connect(withMcpRequestIds(inner))
    await client.start()
    try {
      await client.send({
        jsonrpc: "2.0",
        id: 0,
        method: "tools/call",
        params: { name: "ping-client", _meta: { progressToken: 0 } }
      })
      await vi.waitFor(() => expect(received).toHaveLength(3))
      expect(received[0]).toMatchObject({
        method: "notifications/progress",
        params: { progressToken: 0 }
      })
      expect(send.mock.calls[0][1]).toMatchObject({ relatedRequestId: 0 })
      expect(received[1]).toMatchObject({ method: "ping", id: 0 })
      expect(send.mock.calls[1][1]).toMatchObject({ relatedRequestId: 0 })
      expect(received[2]).toMatchObject({ id: 0, result: { content: [] } })
    } finally {
      await server.close()
    }
  })
})
