import type { Datum } from "../charts/shared/datumTypes"
import { buildProcessSankeyScenes } from "../charts/network/processSankey/buildScenes"
import { resolveProcessSankeyMarginDefaults } from "../charts/network/processSankey/frameMargins"
import { buildProcessSankeyBackgroundGraphics } from "../charts/network/processSankey/axisChrome"
import { emitProcessSankeyScenes } from "../charts/network/processSankey/streamingLayout"
import { formatProcessSankeyIssue } from "../charts/network/processSankey/algorithm"
import {
  createEdgeStyleFn,
  inferNodesFromEdges,
  flattenHierarchy
} from "../charts/network/../shared/networkUtils"
import {
  createColorScale,
  getColor,
  resolveCategoricalPalette,
  DEPTH_PALETTE_COLORS
} from "../charts/shared/colorUtils"
import { schemeCategory10 } from "../charts/shared/colorPalettes"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { composeLegendConfigs } from "../types/legendTypes"
import {
  type ChartConfig,
  primitiveStyleOverrides
} from "./serverChartConfigShared"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import {
  composeStyleRules,
  makeNodeRuleContext,
  styleRulesToNodeStyle,
  type StyleRule,
} from "../charts/shared/styleRules"
import { resolveTheme } from "./themeResolver"
import { composeHierarchyNodeStyle } from "./serverChartConfigNetworkStyles"
import * as React from "react"

