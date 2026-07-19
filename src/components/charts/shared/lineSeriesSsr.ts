/**
 * Pure LineChart series-feature prep for the SSR / renderChart path.
 *
 * Mirrors the client HOC orchestration of:
 *   - `useSeriesFeatures` (forecast / anomaly via `buildForecast`)
 *   - gapStrategy (break / interpolate / zero)
 *   - directLabel endpoint annotations
 *   - segment-aware lineStyle (createSegmentLineStyle)
 *
 * Client uses lazy dynamic import + React state for these; SSR can call
 * the pure statisticalOverlays entry points synchronously.
 */
import type { Datum } from "./datumTypes"
import {
  buildAnomalyAnnotations,
  buildForecast,
  createSegmentLineStyle,
  SEGMENT_FIELD,
  type AnomalyConfig,
  type ForecastConfig,
} from "./statisticalOverlays"
import { createColorScale, DEFAULT_COLOR, getColor } from "./colorUtils"
import { filterSparseArray } from "./sparseArray"

const RESOLVED_X_KEY = "__semiotic_resolvedX"
const RESOLVED_Y_KEY = "__semiotic_resolvedY"
const COMPOUND_GROUP = "__compoundGroup"

export interface LineSeriesSsrInput {
  data: unknown
  xAccessor?: string | ((d: Datum) => unknown)
  yAccessor?: string | ((d: Datum) => unknown)
  lineBy?: string | ((d: Datum) => unknown)
  colorBy?: string | ((d: Datum) => unknown)
  colorScheme?: unknown
  color?: string
  forecast?: ForecastConfig
  anomaly?: AnomalyConfig
  gapStrategy?: "break" | "interpolate" | "zero"
  directLabel?: boolean | { position?: "start" | "end"; fontSize?: number }
  /** Existing annotations to merge with statistical + direct-label ones. */
  annotations?: Datum[]
  themeCategorical?: string[]
  /** Base lineStyle from buildLineStyle — wrapped with segment styling when forecast is set. */
  baseLineStyle?: (d: Datum, group?: string) => Datum
}

export interface LineSeriesSsrResult {
  data: Datum[]
  xAccessor: string | ((d: Datum) => unknown)
  yAccessor: string | ((d: Datum) => unknown)
  groupAccessor: string | ((d: Datum) => unknown) | undefined
  colorAccessor: string | ((d: Datum) => unknown) | undefined
  annotations: Datum[]
  lineStyle?: (d: Datum, group?: string) => Datum
  yExtent?: [number, number]
  /** Extra right/left margin for direct labels. */
  marginExtra?: { left?: number; right?: number }
}

function bakeAccessors(
  rows: Datum[],
  xAccessor: string | ((d: Datum) => unknown),
  yAccessor: string | ((d: Datum) => unknown),
): { rows: Datum[]; xKey: string; yKey: string } {
  const needsX = typeof xAccessor === "function"
  const needsY = typeof yAccessor === "function"
  const xKey = needsX ? RESOLVED_X_KEY : (xAccessor as string)
  const yKey = needsY ? RESOLVED_Y_KEY : (yAccessor as string)
  if (!needsX && !needsY) return { rows, xKey, yKey }
  return {
    xKey,
    yKey,
    rows: rows.map((d) => {
      const copy = { ...d }
      if (needsX) copy[RESOLVED_X_KEY] = (xAccessor as (datum: Datum) => unknown)(d)
      if (needsY) copy[RESOLVED_Y_KEY] = (yAccessor as (datum: Datum) => unknown)(d)
      return copy
    }),
  }
}

function isGap(
  d: Datum,
  xKey: string,
  yKey: string,
): boolean {
  const xVal = d[xKey]
  const yVal = d[yKey]
  return xVal == null || yVal == null || Number.isNaN(xVal as number) || Number.isNaN(yVal as number)
}

/**
 * Apply gapStrategy to flat rows grouped by `groupKey`.
 * Returns re-flattened points; for "break", injects `_gapSegment` and
 * updates group identity so segments stay separate in the pipeline.
 */
