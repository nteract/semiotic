export interface ControlPoint {
  x: number
  y: number
}

interface ClientPointerEvent {
  clientX: number
  clientY: number
  currentTarget: EventTarget | null
}

/**
 * Map a pointer event into an SVG element's user coordinate space, so a
 * control drawn at `(x, y)` in that space can compare the pointer with its
 * own geometry and invert the chart scale that placed it.
 *
 * `element` defaults to the event's `currentTarget`. For a control `<g>`
 * with no transform of its own, that is the space its handle is drawn in.
 * Returns null when the element has no screen transform (detached, or a
 * non-layout environment such as a server render).
 */
export function pointerToLocalPoint(
  event: ClientPointerEvent,
  element?: Element | null
): ControlPoint | null {
  const target = (element ?? event.currentTarget) as SVGGraphicsElement | null
  const matrix = target?.getScreenCTM?.()
  if (!matrix) return null
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (!Number.isFinite(determinant) || determinant === 0) return null
  // Invert the 2D affine screen transform [a c e; b d f].
  const dx = event.clientX - matrix.e
  const dy = event.clientY - matrix.f
  return {
    x: (matrix.d * dx - matrix.c * dy) / determinant,
    y: (matrix.a * dy - matrix.b * dx) / determinant
  }
}
