/**
 * Shared hit-testing utilities used by CanvasHitTester, OrdinalCanvasHitTester,
 * and NetworkCanvasHitTester.
 */

export interface RectHitResult {
  hit: boolean
  cx: number
  cy: number
}

/**
 * Test whether a point (px, py) falls within a rectangle defined by
 * { x, y, w, h } and return the rectangle's center coordinates.
 */
export function hitTestRect(
  px: number,
  py: number,
  node: { x: number; y: number; w: number; h: number }
): RectHitResult {
  if (px >= node.x && px <= node.x + node.w && py >= node.y && py <= node.y + node.h) {
    return { hit: true, cx: node.x + node.w / 2, cy: node.y + node.h / 2 }
  }
  return { hit: false, cx: 0, cy: 0 }
}

/**
 * Normalize an angle to the [0, 2π) range.
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2)
  if (a < 0) a += Math.PI * 2
  return a
}
