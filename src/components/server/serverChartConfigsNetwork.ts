import type { Datum } from "../charts/shared/datumTypes"
import { buildProcessSankeyScenes } from "../charts/network/processSankey/buildScenes"
import { emitProcessSankeyScenes } from "../charts/network/processSankey/streamingLayout"
import { formatProcessSankeyIssue } from "../charts/network/processSankey/algorithm"
import { createEdgeStyleFn, inferNodesFromEdges, flattenHierarchy } from "../charts/network/../shared/networkUtils"
import { createColorScale, getColor, resolveCategoricalPalette, DEPTH_PALETTE_COLORS } from "../charts/shared/colorUtils"
import { schemeCategory10 } from "../charts/shared/colorPalettes"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { composeLegendConfigs } from "../types/legendTypes"
import { type ChartConfig } from "./serverChartConfigShared"
import { styleRulesToNodeStyle } from "../charts/shared/styleRules"
import { resolveTheme } from "./themeResolver"
import * as React from "react"

// ── Network Charts ─────────────────────────────────────────────────────

export const forceDirectedGraph: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Mirror the HOC's edgeWidth/edgeColor/edgeOpacity handling so that
    // `renderChart("ForceDirectedGraph", { edgeWidth: "weight" })` honors
    // edge weight in SSR. An explicit edgeStyle wins; otherwise synthesize
    // one when any edge primitive prop is set. The edge callback receives a
    // RealtimeEdge wrapper (user data on .data) — read field/function
    // accessors against the raw edge, matching the HOC.
    const { edgeWidth, edgeColor, edgeOpacity } = rest
    const hasEdgePrimitives =
      edgeWidth !== undefined || edgeColor !== undefined || edgeOpacity !== undefined
    const edgeStyle =
      rest.edgeStyle ??
      (hasEdgePrimitives
        ? (d: Datum) => {
            const edge = (d?.data as Datum) || d
            let strokeWidth = 1
            if (typeof edgeWidth === "number") {
              strokeWidth = edgeWidth
            } else if (typeof edgeWidth === "function") {
              strokeWidth = edgeWidth(edge)
            } else if (typeof edgeWidth === "string") {
              const raw = edge?.[edgeWidth]
              const n = typeof raw === "number" ? raw : Number(raw)
              strokeWidth = Number.isFinite(n) && n > 0 ? n : 1
            }
            return {
              stroke: edgeColor ?? "#999",
              strokeWidth,
              opacity: edgeOpacity ?? 0.6,
            }
          }
        : undefined)
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const baseNodeStyle = rest.nodeStyle ?? ((d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        // ForceDirectedGraph is intentionally monocolor until colorBy is
        // requested; the network layout's palette fallback would otherwise
        // assign a different color to each node on SSR.
        fill: colorBy
          ? getColor(raw, colorBy as string | ((node: Datum) => string), undefined)
          : resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap),
        ...(typeof rest.nodeSize === "number" && { r: rest.nodeSize }),
      }
    })
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules,
      colorBy as string | ((d: Datum) => unknown) | undefined,
      typeof rest.nodeSize === "number" ? undefined : rest.nodeSize,
    )
    const configuredNodeStyle = ruleNodeStyle
      ? (d: Datum, index?: number) => ({ ...baseNodeStyle(d), ...ruleNodeStyle(d, index) })
      : baseNodeStyle
    return {
      chartType: "force",
      nodes: rest.nodes,
      edges: rest.edges,
      // Accept the canonical `nodeIdAccessor` (and the legacy `nodeIDAccessor`
      // alias), matching the HOC and the other network SSR configs.
      nodeIDAccessor: rest.nodeIdAccessor || rest.nodeIDAccessor,
      sourceAccessor: rest.sourceAccessor,
      targetAccessor: rest.targetAccessor,
      colorBy,
      colorScheme,
      iterations: rest.iterations,
      forceStrength: rest.forceStrength,
      showLabels: rest.showLabels ?? false,
      nodeLabel: rest.nodeLabel,
      nodeSize: rest.nodeSize ?? 8,
      nodeSizeRange: rest.nodeSizeRange,
      nodeStyle: configuredNodeStyle,
      edgeStyle,
      ...common,
    }
  },
}

