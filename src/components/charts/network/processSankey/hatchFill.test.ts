import { describe, expect, it } from "vitest"
import { buildProcessSankeyScenes } from "./buildScenes"
import { emitProcessSankeyScenes } from "./streamingLayout"
import { networkSceneEdgeToSVG } from "../../../stream/SceneToSVGNetwork"
import { isHatchFill } from "../../shared/hatchFill"
import type { NetworkBezierEdge } from "../../../stream/networkTypes"

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d).getTime()
const DOMAIN: [number, number] = [D(2020, 1, 1), D(2021, 1, 1)]

describe("ProcessSankey band HatchFill (M8)", () => {
  it("keeps HatchFill on band specs and emits it as scene fill (canvas path)", () => {
    const result = buildProcessSankeyScenes({
      nodes: [
        { id: "A", label: "A", __raw: { id: "A", status: "disputed" } },
        { id: "B", label: "B", __raw: { id: "B", status: "ok" } },
      ],
      edges: [
        {
          id: "e",
          source: "A",
          target: "B",
          value: 3,
          startTime: D(2020, 3, 1),
          endTime: D(2020, 6, 1),
        },
      ],
      domain: DOMAIN,
      plotW: 400,
      plotH: 300,
      ribbonLane: "both",
      edgeOpacity: 0.4,
      colorOf: () => "#336699",
      layoutOpts: { packing: "off", laneOrder: "insertion" },
      styleRules: [
        {
          when: { field: "status", eq: "disputed" },
          style: {
            fill: {
              type: "hatch",
              background: "#fde68a",
              stroke: "#b45309",
              spacing: 5,
            },
          },
        },
      ],
    })

    const disputed = result.layoutConfig.bands.find((b) => b.id === "A")!
    expect(disputed.hatchFill).toBeDefined()
    expect(isHatchFill(disputed.hatchFill)).toBe(true)
    expect(disputed.hatchFill?.background).toBe("#fde68a")

    const scenes = emitProcessSankeyScenes({
      nodes: [],
      edges: [],
      dimensions: { plot: { x: 0, y: 0, width: 400, height: 300 } },
      theme: {} as never,
      resolveColor: (k) => String(k),
      config: result.layoutConfig,
    } as never)

    const bandEdge = (scenes.sceneEdges ?? []).find(
      (e) => e.type === "bezier" && (e.datum as { id?: string })?.id === "A",
    ) as NetworkBezierEdge
    expect(bandEdge).toBeTruthy()
    expect(isHatchFill(bandEdge.style.fill)).toBe(true)
  })

  it("serializes hatched bezier bands with an SVG pattern def", () => {
    const edge: NetworkBezierEdge = {
      type: "bezier",
      pathD: "M0,0 L20,0 L20,10 L0,10 Z",
      style: {
        fill: { type: "hatch", background: "#eee", stroke: "#333", spacing: 4 },
        fillOpacity: 0.9,
      },
      datum: { id: "x" },
    }
    const svg = networkSceneEdgeToSVG(edge, 0)
    // React element tree — hatch path should wrap defs + path
    expect(svg).toBeTruthy()
    const json = JSON.stringify(svg)
    expect(json).toContain("pattern")
    expect(json).toContain("url(#net-bezier-0-hatch)")
  })
})
