import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { vi } from "vitest"
import type {
  ConnectorSceneNode,
  OrdinalLayout,
  OrdinalScales,
  OrdinalSceneNode
} from "./ordinalTypes"
import type { SceneRenderBackend } from "./types"
import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import { connectorCanvasRenderer } from "./renderers/connectorCanvasRenderer"
import { renderOrdinalSceneListWithBackend } from "./ordinalSceneSVG"

function connectors(style: ConnectorSceneNode["style"]): ConnectorSceneNode[] {
  return [
    {
      type: "connector", x1: 10, y1: 10, x2: 90, y2: 10,
      style, datum: { id: "a" }, group: "flow"
    },
    {
      type: "connector", x1: 90, y1: 10, x2: 50, y2: 80,
      style, datum: { id: "b" }, group: "flow"
    }
  ]
}

function markup(
  nodes: OrdinalSceneNode[],
  renderMode?: SceneRenderBackend<OrdinalSceneNode>
): string {
  const entries = renderOrdinalSceneListWithBackend({
    nodes,
    renderMode,
    idPrefix: "test"
  })
  return renderToStaticMarkup(<svg>{entries.map(entry => entry.element)}</svg>)
}

describe("ordinal grouped connector SVG parity", () => {
  it("serializes the canvas polygon before segment strokes with cursor metadata", () => {
    const html = markup(connectors({
      fill: "#c44",
      fillOpacity: 0.4,
      opacity: 0.8,
      cursor: "pointer"
    }))

    expect(html).toContain('points="10,10 90,10 50,80"')
    expect(html).toContain('fill="#c44" opacity="0.4"')
    expect(html).toContain('data-semiotic-connector-fill="flow"')
    expect(html.match(/<line /g)).toHaveLength(2)
    expect(html.match(/stroke="#c44"/g)).toHaveLength(2)
    expect(html.indexOf("<polygon")).toBeLessThan(html.indexOf("<line"))
    expect(html.match(/data-semiotic-mark-cursor="pointer"/g)).toHaveLength(3)
  })

  it("keeps hatch fills valid and lets a custom backend replace the group", () => {
    const nodes = connectors({
      fill: {
        type: "hatch",
        background: "#ffd166",
        stroke: "#8a5a00"
      },
      cursor: "pointer"
    })
    const builtIn = markup(nodes)
    expect(builtIn).toContain("<pattern")
    expect(builtIn).toContain('fill="url(#test-connector-0-0-hatch)"')
    expect(builtIn.match(/stroke="#ffd166"/g)).toHaveLength(2)

    const backend: SceneRenderBackend<OrdinalSceneNode> = {
      id: "connector-test",
      cacheKey: () => "connector-test",
      drawCanvas: () => true,
      renderStaticSVG: ({ key }) => <path key={key} data-backend-connector="true" />
    }
    const overridden = markup(nodes, backend)
    expect(overridden).not.toContain("data-semiotic-connector-fill")
    expect(overridden.match(/data-backend-connector="true"/g)).toHaveLength(2)
  })

  it("suppresses stroke=none in canvas and hit testing like SVG", () => {
    const node = connectors({ fill: "#c44", stroke: "none" })[0]
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(), stroke: vi.fn(), globalAlpha: 1, lineWidth: 1,
      fillStyle: "", strokeStyle: ""
    } as unknown as CanvasRenderingContext2D
    const scales: OrdinalScales = {
      o: scaleBand<string>().domain(["A"]).range([0, 100]),
      r: scaleLinear().domain([0, 1]).range([100, 0]),
      projection: "vertical"
    }
    const layout: OrdinalLayout = { width: 100, height: 100 }

    connectorCanvasRenderer(context, [node], scales, layout)
    expect(context.stroke).not.toHaveBeenCalled()
    expect(findNearestOrdinalNode([node], 50, 10)).toBeNull()
    const html = markup([node])
    expect(html).not.toContain("data-semiotic-connector-fill")
    expect(html).toContain('stroke="none"')
  })
})