// ProcessSankey is unique among network HOCs in that it doesn't use a
// built-in chartType — it composes via the `customNetworkLayout`
// escape hatch. The SSR config therefore runs the algorithm + path
// builders here (same pure helpers the HOC uses) and threads the
// resulting band/ribbon specs through `customNetworkLayout` +
// `layoutConfig`. CSR and SSR end up calling the same scene-emit
// function with byte-identical inputs.
export const processSankey: ChartConfig = {
  frameType: "network",
  layout: { margin: { top: 30, right: 80, bottom: 40, left: 80 } },
  buildProps: (_data, colorBy, colorScheme, common, rest) => {
    const toTime = (v: unknown): number => {
      if (v == null) return NaN
      if (v instanceof Date) return v.getTime()
      if (typeof v === "number") return v
      return new Date(v as string).getTime()
    }

    const sourceAccessor = rest.sourceAccessor || "source"
    const targetAccessor = rest.targetAccessor || "target"
    const valueAccessor = rest.valueAccessor || "value"
    const nodeIdAccessor = rest.nodeIdAccessor || "id"
    const startTimeAccessor = rest.startTimeAccessor || "startTime"
    const endTimeAccessor = rest.endTimeAccessor || "endTime"
    const systemInTimeAccessor = rest.systemInTimeAccessor
    const systemOutTimeAccessor = rest.systemOutTimeAccessor
    const xExtentAccessor = rest.xExtentAccessor || "xExtent"
    const edgeIdAccessor = rest.edgeIdAccessor || "id"

    const accVal = (acc: unknown, d: Datum): unknown =>
      typeof acc === "function" ? (acc as (d: Datum) => unknown)(d) : d[acc as string]

    const rawEdges: Datum[] = Array.isArray(rest.edges) ? rest.edges : []
    // Match the HOC: when `nodes` is omitted, infer them from the
    // edge endpoints. Otherwise every edge would emit a "missing-node"
    // validation issue and `renderChart("ProcessSankey", { edges })`
    // would refuse to draw.
    const explicitNodes: Datum[] = Array.isArray(rest.nodes) ? rest.nodes : []
    const rawNodes: Datum[] = explicitNodes.length > 0
      ? explicitNodes
      : (inferNodesFromEdges(
          [],
          rawEdges,
          sourceAccessor as string | ((d: Datum) => string),
          targetAccessor as string | ((d: Datum) => string),
        ) as Datum[])
    const domain: [number, number] = [
      toTime((rest.domain as [unknown, unknown])?.[0]),
      toTime((rest.domain as [unknown, unknown])?.[1]),
    ]

    const ns = rawNodes.map((n) => {
      const id = String(accVal(nodeIdAccessor, n))
      const x = accVal(xExtentAccessor, n)
      const out: { id: string; xExtent?: [number, number]; __raw: Datum } = { id, __raw: n }
      if (Array.isArray(x) && x.length === 2) {
        const a = toTime(x[0]); const b = toTime(x[1])
        if (Number.isFinite(a) && Number.isFinite(b)) out.xExtent = [a, b]
      }
      return out
    })
    const es = rawEdges.map((e, i) => {
      const fromAcc = accVal(edgeIdAccessor, e) as string | undefined
      const id = fromAcc != null ? String(fromAcc) : `${accVal(sourceAccessor, e)}-${accVal(targetAccessor, e)}-${i}`
      const out: {
        id: string
        source: string
        target: string
        value: number
        startTime: number
        endTime: number
        systemInTime?: number
        systemOutTime?: number
        __raw: Datum
      } = {
        id,
        source: String(accVal(sourceAccessor, e)),
        target: String(accVal(targetAccessor, e)),
        value: Number(accVal(valueAccessor, e)),
        startTime: toTime(accVal(startTimeAccessor, e)),
        endTime: toTime(accVal(endTimeAccessor, e)),
        __raw: e,
      }
      if (systemInTimeAccessor) {
        const t = toTime(accVal(systemInTimeAccessor, e))
        if (Number.isFinite(t)) out.systemInTime = t
      }
      if (systemOutTimeAccessor) {
        const t = toTime(accVal(systemOutTimeAccessor, e))
        if (Number.isFinite(t)) out.systemOutTime = t
      }
      return out
    })

    // Resolve the same dimensions `renderNetworkFrame` will use so the
    // bands/ribbons paint to the exact inner plot the SVG <g> reserves.
    // That helper applies its own legend-reservation on top of the
    // margin, so we mirror it here and thread the resolved margin
    // back through frame props (otherwise dimensions diverge and the
    // chart visibly clips against the legend).
    const [width, height] = (common.size as [number, number]) ?? [600, 400]
    const userMargin = common.margin as { top?: number; right?: number; bottom?: number; left?: number } | undefined
    const baseMargin = { top: 20, right: 20, bottom: 20, left: 20, ...userMargin }
    // ProcessSankey owns a categorical legend rather than using the frame's
    // auto-legend. It is active only for an actual categorical accessor.
    const showLegend = common.showLegend ?? Boolean(colorBy)
    const legendActive = showLegend && Boolean(colorBy)
    const legendPos = (common.legendPosition as string | undefined) ?? "right"
    const explicitMargin = common.__explicitMargin as { top?: number; right?: number; bottom?: number; left?: number } | number | undefined
    const marginWasSet = (side: "top" | "right" | "bottom" | "left") =>
      typeof explicitMargin === "number" ||
      (explicitMargin != null && typeof explicitMargin === "object" && explicitMargin[side] != null)
    // Match the HOC's custom legend reservation. Do not overwrite a side the
    // caller explicitly set: that is the contract used for external legends.
    if (legendActive) {
      if (legendPos === "right" && !marginWasSet("right")) baseMargin.right = Math.max(baseMargin.right, 140)
      else if (legendPos === "bottom" && !marginWasSet("bottom")) baseMargin.bottom = Math.max(baseMargin.bottom, 80)
    }
    const margin = baseMargin
    const plotW = width - margin.left - margin.right
    const plotH = height - margin.top - margin.bottom

    // Color resolution mirrors the HOC's: prefer colorScheme array, then
    // categorical fallback. Both string-form (`colorBy="category"`)
    // and function-form (`colorBy={(d) => d.category}`) accessors are
    // honored — `createColorScale` only derives a non-empty domain
    // when colorBy is a string, so function-form goes through a
    // synthetic `_cat` projection (matching what `useColorScale`
    // does on the CSR side) before passing into the d3-scale.
    const resolvedTheme = resolveTheme(common.theme)
    const palette = resolveCategoricalPalette(
      colorScheme,
      resolvedTheme.colors.categorical,
      schemeCategory10,
    )
    const colorByFn = typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSourceData: Datum[] = colorByFn
      ? rawNodes.map((n) => ({ _cat: colorByFn(n) }))
      : rawNodes
    const scaleColorBy: string | ((d: Datum) => string) | undefined = colorByFn
      ? "_cat"
      : (typeof colorBy === "string" ? colorBy : undefined)
    const effectiveScheme = colorScheme ?? [...palette]
    const colorScale = scaleColorBy
      ? createColorScale(scaleSourceData, scaleColorBy, effectiveScheme)
      : null
    const nodeById = new Map<string, Datum>()
    for (const n of ns) nodeById.set(n.id, n.__raw)
    const colorOf = (id: string, idx: number): string => {
      if (colorBy && nodeById.has(id)) {
        const raw = nodeById.get(id) as Datum
        if (colorByFn) {
          // Project through the function to derive the category, then
          // look up in the scale built from the synthetic `_cat` rows.
          return getColor({ _cat: colorByFn(raw) }, "_cat", colorScale ?? undefined) as string
        }
        return getColor(raw, typeof colorBy === "string" ? colorBy : "id", colorScale ?? undefined) as string
      }
      return palette[idx % palette.length]
    }

    // The client HOC supplies a concrete legend config built from its
    // `colorOf` function. Supplying the same config here avoids the generic
    // network auto-legend (whose labels, swatches, and placement differ from
    // ProcessSankey's chart-level legend).
    const chartLegend = legendActive && colorBy ? (() => {
      const seen = new Map<string, { label: string; color: string }>()
      rawNodes.forEach((node, index) => {
        const value = accVal(colorBy, node)
        const label = value == null ? "" : String(value)
        if (!label || seen.has(label)) return
        seen.set(label, { label, color: colorOf(String(accVal(nodeIdAccessor, node)), index) })
      })
      const items = Array.from(seen.values())
      return items.length > 0
        ? {
            legendGroups: [{
              type: "fill" as const,
              label: "",
              items,
              styleFn: (item: { color?: string }) => {
                const color = item.color || "#333"
                return { fill: color, stroke: color }
              },
            }],
          }
        : undefined
    })() : undefined
    const legend = composeLegendConfigs(chartLegend, common.legend)

    const { layout, layoutConfig, issues, xScale } = buildProcessSankeyScenes({
      nodes: ns,
      edges: es,
      domain,
      plotW,
      plotH,
      ribbonLane: rest.ribbonLane || "both",
      edgeOpacity: typeof rest.edgeOpacity === "number" ? (rest.edgeOpacity as number) : 0.35,
      colorOf,
      layoutOpts: {
        pairing: rest.pairing || "temporal",
        packing: rest.packing || "reuse",
        laneOrder: rest.laneOrder || "crossing-min",
        lifetimeMode: rest.lifetimeMode || "half",
      },
    })

    // Surface validation failures the same way the HOC does — throw
    // with the formatted issue list so renderChart() callers see the
    // actionable error instead of silently getting an empty SVG.
    // (The CSR HOC paints an inline error block; SSR can't render
    // arbitrary JSX into the network frame's SVG, so we propagate
    // through the renderChart caller.)
    if (issues.length > 0) {
      const messages = issues.map(formatProcessSankeyIssue).join("; ")
      throw new Error(`ProcessSankey: data invalid — ${messages}`)
    }

    // ProcessSankey's temporal axis is HOC-owned background graphics, not a
    // StreamNetworkFrame feature. Recreate that chrome here from the same
    // pure layout result so SSR gets the baseline, optional ticks, and grids
    // rather than silently dropping the entire time-axis contract.
    const axisTicks = Array.isArray(rest.axisTicks) ? rest.axisTicks as Datum[] : []
    const backgroundGraphics = layout ? (() => {
      let minX: number | null = null
      let maxX: number | null = null
      for (const node of ns) {
        const lifetime = layout.laneLifetime[node.id]
        if (!lifetime || lifetime.start == null || lifetime.end == null) continue
        const start = Number(xScale(lifetime.start))
        const end = Number(xScale(lifetime.end))
        minX = minX == null ? start : Math.min(minX, start)
        maxX = maxX == null ? end : Math.max(maxX, end)
      }
      const clampX = (x: number) => Math.max(0, Math.min(plotW, x))
      const axisLeft = clampX(minX ?? 0)
      const axisRight = Math.max(axisLeft, clampX(maxX ?? plotW))
      const visibleTicks = axisTicks.map((tick, index) => ({ tick, index, x: Number(xScale(toTime(tick.date))) }))
        .filter(({ x }) => x >= axisLeft - 0.5 && x <= axisRight + 0.5)
      return React.createElement("g", null,
        ...visibleTicks.map(({ index, x }) => React.createElement("line", {
          key: `grid-${index}`, x1: x, y1: 0, x2: x, y2: plotH,
          stroke: "#94a3b8", strokeOpacity: 0.15, strokeDasharray: "2 4",
        })),
        React.createElement("line", {
          key: "axis", x1: axisLeft, y1: plotH + 4, x2: axisRight, y2: plotH + 4, stroke: "#94a3b8",
        }),
        ...visibleTicks.map(({ tick, index, x }) => {
          const time = toTime(tick.date)
          const label = tick.label != null
            ? tick.label
            : typeof rest.timeFormat === "function" ? rest.timeFormat(new Date(time)) : ""
          return React.createElement("g", { key: `tick-${index}`, transform: `translate(${x},${plotH + 4})` },
            React.createElement("line", { y2: 6, stroke: "#94a3b8" }),
            React.createElement("text", { y: 20, textAnchor: "middle", fontSize: 11, fill: "#475569" }, label as React.ReactNode),
          )
        }),
      )
    })() : undefined

    return {
      chartType: "force",
      // Pass raw nodes/edges (not pre-wrapped { id, data }) — the
      // frame's `buildRealtimeNodes/buildRealtimeEdges` already wraps
      // them, so a `{ id, data: raw }` input would land as
      // `RealtimeNode.data = { id, data: raw }`. The auto-legend
      // pulls categories off `node.data[colorBy]`, so the double
      // wrap surfaced as an empty/incorrect legend on SSR.
      nodes: rawNodes,
      edges: rawEdges,
      customNetworkLayout: emitProcessSankeyScenes,
      layoutConfig,
      // Thread accessors + colorBy through so the SSR auto-legend can
      // resolve categories. `colorBy` arrives as a positional buildProps
      // arg (not via `common`), so without this passthrough the frame
      // would fall back to nodeIDAccessor and produce per-node swatches
      // instead of per-category. Match the shape SankeyDiagram returns.
      sourceAccessor,
      targetAccessor,
      valueAccessor,
      nodeIDAccessor: nodeIdAccessor,
      colorBy,
      colorScheme,
      ...(backgroundGraphics && { backgroundGraphics }),
      ...common,
      showLegend: legendActive,
      ...(legend && { legend, legendPosition: legendPos }),
      // ProcessSankey owns category extraction because its rendered scene is
      // built from temporal bands rather than ordinary network nodes. The
      // supplied value already includes both that chart-owned legend and any
      // caller groups, so the static frame must not infer it a second time.
      __legendIncludesAutomatic: true,
      // Apply the resolved margin AFTER `...common` so the spread
      // (which carries the user's original margin if any) doesn't
      // overwrite our legend-aware adjustment. Bands/ribbons were
      // computed against this exact `plotW`/`plotH`; without this the
      // frame would overlay the data on a slightly different inner
      // rect (visible as legend-clipping or band-shift).
      margin,
    }
  },
}

