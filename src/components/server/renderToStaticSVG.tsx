import type { Datum } from "../charts/shared/datumTypes"
import { isChartMode, resolveChartMode } from "../charts/shared/chartMode"
import { normalizePartialMargin, type PartialMargin } from "../types/marginType"
/**
 * Server-side rendering of Semiotic charts to standalone SVG strings.
 * Family implementations live in staticXY / staticOrdinal / staticNetwork /
 * staticGeo / staticPhysics; shared chrome in staticSVGChrome.
 */
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { StreamXYFrameProps } from "../stream/types"
import type { StreamNetworkFrameProps } from "../stream/networkTypes"
import type { StreamOrdinalFrameProps } from "../stream/ordinalTypes"
import type { StreamGeoFrameProps } from "../stream/geoTypes"
import { CHART_CONFIGS } from "./serverChartConfigs"
import { resolveTheme, themeStyles, type ThemeInput } from "./themeResolver"
import {
  buildEvidence,
  type EvidenceSink,
  type RenderEvidence
} from "./renderEvidence"
import {
  type ThemeAwareProps,
  type StaticFrameProps,
  type StaticPhysicsFrameProps,
  type FrameType,
} from "./staticSVGChrome"
import { renderStreamXYFrame } from "./staticXY"
import { renderOrdinalFrame } from "./staticOrdinal"
import { renderNetworkFrame } from "./staticNetwork"
import { renderGeoFrame } from "./staticGeo"
import { renderPhysicsFrame } from "./staticPhysics"
import type { SharpFactory, SharpModule } from "./optionalImageTypes"

export function renderToStaticSVG(
  frameType: FrameType,
  props: StaticFrameProps
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
    case "physics":
      return renderPhysicsFrame(props as StaticPhysicsFrameProps & ThemeAwareProps)
    default:
      throw new Error(
        `Unknown frame type: ${frameType}. Must be "xy", "ordinal", "network", "geo", or "physics".`
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

/**
 * Chart component names renderable via `renderChart()`. Derived from the
 * registry so adding a chart to `CHART_CONFIGS` automatically widens this
 * union — no second edit required, no silent drift like the CandlestickChart
 * gap that motivated this refactor.
 */
type ChartName = keyof typeof CHART_CONFIGS

interface RenderChartOptions {
  /** Output format — currently only "svg" is synchronous */
  format?: "svg"
}

const COMMON_FRAME_PROP_KEYS = [
  "showAxes",
  "axes",
  "axisExtent",
  "xLabel",
  "yLabel",
  "yLabelRight",
  "categoryLabel",
  "valueLabel",
  "xFormat",
  "yFormat",
  "categoryFormat",
  "valueFormat",
  "tickFormatTime",
  "tickFormatValue",
  "xScaleType",
  "yScaleType",
  "xExtent",
  "yExtent",
  "rExtent",
  "oExtent",
  "extentPadding",
  "scalePadding",
  "sizeRange",
  "innerRadius",
  "centerContent",
  "curve",
  "gradientFill",
  "lineGradient",
  "lineStyle",
  "pointStyle",
  "areaStyle",
  "barStyle",
  "waterfallStyle",
  "swarmStyle",
  "pieceStyle",
  "summaryStyle",
  "nodeStyle",
  "edgeStyle",
  "connectorStyle",
  "backgroundGraphics",
  "foregroundGraphics",
  "svgPreRenderers",
  "barColors",
  "legend",
  "legendLayout",
] as const

const CHART_MODE_PROP_KEYS = [
  "width",
  "height",
  "showAxes",
  "showGrid",
  "enableHover",
  "showLegend",
  "showLabels",
  "showCategoryTicks",
  "orientation",
  "title",
  "description",
  "summary",
  "accessibleTable",
  "xLabel",
  "yLabel",
  "categoryLabel",
  "valueLabel",
  "linkedHover",
  "mobileInteraction",
  "mobileSemantics",
  "responsiveRules",
] as const

function pickDefinedProps(source: Datum, keys: readonly string[]): Datum {
  const picked: Datum = {}
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key]
  }
  return picked
}

