import { renderHook, act } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
} from "./conversationArc"
import { useConversationArc, summarizeArc } from "./useConversationArc"

afterEach(() => {
  getConversationArcStore().reset()
})

describe("summarizeArc", () => {
  it("returns the empty summary for an empty buffer", () => {
    expect(summarizeArc([])).toEqual({
      total: 0,
      byType: {},
      componentsSeen: [],
      audiencesSeen: [],
      startedAt: null,
      lastAt: null,
      durationMs: 0,
    })
  })

  it("counts per-type, dedupes components, preserves audience order", () => {
    const summary = summarizeArc([
      {
        type: "suggestion-shown",
        timestamp: 100,
        sessionId: "s",
        components: ["LineChart", "AreaChart"],
      },
      { type: "audience-set", timestamp: 200, sessionId: "s", audience: "analyst" },
      { type: "suggestion-chosen", timestamp: 300, sessionId: "s", component: "LineChart" },
      { type: "audience-set", timestamp: 400, sessionId: "s", audience: "executive" },
      {
        type: "chart-replaced",
        timestamp: 500,
        sessionId: "s",
        from: "LineChart",
        to: "StackedAreaChart",
      },
      { type: "chart-exported", timestamp: 600, sessionId: "s", component: "StackedAreaChart", format: "jsx" },
    ])

    expect(summary.total).toBe(6)
    expect(summary.byType).toEqual({
      "suggestion-shown": 1,
      "audience-set": 2,
      "suggestion-chosen": 1,
      "chart-replaced": 1,
      "chart-exported": 1,
    })
    expect(summary.componentsSeen.sort()).toEqual(
      ["AreaChart", "LineChart", "StackedAreaChart"].sort()
    )
    expect(summary.audiencesSeen).toEqual(["analyst", "executive"])
    expect(summary.startedAt).toBe(100)
    expect(summary.lastAt).toBe(600)
    expect(summary.durationMs).toBe(500)
  })

  it("captures the most recent arcId across events", () => {
    const summary = summarizeArc([
      { type: "chart-rendered", timestamp: 100, sessionId: "s", component: "A", arcId: "first" },
      { type: "chart-edited", timestamp: 200, sessionId: "s", component: "A", arcId: "second" },
    ])
    expect(summary.latestArcId).toBe("second")
  })

  it("is pure — repeated calls on the same input return equal results", () => {
    const events: Parameters<typeof summarizeArc>[0] = [
      { type: "chart-rendered", timestamp: 1, sessionId: "s", component: "A" },
      { type: "chart-rendered", timestamp: 2, sessionId: "s", component: "B" },
    ]
    expect(summarizeArc(events)).toEqual(summarizeArc(events))
  })
})

describe("useConversationArc", () => {
  it("auto-enables on mount by default", () => {
    const { result } = renderHook(() => useConversationArc({ sessionId: "hook-test" }))
    expect(result.current.enabled).toBe(true)
    expect(result.current.sessionId).toBe("hook-test")
  })

  it("does not enable when enableOnMount is false", () => {
    const { result } = renderHook(() => useConversationArc({ enableOnMount: false }))
    expect(result.current.enabled).toBe(false)
    expect(result.current.sessionId).toBeNull()
  })

  it("re-renders the buffer and summary on each recorded event", () => {
    const { result } = renderHook(() => useConversationArc({ sessionId: "live" }))
    expect(result.current.history).toHaveLength(0)
    expect(result.current.summary.total).toBe(0)

    act(() => {
      result.current.record({
        type: "suggestion-shown",
        components: ["LineChart", "AreaChart"],
        intent: "trend",
      })
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.summary.total).toBe(1)
    expect(result.current.summary.byType["suggestion-shown"]).toBe(1)
    expect(result.current.summary.componentsSeen).toContain("LineChart")
  })

  it("clear empties the buffer without disabling", () => {
    const { result } = renderHook(() => useConversationArc())
    act(() => {
      result.current.record({ type: "chart-rendered", component: "LineChart" })
    })
    expect(result.current.history).toHaveLength(1)

    act(() => {
      result.current.clear()
    })
    expect(result.current.history).toHaveLength(0)
    expect(result.current.enabled).toBe(true)
  })

  it("disableOnUnmount cleans up only when explicitly opted in", () => {
    const { unmount } = renderHook(() => useConversationArc({ disableOnUnmount: true }))
    expect(getConversationArcStore().enabled).toBe(true)
    unmount()
    expect(getConversationArcStore().enabled).toBe(false)
  })

  it("default unmount leaves the store running for sibling consumers", () => {
    const { unmount } = renderHook(() => useConversationArc())
    expect(getConversationArcStore().enabled).toBe(true)
    unmount()
    // Still on — another consumer might be subscribed.
    expect(getConversationArcStore().enabled).toBe(true)
  })

  it("reads events that arrived before mount (replay-from-file pattern)", () => {
    enableConversationArc({ sessionId: "pre-existing" })
    getConversationArcStore().record({ type: "chart-rendered", component: "Bar" })
    getConversationArcStore().record({ type: "chart-rendered", component: "Pie" })

    const { result } = renderHook(() => useConversationArc({ enableOnMount: false }))

    expect(result.current.history).toHaveLength(2)
    expect(result.current.summary.componentsSeen.sort()).toEqual(["Bar", "Pie"])
  })

  it("two hook instances see the same buffer (module-scope store)", () => {
    const { result: a } = renderHook(() => useConversationArc())
    const { result: b } = renderHook(() => useConversationArc())

    act(() => {
      a.current.record({ type: "chart-rendered", component: "From-A" })
    })

    expect(a.current.history).toHaveLength(1)
    expect(b.current.history).toHaveLength(1)

    act(() => {
      b.current.record({ type: "chart-rendered", component: "From-B" })
    })

    expect(a.current.history).toHaveLength(2)
    expect(b.current.history).toHaveLength(2)
  })

  it("returns null from record when the store is disabled", () => {
    const { result } = renderHook(() => useConversationArc({ enableOnMount: false }))
    let stamped
    act(() => {
      stamped = result.current.record({ type: "chart-rendered", component: "X" })
    })
    expect(stamped).toBeNull()
    // Need to refer to disableConversationArc explicitly to satisfy
    // unused-import linting; also exercises the import itself.
    disableConversationArc()
  })
})
