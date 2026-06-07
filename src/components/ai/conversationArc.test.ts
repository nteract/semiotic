import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createLocalStorageConversationArcSink,
  createWebhookConversationArcSink,
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
  loadConversationArc,
  recordAudienceChange,
  recordAnnotationStatusChange,
  registerConversationArcSink,
  type AnnotationStatusChangedEvent,
  type ConversationArcEvent,
} from "./conversationArc"
import { summarizeArc } from "./useConversationArc"

afterEach(() => {
  // Tests share module-scope state — reset between cases so order
  // doesn't matter and a failing test doesn't poison the next one.
  getConversationArcStore().reset()
})

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

describe("conversationArc — default (disabled) surface", () => {
  it("is a no-op until enabled", () => {
    const store = getConversationArcStore()
    expect(store.enabled).toBe(false)
    expect(store.sessionId).toBeNull()

    const result = store.record({
      type: "chart-rendered",
      component: "LineChart",
    })

    expect(result).toBeNull()
    expect(store.getEvents()).toEqual([])
  })

  it("returns a no-op unsubscribe before enable", () => {
    const unsub = getConversationArcStore().subscribe(() => {})
    expect(typeof unsub).toBe("function")
    expect(() => unsub()).not.toThrow()
  })

  // Regression: a listener registered before enable used to silently
  // drop because the per-session listener Set didn't exist yet. The
  // docs demo subscribed at mount and saw no events until the user
  // toggled enable, but no events arrived after that either.
  it("delivers events to listeners that subscribed before enable", () => {
    const seen: string[] = []
    const unsub = getConversationArcStore().subscribe((e) => seen.push(e.type))

    enableConversationArc()
    getConversationArcStore().record({ type: "chart-rendered", component: "LineChart" })

    expect(seen).toEqual(["chart-rendered"])
    unsub()
  })

  it("keeps subscribers attached across disable / re-enable transitions", () => {
    enableConversationArc()
    const seen: string[] = []
    const unsub = getConversationArcStore().subscribe((e) => seen.push(e.type))

    getConversationArcStore().record({ type: "chart-rendered", component: "A" })
    disableConversationArc()
    // While disabled, record() returns null and listeners aren't notified.
    getConversationArcStore().record({ type: "chart-rendered", component: "B" })
    enableConversationArc()
    getConversationArcStore().record({ type: "chart-rendered", component: "C" })

    expect(seen).toEqual(["chart-rendered", "chart-rendered"])
    unsub()
  })
})

describe("conversationArc — enable / record / subscribe", () => {
  it("stamps sessionId and timestamp onto recorded events", () => {
    enableConversationArc({ sessionId: "test-session" })
    const before = Date.now()

    const event = getConversationArcStore().record({
      type: "suggestion-shown",
      components: ["LineChart", "AreaChart"],
      intent: "trend",
    })

    expect(event).not.toBeNull()
    expect(event?.sessionId).toBe("test-session")
    expect(event?.timestamp).toBeGreaterThanOrEqual(before)
    expect(event?.type).toBe("suggestion-shown")
  })

  it("preserves caller-provided timestamp and sessionId", () => {
    enableConversationArc()
    const event = getConversationArcStore().record({
      type: "audience-set",
      audience: "analyst",
      timestamp: 12345,
      sessionId: "override",
    })

    expect(event?.timestamp).toBe(12345)
    expect(event?.sessionId).toBe("override")
  })

  it("broadcasts to subscribers in registration order", () => {
    enableConversationArc()
    const seen: string[] = []
    const store = getConversationArcStore()
    store.subscribe((e) => seen.push(`a:${e.type}`))
    store.subscribe((e) => seen.push(`b:${e.type}`))

    store.record({ type: "chart-exported", component: "BarChart", format: "jsx" })

    expect(seen).toEqual(["a:chart-exported", "b:chart-exported"])
  })

  it("returns an unsubscribe that detaches the listener", () => {
    enableConversationArc()
    const listener = vi.fn()
    const unsub = getConversationArcStore().subscribe(listener)

    getConversationArcStore().record({ type: "chart-abandoned" })
    unsub()
    getConversationArcStore().record({ type: "chart-abandoned" })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("isolates one subscriber's throw from siblings and from recording", () => {
    enableConversationArc()
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const goodListener = vi.fn()
    const store = getConversationArcStore()
    store.subscribe(() => {
      throw new Error("boom")
    })
    store.subscribe(goodListener)

    const event = store.record({ type: "chart-rendered", component: "PieChart" })

    expect(event).not.toBeNull()
    expect(goodListener).toHaveBeenCalledTimes(1)
    expect(consoleWarn).toHaveBeenCalled()
    consoleWarn.mockRestore()
  })
})

describe("conversationArc — ring buffer", () => {
  it("evicts oldest events when capacity is exceeded", () => {
    enableConversationArc({ capacity: 3 })
    const store = getConversationArcStore()

    for (let i = 0; i < 5; i++) {
      store.record({
        type: "chart-rendered",
        component: `Chart${i}`,
      })
    }

    const events = store.getEvents() as Extract<
      ConversationArcEvent,
      { type: "chart-rendered" }
    >[]
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.component)).toEqual(["Chart2", "Chart3", "Chart4"])
  })

  it("flush() returns and clears the buffer", () => {
    enableConversationArc()
    const store = getConversationArcStore()
    store.record({ type: "chart-rendered", component: "A" })
    store.record({ type: "chart-rendered", component: "B" })

    const flushed = store.flush()
    expect(flushed).toHaveLength(2)
    expect(store.getEvents()).toEqual([])
  })

  it("clear() empties the buffer but keeps the store enabled", () => {
    enableConversationArc()
    const store = getConversationArcStore()
    store.record({ type: "chart-rendered", component: "A" })
    store.clear()
    expect(store.getEvents()).toEqual([])
    expect(store.enabled).toBe(true)
  })

  it("shrinking capacity drops the oldest events immediately", () => {
    enableConversationArc({ capacity: 10 })
    const store = getConversationArcStore()
    for (let i = 0; i < 6; i++) {
      store.record({ type: "chart-rendered", component: `C${i}` })
    }

    enableConversationArc({ capacity: 3 })

    const events = store.getEvents() as Extract<
      ConversationArcEvent,
      { type: "chart-rendered" }
    >[]
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.component)).toEqual(["C3", "C4", "C5"])
  })

  it("rejects non-positive capacity", () => {
    expect(() => enableConversationArc({ capacity: 0 })).toThrow(/positive/)
    expect(() => enableConversationArc({ capacity: -5 })).toThrow(/positive/)
  })
})

