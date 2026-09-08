import { describe, expect, it } from "vitest"
import { profileNumericFields } from "./numericFieldProfiler"

describe("profileNumericFields — dirty-numeric classification", () => {
  it.each([true, false])("retains health counts and extents with quantiles=%s", (quantiles) => {
    const data = [
      { value: 4 }, { value: "-2.5" }, { value: 0 }, { value: "  " },
      { value: "Infinity" }, { value: NaN }, { value: "bad" }, {},
      { value: null }, { value: 2 }
    ]
    const original = data.slice()
    const profile = profileNumericFields(data, { quantiles }).value
    expect(profile).toEqual({
      field: "value",
      observedCount: 7,
      finiteCount: 4,
      missingCount: 3,
      nonFiniteCount: 2,
      nonNumericCount: 1,
      zeroCount: 1,
      negativeCount: 1,
      fractionalCount: 1,
      min: -2.5,
      ...(quantiles ? { q1: -0.625, median: 1, q3: 2.5 } : {}),
      max: 4
    })
    expect(data).toEqual(original)
  })

  it.each([true, false])("omits numeric statistics for nonnumeric fields with quantiles=%s", (quantiles) => {
    expect(profileNumericFields([{ value: "bad" }, { value: null }], { quantiles }).value).toEqual({
      field: "value", observedCount: 1, finiteCount: 0, missingCount: 1,
      nonFiniteCount: 0, nonNumericCount: 1, zeroCount: 0,
      negativeCount: 0, fractionalCount: 0
    })
  })

  it("counts a whitespace-only string as missing, not non-numeric", () => {
    const profile = profileNumericFields([{ value: 1 }, { value: "   " }, { value: 2 }])
    expect(profile.value).toMatchObject({
      finiteCount: 2,
      missingCount: 1,
      nonNumericCount: 0,
    })
  })

  it("counts an explicit \"NaN\" string as non-finite, not non-numeric", () => {
    const profile = profileNumericFields([{ value: 1 }, { value: "NaN" }, { value: 2 }])
    expect(profile.value).toMatchObject({
      finiteCount: 2,
      nonFiniteCount: 1,
      nonNumericCount: 0,
    })
  })

  it("counts an explicit \"Infinity\"/\"-Infinity\" string as non-finite, not non-numeric", () => {
    const profile = profileNumericFields([
      { value: 1 },
      { value: "Infinity" },
      { value: "-Infinity" },
    ])
    expect(profile.value).toMatchObject({
      finiteCount: 1,
      nonFiniteCount: 2,
      nonNumericCount: 0,
    })
  })

  it("still counts unparseable garbage as non-numeric, not non-finite", () => {
    // "abc" also parses to NaN via Number(), same as "NaN" — must not be
    // conflated with an authored non-finite token.
    const profile = profileNumericFields([{ value: 1 }, { value: "abc" }])
    expect(profile.value).toMatchObject({
      finiteCount: 1,
      nonNumericCount: 1,
      nonFiniteCount: 0,
    })
  })

  it("still counts null/undefined/empty-string as missing", () => {
    const profile = profileNumericFields([
      { value: 1 },
      { value: null },
      { value: undefined },
      { value: "" },
      {},
    ])
    expect(profile.value).toMatchObject({
      finiteCount: 1,
      missingCount: 4,
    })
  })

  it("still counts a real numeric NaN/Infinity as non-finite", () => {
    const profile = profileNumericFields([
      { value: 1 },
      { value: Number.NaN },
      { value: Number.POSITIVE_INFINITY },
    ])
    expect(profile.value).toMatchObject({
      finiteCount: 1,
      nonFiniteCount: 2,
    })
  })
})
