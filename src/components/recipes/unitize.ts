/**
 * `unitize` — the pictogram/tally allocator: turn a magnitude into repeated
 * unit signs with a fractional final sign (the ISOTYPE rule: symbols repeat,
 * they do not grow).
 *
 * This is the counting sibling of {@link allocateCells} (`waffle.ts`):
 * `allocateCells` divides a *fixed* number of grid cells proportionally among
 * categories (largest-remainder, integer cells); `unitize` converts one value
 * into *as many* signs as it needs at a fixed value-per-sign, preserving the
 * remainder as a partial sign. Use `allocateCells` for part-to-whole waffles,
 * `unitize` for unit charts, pictogram rows, arrow bundles, and sign stacks.
 */

/** One drawn unit sign. */
export interface UnitSign {
  /** 0-based position in the tally (also the grid/wrap index). */
  index: number
  /** How much of this sign is filled, 0–1. All signs but the last are 1. */
  fraction: number
  /** Value where this sign begins (`index * unit`). */
  start: number
  /** Value this sign reaches (`min(value, (index + 1) * unit)`). */
  end: number
  /** Value carried by this sign (`end - start`, i.e. `fraction * unit`). */
  value: number
}

/** A unit sign inside the projected/scenario extension of a range tally. */
export interface RangeUnitSign extends UnitSign {
  /**
   * Where the range fill begins within this sign, 0–1. Non-zero only on the
   * boundary sign when the base value ends mid-sign — draw the range fill
   * clipped from `startFraction` to `fraction` so base and range tile one
   * sign without double-painting.
   */
  startFraction: number
}

export interface UnitizeOptions {
  /** Value represented by one complete sign. Must be > 0. */
  unit: number
  /**
   * Cap on the number of signs. When the tally is truncated the result's
   * `overflow` flag is set (render a `+`, a count label, or scale the unit).
   * @default Infinity
   */
  maxUnits?: number
  /**
   * Drop a trailing partial sign whose fraction falls below this threshold —
   * 176 at unit 25 is seven arrows, not seven arrows and a 4% stub. The
   * dropped remainder is still visible as `total - shown`.
   * @default 0
   */
  minFraction?: number
}

export interface UnitizeResult {
  /** The signs to draw, in order; every sign but the last has fraction 1. */
  units: UnitSign[]
  /** The value-per-sign the tally was built with. */
  unit: number
  /** The sanitized input value (non-finite and negative clamp to 0). */
  total: number
  /** Value actually represented by the drawn signs (≤ `total` when capped or a sliver was dropped). */
  shown: number
  /** True when `maxUnits` truncated the tally. */
  overflow: boolean
}

export interface UnitizeRangeResult extends UnitizeResult {
  /**
   * Signs extending the tally from `value` to `rangeValue` — the projected /
   * scenario portion, conventionally drawn hatched or outlined. Indices
   * continue the base tally; the first entry carries a non-zero
   * `startFraction` when the base value ends mid-sign.
   */
  rangeUnits: RangeUnitSign[]
  /** The sanitized range endpoint (≥ `total`). */
  rangeTotal: number
}

// Absorbs float noise so exact multiples don't grow a phantom sliver sign
// (0.7 / 0.1 → 6.999…; 7.000000001 / 1 must still be seven signs).
const EPSILON = 1e-6

function sanitize(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

/**
 * Allocate a value into repeated unit signs with a fractional final sign.
 *
 * Feeds any repeated-mark rendering: a row of pictograms, a stack of signs on
 * a map, an arrow bundle, wrapped unit grids (derive row/column from
 * `index`). Pair each sign with a `glyph` scene node (its `fraction` maps
 * directly onto the glyph's partial fill) or clip your own SVG.
 *
 * @example
 * ```ts
 * const tally = unitize(176, { unit: 25 })
 * // 8 signs: seven at fraction 1, the last at 0.04 — or drop the stub:
 * const arrows = unitize(176, { unit: 25, minFraction: 0.08 })
 * // arrows.units.length === 7, arrows.shown === 175, arrows.total === 176
 * ```
 */
export function unitize(value: number, options: UnitizeOptions): UnitizeResult {
  const unit = Number(options.unit)
  const total = sanitize(value)
  const maxUnits = options.maxUnits ?? Infinity
  const minFraction = options.minFraction ?? 0
  if (!(unit > 0) || !(maxUnits > 0) || total <= 0) {
    return { units: [], unit: unit > 0 ? unit : 0, total, shown: 0, overflow: total > 0 && !(maxUnits > 0) }
  }

  const exactCount = total / unit
  const neededCount = Math.ceil(exactCount - EPSILON)
  const count = Math.min(maxUnits, neededCount)
  const overflow = neededCount > maxUnits

  const units: UnitSign[] = []
  for (let index = 0; index < count; index += 1) {
    const start = index * unit
    const end = Math.min(total, start + unit)
    let fraction = Math.min(1, Math.max(0, (end - start) / unit))
    if (1 - fraction < EPSILON) fraction = 1
    units.push({ index, fraction, start, end: start + fraction * unit, value: fraction * unit })
  }

  const last = units[units.length - 1]
  if (last && last.fraction < minFraction && last.fraction < 1) {
    units.pop()
  }

  const shown = units.reduce((sum, sign) => sum + sign.value, 0)
  return { units, unit, total, shown, overflow }
}

/**
 * Allocate a value plus a projected/scenario extension: solid signs to
 * `value`, continuation signs from `value` to `rangeValue` (draw them hatched
 * or outlined — countable, but visibly not yet real).
 *
 * When `value` ends mid-sign, the first range sign shares that sign: its
 * `startFraction` is where the solid fill stopped, so the two fills tile one
 * sign exactly.
 *
 * @example
 * ```ts
 * const { units, rangeUnits } = unitizeRange(325, 580, { unit: 25 })
 * // 13 solid signs, then 11 hatched signs (the last at fraction 0.2)
 * ```
 */
export function unitizeRange(
  value: number,
  rangeValue: number,
  options: UnitizeOptions,
): UnitizeRangeResult {
  const base = unitize(value, options)
  const rangeTotal = Math.max(sanitize(rangeValue), base.total)
  if (rangeTotal <= base.total) {
    return { ...base, rangeUnits: [], rangeTotal: base.total }
  }

  // The range tally never drops its own sliver — a scenario endpoint is the
  // whole point of drawing it — but it honors the cap.
  const full = unitize(rangeTotal, { unit: options.unit, maxUnits: options.maxUnits })

  // Where the base value lands, derived from `total` (not the kept units) so
  // a `minFraction`-dropped sliver zone is never repainted as projection.
  const startCount = full.unit > 0 ? base.total / full.unit : 0
  const boundaryIndex = Math.floor(startCount + EPSILON)
  let boundaryFraction = Math.min(1, Math.max(0, startCount - boundaryIndex))
  if (boundaryFraction < EPSILON) boundaryFraction = 0

  const rangeUnits: RangeUnitSign[] = []
  for (const sign of full.units) {
    if (sign.index < boundaryIndex) continue
    if (sign.index === boundaryIndex && boundaryFraction > 0) {
      if (sign.fraction - boundaryFraction > EPSILON) {
        rangeUnits.push({
          ...sign,
          startFraction: boundaryFraction,
          start: sign.index * full.unit + boundaryFraction * full.unit,
          value: (sign.fraction - boundaryFraction) * full.unit,
        })
      }
      continue
    }
    rangeUnits.push({ ...sign, startFraction: 0 })
  }

  return {
    ...base,
    overflow: base.overflow || full.overflow,
    rangeUnits,
    rangeTotal,
  }
}
