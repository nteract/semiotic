import { isGradientLegendConfig, isLegendConfig } from "../types/legendTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { PipelineStore, type PipelineConfig } from "../stream/PipelineStore"
import type { StreamXYFrameProps } from "../stream/types"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import {
  buildEvidence,
  numericDomain,
  type EvidenceSink
} from "./renderEvidence"
import { xySceneNodeToSVG } from "../stream/SceneToSVG"
import { renderSceneWithBackend } from "../stream/renderBackend"
import { resolveTheme } from "./themeResolver"
import {
  renderStaticLegend,
  extractCategories
} from "./staticLegend"
import { renderStaticAnnotations } from "./staticAnnotations"
import type { ThemeAwareProps } from "./staticSVGChrome"
import {
  reserveStaticLegendMargin,
  reserveLegendConfigMargin,
  renderLegendConfig,
  renderGridSVG,
  wrapSVG,
  generateAxesSVG
} from "./staticSVGChrome"

export function renderStreamXYFrame(props: StreamXYFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 300]
  const margin = { ...defaultMargin, ...props.margin }
  const data = filterSparseArray(props.data)
  const xyLegendCategories = props.showLegend
    ? extractCategories(data, props.colorAccessor || props.groupAccessor)
    : []

  // Expand margin for legend BEFORE calculating inner dimensions
  const legendPos = props.legendPosition
  if (isLegendConfig(props.legend) || isGradientLegendConfig(props.legend)) {
    reserveLegendConfigMargin(margin, {
      legend: props.legend,
      theme,
      position: legendPos || "right",
      size,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
  } else if (props.showLegend && xyLegendCategories.length > 0) {
    reserveStaticLegendMargin(margin, {
      categories: xyLegendCategories,
      colorScheme: props.colorScheme,
      theme,
      position: legendPos || "right",
      size,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
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
    xScaleType: props.xScaleType,
    yScaleType: props.yScaleType,
    scalePadding: props.scalePadding,
    binSize: props.binSize,
    normalize: props.normalize,
    stackOrder: props.stackOrder,
    boundsAccessor: props.boundsAccessor,
    boundsStyle: props.boundsStyle,
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
    // `gradientFill === true` is the HOC's shorthand for the default
    // top/bottom opacity stops; PipelineConfig only accepts the object
    // form so we normalize it the same way the client frame does.
    gradientFill: props.gradientFill === true
      ? { topOpacity: 0.8, bottomOpacity: 0.05 }
      : props.gradientFill === false
        ? undefined
        : props.gradientFill,
    lineGradient: props.lineGradient,
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
    themeSemantic: resolveThemeSemanticColors(theme),
    customLayout: props.customLayout,
    layoutConfig: props.layoutConfig,
    layoutMargin: margin,
    layoutSelection: props.layoutSelection,
    barColors: props.barColors
  }

  const store = new PipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: data, bounded: true })
  }

  store.computeScene({ width, height })

  if (!store.scales || store.scene.length === 0) {
    if (sink) {
      sink.evidence = buildEvidence({
        frameType: "xy",
        width: size[0], height: size[1],
        marks: [],
        title: props.title, description: props.description,
        annotations: props.annotations,
        extraWarnings: store.scales ? [] : ["NO_SCALES"],
      })
    }
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(null, {
        width: size[0], height: size[1],
        className: `stream-xy-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
        idPrefix: props._idPrefix,
      })
    )
  }

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "xy",
      width: size[0], height: size[1],
      marks: store.scene,
      title: props.title, description: props.description,
      annotations: props.annotations,
      xDomain: numericDomain(store.scales.x?.domain?.()),
      yDomain: numericDomain(store.scales.y?.domain?.()),
      legendItems: xyLegendCategories.length > 0 ? xyLegendCategories.length : undefined,
    })
  }

  const idPfx = (props as ThemeAwareProps)._idPrefix
  const grid = props.showGrid ? renderGridSVG(store.scales, { width, height }, theme, idPfx) : null

  const dataMarks = store.scene
    .map((node, i) => renderSceneWithBackend({
      node,
      index: i,
      renderMode: props.renderMode,
      fallback: () => xySceneNodeToSVG(node, i, idPfx)
    }))
    .filter(Boolean)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateAxesSVG(store.scales, { width, height }, props, theme, idPfx)
    : null

  // Annotations
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    scales: { x: store.scales.x, y: store.scales.y },
    layout: { width, height },
    theme,
    xAccessor: typeof props.xAccessor === "string" ? props.xAccessor : undefined,
    yAccessor: typeof props.yAccessor === "string" ? props.yAccessor : undefined,
    idPrefix: idPfx,
  }) : null

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

  // Legend — auto-build from colorAccessor/groupAccessor + showLegend, OR
  // honor a caller-supplied pre-rendered ReactNode/config object.
  const xyAutoLegend = props.showLegend ? (() => {
    const categories = xyLegendCategories
    if (categories.length === 0) return null
    return renderStaticLegend({
      categories,
      colorScheme: props.colorScheme,
      theme,
      position: props.legendPosition || "right",
      totalWidth: size[0],
      totalHeight: size[1],
      margin,
      hasTitle: !!props.title,
      legendLayout: props.legendLayout,
    })
  })() : null
  const legend = React.isValidElement(props.legend)
    ? (props.legend as React.ReactNode)
    : renderLegendConfig(props.legend, {
        theme,
        position: props.legendPosition || "right",
        size,
        margin,
        hasTitle: !!props.title,
        legendLayout: props.legendLayout,
        idPrefix: props._idPrefix,
      }) || xyAutoLegend

  const content = (
    <>
      {props.backgroundGraphics}
      {svgPreRendererNodes}
      {grid}
      {dataMarks}
      {axes}
      {annotationNodes}
      {props.foregroundGraphics}
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