describe("conversationArc — sinks and replay", () => {
  it("writes accepted events to registered sinks and stops after unregister", () => {
    const record = vi.fn()
    const unregister = registerConversationArcSink({ record })

    getConversationArcStore().record({ type: "chart-rendered", component: "Disabled" })
    expect(record).not.toHaveBeenCalled()

    enableConversationArc({ sessionId: "sink-test" })
    getConversationArcStore().record({ type: "chart-rendered", component: "LineChart" })
    unregister()
    getConversationArcStore().record({ type: "chart-rendered", component: "BarChart" })

    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      type: "chart-rendered",
      component: "LineChart",
      sessionId: "sink-test",
    })
  })

  it("localStorage sink appends, trims, loads, and clears events", () => {
    const storage = new MemoryStorage()
    const sink = createLocalStorageConversationArcSink({
      storage,
      key: "arc:test",
      maxEvents: 2,
    })

    registerConversationArcSink(sink)
    enableConversationArc()
    getConversationArcStore().record({ type: "chart-rendered", component: "A" })
    getConversationArcStore().record({ type: "chart-rendered", component: "B" })
    getConversationArcStore().record({ type: "chart-rendered", component: "C" })

    const persisted = sink.load() as Extract<
      ConversationArcEvent,
      { type: "chart-rendered" }
    >[]
    expect(persisted.map((event) => event.component)).toEqual(["B", "C"])

    getConversationArcStore().clear()
    expect(sink.load()).toEqual([])
  })

  it("flush notifies sinks with the exported events", () => {
    const flush = vi.fn()
    registerConversationArcSink({ flush })
    enableConversationArc()
    getConversationArcStore().record({ type: "chart-rendered", component: "A" })

    const flushed = getConversationArcStore().flush()

    expect(flushed).toHaveLength(1)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush.mock.calls[0]?.[0]).toEqual(flushed)
  })

  it("webhook sink posts mapped event payloads", () => {
    const fetcher = vi.fn().mockResolvedValue({})
    const sink = createWebhookConversationArcSink({
      url: "https://example.test/arc",
      method: "PUT",
      headers: { "X-Arc": "1" },
      fetch: fetcher,
      mapEvent: (event) => ({ type: event.type, sessionId: event.sessionId }),
    })

    registerConversationArcSink(sink)
    enableConversationArc({ sessionId: "webhook-test" })
    getConversationArcStore().record({ type: "chart-exported", component: "LineChart", format: "svg" })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/arc",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Arc": "1" },
        body: JSON.stringify({ type: "chart-exported", sessionId: "webhook-test" }),
      })
    )
  })

  it("loadConversationArc hydrates replay events without re-emitting to sinks or listeners", () => {
    const sinkRecord = vi.fn()
    const listener = vi.fn()
    registerConversationArcSink({ record: sinkRecord })
    getConversationArcStore().subscribe(listener)

    const saved: ConversationArcEvent[] = [
      {
        type: "chart-rendered",
        component: "ReplayChart",
        timestamp: 111,
        sessionId: "saved-session",
      },
      {
        type: "chart-exported",
        component: "ReplayChart",
        format: "jsx",
        timestamp: 222,
        sessionId: "saved-session",
      },
    ]

    const loaded = loadConversationArc(saved)

    expect(loaded).toEqual(saved)
    expect(getConversationArcStore().enabled).toBe(false)
    expect(getConversationArcStore().sessionId).toBe("saved-session")
    expect(getConversationArcStore().getEvents()).toEqual(saved)
    expect(sinkRecord).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
  })

  it("loadConversationArc can append and apply capacity", () => {
    loadConversationArc(
      [
        { type: "chart-rendered", component: "A", timestamp: 1, sessionId: "s" },
        { type: "chart-rendered", component: "B", timestamp: 2, sessionId: "s" },
      ],
      { capacity: 2 }
    )

    const loaded = loadConversationArc(
      [{ type: "chart-rendered", component: "C", timestamp: 3, sessionId: "s" }],
      { append: true, capacity: 2 }
    ) as Extract<ConversationArcEvent, { type: "chart-rendered" }>[]

    expect(loaded.map((event) => event.component)).toEqual(["B", "C"])
  })
})

