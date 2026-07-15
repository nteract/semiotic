import { describe, it, expect } from "vitest"
import {
  resolveStyleRules,
  matchesThreshold,
  ruleMatches,
  makeRuleValueResolver,
  type StyleRule,
} from "./styleRules"
import { isHatchFill, hatchFillId, hatchFillKey, type HatchFill } from "./hatchFill"

describe("styleRules — threshold matching", () => {
  const ctx = { value: 12 as number | undefined }

  it("matches numeric operators against the context value", () => {
    expect(matchesThreshold({ gt: 10 }, {}, ctx)).toBe(true)
    expect(matchesThreshold({ gt: 12 }, {}, ctx)).toBe(false)
    expect(matchesThreshold({ gte: 12 }, {}, ctx)).toBe(true)
    expect(matchesThreshold({ lt: 12 }, {}, ctx)).toBe(false)
    expect(matchesThreshold({ lte: 12 }, {}, ctx)).toBe(true)
    expect(matchesThreshold({ within: [10, 15] }, {}, ctx)).toBe(true)
    expect(matchesThreshold({ within: [0, 5] }, {}, ctx)).toBe(false)
    expect(matchesThreshold({ outside: [0, 5] }, {}, ctx)).toBe(true)
  })

  it("ANDs multiple operators in one threshold", () => {
    expect(matchesThreshold({ gte: 10, lt: 15 }, {}, ctx)).toBe(true)
    expect(matchesThreshold({ gte: 10, lt: 12 }, {}, ctx)).toBe(false)
  })

  it("reads from an explicit field on the datum", () => {
    const d = { capacity: 20 }
    expect(matchesThreshold({ field: "capacity", gt: 15 }, d, ctx)).toBe(true)
    expect(matchesThreshold({ field: "capacity", lt: 15 }, d, ctx)).toBe(false)
  })

  it("supports categorical eq / ne / in operators", () => {
    const d = { series: "fixed" }
    expect(matchesThreshold({ field: "series", eq: "fixed" }, d, ctx)).toBe(true)
    expect(matchesThreshold({ field: "series", ne: "fixed" }, d, ctx)).toBe(false)
    expect(matchesThreshold({ field: "series", in: ["fixed", "burst"] }, d, ctx)).toBe(true)
    expect(matchesThreshold({ field: "series", in: ["burst"] }, d, ctx)).toBe(false)
  })

  it("returns false when a numeric operator can't resolve a number", () => {
    expect(matchesThreshold({ gt: 5 }, {}, { value: undefined })).toBe(false)
    expect(matchesThreshold({ field: "label", gt: 5 }, { label: "n/a" }, ctx)).toBe(false)
  })

  it("targets an axis channel (x / y / value) regardless of field name", () => {
    const xyCtx = { value: 30, x: 5, y: 30 }
    expect(matchesThreshold({ axis: "x", gt: 4 }, { week: 5, score: 30 }, xyCtx)).toBe(true)
    expect(matchesThreshold({ axis: "x", gt: 6 }, { week: 5, score: 30 }, xyCtx)).toBe(false)
    expect(matchesThreshold({ axis: "y", gte: 30 }, { week: 5, score: 30 }, xyCtx)).toBe(true)
    // axis beats field/value when set
    expect(matchesThreshold({ axis: "x", lt: 10 }, {}, xyCtx)).toBe(true)
  })
})

describe("styleRules — ruleMatches when-forms", () => {
  const ctx = { value: 8 }
  it("treats omitted/true as always, false as never", () => {
    expect(ruleMatches({ style: {} }, {}, ctx)).toBe(true)
    expect(ruleMatches({ when: true, style: {} }, {}, ctx)).toBe(true)
    expect(ruleMatches({ when: false, style: {} }, {}, ctx)).toBe(false)
  })
  it("evaluates a predicate function", () => {
    expect(ruleMatches({ when: (_d, c) => (c.value ?? 0) < 10, style: {} }, {}, ctx)).toBe(true)
    expect(ruleMatches({ when: (_d, c) => (c.value ?? 0) > 10, style: {} }, {}, ctx)).toBe(false)
  })
})

