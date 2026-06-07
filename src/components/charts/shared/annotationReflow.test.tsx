import { describe, expect, it } from "vitest"
import * as React from "react"
import { scaleLinear } from "d3-scale"
import { createDefaultAnnotationRules } from "./annotationRules"
import type { AnnotationContext } from "../../realtime/types"
import type { Datum } from "./datumTypes"

// The core data-binding promise (Rahman et al.): "labels move with the
// data." A value-anchored annotation must resolve
// through the chart's scale to its DATA coordinates — never to its array
// index — so reordering (sort) or filtering the data leaves a still-present
// anchor pinned to the same data point, and a rescale moves it with the axis.
// This guards against a regression to index-based positioning.

const xScale = scaleLinear().domain([0, 10]).range([0, 200])
const yScale = scaleLinear().domain([0, 10]).range([200, 0])

function ctx(
  data: Datum[],
  scales = { x: xScale, y: yScale },
  overrides: Partial<AnnotationContext> = {}
): AnnotationContext {
  return {
    scales: { x: scales.x, y: scales.y, time: scales.x, value: scales.y },
    xAccessor: "x",
    yAccessor: "y",
    width: 200,
    height: 200,
    data,
    frameType: "xy",
    ...overrides,
  }
}

const rules = createDefaultAnnotationRules("xy")

// The default rules return an <Annotation noteData={{ x, y, ... }} /> element.
function notePos(node: React.ReactNode): { x: number; y: number } {
  if (!React.isValidElement(node)) throw new Error("expected an annotation element")
  const noteData = (node.props as { noteData: { x: number; y: number } }).noteData
  return { x: noteData.x, y: noteData.y }
}

describe("annotation reflow binding", () => {
  const callout: Datum = { type: "callout", x: 5, y: 5, label: "peak" }

  it("resolves a value-anchored annotation through the scale, not the array index", () => {
    const node = rules(callout, 0, ctx([{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 9 }]))
    // x=5 on a [0,10]→[0,200] scale is pixel 100; y=5 on [0,10]→[200,0] is 100.
    expect(notePos(node)).toEqual({ x: xScale(5), y: yScale(5) })
    expect(notePos(node)).toEqual({ x: 100, y: 100 })
  })

  it("stays pinned when the data array is reordered (sort)", () => {
    const ascending = rules(callout, 0, ctx([{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 9 }]))
    const descending = rules(callout, 0, ctx([{ x: 9, y: 9 }, { x: 5, y: 5 }, { x: 1, y: 1 }]))
    // Same data point, different array order → identical pixel position.
    expect(notePos(descending)).toEqual(notePos(ascending))
  })

  it("stays pinned when an unrelated datum is filtered out (domain unchanged)", () => {
    const full = rules(callout, 0, ctx([{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 9 }]))
    const filtered = rules(callout, 0, ctx([{ x: 5, y: 5 }, { x: 9, y: 9 }]))
    expect(notePos(filtered)).toEqual(notePos(full))
  })

  it("tracks its data value through a rescale (filter/zoom that changes the domain)", () => {
    // Zoom the x domain to [4, 6]: x=5 is now the centre → pixel 100 of a
    // [0,200] range. The annotation follows the axis because it is bound to
    // the data value, not a cached pixel.
    const zoomed = scaleLinear().domain([4, 6]).range([0, 200])
    const node = rules(callout, 0, ctx([{ x: 5, y: 5 }], { x: zoomed, y: yScale }))
    expect(notePos(node).x).toBe(zoomed(5))
    expect(notePos(node).x).toBe(100)
  })

  it("contrast: a `latest`-anchored annotation intentionally follows the array (not value-bound)", () => {
    // The binding is per anchor mode: `latest` re-pins to the most recent
    // datum, so it *should* move when the array's tail changes. This documents
    // that the value-binding above is a deliberate property of `fixed`, not an
    // accident of the resolver.
    const latest: Datum = { type: "callout", anchor: "latest", label: "now" }
    const a = rules(latest, 0, ctx([{ x: 1, y: 1 }, { x: 9, y: 9 }]))
    const b = rules(latest, 0, ctx([{ x: 1, y: 1 }, { x: 2, y: 2 }]))
    expect(notePos(a)).not.toEqual(notePos(b))
    expect(notePos(a)).toEqual({ x: xScale(9), y: yScale(9) })
    expect(notePos(b)).toEqual({ x: xScale(2), y: yScale(2) })
  })

  it("re-resolves a semantic annotation through provenance.stableId when the target is still present", () => {
    const semantic: Datum = {
      type: "callout",
      x: 5,
      y: 5,
      label: "Q3 spike",
      lifecycle: { anchor: "semantic" },
      provenance: { stableId: "q3-spike" },
    }
    const node = rules(
      semantic,
      0,
      ctx([{ stableId: "q3-spike", x: 7, y: 3 }])
    )
    expect(notePos(node)).toEqual({ x: xScale(7), y: yScale(3) })
  })

  it("moves a semantic annotation when refreshed data relocates the same stable target", () => {
    const semantic: Datum = {
      type: "callout",
      x: 5,
      y: 5,
      label: "Q3 spike",
      anchor: "semantic",
      provenance: { stableId: "q3-spike" },
    }
    const before = rules(
      semantic,
      0,
      ctx([{ stableId: "q3-spike", x: 5, y: 5 }])
    )
    const after = rules(
      semantic,
      0,
      ctx([{ stableId: "q3-spike", x: 8, y: 4 }])
    )
    expect(notePos(before)).toEqual({ x: xScale(5), y: yScale(5) })
    expect(notePos(after)).toEqual({ x: xScale(8), y: yScale(4) })
  })

  it("falls back to the recorded coordinate when a semantic target is gone", () => {
    const semantic: Datum = {
      type: "callout",
      x: 5,
      y: 5,
      label: "Q3 spike",
      anchor: "semantic",
      provenance: { stableId: "q3-spike" },
    }
    const node = rules(semantic, 0, ctx([{ stableId: "other-point", x: 8, y: 4 }]))
    expect(notePos(node)).toEqual({ x: xScale(5), y: yScale(5) })
  })

  it("prefers point scene nodes for semantic anchors when pointIdAccessor is configured", () => {
    const semantic: Datum = {
      type: "callout",
      x: 5,
      y: 5,
      label: "Q3 spike",
      anchor: "semantic",
      provenance: { stableId: "q3-spike" },
    }
    const node = rules(
      semantic,
      0,
      ctx(
        [{ stableId: "q3-spike", x: 5, y: 5 }],
        { x: xScale, y: yScale },
        { pointNodes: [{ pointId: "q3-spike", x: 33, y: 44, r: 3 }] }
      )
    )
    expect(notePos(node)).toEqual({ x: 33, y: 44 })
  })
})