/**
 * Render a chart using HOC-level props (categoryAccessor, valueAccessor, etc.)
 * instead of frame-level props (oAccessor, rAccessor, etc.).
 *
 * This is the primary API for AI/MCP workflows.
 */
export function renderChart(
  component: ChartName,
  props: Datum,
  options?: RenderChartOptions
): string {
  return renderChartInternal(component, props, options).svg
}

/**
 * Render a chart and return machine-readable evidence about what actually
 * rendered — mark counts by scene type, resolved axis domains, emptiness,
 * legend/annotation counts, and the accessible name. The evidence is computed
 * from the same scene graph the SVG converter walks, so it is ground truth a
 * non-visual caller (an agent repair loop, a CI assertion) can quote without
 * pixel inspection. Exposed through the MCP `renderChart` tool response.
 */
export function renderChartWithEvidence(
  component: ChartName,
  props: Datum,
  options?: RenderChartOptions
): { svg: string; evidence: RenderEvidence } {
  const sink: EvidenceSink = {}
  const { svg, frameType } = renderChartInternal(component, props, options, sink)
  const evidence: RenderEvidence =
    sink.evidence ??
    // Defensive: every frame renderer populates the sink, so this only fires
    // if a future renderer forgets — surface that as its own warning rather
    // than returning undefined evidence.
    buildEvidence({
      frameType,
      width: typeof props.width === "number" ? props.width : 600,
      height: typeof props.height === "number" ? props.height : 400,
      marks: [],
      title: typeof props.title === "string" ? props.title : undefined,
      description: typeof props.description === "string" ? props.description : undefined,
      annotations: props.annotations,
      extraWarnings: ["NO_EVIDENCE"],
    })
  evidence.component = component
  return { svg, evidence }
}

