import type { Datum } from "../charts/shared/datumTypes"
import { createColorScale, getColor } from "../charts/shared/colorUtils"
import { type ChartConfig } from "./serverChartConfigShared"

// ── Geo Charts ─────────────────────────────────────────────────────────

export const choroplethMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    areas: rest.areas,
    projection: rest.projection || "equalEarth",
    areaStyle: rest.areaStyle,
    valueAccessor: rest.valueAccessor,
    colorScheme: colorScheme || "blues",
    graticule: rest.graticule,
    fitPadding: rest.fitPadding,
    ...common,
  }),
}

export const proportionalSymbolMap: ChartConfig = {
  frameType: "geo",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    points: data || rest.points,
    xAccessor: rest.xAccessor || "lon",
    yAccessor: rest.yAccessor || "lat",
    areas: rest.areas,
    areaStyle: rest.areaStyle,
    sizeBy: rest.sizeBy,
    colorBy,
    colorScheme,
    projection: rest.projection || "equalEarth",
    graticule: rest.graticule,
    fitPadding: rest.fitPadding,
    ...common,
  }),
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