describe("resolveStyleRules — last-applicable-rule-wins merge", () => {
  it("merges all matching rules; last wins per property", () => {
    const rules: StyleRule[] = [
      { when: { gte: 0 }, style: { fill: "green", stroke: "black" } },
      { when: { gte: 10 }, style: { fill: "orange" } },
      { when: { gt: 15 }, style: { fill: "red", opacity: 0.5 } },
    ]
    // value 12 → rules 1 & 2 match; fill from rule 2 wins, stroke from rule 1 kept
    expect(resolveStyleRules({}, rules, { value: 12 })).toEqual({ fill: "orange", stroke: "black" })
    // value 20 → all match; fill from rule 3 wins
    expect(resolveStyleRules({}, rules, { value: 20 })).toEqual({
      fill: "red",
      stroke: "black",
      opacity: 0.5,
    })
    // value 5 → only rule 1
    expect(resolveStyleRules({}, rules, { value: 5 })).toEqual({ fill: "green", stroke: "black" })
  })

  it("returns an empty object when nothing matches", () => {
    expect(resolveStyleRules({}, [{ when: { gt: 100 }, style: { fill: "red" } }], { value: 5 })).toEqual({})
  })

  it("returns an empty object for undefined/empty rule lists", () => {
    expect(resolveStyleRules({}, undefined, { value: 5 })).toEqual({})
    expect(resolveStyleRules({}, [], { value: 5 })).toEqual({})
  })

  it("supports a per-datum style function", () => {
    const rules: StyleRule[] = [
      { when: { gt: 0 }, style: (_d, c) => ({ fill: (c.value ?? 0) > 10 ? "hot" : "cool" }) },
    ]
    expect(resolveStyleRules({}, rules, { value: 12 })).toEqual({ fill: "hot" })
    expect(resolveStyleRules({}, rules, { value: 3 })).toEqual({ fill: "cool" })
  })

  it("carries a HatchFill descriptor through as a fill", () => {
    const hatch: HatchFill = { type: "hatch", background: "#ffd166", stroke: "#fff" }
    const out = resolveStyleRules({}, [{ when: { gt: 10 }, style: { fill: hatch } }], { value: 12 })
    expect(isHatchFill(out.fill)).toBe(true)
  })
})

describe("makeRuleValueResolver", () => {
  it("reads a numeric value via a string field", () => {
    const r = makeRuleValueResolver("value")
    expect(r({ value: 42 })).toBe(42)
    expect(r({ value: "42" })).toBe(42)
    expect(r({ value: "nope" })).toBeUndefined()
  })
  it("reads via an accessor function", () => {
    const r = makeRuleValueResolver((d) => (d as { v: number }).v)
    expect(r({ v: 7 })).toBe(7)
  })
  it("returns undefined for a missing accessor", () => {
    expect(makeRuleValueResolver(undefined)({ value: 1 })).toBeUndefined()
  })
})

describe("hatchFill descriptor helpers", () => {
  it("type-guards HatchFill vs strings/patterns", () => {
    expect(isHatchFill({ type: "hatch" })).toBe(true)
    expect(isHatchFill("red")).toBe(false)
    expect(isHatchFill(null)).toBe(false)
    expect(isHatchFill({ type: "solid" })).toBe(false)
  })
  it("mints stable, content-derived keys and ids", () => {
    const a: HatchFill = { type: "hatch", background: "#000", stroke: "#fff", angle: 45 }
    const b: HatchFill = { type: "hatch", background: "#000", stroke: "#fff", angle: 45 }
    const c: HatchFill = { type: "hatch", background: "#000", stroke: "#fff", angle: 30 }
    expect(hatchFillKey(a)).toBe(hatchFillKey(b))
    expect(hatchFillKey(a)).not.toBe(hatchFillKey(c))
    expect(hatchFillId("bar", a)).toBe(hatchFillId("bar", b))
    expect(hatchFillId("bar", a)).toMatch(/^bar-hatch-/)
  })
})
