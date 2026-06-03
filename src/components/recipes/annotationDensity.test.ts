import { describe, expect, it } from "vitest"
import { annotationDensity, annotationBudget, DEFAULT_AREA_PER_ANNOTATION } from "./annotationDensity"
import type { Datum } from "../charts/shared/datumTypes"

const note = (label: string, extra: Datum = {}): Datum => ({ type: "label", x: 50, y: 50, label, ...extra })

describe("annotationBudget", () => {
  it("derives a budget from plot area", () => {
    expect(annotationBudget(600, 400)).toBe(Math.round((600 * 400) / DEFAULT_AREA_PER_ANNOTATION))
  })

  it("honors an explicit maxAnnotations cap", () => {
    expect(annotationBudget(600, 400, { maxAnnotations: 3 })).toBe(3)
  })

  it("returns Infinity for degenerate dimensions without an explicit cap", () => {
    expect(annotationBudget(0, 400)).toBe(Infinity)
  })

  it("tightens as areaPerAnnotation grows", () => {
    expect(annotationBudget(600, 400, { areaPerAnnotation: 120000 })).toBe(2)
  })
})

describe("annotationDensity", () => {
  it("keeps everything when the budget covers all notes", () => {
    const annotations = [note("a"), note("b")]
    const { visible, deferred } = annotationDensity({ annotations, width: 600, height: 400 })
    expect(visible).toHaveLength(2)
    expect(deferred).toHaveLength(0)
  })

  it("sheds the lowest-priority notes when over budget", () => {
    const annotations = [note("a"), note("b"), note("c"), note("d")]
    const { visible, deferred, budget } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 2,
    })
    expect(budget).toBe(2)
    expect(visible).toHaveLength(2)
    expect(deferred).toHaveLength(2)
  })

  it("never sheds a primary-emphasis note, even over budget", () => {
    const annotations = [
      note("secondary", { emphasis: "secondary" }),
      note("important", { emphasis: "primary" }),
      note("plain"),
    ]
    const { visible, deferred } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 1,
    })
    // Primary is the floor; the secondary one is shed first.
    expect(visible.map((a) => a.label)).toContain("important")
    expect(deferred.map((a) => a.label)).toContain("secondary")
  })

  it("ranks fresher notes above stale ones at equal emphasis", () => {
    const annotations = [
      note("stale", { lifecycle: { freshness: "stale" } }),
      note("fresh", { lifecycle: { freshness: "fresh" } }),
    ]
    const { visible, deferred } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 1,
    })
    expect(visible.map((a) => a.label)).toEqual(["fresh"])
    expect(deferred.map((a) => a.label)).toEqual(["stale"])
  })

  it("sheds expired notes first", () => {
    const annotations = [
      note("expired", { lifecycle: { freshness: "expired" } }),
      note("plain"),
    ]
    const { visible, deferred } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 1,
    })
    expect(visible.map((a) => a.label)).toEqual(["plain"])
    expect(deferred.map((a) => a.label)).toEqual(["expired"])
  })

  it("keeps a minimum-visible floor even when the budget is zero", () => {
    const annotations = [note("a"), note("b")]
    const { visible } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 0,
      minVisible: 1,
    })
    expect(visible.length).toBeGreaterThanOrEqual(1)
  })

  it("passes reference lines and overlays through untouched (they don't count)", () => {
    const annotations: Datum[] = [
      { type: "y-threshold", value: 10, label: "limit" },
      { type: "band", y0: 1, y1: 2 },
      note("a"),
      note("b"),
      note("c"),
    ]
    const { visible, deferred } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 1,
    })
    // Both non-note annotations always survive.
    expect(visible.some((a) => a.type === "y-threshold")).toBe(true)
    expect(visible.some((a) => a.type === "band")).toBe(true)
    // Only one note kept; the other two deferred.
    expect(visible.filter((a) => a.type === "label")).toHaveLength(1)
    expect(deferred).toHaveLength(2)
  })

  it("preserves author order within the visible set", () => {
    const annotations = [note("a"), note("b"), note("c"), note("d")]
    const { visible } = annotationDensity({
      annotations,
      width: 100,
      height: 100,
      maxAnnotations: 3,
    })
    const labels = visible.map((a) => a.label)
    // Whatever survives stays in its original relative order.
    expect(labels).toEqual([...labels].sort((x, y) => annotations.findIndex((a) => a.label === x) - annotations.findIndex((a) => a.label === y)))
  })
})
