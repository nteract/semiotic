import type { Datum } from "../charts/shared/datumTypes"
import type { LegendLayout } from "../types/legendTypes"
import type { LegendValue } from "../types/legendTypes"
import { composeLegendConfigs, isGradientLegendConfig, isLegendConfig } from "../types/legendTypes"
import type { StreamXYFrameProps, StreamScales, StreamLayout } from "../stream/types"
import type {
  StreamNetworkFrameProps,
  RealtimeEdge,
} from "../stream/networkTypes"
import type { StreamOrdinalFrameProps } from "../stream/ordinalTypes"
import type { StreamGeoFrameProps } from "../stream/geoTypes"
import type { PhysicsSettledSVGOptions } from "../stream/physics/PhysicsSettledSVG"
import type { PhysicsPipelineStore, PhysicsQueuedSpawn } from "../stream/physics/PhysicsPipelineStore"
import type { OrdinalPipelineStore } from "../stream/OrdinalPipelineStore"
import type { RenderEvidence } from "./renderEvidence"
import {
  renderStaticLegend,
  renderStaticLegendGroups,
  renderStaticGradientLegend,
  buildStaticCategoricalLegendConfig,
  measureStaticLegend,
  measureStaticLegendGroups,
  measureStaticGradientLegend,
} from "./staticLegend"
import { resolveTheme, themeStyles, type ThemeInput } from "./themeResolver"
import type { SemioticTheme } from "../store/ThemeStore"
import * as React from "react"
import { TITLE_BASELINE } from "../stream/titleLayout"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"

export type FrameType = RenderEvidence["frameType"]

export type StaticPhysicsFrameProps = PhysicsSettledSVGOptions & {
  config?: ConstructorParameters<typeof PhysicsPipelineStore>[0]
  initialSpawns?: PhysicsQueuedSpawn[]
  projectionRows?: PhysicsSettledSVGOptions["projectionRows"]
  size?: [number, number]
  _idPrefix?: string
}

export type StaticFrameProps =
  (StreamXYFrameProps | StreamNetworkFrameProps | StreamOrdinalFrameProps | StreamGeoFrameProps | StaticPhysicsFrameProps) &
  ThemeAwareProps
export type CategoricalAccessor = string | ((d: Datum) => string)
type EdgeEndpoint = RealtimeEdge["source"] | RealtimeEdge["target"] | null | undefined

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
  /** Internal HOC-level legend/margin contract metadata. */
  __explicitMargin?: unknown
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
}

function effectiveFrameLegend(
  props: StaticLegendHostProps,
  categories: string[],
  theme: ReturnType<typeof resolveTheme>,
): LegendValue | undefined {
  const automatic = props.showLegend && !props.__legendIncludesAutomatic
    ? buildStaticCategoricalLegendConfig(categories, props.colorScheme, theme)
    : undefined
  return composeLegendConfigs(automatic, props.legend as LegendValue | undefined)
}

const HOC_LEGEND_MARGIN: Record<LegendPosition, number> = {
  right: 110,
  left: 110,
  top: 50,
  bottom: 80,
}

/**
 * The client HOCs reserve a stable legend gutter before layout. The static
 * frame API still uses content measurement by default, but renderChart()
 * marks HOC requests so both paths share that contract. An explicitly set
 * side remains fully caller-controlled.
 */
export function hocLegendMarginMinimum(
  props: ThemeAwareProps,
  position: LegendPosition,
): number | undefined {
  if (!props.__autoLegendMargin) return undefined
  if (hasExplicitLegendMargin(props, position)) return undefined
  return HOC_LEGEND_MARGIN[position]
}

/** Whether the caller, rather than the HOC default, owns a legend side. */
export function hasExplicitLegendMargin(
  props: ThemeAwareProps,
  position: LegendPosition,
): boolean {
  const explicit = props.__explicitMargin
  return typeof explicit === "number" ||
    Boolean(explicit && typeof explicit === "object" && typeof (explicit as Record<string, unknown>)[position] === "number")
}

export function reserveStaticLegendMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    categories: string[]
    colorScheme?: string | string[] | Record<string, string>
    theme: ReturnType<typeof resolveTheme>
    position?: "right" | "left" | "top" | "bottom"
    size: [number, number]
    hasTitle?: boolean
    legendLayout?: LegendLayout
    minimumMargin?: number
    preserveExplicitMargin?: boolean
  }
): void {
  if (options.categories.length === 0) return
  if (options.preserveExplicitMargin) return
  const position = options.position || "right"
  const metrics = measureStaticLegend({
    categories: options.categories,
    colorScheme: options.colorScheme,
    theme: options.theme,
    position,
    totalWidth: options.size[0],
    totalHeight: options.size[1],
    margin,
    hasTitle: options.hasTitle,
    legendLayout: options.legendLayout,
  })
  // HOC renderChart requests use the same fixed gutter as
  // useChartLegendAndMargin. Content measurement belongs to the lower-level
  // static frame API; letting it expand a HOC gutter makes the SSR plot area
  // shrink while the CSR plot retains its stable 110/50/80px contract.
  const horizontalRequirement = options.minimumMargin ?? metrics.width + 14
  const topRequirement = options.minimumMargin ?? (options.hasTitle ? 32 : 8) + metrics.height + 4
  const bottomRequirement = options.minimumMargin ?? 38 + metrics.height + 4

  if (position === "right") {
    margin.right = Math.max(margin.right, horizontalRequirement)
  } else if (position === "left") {
    margin.left = Math.max(margin.left, horizontalRequirement)
  } else if (position === "top") {
    margin.top = Math.max(margin.top, topRequirement)
  } else {
    margin.bottom = Math.max(margin.bottom, bottomRequirement)
  }
}

