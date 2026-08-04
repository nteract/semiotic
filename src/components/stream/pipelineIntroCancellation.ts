import type { OrdinalSceneNode } from "./ordinalTypes"
import type { SceneNode } from "./types"

/** Restore XY marks to their authored target state after an intro is cancelled. */
export function snapXYIntroTargets(scene: SceneNode[]): void {
  for (const node of scene) {
    if (node._targetOpacity !== undefined) {
      const finalOpacity = node._targetOpacity
      node.style = { ...(node.style || {}), opacity: finalOpacity === 0 ? 0 : finalOpacity }
      node._targetOpacity = undefined
    }
    if (node.type === "point") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        node.y = node._targetY!
        if (node._targetR !== undefined) node.r = node._targetR
        node._targetX = undefined
        node._targetY = undefined
        node._targetR = undefined
      }
    } else if (node.type === "glyph") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        node.y = node._targetY!
        if (node._targetR !== undefined) node.size = node._targetR
        node._targetX = undefined
        node._targetY = undefined
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
      if (node.type === "line" && node._targetPath) {
        for (let j = 0; j < node.path.length; j++) node.path[j] = node._targetPath[j]
        node._prevPath = undefined
        node._targetPath = undefined
      }
      if (node.type === "area") {
        if (node._targetTopPath) {
          for (let j = 0; j < node.topPath.length; j++) node.topPath[j] = node._targetTopPath[j]
        }
        if (node._targetBottomPath) {
          for (let j = 0; j < node.bottomPath.length; j++) node.bottomPath[j] = node._targetBottomPath[j]
        }
        node._prevTopPath = undefined
        node._prevBottomPath = undefined
        node._targetTopPath = undefined
        node._targetBottomPath = undefined
      }
    }
  }
}

/** Restore ordinal marks to their authored target state after an intro is cancelled. */
export function snapOrdinalIntroTargets(scene: OrdinalSceneNode[]): void {
  for (const node of scene) {
    if (node._targetOpacity !== undefined) {
      const finalOpacity = node._targetOpacity
      node.style = { ...(node.style || {}), opacity: finalOpacity === 0 ? 0 : finalOpacity }
      node._targetOpacity = undefined
    }
    if (node.type === "point") {
      if (node._targetX !== undefined) {
        node.x = node._targetX
        node.y = node._targetY!
        if (node._targetR !== undefined) node.r = node._targetR
        node._targetX = undefined
        node._targetY = undefined
        node._targetR = undefined
      } else if (node._targetR !== undefined) {
        node.r = node._targetR
        node._targetR = undefined
      }
    } else if (node.type === "rect") {
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
    } else if (node.type === "wedge" && node._targetStartAngle !== undefined) {
      node.startAngle = node._targetStartAngle
      node.endAngle = node._targetEndAngle!
      node._targetStartAngle = undefined
      node._targetEndAngle = undefined
    }
  }
}
