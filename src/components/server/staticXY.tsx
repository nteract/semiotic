import { filterSparseArray } from "../charts/shared/sparseArray"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import { registerBuiltInXYPlugins } from "../stream/xyPlugins/registerBuiltIn"

registerBuiltInXYPlugins()
import type { StreamXYFrameProps } from "../stream/types"
import { resolveThemeSemanticColors } from "../store/themeCore"
import {
  buildEvidence,
  numericDomain,
  type EvidenceSink
} from "./renderEvidence"
import { xySceneNodeToSVG } from "../stream/SceneToSVG"
import { renderSceneListWithBackend } from "../stream/renderBackend"
import { resolveTheme } from "./themeResolver"
import {
  extractCategories
} from "./staticLegend"
import {
  renderStaticAnnotations,
  type StaticAnnotationRenderResult,
} from "./staticAnnotations"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import type { ThemeAwareProps } from "./staticSVGChrome"
import {
  chartUID,
  reserveFrameLegendMargin,
  renderFrameLegend,
  wrapSVG,
  generateAxesSVG
} from "./staticSVGChrome"
import { renderGridSVG } from "./staticXYGrid"
import { normalizeColorGradient, normalizeGradient } from "../charts/shared/gradient"
import { normalizeXYData } from "../stream/normalizeXYData"
import { resolveFrameGraphics } from "../stream/frameGraphics"
import { AXIS_FRAME_DEFAULT_MARGIN } from "../stream/frameDefaultMargins"
import { renderPairedRightAxisSVG } from "./staticXYAxes"
import { resolveXYAxisChrome } from "../legendLayout"