export const sankeyDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 800, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const nodes = Array.isArray(rest.nodes) ? rest.nodes as Datum[] : inferNodesFromEdges(
      [],
      Array.isArray(rest.edges) ? rest.edges as Datum[] : [],
      (rest.sourceAccessor || "source") as string | ((d: Datum) => string),
      (rest.targetAccessor || "target") as string | ((d: Datum) => string),
    ) as Datum[]
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const colorKey = typeof colorBy === "string" ? colorBy : "__ssrSankeyColorBy"
    const colorRows = typeof colorBy === "function"
      ? nodes.map(d => ({ ...d, __ssrSankeyColorBy: colorBy(d) }))
      : nodes
    const colorScale = colorBy
      ? createColorScale(colorRows, colorKey, (colorScheme ?? common.colorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        fill: colorBy
          ? getColor(raw, colorBy as string | ((node: Datum) => string), colorScale)
          : resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap),
        stroke: common.stroke ?? "black",
        strokeWidth: common.strokeWidth ?? 1,
        ...(common.opacity !== undefined && { opacity: common.opacity }),
      }
    }
    // HOC wires styleRules into nodeStyle; SSR previously only did this for
    // ForceDirectedGraph, so hatch/threshold fills no-op'd on Sankey SVG.
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules,
      colorBy as string | ((d: Datum) => unknown) | undefined,
    )
    const configuredNodeStyle = ruleNodeStyle
      ? (d: Datum, index?: number) => ({ ...baseNodeStyle(d), ...ruleNodeStyle(d, index) })
      : baseNodeStyle
    const baseEdgeStyle = createEdgeStyleFn({
      edgeColorBy: rest.edgeColorBy ?? "source",
      colorBy: colorBy as string | ((d: Datum) => string) | undefined,
      colorScale,
      nodeStyleFn: configuredNodeStyle,
      edgeOpacity: rest.edgeOpacity ?? 0.5,
      baseStyle: { stroke: "none", strokeWidth: 0 },
    })
    return {
    chartType: "sankey",
    nodes: rest.nodes,
    edges: rest.edges,
    nodeIDAccessor: rest.nodeIdAccessor || rest.nodeIDAccessor,
    sourceAccessor: rest.sourceAccessor,
    targetAccessor: rest.targetAccessor,
    valueAccessor: rest.valueAccessor,
    orientation: rest.orientation,
    nodeAlign: rest.nodeAlign,
    nodeWidth: rest.nodeWidth,
    nodePaddingRatio: rest.nodePaddingRatio,
    showLabels: rest.showLabels,
    nodeLabel: rest.nodeLabel,
    colorBy,
    edgeColorBy: rest.edgeColorBy,
    edgeOpacity: rest.edgeOpacity,
    nodeStyle: common.nodeStyle || rest.nodeStyle || configuredNodeStyle,
    edgeStyle: common.edgeStyle || rest.edgeStyle || baseEdgeStyle,
    colorScheme,
    ...common,
    }
  },
}

