/**
 * Declarative, threshold-aware style rules for data marks.
 *
 * A `StyleRule[]` is an ordered list of `{ when, style }` pairs. Every rule
 * whose `when` condition matches a datum contributes its `style`; styles are
 * merged in list order so — for any single property — the **last applicable
 * rule wins**. This is the CSS-cascade mental model: send as many rules as
 * you like, and the last one that applies to a given property is the one you
 * see. A datum that matches no rule keeps the chart's resolved base style.
 *
 * `when` is intentionally permissive: it can be a predicate function (full
 * control), a declarative numeric/categorical threshold (no code), or simply
 * omitted / `true` (an unconditional base layer). Threshold conditions read a
 * numeric value from `field` (falling back to the chart-provided value, e.g.
 * a bar's `valueAccessor`), so `{ when: { gt: 10 }, style: {...} }` "styles
 * every bar taller than 10" with no accessor boilerplate.
 *
 * The engine is chart-agnostic — it operates on a raw datum plus a small
 * context (`value`, `category`, `index`). Bar-family HOCs feed it through
 * `useOrdinalPieceStyle`, but any renderer with a datum and a numeric value
 * can reuse it.
 */
import type { Datum } from "./datumTypes"
import type { HatchFill } from "./hatchFill"

/** The style a rule applies. `fill` may be a solid color or a {@link HatchFill}. */
export interface StyleRuleStyle {
  /** Solid color string, a CSS var, or a declarative hatch descriptor. */
  fill?: string | HatchFill
  fillOpacity?: number
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}

/**
 * A declarative numeric / categorical condition. All present operators must
 * hold (logical AND). The compared value is chosen in this order:
 *   1. `axis` — a resolved context channel (`"x"` / `"y"` / `"value"`), so a
 *      rule can target either axis of an XY chart regardless of the accessor
 *      field name (e.g. `{ axis: "y", gt: 10 }`).
 *   2. `field` — a raw datum property (`datum[field]`).
 *   3. otherwise the host-resolved context value (`ctx.value` — the bar value,
 *      the y value for XY, the node/feature/body value, etc.).
 */
export interface StyleRuleThreshold {
  /**
   * Compare against a resolved context channel rather than a raw field. Use to
   * target an XY chart's `"x"` or `"y"` axis without knowing the accessor's
   * field name. `"value"` is the same channel the field-less default uses.
   */
  axis?: "x" | "y" | "value"
  /** Datum field to compare. Defaults to the host-resolved context value. */
  field?: string
  /** value > n */
  gt?: number
  /** value >= n */
  gte?: number
  /** value < n */
  lt?: number
  /** value <= n */
  lte?: number
  /** value === n (numeric or string equality) */
  eq?: number | string
  /** value !== n */
  ne?: number | string
  /** min <= value <= max (inclusive) */
  within?: [number, number]
  /** value < min OR value > max */
  outside?: [number, number]
  /** value is one of the listed values */
  in?: Array<number | string>
}

/**
 * Context passed to predicate / style functions and threshold resolution.
 * Which channels are populated depends on the chart family:
 *  - ordinal bars: `value` (bar value), `category` (stack/group key)
 *  - XY: `value` (= `y`), `x`, `y`
 *  - network nodes: `value` (node size/value), `category` (group / colorBy)
 *  - geo features: `value` (feature value), `category`
 *  - physics particles: `value` (body value), `category` (colorBy group)
 */
export interface StyleRuleContext {
  /** Primary numeric value the host resolved (bar value; XY y; node/feature/body value). */
  value: number | undefined
  /** Resolved x value (XY family). */
  x?: number
  /** Resolved y value (XY family; usually equals `value`). */
  y?: number
  /** Resolved size value (bubble / symbol `sizeBy`, node size), when known. */
  size?: number
  /** Category / series / stack / group key, when the host knows one. */
  category?: string
  /** Positional index, when the host provides one. */
  index?: number
}

