import { describe, expect, it } from "vitest"
import { emitProcessSankeyScenes, type ProcessSankeyBandSpec } from "./streamingLayout"

function band(id: string, category: string): ProcessSankeyBandSpec {
  return {
    id,
    pathD: "M0,0 L10,0 L10,10 L0,10 Z",
    fill: "#336",
    rawDatum: { id, category },
    labelX: 0,
    labelY: 0,
    labelText: id,
  }
}

const dims = {
  nodes: [],
  edges: [],
  dimensions: { plot: { x: 0, y: 0, width: 200, height: 200 } },
  theme: {} as never,
  resolveColor: (k: string) => k,
}

describe("ProcessSankey selectionDatum (M7)", () => {
  it("defaults to raw: field matchers see author category, not __kind wrapper", () => {
    const scenes = emitProcessSankeyScenes({
      ...dims,
      config: {
        bands: [band("A", "core"), band("B", "noise")],
        ribbons: [],
        showLabels: true,
        selectionDatum: "raw",
      },
      selection: {
        isActive: true,
        predicate: (d) => (d as { category?: string }).category === "core",
      },
    } as never)

    const edges = scenes.sceneEdges ?? []
    const a = edges.find((e) => (e.datum as { id?: string })?.id === "A")!
    const b = edges.find((e) => (e.datum as { id?: string })?.id === "B")!
    // Selected band stays opaque; unselected is dimmed.
    expect((a.style as { fillOpacity?: number }).fillOpacity ?? 1).toBeGreaterThan(0.5)
    expect((b.style as { fillOpacity?: number }).fillOpacity).toBeLessThan(0.3)
  })

  it("scene mode matches against the full payload (__kind present)", () => {
    const scenes = emitProcessSankeyScenes({
      ...dims,
      config: {
        bands: [band("A", "core"), band("B", "noise")],
        ribbons: [],
        showLabels: true,
        selectionDatum: "scene",
      },
      selection: {
        isActive: true,
        predicate: (d) =>
          typeof d === "object" &&
          d != null &&
          (d as { __kind?: string }).__kind === "band" &&
          (d as { id?: string }).id === "A",
      },
    } as never)

    const edges = scenes.sceneEdges ?? []
    const a = edges.find((e) => (e.datum as { id?: string })?.id === "A")!
    const b = edges.find((e) => (e.datum as { id?: string })?.id === "B")!
    expect((a.style as { fillOpacity?: number }).fillOpacity ?? 1).toBeGreaterThan(0.5)
    expect((b.style as { fillOpacity?: number }).fillOpacity).toBeLessThan(0.3)
  })
})
