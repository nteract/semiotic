import type { GeoPipelineStore } from "./GeoPipelineStore"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { resolveGeoPointerHit, type HitCanvas } from "./geoFrameHelpers"
import { rehitCanvasMarkCursor, sceneMarkCursor } from "./sceneCursor"

export function rehitGeoFrameCursor(options: CursorFrameGeometry & {
  store: GeoPipelineStore
  hitCanvasRef: { current: HitCanvas | null }
}): void {
  rehitCanvasMarkCursor(options.canvas, options.pointer, current => {
    const result = resolveGeoPointerHit({
      pointer: current,
      canvasRect: options.canvas.getBoundingClientRect(),
      margin: options.margin,
      width: options.width,
      height: options.height,
      scene: options.store.scene,
      pointQuadtree: options.geometryMoved ? null : options.store.quadtree,
      maxPointRadius: options.store.maxPointRadius,
      hitCanvasRef: options.hitCanvasRef
    })
    return result.kind === "hit" ? sceneMarkCursor(result.node) : undefined
  })
}
