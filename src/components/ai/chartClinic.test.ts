import { describe, expect, it } from "vitest"
import type { RenderEvidence } from "../server/renderEvidence"
import { createRevisionSet } from "../stream/pipelineUpdateContract"
import { inspectChart } from "./chartClinic"

const bars = [
  { category: "A", value: 12 },
  { category: "B", value: 24 },
]

function evidence(partial: Partial<RenderEvidence> = {}): RenderEvidence {
  return {
    component: "BarChart",
    frameType: "ordinal",
    status: "ok",
    empty: false,
    markCount: 2,
    markCountByType: { rect: 2 },
    width: 600,
    height: 400,
    annotationCount: 0,
    ariaLabel: "Bar chart",
    warnings: [],
    ...partial,
  }
}

describe("Chart Clinic read-only inspection", () => {
  it("returns serializable config, diagnostics, revision status, and bundle guidance without repairing", () => {
    const revisions = { ...createRevisionSet(), data: 2, dataPaint: 2 }
    const report = inspectChart({
      component: "BarChart",
      props: { data: bars, categoryAccessor: "category", valueAccessor: "value" },
      revision: { revisions, consumed: { data: 2, dataPaint: 1 } },
    })

    expect(report.mode).toBe("read-only")
    expect(report.ok).toBe(true)
    expect(report.normalizedConfig?.component).toBe("BarChart")
    expect(report.revisions).toMatchObject({
      state: "pending-consumption",
      pending: ["dataPaint"],
    })
    expect(report.bundle).toMatchObject({
      category: "ordinal",
      recommendedImport: "semiotic/ordinal",
    })
    expect(report.reasons).toEqual([])
  })

  it("uses explicit pilot module/server/docs guidance when a definition exists", () => {
    const report = inspectChart({
      component: "LineChart",
      props: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
    })

    expect(report.bundle).toMatchObject({
      recommendedImport: "semiotic/xy",
      serverImport: "semiotic/server",
      docsRoute: "/charts/line-chart",
    })
  })

  it("uses generated family/server guidance for a non-pilot chart", () => {
    const report = inspectChart({
      component: "AreaChart",
      props: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
    })

    expect(report.bundle).toEqual({
      category: "xy",
      recommendedImport: "semiotic/xy",
      serverImport: "semiotic/server",
      note:
        "Use the family facade today. Granular chart modules are a later package-boundary migration, so this recommendation does not claim a smaller per-chart bundle.",
    })
  })

  it("preserves explicit pilot exclusions from renderChart guidance", () => {
    const report = inspectChart({ component: "BigNumber", props: {} })

    expect(report.bundle).toMatchObject({
      category: "value",
      recommendedImport: "semiotic/value",
      docsRoute: "/charts/big-number",
    })
    expect(report.bundle).not.toHaveProperty("serverImport")
  })

  it("omits the generated export timestamp so identical inspection reports are deterministic", () => {
    const input = {
      component: "BarChart",
      props: { data: bars, categoryAccessor: "category", valueAccessor: "value" },
    }
    const first = inspectChart(input)
    const second = inspectChart(input)

    expect(first.normalizedConfig).toEqual(second.normalizedConfig)
    expect(first.normalizedConfig).not.toHaveProperty("createdAt")
  })

  it("attaches a scene summary from injected evidence and refuses an empty scene", () => {
    const report = inspectChart({
      component: "BarChart",
      props: { data: bars, categoryAccessor: "category", valueAccessor: "value" },
    }, {
      render: () => ({
        svg: "<svg/>",
        evidence: evidence({ status: "empty", empty: true, markCount: 0, markCountByType: {} }),
      }),
    })

    expect(report.ok).toBe(false)
    expect(report.scene).toMatchObject({ status: "empty", markCount: 0 })
    expect(report.reasons).toContain("EMPTY_SCENE: the renderer produced no data marks.")
  })

  it("does not invoke rendering for invalid input and reports the structural error", () => {
    const render = () => {
      throw new Error("must not render")
    }
    const report = inspectChart({ component: "BarChart", props: {} }, { render })

    expect(report.ok).toBe(false)
    expect(report.evidence).toBeUndefined()
    expect(report.reasons.join(" ")).toMatch(/data/)
  })

  it("does not expose arbitrary renderer errors", () => {
    const report = inspectChart({
      component: "BarChart",
      props: { data: bars, categoryAccessor: "category", valueAccessor: "value" },
    }, {
      render: () => {
        throw new Error("secret token should not leave the renderer")
      },
    })

    expect(report.ok).toBe(false)
    expect(report.reasons).toContain(
      "RENDER_FAILED: static evidence could not be produced for this configuration.",
    )
    expect(report.reasons.join(" ")).not.toContain("secret token")
  })
})