export function reserveLegendConfigMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    legend: unknown
    theme: ReturnType<typeof resolveTheme>
    position?: "right" | "left" | "top" | "bottom"
    size: [number, number]
    hasTitle?: boolean
    legendLayout?: LegendLayout
    minimumMargin?: number
    preserveExplicitMargin?: boolean
  }
): void {
  if (options.preserveExplicitMargin) return
  const position = options.position || "right"
  const base = {
    theme: options.theme,
    position,
    totalWidth: options.size[0],
    totalHeight: options.size[1],
    margin,
    hasTitle: options.hasTitle,
    legendLayout: options.legendLayout,
  }
  const metrics = isLegendConfig(options.legend)
    ? measureStaticLegendGroups({ ...base, legendGroups: options.legend.legendGroups })
    : isGradientLegendConfig(options.legend)
      ? measureStaticGradientLegend({ ...base, gradient: options.legend.gradient })
      : null
  if (!metrics) return
  const horizontalRequirement = options.minimumMargin ?? metrics.width + 14
  const topRequirement = options.minimumMargin ?? (options.hasTitle ? 32 : 8) + metrics.height + 4
  const bottomRequirement = options.minimumMargin ?? 38 + metrics.height + 4

  if (position === "right") {
    margin.right = Math.max(margin.right, horizontalRequirement)
  } else if (position === "left") {
    margin.left = Math.max(margin.left, horizontalRequirement)
  } else if (position === "top") {
    margin.top = Math.max(margin.top, topRequirement)
  } else {
    margin.bottom = Math.max(margin.bottom, bottomRequirement)
  }
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
  }
  if (isLegendConfig(legend)) {
    return renderStaticLegendGroups({ ...base, legendGroups: legend.legendGroups })
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
  },
): LegendPosition {
  const { props, categories, theme, size, hasTitle } = options
  const position = props.legendPosition || "right"
  const shared = {
    theme,
    position,
    size,
    hasTitle,
    legendLayout: props.legendLayout,
    minimumMargin: hocLegendMarginMinimum(props, position),
    preserveExplicitMargin: hasExplicitLegendMargin(props, position),
  }
  if (props.legend !== undefined && props.legend !== null) {
    const legend = effectiveFrameLegend(props, categories, theme)
    if (isLegendConfig(legend) || isGradientLegendConfig(legend)) {
      reserveLegendConfigMargin(margin, { ...shared, legend })
    }
  } else if (props.showLegend && categories.length > 0) {
    reserveStaticLegendMargin(margin, {
      ...shared,
      categories,
      colorScheme: props.colorScheme,
    })
  }
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
    idPrefix: props._idPrefix,
    reservedWidth: props.__autoLegendMargin ? 100 : undefined,
  }
  if (props.legend !== undefined && props.legend !== null) {
    const legend = effectiveFrameLegend(props, categories, theme)
    if (React.isValidElement(legend)) return legend
    const configured = renderLegendConfig(legend, shared)
    if (configured) return configured
    if (isLegendConfig(legend) || isGradientLegendConfig(legend)) return null
    return (legend ?? null) as React.ReactNode
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
    reservedWidth: props.__autoLegendMargin ? 100 : undefined,
    idPrefix: props._idPrefix,
  })
}

export function defaultTickFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
}

/** Render grid lines for XY charts */
export function renderGridSVG(
  scales: StreamScales,
  layout: StreamLayout,
  theme: SemioticTheme,
  idPrefix?: string,
  axisExtent?: AxisExtentMode
): React.ReactNode {
  const { grid } = themeStyles(theme)
  const pfx = idPrefix ? `${idPrefix}-` : ""
  // Grid lines share the axis tick positions (ticksForMode) so they align
  // under axisExtent:"exact" — matching the client SVGOverlay, which draws
  // grid from the same tick arrays as the axis.
  const xTickCount = axisExtent === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.width / 70)))
  const yTickCount = axisExtent === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.height / 30)))
  const xTicks = ticksForMode(scales.x, xTickCount, axisExtent)
  const yTicks = ticksForMode(scales.y, yTickCount, axisExtent)

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
        <rect x={0} y={0} width={opts.width} height={opts.height} fill={background} />
      )}
      <g id={`${pfx}data-area`} transform={opts.innerTransform}>
        {content}
      </g>
      {titleText && (
        <text
          id={`${pfx}chart-title`}
          x={opts.width / 2} y={TITLE_BASELINE}
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

export function generateAxesSVG(
  scales: StreamScales,
  layout: StreamLayout,
  props: StreamXYFrameProps,
  theme: SemioticTheme,
  idPrefix?: string
): React.ReactNode {
  const s = themeStyles(theme)
  // ticksForMode mirrors the client SVGOverlay: "exact" yields equidistant
  // ticks inclusive of the data min/max (the axisExtent headline behavior);
  // "nice"/undefined falls through to scale.ticks — byte-identical to before.
  // Match SVGOverlay's responsive tick budget. d3's `ticks(5)` can emit
  // seven "nice" values on a short plot while the browser deliberately
  // requests fewer labels to keep the axis legible.
  const xTickCount = props.axisExtent === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.width / 70)))
  const yTickCount = props.axisExtent === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.height / 30)))
  const xTicks = ticksForMode(scales.x, xTickCount, props.axisExtent).map(v => ({
    pixel: scales.x(v),
    label: (props.xFormat || props.tickFormatTime || defaultTickFormat)(v)
  }))

  const yTicks = ticksForMode(scales.y, yTickCount, props.axisExtent).map(v => ({
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
