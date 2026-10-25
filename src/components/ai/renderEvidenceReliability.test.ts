import { describe, expect, it, vi } from "vitest"
import { setImmediate as nextTurn } from "node:timers/promises"
import {
  createRenderEvidenceMemo,
  evaluateChart,
  inspectChart,
  prepareChart,
  toEvaluateChartNotifications
} from "../semiotic-ai-core"
import type { RenderEvidence } from "../server/renderEvidence"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"

const props = {
  data: [{ category: "A", value: 3 }],
  categoryAccessor: "category",
  valueAccessor: "value",
  title: "Measured values",
  description: "Category A has a value of three."
}
const evidence: RenderEvidence = {
  component: "BarChart",
  frameType: "ordinal",
  status: "ok",
  empty: false,
  markCount: 1,
  markCountByType: { rect: 1 },
  width: 600,
  height: 400,
  annotationCount: 0,
  ariaLabel: "Measured values",
  warnings: []
}

describe("render evidence reliability through public AI exports", () => {
  it.each([
    new Error("private renderer detail"),
    "private renderer detail",
    null
  ])(
    "returns blocked reports and exposes the original failure only to the local observer",
    (error) => {
      const onRenderError = vi.fn()
      const options = {
        render: () => {
          throw error
        },
        onRenderError
      }
      const reports = [
        prepareChart({ component: "BarChart", props }, options),
        evaluateChart("BarChart", props, undefined, options),
        inspectChart({ component: "BarChart", props }, options)
      ]
      for (const report of reports) {
        expect(report.ok).toBe(false)
        expect(report.evidence).toBeUndefined()
        expect(JSON.stringify(report)).toContain("RENDER_FAILED")
        expect(JSON.stringify(report)).not.toContain("private renderer detail")
      }
      expect(onRenderError.mock.calls).toEqual([[error], [error], [error]])
    }
  )

  it("keeps renderer failures blocked when a diagnostic observer also throws", () => {
    const options = {
      render: () => {
        throw new Error("renderer failure")
      },
      onRenderError: () => {
        throw new Error("observer failure")
      }
    }
    expect(prepareChart({ component: "BarChart", props }, options).ok).toBe(
      false
    )
    expect(evaluateChart("BarChart", props, undefined, options).ok).toBe(false)
    expect(inspectChart({ component: "BarChart", props }, options).ok).toBe(
      false
    )
  })

  it.each(["async rejection", "throwing thenable"])(
    "consumes observer failures without an unhandled rejection (%s)",
    async (kind) => {
      const renderError = new Error("private renderer detail")
      const observed: unknown[] = []
      // Keep the observer unmocked: mock promise tracking would itself attach
      // a rejection handler and hide the production unhandled-rejection bug.
      const onRenderError = (error: unknown) => {
        observed.push(error)
        if (kind === "async rejection")
          return (async () => {
            await Promise.resolve()
            throw new Error("private observer detail")
          })()
        return {
          get then() {
            throw new Error("private observer detail")
          }
        }
      }
      const options = {
        render: () => {
          throw renderError
        },
        onRenderError
      }
      const unhandled = vi.fn()
      process.on("unhandledRejection", unhandled)
      try {
        const reports = [
          prepareChart({ component: "BarChart", props }, options),
          evaluateChart("BarChart", props, undefined, options),
          inspectChart({ component: "BarChart", props }, options)
        ]
        // Let rejected observers reach Node's unhandled-rejection checkpoint.
        await nextTurn()
        expect(unhandled).not.toHaveBeenCalled()
        expect(observed).toEqual([renderError, renderError, renderError])
        for (const report of reports) {
          expect(report.ok).toBe(false)
          expect(report.evidence).toBeUndefined()
          expect(JSON.stringify(report)).toContain("RENDER_FAILED")
          expect(JSON.stringify(report)).not.toContain("private")
        }
      } finally {
        process.off("unhandledRejection", unhandled)
      }
    }
  )

  it("retains nonblocking renderer warnings separately from failure reasons", () => {
    const render = () => ({
      svg: "<svg/>",
      evidence: { ...evidence, warnings: ["LAYOUT_APPROXIMATION"] }
    })
    const prepared = prepareChart({ component: "BarChart", props }, { render })
    const inspected = inspectChart({ component: "BarChart", props }, { render })
    for (const report of [prepared, inspected]) {
      expect(report.ok).toBe(true)
      expect(report.reasons).toEqual([])
      expect(report.warnings).toEqual(["LAYOUT_APPROXIMATION"])
    }
    expect(
      evaluateChart("BarChart", props, undefined, { render }).findings
    ).toContainEqual(
      expect.objectContaining({
        code: "LAYOUT_APPROXIMATION",
        stage: "render",
        severity: "warning"
      })
    )
  })

  it("does not certify mismatched renderer identities in the Clinic", () => {
    const report = inspectChart(
      { component: "BarChart", props },
      {
        render: () => ({
          svg: "<svg/>",
          evidence: { ...evidence, component: "LineChart" }
        })
      }
    )
    expect(report.ok).toBe(false)
    expect(report.reasons).toContain(
      "The render evidence names a different chart component."
    )
  })

  it("stages structural errors as validation findings", () => {
    const report = evaluateChart("UnknownChart", {})
    expect(report.ok).toBe(false)
    expect(report.findings).toContainEqual(
      expect.objectContaining({ code: "VALIDATION", stage: "validation" })
    )
  })

  it.each([NaN, Infinity, -Infinity])(
    "defaults non-finite notification limits (%s)",
    (notificationMax) => {
      const ordinary = evaluateChart("UnknownChart", {})
      const invalid = evaluateChart("UnknownChart", {}, undefined, {
        notificationMax
      })
      expect(invalid.notifications).toEqual(ordinary.notifications)
      const findings = Array.from({ length: 12 }, (_, i) => ({
        ...ordinary.findings[0],
        id: `finding-${i}`
      }))
      expect(toEvaluateChartNotifications(findings, notificationMax)).toEqual(
        toEvaluateChartNotifications(findings)
      )
      expect(
        toEvaluateChartNotifications(findings, notificationMax)
      ).toHaveLength(9)
      expect(toEvaluateChartNotifications(findings, 0)).toEqual([
        expect.objectContaining({ id: "chart-evaluation-overflow" })
      ])
    }
  )
})

