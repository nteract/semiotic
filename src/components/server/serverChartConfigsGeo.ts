import type { Datum } from "../charts/shared/datumTypes"
import { createColorScale, getColor, getSize } from "../charts/shared/colorUtils"
import { DEFAULT_COLOR } from "../charts/shared/hooks"
import { getMinMax } from "../charts/shared/minMax"
import { type ChartConfig } from "./serverChartConfigShared"
import { composeStyleRules, makeNodeRuleContext } from "../charts/shared/styleRules"
import { getSequentialInterpolator } from "../charts/shared/colorPalettes"
import { scaleSequential } from "d3-scale"

/**
 * Build a geo symbol map's per-point base `pointStyle` (colorBy fill + sizeBy
 * radius), mirroring the client `ProportionalSymbolMap`/`DistanceCartogram`
 * exactly. The geo scene builder resolves point color/size only from a
 * `pointStyle` — the frame has no `colorBy` path server-side — so without this
 * SSR/`renderChart` symbol maps rendered every point in the default color/size
 * (a true CSR/SSR mismatch). Handles string AND function `colorBy`.
 */
function buildGeoPointBaseStyle(
  points: unknown,
  colorBy: string | ((d: Datum) => unknown) | undefined,
  colorScheme: string | string[] | Record<string, string> | undefined,
  opts: { sizeBy?: string | ((d: Datum) => number); sizeRange?: [number, number]; pointRadius?: number; fillOpacity: number; strokeWidth: number },
): (d: Datum) => Datum {
  const arr: Datum[] = Array.isArray(points) ? (points as Datum[]) : []
  let colorScale: ((v: string) => string) | undefined
  if (colorBy) {
    // createColorScale keys off a string field; project a function accessor
    // onto a synthetic field so getColor(d, fn, scale) still resolves.
    const key = typeof colorBy === "string" ? colorBy : "__geoColorBy"
    const scaleData = typeof colorBy === "string" ? arr : arr.map((p) => ({ ...p, __geoColorBy: (colorBy as (d: Datum) => unknown)(p) }))
    colorScale = createColorScale(scaleData, key, colorScheme)
  }
  let sizeDomain: [number, number] | undefined
  if (opts.sizeBy) {
    const acc = typeof opts.sizeBy === "function" ? opts.sizeBy : (d: Datum) => d?.[opts.sizeBy as string]
    const vals = arr.map(acc).filter((v): v is number => v != null && isFinite(v as number))
    if (vals.length > 0) sizeDomain = getMinMax(vals)
  }
  return (d: Datum): Datum => ({
    fill: colorBy && colorScale ? getColor(d, colorBy as string | ((x: Datum) => string), colorScale) : DEFAULT_COLOR,
    fillOpacity: opts.fillOpacity,
    stroke: "#fff",
    strokeWidth: opts.strokeWidth,
    r: opts.sizeBy ? getSize(d, opts.sizeBy, opts.sizeRange, sizeDomain) : (opts.pointRadius ?? 6),
  })
}

/** Flatten a GeoJSON feature's `properties` up so field thresholds can read them. */
function flattenFeature(f: Datum): Datum {
  return f && typeof f === "object" && (f as Datum).properties ? { ...(f as Datum).properties, ...f } : f
}

/**
 * Build the choropleth's per-feature base `areaStyle` — the sequential
 * value→color fill — mirroring the client `ChoroplethMap` exactly so
 * `renderChart`/SSR output matches the browser. Without this the server frame
 * had no `valueAccessor`→color path and every feature fell back to gray (a true
 * CSR/SSR mismatch). Returns `undefined` when areas aren't materialized (the
 * server can't resolve a `"world-110m"` string synchronously — that path
 * errors later in `renderGeoFrame`).
 */
