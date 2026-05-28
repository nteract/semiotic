import { describe, expect, it } from "vitest"
import {
  annotationFreshnessFor,
  applyAnnotationLifecycle,
  computeAnnotationFreshness,
  currentTimestamp,
  withCurrentProvenance,
  withProvenance,
  type Annotated,
  type AnnotationAnchor,
  type AnnotationFreshness,
  type AnnotationLifecycle,
  type AnnotationProvenance,
  type AnnotationSource,
} from "./annotationProvenance"

const DAY = 24 * 60 * 60 * 1000
const DAY_ZERO = Date.parse("2026-01-01T00:00:00Z")
// day(1) → 2026-01-01, day(40) → 2026-02-09, etc. Done via timestamp
// arithmetic so we don't have to think about month rollovers in tests.
const day = (n: number) => new Date(DAY_ZERO + (n - 1) * DAY).toISOString()

function ann(createdAt: string, ttlHint: string | number = "P30D", extra: Record<string, unknown> = {}) {
  return withProvenance(
    { type: "callout", label: "x", ...extra },
    {
      provenance: { author: "alice", source: "user", createdAt },
      lifecycle: { ttlHint },
    }
  )
}

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

describe("annotationProvenance — computeAnnotationFreshness", () => {
  it("classifies bands from createdAt + ttlHint relative to `now`", () => {
    const a = ann(day(1), "P10D") // created Jan 1, TTL 10 days
    // age 5 days → < 1× TTL → fresh
    expect(annotationFreshnessFor(a, Date.parse(day(6)))).toBe("fresh")
    // age 12 days → < 1.5× TTL → aging
    expect(annotationFreshnessFor(a, Date.parse("2026-01-13T00:00:00Z"))).toBe("aging")
    // age 20 days → < 3× TTL → stale
    expect(annotationFreshnessFor(a, Date.parse("2026-01-21T00:00:00Z"))).toBe("stale")
    // age 35 days → > 3× TTL → expired
    expect(annotationFreshnessFor(a, Date.parse("2026-02-05T00:00:00Z"))).toBe("expired")
  })

  it("resolves `now` from dataExtent's max when no explicit now is given", () => {
    const a = ann(day(1), "P10D")
    const out = computeAnnotationFreshness([a], {
      dataExtent: [day(1), day(30)],
    })
    // age 29 days → > 1.5×, < 3× → stale
    expect(out[0].lifecycle?.freshness).toBe("stale")
  })

  it("supports the object form of dataExtent", () => {
    const a = ann(day(1), "P10D")
    const out = computeAnnotationFreshness([a], {
      dataExtent: { min: day(1), max: day(40) },
    })
    expect(out[0].lifecycle?.freshness).toBe("expired")
  })

  it("falls back to Date.now() when neither now nor dataExtent is given", () => {
    // An annotation created very recently → fresh, regardless of when
    // the test runs.
    const recent = withProvenance(
      { type: "callout", label: "x" },
      {
        provenance: { author: "bot", source: "ai", createdAt: new Date().toISOString() },
        lifecycle: { ttlHint: "P30D" },
      }
    )
    const out = computeAnnotationFreshness([recent])
    expect(out[0].lifecycle?.freshness).toBe("fresh")
  })

  it("accepts ISO durations and millisecond numbers for ttlHint", () => {
    const isoForm = ann(day(1), "P7D")
    const msForm = ann(day(1), 7 * DAY)
    const refNow = Date.parse(day(8)) // 7 days later → exactly at threshold
    expect(annotationFreshnessFor(isoForm, refNow)).toBe("aging")
    expect(annotationFreshnessFor(msForm, refNow)).toBe("aging")
  })

  it("preserves existing freshness when createdAt or ttlHint is missing", () => {
    const handAssigned: Annotated<{ type: string }> = {
      type: "callout",
      lifecycle: { freshness: "stale" },
    }
    expect(annotationFreshnessFor(handAssigned, Date.now())).toBe("stale")

    const noLifecycle: Annotated<{ type: string }> = { type: "callout" }
    expect(annotationFreshnessFor(noLifecycle, Date.now())).toBe("fresh")
  })

  it("honors custom thresholds", () => {
    const a = ann(day(1), "P10D")
    // Without custom thresholds: 12 days = aging. With aging at 2×: still fresh.
    const refNow = Date.parse(day(13))
    expect(annotationFreshnessFor(a, refNow)).toBe("aging")
    expect(annotationFreshnessFor(a, refNow, { fresh: 2 })).toBe("fresh")
  })

  it("does not mutate the input array", () => {
    const a = ann(day(1), "P10D")
    const before = { ...a, lifecycle: { ...a.lifecycle } }
    computeAnnotationFreshness([a], { now: day(20) })
    expect(a).toEqual(before)
  })
})

