import { filterSparseArray } from "../charts/shared/sparseArray"
import { normalizeGradient } from "../charts/shared/gradient"
import { ticksForMode } from "../charts/shared/axisExtent"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type {
  OrdinalSceneNode,
  OrdinalPipelineConfig,
  StreamOrdinalFrameProps
} from "../stream/ordinalTypes"
import {
  buildEvidence,
  numericDomain,
  type EvidenceSink
} from "./renderEvidence"
import { renderOrdinalSceneListWithBackend } from "../stream/ordinalSceneSVG"
import { resolveFrameGraphics } from "../stream/frameGraphics"
import { resolveTheme, themeStyles } from "./themeResolver"
import { resolveThemeSemanticColors } from "../store/themeCore"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import {
  extractCategories
} from "./staticLegend"
import {
  renderStaticAnnotations,
  type StaticAnnotationRenderResult,
} from "./staticAnnotations"
import { createSVGHatchPattern } from "./svgHatchPattern"
import type { SemioticTheme } from "../store/themeCore"
import type { ThemeAwareProps } from "./staticSVGChrome"
import {
  chartUID,
  reserveFrameLegendMargin,
  renderFrameLegend,
  defaultTickFormat,
  renderOrdinalGridSVG,
  wrapSVG
} from "./staticSVGChrome"
import { AXIS_FRAME_DEFAULT_MARGIN } from "../stream/frameDefaultMargins"
import {
  isStaticTextTickLabel,
  renderStaticTickForeignObject,
} from "./staticAxisTickLabel"
import {
  resolveLegendSideGutter,
  resolveOrdinalAxisChrome,
  type AxisChromeInput,
} from "../legendLayout"

// `centerContent` is historically an HTML overlay in StreamOrdinalFrame, so
// arbitrary React content must remain inside a foreignObject in static SVG.
// A native SVG element, however, is safe and materially more portable (Figma
// and several SVG importers discard foreignObject entirely). Keep the allow
// list deliberately narrow: unknown components still take the HTML fallback.
const SVG_CENTER_CONTENT_TAGS = new Set([
  "svg", "g", "text", "tspan", "path", "circle", "ellipse", "rect",
  "line", "polyline", "polygon", "use", "image", "defs", "symbol"
])

function renderSvgCenterContent(
  centerContent: React.ReactNode,
  centerX: number,
  centerY: number
): React.ReactNode | null {
  if (!React.isValidElement(centerContent)) return null
  if (
    typeof centerContent.type !== "string" ||
    !SVG_CENTER_CONTENT_TAGS.has(centerContent.type)
  ) {
    return null
  }

  const svgElement = centerContent as React.ReactElement<React.SVGProps<SVGElement>>

  // A bare <text> is the common Gauge readout. Give it useful center defaults
  // without rewriting explicit SVG coordinates or typography supplied by the
  // caller. Other SVG nodes retain their complete native shape untouched.
  const element = svgElement.type === "text"
    ? React.cloneElement(
        svgElement,
        {
          x: svgElement.props.x ?? 0,
          y: svgElement.props.y ?? 0,
          textAnchor: svgElement.props.textAnchor ?? "middle",
          dominantBaseline: svgElement.props.dominantBaseline ?? "middle"
        }
      )
    : svgElement

  return (
    <g
      className="semiotic-radial-center-content"
      transform={`translate(${centerX},${centerY})`}
      pointerEvents="none"
    >
      {element}
    </g>
  )
}

