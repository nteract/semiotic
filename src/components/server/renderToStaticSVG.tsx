/**
 * Server-side rendering of Semiotic charts to standalone SVG strings.
 *
 * Uses the shared SceneToSVG converters (same code used by Stream Frames
 * for SSR) plus PipelineStore / OrdinalPipelineStore / NetworkPipelineStore
 * for scene graph computation.
 *
 * Features:
 * - Theme inlining (resolve presets to concrete SVG styles)
 * - Legend rendering (categorical color swatches)
 * - Accessibility (title, desc, role="img")
 * - Grid lines
 * - Annotations (y-threshold, x-threshold, band, label, text, category-highlight)
 * - renderChart HOC-level API
 */

import * as React from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOMServer = require("react-dom/server") as { renderToStaticMarkup: (element: React.ReactElement) => string }

import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import type {
  StreamXYFrameProps,
  StreamScales,
  StreamLayout
} from "../stream/types"

import { getLayoutPlugin } from "../stream/layouts"
import { NetworkPipelineStore } from "../stream/NetworkPipelineStore"
import type {
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  StreamNetworkFrameProps,
  NetworkChartType
} from "../stream/networkTypes"

import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type {
  OrdinalPipelineConfig,
  StreamOrdinalFrameProps
} from "../stream/ordinalTypes"

import { GeoPipelineStore } from "../stream/GeoPipelineStore"
import type { GeoPipelineConfig, StreamGeoFrameProps } from "../stream/geoTypes"

// Shared scene → SVG converters
import {
  xySceneNodeToSVG,
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG,
  ordinalSceneNodeToSVG,
  geoSceneNodeToSVG
} from "../stream/SceneToSVG"

// Server-specific modules
import { resolveTheme, themeStyles, type ThemeInput } from "./themeResolver"
import { renderStaticLegend, extractCategories } from "./staticLegend"
import { renderStaticAnnotations } from "./staticAnnotations"
import { createSVGHatchPattern } from "./svgHatchPattern"
import type { SemioticTheme } from "../store/ThemeStore"

type FrameType = "xy" | "ordinal" | "network" | "geo"

/** Generate a short stable ID from chart props for unique SVG element IDs */
function chartUID(props: Record<string, any>): string {
  // Prefer _idPrefix (set by renderDashboard), then chartId, then hash
  const raw = props._idPrefix || props.chartId
  if (raw) return String(raw).replace(/[^a-zA-Z0-9_-]/g, "_")
  const key = `${props.chartType || ""}:${props.title || ""}:${Array.isArray(props.data) ? props.data.length : 0}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return `c${(h >>> 0).toString(36)}`
}

// ── Shared rendering helpers ──────────────────────────────────────────

interface ThemeAwareProps {
  theme?: ThemeInput
  showLegend?: boolean
  showGrid?: boolean
  annotations?: Record<string, any>[]
  title?: string | React.ReactNode
  description?: string
  background?: string
  className?: string
  /** Prefix for SVG element IDs — used by renderDashboard to avoid collisions */
  _idPrefix?: string
}

function defaultTickFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
}

/** Render grid lines for XY charts */
function renderGridSVG(
  scales: StreamScales,
  layout: StreamLayout,
  theme: SemioticTheme,
  idPrefix?: string
): React.ReactNode {
  const { grid } = themeStyles(theme)
  const pfx = idPrefix ? `${idPrefix}-` : ""
  const xTicks = scales.x.ticks(5)
  const yTicks = scales.y.ticks(5)

  return (
    <g id={`${pfx}grid`} className="semiotic-grid" opacity={0.8}>
      {xTicks.map((v: number, i: number) => {
        const px = scales.x(v)
        return (
          <line key={`gx-${i}`} x1={px} y1={0} x2={px} y2={layout.height}
            stroke={grid} strokeWidth={0.5} />
        )
      })}
      {yTicks.map((v: number, i: number) => {
        const py = scales.y(v)
        return (
          <line key={`gy-${i}`} x1={0} y1={py} x2={layout.width} y2={py}
            stroke={grid} strokeWidth={0.5} />
        )
      })}
    </g>
  )
}

/** Render grid lines for ordinal charts */
function renderOrdinalGridSVG(
  store: OrdinalPipelineStore,
  layout: { width: number; height: number },
  theme: SemioticTheme,
  idPrefix?: string
): React.ReactNode {
  const scales = store.scales
  if (!scales || scales.projection === "radial") return null
  const { grid } = themeStyles(theme)
  const pfx = idPrefix ? `${idPrefix}-` : ""
  const isVertical = scales.projection === "vertical"
  const rTicks = scales.r.ticks(5)

  if (isVertical) {
    return (
      <g id={`${pfx}grid`} className="semiotic-grid" opacity={0.8}>
        {rTicks.map((v: number, i: number) => {
          const py = scales.r(v)
          return (
            <line key={`gr-${i}`} x1={0} y1={py} x2={layout.width} y2={py}
              stroke={grid} strokeWidth={0.5} />
          )
        })}
      </g>
    )
  } else {
    return (
      <g id={`${pfx}grid`} className="semiotic-grid" opacity={0.8}>
        {rTicks.map((v: number, i: number) => {
          const px = scales.r(v)
          return (
            <line key={`gr-${i}`} x1={px} y1={0} x2={px} y2={layout.height}
              stroke={grid} strokeWidth={0.5} />
          )
        })}
      </g>
    )
  }
}

/** Wrap SVG content with accessibility attributes */
function wrapSVG(
  content: React.ReactNode,
  opts: {
    width: number
    height: number
    className: string
    title?: string | React.ReactNode
    description?: string
    background?: string
    theme: SemioticTheme
    innerTransform: string
    innerWidth: number
    innerHeight: number
    legend?: React.ReactNode
    outerElements?: React.ReactNode
    defs?: React.ReactNode
    /** Prefix for SVG element IDs to avoid collisions in multi-chart documents */
    idPrefix?: string
  }
): React.ReactElement {
  const s = themeStyles(opts.theme)
  const pfx = opts.idPrefix ? `${opts.idPrefix}-` : ""
  const titleText = typeof opts.title === "string" ? opts.title : undefined
  const titleId = titleText ? `${pfx}semiotic-title` : undefined
  const descId = opts.description ? `${pfx}semiotic-desc` : undefined
  const labelledBy = [titleId, descId].filter(Boolean).join(" ") || undefined

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={opts.className}
      width={opts.width}
      height={opts.height}
      role="img"
      aria-labelledby={labelledBy}
      style={{ fontFamily: s.fontFamily }}
    >
      {titleText && <title id={titleId}>{titleText}</title>}
      {opts.description && <desc id={descId}>{opts.description}</desc>}
      {opts.defs && <defs>{opts.defs}</defs>}
      {opts.background && opts.background !== "transparent" && (
        <rect x={0} y={0} width={opts.width} height={opts.height} fill={opts.background} />
      )}
      <g id={`${pfx}data-area`} transform={opts.innerTransform}>
        {content}
      </g>
      {titleText && (
        <text
          id={`${pfx}chart-title`}
          x={opts.width / 2} y={16}
          textAnchor="middle"
          fontSize={s.titleSize}
          fontWeight="bold"
          fill={s.text}
          fontFamily={s.fontFamily}
        >
          {titleText}
        </text>
      )}
      {opts.legend && <g id={`${pfx}legend`}>{opts.legend}</g>}
      {opts.outerElements}
    </svg>
  )
}

// ── Axis generation ─────────────────────────────────────────────────────

function generateAxesSVG(
  scales: StreamScales,
  layout: StreamLayout,
  props: StreamXYFrameProps,
  theme: SemioticTheme,
  idPrefix?: string
): React.ReactNode {
  const s = themeStyles(theme)
  const xTicks = scales.x.ticks(5).map(v => ({
    pixel: scales.x(v),
    label: (props.xFormat || props.tickFormatTime || defaultTickFormat)(v)
  }))

  const yTicks = scales.y.ticks(5).map(v => ({
    pixel: scales.y(v),
    label: (props.yFormat || props.tickFormatValue || defaultTickFormat)(v)
  }))

  return (
    <g id={`${idPrefix ? `${idPrefix}-` : ""}axes`} className="stream-axes">
      <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke={s.border} strokeWidth={1} />
      {xTicks.map((tick, i) => (
        <g key={`xtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
          <line y2={5} stroke={s.border} strokeWidth={1} />
          <text y={18} textAnchor="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
        </g>
      ))}
      {props.xLabel && (
        <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}>
          {props.xLabel}
        </text>
      )}

      <line x1={0} y1={0} x2={0} y2={layout.height} stroke={s.border} strokeWidth={1} />
      {yTicks.map((tick, i) => (
        <g key={`ytick-${i}`} transform={`translate(0,${tick.pixel})`}>
          <line x2={-5} stroke={s.border} strokeWidth={1} />
          <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>
            {tick.label}
          </text>
        </g>
      ))}
      {props.yLabel && (
        <text
          x={-(props.margin?.left ?? 40) + 15}
          y={layout.height / 2}
          textAnchor="middle"
          fontSize={s.labelSize}
          fill={s.text}
          fontFamily={s.fontFamily}
          transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
        >
          {props.yLabel}
        </text>
      )}
    </g>
  )
}

