import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { areaCanvasRenderer } from "./renderers/areaCanvasRenderer"
import { xySceneNodeToSVG } from "./SceneToSVGXY"
import type { AreaSceneNode, StreamLayout, StreamScales } from "./types"
import { createMockCanvasContext, recordCanvasOps, type CanvasContextMock } from "../../test-utils/canvasMock"

type XYSceneNode = Parameters<typeof xySceneNodeToSVG>[0]

const hatch = { type: "hatch" as const, background: "#fff", stroke: "#333" }
const area = (style: AreaSceneNode["style"], extra: Partial<AreaSceneNode> = {}): AreaSceneNode => ({
  type: "area",
  topPath: [[0, 10], [50, 20], [100, 5]],
  bottomPath: [[0, 60], [50, 60], [100, 60]],
  style: { fill: "#4e79a7", ...style },
  datum: [],
  ...extra,
})

/** The alpha the canvas paints the area's fill with. */
function canvasFillAlpha(node: AreaSceneNode): number {
  const ctx = createMockCanvasContext() as CanvasContextMock & CanvasRenderingContext2D
  const ops = recordCanvasOps(ctx)
  areaCanvasRenderer(ctx, [node], {} as StreamScales, { width: 100, height: 60 } as StreamLayout)
  return ops.fillAlphas[0]
}

/** The alpha SVG composes for the fill path: fill-opacity times opacity. */
function svgFillAlpha(node: AreaSceneNode): number {
  const html = renderToStaticMarkup(<svg>{xySceneNodeToSVG(node as XYSceneNode, 0)}</svg>)
  const fillPath = html.match(/<path d="[^"]*"[^>]*stroke="none"[^>]*>/)![0]
  const attr = (name: string) => Number(fillPath.match(new RegExp(` ${name}="([^"]+)"`))?.[1] ?? 1)
  return attr("fill-opacity") * attr("opacity")
}

describe("area fill opacity in SVG matches the canvas", () => {
  const styles: Array<AreaSceneNode["style"]> = [
    {},
    { opacity: 0.3 },
    { fillOpacity: 0.5 },
    { fillOpacity: 0.5, opacity: 0.4 },
    { fillOpacity: 0.2, opacity: 0.58 },
  ]
  const variants: Array<[string, (style: AreaSceneNode["style"]) => AreaSceneNode]> = [
    ["a plain fill", style => area(style)],
    ["a clipped fill", style => area(style, { clipRect: { x: 0, y: 0, width: 60, height: 60 } })],
    ["a hatch fill", style => area({ ...style, fill: hatch })],
  ]

  for (const [name, build] of variants) {
    it.each(styles)(`for ${name} with %j`, (style) => {
      const node = build(style)
      expect(svgFillAlpha(node)).toBeCloseTo(canvasFillAlpha(node), 6)
    })
  }
})
