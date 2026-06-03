import { describe, expect, it } from "vitest"
import * as React from "react"
import { applyAnnotationEmphasis, renderAnnotationPass, type AnnotationRenderPair } from "./annotationRules"
import type { Datum } from "./datumTypes"
import type { AnnotationContext } from "../../realtime/types"

// Minimal element-prop accessor so the assertions don't sprinkle `any`.
type ElProps = {
  "data-id"?: string
  className?: string
  opacity?: number
  children?: React.ReactNode
}
const propsOf = (n: React.ReactNode): ElProps =>
  React.isValidElement(n) ? (n.props as ElProps) : {}

// data-id lives on the original node; for an emphasis-wrapped node it sits
// on the single child the wrapper carries.
function innerId(n: React.ReactNode): string | undefined {
  const p = propsOf(n)
  if (p["data-id"]) return p["data-id"]
  if (React.isValidElement(p.children)) return propsOf(p.children)["data-id"]
  return undefined
}

const pair = (id: string, emphasis?: string): AnnotationRenderPair => ({
  node: <g key={id} data-id={id} />,
  annotation: { type: "label", ...(emphasis ? { emphasis } : {}) } as Datum,
})

describe("applyAnnotationEmphasis", () => {
  it("returns nodes untouched when no annotation declares emphasis", () => {
    const nodes = [pair("a"), pair("b"), pair("c")]
    const out = applyAnnotationEmphasis(nodes)
    // Same nodes, same order, no wrapping — existing charts render identically.
    expect(out.map(propsOf).map((p) => p["data-id"])).toEqual(["a", "b", "c"])
    expect(out.map((n) => propsOf(n).className)).toEqual([undefined, undefined, undefined])
  })

  it("orders secondary → unspecified → primary, stable within a band", () => {
    const nodes = [
      pair("p1", "primary"),
      pair("s1", "secondary"),
      pair("d1"),
      pair("p2", "primary"),
      pair("s2", "secondary"),
    ]
    const out = applyAnnotationEmphasis(nodes)
    expect(out.map(innerId)).toEqual(["s1", "s2", "d1", "p1", "p2"])
  })

  it("dims secondary and tags both emphasis levels with a class", () => {
    const out = applyAnnotationEmphasis([pair("s", "secondary"), pair("p", "primary")])
    const sec = out.find((n) => propsOf(n).className?.includes("secondary"))
    const pri = out.find((n) => propsOf(n).className?.includes("primary"))
    expect(propsOf(sec).opacity).toBe(0.6)
    expect(propsOf(sec).className).toContain("annotation-emphasis--secondary")
    // Primary paints at full weight — class for styling hooks, but no dim.
    expect(propsOf(pri).opacity).toBeUndefined()
    expect(propsOf(pri).className).toContain("annotation-emphasis--primary")
  })

  it("leaves unspecified annotations unwrapped even when siblings have emphasis", () => {
    const out = applyAnnotationEmphasis([pair("s", "secondary"), pair("d")])
    const plain = out.find((n) => propsOf(n)["data-id"] === "d")
    // The unspecified node passes through as its original element — no wrapper.
    expect(plain).toBeDefined()
    expect(propsOf(plain).className).toBeUndefined()
  })
})

describe("renderAnnotationPass", () => {
  const ctx = {} as AnnotationContext
  const el = (id: string) => <g key={id} data-id={id} />

  it("drops annotations whose rule renders nothing (null / undefined / falsy), matching .filter(Boolean)", () => {
    const anns: Datum[] = [
      { type: "a", id: "keep" },
      { type: "b", id: "skip-null" },
      { type: "c", id: "skip-zero" },
      { type: "d", id: "skip-false" },
    ]
    // A rule may legally return a falsy ReactNode (null/undefined to skip, or
    // 0/false). The pass drops all of them — the exact set the prior
    // `.filter(Boolean)` removed — so this is not a behavior change.
    const rule = (a: Datum): React.ReactNode | null => {
      if (a.id === "keep") return el("keep")
      if (a.id === "skip-null") return null
      if (a.id === "skip-zero") return 0
      return false
    }
    const out = renderAnnotationPass(anns, rule, undefined, ctx)
    expect(out).toHaveLength(1)
    expect(propsOf(out[0])["data-id"]).toBe("keep")
  })

  it("falls through to the default rule when the user rule returns null/undefined", () => {
    const anns: Datum[] = [{ type: "x", id: "a" }, { type: "y", id: "b" }]
    const userRule = (a: Datum): React.ReactNode | null => (a.id === "a" ? el("user-a") : null)
    const defaultRule = (a: Datum) => el(`default-${a.id}`)
    const out = renderAnnotationPass(anns, defaultRule, userRule, ctx)
    expect(out.map((n) => propsOf(n)["data-id"])).toEqual(["user-a", "default-b"])
  })

  it("keeps a user rule's truthy result over the default", () => {
    const anns: Datum[] = [{ type: "x", id: "a" }]
    const out = renderAnnotationPass(anns, () => el("default"), () => el("user"), ctx)
    expect(propsOf(out[0])["data-id"]).toBe("user")
  })

  it("applies emphasis hierarchy across the rendered nodes", () => {
    const anns: Datum[] = [
      { type: "x", id: "p", emphasis: "primary" },
      { type: "x", id: "s", emphasis: "secondary" },
      { type: "x", id: "d" },
    ]
    const out = renderAnnotationPass(anns, (a) => el(String(a.id)), undefined, ctx)
    // secondary → unspecified → primary (innerId reads through the wrapper).
    expect(out.map(innerId)).toEqual(["s", "d", "p"])
  })
})
