import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  enableConversationArc,
  getConversationArcStore,
  type ConversationArcEvent,
} from "./conversationArc"
import { useChartSuggestions } from "./useChartSuggestions"

afterEach(() => {
  getConversationArcStore().reset()
})

// Minimal trend-shaped dataset — three numeric series over a time axis.
// Used so the heuristic suggester returns >0 suggestions and we can
// assert the arc receives them.
const TREND_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenue: 1000 + i * 100,
  cost: 800 + i * 60,
}))

describe("useChartSuggestions — conversation-arc instrumentation", () => {
  it("emits no events when the arc store is disabled (zero overhead default)", () => {
    const seen: ConversationArcEvent[] = []
    const unsub = getConversationArcStore().subscribe((e) => seen.push(e))
    renderHook(() => useChartSuggestions(TREND_DATA, { intent: "trend" }))
    expect(seen).toHaveLength(0)
    unsub()
  })

  it("emits a suggestion-shown event when enabled", () => {
    enableConversationArc({ sessionId: "use-suggestions-test" })
    const seen: ConversationArcEvent[] = []
    getConversationArcStore().subscribe((e) => seen.push(e))

    renderHook(() => useChartSuggestions(TREND_DATA, { intent: "trend" }))

    const events = seen.filter((e) => e.type === "suggestion-shown")
    expect(events).toHaveLength(1)
    const e = events[0] as Extract<ConversationArcEvent, { type: "suggestion-shown" }>
    expect(e.intent).toBe("trend")
    expect(e.components.length).toBeGreaterThan(0)
    expect(typeof e.topScore).toBe("number")
  })

  it("does not double-emit on stable inputs (signature dedup)", () => {
    enableConversationArc()
    const seen: ConversationArcEvent[] = []
    getConversationArcStore().subscribe((e) => seen.push(e))

    const { rerender } = renderHook(
      ({ data }: { data: typeof TREND_DATA }) =>
        useChartSuggestions(data, { intent: "trend" }),
      { initialProps: { data: TREND_DATA } }
    )
    rerender({ data: TREND_DATA })
    rerender({ data: TREND_DATA })

    const events = seen.filter((e) => e.type === "suggestion-shown")
    expect(events).toHaveLength(1)
  })

  it("re-emits when the intent changes", () => {
    enableConversationArc()
    const seen: ConversationArcEvent[] = []
    getConversationArcStore().subscribe((e) => seen.push(e))

    type Intent = "trend" | "compare-categories"
    const { rerender } = renderHook(
      ({ intent }: { intent: Intent }) =>
        useChartSuggestions(TREND_DATA, { intent }),
      { initialProps: { intent: "trend" as Intent } }
    )
    rerender({ intent: "compare-categories" as Intent })

    const events = seen.filter((e) => e.type === "suggestion-shown")
    expect(events).toHaveLength(2)
    expect((events[0] as { intent?: string }).intent).toBe("trend")
    expect((events[1] as { intent?: string }).intent).toBe("compare-categories")
  })
})
