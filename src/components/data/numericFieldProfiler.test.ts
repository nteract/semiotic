import { describe, expect, it } from "vitest"
import { profileNumericFields } from "./numericFieldProfiler"

describe("profileNumericFields — dirty-numeric classification", () => {
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