describe("bounded content-aware render evidence memoization", () => {
  it("reuses 1000 equivalent object configurations within the same input", () => {
    const render = vi.fn(() => ({ svg: "<svg/>", evidence }))
    const memo = createRenderEvidenceMemo(render)
    for (let i = 0; i < 1000; i++)
      memo.render("BarChart", {
        ...props,
        margin: { left: 20, top: 10 },
        annotations: [{ type: "label", label: "A" }],
        colorScheme: ["red", "blue"]
      })
    expect(render).toHaveBeenCalledTimes(1)
    memo.render("BarChart", {
      ...props,
      margin: { left: 20, top: 10 },
      annotations: [{ type: "label", label: "A" }],
      colorScheme: ["red", "blue"]
    })
    expect(render).toHaveBeenCalledTimes(1)
  })

  it.each(["replacement", "in-place reorder", "enumerability"])(
    "invalidates OrbitDiagram SVG and hash when palette enumeration changes (%s)",
    (change) => {
      const configuration = {
        data: { name: "root", children: [{ name: "a" }, { name: "b" }] },
        animated: false,
        colorScheme: { primary: "red", secondary: "blue" } as Record<
          string,
          string
        >,
        width: 320,
        height: 320
      }
      const render = vi.fn(renderChartWithEvidence)
      const memo = createRenderEvidenceMemo(render)
      const first = memo.render("OrbitDiagram", configuration)
      expect(first.svg.match(/<circle\b[^>]*fill="red"/g)).toHaveLength(3)
      if (change === "replacement") {
        configuration.colorScheme = { secondary: "blue", primary: "red" }
      } else if (change === "in-place reorder") {
        delete configuration.colorScheme.primary
        configuration.colorScheme.primary = "red"
      } else {
        Object.defineProperty(configuration.colorScheme, "primary", {
          enumerable: false
        })
      }
      const second = memo.render("OrbitDiagram", configuration)
      expect(second.svg.match(/<circle\b[^>]*fill="blue"/g)).toHaveLength(3)
      expect(second.evidence.sceneHash).not.toBe(first.evidence.sceneHash)
      expect(second.evidence.sceneHash).toBe(
        renderChartWithEvidence("OrbitDiagram", configuration).evidence
          .sceneHash
      )
      expect(render).toHaveBeenCalledTimes(2)
      expect(memo.render("OrbitDiagram", { ...configuration })).toBe(second)
      expect(render).toHaveBeenCalledTimes(2)
    }
  )

  it("preserves data-record and arbitrary nested-map order for custom renderers", () => {
    const data: Record<string, string>[] = [
      { primary: "red", secondary: "blue" }
    ]
    const render = vi.fn((_component, input) => ({
      svg: `${Object.values(input.data[0])[0]}:${Object.keys(input.mapping)[0]}`,
      evidence
    }))
    const memo = createRenderEvidenceMemo(render)
    expect(memo.render("Custom", { data, mapping: { x: 1, y: 2 } }).svg).toBe(
      "red:x"
    )
    data[0] = { secondary: "blue", primary: "red" }
    expect(memo.render("Custom", { data, mapping: { x: 1, y: 2 } }).svg).toBe(
      "blue:x"
    )
    expect(memo.render("Custom", { data, mapping: { y: 2, x: 1 } }).svg).toBe(
      "blue:y"
    )
    expect(render).toHaveBeenCalledTimes(3)
  })

  it("invalidates mutated data, nested props, dates and callback identities", () => {
    const data = [{ ...props.data[0] }]
    const margin = { top: 10 }
    const time = new Date("2026-01-01")
    const render = vi.fn(() => ({ svg: "<svg/>", evidence }))
    const memo = createRenderEvidenceMemo(render)
    const configuration = {
      ...props,
      data,
      margin,
      time,
      format: () => "first"
    }
    memo.render("BarChart", configuration)
    memo.render("BarChart", { ...configuration })
    expect(render).toHaveBeenCalledTimes(1)
    data[0].value = 4
    memo.render("BarChart", configuration)
    margin.top = 20
    memo.render("BarChart", configuration)
    time.setFullYear(2027)
    memo.render("BarChart", configuration)
    configuration.format = () => "second"
    memo.render("BarChart", configuration)
    expect(render).toHaveBeenCalledTimes(5)
    memo.clear()
    memo.render("BarChart", configuration)
    expect(render).toHaveBeenCalledTimes(6)
  })

  it.each(["data", "value"])(
    "bounds and refreshes the %s configuration cache",
    (input) => {
      const render = vi.fn(() => ({ svg: "<svg/>", evidence }))
      const memo = createRenderEvidenceMemo(render)
      const base = input === "data" ? props : { value: 1 }
      for (let width = 0; width < 64; width++)
        memo.render("BarChart", { ...base, width })
      memo.render("BarChart", { ...base, width: 0 })
      memo.render("BarChart", { ...base, width: 64 })
      memo.render("BarChart", { ...base, width: 0 })
      expect(render).toHaveBeenCalledTimes(65)
      memo.render("BarChart", { ...base, width: 1 })
      expect(render).toHaveBeenCalledTimes(66)
    }
  )

  it("bypasses unsafe or oversized keys without invoking getters during key construction", () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    const getter = vi.fn(() => "dynamic")
    for (const value of [
      cyclic,
      new Map(),
      Symbol("value"),
      "x".repeat(200_000),
      {
        get color() {
          return getter()
        }
      }
    ]) {
      const render = vi.fn(() => ({ svg: "<svg/>", evidence }))
      const memo = createRenderEvidenceMemo(render)
      memo.render("BarChart", { ...props, extra: value })
      memo.render("BarChart", { ...props, extra: value })
      expect(render).toHaveBeenCalledTimes(2)
    }
    expect(getter).not.toHaveBeenCalled()
  })

  it("does not cache a throwing render and distinguishes missing, undefined and non-finite values", () => {
    const render = vi
      .fn(() => ({ svg: "<svg/>", evidence }))
      .mockImplementationOnce(() => {
        throw new Error("retry")
      })
    const memo = createRenderEvidenceMemo(render)
    expect(() => memo.render("BarChart", props)).toThrow("retry")
    memo.render("BarChart", props)
    for (const value of [undefined, null, NaN, Infinity, -Infinity, -0, 0])
      memo.render("BarChart", { ...props, extra: value })
    expect(render).toHaveBeenCalledTimes(9)
    memo.render("BarChart", props)
    expect(render).toHaveBeenCalledTimes(9)
  })
})
