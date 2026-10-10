import { stableEvidenceHash } from "./stableJsonHash"
import { mapSvgAttributes } from "../shared/svgRoot"
import { rewriteSvgIdentifiers } from "../shared/svgIdentifiers"

interface RenderedSceneHashContext {
  frameType: string
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
  plot?: { x: number; y: number; width: number; height: number }
  xDomain?: [number, number]
  yDomain?: [number, number]
  categories?: string[]
}

/** Identify rendered paint and coordinates, independent of document-instance ID names. */
export function renderedSceneHash(
  svg: string,
  context: RenderedSceneHashContext
): string {
  const ids = new Map<string, string>()
  mapSvgAttributes(svg, (name, value) => {
    // Internal hash tokens cannot collide with authored IDs in valid XML.
    // This normalized string is only hashed; exported SVG remains unchanged.
    if (name === "id" && !ids.has(value))
      ids.set(value, `\u0000scene-${ids.size}`)
    return undefined
  })
  return stableEvidenceHash({
    kind: "semiotic.rendered-svg-scene",
    version: 2,
    svg: rewriteSvgIdentifiers(svg, ids),
    frameType: context.frameType,
    width: context.width,
    height: context.height,
    margin: context.margin,
    plot: context.plot,
    xDomain: context.xDomain,
    yDomain: context.yDomain,
    categories: context.categories
  })
}
