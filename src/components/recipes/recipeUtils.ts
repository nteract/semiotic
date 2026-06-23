import { interpolateLab } from "d3-interpolate"
import type { Datum } from "../charts/shared/datumTypes"

/**
 * Normalize a string-or-function accessor into a function. Recipes
 * consistently accept either form, so this collapses the type-check at
 * the boundary and lets the layout body call a single function.
 */
export function resolveAccessor<T = unknown>(a: string | ((d: Datum) => T)): (d: Datum) => T {
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}

/**
 * Read a field off a network-ingest wrapper (`node.data.<key>`) or the node
 * itself, with a fallback. Network recipes receive `RealtimeNode`/`RealtimeEdge`
 * wrappers whose user data lives under `.data`; several recipes (lineageDag,
 * mermaidDag, packedClusterMatrix, …) each re-declared this identical reader, so
 * it lives here once. Returns `unknown` — narrow at the call site.
 */
export function readField(d: unknown, key: string, fallback: unknown): unknown {
  const wrapped = (d as { data?: Record<string, unknown> })?.data
  const fromData = wrapped ? wrapped[key] : undefined
  if (fromData != null) return fromData
  const own = (d as Record<string, unknown> | null | undefined)?.[key]
  return own == null ? fallback : own
}

/**
 * Group items into a `Map` keyed by a derived string. Insertion order is
 * preserved both for keys and within each bucket — recipes rely on stable
 * ordering for deterministic layout. Several recipes re-declared this; it lives
 * here once.
 */
export function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const arr = out.get(k)
    if (arr) arr.push(item)
    else out.set(k, [item])
  }
  return out
}

/**
 * Build a datum object whose own-properties are safe to set from
 * user-supplied accessor names. `Object.create(null)` produces a
 * prototype-less object so adversarial keys like `__proto__`,
 * `constructor`, or `prototype` become normal own-properties instead of
 * invoking the prototype setter on a normal object literal (which
 * silently drops the assignment).
 *
 * The builder takes a callback that receives a `set(key, value)` writer
 * bound to the null-prototype object. This API forces every assignment
 * through the safe target — passing a plain `Record<string, unknown>`
 * instead would be unsafe, since constructing that intermediate via an
 * object literal lets `__proto__` hit the setter before we ever reach
 * the helper.
 *
 * Recipes funnel every datum-emit through this helper so the
 * prototype-pollution invariant is enforced in one place rather than
 * scattered across each recipe's inner loops.
 */
export function createSafeDatum(populate: (set: (key: string, value: unknown) => void) => void): Datum {
  const out = Object.create(null) as Datum
  populate((key, value) => { out[key] = value })
  return out
}

/**
 * A `{field, value}` highlight target — or an array of them, AND-combined (a
 * datum must match every entry to count as a match, e.g. a region×orbit cell).
 * `value` is coerced to a string before comparison; a nullish `value` matches
 * anything (so `{ field, value: null }` is a no-op constraint).
 */
export type HighlightMatch =
  | { field: string; value: unknown }
  | ReadonlyArray<{ field: string; value: unknown }>

/**
 * Whether `datum` satisfies a `{field, value}` highlight (or every entry of an
 * array). A nullish/empty `highlight` matches everything — the "no highlight
 * active" case. Several recipes hand-rolled this exact field/value loop.
 */
export function matchesHighlight(datum: Datum, highlight: HighlightMatch | null | undefined): boolean {
  if (!highlight) return true
  const list = Array.isArray(highlight) ? highlight : [highlight]
  const rec = datum as Record<string, unknown>
  for (const h of list) {
    if (h.value != null && String(rec[h.field]) !== String(h.value)) return false
  }
  return true
}

export interface DimOptions {
  /** A datum is lit only if this predicate passes (e.g. a shared-selection
   *  predicate, or `parallelCoordinates`'s `highlightFn`). Omit ⇒ no constraint. */
  predicate?: ((d: Datum) => boolean) | null
  /** A datum is lit only if it matches this `{field, value}` (or all, for an
   *  array). Omit ⇒ no constraint. Composes with `predicate` (both must pass). */
  highlight?: HighlightMatch | null
  /** Opacity used when no cue is active (nothing is dimmed). @default 1 */
  baseOpacity?: number
  /** Opacity for marks that don't match an active cue. @default 0.16 */
  dimOpacity?: number
  /** Additive opacity boost for matching marks when a cue is active, capped at 1
   *  (e.g. `parallelCoordinates` lifts its 0.45 line opacity by 0.4 on match). @default 0 */
  brighten?: number
}