describe("annotationProvenance — applyAnnotationLifecycle", () => {
  it("applies the default visual treatment per band", () => {
    const annotations = [
      ann(day(1), "P10D", { id: "a" }),  // fresh at day 5
      ann(day(1), "P3D", { id: "b" }),   // aging at day 5 (age=4, 1×=3, <1.5×=4.5)
      ann(day(1), "P2D", { id: "c" }),   // stale at day 5 (age=4, 1×=2, 1.5×=3, 3×=6)
    ]
    const out = applyAnnotationLifecycle(annotations, { now: day(5) })

    const byId = Object.fromEntries(
      out.map((a) => {
        const styled = a as unknown as { id: string; opacity?: number; strokeDasharray?: string }
        return [styled.id, styled]
      })
    )
    expect(out).toHaveLength(3)
    expect(byId.a.opacity).toBeUndefined()
    expect(byId.b.opacity).toBeCloseTo(0.55)
    expect(byId.c.opacity).toBeCloseTo(0.35)
    expect(byId.c.strokeDasharray).toBe("4 4")
  })

  it("filters expired annotations by default", () => {
    const a = ann(day(1), "P5D", { id: "expired" }) // expired at day 20 (age=19, 3×=15)
    const out = applyAnnotationLifecycle([a], { now: day(20) })
    expect(out).toHaveLength(0)
  })

  it("keeps expired annotations when showExpiredAnnotations is true", () => {
    const a = ann(day(1), "P5D", { id: "expired" })
    const out = applyAnnotationLifecycle([a], {
      now: day(20),
      showExpiredAnnotations: true,
    })
    expect(out).toHaveLength(1)
    const styled = out[0] as unknown as { opacity?: number; strokeDasharray?: string }
    expect(styled.opacity).toBeCloseTo(0.2)
    expect(styled.strokeDasharray).toBe("2 4")
  })

  it("respects existing opacity/strokeDasharray on the annotation", () => {
    const a = withProvenance(
      { type: "callout", label: "x", id: "z", opacity: 0.9, strokeDasharray: "1 1" },
      {
        provenance: { author: "alice", source: "user", createdAt: day(1) },
        lifecycle: { ttlHint: "P3D" }, // 4 days later → aging
      }
    )
    const out = applyAnnotationLifecycle([a], { now: day(5) })
    // The annotation's own opacity / dasharray win over the treatment.
    const styled = out[0] as unknown as { opacity: number; strokeDasharray: string }
    expect(styled.opacity).toBe(0.9)
    expect(styled.strokeDasharray).toBe("1 1")
  })

  it("appends labelSuffix per band when provided", () => {
    const a = ann(day(1), "P3D", { id: "b" })
    const out = applyAnnotationLifecycle([a], {
      now: day(5),
      labelSuffix: { aging: " (aging)" },
    })
    expect((out[0] as { label: string }).label).toBe("x (aging)")
  })

  it("allows callers to disable a default per-band treatment via null", () => {
    const a = ann(day(1), "P3D", { id: "b" })
    const out = applyAnnotationLifecycle([a], {
      now: day(5),
      opacity: { aging: null },
    })
    const styled = out[0] as unknown as { opacity?: number }
    expect(styled.opacity).toBeUndefined()
  })

  it("mirrors lifecycle.anchor onto top-level anchor so the resolver picks it up", () => {
    // The streaming annotation resolver reads `ann.anchor`, not
    // `ann.lifecycle.anchor`. Without this bridge, setting
    // `lifecycle.anchor: "latest"` would silently fall through to
    // fixed behavior at runtime.
    const a = withProvenance(
      { type: "callout", label: "x", id: "anchored" },
      {
        provenance: { author: "alice", createdAt: day(1) },
        lifecycle: { ttlHint: "P30D", anchor: "latest" },
      }
    )
    const out = applyAnnotationLifecycle([a], { now: day(5) })
    expect((out[0] as unknown as { anchor?: string }).anchor).toBe("latest")
  })

  it("preserves an explicit top-level anchor over lifecycle.anchor", () => {
    const a = withProvenance(
      { type: "callout", label: "x", id: "anchored", anchor: "sticky" },
      {
        provenance: { author: "alice", createdAt: day(1) },
        lifecycle: { ttlHint: "P30D", anchor: "latest" },
      }
    )
    const out = applyAnnotationLifecycle([a], { now: day(5) })
    expect((out[0] as unknown as { anchor?: string }).anchor).toBe("sticky")
  })
})

describe("annotationProvenance — currentTimestamp / withCurrentProvenance", () => {
  it("currentTimestamp returns a valid ISO 8601 string parseable as a date", () => {
    const before = Date.now()
    const ts = currentTimestamp()
    const after = Date.now()
    const parsed = Date.parse(ts)
    expect(Number.isFinite(parsed)).toBe(true)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it("withCurrentProvenance stamps createdAt when missing", () => {
    const base = { type: "callout", label: "x" }
    const before = Date.now()
    const out = withCurrentProvenance(base, { author: "stream", source: "computed" })
    const after = Date.now()

    expect(out.provenance?.author).toBe("stream")
    expect(out.provenance?.source).toBe("computed")
    const parsed = Date.parse(out.provenance!.createdAt!)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
    // Original annotation isn't mutated.
    expect((base as Annotated<typeof base>).provenance).toBeUndefined()
  })

  it("withCurrentProvenance preserves an existing createdAt", () => {
    const base = withProvenance(
      { type: "callout", label: "x" },
      { provenance: { author: "alice", createdAt: "2026-01-01T00:00:00Z" } }
    )
    const out = withCurrentProvenance(base, { source: "ai" })
    // Author and createdAt from the original survive; source is added.
    expect(out.provenance?.author).toBe("alice")
    expect(out.provenance?.createdAt).toBe("2026-01-01T00:00:00Z")
    expect(out.provenance?.source).toBe("ai")
  })

  it("withCurrentProvenance accepts an explicit createdAt override", () => {
    const base = { type: "callout", label: "x" }
    const out = withCurrentProvenance(base, {
      author: "stream",
      createdAt: "2026-04-15T12:00:00Z",
    })
    expect(out.provenance?.createdAt).toBe("2026-04-15T12:00:00Z")
  })
})