function applyGapStrategy(
  rows: Datum[],
  gapStrategy: "break" | "interpolate" | "zero",
  xKey: string,
  yKey: string,
  groupKey: string | undefined,
): { rows: Datum[]; groupKey: string | undefined } {
  // Group by groupKey (or single series).
  const groups = new Map<string, Datum[]>()
  for (const d of rows) {
    const key = groupKey ? String(d[groupKey] ?? "") : "__single"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }

  // Preserve input order (matches client LineChart gapStrategy behavior,
  // which never sorts by x — it assumes rows already arrive in series order).

  if (gapStrategy === "interpolate") {
    const out: Datum[] = []
    for (const [, pts] of groups) {
      for (const d of pts) {
        if (!isGap(d, xKey, yKey)) out.push(d)
      }
    }
    return { rows: out, groupKey }
  }

  if (gapStrategy === "zero") {
    const out: Datum[] = []
    for (const [, pts] of groups) {
      for (const d of pts) {
        if (isGap(d, xKey, yKey)) out.push({ ...d, [yKey]: 0 })
        else out.push(d)
      }
    }
    return { rows: out, groupKey }
  }

  // break — split into segments with unique group keys
  const out: Datum[] = []
  const gapGroupKey = "_gapSegment"
  for (const [gKey, pts] of groups) {
    let segIdx = 0
    let segment: Datum[] = []
    const flush = () => {
      if (segment.length === 0) return
      const segKey = gKey === "__single" ? `__seg${segIdx}` : `${gKey}__seg${segIdx}`
      for (const d of segment) {
        out.push({ ...d, [gapGroupKey]: segKey })
      }
      segment = []
      segIdx++
    }
    for (const d of pts) {
      if (isGap(d, xKey, yKey)) flush()
      else segment.push(d)
    }
    flush()
  }
  return { rows: out, groupKey: gapGroupKey }
}

