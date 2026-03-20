/**
 * Shared pulse overlay rendering utilities.
 *
 * Pulse is a brief visual flash (glow/overlay) applied to scene nodes when
 * their aggregated value changes. Each node carries `_pulseIntensity` (0–1),
 * `_pulseColor`, and optionally `_pulseGlowRadius`.
 *
 * Three visual variants:
 * - **Rect overlay**: semi-transparent fillRect on top of the bar/cell
 * - **Circle glow ring**: expanding stroke ring around a point
 * - **Path fill overlay**: re-traces an arbitrary path and fills with glow
 */

interface PulseFields {
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
}

/**
 * Returns true if the node has an active pulse effect.
 */
export function hasPulse(node: PulseFields): boolean {
  return !!(node._pulseIntensity && node._pulseIntensity > 0)
}

/**
 * Render a rectangular pulse overlay (used by bar, heatmap, and network rect renderers).
 * Call this after drawing the main fill/stroke for the rectangle.
 */
export function renderRectPulse(
  ctx: CanvasRenderingContext2D,
  node: PulseFields & { x: number; y: number; w: number; h: number },
  alphaMultiplier = 0.3
): void {
  if (!hasPulse(node)) return
  ctx.globalAlpha = node._pulseIntensity! * alphaMultiplier
  ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
  ctx.fillRect(node.x, node.y, node.w, node.h)
}

/**
 * Render a circular glow ring pulse (used by point and network circle renderers).
 * Call this after drawing the main circle fill/stroke.
 */
export function renderCirclePulse(
  ctx: CanvasRenderingContext2D,
  node: PulseFields & { x?: number; y?: number; cx?: number; cy?: number; r: number },
  alphaMultiplier = 0.6
): void {
  if (!hasPulse(node)) return
  const glowRadius = node._pulseGlowRadius ?? 4
  const pulseR = node.r + glowRadius * node._pulseIntensity!
  const centerX = node.cx ?? node.x ?? 0
  const centerY = node.cy ?? node.y ?? 0
  ctx.beginPath()
  ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2)
  ctx.strokeStyle = node._pulseColor || "rgba(255,255,255,0.6)"
  ctx.lineWidth = 2 * node._pulseIntensity!
  ctx.globalAlpha = node._pulseIntensity! * alphaMultiplier
  ctx.stroke()
}

/**
 * Render a path-based fill pulse (used by area, wedge, and geo renderers).
 * The caller must trace the path onto ctx BEFORE calling this function,
 * or pass a Path2D object as the third argument (for geo renderers).
 * This function sets alpha/fillStyle and calls ctx.fill().
 */
export function renderPathPulse(
  ctx: CanvasRenderingContext2D,
  node: PulseFields,
  path?: Path2D,
  alphaMultiplier = 0.35
): void {
  if (!hasPulse(node)) return
  ctx.globalAlpha = node._pulseIntensity! * alphaMultiplier
  ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
  if (path) {
    ctx.fill(path)
  } else {
    ctx.fill()
  }
}
