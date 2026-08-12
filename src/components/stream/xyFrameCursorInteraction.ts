import type { PipelineStore } from "./PipelineStore"
import { findNearestNode } from "./CanvasHitTester"
import { getPointerHitRadius } from "./hoverUtils"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { rehitCanvasMarkCursor, sceneMarkCursor } from "./sceneCursor"

export function rehitXYFrameCursor(options: CursorFrameGeometry & {
  store: PipelineStore
  hoverRadius: number
}): void {
  const { canvas, pointer, store, margin, width, height } = options
  rehitCanvasMarkCursor(canvas, pointer, current => {
    const rect = canvas.getBoundingClientRect()
    const x = current.clientX - rect.left - margin.left
    const y = current.clientY - rect.top - margin.top
    if (x < 0 || x > width || y < 0 || y > height) return undefined
    const hit = findNearestNode(
      store.scene,
      x,
      y,
      getPointerHitRadius(options.hoverRadius, current.pointerType),
      options.geometryMoved ? null : store.quadtree,
      store.maxPointRadius
    )
    return sceneMarkCursor(hit?.node)
  })
}
