import type { Datum, DatumValue } from "../charts/shared/datumTypes"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type {
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  StreamNetworkFrameProps,
  NetworkChartType,
  NetworkSceneNode,
  NetworkSceneEdge,
} from "../stream/networkTypes"
import { getLayoutPlugin } from "../stream/layouts"
import {
  resolveCustomLayoutPalette,
  buildResolveColor,
  schemeCategory10
} from "../stream/customLayoutPalette"
import {
  buildEvidence,
  type EvidenceSink
} from "./renderEvidence"
import {
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG
} from "../stream/SceneToSVG"
import { renderSceneListWithBackend } from "../stream/renderBackend"
import { resolveTheme, themeStyles } from "./themeResolver"
import {
  extractCategories
} from "./staticLegend"
import { renderStaticAnnotations } from "./staticAnnotations"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import type { ThemeAwareProps, CategoricalAccessor } from "./staticSVGChrome"
import {
  reserveFrameLegendMargin,
  renderFrameLegend,
  wrapSVG,
  edgeEndpointId
} from "./staticSVGChrome"

export function resolveAccessor(
  accessor: string | ((d: Datum) => DatumValue) | undefined,
  defaultKey: string
): (d: Datum) => DatumValue {
  if (!accessor) return (d: Datum) => d[defaultKey]
  if (typeof accessor === "function") return accessor
  return (d: Datum) => d[accessor]
}