/** A `when` predicate: full programmatic control over matching. */
export type StyleRulePredicate = (datum: Datum, ctx: StyleRuleContext) => boolean

/**
 * One declarative style rule. `when` may be:
 *  - a **predicate** `(datum, ctx) => boolean`
 *  - a **threshold** object (`{ gt, lte, within, in, … }`)
 *  - `true` / omitted — always matches (an unconditional base layer)
 *  - `false` — never matches (temporarily disable a rule)
 */
export interface StyleRule {
  /** Optional stable id — handy for legends, debugging, and docs. */
  id?: string
  /** Match condition. Omitted / `true` ⇒ always applies. */
  when?: StyleRulePredicate | StyleRuleThreshold | boolean
  /** Style to apply when matched. Object, or a per-datum function. */
  style: StyleRuleStyle | ((datum: Datum, ctx: StyleRuleContext) => StyleRuleStyle)
  /** Optional human label (legend / documentation only). */
  label?: string
}

/**
 * Build a stable-ish resolver that reads a numeric value from a datum via a
 * string field or accessor function — the value threshold rules compare
 * against when their `field` is omitted. Memoize the result in the host
 * component keyed on the accessor (string accessors are already stable).
 */
export function makeRuleValueResolver(
  accessor: string | ((d: Datum) => unknown) | undefined,
): (d: Datum) => number | undefined {
  if (accessor == null) return () => undefined
  const read = typeof accessor === "function" ? accessor : (d: Datum) => d[accessor]
  return (d: Datum) => toNum(read(d))
}

/**
 * Build the XY `StyleRuleContext` resolver from x/y accessors: populates
 * `value` (= y), `x`, and `y` so thresholds can target either axis via
 * `{ axis: "x" }` / `{ axis: "y" }` regardless of the accessor field names.
 * Shared by the XY client hooks and the XY server render configs. Memoize in
 * the host keyed on the accessors.
 */
export function makeXYRuleContext(
  xAccessor: string | ((d: Datum) => unknown) | undefined,
  yAccessor: string | ((d: Datum) => unknown) | undefined,
): (d: Datum, category?: string) => StyleRuleContext {
  const readX = makeRuleValueResolver(xAccessor)
  const readY = makeRuleValueResolver(yAccessor)
  return (d: Datum, category?: string) => {
    const y = readY(d)
    return { value: y, x: readX(d), y, category }
  }
}

/**
 * Build the network-node `StyleRuleContext` resolver: `value` from a numeric
 * field (defaults to the node's `value`) and `category` from the `colorBy`
 * group. Rules resolve against the raw node object (unwrap `RealtimeNode.data`
 * first). Shared by network client HOCs and the network server configs.
 */