// ── StreamXYFrame SSR ───────────────────────────────────────────────────

function renderStreamXYFrame(props: StreamXYFrameProps & ThemeAwareProps): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 300]
  const margin = { ...defaultMargin, ...props.margin }

  // Expand margin for legend BEFORE calculating inner dimensions
  const legendPos = (props as any).legendPosition
  if (props.showLegend) {
    if (!legendPos || legendPos === "right") margin.right = Math.max(margin.right, 100)
    else if (legendPos === "left") margin.left = Math.max(margin.left, 100)
    else if (legendPos === "bottom") margin.bottom = Math.max(margin.bottom, 70)
    else if (legendPos === "top") margin.top = Math.max(margin.top, 40)
  }

  const width = size[0] - margin.left - margin.right
  const height = size[1] - margin.top - margin.bottom

  const isStreaming = props.runtimeMode === "streaming" ||
    ["bar", "swarm", "waterfall"].includes(props.chartType)

  // Use theme's categorical palette when no explicit colorScheme provided
  const effectiveColorScheme = props.colorScheme || theme.colors.categorical

  const pipelineConfig: PipelineConfig = {
    chartType: props.chartType,
    windowSize: props.windowSize ?? 200,
    windowMode: props.windowMode ?? "sliding",
    arrowOfTime: isStreaming ? (props.arrowOfTime ?? "right") : "right",
    extentPadding: props.extentPadding ?? 0.1,
    xAccessor: isStreaming ? undefined : props.xAccessor,
    yAccessor: isStreaming ? undefined : props.yAccessor,
    timeAccessor: isStreaming ? props.timeAccessor : undefined,
    valueAccessor: props.valueAccessor,
    colorAccessor: props.colorAccessor,
    sizeAccessor: props.sizeAccessor,
    groupAccessor: props.groupAccessor,
    categoryAccessor: props.categoryAccessor,
    lineDataAccessor: props.lineDataAccessor,
    xExtent: props.xExtent,
    yExtent: props.yExtent,
    sizeRange: props.sizeRange,
    binSize: props.binSize,
    normalize: props.normalize,
    boundsAccessor: props.boundsAccessor,
    boundsStyle: props.boundsStyle,
    openAccessor: props.openAccessor,
    highAccessor: props.highAccessor,
    lowAccessor: props.lowAccessor,
    closeAccessor: props.closeAccessor,
    candlestickStyle: props.candlestickStyle,
    lineStyle: props.lineStyle,
    pointStyle: props.pointStyle,
    areaStyle: props.areaStyle,
    colorScheme: effectiveColorScheme,
    barColors: props.barColors
  }

  const store = new PipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: props.data, bounded: true })
  }

  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(null, {
        width: size[0], height: size[1],
        className: `stream-xy-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
        idPrefix: (props as any)._idPrefix,
      })
    )
  }

  const idPfx = (props as ThemeAwareProps)._idPrefix
  const grid = props.showGrid ? renderGridSVG(store.scales, { width, height }, theme, idPfx) : null

  const dataMarks = store.scene
    .map((node, i) => xySceneNodeToSVG(node, i))
    .filter(Boolean)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateAxesSVG(store.scales, { width, height }, props, theme, idPfx)
    : null

  // Annotations
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    scales: { x: store.scales.x, y: store.scales.y },
    layout: { width, height },
    theme,
    xAccessor: typeof props.xAccessor === "string" ? props.xAccessor : undefined,
    yAccessor: typeof props.yAccessor === "string" ? props.yAccessor : undefined,
    idPrefix: idPfx,
  }) : null

  // Legend
  const legend = props.showLegend ? (() => {
    const colorAccessor = props.colorAccessor || props.groupAccessor
    const categories = extractCategories(props.data || [], colorAccessor)
    if (categories.length === 0) return null
    return renderStaticLegend({
      categories,
      colorScheme: props.colorScheme,
      theme,
      position: (props as any).legendPosition || "right",
      totalWidth: size[0],
      totalHeight: size[1],
      margin,
      hasTitle: !!props.title,
    })
  })() : null

  const content = (
    <>
      {grid}
      {annotationNodes}
      {dataMarks}
      {axes}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-xy-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${margin.left},${margin.top})`,
      innerWidth: width, innerHeight: height,
      legend,
      idPrefix: (props as ThemeAwareProps)._idPrefix,
    })
  )
}

