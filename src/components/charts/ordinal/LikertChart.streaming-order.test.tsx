import { describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"
import { LikertChart, type LikertChartHandle } from "./LikertChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock ResizeObserver for jsdom
const resizeObserverGlobal = globalThis as typeof globalThis & { ResizeObserver?: typeof ResizeObserver }
if (typeof resizeObserverGlobal.ResizeObserver === "undefined") {
  resizeObserverGlobal.ResizeObserver = class {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver
}

// This file tests LikertChart end-to-end with the real StreamOrdinalFrame
// (unlike LikertChart.test.tsx, which mocks the frame to inspect props).
// Purpose: lock down the streaming category-ordering contract that
// regressed when `replace()` cleared the category Set on every
// aggregation. Each push should leave the question order stable even
// when the per-question value ordering shifts dramatically.

describe("LikertChart streaming category order", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  const levels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]

  it("preserves question order across pushes where the value-ranked order changes", async () => {
    const ref = React.createRef<LikertChartHandle>()
    render(
      <TooltipProvider>
        <LikertChart
          ref={ref}
          levels={levels}
          valueAccessor="score"
          categoryAccessor="question"
        />
      </TooltipProvider>
    )

    // Seed with responses across three questions in insertion order Q1 → Q2 → Q3.
    await act(async () => {
      ref.current.pushMany([
        { question: "Q1", score: 3 },
        { question: "Q1", score: 4 },
        { question: "Q2", score: 2 },
        { question: "Q3", score: 5 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null))) // let adapter microtask flush

    const firstDomain = ref.current.getScales()?.o.domain()
    expect(firstDomain).toEqual(["Q1", "Q2", "Q3"])

    // Push a batch that flips the per-question total-response counts —
    // Q3 now has by far the most responses, Q1 the fewest. Under the
    // old value-desc ordering this would put Q3 first and Q1 last.
    // preserveCategoryOrder should keep Q1 → Q2 → Q3.
    await act(async () => {
      ref.current.pushMany([
        { question: "Q3", score: 5 },
        { question: "Q3", score: 4 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 4 },
        { question: "Q2", score: 3 },
        { question: "Q2", score: 3 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))

    const secondDomain = ref.current.getScales()?.o.domain()
    expect(secondDomain).toEqual(["Q1", "Q2", "Q3"])
  })

  it("appends a newly-arriving question at the end, not at the top by value", async () => {
    const ref = React.createRef<LikertChartHandle>()
    render(
      <TooltipProvider>
        <LikertChart
          ref={ref}
          levels={levels}
          valueAccessor="score"
          categoryAccessor="question"
        />
      </TooltipProvider>
    )

    await act(async () => {
      ref.current.pushMany([
        { question: "Q1", score: 3 },
        { question: "Q2", score: 4 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))
    expect(ref.current.getScales()?.o.domain()).toEqual(["Q1", "Q2"])

    // Q3 arrives late but gets a huge number of responses. It should
    // still land at the end of the axis (FIFO), not at the front.
    await act(async () => {
      ref.current.pushMany([
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(ref.current.getScales()?.o.domain()).toEqual(["Q1", "Q2", "Q3"])
  })
})
