"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  useId,
  forwardRef
} from "react"
import type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType,
  HoverData,
  HoverAnnotationConfig,
  SceneNode,
  PointSceneNode,
  StreamScales
} from "./types"
import { XYBrushOverlay } from "./XYBrushOverlay"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { findNearestNode, findAllNodesAtX } from "./CanvasHitTester"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import { extractXYNavPoints, buildNavGraph, resolvePosition, nextGraphIndex, navPointToHover, type NavGraph } from "./keyboardNav"
import { useStalenessCheck } from "./useStalenessCheck"
import { resolveStaleness } from "./stalenessBands"
import { StalenessBadge } from "./StalenessBadge"
import { SVGOverlay, SVGUnderlay } from "./SVGOverlay"
import { xySceneNodeToSVG, isServerEnvironment } from "./SceneToSVG"
import { useHydration, useWasHydratingFromSSR, useHydrationLifecycle } from "./useHydration"
import { useStableShallow } from "./useStableShallow"
import { resolveCSSColor } from "./renderers/resolveCSSColor"
import { AccessibleDataTable, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { FocusRing, type FocusRingProps } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useFrame } from "./useFrame"

// Canvas setup
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"

// Canvas renderers
import { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
import { areaCanvasRenderer } from "./renderers/areaCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { symbolCanvasRenderer } from "./renderers/symbolCanvasRenderer"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { buildHoverData, type HoverPointerCoords } from "./hoverUtils"
import { swarmCanvasRenderer } from "./renderers/swarmCanvasRenderer"
import { waterfallCanvasRenderer } from "./renderers/waterfallCanvasRenderer"
import { heatmapCanvasRenderer } from "./renderers/heatmapCanvasRenderer"
import { candlestickCanvasRenderer } from "./renderers/candlestickCanvasRenderer"
import type { StreamRendererFn } from "./renderers/types"
import { resolveNodeColor } from "./sceneUtils"
import { extractCategoryDomain, sameCategoryDomain } from "./categoryDomain"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { resolveAnnotationAccessor, buildEnrichAnnotationData } from "./annotationAccessorResolver"

// ── Auto-date tick formatting ─────────────────────────────────────────

const DATE_MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function makeDateTickFormatter(domain: [number, number]): (v: number) => string {
  const span = domain[1] - domain[0]
  const MS_DAY = 8.64e7
  const MS_YEAR = 3.156e10

  // Use UTC getters throughout so SSR and client produce identical labels
  // regardless of server/browser timezone differences.
  if (span < MS_DAY) {
    return (v) => {
      const d = new Date(v)
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
    }
  }
  if (span < MS_YEAR) {
    return (v) => {
      const d = new Date(v)
      return `${DATE_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`
    }
  }
  if (span < 5 * MS_YEAR) {
    return (v) => {
      const d = new Date(v)
      return `${DATE_MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    }
  }
  return (v) => String(new Date(v).getUTCFullYear())
}

// ── Renderer dispatch ──────────────────────────────────────────────────

const RENDERERS: Record<StreamChartType, StreamRendererFn[]> = {
  line: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
  area: [areaCanvasRenderer, pointCanvasRenderer],
  stackedarea: [areaCanvasRenderer, pointCanvasRenderer],
  scatter: [pointCanvasRenderer, symbolCanvasRenderer],
  bubble: [pointCanvasRenderer, symbolCanvasRenderer],
  heatmap: [heatmapCanvasRenderer],
  bar: [barCanvasRenderer],
  swarm: [swarmCanvasRenderer],
  waterfall: [waterfallCanvasRenderer],
  candlestick: [candlestickCanvasRenderer],
  mixed: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
  // custom: all node types possible — each renderer self-filters to its type.
  custom: [
    areaCanvasRenderer,
    barCanvasRenderer,
    heatmapCanvasRenderer,
    lineCanvasRenderer,
    pointCanvasRenderer,
    symbolCanvasRenderer,
    candlestickCanvasRenderer,
  ]
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 30, left: 40 }

// ── Theme  ─────────────────────────────────────────

interface ThemeColors {
  axisStroke: string
  tickText: string
  crosshair: string
  hoverFill: string
  hoverStroke: string
  pointRing: string
  /** Primary accent color — crosshair dots and line-highlight strokes fall back here when the hovered datum has no color of its own. */
  primary: string
}

const LIGHT_THEME: ThemeColors = {
  axisStroke: "#ccc",
  tickText: "#666",
  crosshair: "rgba(0, 0, 0, 0.25)",
  hoverFill: "rgba(255, 255, 255, 0.3)",
  hoverStroke: "rgba(0, 0, 0, 0.4)",
  pointRing: "white",
  primary: "#007bff"
}

/**
 * Append a 2-char hex alpha to an existing CSS color, returning a valid
 * CSS color string. The naive `${color}${alpha}` concatenation only works
 * when `color` is a 6-char `#rrggbb`; shorthand `#rgb` produces the
 * invalid 5-char `#rgbXX`, which `ctx.strokeStyle`/`fillStyle` silently
 * rejects (falling back to `#000000` — black, invisible on dark themes).
 * The /cookbook/marginal-graphics crosshair invisibility was caused
 * precisely by `--semiotic-text-secondary: "#aaa"` hitting this path.
 *
 * Handles:
 *   • 3-char hex (`#abc`) → expanded to 6-char then concatenated
 *   • 6-char hex (`#aabbcc`) → concatenated directly
 *   • `rgb(...)` → repacked as `rgba(..., a)` with numeric alpha
 * Any other form (named colors, hsl(), oklch(), etc.) falls back to the
 * raw color without alpha — degrades gracefully.
 */
export function withAlpha(color: string, alphaHex: string): string {
  const trimmed = color.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1], g = trimmed[2], b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return `${trimmed}${alphaHex}`
  }
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*([^)]+?)\s*\)$/i)
  if (rgbMatch) {
    const alpha = parseInt(alphaHex, 16) / 255
    return `rgba(${rgbMatch[1]}, ${alpha.toFixed(3)})`
  }
  return trimmed
}

function resolveThemeColors(el: HTMLElement | null): ThemeColors {
  if (!el) return LIGHT_THEME
  const style = getComputedStyle(el)

  // Check for semiotic ThemeProvider CSS custom properties first
  const semioticBorder = style.getPropertyValue("--semiotic-border").trim()
  const semioticTextSecondary = style.getPropertyValue("--semiotic-text-secondary").trim()
  const semioticBg = style.getPropertyValue("--semiotic-bg").trim()
  const semioticPrimary = style.getPropertyValue("--semiotic-primary").trim()

  // Fall back to docs shell CSS vars
  const textSecondary = semioticTextSecondary || style.getPropertyValue("--text-secondary").trim()
  const textPrimary = style.getPropertyValue("--text-primary").trim()
  const surface3 = semioticBorder || style.getPropertyValue("--surface-3").trim()
  const surface0 = semioticBg || style.getPropertyValue("--surface-0").trim()

  if (!textSecondary && !textPrimary && !semioticBorder && !semioticPrimary) return LIGHT_THEME

  return {
    axisStroke: surface3 || LIGHT_THEME.axisStroke,
    tickText: textSecondary || LIGHT_THEME.tickText,
    crosshair: textSecondary ? withAlpha(textSecondary, "66") : LIGHT_THEME.crosshair,
    hoverFill: surface0 ? withAlpha(surface0, "4D") : LIGHT_THEME.hoverFill,
    hoverStroke: textSecondary ? withAlpha(textSecondary, "99") : LIGHT_THEME.hoverStroke,
    pointRing: surface0 || LIGHT_THEME.pointRing,
    primary: semioticPrimary || LIGHT_THEME.primary
  }
}

// ── Tooltip ────────────────────────────────────────────────────────────

const defaultTooltipStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.85)",
  color: "white",
  padding: "6px 10px",
  borderRadius: 4,
  fontSize: 12,
  lineHeight: 1.5,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  pointerEvents: "none",
  whiteSpace: "nowrap"
}