// ── Helper functions for building RealtimeNodes/Edges from props ────────

function resolveAccessor(
  accessor: string | ((d: any) => any) | undefined,
  defaultKey: string
): (d: any) => any {
  if (!accessor) return (d: any) => d[defaultKey]
  if (typeof accessor === "function") return accessor
  return (d: any) => d[accessor]
}

function buildRealtimeNodes(
  propsNodes: any[],
  config: NetworkPipelineConfig
): RealtimeNode[] {
  const nodeIDFn = resolveAccessor(config.nodeIDAccessor, "id")
  return propsNodes.map((d) => ({
    id: String(nodeIDFn(d)),
    // Preserve pre-set positions from source data (for pinned layouts)
    x: d.x ?? 0, y: d.y ?? 0,
    x0: 0, x1: 0, y0: 0, y1: 0,
    width: 0, height: 0, value: 0, data: d
  }))
}

function buildRealtimeEdges(
  propsEdges: any[],
  config: NetworkPipelineConfig
): RealtimeEdge[] {
  const sourceFn = resolveAccessor(config.sourceAccessor, "source")
  const targetFn = resolveAccessor(config.targetAccessor, "target")
  const valueFn = resolveAccessor(config.valueAccessor, "value")
  return propsEdges.map((d) => ({
    source: String(sourceFn(d)),
    target: String(targetFn(d)),
    value: Number(valueFn(d)) || 1,
    y0: 0, y1: 0, sankeyWidth: 0, data: d
  }))
}

// ── Network SSR ─────────────────────────────────────────────────────────

const HIERARCHICAL_TYPES: Set<string> = new Set([
  "tree", "cluster", "treemap", "circlepack", "partition"
])

function renderNetworkFrame(props: StreamNetworkFrameProps & ThemeAwareProps): string {
  const theme = resolveTheme(props.theme)
  const chartType: NetworkChartType = props.chartType || "force"
  const size: [number, number] = props.size || [500, 500]
  const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 }
  const margin = { ...defaultMargin, ...props.margin }
  const innerWidth = size[0] - margin.left - margin.right
  const innerHeight = size[1] - margin.top - margin.bottom

  const plugin = getLayoutPlugin(chartType)
  if (!plugin) {
    throw new Error(
      `No layout plugin found for chart type: "${chartType}". ` +
      `Supported types: force, sankey, chord, tree, cluster, treemap, circlepack, partition.`
    )
  }

  const config: NetworkPipelineConfig = {
    chartType,
    nodeIDAccessor: props.nodeIDAccessor,
    sourceAccessor: props.sourceAccessor,
    targetAccessor: props.targetAccessor,
    valueAccessor: props.valueAccessor,
    childrenAccessor: props.childrenAccessor,
    hierarchySum: props.hierarchySum,
    orientation: props.orientation,
    nodeAlign: props.nodeAlign,
    nodePaddingRatio: props.nodePaddingRatio,
    nodeWidth: props.nodeWidth,
    iterations: props.iterations,
    forceStrength: props.forceStrength,
    padAngle: props.padAngle,
    groupWidth: props.groupWidth,
    sortGroups: props.sortGroups,
    edgeSort: props.edgeSort,
    treeOrientation: props.treeOrientation,
    edgeType: props.edgeType,
    padding: props.padding,
    paddingTop: props.paddingTop,
    nodeStyle: props.nodeStyle,
    edgeStyle: props.edgeStyle,
    nodeLabel: props.nodeLabel,
    showLabels: props.showLabels,
    colorBy: props.colorBy,
    colorScheme: props.colorScheme || theme.colors.categorical,
    edgeColorBy: props.edgeColorBy,
    edgeOpacity: props.edgeOpacity,
    colorByDepth: props.colorByDepth,
    nodeSize: props.nodeSize,
    nodeSizeRange: props.nodeSizeRange
  }

  let nodes: RealtimeNode[]
  let edges: RealtimeEdge[]

  if (HIERARCHICAL_TYPES.has(chartType)) {
    const hierarchyRoot = props.data || props.edges
    if (!hierarchyRoot || Array.isArray(hierarchyRoot)) {
      return ReactDOMServer.renderToStaticMarkup(
        wrapSVG(null, {
          width: size[0], height: size[1],
          className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
          title: props.title, description: props.description, background: props.background,
          theme, innerTransform: `translate(${margin.left},${margin.top})`,
          innerWidth, innerHeight,
        idPrefix: (props as any)._idPrefix,
        })
      )
    }
    (config as any).__hierarchyRoot = hierarchyRoot
    nodes = []
    edges = []
  } else {
    const propsNodes = props.nodes || []
    const propsEdges = Array.isArray(props.edges) ? props.edges : []

    if (propsNodes.length === 0 && propsEdges.length === 0) {
      return ReactDOMServer.renderToStaticMarkup(
        wrapSVG(null, {
          width: size[0], height: size[1],
          className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
          title: props.title, description: props.description, background: props.background,
          theme, innerTransform: `translate(${margin.left},${margin.top})`,
          innerWidth, innerHeight,
        idPrefix: (props as any)._idPrefix,
        })
      )
    }

    edges = buildRealtimeEdges(propsEdges, config)

    if (propsNodes.length === 0 && edges.length > 0) {
      const nodeIds = new Set<string>()
      for (const e of edges) {
        const src = typeof e.source === "string" ? e.source : e.source.id
        const tgt = typeof e.target === "string" ? e.target : e.target.id
        nodeIds.add(src)
        nodeIds.add(tgt)
      }
      nodes = Array.from(nodeIds).map((id) => ({
        id,
        x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0,
        width: 0, height: 0, value: 0, data: { id }
      }))
    } else {
      nodes = buildRealtimeNodes(propsNodes, config)
    }
  }

  plugin.computeLayout(nodes, edges, config, [innerWidth, innerHeight])

  const { sceneNodes, sceneEdges, labels } = plugin.buildScene(
    nodes, edges, config, [innerWidth, innerHeight]
  )

  // Apply theme text color to labels (layout plugins default to #333)
  const s = themeStyles(theme)
  for (const label of labels) {
    if (!label.fill) label.fill = s.text
  }

  const edgeElements = sceneEdges
    .map((edge, i) => networkSceneEdgeToSVG(edge, i))
    .filter(Boolean)

  const nodeElements = sceneNodes
    .map((node, i) => networkSceneNodeToSVG(node, i))
    .filter(Boolean)

  const labelElements = labels
    .map((label, i) => networkLabelToSVG(label, i))
    .filter(Boolean)

  const content = (
    <>
      {edgeElements}
      {nodeElements}
      {labelElements}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${margin.left},${margin.top})`,
      innerWidth, innerHeight,
        idPrefix: (props as any)._idPrefix,
    })
  )
}

// ── Ordinal SSR ─────────────────────────────────────────────────────────

function generateOrdinalAxesSVG(
  store: OrdinalPipelineStore,
  layout: { width: number; height: number },
  props: StreamOrdinalFrameProps,
  theme: SemioticTheme,
  idPrefix?: string
): React.ReactNode {
  const scales = store.scales
  if (!scales) return null
  if (scales.projection === "radial") return null

  const s = themeStyles(theme)
  const isVertical = scales.projection === "vertical"
  const columns = store.columns

  const categoryTicks = Object.values(columns).map(col => ({
    pixel: col.middle,
    label: (props.oFormat || String)(col.name)
  }))

  const rTicks = scales.r.ticks(5).map(v => ({
    pixel: scales.r(v),
    label: (props.rFormat || defaultTickFormat)(v)
  }))

  if (isVertical) {
    return (
      <g id={`${idPrefix ? `${idPrefix}-` : ""}axes`} className="ordinal-axes">
        <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oxtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
            <line y2={5} stroke={s.border} strokeWidth={1} />
            <text y={18} textAnchor="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {props.oLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}>
            {props.oLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {rTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke={s.border} strokeWidth={1} />
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {props.rLabel && (
          <text
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
          >
            {props.rLabel}
          </text>
        )}
      </g>
    )
  } else {
    return (
      <g id={`${idPrefix ? `${idPrefix}-` : ""}axes`} className="ordinal-axes">
        <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {rTicks.map((tick, i) => (
          <g key={`oxtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
            <line y2={5} stroke={s.border} strokeWidth={1} />
            <text y={18} textAnchor="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {props.rLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}>
            {props.rLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke={s.border} strokeWidth={1} />
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {props.oLabel && (
          <text
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
          >
            {props.oLabel}
          </text>
        )}
      </g>
    )
  }
}