describe("conversationArc — lifecycle", () => {
  it("disable preserves buffered events but stops recording new ones", () => {
    enableConversationArc()
    const store = getConversationArcStore()
    store.record({ type: "chart-rendered", component: "A" })

    disableConversationArc()
    const blocked = store.record({ type: "chart-rendered", component: "B" })

    expect(blocked).toBeNull()
    expect(store.getEvents()).toHaveLength(1)
    expect(store.enabled).toBe(false)
  })

  it("exposes sessionId after disable so buffered events stay correlatable", () => {
    enableConversationArc({ sessionId: "preserved" })
    const store = getConversationArcStore()
    expect(store.sessionId).toBe("preserved")

    disableConversationArc()
    expect(store.enabled).toBe(false)
    expect(store.sessionId).toBe("preserved")
  })

  it("re-enable resumes recording with the same sessionId", () => {
    enableConversationArc({ sessionId: "fixed" })
    disableConversationArc()
    enableConversationArc()

    const event = getConversationArcStore().record({
      type: "chart-rendered",
      component: "A",
    })

    expect(event?.sessionId).toBe("fixed")
  })

  it("reset() returns the store to the default disabled state", () => {
    enableConversationArc()
    const store = getConversationArcStore()
    store.record({ type: "chart-rendered", component: "A" })
    store.reset()

    expect(store.enabled).toBe(false)
    expect(store.sessionId).toBeNull()
    expect(store.getEvents()).toEqual([])
  })
})

describe("conversationArc — recordAudienceChange convenience", () => {
  it("stamps a typed audience-set event onto the buffer", () => {
    enableConversationArc({ sessionId: "audience-test" })
    const event = recordAudienceChange("executive", "analyst")
    expect(event?.type).toBe("audience-set")
    expect(event && "audience" in event && event.audience).toBe("executive")
    expect(event && "previous" in event && event.previous).toBe("analyst")
  })

  it("omits `previous` when null is passed", () => {
    enableConversationArc()
    const event = recordAudienceChange("executive", null)
    expect(event && "previous" in event && event.previous).toBeUndefined()
  })

  it("forwards arcId / meta for correlation", () => {
    enableConversationArc()
    const event = recordAudienceChange("executive", "analyst", {
      arcId: "session-42",
      meta: { trigger: "picker" },
    })
    expect(event?.arcId).toBe("session-42")
    expect(event?.meta).toEqual({ trigger: "picker" })
  })

  it("returns null when the store is disabled", () => {
    expect(recordAudienceChange("executive")).toBeNull()
  })
})

describe("recordAnnotationStatusChange (M7)", () => {
  it("records an annotation-status-changed event when enabled", () => {
    enableConversationArc({ sessionId: "s" })
    const event = recordAnnotationStatusChange("disputed", {
      annotationId: "claim-1",
      fromStatus: "proposed",
      chartId: "chart-7",
    }) as AnnotationStatusChangedEvent | null
    expect(event?.type).toBe("annotation-status-changed")
    expect(event?.toStatus).toBe("disputed")
    expect(event?.fromStatus).toBe("proposed")
    expect(event?.annotationId).toBe("claim-1")
    expect(event?.chartId).toBe("chart-7")
  })

  it("returns null when the store is disabled", () => {
    expect(recordAnnotationStatusChange("accepted")).toBeNull()
  })

  it("does not pollute componentsSeen with status values in summarizeArc", () => {
    enableConversationArc()
    recordAnnotationStatusChange("disputed", { fromStatus: "proposed" })
    const summary = summarizeArc(getConversationArcStore().getEvents())
    // fromStatus/toStatus must not be read as chart-component names.
    expect(summary.componentsSeen).not.toContain("disputed")
    expect(summary.componentsSeen).not.toContain("proposed")
    expect(summary.byType["annotation-status-changed"]).toBe(1)
  })
})