export const chordDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const nodes = Array.isArray(rest.nodes) ? rest.nodes as Datum[] : []
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const colorKey = typeof colorBy === "string" ? colorBy : "__ssrChordColorBy"
    const colorRows = typeof colorBy === "function"
      ? nodes.map(d => ({ ...d, __ssrChordColorBy: colorBy(d) }))
      : nodes
    const colorScale = colorBy
      ? createColorScale(colorRows, colorKey, (colorScheme ?? common.colorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        fill: colorBy
          ? getColor(raw, colorBy as string | ((node: Datum) => string), colorScale)
          : resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap),
        stroke: common.stroke ?? "black",
        strokeWidth: common.strokeWidth ?? 1,
        ...(common.opacity !== undefined && { opacity: common.opacity }),
      }
    }
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules,
      colorBy as string | ((d: Datum) => unknown) | undefined,
    )
    const configuredNodeStyle = ruleNodeStyle
      ? (d: Datum, index?: number) => ({ ...baseNodeStyle(d), ...ruleNodeStyle(d, index) })
      : baseNodeStyle
    return {
      chartType: "chord",
      nodes: rest.nodes,
      edges: rest.edges,
      valueAccessor: rest.valueAccessor,
      padAngle: rest.padAngle,
      groupWidth: rest.groupWidth,
      showLabels: rest.showLabels,
      colorBy,
      edgeColorBy: rest.edgeColorBy,
      colorScheme,
      nodeStyle: common.nodeStyle || rest.nodeStyle || configuredNodeStyle,
      ...common,
    }
  },
}

