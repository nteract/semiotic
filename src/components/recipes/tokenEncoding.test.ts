import { describe, expect, it } from "vitest"
import {
  diagnoseTokenEncoding,
  generateTokens,
  layoutTokenGrid,
  normalizeTokenEncoding,
  suggestTokenEncoding
} from "./tokenEncoding"

describe("generateTokens", () => {
  it("delegates unitized measures to unitize and preserves partial final tokens", () => {
    const result = generateTokens(176, {
      tokenType: "glyph",
      tokenSemantics: "unitized-measure",
      countStrategy: "unitized",
      unitValue: 25,
      minFraction: 0.08,
      unitMeaning: "one arrow = 25 riders"
    })

    expect(result.tokens).toHaveLength(7)
    expect(result.total).toBe(176)
    expect(result.shown).toBeCloseTo(175)
    expect(result.tokens[6]).toMatchObject({
      index: 6,
      fraction: 1,
      unitValue: 25,
      unitMeaning: "one arrow = 25 riders"
    })
    expect(result.diagnostics).toEqual([])
  })

  it("builds fixed-denominator natural-frequency tokens with highlighted cases", () => {
    const result = generateTokens(
      { numerator: 18, denominator: 100 },
      {
        tokenType: "icon",
        icon: "person",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
        layout: "waffle",
        labelPolicy: "text-plus-icon"
      }
    )

    expect(result.tokens).toHaveLength(100)
    expect(result.numerator).toBe(18)
    expect(result.denominator).toBe(100)
    expect(result.tokens.filter((token) => token.highlighted)).toHaveLength(18)
    expect(result.diagnostics).toEqual([])
  })

  it("keeps fixed-denominator ratios authoritative when maxTokens is set", () => {
    const result = generateTokens(
      { numerator: 18, denominator: 100 },
      {
        tokenType: "icon",
        icon: "person",
        tokenSemantics: "risk-case",
        countStrategy: "fixed-denominator",
        maxTokens: 50
      }
    )

    expect(result.tokens).toHaveLength(100)
    expect(result.tokens.filter((token) => token.highlighted)).toHaveLength(18)
    expect(result.overflow).toBe(false)
  })

  it("defaults missing unitized unit values to one and emits a diagnostic", () => {
    const result = generateTokens(3, {
      tokenType: "glyph",
      tokenSemantics: "unitized-measure",
      countStrategy: "unitized"
    })

    expect(result.tokens).toHaveLength(3)
    expect(result.unitValue).toBe(1)
    expect(result.diagnostics.map((d) => d.code)).toContain("MISSING_UNIT_VALUE")
  })

  it("builds projected range tokens for unitized scenario tallies", () => {
    const result = generateTokens(
      { value: 2.5, rangeValue: 4.5 },
      {
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unitValue: 1,
        unitMeaning: "one sign = one unit"
      }
    )

    expect(result.tokens).toHaveLength(3)
    expect(result.rangeTotal).toBe(4.5)
    expect(result.rangeTokens?.map((token) => ({
      index: token.index,
      fraction: token.fraction,
      startFraction: token.startFraction,
      range: token.range,
    }))).toEqual([
      { index: 2, fraction: 1, startFraction: 0.5, range: "scenario" },
      { index: 3, fraction: 1, startFraction: 0, range: "scenario" },
      { index: 4, fraction: 0.5, startFraction: 0, range: "scenario" },
    ])
  })

  it("preserves fractional numeric actual values as partial tokens", () => {
    const result = generateTokens(3.6, {
      tokenType: "glyph",
      tokenSemantics: "observed-unit",
      countStrategy: "actual"
    })

    expect(result.tokens).toHaveLength(4)
    expect(result.tokens[3].fraction).toBeCloseTo(0.6)
    expect(result.shown).toBeCloseTo(3.6)
  })

  it("turns samples into equally spaced quantile outcome tokens", () => {
    const result = generateTokens([0, 10, 20, 30], {
      tokenType: "dot",
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount: 3,
      layout: "quantile-strip"
    })

    expect(result.tokens.map((token) => token.sample)).toEqual([5, 15, 25])
    expect(result.tokens.map((token) => token.quantile)).toEqual([
      1 / 6,
      0.5,
      5 / 6
    ])
    expect(result.total).toBe(4)
    expect(result.shown).toBe(3)
  })

  it("returns no quantile tokens when no samples are available", () => {
    const result = generateTokens([], {
      tokenType: "dot",
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount: 10
    })

    expect(result.tokens).toEqual([])
    expect(result.total).toBe(0)
    expect(result.overflow).toBe(false)
  })

  it("samples posterior values evenly and random samples deterministically when seeded", () => {
    const posterior = generateTokens([10, 20, 30, 40, 50], {
      tokenType: "dot",
      tokenSemantics: "posterior-sample",
      countStrategy: "posterior-sample",
      tokenCount: 3
    })
    expect(posterior.tokens.map((token) => token.sample)).toEqual([10, 30, 50])

    const randomA = generateTokens([10, 20, 30, 40, 50], {
      tokenType: "dot",
      tokenSemantics: "posterior-sample",
      countStrategy: "random-sample",
      tokenCount: 3,
      seed: 7
    })
    const randomB = generateTokens([10, 20, 30, 40, 50], {
      tokenType: "dot",
      tokenSemantics: "posterior-sample",
      countStrategy: "random-sample",
      tokenCount: 3,
      seed: 7
    })
    expect(randomA.tokens.map((token) => token.sample)).toEqual(
      randomB.tokens.map((token) => token.sample)
    )
  })
})