// ── Network Charts ─────────────────────────────────────────────────────
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
    const groupBy = rest.groupBy
    const edgeIdAccessor = rest.edgeIdAccessor || "id"

    const accVal = (acc: unknown, d: Datum): unknown =>
      typeof acc === "function"
        ? (acc as (d: Datum) => unknown)(d)
        : d[acc as string]

    const rawEdges: Datum[] = Array.isArray(rest.edges) ? rest.edges : []
    // Match the HOC: when `nodes` is omitted, infer them from the
    // edge endpoints. Otherwise every edge would emit a "missing-node"
    // validation issue and `renderChart("ProcessSankey", { edges })`
    // would refuse to draw.
    const explicitNodes: Datum[] = Array.isArray(rest.nodes) ? rest.nodes : []
    const rawNodes: Datum[] =
      explicitNodes.length > 0
        ? explicitNodes
        : (inferNodesFromEdges(
            [],
            rawEdges,
            sourceAccessor as string | ((d: Datum) => string),
            targetAccessor as string | ((d: Datum) => string)
          ) as Datum[])
    const domain: [number, number] = [
      toTime((rest.domain as [unknown, unknown])?.[0]),
      toTime((rest.domain as [unknown, unknown])?.[1])
    ]

    const ns = rawNodes.map((n) => {
      const id = String(accVal(nodeIdAccessor, n))
      const x = accVal(xExtentAccessor, n)
      const labelValue = rest.nodeLabel ? accVal(rest.nodeLabel, n) : id
      const out: {
        id: string
        label: string
        group?: string
        xExtent?: [number, number]
        __raw: Datum
      } = { id, label: labelValue == null ? id : String(labelValue), __raw: n }
      const groupValue = groupBy ? accVal(groupBy, n) : null
      if (groupValue != null && String(groupValue) !== "")
        out.group = String(groupValue)
      if (Array.isArray(x) && x.length === 2) {
        const a = toTime(x[0])
        const b = toTime(x[1])
        if (Number.isFinite(a) && Number.isFinite(b)) out.xExtent = [a, b]
      }
      return out
    })
    const es = rawEdges.map((e, i) => {
      const fromAcc = accVal(edgeIdAccessor, e) as string | undefined
      const id =
        fromAcc != null
          ? String(fromAcc)
          : `${accVal(sourceAccessor, e)}-${accVal(targetAccessor, e)}-${i}`
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
        __raw: e
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
    const userMargin = common.margin as
      | { top?: number; right?: number; bottom?: number; left?: number }
      | undefined
    const orientation =
      rest.orientation === "vertical" ? "vertical" : "horizontal"
    const hasAxisTicks =
      Array.isArray(rest.axisTicks) && rest.axisTicks.length > 0
    const hasTitle = Boolean(common.title)
    const showQualityReadout = Boolean(rest.showQualityReadout)
    const defaultMargin = resolveProcessSankeyMarginDefaults(
      hasTitle,
      showQualityReadout,
      hasAxisTicks,
      orientation
    )
    const baseMargin = { ...defaultMargin, ...userMargin }
    // ProcessSankey owns a categorical legend rather than using the frame's
    // auto-legend. It is active only for an actual categorical accessor.
    const showLegend = common.showLegend ?? Boolean(colorBy)
    const legendActive = showLegend && Boolean(colorBy)
    const legendPos = (common.legendPosition as string | undefined) ?? "right"
    // Match the HOC's custom legend reservation. Numeric caller margins are
    // minima, so the chart-owned legend can grow its side when necessary.
    if (legendActive) {
      if (legendPos === "right")
        baseMargin.right = Math.max(baseMargin.right, 140)
      else if (legendPos === "left")
        baseMargin.left = Math.max(baseMargin.left, 140)
      else if (legendPos === "top")
        baseMargin.top = Math.max(baseMargin.top, 50)
      else if (legendPos === "bottom")
        baseMargin.bottom = Math.max(baseMargin.bottom, 80)
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
      schemeCategory10
    )
    const colorByFn =
      typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSourceData: Datum[] = colorByFn
      ? rawNodes.map((n) => ({ _cat: colorByFn(n) }))
      : rawNodes
    const scaleColorBy: string | ((d: Datum) => string) | undefined = colorByFn
      ? "_cat"
      : typeof colorBy === "string"
        ? colorBy
        : undefined
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
          return getColor(
            { _cat: colorByFn(raw) },
            "_cat",
            colorScale ?? undefined
          ) as string
        }
        return getColor(
          raw,
          typeof colorBy === "string" ? colorBy : "id",
          colorScale ?? undefined
        ) as string
      }
      return palette[idx % palette.length]
    }

    // The client HOC supplies a concrete legend config built from its
    // `colorOf` function. Supplying the same config here avoids the generic
    // network auto-legend (whose labels, swatches, and placement differ from
    // ProcessSankey's chart-level legend).
    const chartLegend =
      legendActive && colorBy
        ? (() => {
            const seen = new Map<string, { label: string; color: string }>()
            rawNodes.forEach((node, index) => {
              const value = accVal(colorBy, node)
              const label = value == null ? "" : String(value)
              if (!label || seen.has(label)) return
              seen.set(label, {
                label,
                color: colorOf(String(accVal(nodeIdAccessor, node)), index)
              })
            })
            const items = Array.from(seen.values())
            return items.length > 0
              ? {
                  legendGroups: [
                    {
                      type: "fill" as const,
                      label: "",
                      items,
                      styleFn: (item: { color?: string }) => {
                        const color = item.color || "#333"
                        return { fill: color, stroke: color }
                      }
                    }
                  ]
                }
              : undefined
          })()
        : undefined
    const legend = composeLegendConfigs(chartLegend, common.legend)

    const showLabels =
      rest.showLabels === false
        ? false
        : rest.showLabels === "auto"
          ? ("auto" as const)
          : true
    const { layout, layoutConfig, issues, xScale } = buildProcessSankeyScenes({
      nodes: ns,
      edges: es,
      domain,
      plotW,
      plotH,
      orientation,
      ribbonLane: rest.ribbonLane || "both",
      ribbonMinRun:
        rest.ribbonMinRun === "auto" || typeof rest.ribbonMinRun === "number"
          ? rest.ribbonMinRun
          : 0,
      edgeOpacity:
        typeof rest.edgeOpacity === "number"
          ? (rest.edgeOpacity as number)
          : 0.35,
      colorOf,
      showLabels,
      styleRules: rest.styleRules,
      colorBy: colorBy as string | ((d: Datum) => unknown) | undefined,
      valueAccessor: valueAccessor as
        string | ((d: Datum) => unknown) | undefined,
      layoutOpts: {
        pairing: rest.pairing || "temporal",
        packing: rest.packing || "reuse",
        laneOrder: rest.laneOrder || "crossing-min",
        lifetimeMode: rest.lifetimeMode || "half",
        maxValueScale:
          typeof rest.maxValueScale === "number"
            ? rest.maxValueScale
            : undefined,
        lanePlacement: rest.lanePlacement || "stack",
        nodeSizing: rest.nodeSizing || "temporal",
        groupPadding:
          typeof rest.groupPadding === "number" ? rest.groupPadding : 0
      }
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
    const backgroundGraphics = layout
      ? buildProcessSankeyBackgroundGraphics({
          layout,
          nodes: ns,
          orientation,
          plotW,
          plotH,
          timelineExtent: orientation === "vertical" ? plotH : plotW,
          axisTicks: Array.isArray(rest.axisTicks)
            ? (rest.axisTicks as Array<{ date: unknown; label?: string }>).map(
                (tick) => ({
                  date: tick.date as string | number | Date,
                  label: tick.label
                })
              )
            : [],
          showQualityReadout: Boolean(rest.showQualityReadout),
          showLaneRails: Boolean(rest.showLaneRails),
          timeFormat:
            typeof rest.timeFormat === "function"
              ? (d: Date) =>
                  (rest.timeFormat as (d: Date) => string | React.ReactNode)(d)
              : undefined,
          colorOf,
          toTime: (v) => toTime(v),
          xScale: (t) => Number(xScale(t))
        })
      : undefined

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
      margin
    }
  }
}

