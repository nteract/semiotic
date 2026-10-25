import { describe, expect, it, vi } from "vitest"
import {
  createRenderEvidenceMemo,
  evaluateChart,
  inspectChart,
  prepareChart,
  toEvaluateChartNotifications
} from "../semiotic-ai-core"
import type { RenderEvidence } from "../server/renderEvidence"

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
      margin: { top: 10, left: 20 },
      colorScheme: ["red", "blue"],
      annotations: [{ label: "A", type: "label" }]
    })
    expect(render).toHaveBeenCalledTimes(1)
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