function renderChartInternal(
  component: ChartName,
  props: Datum,
  _options?: RenderChartOptions,
  sink?: EvidenceSink
): { svg: string; frameType: RenderEvidence["frameType"] } {
  // Resolve the public HOC contract before mapping chart-specific props. The
  // resolver is the same pure function every React chart HOC consumes, so
  // context/sparkline/mobile dimensions and chrome cannot drift in SSR.
  const config = CHART_CONFIGS[component]
  if (!config) {
    throw new Error(
      `Unknown chart component: "${component}". ` +
      `See CLAUDE.md for supported chart types.`
    )
  }
  // Some chart families also own a chart-specific `mode` prop (for example
  // physics `mode="mechanical"`). Only consume the four semantic display
  // modes here; the original prop remains in `rest` for the chart builder.
  const requestedMode = config.layout?.mode ?? (isChartMode(props.mode) ? props.mode : undefined)
  const resolvedMode = resolveChartMode(
    requestedMode,
    {
      ...config.layout?.modeDefaults,
      ...pickDefinedProps(props, CHART_MODE_PROP_KEYS),
    },
    config.layout?.primarySize,
  )

  const {
    data, theme, background, className, annotations,
    margin, colorScheme, colorBy, legendPosition,
    ...rest
  } = props

  const { width, height } = resolvedMode
  const size: [number, number] = [width, height]
  // Flatten frameProps plus known frame-level top-level props into common.
  // Top-level props win so renderChart mirrors the React HOC API.
  const framePropsOverrides = rest.frameProps || {}
  const layoutMargin = config.layout?.margin
  const defaultMargin = typeof layoutMargin === "function"
    ? layoutMargin(props, resolvedMode)
    : layoutMargin ?? resolvedMode.marginDefaults
  // Keep the caller-supplied margin separately from the resolved default.
  // Some chart HOCs (for example DifferenceChart's custom legend) only
  // reserve their standard legend gutter when that side was not explicitly
  // set by the caller. The static configuration needs the same distinction.
  const explicitMargin = margin !== undefined ? margin : framePropsOverrides.margin
  // useChartLegendAndMargin merges partial caller margins over its mode
  // defaults. Preserve that same shape before handing props to a static
  // frame; otherwise `{ right: 64 }` accidentally falls back to the lower
  // level frame's 20px top/left defaults.
  const normalizedExplicitMargin = normalizePartialMargin(explicitMargin as PartialMargin | undefined)
  const effectiveMargin = typeof explicitMargin === "number"
    ? { top: explicitMargin, right: explicitMargin, bottom: explicitMargin, left: explicitMargin }
    : { ...defaultMargin, ...normalizedExplicitMargin }
  const topLevelFrameProps = pickDefinedProps(rest, COMMON_FRAME_PROP_KEYS)
  const common: Datum & ThemeAwareProps & { size: [number, number] } = {
    ...framePropsOverrides,
    ...topLevelFrameProps,
    theme,
    title: resolvedMode.title,
    description: resolvedMode.description,
    showAxes: resolvedMode.showAxes,
    showLegend: resolvedMode.showLegend,
    showLabels: resolvedMode.showLabels,
    showGrid: resolvedMode.showGrid,
    xLabel: resolvedMode.xLabel,
    yLabel: resolvedMode.yLabel,
    categoryLabel: resolvedMode.categoryLabel,
    valueLabel: resolvedMode.valueLabel,
    background, className, annotations,
    size,
    margin: effectiveMargin,
    __explicitMargin: explicitMargin,
    // renderChart is the HOC-level server API. Its legend reservation must
    // follow useChartLegendAndMargin rather than the lower-level static
    // renderer's content-measurement-only behavior.
    __autoLegendMargin: true,
    ...(colorScheme !== undefined && { colorScheme }),
    ...(legendPosition !== undefined && { legendPosition }),
    _idPrefix: rest._idPrefix,
  }

  const frameProps2 = config.buildProps(data, colorBy, colorScheme, common, rest)

  // Dispatch to the appropriate frame renderer
  let svg: string
  switch (config.frameType) {
    case "xy":
      svg = renderStreamXYFrame(frameProps2 as StreamXYFrameProps & ThemeAwareProps, sink)
      break
    case "ordinal":
      svg = renderOrdinalFrame(frameProps2 as StreamOrdinalFrameProps & ThemeAwareProps, sink)
      break
    case "network":
      svg = renderNetworkFrame(frameProps2 as StreamNetworkFrameProps & ThemeAwareProps, sink)
      break
    case "geo":
      svg = renderGeoFrame(frameProps2 as StreamGeoFrameProps & ThemeAwareProps, sink)
      break
    case "physics":
      svg = renderPhysicsFrame(frameProps2 as StaticPhysicsFrameProps, sink)
      break
  }

  const overlay = config.renderOverlay?.(frameProps2, { theme: resolveTheme(theme) })
  if (overlay != null) {
    const overlayMarkup = ReactDOMServer.renderToStaticMarkup(<>{overlay}</>)
    svg = svg.replace("</svg>", `${overlayMarkup}</svg>`)
  }

  return { svg, frameType: config.frameType as RenderEvidence["frameType"] }
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
  props: Datum,
  options: RenderToImageOptions = {}
): Promise<Buffer> {
  const { format = "png", scale = 1, background } = options

  // Generate SVG
  let svg: string
  const frameTypes = ["xy", "ordinal", "network", "geo", "physics"]
  if (frameTypes.includes(frameTypeOrComponent)) {
    svg = renderToStaticSVG(frameTypeOrComponent as FrameType, props as StaticFrameProps)
  } else {
    svg = renderChart(frameTypeOrComponent as ChartName, props)
  }

  // Apply background if specified
  if (background) {
    svg = svg.replace(/<svg /, `<svg style="background:${background}" `)
  }

  // Load sharp dynamically — optional dep, loaded at call time only.
  // The variable specifier defeats static bundler resolution so sharp stays
  // out of edge/browser-oriented server bundles until this Node-only raster
  // export path is actually called.
  let sharp: SharpFactory
  try {
    const moduleName = "sharp"
    const sharpModule: SharpModule = await import(moduleName)
    sharp = sharpModule.default ?? sharpModule
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
  props: Datum
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
      svgStr = renderToStaticSVG(chart.frameType, chartProps as StaticFrameProps)
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