export const sankeyDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 800, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const nodes = Array.isArray(rest.nodes)
      ? (rest.nodes as Datum[])
      : (inferNodesFromEdges(
          [],
          Array.isArray(rest.edges) ? (rest.edges as Datum[]) : [],
          (rest.sourceAccessor || "source") as string | ((d: Datum) => string),
          (rest.targetAccessor || "target") as string | ((d: Datum) => string)
        ) as Datum[])
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const colorKey =
      typeof colorBy === "string" ? colorBy : "__ssrSankeyColorBy"
    const colorRows =
      typeof colorBy === "function"
        ? nodes.map((d) => ({ ...d, __ssrSankeyColorBy: colorBy(d) }))
        : nodes
    const colorScale = colorBy
      ? createColorScale(
          colorRows,
          colorKey,
          (colorScheme ?? common.colorScheme ?? themeCategorical) as
            string | string[] | Record<string, string>
        )
      : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        fill: colorBy
          ? getColor(
              raw,
              colorBy as string | ((node: Datum) => string),
              colorScale
            )
          : resolveDefaultFill(
              undefined,
              themeCategorical,
              colorScheme,
              undefined,
              categoryIndexMap
            ),
        // `stroke`/`strokeWidth`/`opacity` are not COMMON_FRAME_PROP_KEYS, so
        // reading them off `common` always fell through to the defaults.
        stroke: (rest.stroke as string | undefined) ?? "black",
        strokeWidth: (rest.strokeWidth as number | undefined) ?? 1,
        ...(rest.opacity !== undefined && { opacity: rest.opacity })
      }
    }
    // Wire styleRules into nodeStyle for hatch and threshold fills.
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules,
      colorBy as string | ((d: Datum) => unknown) | undefined,
      rest.valueAccessor as string | ((d: Datum) => unknown) | undefined
    )
    const configuredNodeStyle = ruleNodeStyle
      ? (d: Datum, index?: number) => ({
          ...baseNodeStyle(d),
          ...ruleNodeStyle(d, index)
        })
      : baseNodeStyle
    const baseEdgeStyle = createEdgeStyleFn({
      edgeColorBy: rest.edgeColorBy ?? "source",
      colorBy: colorBy as string | ((d: Datum) => string) | undefined,
      colorScale,
      nodeStyleFn: configuredNodeStyle,
      edgeOpacity: rest.edgeOpacity ?? 0.5,
      baseStyle: { stroke: "none", strokeWidth: 0 }
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
      nodeStyle: mergeShapeStyle(
        (rest.nodeStyle || configuredNodeStyle) as (d: Datum) => Datum,
        primitiveStyleOverrides(rest)
      ),
      edgeStyle: mergeShapeStyle(
        (rest.edgeStyle || baseEdgeStyle) as (d: Datum) => Datum,
        primitiveStyleOverrides(rest)
      ),
      colorScheme,
      // `...common` last, mirroring the HOC's trailing `{...frameProps}`.
      ...common,
      showLegend: (common.showLegend ?? Boolean(colorBy)) && Boolean(colorBy)
    }
  }
}

