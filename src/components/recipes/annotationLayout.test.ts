import { describe, expect, it } from "vitest"
import { scaleLinear } from "d3-scale"
import { annotationLayout } from "./annotationLayout"
import type { AnnotationContext } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"

const context = (overrides: Partial<AnnotationContext> = {}): AnnotationContext => ({
  scales: {
    x: scaleLinear().domain([0, 100]).range([0, 200]),
    y: scaleLinear().domain([0, 100]).range([120, 0]),
  } as AnnotationContext["scales"],
  width: 200,
  height: 120,
  frameType: "xy",
  ...overrides,
})

describe("annotationLayout", () => {
  it("chooses an in-bounds side near a plot edge", () => {
    const [placed] = annotationLayout({
      annotations: [{ type: "label", x: 96, y: 50, label: "Long enough to need room" }],
      context: context(),
    })

    expect(placed.dx).toBeLessThan(0)
  })

  it("separates notes that share an anchor", () => {
    const placed = annotationLayout({
      annotations: [
        { type: "label", x: 50, y: 50, label: "First" },
        { type: "label", x: 50, y: 50, label: "Second" },
      ],
      context: context(),
    })

    expect([placed[0].dx, placed[0].dy]).not.toEqual([placed[1].dx, placed[1].dy])
  })

  it("preserves manual offsets by default", () => {
    const annotations: Datum[] = [
      { type: "callout", x: 50, y: 50, label: "Manual", dx: 12, dy: -18 },
    ]
    const [placed] = annotationLayout({ annotations, context: context() })

    expect(placed).toBe(annotations[0])
    expect(placed.dx).toBe(12)
    expect(placed.dy).toBe(-18)
  })

  it("models missing manual note offsets with renderer defaults", () => {
    const annotations: Datum[] = [
      { type: "label", x: 50, y: 50, label: "Manual", dx: 30 },
      { type: "label", x: 50, y: 50, label: "Auto" },
    ]
    const placed = annotationLayout({ annotations, context: context(), defaultOffset: 30 })

    expect(placed[0]).toBe(annotations[0])
    expect([placed[1].dx, placed[1].dy]).not.toEqual([30, -30])
  })

  it("resolves geo coordinates when a projection is provided", () => {
    const [placed] = annotationLayout({
      annotations: [{ type: "label", coordinates: [10, 20], label: "Projected" }],
      context: context({
        scales: {
          geoProjection: () => [192, 60],
        } as unknown as AnnotationContext["scales"],
      }),
    })

    expect(placed.dx).toBeLessThan(0)
  })

  it("resolves raw pixel and node anchors when scales are absent", () => {
    const placed = annotationLayout({
      annotations: [
        { type: "label", x: 192, y: 60, label: "Pixel" },
        { type: "label", nodeId: "node-a", label: "Node" },
      ],
      context: context({
        scales: null,
        pointNodes: [{ pointId: "node-a", x: 192, y: 60, r: 6 }],
      }),
    })

    expect(placed[0].dx).toBeLessThan(0)
    expect(placed[1].dx).toBeDefined()
  })

  it("can route long auto-placed connectors as curves", () => {
    const [placed] = annotationLayout({
      annotations: [{ type: "callout", x: 50, y: 50, label: "Routed" }],
      context: context(),
      defaultOffset: 80,
      connectorThreshold: 50,
    })

    expect(placed.connector).toMatchObject({ type: "curve" })
  })

  it("does not manage density unless configured", () => {
    const annotations: Datum[] = Array.from({ length: 6 }, (_, i) => ({
      type: "label", x: 50, y: 50, label: `n${i}`,
    }))
    const placed = annotationLayout({ annotations, context: context() })
    expect(placed).toHaveLength(6)
  })

  it("sheds over-budget notes when density is enabled", () => {
    const annotations: Datum[] = Array.from({ length: 6 }, (_, i) => ({
      type: "label", x: 50, y: 50, label: `n${i}`,
    }))
    const placed = annotationLayout({
      annotations,
      context: context(),
      density: { maxAnnotations: 2 },
    })
    expect(placed).toHaveLength(2)
  })

  it("keeps deferred notes tagged under progressive disclosure", () => {
    const annotations: Datum[] = Array.from({ length: 6 }, (_, i) => ({
      type: "label", x: 50, y: 50, label: `n${i}`,
    }))
    const placed = annotationLayout({
      annotations,
      context: context(),
      density: { maxAnnotations: 2 },
      progressiveDisclosure: true,
    })
    expect(placed).toHaveLength(6)
    expect(placed.filter((a) => a._annotationDeferred === true)).toHaveLength(4)
  })

  it("does not add redundant cues unless configured", () => {
    const annotations: Datum[] = [{ type: "text", x: 50, y: 50, label: "Echo", color: "#f00", dx: 30, dy: 20 }]
    const [placed] = annotationLayout({ annotations, context: context() })
    expect(placed._redundantConnector).toBeUndefined()
  })

  it("flags a colored, offset text note with a redundant leader cue", () => {
    const annotations: Datum[] = [{ type: "text", x: 50, y: 50, label: "Echo", color: "#f00", dx: 30, dy: 20 }]
    const [placed] = annotationLayout({ annotations, context: context(), redundantCues: true })
    expect(placed._redundantConnector).toBe(true)
  })

  it("leaves colorless or on-anchor text notes alone under redundantCues", () => {
    const annotations: Datum[] = [
      { type: "text", x: 50, y: 50, label: "No color", dx: 30, dy: 20 },          // not color-linked
      { type: "text", x: 50, y: 50, label: "On anchor", color: "#f00", dx: 0, dy: 0 }, // no offset → no association
      { type: "label", x: 50, y: 50, label: "Has connector", color: "#f00" },     // already draws a connector
    ]
    const placed = annotationLayout({ annotations, context: context(), redundantCues: true })
    expect(placed.every((a) => a._redundantConnector !== true)).toBe(true)
  })
})