export function generateOrdinalAxesSVG(
  store: OrdinalPipelineStore,
  layout: { width: number; height: number },
  props: StreamOrdinalFrameProps,
  theme: SemioticTheme,
  idPrefix?: string,
  margin?: { top: number; right: number; bottom: number; left: number },
  axisChrome?: AxisChromeInput,
  hasRenderedLegend = false,
): React.ReactNode {
  const scales = store.scales
  if (!scales) return null
  if (scales.projection === "radial") return null

  const s = themeStyles(theme)
  const isVertical = scales.projection === "vertical"
  const columns = store.columns

  // Resolve labels and formatters.
  const catFormat = props.categoryFormat || props.oFormat
  const valFormat = props.valueFormat || props.rFormat
  const catLabel = props.categoryLabel || props.oLabel
  const valLabel = props.valueLabel || props.rLabel
  const legendPosition = props.legendPosition ?? "right"
  const leftSideLegendGutter = resolveLegendSideGutter(
    props.legendLayout,
    axisChrome?.leftAxis,
  )
  const leftAxisLabelMargin =
    hasRenderedLegend && legendPosition === "left" && leftSideLegendGutter > 0
      ? leftSideLegendGutter
      : (margin?.left ?? props.margin?.left ?? 40)

  const categoryTicks = Object.values(columns).map((col, index) => ({
    pixel: col.middle,
    label: catFormat ? catFormat(col.name, index) : col.name
  }))

  // ticksForMode mirrors the client OrdinalSVGOverlay: "exact" pins the
  // value-axis ticks to the data min/max (the axisExtent headline behavior);
  // "nice"/undefined falls through to scale.ticks — byte-identical to before.
  // OrdinalSVGOverlay requests five value ticks for both projections; d3 may
  // return a nearby "nice" count. Do not apply the XY frame's pixel-budget
  // heuristic here or SSR and CSR choose different intervals.
  const rTicks = ticksForMode(scales.r, 5, props.axisExtent).map(v => ({
    pixel: scales.r(v),
    label: (valFormat || defaultTickFormat)(v)
  }))

  if (isVertical) {
    return (
      <g id={`${idPrefix ? `${idPrefix}-` : ""}axes`} className="ordinal-axes">
        <line x1={0} y1={layout.height} x2={layout.width} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oxtick-${i}`} transform={`translate(${tick.pixel},${layout.height})`}>
            <line y2={5} stroke={s.border} strokeWidth={1} />
            {isStaticTextTickLabel(tick.label) ? (
              <text y={18} textAnchor="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
            ) : renderStaticTickForeignObject({
              label: tick.label,
              x: -30,
              y: 6,
              textAlign: "center",
              fontSize: s.tickSize,
              fontFamily: s.fontFamily,
              color: s.textSecondary,
            })}
          </g>
        ))}
        {catLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}>
            {catLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {rTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke={s.border} strokeWidth={1} />
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {valLabel && (
          <text
            x={-leftAxisLabelMargin + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-leftAxisLabelMargin + 15}, ${layout.height / 2})`}
          >
            {valLabel}
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
        {valLabel && (
          <text x={layout.width / 2} y={layout.height + 40} textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}>
            {valLabel}
          </text>
        )}
        <line x1={0} y1={0} x2={0} y2={layout.height} stroke={s.border} strokeWidth={1} />
        {categoryTicks.map((tick, i) => (
          <g key={`oytick-${i}`} transform={`translate(0,${tick.pixel})`}>
            <line x2={-5} stroke={s.border} strokeWidth={1} />
            {isStaticTextTickLabel(tick.label) ? (
              <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
            ) : renderStaticTickForeignObject({
              label: tick.label,
              x: -68,
              y: -12,
              textAlign: "right",
              fontSize: s.tickSize,
              fontFamily: s.fontFamily,
              color: s.textSecondary,
            })}
          </g>
        ))}
        {catLabel && (
          <text
            x={-leftAxisLabelMargin + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-leftAxisLabelMargin + 15}, ${layout.height / 2})`}
          >
            {catLabel}
          </text>
        )}
      </g>
    )
  }
}

export function renderOrdinalFrame(props: StreamOrdinalFrameProps & ThemeAwareProps, sink?: EvidenceSink): string {
  const theme = resolveTheme(props.theme)
  const defaultMargin = AXIS_FRAME_DEFAULT_MARGIN
  const size = props.size || [500, 400]
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
  const hasVisibleTitle = hasTextTitle(props.title)
  const data = filterSparseArray(props.data)
  const ordinalLegendCategories = props.showLegend
    ? extractCategories(data, props.colorAccessor || props.stackBy || props.groupBy)
    : []

  // Both the horizontal and left ordinal axes contribute chrome adjacent to
  // a legend. Compute it once so reservation, placement, and axis-title
  // offsets agree.
  const legendAxisChrome = resolveOrdinalAxisChrome({
    showAxes: props.showAxes,
    projection: props.projection,
    hasCategoryLabel: Boolean(props.categoryLabel || props.oLabel),
    hasValueLabel: Boolean(props.valueLabel || props.rLabel),
  })

  // Expand margin for legend BEFORE calculating inner dimensions
  reserveFrameLegendMargin(margin, {
    props: { ...props, axisChrome: legendAxisChrome },
    categories: ordinalLegendCategories,
    theme,
    size,
    hasTitle: hasVisibleTitle,
  })
  const legend = renderFrameLegend({
    props: { ...props, axisChrome: legendAxisChrome },
    categories: ordinalLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })

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
    // axisExtent ("nice"|"exact") pins the value-axis first/last tick to
    // the data min/max through domain resolution.
    axisExtent: props.axisExtent,
    barPadding: props.barPadding,
    roundedTop: props.roundedTop,
    innerRadius: props.innerRadius,
    cornerRadius: props.cornerRadius,
    normalize: props.normalize,
    startAngle: props.startAngle,
    sweepAngle: props.sweepAngle,
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
    gradientFill: normalizeGradient(props.gradientFill),
    // Frame-level props consumed by the ordinal scene builders/store.
    // symbolAccessor/symbolMap →
    // SwarmPlot/DotPlot glyph shapes; trackFill → SwimlaneChart lane track;
    // connectorOpacity/showLabels → FunnelChart; multiAxis/baselinePadding →
    // multi-series value axis + baseline domain.
    symbolAccessor: props.symbolAccessor,
    symbolMap: props.symbolMap,
    multiAxis: props.multiAxis,
    baselinePadding: props.baselinePadding,
    trackFill: props.trackFill,
    connectorOpacity: props.connectorOpacity,
    showLabels: props.showLabels,
    colorScheme: effectiveColorScheme,
    themeCategorical: theme.colors.categorical,
    themeSemantic: resolveThemeSemanticColors(theme),
    customLayout: props.customLayout,
    layoutConfig: props.layoutConfig,
    layoutMargin: margin,
    layoutSelection: props.layoutSelection,
    barColors: props.barColors
  }

  const store = new OrdinalPipelineStore(pipelineConfig)

  if (props.data) {
    store.ingest({ inserts: data, bounded: true })
  }

  store.computeScene({ width, height })

  // Resolve function-valued graphics exactly once against the same geometry
  // and scales used by the retained ordinal scene. This mirrors the live
  // frame contract and avoids passing callback functions through to ReactDOM
  // as children during static rendering.
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
      projection: projection as "vertical" | "horizontal" | "radial",
      idPrefix: props._idPrefix,
      onRender: result => { annotationRender = result },
    }) : null
    if (sink) {
      sink.evidence = buildEvidence({
        frameType: "ordinal",
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
          {store.customLayoutOverlays}
        </>
      )
      : null
    return ReactDOMServer.renderToStaticMarkup(
      wrapSVG(emptyContent, {
        width: size[0], height: size[1],
        className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
        legend,
        idPrefix: props._idPrefix,
      })
    )
  }

  const idPfx = (props as ThemeAwareProps)._idPrefix
  const grid = props.showGrid ? renderOrdinalGridSVG(store, { width, height }, theme, idPfx, props.axisExtent) : null

  // Check for bar-funnel dropoff bars — they need SVG hatch patterns
  const hasDropoffBars = store.scene.some(
    (node: OrdinalSceneNode) => node.type === "rect" && node.datum?.__barFunnelIsDropoff
  )
  let hatchDefs: React.ReactNode = null
  if (hasDropoffBars) {
    const uid = chartUID(props)
    // Build a hatch pattern for each unique fill color used by dropoff bars
    const dropoffColors = new Set<string>()
    for (const n of store.scene) {
      if (n.type === "rect" && n.datum?.__barFunnelIsDropoff) {
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
      if (n.type === "rect" && n.datum?.__barFunnelIsDropoff) {
        const origFill = typeof n.style.fill === "string" ? n.style.fill : "#666"
        n.style = { ...n.style, fill: `url(#${colorToPatternId.get(origFill)})` }
      }
    }
  }

  const renderedScene = renderOrdinalSceneListWithBackend({
    nodes: store.scene,
    renderMode: props.renderMode,
    idPrefix: idPfx,
  })
  const dataMarks = renderedScene.map(entry => entry.element)

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateOrdinalAxesSVG(
        store,
        { width, height },
        props,
        theme,
        idPfx,
        margin,
        legendAxisChrome,
        Boolean(legend),
      )
    : null

  // Annotations — same custom-rule path as XY so ordinal custom overlays
  // survive renderChart.
  let annotationRender: StaticAnnotationRenderResult | undefined
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    svgAnnotationRules: props.svgAnnotationRules,
    annotationData: data,
    scales: {
      o: store.scales.o,
      r: store.scales.r,
      y: store.scales.projection === "vertical" ? store.scales.r : undefined,
    },
    layout: { width, height },
    theme,
    projection: projection as "vertical" | "horizontal" | "radial",
    xAccessor: typeof props.oAccessor === "string" ? props.oAccessor : undefined,
    yAccessor: typeof props.rAccessor === "string" ? props.rAccessor : undefined,
    idPrefix: idPfx,
    onRender: result => { annotationRender = result },
  }) : null

  if (sink) {
    const oDomain = store.scales.o?.domain?.()
    sink.evidence = buildEvidence({
      frameType: "ordinal",
      width: size[0], height: size[1],
      marks: renderedScene.map(entry => entry.node),
      title: props.title, description: props.description,
      annotations: props.annotations,
      annotationRender,
      yDomain: numericDomain(store.scales.r?.domain?.()),
      categories: Array.isArray(oDomain) ? oDomain.map(String) : undefined,
      margin,
    })
  }

  // StreamOrdinalFrame places donut center content as an HTML overlay. A
  // standalone SVG has no surrounding positioned container, so preserve that
  // slot with a foreignObject for HTML. Native SVG content takes the portable
  // SVG path above instead, avoiding foreignObject for Gauge text/icons.
  const svgCenterContent = isRadial && props.centerContent
    ? renderSvgCenterContent(
        props.centerContent,
        margin.left + width / 2,
        margin.top + height / 2
      )
    : null
  const centerContent = isRadial && props.centerContent
    ? svgCenterContent ?? (
        <foreignObject x={margin.left} y={margin.top} width={width} height={height} pointerEvents="none">
          <div
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
          >
            {props.centerContent}
          </div>
        </foreignObject>
      )
    : null

  const plotContent = (
    <>
      {grid}
      {dataMarks}
      {axes}
      {annotationNodes}
      {resolvedForegroundGraphics}
      {store.customLayoutOverlays}
    </>
  )

  // Preserve the established absolute radial-center transform (used by SSR
  // consumers for stable geometry) while counter-translating only the
  // background graphics back to the plot origin. Marks/axes/annotations stay
  // centered; background graphics use the same margin-relative coordinates as
  // cartesian ordinal frames.
  const content = isRadial ? (
    <>
      {resolvedBackgroundGraphics ? (
        <g transform={`translate(${-width / 2},${-height / 2})`}>
          {resolvedBackgroundGraphics}
        </g>
      ) : null}
      {plotContent}
    </>
  ) : (
    <>
      {resolvedBackgroundGraphics}
      {plotContent}
    </>
  )

  return ReactDOMServer.renderToStaticMarkup(
    wrapSVG(content, {
      width: size[0], height: size[1],
      className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme,
      innerTransform: isRadial
        ? `translate(${margin.left + width / 2},${margin.top + height / 2})`
        : `translate(${margin.left},${margin.top})`,
      innerWidth: width, innerHeight: height,
      legend,
      defs: hatchDefs,
      outerElements: centerContent,
      idPrefix: props._idPrefix,
    })
  )
}

// ── Geo SSR ─────────────────────────────────────────────────────────────