export const treeDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    // Flatten the hierarchy so categorical colorBy on leaves gets a full domain.
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[])
    )
    const colorByFn =
      typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrTreeColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn
      ? "__ssrTreeColorBy"
      : typeof colorBy === "string"
        ? colorBy
        : undefined
    const colorScale =
      colorBy && scaleColorKey
        ? createColorScale(
            scaleSource,
            scaleColorKey,
            (colorScheme ?? common.colorScheme ?? themeCategorical) as
              string | string[] | Record<string, string>
          )
        : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      return {
        fill: rest.colorByDepth
          ? DEPTH_PALETTE_COLORS[
              Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length
            ]
          : colorBy
            ? colorByFn
              ? getColor(
                  { __ssrTreeColorBy: colorByFn(raw) },
                  "__ssrTreeColorBy",
                  colorScale ?? undefined
                )
              : getColor(raw, colorBy as string, colorScale ?? undefined)
            : resolveDefaultFill(
                undefined,
                themeCategorical,
                colorScheme,
                undefined,
                categoryIndexMap
              ),
        // `stroke`/`strokeWidth`/`opacity` are not COMMON_FRAME_PROP_KEYS, so
        // reading them off `common` always fell through to the defaults.
        stroke: (rest.stroke as string | undefined) ?? "black",
        strokeWidth: (rest.strokeWidth as number | undefined) ?? 1,
        ...(rest.opacity !== undefined && { opacity: rest.opacity })
      }
    }
    // HOC defaults showLabels true and supplies nodeLabel || nodeIdAccessor;
    // hierarchy scene builders skip labels when nodeLabel is unset.
    const effectiveShowLabels = rest.showLabels !== false
    const userNodeStyle = (common.nodeStyle || rest.nodeStyle) as
      | ((d: Datum) => Record<string, unknown> | undefined | null)
      | Record<string, unknown>
      | undefined
    const ruledNodeStyle = composeStyleRules(
      baseNodeStyle,
      rest.styleRules as StyleRule[] | undefined,
      makeNodeRuleContext(
        colorBy as string | ((d: Datum) => unknown) | undefined,
        rest.valueAccessor as string | ((d: Datum) => unknown) | undefined,
      ),
      (d) => (d?.data as Datum) || d,
    )
    return {
      chartType: rest.layout === "cluster" ? "cluster" : "tree",
      data,
      childrenAccessor: rest.childrenAccessor,
      colorBy,
      colorByDepth: rest.colorByDepth,
      orientation: rest.orientation,
      showLabels: rest.showLabels,
      nodeLabel: effectiveShowLabels
        ? rest.nodeLabel || rest.nodeIdAccessor
        : undefined,
      colorScheme,
      ...common,
      showLegend:
        (common.showLegend ?? Boolean(colorBy && !rest.colorByDepth)) &&
        Boolean(colorBy && !rest.colorByDepth),
      nodeStyle: composeHierarchyNodeStyle(
        ruledNodeStyle,
        userNodeStyle,
        primitiveStyleOverrides(rest)
      )
    }
  }
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
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[])
    )
    const colorByFn =
      typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrTreemapColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn
      ? "__ssrTreemapColorBy"
      : typeof colorBy === "string"
        ? colorBy
        : undefined
    const colorScale =
      colorBy && scaleColorKey
        ? createColorScale(
            scaleSource,
            scaleColorKey,
            (colorScheme ?? common.colorScheme ?? themeCategorical) as
              string | string[] | Record<string, string>
          )
        : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      const fill = rest.colorByDepth
        ? DEPTH_PALETTE_COLORS[
            Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length
          ]
        : colorBy
          ? colorByFn
            ? getColor(
                { __ssrTreemapColorBy: colorByFn(raw) },
                "__ssrTreemapColorBy",
                colorScale ?? undefined
              )
            : getColor(raw, colorBy as string, colorScale ?? undefined)
          : resolveDefaultFill(
              undefined,
              themeCategorical,
              colorScheme as
                string | string[] | Record<string, string> | undefined,
              undefined,
              categoryIndexMap
            )
      return {
        fill,
        // Preserve Treemap's HOC-level border token. The surrounding page/theme
        // resolves this CSS variable identically for the static SVG and canvas.
        stroke: "var(--semiotic-cell-border, var(--semiotic-border, #fff))",
        strokeWidth: 1,
        strokeOpacity: 0.8
      }
    }
    // Mirror Treemap.tsx's resolvedPaddingTop: reserve a label band on parent
    // tiles when labels cover parents. Without this SSR parent labels have no
    // room and the tile chrome differs from CSR. Prefer top-level rest, then
    // frameProps (already flattened into `common`) so hide-root wrappers that
    // pass paddingTop only via frameProps still get the nested header band.
    const effectiveShowLabels = (rest.showLabels ?? common.showLabels) as
      boolean | undefined
    const labelMode = rest.labelMode as "leaf" | "parent" | "all" | undefined
    const explicitPaddingTop =
      rest.paddingTop !== undefined ? rest.paddingTop : common.paddingTop
    const resolvedPaddingTop =
      explicitPaddingTop !== undefined
        ? explicitPaddingTop
        : effectiveShowLabels && (labelMode === "parent" || labelMode === "all")
          ? 18
          : undefined
    // Compose like Treemap.tsx: base colorBy/colorByDepth fill + user overlay
    // (hide-root transparent fill, custom borders). Replace-not-compose made
    // any custom nodeStyle drop color encoding → monochrome "flat" tiles.
    const userNodeStyle = (common.nodeStyle || rest.nodeStyle) as
      | ((d: Datum) => Record<string, unknown> | undefined | null)
      | Record<string, unknown>
      | undefined
    const ruledNodeStyle = composeStyleRules(
      baseNodeStyle,
      rest.styleRules as StyleRule[] | undefined,
      makeNodeRuleContext(
        colorBy as string | ((d: Datum) => unknown) | undefined,
        rest.valueAccessor as string | ((d: Datum) => unknown) | undefined,
      ),
      (d) => (d?.data as Datum) || d,
    )
    return {
      chartType: "treemap",
      data,
      childrenAccessor: rest.childrenAccessor,
      hierarchySum: rest.valueAccessor,
      colorBy,
      colorByDepth: rest.colorByDepth,
      showLabels: rest.showLabels,
      labelMode,
      nodeLabel: effectiveShowLabels
        ? rest.nodeLabel || rest.nodeIdAccessor
        : undefined,
      ...(rest.padding != null && { padding: rest.padding }),
      ...(resolvedPaddingTop != null && { paddingTop: resolvedPaddingTop }),
      colorScheme,
      ...common,
      showLegend:
        (common.showLegend ?? Boolean(colorBy && !rest.colorByDepth)) &&
        Boolean(colorBy && !rest.colorByDepth),
      nodeStyle: composeHierarchyNodeStyle(
        ruledNodeStyle,
        userNodeStyle,
        primitiveStyleOverrides(rest)
      )
    }
  }
}

export { chordDiagram } from "./serverChartConfigsNetworkChord"
export { forceDirectedGraph } from "./serverChartConfigsNetworkForce"
export { circlePack, orbitDiagram } from "./serverChartConfigsNetworkHierarchy"