/**
 * The highlight/dim opacity rule, shared across custom-layout recipes. A mark is
 * "lit" when it satisfies **every** active cue (`highlight` AND `predicate`); if
 * no cue is active nothing is dimmed and every mark gets `baseOpacity`. Lit marks
 * get `min(1, baseOpacity + brighten)`, dimmed marks get `dimOpacity`.
 *
 * This is the one rule `packedClusterMatrix` and `parallelCoordinates` each
 * hand-rolled; centralizing it keeps the "matching marks stay lit, the rest dim"
 * behavior identical. (Recipes whose dimming composes several cues with priority
 * and rescue rules — e.g. `lineageDag`'s reach-set-over-selection — keep their
 * bespoke logic; this helper is for the common AND-of-cues case.)
 */
export function dimFor(datum: Datum, opts: DimOptions = {}): number {
  const baseOpacity = opts.baseOpacity ?? 1
  const cueActive = !!(opts.highlight || opts.predicate)
  if (!cueActive) return baseOpacity
  const lit = matchesHighlight(datum, opts.highlight) && (!opts.predicate || opts.predicate(datum))
  return lit ? Math.min(1, baseOpacity + (opts.brighten ?? 0)) : opts.dimOpacity ?? 0.16
}

/**
 * Join layout-affecting inputs into a stable content-signature string. Pass the
 * primitives that change the geometry (dimensions, gaps, orders, a per-datum
 * fingerprint) — NOT styling/interaction inputs (color, shade, highlight) — so a
 * re-style or a returning resize reuses a cached layout instead of recomputing it.
 * Pairs with {@link LayoutCache}.
 */
export function signatureKey(parts: ReadonlyArray<string | number | boolean | null | undefined>): string {
  return parts.join("|")
}

/**
 * A tiny bounded geometry cache for expensive layouts (force packing, tree/DAG
 * positioning). Key it with a {@link signatureKey} of the layout-affecting inputs
 * so re-styling on interaction never re-runs the layout.
 *
 * **The sharp edge:** on `NetworkCustomChart`/`*CustomChart`, `ctx.nodes` is a
 * *fresh array each `buildScene`* and a `layoutConfig` change re-runs the layout
 * without re-ingesting topology — so cache by *content* (a fingerprint of the
 * data), never by array identity. Over `maxSize` distinct keys it clears wholesale
 * (these layouts churn a handful of signatures, not thousands).
 */
export class LayoutCache<V> {
  private store = new Map<string, V>()
  constructor(private readonly maxSize = 12) {}

  get(key: string): V | undefined {
    return this.store.get(key)
  }

  set(key: string, value: V): void {
    if (this.store.size >= this.maxSize) this.store.clear()
    this.store.set(key, value)
  }

  /** Return the cached value for `key`, or compute + store it on a miss. */
  getOrCompute(key: string, compute: () => V): V {
    const hit = this.store.get(key)
    if (hit !== undefined) return hit
    const value = compute()
    this.set(key, value)
    return value
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}

/**
 * A reusable lightness shader for one base color. Interpolating in CIELAB keeps
 * the hue and chroma roughly fixed while only lightness moves, so a categorical
 * hue can carry a second *continuous* channel as shade (e.g. age, recency).
 *
 * The returned function takes `t ∈ [0,1]`: `0` lightens toward white, `1`
 * darkens toward black, `0.5` returns the base. `strength` (0..1) caps how far
 * each direction travels. Pure / SSR-safe — no DOM. Build once per base color
 * (it captures two interpolators) and call per datum.
 */
export function makeShade(baseColor: string, strength = 0.72): (t: number) => string {
  const toWhite = interpolateLab(baseColor, "#ffffff")
  const toBlack = interpolateLab(baseColor, "#000000")
  const base = interpolateLab(baseColor, baseColor)(0)
  return (t: number) => {
    const c = t < 0 ? 0 : t > 1 ? 1 : t
    if (c === 0.5) return base
    return c < 0.5 ? toWhite((0.5 - c) * 2 * strength) : toBlack((c - 0.5) * 2 * strength)
  }
}

/** One-shot form of {@link makeShade}: perceptual lightness shade of `baseColor`. */
export function shade(baseColor: string, t: number, strength = 0.72): string {
  return makeShade(baseColor, strength)(t)
}
