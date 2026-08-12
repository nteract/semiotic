import * as React from "react"
import type { Style } from "./types"

export type CursorStyledSceneMark = {
  type?: string
  interactive?: boolean
  style?: Pick<Style, "cursor">
}

export interface CanvasMarkPointerState {
  inside: boolean
  clientX: number
  clientY: number
  pointerType?: string
}

/** Read the explicitly authored cursor for a scene mark. */
export function sceneMarkCursor(
  mark: CursorStyledSceneMark | null | undefined
): Style["cursor"] | undefined {
  if (mark?.interactive === false) return undefined
  return mark?.style?.cursor
}

/** Whether a retained scene contains any mark that needs cursor hit-testing. */
export function sceneHasAuthoredCursor(
  marks: ReadonlyArray<CursorStyledSceneMark> | null | undefined
): boolean {
  if (!marks) return false
  for (const mark of marks) {
    if (sceneMarkCursor(mark)) return true
  }
  return false
}

/**
 * Apply a hit-tested mark cursor to the actual retained-mark canvas.
 * Nullish cursors and misses restore normal CSS cascade/inheritance.
 */
export function setCanvasMarkCursor(
  canvas: HTMLCanvasElement | null | undefined,
  cursor?: Style["cursor"]
): void {
  if (!canvas) return
  const next = cursor ?? ""
  if (canvas.style.cursor !== next) canvas.style.cursor = next
}

/** Refresh cached cursor presence and clear any cursor from the prior scene. */
export function syncCanvasMarkCursor(
  canvas: HTMLCanvasElement | null | undefined,
  marks: ReadonlyArray<CursorStyledSceneMark> | null | undefined
): boolean {
  setCanvasMarkCursor(canvas)
  return sceneHasAuthoredCursor(marks)
}

/** Re-hit a moving scene under the last pointer without replaying hover state. */
export function rehitCanvasMarkCursor(
  canvas: HTMLCanvasElement | null | undefined,
  pointer: CanvasMarkPointerState,
  resolveCursor: (
    pointer: CanvasMarkPointerState
  ) => Style["cursor"] | undefined
): void {
  if (!canvas) return
  if (!pointer.inside || pointer.pointerType === "touch") {
    setCanvasMarkCursor(canvas)
    return
  }
  setCanvasMarkCursor(canvas, resolveCursor(pointer))
}

/** Clear an imperative canvas cursor when its owning frame unmounts. */
export function useCanvasMarkCursorCleanup(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): void {
  const lastCanvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // A responsive/hydrating frame can mount its canvas after this hook's first
  // effect. Remember the latest concrete element instead of capturing the
  // initially-null ref in the unmount closure.
  React.useEffect(() => {
    if (canvasRef.current) lastCanvasRef.current = canvasRef.current
  })

  React.useEffect(() => {
    return () => setCanvasMarkCursor(lastCanvasRef.current)
  }, [])
}

/**
 * Preserve a scene cursor in SVG/SSR output. Cursor is inherited, so wrapping
 * complex/fragment marks covers every child while an explicit style on a
 * custom backend's own DOM element still wins naturally.
 *
 * Native SVG hit geometry deliberately follows the painted mark. Canvas uses
 * a larger pointer-tolerance halo because one bitmap surface has no per-mark
 * DOM hit targets; that small backend-specific affordance is not reproduced
 * with extra SVG nodes. Built-in XY area fills are the categorical exception:
 * their established interaction channel is the top path, so SceneToSVG
 * bypasses this wrapper and supplies a dedicated top-path cursor target.
 */
export function withSceneMarkCursor(
  element: React.ReactNode,
  mark: CursorStyledSceneMark,
  key: React.Key
): React.ReactNode {
  const cursor = sceneMarkCursor(mark)
  if (!cursor || element == null || element === false) return element
  return (
    <g key={key} style={{ cursor }} data-semiotic-mark-cursor={cursor}>
      {element}
    </g>
  )
}
