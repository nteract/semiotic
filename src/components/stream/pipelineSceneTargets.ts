import type { OrdinalSceneNode } from "./ordinalTypes"
import type { SceneNode } from "./types"

/** Finish authored geometry on completion or cancellation. Both frame families
 * store the same targets; entering ordinal points can have only a radius target. */
export function snapSceneTargets(scene: (SceneNode | OrdinalSceneNode)[]): void {
  for (const node of scene) {
    if (node._targetOpacity !== undefined) {
      // Normalize signed zero while restoring the authored multiplier.
      node.style = { ...node.style, opacity: node._targetOpacity + 0 }
      node._targetOpacity = undefined
    }
    if (node.type === "point" || node.type === "glyph") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        node.y = node._targetY!
        node._targetX = undefined
        node._targetY = undefined
      }
      if (node._targetR !== undefined) {
        if (node.type === "point") node.r = node._targetR
        else node.size = node._targetR
        node._targetR = undefined
      }
    } else if (node.type === "rect" || node.type === "heatcell") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        node.y = node._targetY!
        node.w = node._targetW!
        node.h = node._targetH!
        node._targetX = undefined
        node._targetY = undefined
        node._targetW = undefined
        node._targetH = undefined
      }
    } else if (node.type === "candlestick") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        if (node._targetOpenY !== undefined) node.openY = node._targetOpenY
        if (node._targetCloseY !== undefined) node.closeY = node._targetCloseY
        if (node._targetHighY !== undefined) node.highY = node._targetHighY
        if (node._targetLowY !== undefined) node.lowY = node._targetLowY
        node._targetX = undefined
        node._targetOpenY = undefined
        node._targetCloseY = undefined
        node._targetHighY = undefined
        node._targetLowY = undefined
      }
    } else if (node.type === "line" || node.type === "area") {
      node._introClipFraction = undefined
      if (node.type === "line") {
        snapPath(node.path, node._targetPath)
        node._prevPath = undefined
        node._targetPath = undefined
      } else {
        snapPath(node.topPath, node._targetTopPath)
        snapPath(node.bottomPath, node._targetBottomPath)
        node._prevTopPath = undefined
        node._prevBottomPath = undefined
        node._targetTopPath = undefined
        node._targetBottomPath = undefined
      }
    } else if (node.type === "wedge" && node._targetStartAngle !== undefined) {
      node.startAngle = node._targetStartAngle
      node.endAngle = node._targetEndAngle!
      node._targetStartAngle = undefined
      node._targetEndAngle = undefined
    }
  }
}

// Keep each retained path array in place while restoring its target vertices.
function snapPath(path: [number, number][], target: [number, number][] | undefined): void {
  if (target) for (let i = 0; i < path.length; i++) path[i] = target[i]
}
