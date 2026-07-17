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
  forwardRef,
  memo
} from "react"
import type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  HoverData,
  HoverAnnotationConfig,
  SceneNode,
  StreamScales
} from "./types"
import { XYBrushOverlayLazy } from "./XYBrushOverlayLazy"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import {
  SceneRevisionDiagnosticsObserver,
  useSceneRevisionDiagnostics
} from "./sceneRevisionDiagnostics"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { useConfigSync, useLayoutSelectionSync } from "./streamStoreSync"
import { findNearestNode, findAllNodesAtX } from "./CanvasHitTester"
import { enrichDatumWithBand } from "./xySceneBuilders/ribbonScene"
import { useStalenessCheck } from "./useStalenessCheck"
import { resolveStaleness } from "./stalenessBands"
import { StalenessBadge } from "./StalenessBadge"
import { SVGOverlay, SVGUnderlay } from "./SVGOverlay"
import { xySceneNodeToSVG, isServerEnvironment } from "./SceneToSVG"
import { useHydration, useWasHydratingFromSSR } from "./useHydration"
import { useStableShallow } from "./useStableShallow"
import { paintCanvasBackground } from "./canvasBackground"
import { needsInteractionCanvasPaint } from "./paintNeeds"
import {
  createFrameThemeColorCache,
  LIGHT_FRAME_THEME
} from "./frameThemeColors"

export { withAlpha } from "./frameThemeColors"
import { AccessibleDataTable, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useFrame } from "./useFrame"
import { CanvasFrameBackground, useFrameCanvasHost } from "./useCanvasFrameHost"
import { refreshIdlePulse } from "./pulseFrameRefresh"
import { resolveFrameGraphics } from "./frameGraphics"

// Canvas setup
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"
import { buildHoverData, getPointerHitRadius, type HoverPointerCoords } from "./hoverUtils"
import { useLegendCategoryEmission } from "./useLegendCategoryEmission"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { resolveAnnotationAccessor, buildEnrichAnnotationData } from "./annotationAccessorResolver"
import { makeDateTickFormatter } from "./xyDateTicks"
import { collectAnnotationAnchors } from "./xyAnnotationAnchors"
import { XY_CANVAS_RENDERERS as RENDERERS } from "./xyCanvasRenderers"
import { paintSceneWithBackend, renderSceneWithBackend } from "./renderBackend"
import { drawCrosshair, drawLineHighlight } from "./xyCrosshair"
import { DefaultTooltip } from "./xyDefaultTooltip"
import { observationInputType } from "../charts/shared/semanticInteractions"
import { isAnnotationActivationTarget } from "../charts/shared/annotationActivation"
import { useSemanticFrameInteractions } from "./useSemanticFrameInteractions"
import { useXYKeyboardNavigation } from "./frameKeyboardNavigation"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 30, left: 40 }

// Theme colors live in frameThemeColors.ts (shared across Stream Frames).
const LIGHT_THEME = LIGHT_FRAME_THEME

function brushTouchAction(brush: StreamXYFrameProps["brush"]): React.CSSProperties["touchAction"] | undefined {
  if (!brush) return undefined
  if (brush.dimension === "x") return "pan-y"
  if (brush.dimension === "y") return "pan-x"
  return "none"
}

// ── StreamXYFrame ──────────────────────────────────────────────────────

