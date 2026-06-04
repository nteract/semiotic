import { describe, expect, it } from "vitest"
import * as React from "react"
import { applyAnnotationEmphasis, renderAnnotationPass, type AnnotationRenderPair } from "./annotationRules"
import type { Datum } from "./datumTypes"
import type { AnnotationContext } from "../../realtime/types"

// Minimal element-prop accessor so the assertions don't sprinkle `any`.
type ElProps = {
  "data-id"?: string
  "data-annotation-reading-order"?: number
  className?: string
  opacity?: number
  fontSize?: string
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

const pair = (id: string, emphasis?: string, confidence?: number): AnnotationRenderPair => ({
  node: <g key={id} data-id={id} />,
  annotation: {
    type: "label",
    ...(emphasis ? { emphasis } : {}),
    ...(confidence != null ? { provenance: { confidence } } : {}),
  } as Datum,
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
    expect(propsOf(sec).fontSize).toBe("0.88em")
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

  it("infers reading order from provenance confidence, then array order", () => {
    const out = applyAnnotationEmphasis([
      pair("low", undefined, 0.2),
      pair("high", undefined, 0.9),
      pair("tie-a", undefined, 0.7),
      pair("tie-b", undefined, 0.7),
      pair("none"),
    ])

    // SVG paint order is low priority first, so the highest-confidence
    // annotation is last/on top while its reading order remains first.
    expect(out.map(innerId)).toEqual(["none", "low", "tie-b", "tie-a", "high"])

    const byId = new Map(out.map((n) => [innerId(n), propsOf(n)]))
    expect(byId.get("high")?.["data-annotation-reading-order"]).toBe(0)
    expect(byId.get("tie-a")?.["data-annotation-reading-order"]).toBe(1)
    expect(byId.get("tie-b")?.["data-annotation-reading-order"]).toBe(2)
    expect(byId.get("low")?.["data-annotation-reading-order"]).toBe(3)
    expect(byId.get("high")?.opacity).toBeGreaterThan(byId.get("low")?.opacity ?? 0)
    expect(byId.get("none")?.className).toBeUndefined()
  })

  it("lets explicit emphasis override inferred confidence", () => {
    const out = applyAnnotationEmphasis([
      pair("confident-secondary", "secondary", 1),
      pair("low-primary", "primary", 0.1),
      pair("inferred", undefined, 0.8),
    ])
    expect(out.map(innerId)).toEqual(["confident-secondary", "inferred", "low-primary"])
    expect(propsOf(out[0]).className).toContain("annotation-emphasis--secondary")
    expect(propsOf(out[2]).className).toContain("annotation-emphasis--primary")
  })

  describe("progressive disclosure (M3 density-deferred)", () => {
    const deferredPair = (id: string): AnnotationRenderPair => ({
      node: <g key={id} data-id={id} />,
      annotation: { type: "label", _annotationDeferred: true } as Datum,
    })

    it("wraps deferred notes in a hidden, revealable group and injects reveal CSS", () => {
      const out = applyAnnotationEmphasis([pair("keep"), deferredPair("hidden")])

      // A <style> tag is prepended once when anything is deferred.
      const style = out.find((n) => React.isValidElement(n) && n.type === "style")
      expect(style).toBeDefined()
      const css = String((propsOf(style).children) ?? "")
      expect(css).toContain(".annotation-deferred")
      expect(css).toContain(":hover")
      expect(css).toContain(":focus-within")
      expect(css).toContain(".stream-geo-frame")
      expect(css).toContain("prefers-reduced-motion")

      // The deferred node is wrapped with the reveal class + disclosure attr.
      const wrapped = out.find((n) => propsOf(n).className === "annotation-deferred")
      expect(wrapped).toBeDefined()
      expect(innerId(wrapped)).toBe("hidden")

      // The persistent note is untouched (the floor a non-hover reader sees).
      const persistent = out.find((n) => propsOf(n)["data-id"] === "keep")
      expect(persistent).toBeDefined()
    })

    it("composes emphasis and deferral on the same note", () => {
      const both: AnnotationRenderPair = {
        node: <g key="x" data-id="x" />,
        annotation: { type: "label", emphasis: "secondary", _annotationDeferred: true } as Datum,
      }
      const out = applyAnnotationEmphasis([both])
      const wrapped = out.find((n) => propsOf(n).className === "annotation-deferred")
      expect(wrapped).toBeDefined()
      // The inner child carries the emphasis wrapper (dimmed secondary).
      const inner = propsOf(wrapped).children
      expect(propsOf(inner).className).toContain("annotation-emphasis--secondary")
    })

    it("stays zero-overhead when nothing is deferred or emphasised", () => {
      const out = applyAnnotationEmphasis([pair("a"), pair("b")])
      expect(out.some((n) => React.isValidElement(n) && n.type === "style")).toBe(false)
      expect(out.map((n) => propsOf(n)["data-id"])).toEqual(["a", "b"])
    })
  })

  describe("cohesion modes (M5)", () => {
    const cohesionPair = (id: string, cohesion: string): AnnotationRenderPair => ({
      node: <g key={id} data-id={id} />,
      annotation: { type: "label", cohesion } as Datum,
    })

    it("wraps a layer note with its class and injects the layer CSS", () => {
      const out = applyAnnotationEmphasis([cohesionPair("ed", "layer")])
      const wrapped = out.find((n) => propsOf(n).className === "annotation-cohesion--layer")
      expect(wrapped).toBeDefined()
      expect(innerId(wrapped)).toBe("ed")
      const style = out.find((n) => React.isValidElement(n) && n.type === "style")
      const css = String(propsOf(style).children ?? "")
      expect(css).toContain(".annotation-cohesion--layer")
      expect(css).toContain("font-style:italic")
    })

    it("wraps a blended note with its class but injects no CSS (default look)", () => {
      const out = applyAnnotationEmphasis([cohesionPair("b", "blended")])
      const wrapped = out.find((n) => propsOf(n).className === "annotation-cohesion--blended")
      expect(wrapped).toBeDefined()
      // blended is the default look — no layer recolor stylesheet.
      expect(out.some((n) => React.isValidElement(n) && n.type === "style")).toBe(false)
    })

    it("stays zero-overhead when no cohesion mode is set", () => {
      const out = applyAnnotationEmphasis([pair("a"), pair("b")])
      expect(out.every((n) => !String(propsOf(n).className ?? "").includes("cohesion"))).toBe(true)
    })
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

  it("applies inferred hierarchy across the rendered nodes", () => {
    const anns: Datum[] = [
      { type: "x", id: "low", provenance: { confidence: 0.3 } },
      { type: "x", id: "high", provenance: { confidence: 0.9 } },
    ]
    const out = renderAnnotationPass(anns, (a) => el(String(a.id)), undefined, ctx)
    expect(out.map(innerId)).toEqual(["low", "high"])
    expect(propsOf(out[1])["data-annotation-reading-order"]).toBe(0)
  })
})