function renderOrdinalFrame(props: StreamOrdinalFrameProps & ThemeAwareProps): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 400]
  const margin = { ...defaultMargin, ...props.margin }

  // Expand margin for legend BEFORE calculating inner dimensions
  const legendPos = (props as any).legendPosition
  if (props.showLegend) {
    if (!legendPos || legendPos === "right") margin.right = Math.max(margin.right, 100)
    else if (legendPos === "left") margin.left = Math.max(margin.left, 100)
    else if (legendPos === "bottom") margin.bottom = Math.max(margin.bottom, 70)
    else if (legendPos === "top") margin.top = Math.max(margin.top, 40)
  }

  const width = size[0] - margin.left - margin.right
  const height = size[1] - margin.top - margin.bottom

  const projection = props.projection || "vertical"
  const isRadial = projection === "radial"

  // Use theme's categorical palette when no explicit colorScheme provided
  const effectiveColorScheme = props.colorScheme || theme.colors.categorical

  const pipelineConfig: OrdinalPipelineConfig = {
    chartType: props.chartType,
    windowSize: props.windowSize ?? 10000,
    windowMode: props.windowMode ?? "sliding",
    extentPadding: props.extentPadding ?? 0.05,
    projection,
    oAccessor: props.oAccessor,
    rAccessor: props.rAccessor,
    colorAccessor: props.colorAccessor,
    stackBy: props.stackBy,
    groupBy: props.groupBy,
    categoryAccessor: props.categoryAccessor,
    valueAccessor: props.valueAccessor,
    timeAccessor: props.timeAccessor,
    rExtent: props.rExtent,
    oExtent: props.oExtent,
    barPadding: props.barPadding,
    innerRadius: props.innerRadius,
    normalize: props.normalize,
    startAngle: props.startAngle,
    bins: props.bins,
    showOutliers: props.showOutliers,
    showIQR: props.showIQR,
    amplitude: props.amplitude,
    oSort: props.oSort,
    connectorAccessor: props.connectorAccessor,
    connectorStyle: props.connectorStyle,
    dynamicColumnWidth: props.dynamicColumnWidth,
    pieceStyle: props.pieceStyle,
    summaryStyle: props.summaryStyle,
    colorScheme: effectiveColorScheme,
    barColors: props.barColors
  }

  const store = new OrdinalPipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: props.data, bounded: true })
  }

  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(null, {
        width: size[0], height: size[1],
        className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
        idPrefix: (props as any)._idPrefix,
      })
    )
  }

  const idPfx = (props as ThemeAwareProps)._idPrefix
  const grid = props.showGrid ? renderOrdinalGridSVG(store, { width, height }, theme, idPfx) : null

  // Check for bar-funnel dropoff bars — they need SVG hatch patterns
  const hasDropoffBars = store.scene.some(
    (n: any) => n.type === "rect" && n.datum?.__barFunnelIsDropoff
  )
  let hatchDefs: React.ReactNode = null
  if (hasDropoffBars) {
    const uid = chartUID(props)
    // Build a hatch pattern for each unique fill color used by dropoff bars
    const dropoffColors = new Set<string>()
    for (const n of store.scene) {
      if (n.type === "rect" && (n as any).datum?.__barFunnelIsDropoff) {
        const fill = typeof n.style.fill === "string" ? n.style.fill : "#666"
        dropoffColors.add(fill)
      }
    }
    hatchDefs = Array.from(dropoffColors).map((color, i) =>
      createSVGHatchPattern({
        id: `funnel-hatch-${uid}-${i}`,
        background: color,
        stroke: theme.colors.background === "transparent" ? "#fff" : theme.colors.background,
        lineWidth: 1.5,
        spacing: 5,
        angle: 45,
      })
    )
    // Replace dropoff bar fills with pattern references
    const colorToPatternId = new Map<string, string>()
    Array.from(dropoffColors).forEach((c, i) => colorToPatternId.set(c, `funnel-hatch-${uid}-${i}`))
    for (const n of store.scene) {
      if (n.type === "rect" && (n as any).datum?.__barFunnelIsDropoff) {
        const origFill = typeof n.style.fill === "string" ? n.style.fill : "#666"
        n.style = { ...n.style, fill: `url(#${colorToPatternId.get(origFill)})` }
      }
    }
  }

  const dataMarks = store.scene
    .map((node, i) => ordinalSceneNodeToSVG(node, i))
    .filter(Boolean)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateOrdinalAxesSVG(store, { width, height }, props, theme, idPfx)
    : null

  // Annotations
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    scales: {
      r: store.scales.r,
      y: store.scales.projection === "vertical" ? store.scales.r : undefined,
    },
    layout: { width, height },
    theme,
    projection: projection as "vertical" | "horizontal" | "radial",
    idPrefix: idPfx,
  }) : null

  // Legend
  const legend = props.showLegend ? (() => {
    const colorAccessor = props.colorAccessor || props.stackBy || props.groupBy
    const categories = extractCategories(props.data || [], colorAccessor)
    if (categories.length === 0) return null
    return renderStaticLegend({
      categories,
      colorScheme: props.colorScheme,
      theme,
      position: (props as any).legendPosition || "right",
      totalWidth: size[0],
      totalHeight: size[1],
      margin,
      hasTitle: !!props.title,
    })
  })() : null

  const translateX = isRadial ? margin.left + width / 2 : margin.left
  const translateY = isRadial ? margin.top + height / 2 : margin.top

  const content = (
    <>
      {grid}
      {annotationNodes}
      {dataMarks}
      {axes}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${translateX},${translateY})`,
      innerWidth: width, innerHeight: height,
      legend,
      defs: hatchDefs,
        idPrefix: (props as any)._idPrefix,
    })
  )
}

// ── Geo SSR ─────────────────────────────────────────────────────────────

function renderGeoFrame(props: StreamGeoFrameProps & ThemeAwareProps): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 10, right: 10, bottom: 10, left: 10 }
  const size: [number, number] = props.size || [props.width || 600, props.height || 400]
  const margin = { ...defaultMargin, ...props.margin }
  const width = size[0] - (margin.left ?? 0) - (margin.right ?? 0)
  const height = size[1] - (margin.top ?? 0) - (margin.bottom ?? 0)

  const config: GeoPipelineConfig = {
    projection: props.projection || "equalEarth",
    xAccessor: props.xAccessor,
    yAccessor: props.yAccessor,
    lineDataAccessor: props.lineDataAccessor,
    pointIdAccessor: props.pointIdAccessor,
    lineType: props.lineType,
    areaStyle: props.areaStyle as any,
    pointStyle: props.pointStyle as any,
    lineStyle: props.lineStyle as any,
    graticule: props.graticule,
    fitPadding: props.fitPadding,
    projectionTransform: props.projectionTransform,
  }

  const store = new GeoPipelineStore(config)

  if (props.areas) {
    if (typeof props.areas === "string") {
      throw new Error(
        `Geo SSR requires pre-resolved GeoJSON features. ` +
        `Reference string "${props.areas}" cannot be resolved synchronously. ` +
        `Use \`const features = await resolveReferenceGeography('${props.areas}')\` ` +
        `before calling renderGeoToStaticSVG.`
      )
    }
    store.setAreas(props.areas)
  }
  if (props.points) store.setPoints(props.points as any[])
  if (props.lines) store.setLines(props.lines as any[])

  store.computeScene({ width, height })

  if (store.scene.length === 0) {
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(null, {
        width: size[0], height: size[1],
        className: `stream-geo-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left ?? 0},${margin.top ?? 0})`,
        innerWidth: width, innerHeight: height,
        idPrefix: (props as any)._idPrefix,
      })
    )
  }

  const dataMarks = store.scene
    .map((node, i) => geoSceneNodeToSVG(node, i))
    .filter(Boolean)

  const content = (
    <>
      {dataMarks}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-geo-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${margin.left ?? 0},${margin.top ?? 0})`,
      innerWidth: width, innerHeight: height,
        idPrefix: (props as any)._idPrefix,
    })
  )
}

// ── Public API ──────────────────────────────────────────────────────────

export function renderToStaticSVG(
  frameType: FrameType,
  props: (StreamXYFrameProps | StreamNetworkFrameProps | StreamOrdinalFrameProps | StreamGeoFrameProps) & ThemeAwareProps
): string {
  switch (frameType) {
    case "xy":
      return renderStreamXYFrame(props as StreamXYFrameProps & ThemeAwareProps)
    case "ordinal":
      return renderOrdinalFrame(props as StreamOrdinalFrameProps & ThemeAwareProps)
    case "network":
      return renderNetworkFrame(props as StreamNetworkFrameProps & ThemeAwareProps)
    case "geo":
      return renderGeoFrame(props as StreamGeoFrameProps & ThemeAwareProps)
    default:
      throw new Error(
        `Unknown frame type: ${frameType}. Must be "xy", "ordinal", "network", or "geo".`
      )
  }
}

export function renderXYToStaticSVG(props: StreamXYFrameProps & ThemeAwareProps): string {
  return renderStreamXYFrame(props)
}

export function renderOrdinalToStaticSVG(props: StreamOrdinalFrameProps & ThemeAwareProps): string {
  return renderOrdinalFrame(props)
}

export function renderNetworkToStaticSVG(props: StreamNetworkFrameProps & ThemeAwareProps): string {
  return renderNetworkFrame(props)
}

export function renderGeoToStaticSVG(props: StreamGeoFrameProps & ThemeAwareProps): string {
  return renderGeoFrame(props)
}

// ── HOC-level renderChart API ─────────────────────────────────────────

/** Chart component name to frame type + props mapping */
type ChartName =
  | "LineChart" | "AreaChart" | "StackedAreaChart" | "Scatterplot"
  | "BubbleChart" | "ConnectedScatterplot" | "Heatmap" | "Sparkline"
  | "BarChart" | "StackedBarChart" | "GroupedBarChart"
  | "PieChart" | "DonutChart" | "SwimlaneChart"
  | "Histogram" | "BoxPlot" | "ViolinPlot" | "SwarmPlot"
  | "DotPlot" | "RidgelinePlot" | "FunnelChart" | "GaugeChart"
  | "ForceDirectedGraph" | "SankeyDiagram" | "ChordDiagram"
  | "TreeDiagram" | "Treemap" | "CirclePack"
  | "ChoroplethMap" | "ProportionalSymbolMap"

interface RenderChartOptions {
  /** Output format — currently only "svg" is synchronous */
  format?: "svg"
}

/**
 * Render a chart using HOC-level props (categoryAccessor, valueAccessor, etc.)
 * instead of frame-level props (oAccessor, rAccessor, etc.).
 *
 * This is the primary API for AI/MCP workflows.
 */
export function renderChart(
  component: ChartName,
  props: Record<string, any>,
  _options?: RenderChartOptions
): string {
  // Extract common props
  const {
    data, width = 600, height = 400, theme, title, description,
    showLegend, showGrid, background, className, annotations,
    margin, colorScheme, colorBy, legendPosition,
    ...rest
  } = props

  const size: [number, number] = [width, height]
  // Flatten frameProps into common — spread first so explicit top-level props always win
  const framePropsOverrides = rest.frameProps || {}
  const common: ThemeAwareProps & { size: [number, number]; margin?: any; colorScheme?: any; legendPosition?: string } = {
    ...framePropsOverrides,
    theme, title, description, showLegend, showGrid, background, className, annotations,
    size,
    ...(margin !== undefined && { margin }),
    ...(colorScheme !== undefined && { colorScheme }),
    ...(legendPosition !== undefined && { legendPosition }),
    _idPrefix: rest._idPrefix,
  }

  switch (component) {
    // ── XY Charts ──────────────────────────────────────────────────
    case "Sparkline":
      return renderStreamXYFrame({
        chartType: "line",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        groupAccessor: rest.lineBy || colorBy,
        colorAccessor: colorBy,
        ...common,
        // Sparkline-specific overrides — always applied regardless of frameProps
        showAxes: false,
        margin: common.margin || { top: 2, right: 2, bottom: 2, left: 2 },
        showLegend: false,
        showGrid: false,
        title: undefined,
      } as any)

    case "LineChart":
      return renderStreamXYFrame({
        chartType: "line",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        groupAccessor: rest.lineBy || colorBy,
        lineDataAccessor: rest.lineDataAccessor,
        colorAccessor: colorBy,
        ...common,
      } as any)

    case "AreaChart":
      return renderStreamXYFrame({
        chartType: "area",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        groupAccessor: rest.areaBy || colorBy,
        colorAccessor: colorBy,
        ...common,
      } as any)

    case "StackedAreaChart":
      return renderStreamXYFrame({
        chartType: "stackedarea",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        groupAccessor: rest.areaBy,
        colorAccessor: colorBy || rest.areaBy,
        normalize: rest.normalize,
        ...common,
      } as any)

    case "Scatterplot":
    case "BubbleChart":
      return renderStreamXYFrame({
        chartType: "scatter",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        colorAccessor: colorBy,
        sizeAccessor: rest.sizeBy,
        sizeRange: rest.sizeRange || (component === "BubbleChart" ? [5, 40] : undefined),
        ...common,
      } as any)

    case "ConnectedScatterplot":
      return renderStreamXYFrame({
        chartType: "scatter",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        colorAccessor: colorBy,
        ...common,
      } as any)

    case "Heatmap":
      return renderStreamXYFrame({
        chartType: "heatmap",
        data,
        xAccessor: rest.xAccessor || "x",
        yAccessor: rest.yAccessor || "y",
        valueAccessor: rest.valueAccessor || "value",
        colorScheme: colorScheme || "blues",
        ...common,
      } as any)

    // ── Ordinal Charts ─────────────────────────────────────────────
    case "BarChart":
      return renderOrdinalFrame({
        chartType: "bar",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
        colorAccessor: colorBy,
        barPadding: rest.barPadding,
        ...common,
      } as any)

    case "StackedBarChart":
      return renderOrdinalFrame({
        chartType: "bar",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        stackBy: rest.stackBy,
        projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
        colorAccessor: colorBy || rest.stackBy,
        normalize: rest.normalize,
        barPadding: rest.barPadding,
        ...common,
      } as any)

    case "GroupedBarChart":
      return renderOrdinalFrame({
        chartType: "clusterbar",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        groupBy: rest.groupBy,
        projection: rest.orientation === "horizontal" ? "horizontal" : "vertical",
        colorAccessor: colorBy || rest.groupBy,
        barPadding: rest.barPadding,
        ...common,
      } as any)

    case "PieChart":
      return renderOrdinalFrame({
        chartType: "pie",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        projection: "radial",
        colorAccessor: colorBy || rest.categoryAccessor || "category",
        ...common,
      } as any)

    case "DonutChart":
      return renderOrdinalFrame({
        chartType: "donut",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        projection: "radial",
        innerRadius: rest.innerRadius || 60,
        colorAccessor: colorBy || rest.categoryAccessor || "category",
        ...common,
      } as any)

    case "Histogram":
      return renderOrdinalFrame({
        chartType: "histogram",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        bins: rest.bins || 25,
        projection: "horizontal",
        ...common,
      } as any)

    case "BoxPlot":
      return renderOrdinalFrame({
        chartType: "boxplot",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        colorAccessor: colorBy,
        ...common,
      } as any)

    case "ViolinPlot":
      return renderOrdinalFrame({
        chartType: "violin",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        colorAccessor: colorBy,
        bins: rest.bins,
        ...common,
      } as any)

    case "SwarmPlot":
      return renderOrdinalFrame({
        chartType: "swarm",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        colorAccessor: colorBy,
        ...common,
      } as any)

    case "DotPlot":
      return renderOrdinalFrame({
        chartType: "point",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        colorAccessor: colorBy,
        ...common,
        showGrid: showGrid ?? true,
      } as any)

    case "SwimlaneChart":
      return renderOrdinalFrame({
        chartType: "swimlane",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        stackBy: rest.subcategoryAccessor,
        projection: rest.orientation === "vertical" ? "vertical" : "horizontal",
        colorAccessor: colorBy || rest.subcategoryAccessor,
        barPadding: rest.barPadding,
        ...common,
      } as any)

    case "FunnelChart": {
      const isVerticalFunnel = rest.orientation === "vertical"
      return renderOrdinalFrame({
        chartType: isVerticalFunnel ? "bar-funnel" : "funnel",
        data,
        oAccessor: rest.stepAccessor || "step",
        rAccessor: rest.valueAccessor || "value",
        ...(rest.categoryAccessor && { stackBy: rest.categoryAccessor }),
        projection: isVerticalFunnel ? "vertical" : "horizontal",
        colorAccessor: colorBy || rest.categoryAccessor,
        barPadding: isVerticalFunnel ? (rest.barPadding ?? 40) : (rest.barPadding ?? 0),
        ...(!isVerticalFunnel && {
          connectorAccessor: () => true,
          connectorStyle: { opacity: rest.connectorOpacity ?? 0.3 },
        }),
        showAxes: isVerticalFunnel,
        showCategoryTicks: isVerticalFunnel,
        showGrid: isVerticalFunnel,
        showLabels: rest.showLabels,
        ...common,
      } as any)
    }

    case "RidgelinePlot":
      return renderOrdinalFrame({
        chartType: "ridgeline",
        data,
        oAccessor: rest.categoryAccessor || "category",
        rAccessor: rest.valueAccessor || "value",
        bins: rest.bins,
        amplitude: rest.amplitude,
        ...common,
      } as any)

    case "GaugeChart": {
      const gMin = rest.min ?? 0
      const gMax = rest.max ?? 100
      const sweep = rest.sweep ?? 240
      const arcWidth = rest.arcWidth ?? 0.3
      const gapDeg = 360 - sweep
      const startAngleDeg = 180 + gapDeg / 2

      // Build zone data from thresholds
      const thresholds = rest.thresholds || [{ value: gMax, color: "#4e79a7" }]
      const zoneData = thresholds.map((t: any, i: number) => ({
        category: t.label || `zone-${i}`,
        value: t.value - (i > 0 ? thresholds[i - 1].value : gMin),
      }))
      const zoneColors: Record<string, string> = {}
      thresholds.forEach((t: any, i: number) => {
        zoneColors[t.label || `zone-${i}`] = t.color || "#4e79a7"
      })

      // Compute from inner (margin-adjusted) dimensions — same as renderOrdinalFrame
      const resolvedMargin = margin || { top: 20, right: 20, bottom: 30, left: 40 }
      const innerWidth = (width || 300) - resolvedMargin.left - resolvedMargin.right
      const innerHeight = (height || 300) - resolvedMargin.top - resolvedMargin.bottom
      const chartSize = Math.min(innerWidth, innerHeight)
      const innerRadius = Math.max(10, (chartSize / 2) * (1 - arcWidth))

      // Compute needle angle from value (guard divide-by-zero)
      const gaugeValue = Math.max(gMin, Math.min(gMax, rest.value ?? gMin))
      const valueFraction = gMax === gMin ? 0 : (gaugeValue - gMin) / (gMax - gMin)
      const needleAngleDeg = startAngleDeg + valueFraction * sweep
      const needleAngleRad = (needleAngleDeg - 90) * Math.PI / 180
      const outerRadius = chartSize / 2
      const needleLen = outerRadius * 0.85
      // Center of the radial chart — margin offset + half inner dimension
      const cx = resolvedMargin.left + innerWidth / 2
      const cy = resolvedMargin.top + innerHeight / 2
      const resolvedTheme = resolveTheme(theme)
      const needleColor = resolvedTheme.colors.text

      const baseSvg = renderOrdinalFrame({
        chartType: "donut",
        data: zoneData,
        oAccessor: "category",
        rAccessor: "value",
        projection: "radial",
        innerRadius,
        sweepAngle: sweep,
        startAngle: startAngleDeg,
        oSort: false,
        pieceStyle: (d: any, cat?: string) => ({ fill: zoneColors[cat || ""] || "#4e79a7" }),
        ...common,
        showAxes: false,
      } as any)

      // Inject needle line before closing </svg>
      const needleSvg = `<line x1="${cx}" y1="${cy}" x2="${cx + needleLen * Math.cos(needleAngleRad)}" y2="${cy + needleLen * Math.sin(needleAngleRad)}" stroke="${needleColor}" stroke-width="2.5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4" fill="${needleColor}"/>`
      return baseSvg.replace("</svg>", `${needleSvg}</svg>`)
    }

    // ── Network Charts ─────────────────────────────────────────────
    case "ForceDirectedGraph":
      return renderNetworkFrame({
        chartType: "force",
        nodes: rest.nodes,
        edges: rest.edges,
        nodeIDAccessor: rest.nodeIDAccessor,
        sourceAccessor: rest.sourceAccessor,
        targetAccessor: rest.targetAccessor,
        colorBy: colorBy,
        colorScheme,
        iterations: rest.iterations,
        forceStrength: rest.forceStrength,
        showLabels: rest.showLabels,
        nodeLabel: rest.nodeLabel,
        nodeSize: rest.nodeSize,
        nodeSizeRange: rest.nodeSizeRange,
        nodeStyle: rest.nodeStyle,
        edgeStyle: rest.edgeStyle,
        ...common,
      } as any)

    case "SankeyDiagram":
      return renderNetworkFrame({
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
        colorBy: colorBy,
        edgeColorBy: rest.edgeColorBy,
        edgeOpacity: rest.edgeOpacity,
        nodeStyle: rest.nodeStyle,
        edgeStyle: rest.edgeStyle,
        colorScheme,
        ...common,
      } as any)

    case "ChordDiagram":
      return renderNetworkFrame({
        chartType: "chord",
        nodes: rest.nodes,
        edges: rest.edges,
        valueAccessor: rest.valueAccessor,
        padAngle: rest.padAngle,
        groupWidth: rest.groupWidth,
        showLabels: rest.showLabels,
        colorBy: colorBy,
        edgeColorBy: rest.edgeColorBy,
        colorScheme,
        ...common,
      } as any)

    case "TreeDiagram":
      return renderNetworkFrame({
        chartType: rest.layout === "cluster" ? "cluster" : "tree",
        data: data,
        childrenAccessor: rest.childrenAccessor,
        colorBy: colorBy,
        colorByDepth: rest.colorByDepth,
        orientation: rest.orientation,
        showLabels: rest.showLabels,
        colorScheme,
        ...common,
      } as any)

    case "Treemap":
      return renderNetworkFrame({
        chartType: "treemap",
        data: data,
        childrenAccessor: rest.childrenAccessor,
        hierarchySum: rest.valueAccessor,
        colorBy: colorBy,
        colorByDepth: rest.colorByDepth,
        showLabels: rest.showLabels,
        colorScheme,
        ...common,
      } as any)

    case "CirclePack":
      return renderNetworkFrame({
        chartType: "circlepack",
        data: data,
        childrenAccessor: rest.childrenAccessor,
        hierarchySum: rest.valueAccessor,
        colorBy: colorBy,
        colorByDepth: rest.colorByDepth,
        colorScheme,
        ...common,
      } as any)

    // ── Geo Charts ─────────────────────────────────────────────────
    case "ChoroplethMap":
      return renderGeoFrame({
        areas: rest.areas,
        projection: rest.projection || "equalEarth",
        areaStyle: rest.areaStyle,
        graticule: rest.graticule,
        fitPadding: rest.fitPadding,
        ...common,
      } as any)

    case "ProportionalSymbolMap":
      return renderGeoFrame({
        points: rest.points,
        areas: rest.areas,
        xAccessor: rest.xAccessor || "lon",
        yAccessor: rest.yAccessor || "lat",
        pointStyle: rest.pointStyle,
        projection: rest.projection || "equalEarth",
        graticule: rest.graticule,
        fitPadding: rest.fitPadding,
        ...common,
      } as any)

    default:
      throw new Error(
        `Unknown chart component: "${component}". ` +
        `See CLAUDE.md for supported chart types.`
      )
  }
}

// ── Image export ────────────────────────────────────────────────────────

export interface RenderToImageOptions {
  /** Output format */
  format?: "png" | "jpeg"
  /** Scale factor (e.g., 2 for retina) */
  scale?: number
  /** Background color (overrides theme) */
  background?: string
}

/**
 * Render a chart to a PNG or JPEG Buffer.
 *
 * Requires `sharp` as an optional peer dependency.
 * Falls back to a descriptive error if sharp is not installed.
 */
export async function renderToImage(
  frameTypeOrComponent: FrameType | ChartName,
  props: Record<string, any>,
  options: RenderToImageOptions = {}
): Promise<Buffer> {
  const { format = "png", scale = 1, background } = options

  // Generate SVG
  let svg: string
  const frameTypes = ["xy", "ordinal", "network", "geo"]
  if (frameTypes.includes(frameTypeOrComponent)) {
    svg = renderToStaticSVG(frameTypeOrComponent as FrameType, props as any)
  } else {
    svg = renderChart(frameTypeOrComponent as ChartName, props)
  }

  // Apply background if specified
  if (background) {
    svg = svg.replace(/<svg /, `<svg style="background:${background}" `)
  }

  // Load sharp dynamically — optional dep, loaded at call time only.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let sharp: any
  try {
    const sharpModule = "sharp"
    sharp = require(sharpModule)
  } catch {
    throw new Error(
      `Image export requires the "sharp" package and a Node.js runtime. Install it:\n` +
      `  npm install sharp\n` +
      `sharp is listed as an optional dependency of semiotic.`
    )
  }

  const width = props.width || props.size?.[0] || 600
  const height = props.height || props.size?.[1] || 400

  const svgBuffer = typeof globalThis.Buffer !== "undefined"
    ? globalThis.Buffer.from(svg)
    : new TextEncoder().encode(svg)
  const pipeline = sharp(svgBuffer, { density: 72 * scale })
    .resize(Math.round(width * scale), Math.round(height * scale))

  if (format === "jpeg") {
    return pipeline.jpeg({ quality: 90 }).toBuffer()
  }
  return pipeline.png().toBuffer()
}

// ── Dashboard composition ──────────────────────────────────────────────

export interface DashboardChart {
  /** Frame type or HOC component name */
  component?: ChartName
  frameType?: FrameType
  /** Chart props (data, accessors, etc.) */
  props: Record<string, any>
  /** Span multiple columns (for emphasis="primary") */
  colSpan?: number
}

export interface DashboardLayout {
  /** Number of columns */
  columns?: number
  /** Gap between charts in pixels */
  gap?: number
}

export interface RenderDashboardOptions {
  title?: string
  subtitle?: string
  theme?: ThemeInput
  width?: number
  height?: number
  layout?: DashboardLayout
  background?: string
  /** Output format */
  format?: "svg"
}

/**
 * Compose multiple charts into a single SVG.
 */
export function renderDashboard(
  charts: DashboardChart[],
  options: RenderDashboardOptions = {}
): string {
  const {
    title,
    subtitle,
    theme: themeInput,
    width = 1200,
    height: heightInput,
    layout = {},
    background,
  } = options

  const theme = resolveTheme(themeInput)
  const s = themeStyles(theme)
  const columns = layout.columns || 2
  const gap = layout.gap ?? 16

  // Header height
  let headerHeight = 0
  if (title) headerHeight += 30
  if (subtitle) headerHeight += 20
  if (headerHeight > 0) headerHeight += 10 // padding

  // Compute cell dimensions
  const chartAreaWidth = width - gap
  const cellWidth = Math.floor((chartAreaWidth - gap * (columns - 1)) / columns)

  // Lay out charts in rows
  const rows: { chart: DashboardChart; x: number; y: number; w: number; h: number }[] = []
  let col = 0
  let rowY = headerHeight + gap
  let rowHeight = 0
  const defaultCellHeight = 300

  for (const chart of charts) {
    const span = Math.min(chart.colSpan || 1, columns)
    const cellW = cellWidth * span + gap * (span - 1)
    const cellH = chart.props.height || defaultCellHeight

    // Wrap to next row if needed
    if (col + span > columns) {
      rowY += rowHeight + gap
      col = 0
      rowHeight = 0
    }

    const x = gap / 2 + col * (cellWidth + gap)
    rows.push({ chart, x, y: rowY, w: cellW, h: cellH })
    rowHeight = Math.max(rowHeight, cellH)
    col += span
  }

  const totalHeight = heightInput || (rowY + rowHeight + gap)

  // Render each chart as an embedded SVG
  const chartElements = rows.map((item, i) => {
    const { chart, x, y, w, h } = item
    const chartProps = {
      ...chart.props,
      width: w,
      height: h,
      theme: themeInput,
      _idPrefix: `chart-${i}`,
    }

    let svgStr: string
    if (chart.component) {
      svgStr = renderChart(chart.component, chartProps)
    } else if (chart.frameType) {
      svgStr = renderToStaticSVG(chart.frameType, chartProps as any)
    } else {
      svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`
    }

    // Strip outer <svg> wrapper — we'll embed the content
    // Use a foreignObject with the full SVG for clean nesting
    return (
      <g key={`dashboard-chart-${i}`} transform={`translate(${x},${y})`}>
        <foreignObject width={w} height={h}>
          <div
            // @ts-expect-error — xmlns for foreignObject child
            xmlns="http://www.w3.org/1999/xhtml"
            dangerouslySetInnerHTML={{ __html: svgStr }}
          />
        </foreignObject>
      </g>
    )
  })

  const dashboardSVG = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={totalHeight}
      role="img"
      aria-label={title || "Dashboard"}
      style={{ fontFamily: s.fontFamily }}
    >
      {title && <title>{title}</title>}
      {background && (
        <rect x={0} y={0} width={width} height={totalHeight} fill={background} />
      )}
      {title && (
        <text
          x={width / 2} y={24}
          textAnchor="middle"
          fontSize={s.titleSize + 4}
          fontWeight="bold"
          fill={s.text}
          fontFamily={s.fontFamily}
        >
          {title}
        </text>
      )}
      {subtitle && (
        <text
          x={width / 2} y={title ? 46 : 20}
          textAnchor="middle"
          fontSize={s.labelSize}
          fill={s.textSecondary}
          fontFamily={s.fontFamily}
        >
          {subtitle}
        </text>
      )}
      {chartElements}
    </svg>
  )

  return ReactDOMServer.renderToStaticMarkup(dashboardSVG)
}
