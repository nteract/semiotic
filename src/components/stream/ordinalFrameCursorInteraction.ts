import type { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { resolveOrdinalPointerHit } from "./ordinalFrameInteraction"
import { rehitCanvasMarkCursor, sceneMarkCursor } from "./sceneCursor"

export function rehitOrdinalFrameCursor(options: CursorFrameGeometry & {
  store: OrdinalPipelineStore
  hoverRadius: number
  projection: "vertical" | "horizontal" | "radial"
}): void {
  rehitCanvasMarkCursor(options.canvas, options.pointer, current => {
    const result = resolveOrdinalPointerHit({
      pointer: current,
      canvasRect: options.canvas.getBoundingClientRect(),
      margin: options.margin,
      width: options.width,
      height: options.height,
      projection: options.projection,
      hoverRadius: options.hoverRadius,
      scene: options.store.scene,
      pointQuadtree: options.geometryMoved ? null : options.store.pointQuadtree,
      // Only an index query reads the radius; do not build one for a linear pass.
      maxPointRadius: options.geometryMoved ? 0 : options.store.maxPointRadius
    })
    return result.kind === "hit" ? sceneMarkCursor(result.hit.node) : undefined
  })
}
