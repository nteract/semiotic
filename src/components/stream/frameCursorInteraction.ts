import {
  setCanvasMarkCursor,
  type CanvasMarkPointerState
} from "./sceneCursor"

type PointerRef = { current: CanvasMarkPointerState }
type CanvasPointerEvent = {
  clientX: number
  clientY: number
  pointerType?: string
}

export function captureFramePointer(
  pointerRef: PointerRef,
  event: CanvasPointerEvent,
  fallbackType?: string
): void {
  const pointer = pointerRef.current
  pointer.inside = true
  pointer.clientX = event.clientX
  pointer.clientY = event.clientY
  pointer.pointerType = event.pointerType ?? fallbackType
}

/** Capture a pointer without allocation, then preserve the no-work and
 * cursor-only touch fast paths shared by the canvas frames. */
export function shouldHandleFramePointer(
  pointerRef: PointerRef,
  event: CanvasPointerEvent,
  hoverEnabled: boolean,
  hasAuthoredCursor: boolean,
  canvas?: HTMLCanvasElement | null,
  fallbackType?: string
): boolean {
  captureFramePointer(pointerRef, event, fallbackType)
  if (!hoverEnabled && !hasAuthoredCursor) return false
  if (!hoverEnabled && pointerRef.current.pointerType === "touch") {
    setCanvasMarkCursor(canvas)
    return false
  }
  return true
}

export interface CursorFrameGeometry {
  canvas: HTMLCanvasElement
  pointer: CanvasMarkPointerState
  margin: { left: number; top: number }
  width: number
  height: number
  geometryMoved: boolean
}
