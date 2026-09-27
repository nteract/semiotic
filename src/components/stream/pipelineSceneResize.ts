import type { SceneNode, StreamLayout, StreamScales } from "./types"

/** Remap settled, proportional geometry. The store excludes pixel-sized layouts. */
export function remapXYScene(
  scene: SceneNode[],
  scales: StreamScales,
  previous: StreamLayout,
  layout: StreamLayout
): StreamScales {
  const wRatio = layout.width / previous.width
  const hRatio = layout.height / previous.height
  for (const node of scene) {
    switch (node.type) {
      case "line":
        for (const p of node.path) {
          p[0] *= wRatio
          p[1] *= hRatio
        }
        break
      case "area":
        for (const p of node.topPath) {
          p[0] *= wRatio
          p[1] *= hRatio
        }
        for (const p of node.bottomPath) {
          p[0] *= wRatio
          p[1] *= hRatio
        }
        if (node.clipRect) {
          node.clipRect = {
            x: node.clipRect.x * wRatio,
            y: node.clipRect.y * hRatio,
            width: node.clipRect.width * wRatio,
            height: node.clipRect.height * hRatio
          }
        }
        if (node.strokeColorBands) {
          node.strokeColorBands = node.strokeColorBands.map((band) => ({
            ...band,
            y: band.y * hRatio,
            height: band.height * hRatio
          }))
        }
        break
      case "point":
      case "symbol":
      case "glyph":
        // Mark size is authored in pixels; only the position follows scales.
        node.x *= wRatio
        node.y *= hRatio
        break
      case "rect":
      case "heatcell":
        node.x *= wRatio
        node.y *= hRatio
        node.w *= wRatio
        node.h *= hRatio
        break
    }
  }

  // Copy the resolved scales rather than reconstructing them from config:
  // preserve temporal inference, log semantics, inverted Y and arrowOfTime.
  return {
    x: scales.x.copy().range(scales.x.range().map((x) => x * wRatio)),
    y: scales.y.copy().range(scales.y.range().map((y) => y * hRatio))
  }
}
