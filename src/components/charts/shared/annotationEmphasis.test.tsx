import { describe, expect, it } from "vitest"
import * as React from "react"
import { applyAnnotationEmphasis, type AnnotationRenderPair } from "./annotationRules"
import type { Datum } from "./datumTypes"

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
