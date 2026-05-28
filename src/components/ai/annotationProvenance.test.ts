import { describe, expect, it } from "vitest"
import {
  withProvenance,
  type Annotated,
  type AnnotationAnchor,
  type AnnotationFreshness,
  type AnnotationLifecycle,
  type AnnotationProvenance,
  type AnnotationSource,
} from "./annotationProvenance"

describe("annotationProvenance — withProvenance()", () => {
  it("attaches provenance + lifecycle without mutating the input", () => {
    const original = { type: "y-threshold", value: 100, label: "SLA breach" }
    const annotated = withProvenance(original, {
      provenance: { author: "alice", source: "user", createdAt: "2026-05-20T14:00:00Z" },
      lifecycle: { ttlHint: "P30D", anchor: "semantic" },
    })

    expect(annotated).toEqual({
      type: "y-threshold",
      value: 100,
      label: "SLA breach",
      provenance: { author: "alice", source: "user", createdAt: "2026-05-20T14:00:00Z" },
      lifecycle: { ttlHint: "P30D", anchor: "semantic" },
    })
    // Mutation guard: the original is untouched.
    expect(original).toEqual({ type: "y-threshold", value: 100, label: "SLA breach" })
    expect((original as Annotated<typeof original>).provenance).toBeUndefined()
  })

  it("attaches only the blocks that were provided", () => {
    const onlyProvenance = withProvenance(
      { type: "label", text: "x" },
      { provenance: { author: "bot", source: "ai" } }
    )
    const onlyLifecycle = withProvenance(
      { type: "label", text: "x" },
      { lifecycle: { anchor: "latest" } }
    )
    const neither = withProvenance({ type: "label", text: "x" }, {})

    expect(onlyProvenance.provenance).toBeDefined()
    expect(onlyProvenance.lifecycle).toBeUndefined()
    expect(onlyLifecycle.provenance).toBeUndefined()
    expect(onlyLifecycle.lifecycle).toBeDefined()
    expect(neither.provenance).toBeUndefined()
    expect(neither.lifecycle).toBeUndefined()
  })

  it("preserves type of the original annotation fields", () => {
    const ann = withProvenance(
      { type: "callout" as const, x: 12, y: 34, custom: { foo: "bar" } },
      { provenance: { author: "alice" } }
    )
    // Compile-time check via `satisfies`-style narrowing; runtime check
    // confirms the original fields survive untouched.
    expect(ann.type).toBe("callout")
    expect(ann.x).toBe(12)
    expect(ann.custom).toEqual({ foo: "bar" })
  })
})

describe("annotationProvenance — type surface", () => {
  // These assertions are mostly compile-time guards; the runtime
  // expectations just confirm we can construct the documented shapes.

  it("accepts the documented AnnotationProvenance shape", () => {
    const p: AnnotationProvenance = {
      author: "alice",
      source: "user",
      confidence: 0.95,
      createdAt: "2026-05-20T14:00:00Z",
      stableId: "annot-abc-123",
    }
    expect(p.confidence).toBe(0.95)
  })

  it("allows arbitrary source labels via the open string union", () => {
    const sources: AnnotationSource[] = [
      "user",
      "ai",
      "agent",
      "import",
      "computed",
      "system",
      "custom-pipeline",
    ]
    expect(sources).toHaveLength(7)
  })

  it("accepts the documented AnnotationLifecycle shape with all anchor modes", () => {
    const anchors: AnnotationAnchor[] = ["fixed", "latest", "sticky", "semantic"]
    const freshness: AnnotationFreshness[] = ["fresh", "aging", "stale", "expired"]
    const l: AnnotationLifecycle = {
      freshness: "fresh",
      ttlHint: "P30D",
      anchor: "semantic",
    }
    const lMs: AnnotationLifecycle = { ttlHint: 86_400_000 }
    expect(anchors).toHaveLength(4)
    expect(freshness).toHaveLength(4)
    expect(l.anchor).toBe("semantic")
    expect(lMs.ttlHint).toBe(86_400_000)
  })
})