export function buildRealtimeNodes(
  propsNodes: Datum[],
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

export function buildRealtimeEdges(
  propsEdges: Datum[],
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

export function renderNetworkFrame(props: StreamNetworkFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const chartType: NetworkChartType = props.chartType || "force"
  const emptyNetworkEvidence = () =>
    buildEvidence({
      frameType: "network",
      width: size[0], height: size[1],
      marks: [],
      title: props.title, description: props.description,
      annotations: props.annotations,
      nodeCount: 0, edgeCount: 0,
      margin,
    })
  const size: [number, number] = props.size || [500, 500]
  const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 }
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
  const hasVisibleTitle = hasTextTitle(props.title)
  const networkLegendCategories = props.showLegend ? (() => {
    const isAccessor = (a: unknown): a is CategoricalAccessor =>
      typeof a === "string" || typeof a === "function"
    const colorAccessor = isAccessor(props.colorBy) ? props.colorBy : undefined
    if (!colorAccessor) return []
    const propsNodes = filterSparseArray(props.nodes || [])
    if (propsNodes.length > 0) {
      return extractCategories(propsNodes, colorAccessor as CategoricalAccessor)
    }
    const propsEdges = Array.isArray(props.edges) ? filterSparseArray(props.edges) : []
    if (propsEdges.length === 0) return []
    const sourceFn = resolveAccessor(props.sourceAccessor, "source")
    const targetFn = resolveAccessor(props.targetAccessor, "target")
    const endpointIds = Array.from(new Set(
      propsEdges.flatMap((edge) => [sourceFn(edge), targetFn(edge)])
        .filter((id) => id != null)
        .map(String)
    ))
    return extractCategories(
      endpointIds.map((id) => ({ id })),
      colorAccessor as CategoricalAccessor
    )
  })() : []
  // Match the XY frame: reserve legend space BEFORE computing inner dims so
  // the layout doesn't draw under the legend.
  reserveFrameLegendMargin(margin, {
    props,
    categories: networkLegendCategories,
    theme,
    size,
    hasTitle: hasVisibleTitle,
  })
  const innerWidth = size[0] - margin.left - margin.right
  const innerHeight = size[1] - margin.top - margin.bottom

  const plugin = getLayoutPlugin(chartType)
  if (!plugin && !props.customNetworkLayout) {
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
    // labelMode ("leaf"|"parent"|"all") selects which hierarchy tiers get
    // labels (Treemap/CirclePack). The scene builder defaults to "leaf", so
    // dropping this here made SSR omit every parent/container label the CSR
    // chart draws.
    labelMode: props.labelMode,
    colorBy: props.colorBy,
    colorScheme: props.colorScheme || theme.colors.categorical,
    edgeColorBy: props.edgeColorBy,
    edgeOpacity: props.edgeOpacity,
    colorByDepth: props.colorByDepth,
    nodeSize: props.nodeSize,
    nodeSizeRange: props.nodeSizeRange,
    // Forward the customLayout escape hatch + its layoutConfig so the
    // SSR path can dispatch through the same custom-layout shim the
    // CSR pipeline uses (consumed below in the customNetworkLayout
    // branch).
    customNetworkLayout: props.customNetworkLayout,
    layoutConfig: props.layoutConfig,
  }

  let nodes: RealtimeNode[]
  let edges: RealtimeEdge[]

  if (HIERARCHICAL_TYPES.has(chartType)) {
    const hierarchyRoot = props.data || props.edges
    if (!hierarchyRoot || Array.isArray(hierarchyRoot)) {
      if (sink) sink.evidence = emptyNetworkEvidence()
      return ReactDOMServer.renderToStaticMarkup(
        wrapSVG(null, {
          width: size[0], height: size[1],
          className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
          title: props.title, description: props.description, background: props.background,
          theme, innerTransform: `translate(${margin.left},${margin.top})`,
          innerWidth, innerHeight,
        idPrefix: props._idPrefix,
        })
      )
    }
    config.__hierarchyRoot = hierarchyRoot
    nodes = []
    edges = []
  } else {
    const propsNodes = filterSparseArray(props.nodes || [])
    const propsEdges = Array.isArray(props.edges) ? filterSparseArray(props.edges) : []

    if (propsNodes.length === 0 && propsEdges.length === 0) {
      if (sink) sink.evidence = emptyNetworkEvidence()
      return ReactDOMServer.renderToStaticMarkup(
        wrapSVG(null, {
          width: size[0], height: size[1],
          className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
          title: props.title, description: props.description, background: props.background,
          theme, innerTransform: `translate(${margin.left},${margin.top})`,
          innerWidth, innerHeight,
        idPrefix: props._idPrefix,
        })
      )
    }

    edges = buildRealtimeEdges(propsEdges, config)

    if (propsNodes.length === 0 && edges.length > 0) {
      const nodeIds = new Set<string>()
      for (const e of edges) {
        const src = edgeEndpointId(e.source)
        const tgt = edgeEndpointId(e.target)
        if (src) nodeIds.add(src)
        if (tgt) nodeIds.add(tgt)
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

  // customLayout escape hatch — same dispatch the CSR pipeline uses in
  // NetworkPipelineStore.runLayout/buildScene. When the caller supplies
  // a `customNetworkLayout` (ProcessSankey via the SSR config does this),
  // skip the built-in plugin and emit scene primitives from the custom
  // layout function directly. Without this, charts that compose via the
  // escape hatch would silently fall through to the force/sankey/etc.
  // plugin during SSR — visible regression class for any registered
  // custom-layout chart.
  let sceneNodes: NetworkSceneNode[] = []
  let sceneEdges: NetworkSceneEdge[] = []
  let labels: import("../stream/networkTypes").NetworkLabel[] = []
  // Overlays returned from a custom layout (drawn above the data layer
  // by NetworkSVGOverlay on CSR; threaded into `content` below on SSR
  // so screenshot baselines include them).
  let customLayoutOverlays: import("react").ReactNode = null
  if (config.customNetworkLayout) {
    // Reuse the same palette + resolver helpers NetworkPipelineStore
    // uses for the CSR custom-layout context, so a `colorScheme` named
    // string (e.g. `"tableau10"`) or object map resolves identically on
    // both paths. Without this, SSR would silently fall through to
    // `theme.colors.categorical` whenever the caller passed a string
    // scheme — visible drift from CSR for any registered custom layout.
    const customColorScheme = config.colorScheme as
      | string
      | string[]
      | Record<string, string>
      | undefined
    const palette = resolveCustomLayoutPalette(
      customColorScheme,
      theme.colors.categorical,
      schemeCategory10,
    )
    const resolveColor = buildResolveColor(palette, customColorScheme)
    // `dimensions` matches the CSR `NetworkPipelineStore.runLayout`
    // contract: width/height are the inner plot size, and plot.x/y
    // are 0 (the frame's <g transform="translate(margin.left,
    // margin.top)"> already lives at the plot origin, so layout
    // coordinates are plot-relative). Passing outer width + a
    // margin-shifted plot origin would push every band/ribbon
    // visually offset on SSR vs CSR.
    const ctx = {
      nodes,
      edges,
      dimensions: {
        width: innerWidth,
        height: innerHeight,
        plot: { x: 0, y: 0, width: innerWidth, height: innerHeight },
      },
      theme: {
        semantic: theme.colors as unknown as import("../stream/types").ThemeSemanticColors,
        // `palette` from resolveCustomLayoutPalette is `readonly`;
        // shallow-copy to a mutable array because the customLayout
        // context type marks `categorical` mutable.
        categorical: [...palette],
      },
      resolveColor,
      config: (config.layoutConfig ?? {}) as Record<string, unknown>,
    }
    const result = config.customNetworkLayout(ctx)
    sceneNodes = result.sceneNodes ?? []
    sceneEdges = result.sceneEdges ?? []
    labels = result.labels ?? []
    customLayoutOverlays = result.overlays ?? null
  } else if (plugin) {
    plugin.computeLayout(nodes, edges, config, [innerWidth, innerHeight])
    const built = plugin.buildScene(nodes, edges, config, [innerWidth, innerHeight])
    sceneNodes = built.sceneNodes
    sceneEdges = built.sceneEdges
    labels = built.labels
  }

  // Apply theme text color to labels (layout plugins default to #333)
  const s = themeStyles(theme)
  for (const label of labels) {
    if (!label.fill) label.fill = s.text
  }

  const renderedEdges = renderSceneListWithBackend<NetworkSceneEdge>({
    nodes: sceneEdges,
    renderMode: props.renderMode,
    fallback: (edge, index) => networkSceneEdgeToSVG(edge, index),
  })
  const renderedNodes = renderSceneListWithBackend<NetworkSceneNode>({
    nodes: sceneNodes,
    renderMode: props.renderMode,
    fallback: (node, index) => networkSceneNodeToSVG(node, index),
  })

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "network",
      width: size[0], height: size[1],
      marks: [
        ...renderedNodes.map(({ node }) => ({ type: `node:${(node as { type?: string }).type ?? "node"}` })),
        ...renderedEdges.map(({ node }) => ({ type: `edge:${(node as { type?: string }).type ?? "edge"}` })),
      ],
      title: props.title, description: props.description,
      annotations: props.annotations,
      nodeCount: renderedNodes.length,
      edgeCount: renderedEdges.length,
      margin,
    })
  }

  const edgeElements = renderedEdges.map(entry => entry.element)
  const nodeElements = renderedNodes.map(entry => entry.element)

  const labelElements = labels
    .map((label, i) => networkLabelToSVG(label, i))
    .filter(Boolean)

  // Network annotations: layout assigns absolute pixel coords to nodes, so
  // overlay annotations use raw `x`/`y` numbers directly. `staticAnnotations`
  // pixel-passthrough kicks in when no `scales.x`/`scales.y` is supplied.
  // Custom `svgAnnotationRules` still runs first for bespoke note types.
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    svgAnnotationRules: props.svgAnnotationRules,
    scales: {},
    layout: { width: innerWidth, height: innerHeight },
    theme,
    idPrefix: props._idPrefix,
  }) : null

  // Network legend: parity with the XY/Ordinal auto-build. Source is the
  // node list (one entry per unique colorBy/nodeIDAccessor value); layout-
  // produced node positions are irrelevant here, only the categorical set
  // matters. When nodes weren't supplied directly, fall back to the
  // ALREADY-RESOLVED `edges` array — that's the output of
  // `buildRealtimeEdges` which applied `sourceAccessor` / `targetAccessor`,
  // so source/target are always normalized strings regardless of input shape.
  //
  // Both string and function accessors are honored — `extractCategories`
  // accepts either form, and stripping functions to undefined would silently
  // drop the legend for any caller using a typed accessor function.
  const networkLegendOut = renderFrameLegend({
    props,
    categories: networkLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })

  const content = (
    <>
      {props.backgroundGraphics}
      {edgeElements}
      {nodeElements}
      {labelElements}
      {annotationNodes}
      {props.foregroundGraphics}
      {/* customLayout-emitted overlays paint above the data layer,
          matching `NetworkSVGOverlay`'s `composeOverlays(foreground,
          customLayoutOverlays)` ordering on CSR. Without this, SSR
          snapshots for any registered custom layout would be missing
          axis chrome / particles / quality readouts that the live
          chart shows. */}
      {customLayoutOverlays}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-network-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${margin.left},${margin.top})`,
      innerWidth, innerHeight,
      legend: networkLegendOut,
      idPrefix: props._idPrefix,
    })
  )
}

// ── Ordinal SSR ─────────────────────────────────────────────────────────