function buildChoroplethAreaStyle(
  areas: unknown,
  valueAccessor: string | ((d: Datum) => number | undefined) | undefined,
  colorScheme: string | undefined,
  areaOpacity: number,
): ((f: Datum) => Datum) | undefined {
  if (!Array.isArray(areas)) return undefined
  const valAcc = (d: Datum): number | undefined =>
    typeof valueAccessor === "function"
      ? valueAccessor(d)
      : valueAccessor != null
        ? (d?.properties?.[valueAccessor] ?? d?.[valueAccessor]) as number | undefined
        : undefined
  let min = Infinity
  let max = -Infinity
  for (const feature of areas as Datum[]) {
    const v = valAcc(feature)
    if (v == null || !isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  const scale = scaleSequential(getSequentialInterpolator(colorScheme)).domain([
    Number.isFinite(min) ? min : 0,
    Number.isFinite(max) ? max : 1,
  ])
  return (f: Datum): Datum => {
    const v = valAcc(f)
    return {
      fill: v != null && isFinite(v) ? scale(v) : "#ccc",
      stroke: "#999",
      strokeWidth: 0.5,
      fillOpacity: areaOpacity,
    }
  }
}

// ── Geo Charts ─────────────────────────────────────────────────────────

export const choroplethMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const scheme = typeof colorScheme === "string" ? colorScheme : "blues"
    // Base sequential fill (CSR parity) — user `areaStyle` overrides it, matching
    // the client where the built-in fill is used unless a style fn is supplied.
    const baseAreaStyle =
      rest.areaStyle ??
      buildChoroplethAreaStyle(rest.areas, rest.valueAccessor, scheme, rest.areaOpacity ?? 1)
    // Layer declarative style rules on top of the base fill (features flattened
    // so field thresholds can read `properties`; `ctx.value` = the feature value).
    const valAcc = (d: Datum): number | undefined =>
      typeof rest.valueAccessor === "function"
        ? rest.valueAccessor(d)
        : rest.valueAccessor != null
          ? (d?.properties?.[rest.valueAccessor] ?? d?.[rest.valueAccessor]) as number | undefined
          : undefined
    const areaStyle = rest.styleRules
      ? composeStyleRules(baseAreaStyle, rest.styleRules, (raw: Datum) => ({ value: valAcc(raw) }), flattenFeature)
      : baseAreaStyle
    return {
      areas: rest.areas,
      projection: rest.projection || "equalEarth",
      areaStyle,
      valueAccessor: rest.valueAccessor,
      colorScheme: scheme,
      graticule: rest.graticule,
      fitPadding: rest.fitPadding,
      ...common,
    }
  },
}

export const proportionalSymbolMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const points = data || rest.points
    // Base per-point fill/size (CSR parity) — user `pointStyle` overrides it.
    const basePointStyle =
      rest.pointStyle ??
      buildGeoPointBaseStyle(points, colorBy as string | ((d: Datum) => unknown) | undefined, colorScheme, {
        sizeBy: rest.sizeBy,
        sizeRange: rest.sizeRange || [3, 30],
        fillOpacity: 0.7,
        strokeWidth: 0.5,
      })
    const pointStyle = rest.styleRules
      ? composeStyleRules(
          basePointStyle,
          rest.styleRules,
          makeNodeRuleContext(
            colorBy as string | ((d: Datum) => unknown) | undefined,
            rest.sizeBy as string | ((d: Datum) => unknown) | undefined,
          ),
        )
      : basePointStyle
    return {
      points,
      xAccessor: rest.xAccessor || "lon",
      yAccessor: rest.yAccessor || "lat",
      areas: rest.areas,
      areaStyle: rest.areaStyle,
      pointStyle,
      sizeBy: rest.sizeBy,
      colorBy,
      colorScheme,
      projection: rest.projection || "equalEarth",
      graticule: rest.graticule,
      fitPadding: rest.fitPadding,
      ...common,
    }
  },
}

/**
 * FlowMap expands `flows` (edges with source/target ids) + `nodes` (points
 * with coordinates) into the `lines` shape StreamGeoFrame expects, where
 * each line carries a `coordinates` array of two {x,y} endpoints.
 */