describe("layoutTokenGrid", () => {
  it("positions tokens from a cell anchor for glyph and icon arrays", () => {
    const tokenSet = generateTokens(5, {
      tokenType: "glyph",
      tokenSemantics: "observed-unit",
      countStrategy: "actual",
      maxTokens: 5
    })
    const positioned = layoutTokenGrid(tokenSet, {
      x: 10,
      y: 20,
      columns: 3,
      cellWidth: 12,
      cellHeight: 20,
      gutter: 2,
      anchor: [0.5, 1]
    })

    expect(
      positioned.map((token) => [token.column, token.row, token.x, token.y])
    ).toEqual([
      [0, 0, 16, 40],
      [1, 0, 30, 40],
      [2, 0, 44, 40],
      [0, 1, 16, 62],
      [1, 1, 30, 62]
    ])
  })

  it("does not flip row direction into negative rows when rows are underspecified", () => {
    const tokenSet = generateTokens(5, {
      tokenType: "dot",
      tokenSemantics: "observed-unit",
      countStrategy: "actual"
    })
    const positioned = layoutTokenGrid(tokenSet, {
      columns: 2,
      rows: 2,
      rowDirection: "up"
    })

    expect(Math.min(...positioned.map((token) => token.row))).toBe(0)
    expect(positioned.map((token) => token.row)).toEqual([2, 2, 1, 1, 0])
  })
})

describe("diagnoseTokenEncoding", () => {
  it("flags unclear semantics, icon-only labels, and decorative pictographs", () => {
    const diagnostics = diagnoseTokenEncoding(
      {
        tokenType: "glyph",
        countStrategy: "actual",
        tokenSemantics: "decorative",
        labelPolicy: "icon-only"
      },
      { visibleTokens: 90 }
    )

    expect(diagnostics.map((d) => d.code)).toEqual([
      "ICON_ONLY_LABELS",
      "TOO_MANY_VISIBLE_TOKENS",
      "DECORATIVE_PICTOGRAPHS"
    ])
    expect(
      diagnoseTokenEncoding({ tokenType: "icon" }).map((d) => d.code)
    ).toEqual(["TOKEN_SEMANTICS_UNCLEAR", "MISSING_COUNT_STRATEGY"])
  })

  it("flags strategy mismatches for semantic token meanings", () => {
    expect(
      diagnoseTokenEncoding({
        tokenType: "dot",
        tokenSemantics: "risk-case",
        countStrategy: "unitized"
      }).map((d) => d.code)
    ).toContain("TOKEN_STRATEGY_MISMATCH")

    expect(
      diagnoseTokenEncoding({
        tokenType: "glyph",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized"
      }).map((d) => d.code)
    ).toEqual(["MISSING_UNIT_VALUE", "MISSING_UNIT_MEANING"])
  })
})

describe("normalizeTokenEncoding", () => {
  it("normalizes legacy token and unit aliases to canonical icon and unitValue", () => {
    expect(
      normalizeTokenEncoding({
        tokenType: "glyph",
        token: "person",
        tokenSemantics: "unitized-measure",
        countStrategy: "unitized",
        unit: 25
      })
    ).toMatchObject({
      icon: "person",
      unitValue: 25
    })
  })
})

describe("suggestTokenEncoding", () => {
  it("recommends quantile tokens for probability estimation", () => {
    const suggestion = suggestTokenEncoding({
      taskIntent: "estimate probability",
      dataType: "distribution",
      availableSpace: "small"
    })

    expect(suggestion.recommendedEncoding).toBe("quantile-dotplot")
    expect(suggestion.tokenEncoding).toMatchObject({
      tokenType: "dot",
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount: 25
    })
  })

  it("keeps precise comparison on continuous encodings", () => {
    const suggestion = suggestTokenEncoding({
      taskIntent: "precise-comparison",
      precisionNeed: "high"
    })
    expect(suggestion.recommendedEncoding).toBe("bar-or-line")
    expect(suggestion.tokenEncoding).toBeUndefined()
  })

  it("returns unitized recommendations that can be handed to generateTokens", () => {
    const suggestion = suggestTokenEncoding({
      taskIntent: "remember",
      dataType: "count",
      concreteEntity: "factory"
    })

    expect(suggestion.tokenEncoding).toMatchObject({
      tokenSemantics: "unitized-measure",
      countStrategy: "unitized",
      unitValue: 1
    })
    expect(generateTokens(3, suggestion.tokenEncoding!).tokens).toHaveLength(3)
  })

  it("recommends fixed-denominator arrays for risk without warning on 100 cases", () => {
    const suggestion = suggestTokenEncoding({
      taskIntent: "understand risk",
      dataType: "risk",
      concreteEntity: "commuter"
    })

    expect(suggestion.recommendedEncoding).toBe("fixed-denominator-icon-array")
    expect(suggestion.tokenEncoding).toMatchObject({
      tokenType: "icon",
      tokenSemantics: "risk-case",
      countStrategy: "fixed-denominator",
      denominator: 100
    })
    expect(suggestion.warnings).toEqual([])
  })

  it("bridges token task intents to chart capability intents", async () => {
    const { tokenTaskIntentToCapabilityIntents } = await import("./tokenEncoding")

    expect(tokenTaskIntentToCapabilityIntents("estimate probability")).toEqual([
      "distribution"
    ])
    expect(tokenTaskIntentToCapabilityIntents("understand risk")).toEqual([
      "part-to-whole",
      "distribution"
    ])
  })
})
