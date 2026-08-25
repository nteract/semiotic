import { describe, expect, it } from "vitest"
import { LIGHT_THEME, resolveThemeUpdate } from "../store/themeCore"
import {
  AESTHETICS_OFF_PROFILE,
  evaluateAesthetics
} from "./evaluateAesthetics"

const rows = [
  { model: "Atlas", score: 98.4 },
  { model: "Beacon", score: 97.9 },
  { model: "Cipher", score: 97.5 },
  { model: "Drift", score: 96.8 },
  { model: "Ember", score: 96.2 }
]

const authoredTheme = resolveThemeUpdate(LIGHT_THEME, {
  colors: {
    primary: "#173f5f",
    categorical: ["#173f5f", "#b43b2d"],
    background: "#fbf7ed",
    surface: "#fbf7ed",
    grid: "#d9d2c1",
    border: "#b7ad98"
  },
  typography: {
    titleSize: 18,
    titleFontSize: 18,
    titleFontFamily: "Georgia, serif",
    tickSize: 11,
    labelSize: 12
  },
  aesthetics: {
    name: "Editorial desk",
    weights: { "palette-authorship": 3 },
    rationales: {
      "palette-authorship": "Our charts should be recognizable as ours."
    }
  }
})

const chartProps = {
  data: rows,
  categoryAccessor: "model",
  valueAccessor: "score",
  colorScheme: ["#173f5f"],
  stroke: "#fbf7ed",
  styleRules: [
    {
      when: { gte: 98 },
      style: { fill: "#b43b2d", stroke: "#fbf7ed" }
    }
  ]
}

describe("evaluateAesthetics", () => {
  it("returns reconstructable weighted feature evidence", () => {
    const result = evaluateAesthetics("DotPlot", chartProps, {
      theme: authoredTheme
    })

    expect(result.profile).toBe("Editorial desk")
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.ok).toBe(true)
    expect(result.features).toHaveLength(6)
    expect(result.weightedPoints).toBeCloseTo(
      result.features.reduce((sum, item) => sum + item.score * item.weight, 0)
    )
    expect(
      result.features.find((item) => item.id === "palette-authorship")
    ).toMatchObject({
      status: "pass",
      weight: 3,
      rationale: "Our charts should be recognizable as ours."
    })
    expect(
      result.features.find((item) => item.id === "mark-scaffold-hierarchy")
    ).toMatchObject({ status: "pass" })
    expect(
      result.features.find((item) => item.id === "editorial-emphasis")?.evidence
        .emphasizedRatio
    ).toBe(0.2)
  })

  it("makes ubiquitous defaults machine-visible instead of universally forbidden", () => {
    const result = evaluateAesthetics("DotPlot", { data: rows })
    const authorship = result.features.find(
      (item) => item.id === "palette-authorship"
    )

    expect(authorship).toMatchObject({
      status: "warn",
      score: 0.2,
      evidence: { paletteSource: "theme", ubiquitousDefault: true }
    })
    const hierarchy = result.features.find(
      (item) => item.id === "mark-scaffold-hierarchy"
    )
    expect(hierarchy?.status).toBe("pass")
    expect(hierarchy?.evidence.markContrast).toBeCloseTo(4.82, 1)
  })

  it("scores every categorical color when colorBy makes the palette visible", () => {
    const result = evaluateAesthetics("DotPlot", {
      data: rows,
      colorBy: "model"
    })
    const hierarchy = result.features.find(
      (item) => item.id === "mark-scaffold-hierarchy"
    )

    expect(hierarchy?.evidence.markContrast).toBeLessThan(3)
    expect(hierarchy?.status).toBe("warn")
  })

  it("lets an organization zero out the entire aesthetic policy", () => {
    const result = evaluateAesthetics("DotPlot", chartProps, {
      theme: authoredTheme,
      profile: AESTHETICS_OFF_PROFILE
    })

    expect(result).toMatchObject({ ok: true, score: null, totalWeight: 0 })
    expect(result.features.every((item) => item.status === "disabled")).toBe(
      true
    )
  })

  it("deep-merges aesthetic weight updates with the active theme policy", () => {
    const updated = resolveThemeUpdate(authoredTheme, {
      aesthetics: { weights: { "editorial-emphasis": 4 } }
    })

    expect(updated.aesthetics?.weights).toMatchObject({
      "palette-authorship": 3,
      "editorial-emphasis": 4
    })
    expect(updated.aesthetics?.name).toBe("Editorial desk")
  })

  it("bounds invalid organization-authored thresholds without producing NaN", () => {
    const result = evaluateAesthetics("DotPlot", chartProps, {
      theme: authoredTheme,
      profile: {
        minimumScore: Number.NaN,
        thresholds: {
          titleScaleRatio: 1,
          categoricalColorMax: 0,
          emphasisRatioMin: 2,
          emphasisRatioMax: Number.NaN
        }
      }
    })

    expect(result.minimumScore).toBe(70)
    expect(result.score).not.toBeNaN()
    expect(result.features.every((item) => !Number.isNaN(item.score))).toBe(
      true
    )
  })
})