export const flowMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Accept flows either via the primary `data` arg (matches how
    // ProportionalSymbolMap / ChoroplethMap consume their data) or via
    // the explicit `rest.flows` escape hatch. `data` wins when both are
    // present so callers using the standard renderChart(_, { data }) shape
    // behave consistently with the rest of the registry.
    const flows: Array<Datum> =
      (Array.isArray(data) ? data : null) || rest.flows || []
    const nodes: Array<Datum> = rest.nodes || []
    const nodeIdAccessor = rest.nodeIdAccessor || "id"
    const valueAccessor = rest.valueAccessor || "value"
    const xAccessorIn = rest.xAccessor || "lon"
    const yAccessorIn = rest.yAccessor || "lat"

    // Resolve accessors locally. Both strings and functions are valid per
    // the public FlowMap typings. Downstream StreamGeoFrame reads coords
    // via `xAccessor`/`yAccessor`, so we normalize everything (both the
    // synthesized line coordinates AND the passthrough points) into
    // canonical `{ x, y }` shape and hand the frame fixed string accessors.
    // That avoids the function-as-computed-key bug (where the key became
    // the stringified function source) and keeps line + point
    // accessor-resolution consistent.
    const xAcc = typeof xAccessorIn === "function" ? xAccessorIn : (d: Datum) => d[xAccessorIn]
    const yAcc = typeof yAccessorIn === "function" ? yAccessorIn : (d: Datum) => d[yAccessorIn]

    const projectedNodes: Array<Datum> = nodes.map(n => ({ ...n, x: xAcc(n), y: yAcc(n) }))
    const nodeLookup = new Map<string, Datum>()
    for (const node of projectedNodes) nodeLookup.set(String(node[nodeIdAccessor]), node)

    // Edge-color resolution — mirror the FlowMap HOC API. `edgeColorBy`
    // (domain-specific) wins over top-level `colorBy`; either can be a
    // string field or an accessor function. Resolution goes through the
    // shared `getColor` so named schemes ("category10", "blues", …) and
    // function-accessors that return literal CSS colors both behave
    // identically to the client-side FlowMap. Fallback color matches
    // the HOC's `DEFAULT_COLOR`; kept inline to avoid pulling hook
    // internals into the server config module.
    const FLOW_DEFAULT_COLOR = "#007bff"
    const edgeColorByIn = rest.edgeColorBy ?? colorBy
    const isFnEdgeColor = typeof edgeColorByIn === "function"

    const lines = flows
      .map(flow => {
        if (!flow || flow.source == null || flow.target == null) return null
        const src = nodeLookup.get(String(flow.source))
        const tgt = nodeLookup.get(String(flow.target))
        if (!src || !tgt) return null
        return {
          ...flow,
          coordinates: [
            { x: src.x, y: src.y },
            { x: tgt.x, y: tgt.y },
          ],
        }
      })
      .filter(Boolean) as Datum[]

    // Build an ordinal scale once so every line reuses the same category →
    // color mapping. For function accessors we synthesize a scratch field
    // on a cloned array solely to seed the scale's domain — the lines
    // themselves aren't mutated. `getColor` calls the user's function
    // fresh at resolution time and short-circuits for CSS-color returns
    // (so function accessors that return "#ff0000" or "red" literally
    // pass through instead of being mapped).
    const EDGE_COLOR_FIELD = "__flowMapEdgeColor"
    const colorScale = (() => {
      if (!edgeColorByIn) return null
      if (isFnEdgeColor) {
        const domainSeed = lines.map(l => ({
          [EDGE_COLOR_FIELD]: (edgeColorByIn as (d: Datum) => string)(l),
        }))
        return createColorScale(domainSeed, EDGE_COLOR_FIELD, colorScheme || "category10")
      }
      return createColorScale(lines, edgeColorByIn as string, colorScheme || "category10")
    })()
    const resolveEdgeColor = (d: Datum): string => {
      if (!edgeColorByIn || !colorScale) return FLOW_DEFAULT_COLOR
      return getColor(d, edgeColorByIn as string | ((d: Datum) => string), colorScale)
    }

    // Precompute min/max value range once per build. Recomputing inside
    // `lineStyle` would be O(n) per line → O(n²) total for rendering.
    let minValue = Infinity
    let maxValue = -Infinity
    for (const line of lines) {
      const v = Number(line[valueAccessor] ?? 0)
      if (!isFinite(v)) continue
      if (v < minValue) minValue = v
      if (v > maxValue) maxValue = v
    }
    const valueRange = maxValue > minValue ? maxValue - minValue : 0

    // Width scale — map value → edgeWidthRange linearly. Mirrors the HOC.
    const [widthMin, widthMax] = rest.edgeWidthRange ?? [1, 8]
    const widthSpan = widthMax - widthMin
    const edgeOpacity = rest.edgeOpacity ?? 0.6
    const edgeLinecap = rest.edgeLinecap ?? "round"

    return {
      lines,
      points: projectedNodes,
      xAccessor: "x",
      yAccessor: "y",
      lineDataAccessor: "coordinates",
      lineType: rest.lineType || "geo",
      flowStyle: rest.flowStyle || "basic",
      areas: rest.areas,
      areaStyle: rest.areaStyle,
      projection: rest.projection || "equalEarth",
      graticule: rest.graticule,
      fitPadding: rest.fitPadding,
      colorScheme,
      lineStyle: (d: Datum) => {
        // Guard against non-finite values (NaN from strings, Infinity, etc.)
        // — they'd otherwise propagate through `normalized` and produce an
        // invalid `stroke-width="NaN"` in the output SVG. Non-finite inputs
        // collapse to `minValue`, and the ratio is clamped to [0, 1] as a
        // belt-and-suspenders against odd (value < minValue, value > maxValue)
        // inputs.
        const raw = Number(d?.[valueAccessor])
        const v = Number.isFinite(raw) ? raw : minValue
        const ratio = valueRange > 0 ? (v - minValue) / valueRange : 0
        const normalized = Math.max(0, Math.min(1, ratio))
        const width = widthMin + normalized * widthSpan
        return {
          stroke: resolveEdgeColor(d),
          strokeWidth: width,
          strokeLinecap: edgeLinecap,
          opacity: edgeOpacity,
          fillOpacity: 0,
        }
      },
      pointStyle: () => ({ fill: "#333", r: 4, fillOpacity: 0.8 }),
      ...common,
    }
  },
}

