import { OrdinalPipelineStore } from "../../stream/OrdinalPipelineStore"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
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

  it("accepts a survey export in one batch and reads only the appended responses on push", async () => {
    const ref = React.createRef<LikertChartHandle>()
    let reads = 0
    const score = (d: { [key: string]: unknown }) => {
      reads++
      return Number(d.score)
    }
    render(<TooltipProvider><LikertChart ref={ref} levels={levels} valueAccessor={score} categoryAccessor="question" /></TooltipProvider>)
    const row = { question: "Q1", score: 1 }
    await act(async () => { ref.current!.pushMany(Array(200_000).fill(row)) })
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1"])
    reads = 0
    await act(async () => { ref.current!.push({ question: "Q2", score: 3 }) })
    expect(reads).toBe(1)
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1", "Q2"])
  })

  it("updates, removes, and replaces the authored rows and keeps the rendered question totals coherent", async () => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    const ref = React.createRef<LikertChartHandle>()
    render(<TooltipProvider><LikertChart ref={ref} levels={levels} valueAccessor="score" categoryAccessor="question" dataIdAccessor="id" /></TooltipProvider>)
    const one = { id: "a", question: "Q1", score: 1 }
    const two = { id: "b", question: "Q2", score: 2 }
    const changed = { ...two, question: "Q3", score: 3 }
    await act(async () => {
      ref.current!.pushMany([one, two])
      expect(ref.current!.remove("a")).toEqual([one])
      expect(ref.current!.update("b", () => changed)).toEqual([two])
      ref.current!.push({ id: "c", question: "Q3", score: 3 })
    })
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q3"])
    const aggregate = ingest.mock.calls.at(-1)![0].inserts
    expect(aggregate.filter(row => row.__likertLevelLabel === "Neutral")).toEqual([
      expect.objectContaining({ __likertCategory: "Q3", __likertCount: 2, __likertPct: -50 }),
      expect.objectContaining({ __likertCategory: "Q3", __likertCount: 2, __likertPct: 50 })
    ])
    ingest.mockRestore()
    await act(async () => {
      ref.current!.replace!([one])
      ref.current!.push(two)
    })
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1", "Q2"])
    expect(ref.current!.getData()).toEqual([one, two])
  })

  it("captures the original category, level and count before a nested in-place edit", async () => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    try {
      const ref = React.createRef<LikertChartHandle>()
      render(<TooltipProvider><LikertChart ref={ref} levels={["No", "Yes"]} dataIdAccessor="id"
        categoryAccessor={row => row.answer.question} levelAccessor={row => row.answer.level}
        countAccessor={row => row.answer.count} /></TooltipProvider>)
      await act(async () => {
        ref.current!.pushMany(["a", "b"].map(id => ({ id, answer: { question: "Q1", level: "No", count: 3 } })))
        ref.current!.update("a", row => {
          Object.assign(row.answer, { question: "Q2", level: "Yes", count: 5 })
          return row
        })
      })
      const rendered = ingest.mock.calls.at(-1)![0].inserts
      expect(rendered.map(row => [row.__likertCategory, row.__likertLevelLabel, row.__likertCount])).toEqual([
        ["Q1", "No", 3], ["Q1", "Yes", 0], ["Q2", "No", 0], ["Q2", "Yes", 5]
      ])
    } finally {
      ingest.mockRestore()
    }
  })

  it("reflects mutations shared by retained responses after consecutive updates", async () => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    try {
      const ref = React.createRef<LikertChartHandle>()
      render(<TooltipProvider><LikertChart ref={ref} levels={["No", "Yes"]} dataIdAccessor="id"
        valueAccessor={row => row.answer.score} /></TooltipProvider>)
      const answer = { score: 1 }
      await act(async () => {
        ref.current!.pushMany(["a", "b"].map(id => ({ id, question: "Q1", answer })))
        ref.current!.update("a", row => { row.answer.score = 2; return row })
      })
      const counts = () => ingest.mock.calls.at(-1)![0].inserts.map(row => row.__likertCount)
      expect(counts()).toEqual([0, 2])
      await act(async () => {
        ref.current!.update("b", row => { row.answer.score = 1; return row })
        ref.current!.remove("a")
      })
      expect(counts()).toEqual([1, 0])
    } finally {
      ingest.mockRestore()
    }
  })

  it("moves a raw nested score between levels while preserving its neighbors", async () => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    try {
      const ref = React.createRef<LikertChartHandle>()
      render(<TooltipProvider><LikertChart ref={ref} levels={["No", "Yes"]} dataIdAccessor="id"
        valueAccessor={row => row.answer.score} /></TooltipProvider>)
      await act(async () => {
        ref.current!.pushMany(["a", "b"].map(id => ({ id, question: "Q1", answer: { score: 1 } })))
        ref.current!.update("a", row => {
          row.answer.score = 2
          return row
        })
      })
      expect(ingest.mock.calls.at(-1)![0].inserts.map(row => row.__likertCount)).toEqual([1, 1])
    } finally {
      ingest.mockRestore()
    }
  })

  it.each(["remove", "evict"])("discards exhausted fractional weights on %s and retains tiny weights", async operation => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    try {
      const ref = React.createRef<LikertChartHandle>()
      render(<TooltipProvider><LikertChart ref={ref} levels={["No", "Yes"]} dataIdAccessor="id"
        categoryAccessor="question" levelAccessor="level" countAccessor="weight" windowSize={4} /></TooltipProvider>)
      await act(async () => {
        ref.current!.pushMany([
          { id: "a", question: "Q1", level: "No", weight: 0.1 },
          { id: "b", question: "Q1", level: "No", weight: 0.2 },
          { id: "c", question: "Q1", level: "Yes", weight: 0 },
          { id: "d", question: "Q2", level: "Yes", weight: 1e-30 }
        ])
      })
      await act(async () => {
        if (operation === "remove") ref.current!.remove(["a", "b"])
        else ref.current!.pushMany(["e", "f"].map(id => ({ id, question: "Q2", level: "No", weight: 0 })))
      })
      expect(ingest.mock.calls.at(-1)![0].inserts.map(row => [row.__likertCategory, row.__likertCount])).toEqual([
        ["Q2", 0], ["Q2", 1e-30]
      ])
      await act(async () => {
        ref.current!.replace!([
          { id: "large", question: "Q1", level: "No", weight: 1 },
          { id: "tiny", question: "Q1", level: "No", weight: 1e-30 }
        ])
        ref.current!.remove("large")
      })
      expect(ingest.mock.calls.at(-1)![0].inserts[0].__likertCount).toBe(1e-30)
    } finally {
      ingest.mockRestore()
    }
  })

  it("includes a response pushed between rendering and committing a new scale", async () => {
    const ref = React.createRef<LikertChartHandle>()
    let previous: LikertChartHandle | null = null
    function Producer({ active }: { active: boolean }) {
      React.useLayoutEffect(() => {
        if (active) previous!.push({ question: "During commit", score: 2 })
      }, [active])
      return null
    }
    const chart = (active: boolean) => <TooltipProvider>
      <Producer active={active} />
      <LikertChart ref={ref} levels={active ? ["Low", "High"] : levels} valueAccessor="score" />
    </TooltipProvider>
    const { rerender } = render(chart(false))
    previous = ref.current
    await act(async () => rerender(chart(true)))
    expect(ref.current!.getData()).toHaveLength(1)
    expect(ref.current!.getScales()?.o.domain()).toEqual(["During commit"])
  })

  it("counts later pushes from an already subscribed producer using the committed fields", async () => {
    const ref = React.createRef<LikertChartHandle>()
    type Response = { score: number; oldGroup?: string; newGroup: string }
    const chart = (category: "oldGroup" | "newGroup") => <TooltipProvider><LikertChart<Response> ref={ref} levels={levels}
      valueAccessor="score" categoryAccessor={category} /></TooltipProvider>
    const { rerender } = render(chart("oldGroup"))
    const push = ref.current!.push
    rerender(chart("newGroup"))
    await act(async () => push({ oldGroup: "Old", newGroup: "First", score: 2 }))
    await act(async () => ref.current!.push({ newGroup: "Second", score: 1 }))
    expect(ref.current!.getScales()?.o.domain()).toEqual(["First", "Second"])
  })

  it("preserves the first question when its only response changes in the initial batch", async () => {
    const ref = React.createRef<LikertChartHandle>()
    render(<TooltipProvider><LikertChart ref={ref} levels={levels} valueAccessor="score" dataIdAccessor="id" /></TooltipProvider>)
    await act(async () => {
      ref.current!.pushMany([{ id: "a", question: "Q1", score: 1 }, { id: "b", question: "Q2", score: 2 }])
      ref.current!.update("a", row => ({ ...row, score: 3 }))
    })
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1", "Q2"])
  })

  it.each(["remove", "replace"])("publishes an empty %s across a synchronous configuration change", async operation => {
    const ingest = vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    try {
      const ref = React.createRef<LikertChartHandle>()
      const chart = (labels: string[]) => <TooltipProvider><LikertChart ref={ref} levels={labels} valueAccessor="score" dataIdAccessor="id" /></TooltipProvider>
      const { rerender } = render(chart(["No", "Yes"]))
      await act(async () => { ref.current!.push({ id: "a", question: "Q1", score: 1 }) })
      act(() => {
        if (operation === "remove") ref.current!.remove("a")
        else ref.current!.replace!([])
      })
      rerender(chart(["Low", "High"]))
      await act(async () => {})
      expect(ref.current!.getData()).toEqual([])
      expect(ingest.mock.calls.at(-1)![0].inserts).toEqual([])
    } finally {
      ingest.mockRestore()
    }
  })

  it("evicts FIFO rows and reapplies a smaller retention limit to pre-aggregated responses", async () => {
    const ref = React.createRef<LikertChartHandle>()
    const chart = (windowSize: number) => <TooltipProvider><LikertChart ref={ref} levels={levels}
      levelAccessor="level" countAccessor="n" categoryAccessor="question" windowSize={windowSize} /></TooltipProvider>
    const { rerender } = render(chart(2))
    const source = ["Q1", "Q2", "Q3"].map(question => ({ question, level: levels[0], n: 2 }))
    await act(async () => { ref.current!.pushMany(source) })
    expect(ref.current!.getData()).toEqual(source.slice(1))
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q2", "Q3"])
    await act(async () => { rerender(chart(1)) })
    expect(ref.current!.getData()).toEqual(source.slice(2))
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q3"])
  })

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
      ref.current!.pushMany([
        { question: "Q1", score: 3 },
        { question: "Q1", score: 4 },
        { question: "Q2", score: 2 },
        { question: "Q3", score: 5 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null))) // let adapter microtask flush

    const firstDomain = ref.current!.getScales()?.o.domain()
    expect(firstDomain).toEqual(["Q1", "Q2", "Q3"])

    // Push a batch that flips the per-question total-response counts —
    // Q3 now has by far the most responses, Q1 the fewest. Under the
    // old value-desc ordering this would put Q3 first and Q1 last.
    // preserveCategoryOrder should keep Q1 → Q2 → Q3.
    await act(async () => {
      ref.current!.pushMany([
        { question: "Q3", score: 5 },
        { question: "Q3", score: 4 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 4 },
        { question: "Q2", score: 3 },
        { question: "Q2", score: 3 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))

    const secondDomain = ref.current!.getScales()?.o.domain()
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
      ref.current!.pushMany([
        { question: "Q1", score: 3 },
        { question: "Q2", score: 4 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))
    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1", "Q2"])

    // Q3 arrives late but gets a huge number of responses. It should
    // still land at the end of the axis (FIFO), not at the front.
    await act(async () => {
      ref.current!.pushMany([
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
        { question: "Q3", score: 5 },
      ])
    })
    await new Promise(r => queueMicrotask(() => r(null)))

    expect(ref.current!.getScales()?.o.domain()).toEqual(["Q1", "Q2", "Q3"])
  })
})