export function makeNodeRuleContext(
  colorBy: string | ((d: Datum) => unknown) | undefined,
  valueAccessor?: string | ((d: Datum) => unknown),
): (raw: Datum) => StyleRuleContext {
  const readValue = makeRuleValueResolver(valueAccessor ?? "value")
  const readGroup =
    colorBy == null
      ? undefined
      : typeof colorBy === "function"
        ? colorBy
        : (d: Datum) => d[colorBy]
  return (raw: Datum) => {
    const g = readGroup ? readGroup(raw) : undefined
    return { value: readValue(raw), category: g == null ? undefined : String(g) }
  }
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/**
 * Evaluate a declarative threshold against a datum + context. Returns `false`
 * when the compared value can't be resolved to a finite number (except for the
 * purely categorical `eq`/`ne`/`in` operators, which also accept strings).
 */
export function matchesThreshold(
  threshold: StyleRuleThreshold,
  datum: Datum,
  ctx: StyleRuleContext,
): boolean {
  // Resolve the compared value: axis channel > raw field > context value.
  const rawField =
    threshold.axis != null
      ? ctx[threshold.axis]
      : threshold.field != null
        ? datum[threshold.field]
        : ctx.value
  if (threshold.eq !== undefined && rawField !== threshold.eq) return false
  if (threshold.ne !== undefined && rawField === threshold.ne) return false
  if (threshold.in !== undefined && !threshold.in.includes(rawField as number | string)) return false

  // Numeric operators need a finite number.
  const needsNumeric =
    threshold.gt !== undefined ||
    threshold.gte !== undefined ||
    threshold.lt !== undefined ||
    threshold.lte !== undefined ||
    threshold.within !== undefined ||
    threshold.outside !== undefined
  if (!needsNumeric) return true

  const value = toNum(rawField)
  if (value === undefined) return false
  if (threshold.gt !== undefined && !(value > threshold.gt)) return false
  if (threshold.gte !== undefined && !(value >= threshold.gte)) return false
  if (threshold.lt !== undefined && !(value < threshold.lt)) return false
  if (threshold.lte !== undefined && !(value <= threshold.lte)) return false
  if (threshold.within !== undefined) {
    const [min, max] = threshold.within
    if (!(value >= min && value <= max)) return false
  }
  if (threshold.outside !== undefined) {
    const [min, max] = threshold.outside
    if (!(value < min || value > max)) return false
  }
  return true
}

/** Does a single rule's `when` condition match this datum? */
export function ruleMatches(rule: StyleRule, datum: Datum, ctx: StyleRuleContext): boolean {
  const when = rule.when
  if (when === undefined || when === true) return true
  if (when === false) return false
  if (typeof when === "function") return when(datum, ctx)
  return matchesThreshold(when, datum, ctx)
}

/**
 * Resolve an ordered rule list to a single merged style. Every matching
 * rule's style is spread in list order, so for any given property the last
 * applicable rule wins. Returns an empty object when nothing matches (the
 * host chart's base style is then used unchanged).
 */
export function resolveStyleRules(
  datum: Datum,
  rules: ReadonlyArray<StyleRule> | undefined,
  ctx: StyleRuleContext,
): StyleRuleStyle {
  if (!rules || rules.length === 0) return {}
  let merged: StyleRuleStyle = {}
  for (const rule of rules) {
    if (!ruleMatches(rule, datum, ctx)) continue
    const style = typeof rule.style === "function" ? rule.style(datum, ctx) : rule.style
    if (style) merged = { ...merged, ...style }
  }
  return merged
}

/** A per-mark style function the pipelines accept (`fill` may be a HatchFill). */
type MarkStyleFn = (d: Datum, arg?: string) => StyleRuleStyle

/**
 * Client-side composition: wrap a base per-mark style function so declarative
 * rules layer OVER its output (rules win per property), matching the ordinal
 * `useOrdinalPieceStyle` behavior for every other family. The base style runs
 * first (resolving the mark's base color); the merged rule style is spread on
 * top. Returns the base function unchanged when there are no rules, so it's a
 * zero-cost pass-through in the common case.
 *
 * `buildContext` populates the `StyleRuleContext` channels the family's rules
 * read (`value`, `x`, `y`, `category`…). `unwrap` handles frames whose style
 * callbacks receive a wrapper rather than the raw datum (e.g. network's
 * `RealtimeNode`, whose user object lives on `.data`) — rules and
 * `buildContext` see the unwrapped raw datum, while the base function still
 * receives the original argument.
 */
export function composeStyleRules<A = string>(
  baseStyleFn: ((d: Datum, arg?: A) => Datum) | undefined,
  rules: ReadonlyArray<StyleRule> | undefined,
  buildContext: (raw: Datum, arg?: A) => StyleRuleContext,
  unwrap: (d: Datum) => Datum = (d) => d,
): (d: Datum, arg?: A) => Datum {
  const base = baseStyleFn ?? ((): Datum => ({}))
  if (!rules || rules.length === 0) return base
  return (d: Datum, arg?: A) => {
    const raw = unwrap(d)
    const merged: Datum = { ...base(d, arg) }
    Object.assign(merged, resolveStyleRules(raw, rules, buildContext(raw, arg)))
    return merged
  }
}

/**
 * Compose style rules into a per-mark style function. It resolves the merged
 * rule style from a per-datum `StyleRuleContext` (built by `buildContext`),
 * then overlays a user-supplied style function (which wins). Marks left
 * unmatched return an empty style so the frame's own base-color resolver fills
 * them.
 *
 * This is the family-agnostic primitive behind the server render path (which
 * builds frame props directly instead of going through a HOC hook). Each
 * family supplies the `buildContext` that populates the channels its threshold
 * rules read — `value` for bars, `{ value, x, y }` for XY, node value/group
 * for network, etc. — so all families share one rule-resolution core.
 *
 * @param arg the second style-fn argument (ordinal category / stack key). It is
 *   passed through to `buildContext` and the user style fn unchanged.
 */
export function makeStyleRuleStyleFn(
  rules: ReadonlyArray<StyleRule> | undefined,
  buildContext: (d: Datum, arg?: string) => StyleRuleContext,
  userStyleFn?: MarkStyleFn,
): MarkStyleFn | undefined {
  if (!rules || rules.length === 0) return userStyleFn
  return (d: Datum, arg?: string) => {
    const ruled = resolveStyleRules(d, rules, buildContext(d, arg))
    const user = userStyleFn ? userStyleFn(d, arg) : undefined
    return user ? { ...ruled, ...user } : ruled
  }
}

/**
 * Network-flavored server helper: resolves rules against the raw node (the
 * server frame passes a `RealtimeNode` wrapper whose user object is on
 * `.data`), with `{ value, category }` context from `makeNodeRuleContext`. A
 * user `nodeStyle` overlays and wins. `undefined` when there are no rules.
 */
export function styleRulesToNodeStyle(
  rules: ReadonlyArray<StyleRule> | undefined,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  valueAccessor: string | ((d: Datum) => unknown) | undefined,
  userNodeStyle?: (d: Datum, arg?: number) => Datum,
): ((d: Datum, arg?: number) => Datum) | undefined {
  if (!rules || rules.length === 0) return userNodeStyle
  const buildCtx = makeNodeRuleContext(colorBy, valueAccessor)
  return (d: Datum, arg?: number) => {
    const raw: Datum = (d && (d as { data?: Datum }).data) || d
    const ruled = resolveStyleRules(raw, rules, buildCtx(raw))
    const user = userNodeStyle ? userNodeStyle(d, arg) : undefined
    return user ? { ...ruled, ...user } : ruled
  }
}

/**
 * XY-flavored server helper: `{ value: y, x, y }` context from `makeXYRuleContext`.
 * Feeds `pointStyle` / `lineStyle`. A user style overlays and wins.
 */
export function styleRulesToXYStyle(
  rules: ReadonlyArray<StyleRule> | undefined,
  xAccessor: string | ((d: Datum) => unknown) | undefined,
  yAccessor: string | ((d: Datum) => unknown) | undefined,
  userStyle?: MarkStyleFn,
): MarkStyleFn | undefined {
  return makeStyleRuleStyleFn(rules, makeXYRuleContext(xAccessor, yAccessor), userStyle)
}

/**
 * Ordinal-flavored {@link makeStyleRuleStyleFn}: the context is
 * `{ value: valueAccessor(d), category }` — the bar/piece value plus the
 * stack/group key. Kept as sugar for the ordinal server config.
 */
export function styleRulesToPieceStyle(
  rules: ReadonlyArray<StyleRule> | undefined,
  valueAccessor: string | ((d: Datum) => unknown) | undefined,
  userPieceStyle?: MarkStyleFn,
): MarkStyleFn | undefined {
  const resolveValue = makeRuleValueResolver(valueAccessor)
  return makeStyleRuleStyleFn(
    rules,
    (d, category) => ({ value: resolveValue(d), category }),
    userPieceStyle,
  )
}
