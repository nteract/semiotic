import type { Datum } from "../charts/shared/datumTypes"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import {
  composeLegendConfigs,
  isGradientLegendConfig,
  isLegendConfig
} from "../types/legendTypes"
import type {
  StreamXYFrameProps,
  StreamScales,
  StreamLayout
} from "../stream/types"
import type {
  StreamNetworkFrameProps,
  RealtimeEdge
} from "../stream/networkTypes"
import type { StreamOrdinalFrameProps } from "../stream/ordinalTypes"
import type { StreamGeoFrameProps } from "../stream/geoTypes"
import type { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type { StaticPhysicsFrameProps } from "./staticPhysics"
import {
  renderStaticLegend,
  renderStaticLegendGroups,
  renderStaticGradientLegend,
  buildStaticCategoricalLegendConfig,
} from "./staticLegend"
import { renderStaticRawLegend } from "./staticRawLegend"
import {
  reserveLegendConfigMargin,
  reserveStaticLegendMargin,
} from "./staticLegendMargin"
export {
  reserveLegendConfigMargin,
  reserveStaticLegendMargin,
} from "./staticLegendMargin"
import { resolveTheme, themeStyles, type ThemeInput } from "./themeResolver"
import type { SemioticTheme } from "../store/themeCore"
import * as React from "react"
import { TITLE_BASELINE } from "../stream/titleLayout"
import {
  resolveAxisLineStyle,
  resolveHorizontalTickAnchor,
  resolveVerticalTickBaseline,
  tickPixelExtent,
  jaggedBaselinePath,
} from "../stream/svgOverlayUtils"
import { axisTickCount, defaultTickFormat as defaultAxisTickFormat } from "../stream/axisTickUtils"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import {
  isStaticTextTickLabel,
  renderStaticTickForeignObject,
} from "./staticAxisTickLabel"
import {
  createStaticAxisTicks,
  isStaticAxisLandmark,
  resolveStaticAxisTicks,
  staticAxisLabelWidth,
} from "./staticXYAxisTicks"
import {
  clampLegendReservation,
  resolveLegendSideGutter,
  type AxisChromeInput
} from "../legendLayout"

export type FrameType = "xy" | "ordinal" | "network" | "geo" | "physics"
export type StaticFrameProps = (
  | StreamXYFrameProps
  | StreamNetworkFrameProps
  | StreamOrdinalFrameProps
  | StreamGeoFrameProps
  | StaticPhysicsFrameProps
) &
  ThemeAwareProps
export type CategoricalAccessor = string | ((d: Datum) => string)
type EdgeEndpoint =
  RealtimeEdge["source"] | RealtimeEdge["target"] | null | undefined

export function edgeEndpointId(endpoint: EdgeEndpoint): string | null {
  if (typeof endpoint === "string") return endpoint
  if (endpoint && typeof endpoint === "object") {
    const id = (endpoint as { id?: unknown }).id
    return id == null ? null : String(id)
  }
  return null
}

/** Generate a short stable ID from chart props for unique SVG element IDs */
export function chartUID(props: Datum): string {
  // Prefer _idPrefix (set by renderDashboard), then chartId, then hash
  const raw = props._idPrefix || props.chartId
  if (raw) {
    const sanitized = String(raw).replace(/[^a-zA-Z0-9_-]/g, "_")
    // Ensure valid XML Name: must start with letter or underscore
    return /^[A-Za-z_]/.test(sanitized) ? sanitized : `c${sanitized}`
  }
  const key = `${props.chartType || ""}:${props.title || ""}:${Array.isArray(props.data) ? props.data.length : 0}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return `c${(h >>> 0).toString(36)}`
}

// ── Shared rendering helpers ──────────────────────────────────────────

export interface ThemeAwareProps {
  theme?: ThemeInput
  showLegend?: boolean
  showGrid?: boolean
  annotations?: Datum[]
  title?: string | React.ReactNode
  description?: string
  background?: string
  className?: string
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  /** Prefix for SVG element IDs — used by renderDashboard to avoid collisions */
  _idPrefix?: string
  /** Internal HOC mode signal used by axis-free static chart chrome. */
  __compactMode?: boolean
  __autoLegendMargin?: boolean
  /**
   * The supplied legend already contains the chart HOC's inferred groups.
   * Specialized charts use this when their semantic categories cannot be
   * reconstructed from the lower-level frame data (for example Likert's
   * split neutral buckets). Caller legend groups may still be composed into
   * that complete value by the chart config.
   */
  __legendIncludesAutomatic?: boolean
}

type LegendPosition = "right" | "left" | "top" | "bottom"
type StaticLegendHostProps = ThemeAwareProps & {
  legend?: unknown
  colorScheme?: string | string[] | Record<string, string>
  /**
   * Bottom-axis chrome, so a bottom legend is placed and reserved outside the
   * tick labels. Frames without a horizontal axis omit it and keep a 0 gutter.
   */
  axisChrome?: AxisChromeInput
}

function effectiveFrameLegend(
  props: StaticLegendHostProps,
  categories: string[],
  theme: ReturnType<typeof resolveTheme>
): LegendValue | undefined {
  const automatic =
    props.showLegend && !props.__legendIncludesAutomatic
      ? buildStaticCategoricalLegendConfig(categories, props.colorScheme, theme)
      : undefined
  return composeLegendConfigs(
    automatic,
    props.legend as LegendValue | undefined
  )
}

const HOC_LEGEND_MARGIN: Record<LegendPosition, number> = {
  right: 110,
  left: 110,
  top: 50,
  bottom: 80
}

/**
 * The client HOCs reserve a minimum legend gutter before layout. The static
 * frame API uses the same content measurement, while renderChart() marks HOC
 * requests so both paths retain their compatibility floor. Caller-supplied
 * numeric sides are minima and therefore compose with this requirement.
 */
export function hocLegendMarginMinimum(
  props: ThemeAwareProps,
  position: LegendPosition
): number | undefined {
  if (!props.__autoLegendMargin) return undefined
  return HOC_LEGEND_MARGIN[position]
}

export function renderLegendConfig(
  legend: unknown,
  options: {
    theme: ReturnType<typeof resolveTheme>
    position?: "right" | "left" | "top" | "bottom"
    size: [number, number]
    margin: { top: number; right: number; bottom: number; left: number }
    hasTitle?: boolean
    legendLayout?: LegendLayout
    idPrefix?: string
    reservedWidth?: number
    axisChrome?: AxisChromeInput
  }
): React.ReactNode {
  const base = {
    theme: options.theme,
    position: options.position || "right",
    totalWidth: options.size[0],
    totalHeight: options.size[1],
    margin: options.margin,
    hasTitle: options.hasTitle,
    legendLayout: options.legendLayout,
    idPrefix: options.idPrefix,
    reservedWidth: options.reservedWidth,
    axisChrome: options.axisChrome,
    legendDistance:
      isLegendConfig(legend) || isGradientLegendConfig(legend)
        ? legend.legendDistance
        : undefined
  }
  if (isLegendConfig(legend)) {
    return renderStaticLegendGroups({
      ...base,
      legendGroups: legend.legendGroups
    })
  }
  if (isGradientLegendConfig(legend)) {
    return renderStaticGradientLegend({ ...base, gradient: legend.gradient })
  }
  return null
}

/** Reserve the plot gutter for either a supplied legend config or categories. */
export function reserveFrameLegendMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    props: StaticLegendHostProps
    categories: string[]
    theme: ReturnType<typeof resolveTheme>
    size: [number, number]
    hasTitle?: boolean
  }
): LegendPosition {
  const { props, categories, theme, size, hasTitle } = options
  const position = props.legendPosition || "right"
  const baselineMargin = { ...margin }
  const shared = {
    theme,
    position,
    size,
    hasTitle,
    legendLayout: props.legendLayout,
    axisChrome: props.axisChrome,
    minimumMargin: hocLegendMarginMinimum(props, position)
  }
  if (props.legend !== undefined && props.legend !== null) {
    const legend = effectiveFrameLegend(props, categories, theme)
    if (legend !== undefined && legend !== null && legend !== false) {
      reserveLegendConfigMargin(margin, { ...shared, legend })
    }
  } else if (props.showLegend && categories.length > 0) {
    reserveStaticLegendMargin(margin, {
      ...shared,
      categories,
      colorScheme: props.colorScheme
    })
  }
  clampLegendReservation(margin, baselineMargin, size, position)
  return position
}

/** Render caller-supplied or automatic categorical legends with one contract. */
export function renderFrameLegend(options: {
  props: StaticLegendHostProps
  categories: string[]
  theme: ReturnType<typeof resolveTheme>
  size: [number, number]
  margin: { top: number; right: number; bottom: number; left: number }
  hasTitle?: boolean
}): React.ReactNode {
  const { props, categories, theme, size, margin, hasTitle } = options
  const position = props.legendPosition || "right"
  const shared = {
    theme,
    position,
    size,
    margin,
    hasTitle,
    legendLayout: props.legendLayout,
    axisChrome: props.axisChrome,
    idPrefix: props._idPrefix
  }
  if (props.legend !== undefined && props.legend !== null) {
    const legend = effectiveFrameLegend(props, categories, theme)
    if (React.isValidElement(legend)) {
      return renderStaticRawLegend(
        legend,
        size,
        margin,
        position,
        props.legendLayout,
        props.axisChrome,
      )
    }
    const configured = renderLegendConfig(legend, shared)
    if (configured) return configured
    if (isLegendConfig(legend) || isGradientLegendConfig(legend)) return null
    return renderStaticRawLegend(
      (legend ?? null) as React.ReactNode,
      size,
      margin,
      position,
      props.legendLayout,
      props.axisChrome,
    )
  }
  if (!props.showLegend || categories.length === 0) return null
  return renderStaticLegend({
    categories,
    colorScheme: props.colorScheme,
    theme,
    position,
    totalWidth: size[0],
    totalHeight: size[1],
    margin,
    hasTitle,
    legendLayout: props.legendLayout,
    axisChrome: props.axisChrome,
    idPrefix: props._idPrefix
  })
}

/** Shared with the live overlay so time-scale defaults stay human-readable. */
export const defaultTickFormat = defaultAxisTickFormat

/** Render grid lines for ordinal charts */
export function renderOrdinalGridSVG(
  store: OrdinalPipelineStore,
  layout: { width: number; height: number },
  theme: SemioticTheme,
  idPrefix?: string,
  axisExtent?: AxisExtentMode
): React.ReactNode {
  const scales = store.scales
  if (!scales || scales.projection === "radial") return null
  const { grid } = themeStyles(theme)
  const pfx = idPrefix ? `${idPrefix}-` : ""
  const isVertical = scales.projection === "vertical"
  // Match the axis ticks (and the client) under axisExtent:"exact".
  // Match OrdinalSVGOverlay's fixed request; this is intentionally distinct
  // from the responsive XY tick budget.
  const rTicks = ticksForMode(scales.r, 5, axisExtent)

  if (isVertical) {
    return (
      <g id={`${pfx}grid`} className="semiotic-grid" opacity={0.8}>
        {rTicks.map((v: number, i: number) => {
          const py = scales.r(v)
          return (
            <line
              key={`gr-${i}`}
              x1={0}
              y1={py}
              x2={layout.width}
              y2={py}
              stroke={grid}
              strokeWidth={0.5}
            />
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
            <line
              key={`gr-${i}`}
              x1={px}
              y1={0}
              x2={px}
              y2={layout.height}
              stroke={grid}
              strokeWidth={0.5}
            />
          )
        })}
      </g>
    )
  }
}

/** Wrap SVG content with accessibility attributes */
export function wrapSVG(
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
  const background = opts.background ?? s.background
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
      {background && background !== "transparent" && (
        <rect
          x={0}
          y={0}
          width={opts.width}
          height={opts.height}
          fill={background}
        />
      )}
      <g id={`${pfx}data-area`} transform={opts.innerTransform}>
        {content}
      </g>
      {titleText && (
        <text
          id={`${pfx}chart-title`}
          x={opts.width / 2}
          y={TITLE_BASELINE}
          textAnchor="middle"
          fontSize={s.titleFontSize}
          fontWeight={s.titleFontWeight}
          fill={s.text}
          fontFamily={s.titleFontFamily}
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

export function generateAxesSVG(
  scales: StreamScales,
  layout: StreamLayout,
  props: StreamXYFrameProps,
  theme: SemioticTheme,
  idPrefix?: string,
  margin?: { top: number; right: number; bottom: number; left: number },
  axisChrome?: AxisChromeInput,
  hasRenderedLegend = false,
): React.ReactNode {
  const s = themeStyles(theme)
  const legendPosition = props.legendPosition ?? "right"
  const leftSideLegendGutter = resolveLegendSideGutter(
    props.legendLayout,
    axisChrome?.leftAxis,
  )
  const rightSideLegendGutter = resolveLegendSideGutter(
    props.legendLayout,
    axisChrome?.rightAxis,
  )
  const leftAxisLabelMargin =
    hasRenderedLegend && legendPosition === "left" && leftSideLegendGutter > 0
      ? leftSideLegendGutter
      : (margin?.left ?? props.margin?.left ?? 40)
  const rightAxisLabelMargin =
    hasRenderedLegend && legendPosition === "right" && rightSideLegendGutter > 0
      ? rightSideLegendGutter
      : (margin?.right ?? props.margin?.right ?? 40)
  // ticksForMode mirrors the client SVGOverlay: "exact" yields equidistant
  // ticks inclusive of the data min/max (the axisExtent headline behavior);
  // "nice"/undefined falls through to scale.ticks — byte-identical to before.
  // Match SVGOverlay's responsive tick budget. d3's `ticks(5)` can emit
  // seven "nice" values on a short plot while the browser deliberately
  // requests fewer labels to keep the axis legible.
  const bottomAxis = props.axes?.find((axis) => axis.orient === "bottom")
  const topAxis = props.axes?.find((axis) => axis.orient === "top")
  const leftAxis = props.axes?.find((axis) => axis.orient === "left")
  const rightAxis = props.axes?.find((axis) => axis.orient === "right")
  const xAxis = bottomAxis ?? topAxis
  const yAxis = leftAxis ?? rightAxis
  const xOrient = bottomAxis ? "bottom" : topAxis ? "top" : "bottom"
  const yOrient = leftAxis ? "left" : rightAxis ? "right" : "left"
  const xBaselineY = xOrient === "top" ? 0 : layout.height
  const yBaselineX = yOrient === "right" ? layout.width : 0
  const xTickDirection = xOrient === "top" ? -1 : 1
  const yTickDirection = yOrient === "right" ? 1 : -1
  const xExtentMode = xAxis?.extent ?? props.axisExtent
  const yExtentMode = yAxis?.extent ?? props.axisExtent
  const resolvedXTickCount =
    xExtentMode === "exact"
      ? 5
      : Math.min(5, Math.max(2, Math.floor(layout.width / 70)))
  const resolvedYTickCount =
    yExtentMode === "exact"
      ? 5
      : Math.min(5, Math.max(2, Math.floor(layout.height / 30)))
  const rawXTicks =
    xAxis?.tickValues ??
    ticksForMode(scales.x, axisTickCount(xAxis, resolvedXTickCount), xExtentMode)
  const xFormatter =
    xAxis?.tickFormat ||
    props.xFormat ||
    props.tickFormatTime ||
    defaultTickFormat
  const xCandidates = createStaticAxisTicks({
    values: rawXTicks,
    scale: scales.x,
    format: xFormatter,
  })
  const xMaxLabelWidth = xCandidates.reduce(
    (max, tick) => Math.max(max, staticAxisLabelWidth(tick.label)),
    0,
  )
  const xMinPixelDistance = xAxis?.autoRotate
    ? Math.max(20, Math.min(xMaxLabelWidth + 8, 55))
    : Math.max(55, xMaxLabelWidth + 8)
  const xTicks = resolveStaticAxisTicks({
    candidates: xCandidates,
    scale: scales.x,
    minPixelDistance: xMinPixelDistance,
    includeMax: xAxis?.includeMax,
    extentMode: xExtentMode,
    hasExplicitTickValues: Boolean(xAxis?.tickValues),
    format: xFormatter,
  })

  const rawYTicks =
    yAxis?.tickValues ??
    ticksForMode(scales.y, axisTickCount(yAxis, resolvedYTickCount), yExtentMode)
  const yFormatter =
    yAxis?.tickFormat ||
    props.yFormat ||
    props.tickFormatValue ||
    defaultTickFormat
  // SVGOverlay invokes vertical formatters with the value only. Preserve that
  // contract even though the shared static tick builder also supports x-axis
  // index/all-ticks arguments.
  const yTickFormatter = (value: number | Date) => yFormatter(value as number)
  const yCandidates = createStaticAxisTicks({
    values: rawYTicks,
    scale: scales.y,
    format: yTickFormatter,
  })
  const yTicks = resolveStaticAxisTicks({
    candidates: yCandidates,
    scale: scales.y,
    minPixelDistance: 22,
    includeMax: yAxis?.includeMax,
    extentMode: yExtentMode,
    hasExplicitTickValues: Boolean(yAxis?.tickValues),
    format: yTickFormatter,
  })
  const shouldRotateXAxis = Boolean(
    xAxis?.autoRotate &&
    xTicks.length > 1 &&
    layout.width / Math.max(xTicks.length - 1, 1) <
      xTicks.reduce(
        (max, tick) => Math.max(
          max,
          typeof tick.label === "string" ? tick.label.length * 6.5 : 60,
        ),
        0,
      ) + 8,
  )
  const xPixelExtent = tickPixelExtent(xTicks)
  const yPixelExtent = tickPixelExtent(yTicks)
  const xLabel = xAxis?.label ?? props.xLabel
  const yLabel = yAxis?.label ?? (yOrient === "right" ? props.yLabelRight ?? props.yLabel : props.yLabel)
  const xAxisLine = resolveAxisLineStyle(xAxis?.axisStyle, { stroke: s.border, strokeWidth: 1 })
  const yAxisLine = resolveAxisLineStyle(yAxis?.axisStyle, { stroke: s.border, strokeWidth: 1 })
  const yAxisLabelX = yOrient === "right"
    ? layout.width + rightAxisLabelMargin - 15
    : -leftAxisLabelMargin + 15

  return (
    <g id={`${idPrefix ? `${idPrefix}-` : ""}axes`} className="stream-axes">
      {xAxis?.baseline !== false && !xAxis?.jaggedBase && (
        <line
          x1={0}
          y1={xBaselineY}
          x2={layout.width}
          y2={xBaselineY}
          {...xAxisLine}
        />
      )}
      {xAxis?.jaggedBase && (
        <path d={jaggedBaselinePath(xOrient, layout.width, layout.height)} fill="none" {...xAxisLine} />
      )}
      {xTicks.map((tick, i) => {
        const isLandmark = isStaticAxisLandmark(xAxis?.landmarkTicks, tick, i, xTicks)
        return (
        <g
          key={`xtick-${i}`}
          transform={`translate(${tick.pixel},${xBaselineY})`}
        >
          <line y2={xTickDirection * 5} {...xAxisLine} />
          {isStaticTextTickLabel(tick.label) ? (
            <text
              y={xTickDirection * (shouldRotateXAxis ? 12 : 18)}
              textAnchor={shouldRotateXAxis ? "end" : resolveHorizontalTickAnchor(
                xAxis?.tickAnchor,
                tick.pixel === xPixelExtent.min,
                tick.pixel === xPixelExtent.max,
              )}
              fontWeight={isLandmark ? 600 : 400}
              fontSize={isLandmark ? s.tickSize + 1 : s.tickSize}
              fill={s.textSecondary}
              fontFamily={s.fontFamily}
              transform={shouldRotateXAxis
                ? xOrient === "top" ? "rotate(45)" : "rotate(-45)"
                : undefined}
            >
              {tick.label}
            </text>
          ) : renderStaticTickForeignObject({
            label: tick.label,
            x: -30,
            y: xOrient === "top" ? -30 : 6,
            textAlign: "center",
            fontSize: s.tickSize,
            fontFamily: s.fontFamily,
            color: s.textSecondary,
          })}
        </g>
        )
      })}
      {xLabel && (
        <text
          x={layout.width / 2}
          y={xOrient === "top"
            ? -(shouldRotateXAxis ? 58 : 40)
            : layout.height + (shouldRotateXAxis ? 58 : 40)}
          textAnchor="middle"
          fontSize={s.labelSize}
          fill={s.text}
          fontFamily={s.fontFamily}
        >
          {xLabel}
        </text>
      )}

      {yAxis?.baseline !== false && !yAxis?.jaggedBase && (
        <line
          x1={yBaselineX}
          y1={0}
          x2={yBaselineX}
          y2={layout.height}
          {...yAxisLine}
        />
      )}
      {yAxis?.jaggedBase && (
        <path d={jaggedBaselinePath(yOrient, layout.width, layout.height)} fill="none" {...yAxisLine} />
      )}
      {yTicks.map((tick, i) => {
        const isLandmark = isStaticAxisLandmark(yAxis?.landmarkTicks, tick, i, yTicks)
        return (
        <g key={`ytick-${i}`} transform={`translate(${yBaselineX},${tick.pixel})`}>
          <line x2={yTickDirection * 5} {...yAxisLine} />
          {isStaticTextTickLabel(tick.label) ? (
            <text
              x={yTickDirection * 8}
              textAnchor={yOrient === "right" ? "start" : "end"}
              dominantBaseline={resolveVerticalTickBaseline(
                yAxis?.tickAnchor,
                tick.pixel === yPixelExtent.min,
                tick.pixel === yPixelExtent.max,
              )}
              fontWeight={isLandmark ? 600 : 400}
              fontSize={isLandmark ? s.tickSize + 1 : s.tickSize}
              fill={s.textSecondary}
              fontFamily={s.fontFamily}
            >
              {tick.label}
            </text>
          ) : renderStaticTickForeignObject({
            label: tick.label,
            x: yOrient === "right" ? 8 : -68,
            y: -12,
            textAlign: yOrient === "right" ? "left" : "right",
            fontSize: s.tickSize,
            fontFamily: s.fontFamily,
            color: s.textSecondary,
          })}
        </g>
        )
      })}
      {yLabel && (
        <text
          x={yAxisLabelX}
          y={layout.height / 2}
          textAnchor="middle"
          fontSize={s.labelSize}
          fill={s.text}
          fontFamily={s.fontFamily}
          transform={`rotate(${yOrient === "right" ? 90 : -90}, ${yAxisLabelX}, ${layout.height / 2})`}
        >
          {yLabel}
        </text>
      )}
    </g>
  )
}

// ── StreamXYFrame SSR ───────────────────────────────────────────────────