const StreamXYFrame = memo(forwardRef<StreamXYFrameHandle, StreamXYFrameProps>(
  function StreamXYFrame(props, ref) {
    const {
      chartType,
      runtimeMode,
      data,
      chunkThreshold,
      chunkSize,
      xAccessor,
      yAccessor,
      accessorRevision,
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
      renderMode,
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
      customHoverBehavior: customHoverBehaviorProp,
      customClickBehavior: customClickBehaviorProp,
      onObservation,
      annotationObservationCallback,
      chartId,
      enableHover,
      hoverRadius = 30,
      tooltipMode,
      annotations,
      onAnnotationActivate,
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
      frameScheduler,
      clock: clockProp,
      random: randomProp,
      seed,
      paused = false,
      suspendWhenHidden = true,
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
      onLayoutError,
      layoutConfig,
      layoutSelection,
    } = props

    const { customHoverBehavior, customClickBehavior, hasClickBehavior } =
      useSemanticFrameInteractions<HoverData>({
        customHoverBehavior: customHoverBehaviorProp,
        customClickBehavior: customClickBehaviorProp,
        onObservation,
        chartId,
        chartType: "StreamXYFrame"
      })

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
    const pulseFramePendingRef = useRef(false)
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
      title,
      legend,
      legendPosition,
      animate,
      transitionProp,
      frameScheduler,
      clock: clockProp,
      random: randomProp,
      seed,
      paused,
      suspendWhenHidden,
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
    // `useCanvasFrameHost` further down handles the post-swap
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
      frameRuntime,
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
    // foreground/background graphics are resolved *after* `currentScales` is
    // declared (below), so a function form can anchor to the frame's resolved
    // scales — see `resolveFrameGraphics`.

    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom
    const safeData = useMemo(() => filterSparseArray(data), [data])

    // Determine effective hover annotation config
    const effectiveHoverAnnotation = hoverAnnotation ?? enableHover

    // ── Refs ─────────────────────────────────────────────────────────────

    // Canvas refs and the lifecycle around them are installed below once this
    // family has created its store and data adapter. rAF scheduling and theme
    // change handling come from useFrame above.

    const [annotationFrame, setAnnotationFrame] = useState(0)
    const lastAnnotationFrameTimeRef = useRef(0)

    // Scales state: updated after each scene computation so SVGOverlay re-renders
    const [currentScales, setCurrentScales] = useState<StreamScales | null>(null)

    const resolvedForeground = resolveFrameGraphics(foregroundGraphics, size, margin, currentScales)
    const resolvedBackground = resolveFrameGraphics(backgroundGraphics, size, margin, currentScales)

    // Hover state: ref for canvas (sync), React state for tooltip (async)
    const hoverRef = useRef<HoverData | null>(null)
    const hoveredNodeRef = useRef<SceneNode | null>(null)
    const lastPointerTypeRef = useRef<string | undefined>(undefined)
    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)

    // Cached theme primary — updated by the render loop. The hover handler
    // reads from here instead of re-resolving theme colors on every pointermove.
    const themePrimaryRef = useRef<string>(LIGHT_THEME.primary)
    const themeColorCacheRef = useRef(createFrameThemeColorCache())
    /** True when the interaction canvas last painted hover/highlight content. */
    const interactionHasContentRef = useRef(false)
    const sceneRevisionDiagnosticsRef = useSceneRevisionDiagnostics("StreamXYFrame")

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
      accessorRevision,
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
      clock: frameRuntime.now,
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
      onLayoutError,
      layoutConfig,
      layoutMargin: margin,
    }), [chartType, isStreaming, windowSize, windowMode, arrowOfTime, extentPadding, scalePadding, axisExtent, xAccessor, yAccessor, accessorRevision, timeAccessor, valueAccessor, colorAccessor, sizeAccessor, symbolAccessor, symbolMap, groupAccessor, lineDataAccessor, categoryAccessor, xScaleType, yScaleType, xExtent, yExtent, sizeRange, binSize, normalize, baseline, stackOrder, boundsAccessor, boundsStyle, y0Accessor, band, gradientFill, areaGroups, lineGradient, openAccessor, highAccessor, lowAccessor, closeAccessor, candlestickStyle, lineStyle, pointStyle, areaStyle, swarmStyle, waterfallStyle, colorScheme, barColors, barStyle, annotations, decay, pulse, transition, introEnabled, staleness, frameRuntime.now, heatmapAggregation, heatmapXBins, heatmapYBins, showValues, heatmapValueFormat, pointIdAccessor, curve, currentTheme, customLayout, onLayoutError, layoutConfig, margin])

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

    const emitLegendCategories = useLegendCategoryEmission(storeRef, legendCategoryAccessor, onCategoriesChange, store => store.getData())

    useConfigSync(storeRef, stablePipelineConfig, dirtyRef, scheduleRender)

    // Bridge the resolved custom-layout selection into the scene store +
    // repaint. See useLayoutSelectionSync for why this is a legitimate
    // React→canvas sync (selection is React-assembled), not a store relay.
    useLayoutSelectionSync(storeRef, layoutSelection, dirtyRef, scheduleRender)

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
      update: (id: string | string[], updater: (d: Datum) => Datum) => {
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
      getExtents: () => storeRef.current?.getExtents() ?? null,
      getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
      getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null
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

    const { canvasRef, interactionCanvasRef } = useFrameCanvasHost(frame, {
      storeRef,
      dirtyRef,
      hydrated,
      wasHydratingFromSSR,
      cleanup: () => adapterRef.current?.clear(),
      canvasPaintDependencies: [chartType, adjustedWidth, adjustedHeight, showAxes, background, backgroundGraphics, lineStyle, renderMode, canvasPreRenderers, scheduleRender],
    })

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
      const hitRadius = getPointerHitRadius(hoverRadius, e.pointerType)
      const hit = findNearestNode(store.scene, chartX, chartY, hitRadius, store.quadtree, store.maxPointRadius)
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
        const allHits = findAllNodesAtX(store.scene, posX, Math.max(hitRadius, adjustedWidth))
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
      if (isAnnotationActivationTarget(e.target)) return
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
      const hitRadius = getPointerHitRadius(hoverRadius, lastPointerTypeRef.current)
      const hit = findNearestNode(store.scene, chartX, chartY, hitRadius, store.quadtree, store.maxPointRadius)
      if (!hit) { customClickBehavior(null); return }
      const rawDatum = hit.datum || {}
      const xInvert = store.scales?.x?.invert
      const xValue = typeof xInvert === "function" ? xInvert(hit.x) : undefined
      customClickBehavior(buildHoverData(
        rawDatum,
        hit.x,
        hit.y,
        xValue != null ? { xValue, xPx: hit.x } : undefined
      ), {
        type: "activate",
        inputType: observationInputType(lastPointerTypeRef.current)
      })
    }
    const onClick = useCallback(
      (e: React.MouseEvent) => clickHandlerRef.current(e),
      []
    )

    // ── Keyboard navigation ───────────────────────────────────────────

    const { kbFocusIndexRef, focusedNavPointRef, onKeyDown } =
      useXYKeyboardNavigation({
        storeRef,
        hoverRef,
        hoveredNodeRef,
        setHoverPoint,
        customHoverBehavior,
        customClickBehavior,
        scheduleRender
      })

    // Clear keyboard focus on mouse interaction; reuses the rAF-coalesced
    // hover path so the per-frame work cap still applies.
    const onPointerMoveWrapped = useCallback((e: React.PointerEvent) => {
      lastPointerTypeRef.current = e.pointerType
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    }, [focusedNavPointRef, kbFocusIndexRef, onPointerMove])

    const onMouseMoveFallback = useCallback((e: React.MouseEvent) => {
      lastPointerTypeRef.current = "mouse"
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove({ clientX: e.clientX, clientY: e.clientY, pointerType: "mouse" })
    }, [focusedNavPointRef, kbFocusIndexRef, onPointerMove])

    const onPointerDown = useCallback((e: React.PointerEvent) => {
      lastPointerTypeRef.current = e.pointerType
    }, [])

    // ── Render function ──────────────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = null
      if (!frameRuntime.isActive) return
      const canvas = canvasRef.current
      const interactionCanvas = interactionCanvasRef.current
      if (!canvas || !interactionCanvas) return

      const store = storeRef.current
      if (!store) return

      const now = frameRuntime.now()

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
      // A custom-layout restyle mutates scene styles in place (no rebuild) and
      // asks for a repaint via this flag — OR'd into the paint gate below, but
      // NOT into the scene-recompute gate, so the restyle isn't overwritten.
      const stylePaintPending = store.consumeStylePaintPending()
      let computedSceneThisFrame = false
      const updateResult = store.getLastUpdateResult()
      const sceneRevisionCheck = sceneRevisionDiagnosticsRef.current.beforeCompute(updateResult, isTransitioning)

      // Compute scene graph (scales + scene nodes) — when data changed, or when
      // the dimensions changed (the latter wins over an active transition).
      if (needsDataRepaint && (!isTransitioning || dimsChanged)) {
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
        lastSceneDimsRef.current = { w: adjustedWidth, h: adjustedHeight }
        computedSceneThisFrame = true
        emitLegendCategories()
      }
      sceneRevisionDiagnosticsRef.current.afterCompute(sceneRevisionCheck, computedSceneThisFrame, dimsChanged)

      const pulseRefresh = refreshIdlePulse(store, now, computedSceneThisFrame, pulseFramePendingRef)
      const dpr = getDevicePixelRatio()
      const theme = themeColorCacheRef.current.resolve(canvas)
      // Cache the theme primary for the hover handler — avoids re-running
      // getComputedStyle on every pointermove event at high pointer rates.
      themePrimaryRef.current = theme.primary

      // Staleness check (used by both canvases). `resolveStaleness`
      // handles both the binary flip and the graded (banded) ramp.
      const idleMs = store.lastIngestTime > 0 ? now - store.lastIngestTime : 0
      const resolvedStaleness = resolveStaleness(staleness, idleMs)
      const currentlyStale = staleness && resolvedStaleness.isStale

      // ── Data canvas: repaint when data/props changed or a restyle/pulse is pending ─
      if (needsDataRepaint || stylePaintPending || pulseRefresh.changed) {
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
          paintCanvasBackground(ctx, {
            background,
            hasBackgroundGraphics: Boolean(backgroundGraphics),
            themeBackground: theme.background,
            x: -margin.left,
            y: -margin.top,
            width: size[0],
            height: size[1]
          })

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
          paintSceneWithBackend({
            context: ctx,
            nodes: store.scene,
            renderMode,
            pixelRatio: dpr,
            paintBuiltIn: (nodes) => {
              if (!renderers || !store.scales) return
              for (const renderer of renderers) {
                renderer(
                  ctx,
                  nodes,
                  store.scales,
                  { width: adjustedWidth, height: adjustedHeight }
                )
              }
            }
          })

          ctx.restore()

          if (staleness && resolvedStaleness.alpha < 1) {
            ctx.globalAlpha = 1
          }
        }
      }

      // ── Interaction canvas: only when hover / highlight is active ──
      // Idle transition/pulse frames skip clear+draw on the interaction
      // layer. When hover ends, `interactionHasContentRef` forces one
      // clear so the previous crosshair does not stick.
      const hasHoverOverlay =
        Boolean(effectiveHoverAnnotation && hoverRef.current && store.scales)
      const hasHighlightOverlay =
        Boolean(
          hoveredNodeRef.current &&
            Array.isArray(hoverAnnotation) &&
            hoverAnnotation.some(
              (a: { type?: string } | null) => a && typeof a === "object" && a.type === "highlight"
            )
        )
      const interactionActive = hasHoverOverlay || hasHighlightOverlay
      const needsInteractionRepaint = needsInteractionCanvasPaint(
        interactionActive,
        interactionHasContentRef.current
      )
      if (needsInteractionRepaint) {
        const ictx = prepareCanvas(interactionCanvas, size, margin, dpr)
        if (ictx) {
          // Clear previous frame (crosshair, highlights, etc.)
          ictx.clearRect(-margin.left, -margin.top, size[0], size[1])

          // Crosshair on hover
          if (hasHoverOverlay && hoverRef.current) {
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
          if (hasHighlightOverlay && hoveredNodeRef.current && Array.isArray(hoverAnnotation)) {
            const highlightEntry = hoverAnnotation.find(
              (a: { type?: string } | null) => a && typeof a === "object" && a.type === "highlight"
            )
            if (highlightEntry) {
              drawLineHighlight(ictx, store.scene, hoveredNodeRef.current, highlightEntry, theme)
            }
          }
        }
        interactionHasContentRef.current = interactionActive
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

      // Continue transitions and active pulse frames.
      const needsContinuation = isTransitioning || store.activeTransition != null || pulseRefresh.pending
      if (needsContinuation) {
        scheduleRender()
      }
    }

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
      // SSR has no `currentScales` state — re-resolve graphics with the scene's
      // synchronously-computed scales so server overlays anchor correctly too.
      const ssrForeground = resolveFrameGraphics(foregroundGraphics, size, margin, scales)
      const ssrBackground = resolveFrameGraphics(backgroundGraphics, size, margin, scales)

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
              {ssrBackground}
            </g>
            <g transform={`translate(${margin.left},${margin.top})`}>
              {background && (
                <rect x={0} y={0} width={adjustedWidth} height={adjustedHeight} fill={background} />
              )}
              {svgPreRenderers && scales && svgPreRenderers.map((renderer, ri) => (
                <React.Fragment key={`svgpre-${ri}`}>{renderer(scene, scales, { width: adjustedWidth, height: adjustedHeight })}</React.Fragment>
              ))}
              {scene.map((node, i) => renderSceneWithBackend({
                node,
                index: i,
                renderMode,
                fallback: () => xySceneNodeToSVG(node, i, svgInstanceId)
              })).filter(Boolean)}
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
            composeOverlays(ssrForeground, wrapWithCustomLayoutSelection(storeRef.current?.customLayoutOverlays, layoutSelection ?? null))
          }
            marginalGraphics={marginalGraphics}
            xValues={[]}
            yValues={[]}
            annotations={annotations}
            onAnnotationActivate={onAnnotationActivate}
            onObservation={annotationObservationCallback ?? onObservation}
            chartId={chartId}
            chartType="StreamXYFrame"
            autoPlaceAnnotations={autoPlaceAnnotations}
            svgAnnotationRules={svgAnnotationRules}
            annotationFrame={0}
            xAccessor={annXAccessor}
            yAccessor={annYAccessor}
            annotationData={enrichAnnotationData(storeRef.current?.getData())}
            pointNodes={collectAnnotationAnchors(storeRef.current?.scene)}
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
          touchAction: brushTouchAction(brush),
        }}
        onKeyDown={onKeyDown}
      >
        {process.env.NODE_ENV !== "production" && storeRef.current && (
          <SceneRevisionDiagnosticsObserver
            store={storeRef.current}
            diagnostics={sceneRevisionDiagnosticsRef.current}
          />
        )}
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
          onPointerMove={effectiveHoverAnnotation ? onPointerMoveWrapped : undefined}
          onMouseMove={effectiveHoverAnnotation ? onMouseMoveFallback : undefined}
          onPointerLeave={effectiveHoverAnnotation ? onPointerLeave : undefined}
          onMouseLeave={effectiveHoverAnnotation ? onPointerLeave : undefined}
          onPointerDown={effectiveHoverAnnotation || hasClickBehavior ? onPointerDown : undefined}
          onClick={hasClickBehavior ? onClick : undefined}
        >
        <CanvasFrameBackground size={size} margin={margin}>
          {resolvedBackground}
        </CanvasFrameBackground>
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
          onAnnotationActivate={onAnnotationActivate}
          onObservation={annotationObservationCallback ?? onObservation}
          chartId={chartId}
          chartType="StreamXYFrame"
          autoPlaceAnnotations={autoPlaceAnnotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
          xAccessor={annXAccessor}
          yAccessor={annYAccessor}
          annotationData={enrichAnnotationData(storeRef.current?.getData())}
          pointNodes={collectAnnotationAnchors(storeRef.current?.scene)}
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
          <XYBrushOverlayLazy
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
))

StreamXYFrame.displayName = "StreamXYFrame"
export default StreamXYFrame
