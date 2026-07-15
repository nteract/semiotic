import type { Datum } from "../charts/shared/datumTypes"
import { buildProcessSankeyScenes } from "../charts/network/processSankey/buildScenes"
import { emitProcessSankeyScenes } from "../charts/network/processSankey/streamingLayout"
import { formatProcessSankeyIssue } from "../charts/network/processSankey/algorithm"
import { inferNodesFromEdges } from "../charts/network/../shared/networkUtils"
import { createColorScale, getColor } from "../charts/shared/colorUtils"
import { type ChartConfig } from "./serverChartConfigShared"

// ── Network Charts ─────────────────────────────────────────────────────

export const forceDirectedGraph: ChartConfig = {
  frameType: "network",
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
      showLabels: rest.showLabels,
      nodeLabel: rest.nodeLabel,
      nodeSize: rest.nodeSize,
      nodeSizeRange: rest.nodeSizeRange,
      nodeStyle: rest.nodeStyle,
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
    const showLegend = Boolean(common.showLegend)
    const legendPos = (common.legendPosition as string | undefined) ?? "right"
    if (showLegend) {
      if (legendPos === "right") baseMargin.right = Math.max(baseMargin.right, 100)
      else if (legendPos === "left") baseMargin.left = Math.max(baseMargin.left, 100)
      else if (legendPos === "bottom") baseMargin.bottom = Math.max(baseMargin.bottom, 70)
      else if (legendPos === "top") baseMargin.top = Math.max(baseMargin.top, 40)
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
    const palette = Array.isArray(colorScheme) ? colorScheme : null
    const fallbackPalette = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"]
    const colorByFn = typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSourceData: Datum[] = colorByFn
      ? rawNodes.map((n) => ({ _cat: colorByFn(n) }))
      : rawNodes
    const scaleColorBy: string | ((d: Datum) => string) | undefined = colorByFn
      ? "_cat"
      : (typeof colorBy === "string" ? colorBy : undefined)
    const colorScale = scaleColorBy
      ? createColorScale(scaleSourceData, scaleColorBy, colorScheme)
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
      const p = palette || fallbackPalette
      return p[idx % p.length]
    }

    const { layoutConfig, issues } = buildProcessSankeyScenes({
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
      ...common,
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
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
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
    nodeStyle: rest.nodeStyle,
    edgeStyle: rest.edgeStyle,
    colorScheme,
    ...common,
  }),
}

export const chordDiagram: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
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
    ...common,
  }),
}

export const treeDiagram: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: rest.layout === "cluster" ? "cluster" : "tree",
    data,
    childrenAccessor: rest.childrenAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    orientation: rest.orientation,
    showLabels: rest.showLabels,
    colorScheme,
    ...common,
  }),
}

export const treemap: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "treemap",
    data,
    childrenAccessor: rest.childrenAccessor,
    hierarchySum: rest.valueAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    showLabels: rest.showLabels,
    colorScheme,
    ...common,
  }),
}

export const circlePack: ChartConfig = {
  frameType: "network",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "circlepack",
    data,
    childrenAccessor: rest.childrenAccessor,
    hierarchySum: rest.valueAccessor,
    colorBy,
    colorByDepth: rest.colorByDepth,
    colorScheme,
    ...common,
  }),
}