function DefaultTooltip({ hover }: { hover: HoverData }) {
  const fmt = (v: unknown): string => {
    if (v == null) return ""
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2)
    if (v instanceof Date) return v.toLocaleString()
    return String(v)
  }
  // Read data-space values off the raw datum. The Stream Frame's
  // hover-build pipeline doesn't know the consumer's accessor names,
  // so the default tooltip displays the canonical-shape fields. HOCs
  // that want to honor `xAccessor`/`yAccessor` build their own
  // tooltip — see `buildDefaultRealtimeTooltip` for the realtime
  // family's accessor-aware fallback.
  const datum = (hover.data ?? {}) as Record<string, unknown>
  const yField = datum.y ?? datum.value
  const xField = datum.x ?? datum.time
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{fmt(yField)}</div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>{fmt(xField)}</div>
    </div>
  )
}
;(DefaultTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

// ── Crosshair drawing ──────────────────────────────────────────────────

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  hover: HoverData,
  width: number,
  height: number,
  config: HoverAnnotationConfig,
  hoveredNode: SceneNode | null,
  theme: ThemeColors
) {
  const showCrosshair = config.crosshair !== false
  if (!showCrosshair) return

  const allSeries = hover.allSeries
  const isMulti = allSeries && allSeries.length > 0
  const xPx = hover.xPx ?? hover.x

  ctx.save()
  const crossStyle = typeof config.crosshair === "object" ? config.crosshair : {}
  ctx.strokeStyle = crossStyle.stroke || theme.crosshair
  ctx.lineWidth = crossStyle.strokeWidth || 1
  if (crossStyle.strokeDasharray) {
    ctx.setLineDash(crossStyle.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([4, 4])
  }

  // Vertical crosshair line (always)
  ctx.beginPath()
  ctx.moveTo(isMulti ? xPx : hover.x, 0)
  ctx.lineTo(isMulti ? xPx : hover.x, height)
  ctx.stroke()

  // Horizontal crosshair line (single-point mode only)
  if (!isMulti) {
    ctx.beginPath()
    ctx.moveTo(0, hover.y)
    ctx.lineTo(width, hover.y)
    ctx.stroke()
  }

  ctx.restore()

  if (isMulti) {
    // Multi-point mode: draw a dot on each series at its interpolated Y
    ctx.lineWidth = 2
    ctx.strokeStyle = theme.pointRing
    for (const s of allSeries) {
      if (s.valuePx == null) continue
      ctx.beginPath()
      ctx.arc(xPx, s.valuePx, 4, 0, Math.PI * 2)
      ctx.fillStyle = s.color || theme.primary
      ctx.fill()
      ctx.stroke()
    }
  } else {
    // Single-point mode: one dot at the hovered datum.
    // `theme.primary` already resolves from `--semiotic-primary`; the
    // previous inline getComputedStyle call duplicated that lookup.
    const pointColor = config.pointColor || resolveNodeColor(hoveredNode) || theme.primary
    ctx.beginPath()
    ctx.arc(hover.x, hover.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = pointColor
    ctx.fill()
    ctx.strokeStyle = theme.pointRing
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

// ── Line highlight on hover ───────────────────────────────────────────

function drawLineHighlight(
  ctx: CanvasRenderingContext2D,
  scene: SceneNode[],
  hoveredNode: SceneNode | null,
  highlightConfig: { style?: Datum | ((d: Datum) => Datum) },
  theme: ThemeColors
) {
  if (!hoveredNode) return

  // Find the group of the hovered line
  const hoveredGroup = "group" in hoveredNode ? hoveredNode.group : undefined
  if (hoveredGroup === undefined) return

  // Re-draw all lines in the same group with highlight style
  for (const node of scene) {
    if (node.type !== "line") continue
    if (node.group !== hoveredGroup) continue
    if (node.path.length < 2) continue

    // Resolve style
    const rawStyle = typeof highlightConfig.style === "function"
      ? (node.datum ? highlightConfig.style(node.datum) : {})
      : (highlightConfig.style || {})

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(node.path[0][0], node.path[0][1])
    for (let i = 1; i < node.path.length; i++) {
      ctx.lineTo(node.path[i][0], node.path[i][1])
    }
    ctx.strokeStyle = rawStyle.stroke || node.style.stroke || theme.primary
    ctx.lineWidth = rawStyle.strokeWidth || (node.style.strokeWidth || 2) + 2
    ctx.globalAlpha = rawStyle.opacity ?? 1
    ctx.stroke()
    ctx.restore()
  }
}

// ── StreamXYFrame ──────────────────────────────────────────────────────

const StreamXYFrame = forwardRef<StreamXYFrameHandle, StreamXYFrameProps>(
  function StreamXYFrame(props, ref) {
    const {
      chartType,
      runtimeMode,
      data,
      chunkThreshold,
      chunkSize,
      xAccessor,
      yAccessor,
      colorAccessor,
      sizeAccessor,
      symbolAccessor,
      symbolMap,
      groupAccessor,
      lineDataAccessor,
      curve,
      normalize,
      baseline,
      stackOrder,
      binSize,
      valueAccessor,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize = 200,
      timeAccessor,
      xExtent,
      yExtent,
      extentPadding = 0.1,
      scalePadding,
      sizeRange,
      size: sizeProp = [500, 300],
      responsiveWidth,
      responsiveHeight,
      margin: marginProp,
      className,
      background,
      lineStyle,
      pointStyle,
      areaStyle,
      barStyle,
      waterfallStyle,
      swarmStyle,
      barColors,
      colorScheme,
      boundsAccessor,
      boundsStyle,
      y0Accessor,
      band,
      gradientFill,
      lineGradient,
      areaGroups,
      openAccessor,
      highAccessor,
      lowAccessor,
      closeAccessor,
      candlestickStyle,
      showAxes = true,
      axes: axesConfig,
      xLabel,
      yLabel,
      yLabelRight,
      xFormat,
      yFormat,
      axisExtent,
      tickFormatTime,
      tickFormatValue,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior,
      customClickBehavior,
      enableHover,
      hoverRadius = 30,
      tooltipMode,
      annotations,
      autoPlaceAnnotations,
      svgAnnotationRules,
      showGrid,
      legend,
      legendHoverBehavior,
      legendClickBehavior,
      legendHighlightedCategory,
      legendIsolatedCategories,
      legendPosition,
      legendLayout,
      legendCategoryAccessor,
      onCategoriesChange,
      backgroundGraphics,
      foregroundGraphics,
      canvasPreRenderers,
      svgPreRenderers,
      title,
      categoryAccessor,
      brush,
      onBrush,
      decay,
      pulse,
      transition: transitionProp,
      animate,
      staleness,
      heatmapAggregation,
      heatmapXBins,
      heatmapYBins,
      showValues,
      heatmapValueFormat,
      marginalGraphics,
      pointIdAccessor,
      xScaleType,
      yScaleType,
      accessibleTable = true,
      description,
      summary,
      linkedCrosshairName,
      linkedCrosshairSourceId,
      customLayout,
      layoutConfig,
      layoutSelection,
    } = props

    // Stable per-instance prefix for SVG ids that must be unique on the
    // page (e.g. `<clipPath id>` from area `clipRect`). React's `useId`
    // produces an SSR-safe, hydration-stable string.
    const svgInstanceId = useId().replace(/:/g, "")

    // ── Frame composition (Tier A concerns; see useFrame.ts) ─────────────
    // dirtyRef is declared before useFrame so it can be threaded in for
    // the theme-change effect. XY is the only frame that inits this to
    // `false`; Ordinal/Network/Geo init to `true`. See investigation
    // note #3.
    const dirtyRef = useRef(false)

    // Last plot dimensions a computeScene ran at. A responsive width change
    // must re-solve the scene even mid-transition — otherwise the canvas keeps
    // the pre-measure width while the viewBox-scaled SVG overlay already
    // reflects the new width, drifting custom-layout overlays off their canvas
    // scene nodes (progressively, since the error scales with x) until the
    // transition ends.
    const lastSceneDimsRef = useRef({ w: -1, h: -1 })

    // XY resolves foreground/background locally (not via useFrame) because
    // the marginalGraphics branch below may expand margin, and function-form
    // graphics must be evaluated against the final margin. Having useFrame
    // resolve them too would double-invoke user functions per render.
    const frame = useFrame({
      sizeProp,
      responsiveWidth,
      responsiveHeight,
      userMargin: marginProp,
      marginDefault: DEFAULT_MARGIN,
      animate,
      transitionProp,
      themeDirtyRef: dirtyRef,
    })
    // ── Hydration boundary ───────────────────────────────────────────────
    // SVG-branch gate: `isServerEnvironment || (!hydrated && wasHydratingFromSSR)`.
    //   - `isServerEnvironment` covers the Node SSR pass.
    //   - `!hydrated && wasHydratingFromSSR` covers the first client
    //      render *after* SSR rehydration, so the React tree we
    //      produce matches the server-emitted HTML byte-for-byte.
    //   - Pure CSR mounts (no SSR HTML) skip the SVG branch entirely
    //      and go straight to canvas — the SVG render would just be
    //      overwritten by the post-commit re-render anyway.
    //
    // `useHydrationLifecycle` further down handles the post-swap
    // paint kick from inside an isomorphic layout effect:
    // cancelIntroAnimation if rehydrating, mark dirtyRef, then
    // synchronously call `renderFnRef.current()` (no rAF — that
    // would defer the paint to the next frame and produce a
    // one-frame blank-canvas flash). See `HYDRATION.md` for the
    // full recipe.
    const hydrated = useHydration()
    const wasHydratingFromSSR = useWasHydratingFromSSR()

    const {
      reducedMotionRef,
      responsiveRef,
      size,
      currentTheme,
      transition,
      introEnabled,
      tableId,
      rafRef,
      renderFnRef,
      scheduleRender,
    } = frame

    // XY post-expands margin to at least 60px on any side that has a
    // configured marginal graphic. Copy the hook's margin before mutating
    // so the memoized object stays clean for next render.
    let margin = frame.margin
    if (marginalGraphics) {
      const MIN_MARGINAL = 60
      const m = { ...frame.margin }
      if (marginalGraphics.top && m.top < MIN_MARGINAL) m.top = MIN_MARGINAL
      if (marginalGraphics.bottom && m.bottom < MIN_MARGINAL) m.bottom = MIN_MARGINAL
      if (marginalGraphics.left && m.left < MIN_MARGINAL) m.left = MIN_MARGINAL
      if (marginalGraphics.right && m.right < MIN_MARGINAL) m.right = MIN_MARGINAL
      margin = m
    }
    const resolvedForeground = typeof foregroundGraphics === "function"
      ? (foregroundGraphics as (ctx: { size: number[]; margin: typeof margin }) => React.ReactNode)({ size, margin })
      : foregroundGraphics
    const resolvedBackground = typeof backgroundGraphics === "function"
      ? (backgroundGraphics as (ctx: { size: number[]; margin: typeof margin }) => React.ReactNode)({ size, margin })
      : backgroundGraphics

    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom
    const safeData = useMemo(() => filterSparseArray(data), [data])

    // Determine effective hover annotation config
    const effectiveHoverAnnotation = hoverAnnotation ?? enableHover

    // ── Refs ─────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null)
    // rafRef + renderFnRef + scheduleRender + cancel-on-unmount + theme-
    // change effect all come from useFrame (above).

    const [annotationFrame, setAnnotationFrame] = useState(0)
    const lastAnnotationFrameTimeRef = useRef(0)

    // Scales state: updated after each scene computation so SVGOverlay re-renders
    const [currentScales, setCurrentScales] = useState<StreamScales | null>(null)

    // Hover state: ref for canvas (sync), React state for tooltip (async)
    const hoverRef = useRef<HoverData | null>(null)
    const hoveredNodeRef = useRef<SceneNode | null>(null)
    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)

    // Cached theme primary — updated by the render loop (which already calls
    // resolveThemeColors on every frame). The hover handler reads from here
    // instead of re-invoking resolveThemeColors (which calls getComputedStyle)
    // on every pointermove. Initialized to LIGHT_THEME.primary so the first
    // hover before a paint still returns a valid color.
    const themePrimaryRef = useRef<string>(LIGHT_THEME.primary)
    const lastLegendCategoriesRef = useRef<string[]>([])
    const legendCategoryAccessorRef = useRef(legendCategoryAccessor)
    const onCategoriesChangeRef = useRef(onCategoriesChange)
    legendCategoryAccessorRef.current = legendCategoryAccessor
    onCategoriesChangeRef.current = onCategoriesChange

    // Staleness state — initialized here, set by useStalenessCheck below
    const [isStale, setIsStale] = useState(false)

    // Marginal data values
    const [marginalXValues, setMarginalXValues] = useState<number[]>([])
    const [marginalYValues, setMarginalYValues] = useState<number[]>([])


    // renderFnRef comes from useFrame (above).

    // ── Pipeline ─────────────────────────────────────────────────────────

    const isStreaming = runtimeMode === "streaming" || ["bar", "swarm", "waterfall"].includes(chartType)

    // animate → transition + introEnabled comes from useFrame above.

    const pipelineConfig = useMemo((): PipelineConfig => ({
      chartType,
      runtimeMode: isStreaming ? "streaming" : "bounded",
      windowSize,
      windowMode,
      arrowOfTime: isStreaming ? arrowOfTime : "right",
      extentPadding,
      scalePadding,
      axisExtent,
      // Forward `xAccessor`/`yAccessor` even when `isStreaming` is true.
      // The store's streaming-mode resolution chain
      // (`timeAccessor || xAccessor || "time"`) already gives `timeAccessor`
      // priority for the bar/swarm/waterfall families, so keeping the x/y
      // accessors here doesn't change behavior for those chart types — but
      // it lets a streaming scatter / bubble pass non-temporal accessors
      // and have them honored. Stripping them previously forced the store
      // to fall through to `d.time` and `d.value`, producing a buffer of
      // 200 datums whose `buildPointNode` calls all returned null because
      // y resolved to `d.value` (= undefined → NaN).
      xAccessor,
      yAccessor,
      timeAccessor: isStreaming ? timeAccessor : undefined,
      valueAccessor,
      colorAccessor,
      sizeAccessor,
      symbolAccessor,
      symbolMap,
      groupAccessor: groupAccessor || (lineDataAccessor ? "_lineGroup" : undefined),
      categoryAccessor,
      lineDataAccessor,
      xScaleType,
      yScaleType,
      xExtent,
      yExtent,
      sizeRange,
      binSize,
      normalize,
      baseline,
      stackOrder,
      boundsAccessor,
      boundsStyle,
      y0Accessor,
      band,
      gradientFill: gradientFill === true
        ? { topOpacity: 0.8, bottomOpacity: 0.05 }
        : gradientFill === false
          ? undefined
          : gradientFill,
      areaGroups: areaGroups ? new Set(areaGroups) : undefined,
      lineGradient,
      openAccessor,
      highAccessor,
      lowAccessor,
      closeAccessor,
      candlestickStyle,
      lineStyle,
      pointStyle,
      areaStyle,
      swarmStyle,
      waterfallStyle,
      colorScheme,
      barColors,
      barStyle,
      annotations,
      decay,
      pulse,
      transition,
      introAnimation: introEnabled,
      staleness,
      heatmapAggregation,
      heatmapXBins,
      heatmapYBins,
      showValues,
      heatmapValueFormat,
      pointIdAccessor,
      curve,
      themeCategorical: currentTheme?.colors?.categorical,
      themeSemantic: resolveThemeSemanticColors(currentTheme),
      themeSequential: currentTheme?.colors?.sequential,
      themeDiverging: currentTheme?.colors?.diverging,
      customLayout,
      layoutConfig,
      layoutMargin: margin,
    }), [
      chartType, windowSize, windowMode, arrowOfTime, extentPadding, scalePadding, axisExtent,
      xAccessor, yAccessor, timeAccessor, valueAccessor,
      xScaleType, yScaleType,
      colorAccessor, sizeAccessor, symbolAccessor, symbolMap, groupAccessor, categoryAccessor,
      lineDataAccessor, xExtent, yExtent, sizeRange, binSize, normalize, baseline, stackOrder,
      boundsAccessor, boundsStyle, y0Accessor, band, gradientFill, lineGradient, areaGroups,
      openAccessor, highAccessor, lowAccessor, closeAccessor, candlestickStyle,
      lineStyle, pointStyle, areaStyle, swarmStyle, waterfallStyle, barStyle, colorScheme, barColors, annotations,
      decay, pulse, transition?.duration, transition?.easing, introEnabled, staleness,
      heatmapAggregation, heatmapXBins, heatmapYBins,
      showValues, heatmapValueFormat,
      isStreaming, pointIdAccessor, curve, currentTheme,
      customLayout, layoutConfig, margin
    ])

    // Stabilize the config reference so inline-object / inline-array
    // props don't shed identity on every parent render. Without this
    // the `updateConfig` effect would depend on raw `pipelineConfig`
    // and re-fire every render → dirty + scheduleRender → rAF render
    // loop fires `setAnnotationFrame((f) => f + 1)` → React re-renders
    // → pipelineConfig recomputes (inline ref again) → the cycle trips
    // React 19's "Maximum update depth exceeded" guard. See
    // `useStableShallow.ts` for why a one-level shallow compare is
    // enough for the typical config shape (primitives, sub-objects of
    // primitives, primitive arrays).
    const stablePipelineConfig = useStableShallow(pipelineConfig)

    const storeRef = useRef<PipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new PipelineStore(stablePipelineConfig)
    }

    // scheduleRender comes from useFrame above.

    const emitLegendCategories = useCallback(() => {
      const accessor = legendCategoryAccessorRef.current
      const onChange = onCategoriesChangeRef.current
      if (!onChange || !accessor) return
      const categories = extractCategoryDomain(storeRef.current?.getData() ?? [], accessor)
      if (sameCategoryDomain(categories, lastLegendCategoriesRef.current)) return
      lastLegendCategoriesRef.current = categories
      onChange(categories)
    }, [])

    // Update config when it changes — also schedule re-render since style
    // callbacks (pointStyle, areaStyle, etc.) may have changed.
    useEffect(() => {
      storeRef.current?.updateConfig(stablePipelineConfig)
      dirtyRef.current = true
      scheduleRender()
    }, [stablePipelineConfig, scheduleRender])

    // Custom-layout selection channel — off the rebuild path. When the layout
    // returned a `restyle`, a selection change re-applies styles + repaints (no
    // relayout / quadtree rebuild); otherwise it rebuilds so `ctx.selection`
    // reaches the layout. Overlays re-render via CustomLayoutSelectionProvider.
    const lastLayoutSelectionRef = useRef<unknown>(null)
    useEffect(() => {
      const store = storeRef.current
      if (!store) return
      const sel = layoutSelection ?? null
      if (lastLayoutSelectionRef.current === sel) return
      lastLayoutSelectionRef.current = sel
      store.setLayoutSelection(sel)
      if (store.hasCustomRestyle) {
        store.restyleScene(sel)
      } else {
        dirtyRef.current = true
      }
      scheduleRender()
    }, [layoutSelection, scheduleRender])

    // Theme-change repaint (clearCSSColorCache + dirty + scheduleRender)
    // is handled by useFrame above when themeDirtyRef is provided.

    // ── DataSourceAdapter ────────────────────────────────────────────────

    const adapterRef = useRef<DataSourceAdapter | null>(null)
    if (!adapterRef.current) {
      adapterRef.current = new DataSourceAdapter((changeset) => {
        const store = storeRef.current
        if (!store) return
        const needsRender = store.ingest(changeset)
        if (needsRender) {
          dirtyRef.current = true
          // Legend-category emission deferred to the post-computeScene path
          // in the render loop — that's the single canonical emit point per
          // data change, already rAF-throttled. Calling here too would scan
          // the full buffer twice per push at high streaming frequencies.
          scheduleRender()
        }
      }, { chunkThreshold, chunkSize })
    }

    // Update chunk options on the existing adapter when props change
    useEffect(() => {
      adapterRef.current?.updateChunkOptions({ chunkThreshold, chunkSize })
    }, [chunkThreshold, chunkSize])

    // ── Push API (ref handle) ────────────────────────────────────────────

    const pushPoint = useCallback((datum: Datum) => {
      adapterRef.current?.push(datum)
    }, [])

    const pushManyPoints = useCallback((data: Datum[]) => {
      adapterRef.current?.pushMany(data)
    }, [])

    const clearAll = useCallback(() => {
      adapterRef.current?.clear()
      storeRef.current?.clear()
      dirtyRef.current = true
      // emitLegendCategories runs after computeScene in the render loop.
      scheduleRender()
    }, [scheduleRender])

    useImperativeHandle(ref, () => ({
      push: pushPoint,
      pushMany: pushManyPoints,
      remove: (id: string | string[]) => {
        adapterRef.current?.flush()
        const removed = storeRef.current?.remove(id) ?? []
        if (removed.length > 0) {
          // Clear hover if the removed datum was being hovered
          if (hoverRef.current && removed.some(d => d === hoverRef.current?.data)) {
            hoverRef.current = null
            setHoverPoint(null)
          }
          dirtyRef.current = true
          // Legend emit deferred to post-computeScene render path.
          scheduleRender()
        }
        return removed
      },
      update: (id: string | string[], updater: (d: Datum) => any) => {
        adapterRef.current?.flush()
        const previous = storeRef.current?.update(id, updater) ?? []
        if (previous.length > 0) {
          dirtyRef.current = true
          // Legend emit deferred to post-computeScene render path.
          scheduleRender()
        }
        return previous
      },
      clear: clearAll,
      getData: () => {
        // Flush any buffered push data so getData() always returns up-to-date results
        adapterRef.current?.flush()
        return storeRef.current?.getData() ?? []
      },
      getScales: () => storeRef.current?.scales ?? null,
      getExtents: () => storeRef.current?.getExtents() ?? null
    }), [pushPoint, pushManyPoints, clearAll, scheduleRender])

    // ── Controlled data prop ─────────────────────────────────────────────

    useEffect(() => {
      if (!data) return
      // When lineDataAccessor is set, data is an array of line objects
      // (e.g. [{ label: "A", coordinates: [...] }]). Flatten into coordinate
      // datums for the pipeline — the pipeline needs flat data for extent
      // tracking and scale computation.
      if (lineDataAccessor && safeData.length > 0 && typeof safeData[0] === "object" && safeData[0] !== null) {
        const key = typeof lineDataAccessor === "string" ? lineDataAccessor : "coordinates"
        const hasCoords = safeData[0][key]
        if (Array.isArray(hasCoords)) {
          const flat: Datum[] = []
          for (const line of safeData) {
            const coords = line[key]
            if (Array.isArray(coords)) {
              // Stamp group key onto each datum for grouping
              const groupKey = line.label || line.id || line.key
              if (groupKey != null) {
                for (const c of coords) flat.push({ ...c, _lineGroup: groupKey })
              } else {
                for (const c of coords) flat.push(c)
              }
            }
          }
          adapterRef.current?.setBoundedData(flat)
          return
        }
      }
      adapterRef.current?.setBoundedData(safeData)
    }, [data, safeData, lineDataAccessor])

    // ── Hover handlers ───────────────────────────────────────────────────
    // hoverHandlerRef + hoverLeaveRef + onPointerMove/Leave + cleanup all
    // come from useFrame above; frame still owns the closure bodies.
    const { hoverHandlerRef, hoverLeaveRef, onPointerMove, onPointerLeave } = frame

    hoverHandlerRef.current = (e: HoverPointerCoords) => {
      if (!effectiveHoverAnnotation) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      const chartX = e.clientX - rect.left - margin.left
      const chartY = e.clientY - rect.top - margin.top

      if (chartX < 0 || chartX > adjustedWidth || chartY < 0 || chartY > adjustedHeight) {
        if (hoverRef.current) {
          hoverRef.current = null
          hoveredNodeRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) {
            customHoverBehavior(null)
            dirtyRef.current = true
          }
          scheduleRender()
        }
        return
      }

      const store = storeRef.current
      if (!store || store.scene.length === 0) return

      // Hit test against scene graph — use quadtree for O(log n) point lookup when available
      const hit = findNearestNode(store.scene, chartX, chartY, hoverRadius, store.quadtree, store.maxPointRadius)
      const isMulti = tooltipMode === "multi"

      const clearHover = () => {
        if (hoverRef.current) {
          hoverRef.current = null
          hoveredNodeRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) customHoverBehavior(null)
          scheduleRender()
        }
      }

      // Without a hit, only multi-tooltip (hover-anywhere) mode has anything
      // to show — interpolated series values at the cursor's x. Otherwise
      // there's nothing under the cursor and we clear.
      if (!hit && !isMulti) {
        clearHover()
        return
      }

      // In multi mode, anchor the hover to the cursor regardless of whether a
      // node was hit. Using `hit.x/hit.y` would snap to the nearest top-path
      // sample whenever findNearestNode succeeds, producing a visible jump as
      // the cursor passes data points. The real hit's `node` is still used
      // below for highlight tracking.
      const posX = isMulti || !hit ? chartX : hit.x
      const posY = isMulti || !hit ? chartY : hit.y

      // Band enrichment: when band(s) are configured, evaluate accessors
      // on the hovered datum and attach `datum.band` / `datum.bands` so
      // user tooltip functions and the default-tooltip band rows can
      // read the envelope values directly. Shallow-merge so we don't
      // mutate the original data row.
      const hitDatum = hit?.datum
        ? enrichDatumWithBand(hit.datum, store.resolvedRibbons)
        : {}
      const xInvert = store.scales?.x?.invert
      const xValue = typeof xInvert === "function" ? xInvert(posX) : undefined
      let hover: HoverData = buildHoverData(
        hitDatum,
        posX,
        posY,
        xValue != null ? { xValue, xPx: posX } : undefined
      )

      // Multi-tooltip mode: attach all series values at this X to the hover data.
      // Keep the interpolation generous for sparse paths, but range-bounded in
      // CanvasHitTester so padded/explicit xExtent space outside the rendered
      // path does not clamp to the first/last point.
      if (isMulti && store.scene.length > 0 && store.scales) {
        const allHits = findAllNodesAtX(store.scene, posX, Math.max(hoverRadius, adjustedWidth))
        if (allHits.length > 0) {
          const yInvert = store.scales.y.invert
          // Read the cached theme primary (updated from the render loop) so
          // each hit without its own color falls back to --semiotic-primary.
          // Avoids re-invoking resolveThemeColors (getComputedStyle) on every
          // pointermove. Required by downstream consumers like MultiPointTooltip
          // that render a color swatch from s.color.
          const fallbackColor = themePrimaryRef.current
          const multiXValue = xInvert ? xInvert(posX) : posX
          if (!hit) {
            const syntheticDatum: Datum = { xValue: multiXValue }
            if (typeof xAccessor === "string") syntheticDatum[xAccessor] = multiXValue
            hover = buildHoverData(syntheticDatum, posX, posY, { xValue: multiXValue, xPx: posX })
          } else {
            hover.xValue = multiXValue
            hover.xPx = posX
          }
          hover.allSeries = allHits.map(h => {
            const topValue = yInvert ? yInvert(h.y) : h.y
            const bottomValue = h.y0 != null
              ? (yInvert ? yInvert(h.y0) : h.y0)
              : undefined
            const value = chartType === "stackedarea" && bottomValue != null
              ? topValue - bottomValue
              : topValue
            return {
              group: h.group || "",
              value,
              valuePx: h.y,
              color: h.color || fallbackColor,
              // Each per-series datum gets its own band enrichment so
              // multi-mode tooltips can read `s.datum.band` per series.
              datum: enrichDatumWithBand(h.datum, store.resolvedRibbons),
            }
          })
        }
      }

      // Hover-anywhere with no real hit and no series under the cursor (e.g.
      // before/after the data range) is nothing to show — clear instead of
      // rendering an empty tooltip at the synthetic cursor position.
      if (!hit && !hover.allSeries?.length) {
        clearHover()
        return
      }

      hoverRef.current = hover
      hoveredNodeRef.current = hit?.node ?? null
      setHoverPoint(hover)
      if (customHoverBehavior) {
        customHoverBehavior(hover)
        dirtyRef.current = true
      }
      scheduleRender()
    }

    hoverLeaveRef.current = () => {
      if (hoverRef.current) {
        hoverRef.current = null
        hoveredNodeRef.current = null
        setHoverPoint(null)
        if (customHoverBehavior) { customHoverBehavior(null); dirtyRef.current = true }
        scheduleRender()
      }
    }

    // pointermove coalescing + onPointerLeave come from useFrame above.

    // ── Click handler (for click-to-lock crosshair, etc.) ──────────────

    const clickHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})
    clickHandlerRef.current = (e: React.MouseEvent) => {
      if (!customClickBehavior) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const chartX = e.clientX - rect.left - margin.left
      const chartY = e.clientY - rect.top - margin.top
      if (chartX < 0 || chartX > adjustedWidth || chartY < 0 || chartY > adjustedHeight) {
        customClickBehavior(null)
        return
      }
      const store = storeRef.current
      if (!store || store.scene.length === 0) { customClickBehavior(null); return }
      const hit = findNearestNode(store.scene, chartX, chartY, hoverRadius, store.quadtree, store.maxPointRadius)
      if (!hit) { customClickBehavior(null); return }
      const rawDatum = hit.datum || {}
      const xInvert = store.scales?.x?.invert
      const xValue = typeof xInvert === "function" ? xInvert(hit.x) : undefined
      customClickBehavior(buildHoverData(
        rawDatum,
        hit.x,
        hit.y,
        xValue != null ? { xValue, xPx: hit.x } : undefined
      ))
    }
    const onClick = useCallback(
      (e: React.MouseEvent) => clickHandlerRef.current(e),
      []
    )

    // ── Keyboard navigation ───────────────────────────────────────────

    const kbFocusIndexRef = useRef(-1)
    const focusedNavPointRef = useRef<{ shape?: FocusRingProps["shape"]; w?: number; h?: number } | null>(null)
    const navGraphCacheRef = useRef<{ version: number; graph: NavGraph } | null>(null)

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
      const store = storeRef.current
      if (!store || store.scene.length === 0) return

      // Cache NavGraph keyed off store.version to avoid O(n log n) rebuild per keypress
      const storeVersion = store.version
      let graph: NavGraph
      if (navGraphCacheRef.current && navGraphCacheRef.current.version === storeVersion) {
        graph = navGraphCacheRef.current.graph
      } else {
        const navPoints = extractXYNavPoints(store.scene)
        if (navPoints.length === 0) return
        graph = buildNavGraph(navPoints)
        navGraphCacheRef.current = { version: storeVersion, graph }
      }

      const current = kbFocusIndexRef.current

      // First arrow press when unfocused: start at 0
      if (current < 0) {
        if (e.key === "Escape") return
        const isNav = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)
        if (!isNav) return
        e.preventDefault()
        kbFocusIndexRef.current = 0
        const point = graph.flat[0]
        focusedNavPointRef.current = { shape: point.shape, w: point.w, h: point.h }
        // Band enrichment mirrors the pointer-hover path so keyboard
        // users see the same `datum.band` / `datum.bands` enrichment.
        const enrichedPoint = { ...point, datum: enrichDatumWithBand(point.datum, store.resolvedRibbons) }
        const hover = navPointToHover(enrichedPoint)
        hoverRef.current = hover
        setHoverPoint(hover)
        if (customHoverBehavior) customHoverBehavior(hover)
        scheduleRender()
        return
      }

      const pos = resolvePosition(graph, current)
      const next = nextGraphIndex(e.key, pos, graph)
      if (next === null) return // unhandled key

      e.preventDefault()

      if (next < 0) {
        // Escape — clear focus
        kbFocusIndexRef.current = -1
        focusedNavPointRef.current = null
        hoverRef.current = null
        hoveredNodeRef.current = null
        setHoverPoint(null)
        if (customHoverBehavior) customHoverBehavior(null)
        scheduleRender()
        return
      }

      kbFocusIndexRef.current = next
      const point = graph.flat[next]
      focusedNavPointRef.current = { shape: point.shape, w: point.w, h: point.h }
      const enrichedPoint = { ...point, datum: enrichDatumWithBand(point.datum, store.resolvedRibbons) }
      const hover = navPointToHover(enrichedPoint)
      hoverRef.current = hover
      setHoverPoint(hover)
      if (customHoverBehavior) customHoverBehavior(hover)
      scheduleRender()
    }, [customHoverBehavior, scheduleRender])

    // Clear keyboard focus on mouse interaction; reuses the rAF-coalesced
    // hover path so the per-frame work cap still applies.
    const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    }, [onPointerMove])

    // ── Render function ──────────────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = 0
      const canvas = canvasRef.current
      const interactionCanvas = interactionCanvasRef.current
      if (!canvas || !interactionCanvas) return

      const store = storeRef.current
      if (!store) return

      const now = typeof performance !== "undefined" ? performance.now() : Date.now()

      // Advance transition animation (before scene rebuild)
      // When reduced motion is active, skip animation — treat as instant
      // Fast-forward transitions when reduced motion is active so target positions
      // are applied immediately and transition state is cleared properly
      const transitionActive = store.advanceTransition(reducedMotionRef.current ? now + 1e6 : now)
      const isTransitioning = reducedMotionRef.current ? false : transitionActive

      // A responsive resize must re-solve the scene at the new dimensions even
      // mid-transition, so canvas scene nodes and the viewBox-scaled SVG overlay
      // stay aligned (otherwise custom-layout overlays drift off their nodes
      // until the transition ends).
      const dimsChanged =
        lastSceneDimsRef.current.w !== adjustedWidth || lastSceneDimsRef.current.h !== adjustedHeight

      // Determine if data canvas needs repaint (data/props changed or animating).
      // Use transitionActive so reduced-motion fast-forwarded transitions still repaint.
      const needsDataRepaint = dirtyRef.current || transitionActive || dimsChanged
      let computedSceneThisFrame = false

      // Compute scene graph (scales + scene nodes) — when data changed, or when
      // the dimensions changed (the latter wins over an active transition).
      if (needsDataRepaint && (!isTransitioning || dimsChanged)) {
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
        lastSceneDimsRef.current = { w: adjustedWidth, h: adjustedHeight }
        computedSceneThisFrame = true
        emitLegendCategories()
      }

      const dpr = getDevicePixelRatio()
      const theme = resolveThemeColors(canvas)
      // Cache the theme primary for the hover handler — avoids re-running
      // getComputedStyle on every pointermove event at high pointer rates.
      themePrimaryRef.current = theme.primary

      // Staleness check (used by both canvases). `resolveStaleness`
      // handles both the binary flip and the graded (banded) ramp.
      const idleMs = store.lastIngestTime > 0 ? now - store.lastIngestTime : 0
      const resolvedStaleness = resolveStaleness(staleness, idleMs)
      const currentlyStale = staleness && resolvedStaleness.isStale

      // ── Data canvas: only repaint when data/props changed ─────────────
      if (needsDataRepaint) {
        const ctx = prepareCanvas(canvas, size, margin, dpr)
        if (ctx) {
          ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

          if (staleness && resolvedStaleness.alpha < 1) {
            ctx.globalAlpha = resolvedStaleness.alpha
          }

          // Background.
          //   • `background="transparent"` — explicit opt-out so this chart
          //     can be composed as an overlay without painting over the
          //     layer beneath.
          //   • `backgroundGraphics` — user supplied their own SVG
          //     background (rendered as a DOM sibling behind the canvas).
          //     The canvas fills the full size[0] × size[1] area opaquely,
          //     which would cover the SVG. Skip the fill so the user's
          //     background shows through. If the user also wants a themed
          //     color behind their graphics, they can apply it in the SVG
          //     they render.
          const shouldPaintBg = background !== "transparent" && !backgroundGraphics
          if (shouldPaintBg) {
            const semioticBg = getComputedStyle(canvas).getPropertyValue("--semiotic-bg").trim()
            // Resolve `var(...)` so canvas accepts the assignment — without
            // this, a user passing `background="var(--surface-1)"` would
            // silently fall back to the prior fillStyle (a node/area color
            // from the last draw), producing a palette-flashing background
            // on every animation frame.
            const effectiveBg = background || (semioticBg && semioticBg !== "transparent" ? semioticBg : null)
            const resolvedBg = effectiveBg ? resolveCSSColor(ctx, effectiveBg) : null
            if (resolvedBg) {
              ctx.fillStyle = resolvedBg
              ctx.fillRect(-margin.left, -margin.top, size[0], size[1])
            }
          }

          // Clip and render data marks
          ctx.save()
          if (typeof ctx.rect === "function") {
            ctx.beginPath()
            ctx.rect(0, 0, adjustedWidth, adjustedHeight)
            ctx.clip()
          }

          // Custom pre-renderers (e.g. connecting lines under points)
          // Each call is wrapped in save/restore to prevent ctx state leaks
          if (canvasPreRenderers && store.scales) {
            for (const renderer of canvasPreRenderers) {
              ctx.save()
              renderer(ctx, store.scene, store.scales, { width: adjustedWidth, height: adjustedHeight })
              ctx.restore()
            }
          }

          // When customLayout is provided, the user can emit any node type.
          // Use the "custom" renderer set (every renderer, each self-filtering)
          // regardless of chartType so a layout that emits, e.g., rects on a
          // chartType="line" frame still draws.
          const renderers = customLayout ? RENDERERS.custom : RENDERERS[chartType]
          if (renderers && store.scales) {
            for (const renderer of renderers) {
              renderer(
                ctx,
                store.scene,
                store.scales,
                { width: adjustedWidth, height: adjustedHeight }
              )
            }
          }

          ctx.restore()

          if (staleness && resolvedStaleness.alpha < 1) {
            ctx.globalAlpha = 1
          }
        }
      }

      // ── Interaction canvas: always repaint (crosshair + highlights) ──
      {
        const ictx = prepareCanvas(interactionCanvas, size, margin, dpr)
        if (ictx) {
          // Clear previous frame (crosshair, highlights, etc.)
          ictx.clearRect(-margin.left, -margin.top, size[0], size[1])

          // Crosshair on hover
          if (effectiveHoverAnnotation && hoverRef.current && store.scales) {
            const config: HoverAnnotationConfig =
              typeof effectiveHoverAnnotation === "object" ? effectiveHoverAnnotation : {}
            drawCrosshair(
              ictx,
              hoverRef.current,
              adjustedWidth,
              adjustedHeight,
              config,
              hoveredNodeRef.current,
              theme
            )
          }

          // Line highlight on hover
          if (hoveredNodeRef.current && Array.isArray(hoverAnnotation)) {
            const highlightEntry = hoverAnnotation.find(
              (a: any) => a && typeof a === "object" && a.type === "highlight"
            )
            if (highlightEntry) {
              drawLineHighlight(ictx, store.scene, hoveredNodeRef.current, highlightEntry, theme)
            }
          }
        }
      }

      // ── Update canvas aria-label imperatively after scene changes ──
      if (needsDataRepaint && canvas) {
        canvas.setAttribute("aria-label", computeCanvasAriaLabel(store.scene, chartType + " chart"))
      }

      // ── React state updates ──────────────────────────────────────────
      const wasDirty = dirtyRef.current
      // If a prop/layout/size change arrives while a transition is active,
      // computeScene is intentionally deferred. Keep the dirty flag set so
      // the next non-transition frame applies the new responsive dimensions
      // instead of leaving canvas scene nodes and SVG overlays out of sync.
      dirtyRef.current = wasDirty && isTransitioning && !computedSceneThisFrame

      // Push scales into React state so SVGOverlay renders axes/grid
      if (wasDirty && store.scales) {
        // Use valueOf() for domain comparison — scaleTime.domain() returns new Date objects each call
        const v = (d: number | Date) => typeof d === "object" && d !== null && typeof d.valueOf === "function" ? d.valueOf() : d
        const scalesChanged = !currentScales ||
          v(currentScales.x.domain()[0]) !== v(store.scales.x.domain()[0]) ||
          v(currentScales.x.domain()[1]) !== v(store.scales.x.domain()[1]) ||
          v(currentScales.y.domain()[0]) !== v(store.scales.y.domain()[0]) ||
          v(currentScales.y.domain()[1]) !== v(store.scales.y.domain()[1]) ||
          currentScales.x.range()[0] !== store.scales.x.range()[0] ||
          currentScales.x.range()[1] !== store.scales.x.range()[1] ||
          currentScales.y.range()[0] !== store.scales.y.range()[0] ||
          currentScales.y.range()[1] !== store.scales.y.range()[1]
        if (scalesChanged) {
          setCurrentScales(store.scales)
        }

        // Extract x/y values for marginal graphics
        if (marginalGraphics) {
          const rawData = store.getData()
          const getX = typeof xAccessor === "function"
            ? xAccessor
            : (d: Datum) => d[xAccessor || "x"]
          const getY = typeof yAccessor === "function"
            ? yAccessor
            : (d: Datum) => d[yAccessor || "y"]
          setMarginalXValues(rawData.map(d => getX(d)).filter((v): v is number => typeof v === "number" && isFinite(v)))
          setMarginalYValues(rawData.map(d => getY(d)).filter((v): v is number => typeof v === "number" && isFinite(v)))
        }
      }

      // Trigger React re-render for SVG annotations and custom-layout overlays.
      // CustomLayout overlays are stored on PipelineStore during computeScene;
      // without this, responsive first paint can leave the canvas scene at the
      // latest measured width while overlay glyphs remain from the prior solve
      // until another React state change happens.
      // During transitions, scene nodes are interpolated imperatively on the
      // store between React renders. Throttle overlay invalidation so SVG
      // annotations track the canvas without asking React to reconcile at 60Hz.
      const hasSvgOverlayContent = (annotations && annotations.length > 0) || customLayout
      const wantsAnnotationFrame = hasSvgOverlayContent && (computedSceneThisFrame || isTransitioning)
      if (
        wantsAnnotationFrame &&
        (computedSceneThisFrame || now - lastAnnotationFrameTimeRef.current >= 33)
      ) {
        setAnnotationFrame(f => f + 1)
        lastAnnotationFrameTimeRef.current = now
      }

      // Update staleness React state for badge
      if (staleness?.showBadge) {
        setIsStale(!!currentlyStale)
      }

      // Schedule next frame for continuous rendering (pulse/transitions).
      // Re-check activeTransition after computeScene — intro animation may
      // have been set up during this frame's computeScene call.
      const needsContinuation = isTransitioning || store.activeTransition != null || store.hasActivePulses
      if (needsContinuation) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    useHydrationLifecycle({
      hydrated,
      wasHydratingFromSSR,
      storeRef,
      dirtyRef,
      renderFnRef,
      // rafRef + pendingMoveCoordsRef + moveRafRef cancel-on-unmount
      // is handled by useFrame. We just clear the adapter here so any
      // in-flight progressive chunking / pending push microtask can't
      // fire `store.ingest` after the component is gone.
      cleanup: () => adapterRef.current?.clear(),
    })

    // Re-render when visual props change
    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [chartType, adjustedWidth, adjustedHeight, showAxes, background, lineStyle, canvasPreRenderers, scheduleRender])

    // Staleness check timer
    useStalenessCheck(staleness, storeRef, dirtyRef, scheduleRender, isStale, setIsStale)

    // ── Auto-detect date x-axis formatting ──────────────────────────────
    const autoDateXFormat = useMemo(() => {
      if (xFormat || tickFormatTime) return undefined
      const store = storeRef.current
      if (!store?.xIsDate || !currentScales) return undefined
      const domain = currentScales.x.domain() as [number, number]
      return makeDateTickFormatter(domain)
    }, [xFormat, tickFormatTime, currentScales])

    const effectiveXFormat: StreamXYFrameProps["xFormat"] = xFormat || (tickFormatTime as StreamXYFrameProps["xFormat"]) || (autoDateXFormat as StreamXYFrameProps["xFormat"])

    // ── Tooltip positioning ──────────────────────────────────────────────

    const tooltipRendered = effectiveHoverAnnotation && hoverPoint
      ? (tooltipContent ? tooltipContent(hoverPoint) : <DefaultTooltip hover={hoverPoint} />)
      : null

    const tooltipElement = tooltipRendered ? (
      <FlippingTooltip
        x={hoverPoint!.x}
        y={hoverPoint!.y}
        containerWidth={adjustedWidth}
        containerHeight={adjustedHeight}
        margin={margin}
        className="stream-frame-tooltip"
      >
        {tooltipRendered}
      </FlippingTooltip>
    ) : null

    // ── Keyboard focus ring ──────────────────────────────────────────────

    const fnp = focusedNavPointRef.current
    const focusRing = (
      <FocusRing
        active={kbFocusIndexRef.current >= 0}
        hoverPoint={hoverPoint}
        margin={margin}
        size={size}
        shape={fnp?.shape}
        width={fnp?.w}
        height={fnp?.h}
      />
    )

    // ── Annotation accessor resolution ─────────────────────────────────
    // SVGOverlay needs string keys to look up coordinates in
    // annotationData. When accessors are functions, we bake resolved
    // values under synthetic keys. Priority: string accessor →
    // function accessor (resolved) → string fallback
    // (timeAccessor/valueAccessor) → function fallback (resolved) →
    // undefined.
    //
    // Helpers live in `./annotationAccessorResolver` so
    // StreamOrdinalFrame can share the same plumbing.
    const xResolved = resolveAnnotationAccessor(xAccessor, timeAccessor, "__semiotic_resolvedX", "__semiotic_resolvedTime")
    const yResolved = resolveAnnotationAccessor(yAccessor, valueAccessor, "__semiotic_resolvedY", "__semiotic_resolvedValue")
    const annXAccessor = xResolved.key
    const annYAccessor = yResolved.key
    const hasAnnotations = (annotations && annotations.length > 0) || false
    const enrichAnnotationData = buildEnrichAnnotationData(xResolved, yResolved, hasAnnotations)

    // ── SSR + hydration path: render SVG instead of canvas ─────────────
    //
    // Fires on the server pass (so the framework gets pre-rendered SVG
    // it can ship as initial HTML) AND on the first client render
    // *after SSR hydration* (so the markup matches what the server
    // emitted, and React's hydration check passes). Pure CSR mounts —
    // where `getServerSnapshot` was never called and there's no
    // server HTML to match — go straight to the canvas branch and
    // skip the wasted SVG render that would be overwritten on the
    // post-commit re-render anyway.
    //
    // After the post-hydration re-render (`hydrated === true`),
    // control falls through to the canvas branch below — same DOM
    // root, the inner content is reconciled.

    if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
      // Compute scene synchronously for server rendering
      const store = storeRef.current
      if (store && data) {
        store.ingest({ inserts: safeData, bounded: true })
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
      }

      const scene = store?.scene ?? []
      const scales = store?.scales ?? null

      // SSR: compute date format from SSR-computed scales (currentScales is null in SSR)
      const ssrXFormat: StreamXYFrameProps["xFormat"] = effectiveXFormat || ((): StreamXYFrameProps["xFormat"] => {
        if (store?.xIsDate && scales) {
          const domain = scales.x.domain() as [number, number]
          return makeDateTickFormatter(domain) as StreamXYFrameProps["xFormat"]
        }
        return undefined
      })()

      const chartAriaLabel = description || (typeof title === "string" ? title : "XY chart")

      return (
        <div
          // `responsiveRef` is attached on both the SVG and canvas
          // branches so the ResizeObserver in `useResponsiveSize` latches
          // on at first commit. Without it, the observer would only
          // attach after hydration flips to the canvas branch — and
          // because the observer's useEffect deps don't include the ref,
          // it would never re-run to see the now-attached element.
          ref={responsiveRef}
          className={`stream-xy-frame${className ? ` ${className}` : ""}`}
          role="img"
          aria-label={chartAriaLabel}
          style={{
            position: "relative",
            width: responsiveWidth ? "100%" : size[0],
            height: responsiveHeight ? "100%" : size[1],
          }}
        >
          <ScreenReaderSummary summary={summary} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size[0]}
            height={size[1]}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
            <g transform={`translate(${margin.left},${margin.top})`}>
              {background && (
                <rect x={0} y={0} width={adjustedWidth} height={adjustedHeight} fill={background} />
              )}
              {svgPreRenderers && scales && svgPreRenderers.map((renderer, ri) => (
                <React.Fragment key={`svgpre-${ri}`}>{renderer(scene, scales, { width: adjustedWidth, height: adjustedHeight })}</React.Fragment>
              ))}
              {scene.map((node, i) => xySceneNodeToSVG(node, i, svgInstanceId)).filter(Boolean)}
            </g>
          </svg>
          <SVGOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={scales}
            showAxes={showAxes}
            axes={axesConfig}
            xLabel={xLabel}
            yLabel={yLabel}
            yLabelRight={yLabelRight}
            xFormat={ssrXFormat}
            yFormat={yFormat || (tickFormatValue as StreamXYFrameProps["yFormat"])}
            axisExtent={axisExtent}
            showGrid={showGrid}
            title={title}
            legend={legend}
            legendHoverBehavior={legendHoverBehavior}
            legendClickBehavior={legendClickBehavior}
            legendHighlightedCategory={legendHighlightedCategory}
            legendIsolatedCategories={legendIsolatedCategories}
            legendPosition={legendPosition}
            legendLayout={legendLayout}
            foregroundGraphics={
            composeOverlays(resolvedForeground, wrapWithCustomLayoutSelection(storeRef.current?.customLayoutOverlays, layoutSelection ?? null))
          }
            marginalGraphics={marginalGraphics}
            xValues={[]}
            yValues={[]}
            annotations={annotations}
            autoPlaceAnnotations={autoPlaceAnnotations}
            svgAnnotationRules={svgAnnotationRules}
            annotationFrame={0}
            xAccessor={annXAccessor}
            yAccessor={annYAccessor}
            annotationData={enrichAnnotationData(store?.getData())}
            pointNodes={store?.scene.filter(
              (n): n is PointSceneNode => n.type === "point"
            )}
            curve={typeof curve === "string" ? curve : undefined}
            linkedCrosshairName={linkedCrosshairName}
            linkedCrosshairSourceId={linkedCrosshairSourceId}
          />
        </div>
      )
    }

    // ── Render ───────────────────────────────────────────────────────────

    // tableId comes from useFrame above (semiotic-table-${React.useId()}).

    return (
      <div
        ref={responsiveRef}
        className={`stream-xy-frame${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={description || (typeof title === "string" ? title : "XY chart")}
        tabIndex={0}
        style={{
          position: "relative",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1],
          overflow: "visible",
        }}
        onKeyDown={onKeyDown}
      >
        {accessibleTable && <SkipToTableLink tableId={tableId} />}
        {accessibleTable && <AccessibleDataTable scene={storeRef.current?.scene ?? []} chartType={chartType + " chart"} tableId={tableId} chartTitle={typeof title === "string" ? title : undefined} />}
        <ScreenReaderSummary summary={summary} />
        {/* Live region MUST live outside the role="img" wrapper — AT treats the
            image as atomic and never announces content nested inside it. */}
        <AriaLiveTooltip hoverPoint={hoverPoint} />
        {/* Inner graphic wrapper — role="img" so AT treats canvas as a single image */}
        <div
          role="img"
          aria-label={description || (typeof title === "string" ? title : "XY chart")}
          style={{ position: "relative", width: "100%", height: "100%" }}
          onMouseMove={effectiveHoverAnnotation ? onMouseMoveWrapped : undefined}
          onMouseLeave={effectiveHoverAnnotation ? onPointerLeave : undefined}
          onClick={customClickBehavior ? onClick : undefined}
        >
        {resolvedBackground && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size[0],
              height: size[1],
              pointerEvents: "none"
            }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
          </svg>
        )}
        <SVGUnderlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          axes={axesConfig}
          showGrid={showGrid}
          xFormat={effectiveXFormat}
          yFormat={yFormat || (tickFormatValue as StreamXYFrameProps["yFormat"])}
          axisExtent={axisExtent}
        />
        <canvas
          ref={canvasRef}
          aria-label={computeCanvasAriaLabel(storeRef.current?.scene ?? [], chartType + " chart")}
          style={{
            position: "absolute",
            left: 0,
            top: 0
          }}
        />
        <canvas
          ref={interactionCanvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none"
          }}
        />
        <SVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          axes={axesConfig}
          xLabel={xLabel}
          yLabel={yLabel}
          yLabelRight={yLabelRight}
          xFormat={effectiveXFormat}
          yFormat={yFormat || (tickFormatValue as StreamXYFrameProps["yFormat"])}
          axisExtent={axisExtent}
          showGrid={showGrid}
          title={title}
          legend={legend}
          legendHoverBehavior={legendHoverBehavior}
          legendClickBehavior={legendClickBehavior}
          legendHighlightedCategory={legendHighlightedCategory}
          legendIsolatedCategories={legendIsolatedCategories}
          legendPosition={legendPosition}
          legendLayout={legendLayout}
          foregroundGraphics={
            composeOverlays(resolvedForeground, wrapWithCustomLayoutSelection(storeRef.current?.customLayoutOverlays, layoutSelection ?? null))
          }
          marginalGraphics={marginalGraphics}
          xValues={marginalXValues}
          yValues={marginalYValues}
          annotations={annotations}
          autoPlaceAnnotations={autoPlaceAnnotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
          xAccessor={annXAccessor}
          yAccessor={annYAccessor}
          annotationData={enrichAnnotationData(storeRef.current?.getData())}
          pointNodes={storeRef.current?.scene.filter(
            (n): n is PointSceneNode => n.type === "point"
          )}
          curve={typeof curve === "string" ? curve : undefined}
          underlayRendered
          // Mirror the canvas render-loop's `shouldPaintBg` predicate
          // (line ~1090). When the canvas paints `--semiotic-bg`
          // opaquely, it hides `SVGUnderlay` and the overlay needs to
          // emit the grid + baseline copy itself. When the canvas is
          // transparent (`background="transparent"` opt-out, or a
          // `backgroundGraphics` SVG sibling that owns the bg layer),
          // the underlay shows through and the overlay must NOT
          // duplicate to avoid the doubled / slightly-darker stroke
          // from two SVG paths overlaid pixel-for-pixel.
          canvasObscuresUnderlay={background !== "transparent" && !backgroundGraphics}
          linkedCrosshairName={linkedCrosshairName}
          linkedCrosshairSourceId={linkedCrosshairSourceId}
        />
        {(brush || onBrush) && (
          <XYBrushOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            dimension={brush?.dimension ?? "xy"}
            scales={currentScales}
            onBrush={onBrush ?? (() => {})}
            binSize={binSize}
            snap={brush?.snap}
            binBoundaries={brush?.binBoundaries ?? (chartType === "bar" ? storeRef.current?.getBinBoundaries() : undefined)}
            snapDuring={brush?.snapDuring}
            streaming={runtimeMode === "streaming"}
          />
        )}
        {staleness?.showBadge && (
          <StalenessBadge isStale={isStale} position={staleness.badgePosition} />
        )}
        {focusRing}
        {tooltipElement}
        </div>{/* end role="img" */}
      </div>
    )
  }
)

StreamXYFrame.displayName = "StreamXYFrame"
export default StreamXYFrame
