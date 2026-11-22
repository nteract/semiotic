import type { PipelineStore } from "./PipelineStore"
import { findNearestNode } from "./CanvasHitTester"
import { getPointerHitRadius } from "./hoverUtils"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { rehitCanvasMarkCursor, sceneMarkCursor } from "./sceneCursor"

/** Map viewport coordinates to the plot, excluding the frame margins. */
export function xyPlotPosition(
  canvas: HTMLCanvasElement, pointer: { clientX: number; clientY: number },
  margin: CursorFrameGeometry["margin"], width: number, height: number
) {
  const rect = canvas.getBoundingClientRect()
  const x = pointer.clientX - rect.left - margin.left
  const y = pointer.clientY - rect.top - margin.top
  return x < 0 || x > width || y < 0 || y > height ? null : { x, y }
}

export function hitXYFramePoint(store: PipelineStore, point: { x: number; y: number }, radius: number, geometryMoved = false) {
  return findNearestNode(store.scene, point.x, point.y, radius,
    geometryMoved ? null : store.quadtree,
    // A linear pass can skip construction of the point index and its radius.
    geometryMoved ? 0 : store.maxPointRadius)
}

export function rehitXYFrameCursor(options: CursorFrameGeometry & {
  store: PipelineStore
  hoverRadius: number
}): void {
  const { canvas, pointer, store, margin, width, height } = options
  rehitCanvasMarkCursor(canvas, pointer, current => {
    const point = xyPlotPosition(canvas, current, margin, width, height)
    if (!point) return undefined
    const radius = getPointerHitRadius(options.hoverRadius, current.pointerType)
    const hit = hitXYFramePoint(store, point, radius, options.geometryMoved)
    return sceneMarkCursor(hit?.node)
  })
}
