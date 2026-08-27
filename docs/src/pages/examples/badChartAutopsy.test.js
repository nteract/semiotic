import { describe, expect, it } from "vitest"
import {
  BAD_CHART_PROPS,
  BENCHMARK_ROWS,
  REPAIRED_CHART_COMPONENT,
  REPAIRED_CHART_PROPS,
  buildAutopsyCase,
} from "./badChartAutopsy"

describe("Bad Chart Autopsy evidence", () => {
  it("rejects the persuasive-looking chart even though it renders data marks", () => {
    const { suspect } = buildAutopsyCase()
    const codes = suspect.findings.map((finding) => finding.code)

    expect(suspect.ok).toBe(false)
    expect(suspect.evidence).toMatchObject({ status: "ok", markCount: BENCHMARK_ROWS.length })
    expect(codes).toEqual(
      expect.arrayContaining(["NON_ZERO_BASELINE", "LOW_COLOR_CONTRAST", "MISSING_DESCRIPTION"]),
    )
  })

  it("proves the repaired chart without mutating the suspect configuration", () => {
    const { aesthetics, repaired, presentation, fixes } = buildAutopsyCase()

    expect(repaired.ok).toBe(true)
    expect(repaired.summary.errors).toBe(0)
    expect(repaired.component).toBe(REPAIRED_CHART_COMPONENT)
    expect(repaired.evidence).toMatchObject({ status: "ok", markCount: BENCHMARK_ROWS.length })
    expect(BAD_CHART_PROPS.valueExtent).toEqual([96, 99])
    expect(REPAIRED_CHART_PROPS.valueExtent).toEqual([96, 99])
    expect(presentation).toMatchObject({ ok: true, status: "pass" })
    expect(presentation.evidence?.hierarchyRatio).toBeGreaterThanOrEqual(2)
    expect(fixes).toHaveLength(4)
    expect(aesthetics).toMatchObject({
      ok: true,
      profile: "Forensic editorial desk",
      method: "weighted-machine-visible-features",
    })
    expect(aesthetics.features).toHaveLength(6)
  })
})