export const treeDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    // Flatten hierarchy so categorical colorBy on leaves gets a full domain
    // (root-only scale previously produced empty/wrong domains).
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[]),
    )
    const colorByFn = typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrTreeColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn ? "__ssrTreeColorBy" : (typeof colorBy === "string" ? colorBy : undefined)
    const colorScale = colorBy && scaleColorKey
      ? createColorScale(scaleSource, scaleColorKey, (colorScheme ?? common.colorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        fill: rest.colorByDepth
          ? DEPTH_PALETTE_COLORS[Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length]
          : colorBy
            ? (colorByFn
                ? getColor({ __ssrTreeColorBy: colorByFn(raw) }, "__ssrTreeColorBy", colorScale ?? undefined)
                : getColor(raw, colorBy as string, colorScale ?? undefined))
            : resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap),
        stroke: common.stroke ?? "black",
        strokeWidth: common.strokeWidth ?? 1,
        ...(common.opacity !== undefined && { opacity: common.opacity }),
      }
    }
    // HOC defaults showLabels true and supplies nodeLabel || nodeIdAccessor;
    // hierarchy scene builders skip labels when nodeLabel is unset.
    const effectiveShowLabels = rest.showLabels !== false
    return {
    chartType: rest.layout === "cluster" ? "cluster" : "tree",
    data,
    childrenAccessor: rest.childrenAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    orientation: rest.orientation,
    showLabels: rest.showLabels,
    nodeLabel: effectiveShowLabels ? (rest.nodeLabel || rest.nodeIdAccessor) : undefined,
    colorScheme,
    ...common,
    nodeStyle: common.nodeStyle || rest.nodeStyle || baseNodeStyle,
    }
  },
}

