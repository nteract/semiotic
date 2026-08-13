import { describe, expect, it } from "vitest"
import { evaluateChart, formatEvaluateChart } from "./evaluateChart"
import type { RenderEvidence } from "../server/renderEvidence"

const data = [
  { month: 1, sales: 10 },
  { month: 2, sales: 18 },
  { month: 3, sales: 15 }
]

const baseProps = {
  xAccessor: "month",
  yAccessor: "sales",
  title: "Sales over time",
  description: "Monthly sales across the reporting period.",
  summary: "Sales rose, then eased slightly."
}

describe("evaluateChart", () => {
  it("composes the triad into a ranked result and notification feed", () => {
    const result = evaluateChart("LineChart", baseProps, data)

    expect(result.validation.valid).toBe(true)
    expect(result.data.ok).toBe(true)
    expect(result.deception).toEqual([])
    expect(result.accessibility.component).toBe("LineChart")
    expect(
      result.findings.every((finding, index) => finding.rank === index + 1)
    ).toBe(true)
    expect(result.summary.findings).toBe(result.findings.length)
    expect(
      result.notifications.every((notification) => notification.dismissible)
    ).toBe(true)
  })

  it("surfaces data-contract failures as data findings", () => {
    const result = evaluateChart(
      "LineChart",
      { ...baseProps, yScaleType: "log" },
      [
        { month: 1, sales: 10 },
        { month: 2, sales: 0 }
      ]
    )

    expect(result.ok).toBe(false)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "data",
          code: "LOG_NON_POSITIVE",
          severity: "error"
        })
      ])
    )
  })

  it("keeps representation diagnoses separate from data diagnoses", () => {
    const result = evaluateChart(
      "LineChart",
      { ...baseProps, curve: "basis" },
      data
    )

    expect(result.deception).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "NON_PASSING_CURVE" })
      ])
    )
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "deception",
          code: "NON_PASSING_CURVE"
        })
      ])
    )
    expect(
      result.findings.filter((finding) => finding.code === "LOG_NON_POSITIVE")
    ).toHaveLength(0)
  })

  it("can prove an otherwise valid config against injected render evidence", () => {
    const evidence: RenderEvidence = {
      component: "LineChart",
      frameType: "xy",
      status: "empty",
      empty: true,
      markCount: 0,
      markCountByType: {},
      width: 640,
      height: 400,
      annotationCount: 0,
      ariaLabel: "Sales over time",
      warnings: ["NO_SCALES"]
    }
    const result = evaluateChart("LineChart", baseProps, data, {
      render: () => ({ svg: "<svg />", evidence })
    })

    expect(result.evidence).toBe(evidence)
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "render",
          code: "EMPTY_SCENE",
          severity: "error"
        }),
        expect.objectContaining({
          stage: "render",
          code: "NO_SCALES",
          severity: "warning"
        })
      ])
    )
    expect(result.ok).toBe(false)
  })

  it("formats the ranked report and caps notifications without losing findings", () => {
    const result = evaluateChart(
      "LineChart",
      { ...baseProps, curve: "basis" },
      data,
      {
        notificationMax: 1
      }
    )
    const report = formatEvaluateChart(result)

    expect(report).toContain("LineChart:")
    expect(report).toContain("NON_PASSING_CURVE")
    expect(result.findings.length).toBeGreaterThan(result.notifications.length)
    expect(result.notifications.at(-1)?.id).toBe("chart-evaluation-overflow")
  })
})
