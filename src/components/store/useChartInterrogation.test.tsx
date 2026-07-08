import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { useChartInterrogation } from "./useChartInterrogation"
import type { InterrogationQuery } from "./useChartInterrogation"

const data = [
  { month: "Jan", revenue: 100 },
  { month: "Feb", revenue: 200 },
  { month: "Mar", revenue: 150 },
]

describe("useChartInterrogation", () => {
  it("exposes a memoized summary derived from data", () => {
    const onQuery: InterrogationQuery = async () => ({ answer: "" })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    expect(result.current.summary.rowCount).toBe(3)
    expect(result.current.summary.fields.revenue.type).toBe("numeric")
  })

  it("appends user and assistant messages on ask()", async () => {
    const onQuery: InterrogationQuery = async () => ({ answer: "Peak in Feb." })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    await act(async () => {
      await result.current.ask("when is the peak?")
    })
    expect(result.current.history).toEqual([
      { role: "user", text: "when is the peak?" },
      { role: "assistant", text: "Peak in Feb." },
    ])
    expect(result.current.loading).toBe(false)
  })

  it("forwards data, summary, componentName, and props to onQuery", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "ok" })
    const { result } = renderHook(() =>
      useChartInterrogation({
        data,
        onQuery,
        componentName: "LineChart",
        props: { xAccessor: "month", yAccessor: "revenue" },
      })
    )
    await act(async () => {
      await result.current.ask("hi")
    })
    const [query, ctx] = onQuery.mock.calls[0]
    expect(query).toBe("hi")
    expect(ctx.componentName).toBe("LineChart")
    expect(ctx.props).toEqual({ xAccessor: "month", yAccessor: "revenue" })
    expect(ctx.summary.rowCount).toBe(3)
    expect(ctx.data).toBe(data)
  })

  it("forwards reader grounding to onQuery when requested", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "ok" })
    const { result } = renderHook(() =>
      useChartInterrogation({
        data,
        onQuery,
        componentName: "PhysicsCustomChart",
        props: {
          projectionRows: [
            { id: "triage", label: "Triage lane", count: 1 },
            { id: "review", label: "Review lane", count: 2 },
          ],
          physics: {
            snapshot: {
              simulationState: "active",
              queue: [{ id: "queued" }],
              config: {
                fixedDt: 1 / 120,
                kernel: { seed: 12, gravity: { x: 0, y: 700 } },
              },
              world: {
                bodies: [{ id: "a", sleeping: false }],
                colliders: [{ id: "sensor-review", sensor: true }],
              },
            },
          },
        },
        includeGrounding: true,
      })
    )

    await act(async () => {
      await result.current.ask("what is happening?")
    })

    const ctx = onQuery.mock.calls[0][1]
    expect(ctx.grounding?.component).toBe("PhysicsCustomChart")
    expect(ctx.grounding?.physics?.simulation).toMatchObject({
      state: "active",
      seed: 12,
      liveBodies: 1,
      queued: 1,
    })
    expect(ctx.grounding?.physics?.aggregates?.leader).toMatchObject({
      label: "Review lane",
      count: 2,
    })
  })

  it("merges initial and AI annotations", async () => {
    const onQuery: InterrogationQuery = async () => ({
      answer: "marking peak",
      annotations: [{ type: "callout", month: "Feb", revenue: 200 }],
    })
    const initialAnnotations = [{ type: "label", month: "Jan" }]
    const { result } = renderHook(() =>
      useChartInterrogation({ data, onQuery, initialAnnotations })
    )
    await act(async () => {
      await result.current.ask("peak?")
    })
    expect(result.current.annotations).toHaveLength(2)
    expect(result.current.annotations[0]).toMatchObject({ type: "label" })
    expect(result.current.annotations[1]).toMatchObject({ type: "callout" })
  })

  it("ignores blank queries", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "" })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    await act(async () => {
      await result.current.ask("   ")
    })
    expect(onQuery).not.toHaveBeenCalled()
    expect(result.current.history).toHaveLength(0)
  })

  it("captures errors without throwing", async () => {
    const onQuery: InterrogationQuery = async () => {
      throw new Error("LLM offline")
    }
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    await act(async () => {
      await result.current.ask("anything")
    })
    expect(result.current.error?.message).toBe("LLM offline")
    expect(result.current.history.at(-1)?.role).toBe("assistant")
  })

  it("flips loading during the in-flight query", async () => {
    let resolve: (v: { answer: string }) => void = () => {}
    const onQuery: InterrogationQuery = () =>
      new Promise((r) => {
        resolve = r
      })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    act(() => {
      void result.current.ask("hi")
    })
    await waitFor(() => expect(result.current.loading).toBe(true))
    await act(async () => {
      resolve({ answer: "done" })
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it("reset() clears history, annotations, and error", async () => {
    const onQuery: InterrogationQuery = async () => ({
      answer: "x",
      annotations: [{ type: "callout" }],
    })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    await act(async () => {
      await result.current.ask("q")
    })
    expect(result.current.history.length).toBe(2)
    act(() => result.current.reset())
    expect(result.current.history).toEqual([])
    expect(result.current.annotations).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it("forwards focus to onQuery when set", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "about feb" })
    const focus = {
      datum: { month: "Feb", revenue: 200 },
      x: 120,
      y: 80,
      source: "click" as const,
    }
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery, focus }))
    await act(async () => {
      await result.current.ask("why this point?")
    })
    expect(onQuery.mock.calls[0][1].focus).toEqual(focus)
  })

  it("omits focus from context when not set", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "ok" })
    const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
    await act(async () => {
      await result.current.ask("anything")
    })
    expect(onQuery.mock.calls[0][1].focus).toBeUndefined()
  })

  it("passes the *latest* focus to ask(), not the focus at hook-creation time", async () => {
    const onQuery = vi.fn().mockResolvedValue({ answer: "ok" })
    let focus: { datum: Record<string, unknown> } | null = {
      datum: { month: "Feb", revenue: 200 },
    }
    const { result, rerender } = renderHook(() => useChartInterrogation({ data, onQuery, focus }))
    // Update focus before asking
    focus = { datum: { month: "Mar", revenue: 150 } }
    rerender()
    await act(async () => {
      await result.current.ask("about this")
    })
    expect(onQuery.mock.calls[0][1].focus?.datum.month).toBe("Mar")
  })

  describe("announce()", () => {
    const onQuery: InterrogationQuery = async () => ({ answer: "" })

    it("appends an assistant-only message to the transcript", () => {
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
      act(() => {
        result.current.announce({ text: "Spike detected at 14:32" })
      })
      expect(result.current.history).toEqual([
        { role: "assistant", text: "Spike detected at 14:32" },
      ])
    })

    it("does not call onQuery", async () => {
      const spy = vi.fn().mockResolvedValue({ answer: "" })
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery: spy }))
      act(() => {
        result.current.announce({ text: "Proactive note" })
      })
      expect(spy).not.toHaveBeenCalled()
    })

    it("APPENDS annotations (unlike ask which replaces them)", () => {
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
      act(() => {
        result.current.announce({
          text: "First spike",
          annotations: [{ type: "callout", ts: 1, label: "A" }],
        })
      })
      act(() => {
        result.current.announce({
          text: "Second spike",
          annotations: [{ type: "callout", ts: 2, label: "B" }],
        })
      })
      expect(result.current.annotations).toHaveLength(2)
      expect(result.current.annotations.map((a) => a.label)).toEqual(["A", "B"])
    })

    it("ignores empty / whitespace-only messages", () => {
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
      act(() => {
        result.current.announce({ text: "   " })
      })
      expect(result.current.history).toEqual([])
    })

    it("interleaves cleanly with ask()", async () => {
      const spyQuery: InterrogationQuery = async () => ({
        answer: "user answer",
        annotations: [{ type: "callout", label: "user-pick" }],
      })
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery: spyQuery }))
      act(() => {
        result.current.announce({
          text: "Watcher: spike",
          annotations: [{ type: "callout", label: "watcher" }],
        })
      })
      await act(async () => {
        await result.current.ask("what was that?")
      })
      // ask() REPLACES annotations; the watcher's annotation is gone after a fresh ask
      expect(result.current.annotations.map((a) => a.label)).toEqual(["user-pick"])
      // History interleaves
      expect(result.current.history.map((m) => m.role)).toEqual(["assistant", "user", "assistant"])
    })

    it("reset() clears announcements", () => {
      const { result } = renderHook(() => useChartInterrogation({ data, onQuery }))
      act(() => {
        result.current.announce({
          text: "Note",
          annotations: [{ type: "callout" }],
        })
      })
      act(() => result.current.reset())
      expect(result.current.history).toEqual([])
      expect(result.current.annotations).toEqual([])
    })
  })
})