export const treemap: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // The network hierarchy scene builder resolves fill from the nodeStyle
    // (or a single default fill) — it never applies `colorBy` itself. The
    // Treemap HOC therefore builds fill inside its own nodeStyle via a color
    // scale over the flattened hierarchy; SSR must do the same or every tile
    // collapses to one color. Build the same scale off the leaves so a
    // categorical `colorBy` (e.g. sku) paints distinct tiles.
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[]),
    )
    const colorByFn = typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrTreemapColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn ? "__ssrTreemapColorBy" : (typeof colorBy === "string" ? colorBy : undefined)
    const colorScale = colorBy && scaleColorKey
      ? createColorScale(scaleSource, scaleColorKey, (colorScheme ?? common.colorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      const fill = rest.colorByDepth
        ? DEPTH_PALETTE_COLORS[Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length]
        : colorBy
          ? (colorByFn
              ? getColor({ __ssrTreemapColorBy: colorByFn(raw) }, "__ssrTreemapColorBy", colorScale ?? undefined)
              : getColor(raw, colorBy as string, colorScale ?? undefined))
          : resolveDefaultFill(undefined, themeCategorical, colorScheme as string | string[] | Record<string, string> | undefined, undefined, categoryIndexMap)
      return {
        fill,
        // Preserve Treemap's HOC-level border token. The surrounding page/theme
        // resolves this CSS variable identically for the static SVG and canvas.
        stroke: "var(--semiotic-cell-border, var(--semiotic-border, #fff))",
        strokeWidth: 1,
        strokeOpacity: 0.8,
      }
    }
    // Mirror Treemap.tsx's resolvedPaddingTop: reserve a label band on parent
    // tiles when labels cover parents. Without this SSR parent labels have no
    // room and the tile chrome differs from CSR.
    const effectiveShowLabels = (rest.showLabels ?? common.showLabels) as boolean | undefined
    const labelMode = rest.labelMode as "leaf" | "parent" | "all" | undefined
    const resolvedPaddingTop = rest.paddingTop !== undefined
      ? rest.paddingTop
      : (effectiveShowLabels && (labelMode === "parent" || labelMode === "all") ? 18 : undefined)
    return {
      chartType: "treemap",
      data,
      childrenAccessor: rest.childrenAccessor,
      hierarchySum: rest.valueAccessor,
      colorBy,
      colorByDepth: rest.colorByDepth,
      showLabels: rest.showLabels,
      labelMode,
      nodeLabel: effectiveShowLabels ? (rest.nodeLabel || rest.nodeIdAccessor) : undefined,
      ...(rest.padding != null && { padding: rest.padding }),
      ...(resolvedPaddingTop != null && { paddingTop: resolvedPaddingTop }),
      colorScheme,
      ...common,
      nodeStyle: common.nodeStyle || rest.nodeStyle || baseNodeStyle,
    }
  },
}

