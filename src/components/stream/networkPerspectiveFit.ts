/**
 * Fit and accessor helpers for the perspective engine: solve the `contain`
 * fit for a sampled scene and read elevation/extrusion accessors.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkViewportRect } from "./networkViewportTypes"
import {
  buildNetworkPerspectiveFrame,
  FLAT_NETWORK_PERSPECTIVE_FRAME,
  resolveNetworkPerspective,
  type NetworkPerspective,
  type NetworkPerspectiveBound,
  type NetworkPerspectiveAccessor,
  type NetworkPerspectiveFrame,
  type ResolvedNetworkPerspective
} from "./networkPerspective"

/**
 * Collects projected sample points plus fixed (unscaled) screen extents so a
 * `contain` fit can solve for the largest scale that keeps every mark inside
 * the plot.
 */
export class PerspectiveFitSamples {
  sx: number[] = []
  sy: number[] = []
  left: number[] = []
  right: number[] = []
  top: number[] = []
  bottom: number[] = []

  constructor(private resolved: ResolvedNetworkPerspective) {}

  add(x: number, y: number, z = 0, left = 0, right = left, top = left, bottom = top): void {
    const [a, b, c, d] = this.resolved.linear
    const sx = a * x + c * y
    const sy = b * x + d * y - this.resolved.verticalScale * z
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    this.sx.push(sx)
    this.sy.push(sy)
    this.left.push(left)
    this.right.push(right)
    this.top.push(top)
    this.bottom.push(bottom)
  }

  get size(): number {
    return this.sx.length
  }
}

function span(values: number[], lo: number[], hi: number[], k: number): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i++) {
    const v = k * values[i]
    if (v - lo[i] < min) min = v - lo[i]
    if (v + hi[i] > max) max = v + hi[i]
  }
  return [min, max]
}

/** Solve the fitted frame for a set of samples inside a `width × height` plot. */
export function fitNetworkPerspectiveFrame(
  resolved: ResolvedNetworkPerspective,
  size: readonly [number, number],
  samples: PerspectiveFitSamples
): NetworkPerspectiveFrame {
  const [width, height] = size
  const [a, b, c, d] = resolved.linear
  const lift = resolved.verticalScale
  if (resolved.fit === "none" || samples.size === 0) {
    const ox = resolved.origin[0] * width
    const oy = resolved.origin[1] * height
    const frame = buildNetworkPerspectiveFrame(
      resolved.type,
      [a, b, c, d, ox - a * ox - c * oy, oy - b * ox - d * oy],
      lift
    )
    return samples.size === 0
      ? frame
      : buildNetworkPerspectiveFrame(resolved.type, frame.matrix, lift, 1, frameBounds(frame, samples, 1))
  }
  const pad = resolved.fitPadding
  const availW = Math.max(1, width - pad * 2)
  const availH = Math.max(1, height - pad * 2)
  const fits = (k: number) => {
    const [x0, x1] = span(samples.sx, samples.left, samples.right, k)
    const [y0, y1] = span(samples.sy, samples.top, samples.bottom, k)
    return x1 - x0 <= availW && y1 - y0 <= availH
  }
  // `contain` never enlarges: k ∈ (0, 1]. Convexity of the span in k makes
  // the feasible set an interval starting at 0, so bisection is exact.
  let k = 1
  if (!fits(1)) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
    k = Math.max(lo, 1e-3)
  }
  const [x0, x1] = span(samples.sx, samples.left, samples.right, k)
  const [y0, y1] = span(samples.sy, samples.top, samples.bottom, k)
  const e = width / 2 - (x0 + x1) / 2
  const f = height / 2 - (y0 + y1) / 2
  return buildNetworkPerspectiveFrame(
    resolved.type,
    [a * k, b * k, c * k, d * k, e, f],
    lift * k,
    k,
    { x: x0 + e, y: y0 + f, width: x1 - x0, height: y1 - y0 }
  )
}

