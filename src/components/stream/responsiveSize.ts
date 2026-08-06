/** Constraints shared by responsive chart containers and the React measuring hook. */
export interface ResponsiveSizeOptions {
  /** Minimum measured width. Useful when narrow containers should scroll. */
  minWidth?: number
  /** Maximum measured width. Useful for art-directed chart proportions. */
  maxWidth?: number
  /** Quantize width to this step to avoid rebuilding expensive layouts per pixel. */
  widthStep?: number
  /** Minimum measured height. */
  minHeight?: number
  /** Maximum measured height. */
  maxHeight?: number
  /** Quantize height to this step. */
  heightStep?: number
}

/** Clamp and optionally quantize one measured responsive dimension. */
export function resolveResponsiveDimension(
  value: number,
  min = 0,
  max = Infinity,
  step = 0,
): number {
  const lower = Number.isFinite(min) ? min : 0
  const upper = Number.isFinite(max) ? Math.max(lower, max) : Infinity
  const finiteValue = Number.isFinite(value) ? Math.floor(value) : lower
  const clamped = Math.max(lower, Math.min(upper, finiteValue))
  if (!(step > 0) || !Number.isFinite(step)) return clamped
  return Math.max(lower, Math.min(upper, Math.round(clamped / step) * step))
}
