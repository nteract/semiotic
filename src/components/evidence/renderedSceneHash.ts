import { stableEvidenceHash } from "./stableJsonHash"

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

/** Identify the final SVG bytes and coordinates, including post-render theme CSS. */
export function renderedSceneHash(svg: string, context: RenderedSceneHashContext): string {
  return stableEvidenceHash({
    kind: "semiotic.rendered-svg-scene",
    version: 2,
    svg,
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