function expandEnvelopeYExtent(
  rows: Datum[],
  yKey: string,
  forecast: ForecastConfig,
): [number, number] | undefined {
  const upperAcc = forecast.upperBounds
  const lowerAcc = forecast.lowerBounds
  if (!upperAcc && !lowerAcc) return undefined
  const getUpper = typeof upperAcc === "function"
    ? upperAcc
    : typeof upperAcc === "string"
      ? (d: Datum) => d[upperAcc] as number
      : null
  const getLower = typeof lowerAcc === "function"
    ? lowerAcc
    : typeof lowerAcc === "string"
      ? (d: Datum) => d[lowerAcc] as number
      : null
  let min = Infinity
  let max = -Infinity
  for (const d of rows) {
    const yVal = Number(d[yKey])
    if (Number.isFinite(yVal)) {
      if (yVal < min) min = yVal
      if (yVal > max) max = yVal
    }
    if (getUpper) {
      const u = getUpper(d)
      if (u != null && Number.isFinite(u)) {
        if (u > max) max = u
        if (u < min) min = u
      }
    }
    if (getLower) {
      const l = getLower(d)
      if (l != null && Number.isFinite(l)) {
        if (l < min) min = l
        if (l > max) max = l
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined
  return [min, max]
}

function buildDirectLabelAnnotations(
  rows: Datum[],
  directLabel: boolean | { position?: "start" | "end"; fontSize?: number },
  colorBy: string | ((d: Datum) => unknown) | undefined,
  xKey: string,
  yKey: string,
  colorScheme: unknown,
  themeCategorical: string[] | undefined,
  color: string | undefined,
): { annotations: Datum[]; marginExtra?: { left?: number; right?: number } } {
  if (!directLabel || !colorBy) return { annotations: [] }
  const cfg = typeof directLabel === "object" ? directLabel : {}
  const position = cfg.position || "end"
  const fontSize = cfg.fontSize || 11
  const colorAcc = typeof colorBy === "function" ? colorBy : (d: Datum) => d[colorBy as string]

  // Group by color key, pick endpoint.
  const groups = new Map<string, Datum[]>()
  for (const d of rows) {
    const raw = colorAcc(d)
    if (raw == null) continue
    const label = String(raw)
    if (label === "") continue
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(d)
  }

  // Sort each group by x for endpoint selection.
  const endpoints = new Map<string, Datum>()
  for (const [label, pts] of groups) {
    pts.sort((a, b) => Number(a[xKey]) - Number(b[xKey]))
    endpoints.set(label, position === "end" ? pts[pts.length - 1] : pts[0])
  }

  const colorScale = createColorScale(
    Array.from(endpoints.entries()).map(([label]) => ({ __lbl: label })),
    "__lbl",
    (colorScheme ?? themeCategorical) as string | string[] | Record<string, string>,
  )

  const labels = Array.from(endpoints.entries()).map(([label, d]) => ({
    type: "text" as const,
    label,
    [xKey]: d[xKey],
    [yKey]: d[yKey],
    dx: position === "end" ? 6 : -6,
    dy: 0,
    color: colorScale ? getColor({ __lbl: label }, "__lbl", colorScale) : (color || DEFAULT_COLOR),
    fontSize,
  }))

  // Vertical collision avoidance (data-space dy offsets — matches HOC).
  labels.sort((a, b) => Number(a[yKey]) - Number(b[yKey]))
  for (let i = 1; i < labels.length; i++) {
    const prev = labels[i - 1]
    const curr = labels[i]
    const prevY = Number(prev[yKey]) + prev.dy
    const currY = Number(curr[yKey]) + curr.dy
    if (Math.abs(currY - prevY) < fontSize + 2) {
      curr.dy += fontSize + 2
    }
  }

  const maxLabelWidth = labels.reduce(
    (max, l) => Math.max(max, String(l.label).length * (fontSize * 0.6)),
    0,
  )
  const extra = maxLabelWidth + 10
  const marginExtra = position === "end" ? { right: extra } : { left: extra }

  return { annotations: labels as Datum[], marginExtra }
}

/**
 * Prepare LineChart props for static SSR: forecast/anomaly data + annotations,
 * gap handling, direct labels, segment lineStyle.
 */
export function prepareLineSeriesForSsr(input: LineSeriesSsrInput): LineSeriesSsrResult {
  const xAccessor = input.xAccessor || "x"
  const yAccessor = input.yAccessor || "y"
  const lineBy = input.lineBy
  const colorBy = input.colorBy || lineBy
  let rows = Array.isArray(input.data)
    ? filterSparseArray(input.data).filter((d): d is Datum => !!d && typeof d === "object")
    : []

  const baked = bakeAccessors(rows, xAccessor as string | ((d: Datum) => unknown), yAccessor as string | ((d: Datum) => unknown))
  rows = baked.rows
  const xKey = baked.xKey
  const yKey = baked.yKey

  const annotations: Datum[] = Array.isArray(input.annotations) ? [...input.annotations] : []
  let groupAccessor: string | ((d: Datum) => unknown) | undefined =
    typeof lineBy === "string" || typeof lineBy === "function" ? lineBy : undefined
  let yExtent: [number, number] | undefined
  let lineStyle = input.baseLineStyle

  // ── Forecast / anomaly ─────────────────────────────────────────────
  if (input.forecast) {
    const enriched: ForecastConfig =
      lineBy && typeof lineBy === "string" && typeof input.forecast === "object"
        ? { ...input.forecast, _groupBy: lineBy }
        : input.forecast
    const result = buildForecast(rows, xKey, yKey, enriched, input.anomaly)
    rows = result.processedData
    annotations.push(...result.annotations)
    yExtent = expandEnvelopeYExtent(rows, yKey, input.forecast)

    if (lineBy && typeof lineBy === "string") {
      rows = rows.map((d) => ({
        ...d,
        [COMPOUND_GROUP]: `${d[lineBy]}__${d[SEGMENT_FIELD] || "observed"}`,
      }))
      groupAccessor = COMPOUND_GROUP
    } else {
      groupAccessor = SEGMENT_FIELD
    }

    if (input.baseLineStyle) {
      const segmentStyle = createSegmentLineStyle(
        (d) => input.baseLineStyle!(d),
        input.forecast,
      )
      lineStyle = (d) => segmentStyle(d)
    }
  } else if (input.anomaly) {
    annotations.push(...buildAnomalyAnnotations(input.anomaly))
  }

  // ── Gap strategy ───────────────────────────────────────────────────
  if (input.gapStrategy) {
    // Mirror client behavior: gap processing runs per-series even when
    // lineBy/groupAccessor is a function — materialize it onto each row so
    // applyGapStrategy can group by a stable string key instead of
    // collapsing every series into one "__single" bucket.
    if (typeof groupAccessor === "function") {
      const resolveGroup = groupAccessor
      rows = rows.map((d) => ({ ...d, __semiotic_gapGroup: resolveGroup(d) }))
      groupAccessor = "__semiotic_gapGroup"
    }
    const groupKey = typeof groupAccessor === "string" ? groupAccessor : undefined
    const gapped = applyGapStrategy(rows, input.gapStrategy, xKey, yKey, groupKey)
    rows = gapped.rows
    if (gapped.groupKey) groupAccessor = gapped.groupKey
  }

  // ── Direct labels ──────────────────────────────────────────────────
  let marginExtra: { left?: number; right?: number } | undefined
  if (input.directLabel) {
    const dl = buildDirectLabelAnnotations(
      rows,
      input.directLabel,
      typeof colorBy === "string" || typeof colorBy === "function" ? colorBy : undefined,
      xKey,
      yKey,
      input.colorScheme,
      input.themeCategorical,
      input.color,
    )
    annotations.push(...dl.annotations)
    marginExtra = dl.marginExtra
  }

  return {
    data: rows,
    xAccessor: typeof xAccessor === "function" ? xKey : xAccessor,
    yAccessor: typeof yAccessor === "function" ? yKey : yAccessor,
    groupAccessor,
    colorAccessor: colorBy as string | ((d: Datum) => unknown) | undefined,
    annotations,
    lineStyle,
    yExtent,
    marginExtra,
  }
}
