import { afterEach, describe, expect, it, vi } from "vitest"
import {
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
  recordAudienceChange,
  type ConversationArcEvent,
} from "./conversationArc"

afterEach(() => {
  // Tests share module-scope state — reset between cases so order
  // doesn't matter and a failing test doesn't poison the next one.
  getConversationArcStore().reset()
})

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