export function renderStreamXYFrame(props: StreamXYFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = AXIS_FRAME_DEFAULT_MARGIN
  const size = props.size || [500, 300]
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
  const hasVisibleTitle = hasTextTitle(props.title)
  const data = normalizeXYData(filterSparseArray(props.data), props.lineDataAccessor)
  const xyLegendCategories = props.showLegend
    ? extractCategories(data, props.colorAccessor || props.groupAccessor || props.categoryAccessor)
    : []

  // Axis chrome is shared with the live overlay, including labels supplied
  // through `axes[]` and top/side axes adjacent to a legend.
  const legendAxisChrome = resolveXYAxisChrome({
    showAxes: props.showAxes,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    yLabelRight: props.yLabelRight,
    axes: props.axes,
  })

  // Expand margin for legend BEFORE calculating inner dimensions
  reserveFrameLegendMargin(margin, {
    props: { ...props, axisChrome: legendAxisChrome },
    categories: xyLegendCategories,
    theme,
    size,
    hasTitle: hasVisibleTitle,
  })
  const legend = renderFrameLegend({
    props: { ...props, axisChrome: legendAxisChrome },
    categories: xyLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })

  const width = size[0] - margin.left - margin.right
  const height = size[1] - margin.top - margin.bottom

  const isStreaming = props.runtimeMode === "streaming" ||
    ["bar", "swarm", "waterfall"].includes(props.chartType)

  // Use theme's categorical palette when no explicit colorScheme provided
  const effectiveColorScheme = props.colorScheme || theme.colors.categorical
  const yAxisExtent = (props.axes?.find(axis => axis.orient === "left")
    ?? props.axes?.find(axis => axis.orient === "right"))?.extent ?? props.axisExtent

  const pipelineConfig: PipelineConfig = {
    chartType: props.chartType,
    runtimeMode: isStreaming ? "streaming" : "bounded",
    windowSize: props.windowSize ?? 200,
    windowMode: props.windowMode ?? "sliding",
    arrowOfTime: isStreaming ? (props.arrowOfTime ?? "right") : "right",
    extentPadding: props.extentPadding ?? 0.1,
    xAccessor: props.xAccessor,
    yAccessor: props.yAccessor,
    timeAccessor: isStreaming ? props.timeAccessor : undefined,
    valueAccessor: props.valueAccessor,
    colorAccessor: props.colorAccessor,
    sizeAccessor: props.sizeAccessor,
    // symbolAccessor/symbolMap drive the Scatterplot symbolBy glyph-shape
    // channel (store.getSymbol → "symbol" scene nodes). The client frame
    // passes them through; without them here symbolBy no-ops in SSR.
    symbolAccessor: props.symbolAccessor,
    symbolMap: props.symbolMap,
    groupAccessor: props.groupAccessor || (props.lineDataAccessor ? "_lineGroup" : undefined),
    categoryAccessor: props.categoryAccessor,
    lineDataAccessor: props.lineDataAccessor,
    xExtent: props.xExtent,
    yExtent: props.yExtent,
    // axisExtent ("nice"|"exact") pins the first/last tick to the data
    // min/max through domain resolution.
    axisExtent: props.axisExtent,
    yAxisExtent,
    sizeRange: props.sizeRange,
    xScaleType: props.xScaleType,
    yScaleType: props.yScaleType,
    scalePadding: props.scalePadding,
    binSize: props.binSize,
    normalize: props.normalize,
    // StackedArea streamgraph/silhouette/diverging — client threads baseline
    // into the pipeline; without it SSR always paints zero-baseline stacks.
    baseline: props.baseline,
    stackOrder: props.stackOrder,
    boundsAccessor: props.boundsAccessor,
    boundsStyle: props.boundsStyle,
    // `band` (LineChart/AreaChart shaded envelope) normalizes to ribbons in the
    // pipeline store. The client frame threads it through its pipeline config;
    // SSR must too or the band never paints server-side.
    band: props.band,
    // Mixed-frame props (DifferenceChart, LineChart fillArea[]).
    // Without these the mixed scene builder treats every group as a
    // line and the difference fills never paint — the regression that
    // shipped the empty OG card for the DifferenceChart blog entry.
    // `areaGroups` arrives from the HOC's `buildProps` as a string[];
    // PipelineConfig stores a Set so membership checks are O(1).
    y0Accessor: props.y0Accessor,
    areaGroups: props.areaGroups
      ? (props.areaGroups instanceof Set ? props.areaGroups : new Set(props.areaGroups as Iterable<string>))
      : undefined,
    curve: props.curve,
    gradientFill: normalizeGradient(props.gradientFill),
    lineGradient: normalizeColorGradient(props.lineGradient),
    semanticLineStops: props.semanticLineStops,
    openAccessor: props.openAccessor,
    highAccessor: props.highAccessor,
    lowAccessor: props.lowAccessor,
    closeAccessor: props.closeAccessor,
    candlestickStyle: props.candlestickStyle,
    lineStyle: props.lineStyle,
    pointStyle: props.pointStyle,
    areaStyle: props.areaStyle,
    barStyle: props.barStyle,
    waterfallStyle: props.waterfallStyle,
    swarmStyle: props.swarmStyle,
    colorScheme: effectiveColorScheme,
    themeCategorical: theme.colors.categorical,
    themeSequential: theme.colors.sequential,
    themeDiverging: theme.colors.diverging,
    themeSemantic: resolveThemeSemanticColors(theme),
    customLayout: props.customLayout,
    layoutConfig: props.layoutConfig,
    layoutMargin: margin,
    layoutSelection: props.layoutSelection,
    barColors: props.barColors,
    // Heatmap labels are scene metadata, not an SVG overlay. Omitting these
    // fields meant `showValues` appeared to be accepted by renderChart() but
    // no heatcell ever received a label on the SSR path.
    showValues: props.showValues,
    heatmapValueFormat: props.heatmapValueFormat,
    heatmapColorScale: props.heatmapColorScale,
    heatmapAggregation: props.heatmapAggregation,
    heatmapXBins: props.heatmapXBins,
    heatmapYBins: props.heatmapYBins,
    pointIdAccessor: props.pointIdAccessor,
    onLayoutError: props.onLayoutError,
  }

  const store = new PipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: data, bounded: true })
  }

  store.computeScene({ width, height })
  const resolvedBackgroundGraphics = resolveFrameGraphics(
    props.backgroundGraphics,
    size,
    margin,
    store.scales
  )
  const resolvedForegroundGraphics = resolveFrameGraphics(
    props.foregroundGraphics,
    size,
    margin,
    store.scales
  )

  if (!store.scales) {
    let annotationRender: StaticAnnotationRenderResult | undefined
    const annotationNodes = props.annotations ? renderStaticAnnotations({
      annotations: props.annotations,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
      svgAnnotationRules: props.svgAnnotationRules,
      annotationData: data,
      scales: {},
      layout: { width, height },
      theme,
      idPrefix: props._idPrefix,
      onRender: result => { annotationRender = result },
    }) : null
    if (sink) {
      sink.evidence = buildEvidence({
        frameType: "xy",
        width: size[0], height: size[1],
        marks: [],
        title: props.title, description: props.description,
        annotations: props.annotations,
        annotationRender,
        extraWarnings: store.scales ? [] : ["NO_SCALES"],
        margin,
      })
    }
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
        className: `stream-xy-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
        legend,
        idPrefix: props._idPrefix,
      })
    )
  }

  const idPfx = (props as ThemeAwareProps)._idPrefix
  const renderedScene = renderSceneListWithBackend({
    nodes: store.scene,
    renderMode: props.renderMode,
    fallback: (node, index) =>
      xySceneNodeToSVG(node, index, idPfx, props.hoverRadius ?? 30),
  })

  const grid = props.showGrid
    ? renderGridSVG(store.scales, { width, height }, theme, idPfx, props.axisExtent, props.axes, props)
    : null

  const dataMarks = renderedScene.map(entry => entry.element)
  const plotClipId = `${chartUID(props)}-plot-clip`

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateAxesSVG(
        store.scales,
        { width, height },
        props,
        theme,
        idPfx,
        margin,
        legendAxisChrome,
        Boolean(legend),
      )
    : null
  const pairedRightAxis = showAxes
    ? renderPairedRightAxisSVG({
        scales: store.scales,
        layout: { width, height },
        props,
        theme,
        leftAxis: props.axes?.find((axis) => axis.orient === "left"),
        rightAxis: props.axes?.find((axis) => axis.orient === "right"),
        margin,
        axisChrome: legendAxisChrome,
        hasRenderedLegend: Boolean(legend),
      })
    : null

  // Annotations — honor `svgAnnotationRules` so custom overlays (e.g. a
  // RangeChart mean/median bulb+pill) serialize through renderChart the same
  // way they paint on the client SVG overlay.
  let annotationRender: StaticAnnotationRenderResult | undefined
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    svgAnnotationRules: props.svgAnnotationRules,
    annotationData: data,
    scales: { x: store.scales.x, y: store.scales.y },
    layout: { width, height },
    theme,
    xAccessor: typeof props.xAccessor === "string" ? props.xAccessor : undefined,
    yAccessor: typeof props.yAccessor === "string" ? props.yAccessor : undefined,
    idPrefix: idPfx,
    onRender: result => { annotationRender = result },
  }) : null

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "xy",
      width: size[0], height: size[1],
      marks: renderedScene.map(entry => entry.node),
      title: props.title, description: props.description,
      annotations: props.annotations,
      annotationRender,
      xDomain: numericDomain(store.scales.x?.domain?.()),
      yDomain: numericDomain(store.scales.y?.domain?.()),
      legendItems: xyLegendCategories.length > 0 ? xyLegendCategories.length : undefined,
      margin,
    })
  }

  // svgPreRenderers run after scene compute so they can position via the
  // resolved scales (used by QuadrantChart for the four quadrant fills +
  // centerlines and by anything else that paints background chrome under
  // the data layer).
  const svgPreRendererNodes = (props.svgPreRenderers && store.scales)
    ? props.svgPreRenderers
        .map((fn, i) => {
          try {
            return <React.Fragment key={`pre-${i}`}>{fn(store.scene, store.scales!, { width, height })}</React.Fragment>
          } catch {
            return null
          }
        })
        .filter(Boolean)
    : null

  const content = (
    <>
      {resolvedBackgroundGraphics}
      {svgPreRendererNodes}
      {grid}
      <defs>
        <clipPath id={plotClipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${plotClipId})`}>{dataMarks}</g>
      {axes}
      {pairedRightAxis}
      {annotationNodes}
      {resolvedForegroundGraphics}
      {store.customLayoutOverlays}
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
