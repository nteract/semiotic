import { filterSparseArray } from "../charts/shared/sparseArray"
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
import { ordinalSceneNodeToSVG } from "../stream/SceneToSVG"
import { renderSceneListWithBackend } from "../stream/renderBackend"
import { resolveTheme, themeStyles } from "./themeResolver"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { hasTextTitle, reserveTitleMargin } from "../stream/titleLayout"
import {
  extractCategories
} from "./staticLegend"
import { renderStaticAnnotations } from "./staticAnnotations"
import { createSVGHatchPattern } from "./svgHatchPattern"
import type { SemioticTheme } from "../store/ThemeStore"
import type { ThemeAwareProps } from "./staticSVGChrome"
import {
  chartUID,
  reserveFrameLegendMargin,
  renderFrameLegend,
  defaultTickFormat,
  renderOrdinalGridSVG,
  wrapSVG
} from "./staticSVGChrome"

export function generateOrdinalAxesSVG(
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

  // Prefer new-style names with legacy fallback
  const catFormat = props.categoryFormat || props.oFormat
  const valFormat = props.valueFormat || props.rFormat
  const catLabel = props.categoryLabel || props.oLabel
  const valLabel = props.valueLabel || props.rLabel

  const categoryTicks = Object.values(columns).map(col => ({
    pixel: col.middle,
    label: (catFormat || String)(col.name)
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
            <text y={18} textAnchor="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
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
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
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
            <text x={-8} textAnchor="end" dominantBaseline="middle" fontSize={s.tickSize} fill={s.textSecondary} fontFamily={s.fontFamily}>{tick.label}</text>
          </g>
        ))}
        {catLabel && (
          <text
            x={-(props.margin?.left ?? 40) + 15}
            y={layout.height / 2}
            textAnchor="middle" fontSize={s.labelSize} fill={s.text} fontFamily={s.fontFamily}
            transform={`rotate(-90, ${-(props.margin?.left ?? 40) + 15}, ${layout.height / 2})`}
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
  const defaultMargin = { top: 20, right: 20, bottom: 30, left: 40 }
  const size = props.size || [500, 400]
  const margin = reserveTitleMargin({ ...defaultMargin, ...props.margin }, props.title)
  const hasVisibleTitle = hasTextTitle(props.title)
  const data = filterSparseArray(props.data)
  const ordinalLegendCategories = props.showLegend
    ? extractCategories(data, props.colorAccessor || props.stackBy || props.groupBy)
    : []

  // Expand margin for legend BEFORE calculating inner dimensions
  reserveFrameLegendMargin(margin, {
    props,
    categories: ordinalLegendCategories,
    theme,
    size,
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
    // the data min/max via domain resolution. Client parity: StreamOrdinalFrame
    // passes it into its pipeline config; without it here `axisExtent: "exact"`
    // silently no-ops in SSR (same class of bug as gradientFill).
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
    gradientFill: props.gradientFill,
    // Frame-level props the ordinal scene builders/store read but that this
    // hand-maintained config previously omitted — so the low-level
    // renderOrdinalToStaticSVG path silently dropped them (the same class as
    // the gradientFill gap). Each is a safe passthrough: undefined for callers
    // that don't set it, matching prior behavior. symbolAccessor/symbolMap →
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

  if (!store.scales || store.scene.length === 0) {
    if (sink) {
      sink.evidence = buildEvidence({
        frameType: "ordinal",
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
        className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
        title: props.title, description: props.description, background: props.background,
        theme, innerTransform: `translate(${margin.left},${margin.top})`,
        innerWidth: width, innerHeight: height,
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

  const renderedScene = renderSceneListWithBackend({
    nodes: store.scene,
    renderMode: props.renderMode,
    fallback: (node, index) => ordinalSceneNodeToSVG(node, index, idPfx),
  })
  const dataMarks = renderedScene.map(entry => entry.element)

  if (sink) {
    const oDomain = store.scales.o?.domain?.()
    sink.evidence = buildEvidence({
      frameType: "ordinal",
      width: size[0], height: size[1],
      marks: renderedScene.map(entry => entry.node),
      title: props.title, description: props.description,
      annotations: props.annotations,
      yDomain: numericDomain(store.scales.r?.domain?.()),
      categories: Array.isArray(oDomain) ? oDomain.map(String) : undefined,
    })
  }

  const showAxes = props.showAxes !== false
  const axes = showAxes
    ? generateOrdinalAxesSVG(store, { width, height }, props, theme, idPfx)
    : null

  // Annotations
  const annotationNodes = props.annotations ? renderStaticAnnotations({
    annotations: props.annotations,
    autoPlaceAnnotations: props.autoPlaceAnnotations,
    scales: {
      o: store.scales.o,
      r: store.scales.r,
      y: store.scales.projection === "vertical" ? store.scales.r : undefined,
    },
    layout: { width, height },
    theme,
    projection: projection as "vertical" | "horizontal" | "radial",
    idPrefix: idPfx,
  }) : null

  // Legend — auto-build from colorAccessor/stackBy/groupBy + showLegend, OR
  // honor caller-supplied pre-rendered ReactNode. See XY block for the
  // contract; same pattern. Config-object form deferred.
  const legend = renderFrameLegend({
    props,
    categories: ordinalLegendCategories,
    theme,
    size,
    margin,
    hasTitle: hasVisibleTitle,
  })

  const translateX = isRadial ? margin.left + width / 2 : margin.left
  const translateY = isRadial ? margin.top + height / 2 : margin.top

  // StreamOrdinalFrame places donut center content as an HTML overlay. A
  // standalone SVG has no surrounding positioned container, so preserve the
  // same slot with a foreignObject centered over the radial plot area.
  const centerContent = isRadial && props.centerContent ? (
    <foreignObject x={margin.left} y={margin.top} width={width} height={height} pointerEvents="none">
      <div
        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
      >
        {props.centerContent}
      </div>
    </foreignObject>
  ) : null

  const content = (
    <>
      {props.backgroundGraphics}
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
      className: `stream-ordinal-frame${props.className ? ` ${props.className}` : ""}`,
      title: props.title, description: props.description, background: props.background,
      theme, innerTransform: `translate(${translateX},${translateY})`,
      innerWidth: width, innerHeight: height,
      legend,
      defs: hatchDefs,
      outerElements: centerContent,
      idPrefix: props._idPrefix,
    })
  )
}

// ── Geo SSR ─────────────────────────────────────────────────────────────