export const circlePack: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Mirror Treemap: hierarchy scene builder never applies colorBy itself;
    // HOC builds fill in nodeStyle over flattened nodes. SSR must match or
    // every circle is monochrome and labels never emit.
    const themeCategorical = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0]).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[]),
    )
    const colorByFn = typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrCirclePackColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn ? "__ssrCirclePackColorBy" : (typeof colorBy === "string" ? colorBy : undefined)
    const colorScale = colorBy && scaleColorKey
      ? createColorScale(scaleSource, scaleColorKey, (colorScheme ?? common.colorScheme ?? themeCategorical) as string | string[] | Record<string, string>)
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      const fill = rest.colorByDepth
        ? DEPTH_PALETTE_COLORS[Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length]
        : colorBy
          ? (colorByFn
              ? getColor({ __ssrCirclePackColorBy: colorByFn(raw) }, "__ssrCirclePackColorBy", colorScale ?? undefined)
              : getColor(raw, colorBy as string, colorScale ?? undefined))
          : resolveDefaultFill(undefined, themeCategorical, colorScheme as string | string[] | Record<string, string> | undefined, undefined, categoryIndexMap)
      return {
        fill,
        fillOpacity: rest.circleOpacity ?? 0.7,
        // CirclePack's client style deliberately uses currentColor for the
        // subtle dark outline; hierarchy's generic fallback uses the theme
        // surface (white), which made SSR visibly diverge.
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3,
      }
    }
    const effectiveShowLabels = (rest.showLabels ?? common.showLabels) as boolean | undefined
    return {
      chartType: "circlepack",
      data,
      childrenAccessor: rest.childrenAccessor,
      hierarchySum: rest.valueAccessor,
      colorBy,
      colorByDepth: rest.colorByDepth,
      showLabels: rest.showLabels,
      nodeLabel: effectiveShowLabels ? (rest.nodeLabel || rest.nodeIdAccessor) : undefined,
      ...(rest.padding != null && { padding: rest.padding }),
      colorScheme,
      ...common,
      nodeStyle: common.nodeStyle || rest.nodeStyle || baseNodeStyle,
    }
  },
}