function frameBounds(
  frame: NetworkPerspectiveFrame,
  samples: PerspectiveFitSamples,
  k: number
): NetworkViewportRect {
  const [x0, x1] = span(samples.sx, samples.left, samples.right, k)
  const [y0, y1] = span(samples.sy, samples.top, samples.bottom, k)
  const e = frame.matrix[4]
  const f = frame.matrix[5]
  return { x: x0 + e, y: y0 + f, width: x1 - x0, height: y1 - y0 }
}

/**
 * Project arbitrary points with a perspective, outside any chart — useful for
 * tests, overlays computed on the server, and custom renderers. Fits the
 * points into `size` the same way the frame does.
 */
export function createNetworkPerspectiveFrame(
  perspective: NetworkPerspective | null | undefined,
  size: readonly [number, number],
  points: ReadonlyArray<readonly [number, number] | readonly [number, number, number]> = []
): NetworkPerspectiveFrame {
  const resolved = resolveNetworkPerspective(perspective)
  if (!resolved) return FLAT_NETWORK_PERSPECTIVE_FRAME
  const samples = new PerspectiveFitSamples(resolved)
  for (const p of points) samples.add(p[0], p[1], p[2] ?? 0)
  return fitNetworkPerspectiveFrame(resolved, size, samples)
}

/**
 * Screen size needed to project a ground rectangle at scale 1, including piece
 * thickness, fitPadding and optional decoration bounds. Use the returned size
 * for the canvas while keeping the layout's ground dimensions unchanged.
 * Declare token radii/custom chrome as fixed `extent` bounds; this helper does
 * not infer mark geometry, elevation accessors, labels, or regions from data.
 */
export function getNetworkPerspectiveSize(
  perspective: NetworkPerspective | null | undefined,
  groundSize: readonly [number, number],
  bounds: readonly NetworkPerspectiveBound[] = []
): [number, number] {
  const [width, height] = groundSize
  if (![width, height].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new RangeError("Ground dimensions must be finite, non-negative numbers")
  }
  const resolved = resolveNetworkPerspective(perspective)
  if (!resolved) return [width, height]
  const samples = new PerspectiveFitSamples(resolved)
  const thickness = Math.max(0, Number.isFinite(resolved.config.thickness) ? resolved.config.thickness! : 6)
  for (const x of [0, width]) for (const y of [0, height]) {
    samples.add(x, y)
    samples.add(x, y, thickness)
  }
  for (const bound of bounds) {
    const z = bound.z === "top" || ("extent" in bound && bound.z == null) ? thickness : bound.z ?? 0
    if ("extent" in bound) samples.add(bound.x, bound.y, z, ...bound.extent)
    else for (const x of [bound.x, bound.x + bound.width]) for (const y of [bound.y, bound.y + bound.height]) samples.add(x, y, z)
  }
  const [x0, x1] = span(samples.sx, samples.left, samples.right, 1)
  const [y0, y1] = span(samples.sy, samples.top, samples.bottom, 1)
  return [Math.ceil(x1 - x0 + 2 * resolved.fitPadding), Math.ceil(y1 - y0 + 2 * resolved.fitPadding)]
}

/** The raw user datum behind a scene datum (`node.data ?? node`). */
export function rawPerspectiveDatum(datum: unknown): Record<string, unknown> | null {
  if (!datum || typeof datum !== "object") return null
  const data = (datum as { data?: unknown }).data
  return (data && typeof data === "object" ? data : datum) as Record<string, unknown>
}

/** Read an accessor as a number (NaN when missing). Constants return themselves. */
export function readPerspectiveAccessor(
  accessor: NetworkPerspectiveAccessor | undefined,
  datum: unknown
): number {
  if (accessor == null) return NaN
  if (typeof accessor === "number") return accessor
  const raw = rawPerspectiveDatum(datum)
  if (!raw) return NaN
  let value: unknown
  if (typeof accessor === "function") value = accessor(raw as Datum)
  else {
    value = raw[accessor]
    if (value == null && datum && typeof datum === "object") {
      value = (datum as Record<string, unknown>)[accessor]
    }
  }
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : NaN
}
