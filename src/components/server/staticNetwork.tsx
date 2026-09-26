import type { Datum, DatumValue } from "../charts/shared/datumTypes"
import * as React from "react"
import { restyleNetworkCustomScene } from "../stream/networkCustomRestyle"
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
} from "../stream/SceneToSVGNetwork"
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
  wrapSVG
} from "./staticSVGChrome"
import { resolveFrameGraphics } from "../stream/frameGraphics"
import { networkFrameDefaultMargin } from "../stream/frameDefaultMargins"
import { collectNetworkAnnotationAnchors } from "../stream/networkAnnotationAnchors"
import { NetworkViewGroup } from "../stream/networkViewTransform"
import { normalizeNetworkData } from "../stream/networkDataNormalization"

registerBuiltInNetworkLayouts()

export function resolveAccessor(
  accessor: string | ((d: Datum) => DatumValue) | undefined,
  defaultKey: string
): (d: Datum) => DatumValue {
  if (!accessor) return (d: Datum) => d[defaultKey]
  if (typeof accessor === "function") return accessor
  return (d: Datum) => d[accessor]
}

function realtimeNode([id, data]: [string, Datum]): RealtimeNode {
  return {
    id,
    // Preserve pre-set positions from source data (for pinned layouts).
    x: data.x ?? 0, y: data.y ?? 0,
    x0: 0, x1: 0, y0: 0, y1: 0,
    width: 0, height: 0, value: 0, data
  }
}

function realtimeEdge(edge: ReturnType<typeof normalizeNetworkData>["edges"][number]): RealtimeEdge {
  return { ...edge, y0: 0, y1: 0, sankeyWidth: 0 }
}

export function buildRealtimeNodes(
  propsNodes: Datum[],
  config: NetworkPipelineConfig
): RealtimeNode[] {
  return Array.from(normalizeNetworkData(propsNodes, [], config).nodes, realtimeNode)
}

export function buildRealtimeEdges(
  propsEdges: Datum[],
  config: NetworkPipelineConfig
): RealtimeEdge[] {
  return normalizeNetworkData([], propsEdges, config).edges.map(realtimeEdge)
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
  const innerWidth = Math.max(1, size[0] - margin.left - margin.right)
  const innerHeight = Math.max(1, size[1] - margin.top - margin.bottom)
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

  // Empty and populated scenes share the same camera, annotations and evidence
  // envelope, so static exports cannot acquire a second projection path.
  let annotationRender: StaticAnnotationRenderResult | undefined
  const renderContent = (
    content: React.ReactNode,
    renderedNodes: { node: NetworkSceneNode }[] = [],
    renderedEdges: { node: NetworkSceneEdge }[] = []
  ) => {
    if (sink) sink.evidence = buildEvidence({
      frameType: "network",
      width: size[0], height: size[1],
      marks: [
        ...renderedNodes.map(({ node }) => ({ type: `node:${node.type ?? "node"}` })),
        ...renderedEdges.map(({ node }) => ({ type: `edge:${node.type ?? "edge"}` })),
      ],
      title: props.title, description: props.description,
      annotations: props.annotations,
      annotationRender,
      nodeCount: renderedNodes.length,
      edgeCount: renderedEdges.length,
      margin,
    })
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(<NetworkViewGroup view={props.viewTransform} width={innerWidth} height={innerHeight}>{content}</NetworkViewGroup>, {
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
  const renderAnnotations = (sceneNodes?: NetworkSceneNode[]) => {
    const identityScale = (value: DatumValue) => Number(value)
    return props.annotations ? renderStaticAnnotations({
      annotations: props.annotations,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
      svgAnnotationRules: props.svgAnnotationRules,
      scales: { x: identityScale, y: identityScale },
      layout: { width: innerWidth, height: innerHeight },
      theme,
      frameType: "network",
      annotationData: sceneNodes && networkAnnotationData(sceneNodes),
      pointNodes: sceneNodes && collectNetworkAnnotationAnchors(sceneNodes),
      idPrefix: props._idPrefix,
      onRender: result => { annotationRender = result },
    }) : null
  }
  const renderEmptyNetwork = () => {
    const annotationNodes = renderAnnotations()
    const emptyContent = resolvedBackgroundGraphics || resolvedForegroundGraphics || props.annotations
      ? (
        <>
          {resolvedBackgroundGraphics}
          {annotationNodes}
          {resolvedForegroundGraphics}
        </>
      )
      : null
    return renderContent(emptyContent)
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

    const normalized = normalizeNetworkData(propsNodes, propsEdges, config)
    nodes = Array.from(normalized.nodes, realtimeNode)
    edges = normalized.edges.map(realtimeEdge)
  }

  // customNetworkLayout supplies scene primitives directly, taking precedence
  // over the built-in plugin just as it does in NetworkPipelineStore.
  let sceneNodes: NetworkSceneNode[] = []
  let sceneEdges: NetworkSceneEdge[] = []
  let labels: import("../stream/networkTypes").NetworkLabel[] = []
  // Backgrounds/overlays returned from a custom layout are threaded into
  // `content` below so SSR uses the same below/above scene ordering as CSR.
  let customLayoutBackgrounds: import("react").ReactNode = null
  let customLayoutOverlays: import("react").ReactNode = null
  if (config.customNetworkLayout) {
    // Share named-palette and category-map resolution with NetworkPipelineStore.
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
      selection: props.layoutSelection ?? null,
    }
    const result = config.customNetworkLayout(ctx)
    sceneNodes = result.sceneNodes ?? []
    sceneEdges = result.sceneEdges ?? []
    restyleNetworkCustomScene({
      nodes: sceneNodes,
      edges: sceneEdges,
      restyle: result.restyle,
      restyleEdge: result.restyleEdge,
      selection: props.layoutSelection ?? null,
      baseStyles: new WeakMap()
    })
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

  // Annotation anchors stay in layout coordinates inside the camera group.
  const annotationNodes = renderAnnotations(sceneNodes)

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
      {/* Layout overlays paint above foreground graphics, matching NetworkSVGOverlay. */}
      {customLayoutOverlays}
    </>
  )

  return renderContent(content, renderedNodes, renderedEdges)
}

// ── Ordinal SSR ─────────────────────────────────────────────────────────
