/**
 * Shared pulse overlay rendering utilities.
 *
 * Pulse is a brief visual flash (glow/overlay) applied to scene nodes when
 * their aggregated value changes. Each node carries `_pulseIntensity` (0–1),
 * `_pulseColor`, and optionally `_pulseGlowRadius`.
 *
 * Pulses are independent of mark opacity, but inherit the frame alpha.
 * Callers pass the original frame alpha and restore their own paint state.
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
  // An absent intensity compares false, just like zero or NaN.
  return node._pulseIntensity! > 0
}

/**
 * Flash a rectangle, traced path, or supplied projected outline. The caller
 * owns state restoration; rectangular overlays retain their lighter flash.
 */
export function renderFillPulse(
  ctx: CanvasRenderingContext2D,
  node: PulseFields | (PulseFields & { x: number; y: number; w: number; h: number }),
  baseAlpha: number,
  path?: Path2D | null
): void {
  if (!hasPulse(node)) return
  const rect = "w" in node
  ctx.globalAlpha = baseAlpha * node._pulseIntensity! * (rect ? 0.3 : 0.35)
  ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
  if (path) ctx.fill(path)
  else if (rect) ctx.fillRect(node.x, node.y, node.w, node.h)
  else ctx.fill()
}

/**
 * Render a circular glow ring pulse (used by point and network circle renderers).
 * Call this after drawing the main circle fill/stroke.
 */
export function renderCirclePulse(
  ctx: CanvasRenderingContext2D,
  node: PulseFields & { x?: number; y?: number; cx?: number; cy?: number; r: number },
  baseAlpha: number
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
  ctx.globalAlpha = baseAlpha * node._pulseIntensity! * 0.6
  ctx.stroke()
}
