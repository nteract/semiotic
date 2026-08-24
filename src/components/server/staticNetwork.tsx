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
import { registerBuiltInNetworkLayouts } from "../stream/layouts/registerBuiltIn"
import { getLayoutPlugin } from "../stream/layouts/registry"
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
import {
  renderStaticAnnotations,
  type StaticAnnotationRenderResult,
} from "./staticAnnotations"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { flattenHierarchy } from "../charts/shared/networkUtils"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import type { ThemeAwareProps, CategoricalAccessor } from "./staticSVGChrome"
import {
  reserveFrameLegendMargin,
  renderFrameLegend,
  wrapSVG,
  edgeEndpointId
} from "./staticSVGChrome"
import { resolveFrameGraphics } from "../stream/frameGraphics"
import { networkFrameDefaultMargin } from "../stream/frameDefaultMargins"
import { collectNetworkAnnotationAnchors } from "../stream/networkAnnotationAnchors"

registerBuiltInNetworkLayouts()

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
  return propsEdges.map((d) => {
    const numericValue = Number(valueFn(d))
    return {
      source: String(sourceFn(d)),
      target: String(targetFn(d)),
      value: Number.isFinite(numericValue) ? numericValue : 1,
      y0: 0, y1: 0, sankeyWidth: 0, data: d
    }
  })
}

// ── Network SSR ─────────────────────────────────────────────────────────

const HIERARCHICAL_TYPES: Set<string> = new Set([
  "tree", "cluster", "treemap", "circlepack", "partition", "orbit"
])

/** Give shared annotation rules the same projected node data that the live
 * network overlay receives. Raw network annotations use pixel coordinates,
 * so identity scales make generic highlight/widget/bracket rules usable too. */
function networkAnnotationData(nodes: NetworkSceneNode[]): Datum[] {
  return nodes.map((node) => {
    const source = node.datum && typeof node.datum === "object"
      ? node.datum as Datum
      : {}
    const data = source.data && typeof source.data === "object"
      ? source.data as Datum
      : source
    const x = "cx" in node ? node.cx : node.x + node.w / 2
    const y = "cy" in node ? node.cy : node.y + node.h / 2
    return {
      ...data,
      ...(data.id == null && node.id != null ? { id: node.id } : {}),
      x,
      y,
    }
  })
}

export function renderNetworkFrame(props: StreamNetworkFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const chartType: NetworkChartType = props.chartType || "force"
  const emptyNetworkEvidence = (annotationRender?: StaticAnnotationRenderResult) =>
    buildEvidence({
      frameType: "network",
      width: size[0], height: size[1],
      marks: [],
      title: props.title, description: props.description,
      annotations: props.annotations,
      annotationRender,
      nodeCount: 0, edgeCount: 0,
      margin,
    })
  const size: [number, number] = props.size || [500, 500]
  const defaultMargin = networkFrameDefaultMargin(chartType)
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
    if (HIERARCHICAL_TYPES.has(chartType) && props.data) {
      const hierarchyNodes = flattenHierarchy(
        props.data as Datum,
        (props.childrenAccessor || "children") as string | ((datum: Datum) => Datum[])
      )
      return extractCategories(hierarchyNodes, colorAccessor as CategoricalAccessor)
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
  const networkLegendOut = renderFrameLegend({
    props,
    categories: networkLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })
  const innerWidth = size[0] - margin.left - margin.right
  const innerHeight = size[1] - margin.top - margin.bottom
  const resolvedBackgroundGraphics = resolveFrameGraphics(
    props.backgroundGraphics,
    size,
    margin,
    null
  )
  const resolvedForegroundGraphics = resolveFrameGraphics(
    props.foregroundGraphics,
    size,
    margin,
    null
  )

  const renderEmptyNetwork = () => {
    let annotationRender: StaticAnnotationRenderResult | undefined
    const identityScale = (value: DatumValue) => Number(value)
    const annotationNodes = props.annotations ? renderStaticAnnotations({
      annotations: props.annotations,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
      svgAnnotationRules: props.svgAnnotationRules,
      scales: { x: identityScale, y: identityScale },
      layout: { width: innerWidth, height: innerHeight },
      theme,
      frameType: "network",
      idPrefix: props._idPrefix,
      onRender: result => { annotationRender = result },
    }) : null
    if (sink) sink.evidence = emptyNetworkEvidence(annotationRender)
    const emptyContent = resolvedBackgroundGraphics || resolvedForegroundGraphics || props.annotations
      ? (
        <>
          {resolvedBackgroundGraphics}
          {annotationNodes}
          {resolvedForegroundGraphics}
        </>
      )
      : null
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(emptyContent, {
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

  const plugin = getLayoutPlugin(chartType)
  if (!plugin && !props.customNetworkLayout) {
    throw new Error(
      `No layout plugin found for chart type: "${chartType}". ` +
      `Supported types: force, sankey, chord, tree, cluster, treemap, circlepack, partition, orbit.`
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
    orbitMode: props.orbitMode,
    orbitSize: props.orbitSize,
    orbitSpeed: props.orbitSpeed,
    orbitRevolution: props.orbitRevolution,
    orbitRevolutionStyle: props.orbitRevolutionStyle,
    orbitEccentricity: props.orbitEccentricity,
    orbitShowRings: props.orbitShowRings,
    orbitAnimated: false,
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
      return renderEmptyNetwork()
    }
    config.__hierarchyRoot = hierarchyRoot
    nodes = []
    edges = []
  } else {
    const propsNodes = filterSparseArray(props.nodes || [])
    const propsEdges = Array.isArray(props.edges) ? filterSparseArray(props.edges) : []

    if (propsNodes.length === 0 && propsEdges.length === 0) {
      return renderEmptyNetwork()
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
  // Backgrounds/overlays returned from a custom layout are threaded into
  // `content` below so SSR uses the same below/above scene ordering as CSR.
  let customLayoutBackgrounds: import("react").ReactNode = null
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
    customLayoutBackgrounds = result.backgrounds ?? null
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

  const edgeElements = renderedEdges.map(entry => entry.element)
  const nodeElements = renderedNodes.map(entry => entry.element)

  const labelElements = labels
    .map((label, i) => networkLabelToSVG(label, i))
    .filter(Boolean)

  // Network annotations: layout assigns absolute pixel coords to nodes, so
  // overlay annotations use raw `x`/`y` numbers directly. `staticAnnotations`
  // pixel-passthrough kicks in when no `scales.x`/`scales.y` is supplied.
  // Custom `svgAnnotationRules` still runs first for bespoke note types.
  let annotationRender: StaticAnnotationRenderResult | undefined
  const identityScale = (value: DatumValue) => Number(value)
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    svgAnnotationRules: props.svgAnnotationRules,
    scales: { x: identityScale, y: identityScale },
    layout: { width: innerWidth, height: innerHeight },
    theme,
    frameType: "network",
    annotationData: networkAnnotationData(sceneNodes),
    pointNodes: collectNetworkAnnotationAnchors(sceneNodes),
    idPrefix: props._idPrefix,
    onRender: result => { annotationRender = result },
  }) : null

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
      annotationRender,
      nodeCount: renderedNodes.length,
      edgeCount: renderedEdges.length,
      margin,
    })
  }

  const content = (
    <>
      {resolvedBackgroundGraphics}
      {/* Layout-derived backgrounds share fitted plot coordinates with the
          scene, but paint first so static SVG matches the live canvas stack. */}
      {customLayoutBackgrounds}
      {edgeElements}
      {nodeElements}
      {labelElements}
      {annotationNodes}
      {resolvedForegroundGraphics}
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
