/**
 * StreamOrdinalFrame — canvas-based ordinal chart renderer.
 *
 * Renders bar, stacked bar, grouped bar, pie/donut, swarm, box, violin,
 * histogram, ridgeline, dot, funnel, and swimlane charts via a streaming
 * pipeline backed by OrdinalPipelineStore.
 *
 * Key dependencies:
 *   OrdinalPipelineStore  — data ingestion, scale computation, scene layout
 *   DataSourceAdapter     — static vs streaming data source abstraction
 *   OrdinalSVGOverlay     — annotations, axes, legends (SVG layer above canvas)
 *   OrdinalBrushOverlayLazy — d3-brush overlay, loaded only when brush is enabled
 *   ordinalSceneBuilders/ — per-chartType layout algorithms
 *   SceneToSVG            — SSR fallback (scene nodes → SVG elements)
 *
 * Consumed by: all ordinal HOC charts (BarChart, SwarmPlot, Histogram, etc.)
 * via StreamOrdinalFrameProps. HOCs set chartType + style functions; the
 * frame owns rendering, interaction, and accessibility.
 */
"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type {
  HoverData,
  OrdinalLayout,
  OrdinalPipelineConfig,
  OrdinalScales,
  StreamOrdinalFrameHandle,
  StreamOrdinalFrameProps
} from "./ordinalTypes"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { SceneRevisionDiagnosticsObserver, useSceneRevisionDiagnostics } from "./sceneRevisionDiagnostics"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { useConfigSync, useLayoutSelectionSync } from "./streamStoreSync"
import { ordinalHitToHover, resolveOrdinalPointerHit } from "./ordinalFrameInteraction"
import { useStalenessCheck } from "./useStalenessCheck"
import { StalenessBadge } from "./StalenessBadge"
import { OrdinalSVGOverlay, OrdinalSVGUnderlay } from "./OrdinalSVGOverlay"
import { resolveAnnotationAccessor, buildEnrichAnnotationData } from "./annotationAccessorResolver"
import { OrdinalBrushOverlayLazy } from "./OrdinalBrushOverlayLazy"
import { isServerEnvironment } from "./isServerEnvironment"
import { useHydration, useWasHydratingFromSSR } from "./useHydration"
import { useStableShallow } from "./useStableShallow"
import { AccessibleDataTable, AccessibleTablePortal, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useFrame } from "./useFrame"
import { CanvasFrameBackground, useFrameCanvasHost } from "./useCanvasFrameHost"
import { refreshIdlePulse } from "./pulseFrameRefresh"
import { resolveThemeSemanticColors } from "../store/themeCore"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { sceneMarkCursor, setCanvasMarkCursor, syncCanvasMarkCursor, useCanvasMarkCursorCleanup } from "./sceneCursor"
import { shouldHandleFramePointer } from "./frameCursorInteraction"
import { rehitOrdinalFrameCursor } from "./ordinalFrameCursorInteraction"

// Canvas setup / hover
import { getDevicePixelRatio, subscribeToCanvasFontInvalidation } from "./canvasSetup"
import type { HoverPointerCoords } from "./hoverUtils"
import { useLegendCategoryEmission } from "./useLegendCategoryEmission"
import { resolveFrameGraphics } from "./frameGraphics"

import { ORDINAL_CANVAS_RENDERERS as RENDERERS } from "./ordinalCanvasRenderers"
import { paintSceneWithBackend } from "./renderBackend"
import { renderOrdinalSceneListWithBackend } from "./ordinalSceneSVG"
import { DefaultOrdinalTooltip } from "./ordinalDefaultTooltip"
import { observationInputType } from "../charts/shared/semanticInteractions"
import { isAnnotationActivationTarget } from "../charts/shared/annotationActivation"
import { useSemanticFrameInteractions } from "./useSemanticFrameInteractions"
import { useOrdinalKeyboardNavigation } from "./frameKeyboardNavigation"
import { normalizeGradient } from "../charts/shared/gradient"
import { AXIS_FRAME_DEFAULT_MARGIN } from "./frameDefaultMargins"
import { ordinalFrameLegendOptions } from "./frameLegendOptions"

const DEFAULT_MARGIN = AXIS_FRAME_DEFAULT_MARGIN

// ── Component ──────────────────────────────────────────────────────────

const StreamOrdinalFrame = memo(forwardRef<StreamOrdinalFrameHandle, StreamOrdinalFrameProps>(
  function StreamOrdinalFrame(props, ref) {
    const {
      chartType,
      runtimeMode,
      data,
      oAccessor = "category",
      rAccessor = "value",
      colorAccessor,
      symbolAccessor,
      symbolMap,
      stackBy,
      groupBy,
      multiAxis,
      timeAccessor,
      valueAccessor,
      categoryAccessor,
      accessorRevision,
      projection = "vertical",
      size: sizeProp = [600, 400],
      responsiveWidth,
      responsiveHeight,
      margin: userMargin,
      maxDevicePixelRatio,
      barPadding,
      roundedTop,
      gradientFill,
      trackFill,
      baselinePadding,
      innerRadius,
      cornerRadius,
      normalize,
      startAngle,
      sweepAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorOpacity,
      showLabels,
      connectorAccessor,
      connectorStyle,
      dataIdAccessor,
      rExtent,
      oExtent,
      extentPadding = 0.05,
      oSort,
      windowMode = "sliding",
      windowSize = 200,
      pieceStyle,
      summaryStyle,
      renderMode,
      colorScheme,
      barColors,
      showAxes = true,
      showCategoryTicks,
      categoryLabel, valueLabel, categoryFormat, valueFormat,
      oLabel: oLabelLegacy, rLabel: rLabelLegacy,
      oFormat: oFormatLegacy, rFormat: rFormatLegacy,
      rTickValues,
      tickLabelEdgeAlign,
      axisExtent,
      enableHover = true,
      hoverRadius = 30,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior: customHoverBehaviorProp,
      customClickBehavior: customClickBehaviorProp,
      onObservation,
      annotationObservationCallback,
      chartId,
      annotations,
      onAnnotationActivate,
      autoPlaceAnnotations,
      svgAnnotationRules,
      showGrid = false,
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
      title,
      className,
      background,
      centerContent,
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
      brush,
      onBrush: onBrushProp,
      accessibleTable = true,
      description,
      summary,
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
        chartType: "StreamOrdinalFrame"
      })

    // HOC-style accessor names are the canonical public API. Resolve them
    // once so bounded data, hover/keyboard metadata, and annotations all use
    // the same fields as the streaming path.
    const effectiveOAccessor = categoryAccessor ?? oAccessor
    const effectiveRAccessor = valueAccessor ?? rAccessor
    // Resolve labels before frame chrome so a direct bottom legend reserves
    // the exact same band as its SVG overlay.
    const oLabel = categoryLabel ?? oLabelLegacy
    const rLabel = valueLabel ?? rLabelLegacy
    const oFormat = categoryFormat ?? oFormatLegacy
    const rFormat = valueFormat ?? rFormatLegacy
    // dirtyRef is declared before useFrame so it can be threaded in for
    // the theme-change effect. Initial value `true` is family-specific
    // (Ordinal forces a first paint) — see investigation note #3.
    const dirtyRef = useRef(true)

    // ── Frame composition (Tier A + B concerns; see useFrame.ts) ─────────
    const frame = useFrame({
      sizeProp,
      responsiveWidth,
      responsiveHeight,
      userMargin,
      marginDefault: DEFAULT_MARGIN,
      title,
      legend,
      legendPosition,
      ...ordinalFrameLegendOptions(props, legend),
      // foreground/background are resolved in this frame's body so a function
      // form can anchor to the resolved `{o, r, projection}` scales (below).
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
    const {
      reducedMotionRef,
      responsiveRef,
      size,
      margin,
      adjustedWidth,
      adjustedHeight,
      currentTheme,
      transition,
      introEnabled,
      tableId,
      rafRef, renderFnRef, scheduleRender, frameRuntime,
    } = frame

    useEffect(() => subscribeToCanvasFontInvalidation(() => {
      dirtyRef.current = true
      scheduleRender()
    }), [scheduleRender])

    // ── Hydration boundary ───────────────────────────────────────────────
    // See `HYDRATION.md` for the full recipe + `StreamXYFrame` for the
    // canonical comment. SVG-branch gate is
    // `isServerEnvironment || (!hydrated && wasHydratingFromSSR)`:
    // SSR pass + first client render after SSR get the SVG branch
    // (matches server output); pure CSR mounts skip it.
    const hydrated = useHydration()
    const wasHydratingFromSSR = useWasHydratingFromSSR()
    const safeData = useMemo(() => filterSparseArray(data), [data])

    // ── Refs ─────────────────────────────────────────────────────────────

    const hoverRef = useRef<HoverData | null>(null)
    const sceneHasAuthoredCursorRef = useRef(false)
    // ── State ────────────────────────────────────────────────────────────

    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)
    const [currentScales, setCurrentScales] = useState<OrdinalScales | null>(null)

    const resolvedForeground = resolveFrameGraphics(foregroundGraphics, size, margin, currentScales)
    const resolvedBackground = resolveFrameGraphics(backgroundGraphics, size, margin, currentScales)
    // Keep an opaque chart background below the SVG underlay rather than in
    // the retained mark canvas. A canvas background would hide SVG gridlines;
    // copying those lines into the overlay makes them visible, but incorrectly
    // puts them on top of bars and other marks. SVG resolves both literal
    // colors and CSS custom properties, so this preserves the former canvas
    // fill behavior while keeping the layer order: background → grid → marks.
    // With backgroundGraphics, the ordinary theme fallback remains opt-out so
    // custom graphics can be transparent by default. An explicitly requested
    // solid background is composed immediately before those graphics.
    const resolvedCanvasBackground =
      !backgroundGraphics && background !== "transparent" ? (
        <rect
          className="semiotic-canvas-background"
          data-semiotic-layer="canvas-background"
          x={-margin.left}
          y={-margin.top}
          width={size[0]}
          height={size[1]}
          fill={background || "var(--semiotic-bg, transparent)"}
        />
      ) : null
    const resolvedCombinedBackground =
      backgroundGraphics && background && background !== "transparent" ? (
        <rect
          className="semiotic-canvas-background semiotic-canvas-background--combined"
          data-semiotic-layer="canvas-background"
          x={-margin.left}
          y={-margin.top}
          width={size[0]}
          height={size[1]}
          fill={background}
        />
      ) : null
    const [annotationFrame, setAnnotationFrame] = useState(0)
    const lastAnnotationFrameTimeRef = useRef(0)
    const [isStale, setIsStale] = useState(false)
    const lastSceneDimsRef = useRef({ w: -1, h: -1 })
    const pulseFramePendingRef = useRef(false)
    const sceneRevisionDiagnosticsRef = useSceneRevisionDiagnostics("StreamOrdinalFrame")
    // customLayout overlays are read straight from store.customLayoutOverlays at
    // render time (see the foregroundGraphics composition below) — same pattern
    // as StreamXYFrame / StreamNetworkFrame. The render loop's `setAnnotationFrame`
    // re-render (fired on `wasDirty`, after `computeScene` refreshes the store)
    // picks up fresh overlays, so no separate React state / setState is needed.
    // ── Hover config ─────────────────────────────────────────────────────

    const effectiveHoverAnnotation = enableHover || hoverAnnotation

    // ── Pipeline ─────────────────────────────────────────────────────────

    const isStreaming = runtimeMode === "streaming"

    // animate → transition + introEnabled comes from useFrame above.

    const pipelineConfig = useMemo((): OrdinalPipelineConfig => ({
      chartType,
      runtimeMode: isStreaming ? "streaming" : "bounded",
      windowSize,
      windowMode,
      extentPadding,
      projection,
      oAccessor: isStreaming ? undefined : effectiveOAccessor,
      rAccessor: isStreaming ? undefined : effectiveRAccessor,
      accessorRevision,
      colorAccessor,
      symbolAccessor,
      symbolMap,
      stackBy,
      groupBy,
      multiAxis,
      timeAccessor: isStreaming ? timeAccessor : undefined,
      valueAccessor: isStreaming
        ? (valueAccessor ||
          (typeof effectiveRAccessor === "string" || typeof effectiveRAccessor === "function"
            ? effectiveRAccessor
            : undefined))
        : undefined,
      categoryAccessor: isStreaming ? effectiveOAccessor : undefined,
      rExtent,
      oExtent,
      axisExtent,
      barPadding,
      roundedTop,
      gradientFill: normalizeGradient(gradientFill),
      trackFill,
      baselinePadding,
      innerRadius,
      cornerRadius,
      normalize,
      startAngle,
      sweepAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorOpacity,
      showLabels,
      connectorAccessor,
      connectorStyle,
      dataIdAccessor,
      oSort,
      pieceStyle,
      summaryStyle,
      colorScheme,
      themeCategorical: currentTheme?.colors?.categorical,
      themeSemantic: resolveThemeSemanticColors(currentTheme),
      themeSequential: currentTheme?.colors?.sequential,
      themeDiverging: currentTheme?.colors?.diverging,
      barColors,
      decay,
      pulse,
      transition,
      introAnimation: introEnabled,
      staleness,
      clock: frameRuntime.now,
      customLayout,
      onLayoutError,
      layoutConfig,
      layoutMargin: margin,
    }), [chartType, isStreaming, windowSize, windowMode, extentPadding, projection, effectiveOAccessor, effectiveRAccessor, accessorRevision, colorAccessor, symbolAccessor, symbolMap, stackBy, groupBy, multiAxis, timeAccessor, valueAccessor, rExtent, oExtent, axisExtent, barPadding, roundedTop, gradientFill, trackFill, baselinePadding, innerRadius, cornerRadius, normalize, startAngle, sweepAngle, dynamicColumnWidth, bins, showOutliers, showIQR, amplitude, connectorOpacity, showLabels, connectorAccessor, connectorStyle, dataIdAccessor, oSort, pieceStyle, summaryStyle, colorScheme, currentTheme, barColors, decay, pulse, transition, introEnabled, staleness, frameRuntime.now, customLayout, onLayoutError, layoutConfig, margin])

    // Stabilize the config reference so inline-object / inline-array
    // props don't shed identity every parent render. See
    // StreamNetworkFrame for the full incident write-up; the same loop
    // applies here.
    const stablePipelineConfig = useStableShallow(pipelineConfig)

    const storeRef = useRef<OrdinalPipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new OrdinalPipelineStore(stablePipelineConfig)
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
          // in the render loop — single canonical emit point per data change,
          // already rAF-throttled. Calling here too would scan the full
          // buffer twice per push at high streaming frequencies.
          scheduleRender()
        }
      })
    }

    // ── Push API ─────────────────────────────────────────────────────────

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

    // Data replacement. Routes through `setReplacementData`, which emits
    // `{ bounded: true, preserveCategoryOrder: true }`. Three effects:
    //   1. The store skips `categories.clear()` on ingest so insertion
    //      order is preserved across replacements (otherwise categories
    //      would shuffle as their values fluctuate across re-aggregations
    //      — e.g. LikertChart streaming percentages).
    //   2. `_hasStreamingData` is flipped so `resolveCategories` picks
    //      the streaming-preserve branch for `sort: "auto"` / undefined.
    //   3. Transitions still fire because bounded ingest doesn't wipe
    //      the store's `prevPositionMap`.
    //
    // Parameter type mirrors `pushPoint`/`pushManyPoints` above: the frame
    // itself isn't generic (it's typed with the non-generic
    // `StreamOrdinalFrameHandle`, whose default `T` is `Datum`),
    // so all internal callbacks use that concrete shape. The generic `T` on
    // `StreamOrdinalFrameHandle<T>` still flows to consumers — TS method-
    // bivariance lets this wider internal callback sit inside a ref typed
    // with a narrower `T`, so `useRef<StreamOrdinalFrameHandle<MyDatum>>`
    // sees `replace(data: MyDatum[])` at the call site.
    const replaceData = useCallback((newData: Datum[]) => {
      adapterRef.current?.clearLastData()
      adapterRef.current?.setReplacementData(newData)
    }, [])

    useImperativeHandle(ref, () => ({
      push: pushPoint,
      pushMany: pushManyPoints,
      replace: replaceData,
      remove: (id: string | string[]) => {
        adapterRef.current?.flush()
        const removed = storeRef.current?.remove(id) ?? []
        if (removed.length > 0) {
          const hoveredData = hoverRef.current?.data
          const shouldClear = hoverRef.current
            ? Array.isArray(hoveredData)
              ? removed.some(d => hoveredData.includes(d))
              : removed.some(d => d === hoveredData)
            : false
          if (shouldClear) {
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
        adapterRef.current?.flush()
        return storeRef.current?.getData() ?? []
      },
      getScales: () => storeRef.current?.scales ?? null,
      getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
      getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null
    }), [pushPoint, pushManyPoints, replaceData, clearAll, scheduleRender])

    // ── Controlled data prop ─────────────────────────────────────────────

    useEffect(() => {
      if (!data) return
      adapterRef.current?.setBoundedData(safeData)
    }, [data, safeData])

    const { canvasRef, resolutionDirtyRef } = useFrameCanvasHost(frame, {
      storeRef,
      dirtyRef,
      hydrated,
      wasHydratingFromSSR,
      cleanup: () => adapterRef.current?.clear(),
      maxDevicePixelRatio,
      canvasPaintDependencies: [chartType, adjustedWidth, adjustedHeight, showAxes, background, backgroundGraphics, renderMode, scheduleRender],
    })

    // ── Hover handlers ───────────────────────────────────────────────────

    const {
      hoverHandlerRef,
      hoverLeaveRef,
      onPointerMove,
      onPointerLeave,
      pointerStateRef
    } = frame

    hoverHandlerRef.current = (e: HoverPointerCoords) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const store = storeRef.current
      if (!store) {
        setCanvasMarkCursor(canvas)
        return
      }
      const result = resolveOrdinalPointerHit({
        pointer: e,
        canvasRect: canvas.getBoundingClientRect(),
        margin: { left: margin.left, top: margin.top },
        width: adjustedWidth,
        height: adjustedHeight,
        projection,
        hoverRadius,
        scene: store.scene,
        pointQuadtree: store.pointQuadtree,
        maxPointRadius: store.maxPointRadius
      })
      setCanvasMarkCursor(
        canvas,
        result.kind === "hit" ? sceneMarkCursor(result.hit.node) : undefined
      )
      if (!effectiveHoverAnnotation) return
      if (result.kind !== "hit") {
        if (hoverRef.current) {
          hoverRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) customHoverBehavior(null)
          scheduleRender()
        }
        return
      }

      const hover = ordinalHitToHover(result.hit, {
        oAccessor: effectiveOAccessor,
        rAccessor: effectiveRAccessor,
        chartType
      })

      hoverRef.current = hover
      setHoverPoint(hover)
      // Hover itself only drives the tooltip/ARIA overlay. Do not mark the
      // retained scene dirty — that re-runs computeScene and (with animate)
      // restarts transitions on every pointermove. Selection-driven restyle
      // (hoverHighlight / linkedHover) updates React state → pieceStyle →
      // useConfigSync, which dirties only when styles actually change.
      customHoverBehavior?.(hover)
      scheduleRender()
    }

    hoverLeaveRef.current = () => {
      setCanvasMarkCursor(canvasRef.current)
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverPoint(null)
        customHoverBehavior?.(null)
        scheduleRender()
      }
    }

    useCanvasMarkCursorCleanup(canvasRef)

    const onClick = useCallback((e: React.MouseEvent) => {
      if (isAnnotationActivationTarget(e.target)) return
      if (!customClickBehavior) return
      const canvas = canvasRef.current
      if (!canvas) {
        customClickBehavior(null)
        // Selection/click handlers update React state; do not dirty geometry.
        scheduleRender()
        return
      }
      const store = storeRef.current
      if (!store) {
        customClickBehavior(null)
        scheduleRender()
        return
      }
      const result = resolveOrdinalPointerHit({
        pointer: e,
        canvasRect: canvas.getBoundingClientRect(),
        margin: { left: margin.left, top: margin.top },
        width: adjustedWidth,
        height: adjustedHeight,
        projection,
        hoverRadius,
        scene: store.scene,
        pointQuadtree: store.pointQuadtree,
        maxPointRadius: store.maxPointRadius
      })
      if (result.kind !== "hit") {
        customClickBehavior(null)
        scheduleRender()
        return
      }

      customClickBehavior(ordinalHitToHover(result.hit, {
        oAccessor: effectiveOAccessor,
        rAccessor: effectiveRAccessor,
        chartType
      }), {
        type: "activate",
        inputType: observationInputType(
          (e.nativeEvent as MouseEvent & { pointerType?: string }).pointerType
        )
      })
      // Click does not alter retained geometry. Selection restyle flows through
      // React state → pieceStyle → useConfigSync (same as hover). Dirtying here
      // restarted transitions under animate/intro.
      scheduleRender()
    }, [customClickBehavior, canvasRef, margin.left, margin.top, adjustedWidth, adjustedHeight, projection, hoverRadius, effectiveOAccessor, effectiveRAccessor, chartType, scheduleRender])

    // useFrame coalesces pointer moves; this frame owns the hit-test closures.

    // ── Keyboard navigation ───────────────────────────────────────────

    const { kbFocusIndexRef, focusedNavPointRef, onKeyDown } =
      useOrdinalKeyboardNavigation({
        storeRef,
        hoverRef,
        setHoverPoint,
        customHoverBehavior,
        customClickBehavior,
        scheduleRender,
        chartType,
        oAccessor: effectiveOAccessor,
        rAccessor: effectiveRAccessor
      })

    const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
      if (!shouldHandleFramePointer(
        pointerStateRef, e, Boolean(effectiveHoverAnnotation),
        sceneHasAuthoredCursorRef.current, canvasRef.current, "mouse"
      )) return
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    }, [canvasRef, effectiveHoverAnnotation, focusedNavPointRef, kbFocusIndexRef, onPointerMove, pointerStateRef])

    // ── Render function ──────────────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = null
      if (!frameRuntime.isActive) return
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const store = storeRef.current
      if (!store) return
      const now = frameRuntime.now()

      // Advance transition animation
      // Fast-forward transitions when reduced motion is active so target positions
      // are applied immediately and transition state is cleared properly
      const transitionWasActive = store.activeTransition != null
      const transitionActive = store.advanceTransition(reducedMotionRef.current ? now + 1e6 : now)
      const isTransitioning = reducedMotionRef.current ? false : transitionActive

      const dimsChanged =
        lastSceneDimsRef.current.w !== adjustedWidth || lastSceneDimsRef.current.h !== adjustedHeight
      const wasDirty = dirtyRef.current
      const stylePaintPending = store.consumeStylePaintPending()
      let computedSceneThisFrame = false
      const sceneRevisionCheck = sceneRevisionDiagnosticsRef.current.beforeCompute(
        store.getLastUpdateResult(),
        isTransitioning
      )

      // Scene rebuild only on data/layout dirty — not on resolutionDirty
      // (browser zoom / maxDevicePixelRatio is paint-only).
      if ((wasDirty || dimsChanged) && (!isTransitioning || dimsChanged)) {
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
        lastSceneDimsRef.current = { w: adjustedWidth, h: adjustedHeight }
        computedSceneThisFrame = true
        emitLegendCategories()
      }
      if (computedSceneThisFrame || stylePaintPending)
        sceneHasAuthoredCursorRef.current = syncCanvasMarkCursor(canvas, store.scene)
      if (sceneHasAuthoredCursorRef.current && (transitionWasActive || computedSceneThisFrame || stylePaintPending)) {
        rehitOrdinalFrameCursor({
          canvas, pointer: pointerStateRef.current, store,
          margin: { left: margin.left, top: margin.top },
          width: adjustedWidth, height: adjustedHeight, projection, hoverRadius,
          geometryMoved: transitionWasActive || computedSceneThisFrame
        })
      }
      sceneRevisionDiagnosticsRef.current.afterCompute(
        sceneRevisionCheck,
        computedSceneThisFrame,
        dimsChanged
      )
      dirtyRef.current = wasDirty && isTransitioning && !computedSceneThisFrame
      // Ordinal paints whenever scheduled; clear resolution dirty after this
      // pass so a zoom re-rasterizes once without forcing a later rebuild.
      resolutionDirtyRef.current = false

      const pulseRefresh = refreshIdlePulse(store, now, computedSceneThisFrame, pulseFramePendingRef)
      // Update canvas aria-label imperatively after scene changes
      if (computedSceneThisFrame || isTransitioning) {
        canvas.setAttribute("aria-label", computeCanvasAriaLabel(store.scene, chartType + " chart"))
      }

      // DPR setup — only resize the canvas buffer when dimensions actually change.
      // Setting canvas.width/height (even to the same value) implicitly clears the
      // buffer and forces GPU reallocation on HiDPI displays.
      const dpr = getDevicePixelRatio(maxDevicePixelRatio)
      const newWidth = size[0] * dpr
      const newHeight = size[1] * dpr
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth
        canvas.height = newHeight
        canvas.style.width = `${size[0]}px`
        canvas.style.height = `${size[1]}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Clear
      ctx.clearRect(0, 0, size[0], size[1])

      // Staleness dimming
      const staleThreshold = staleness?.threshold ?? 5000
      const currentlyStale = staleness && store.lastIngestTime > 0 &&
        (now - store.lastIngestTime) > staleThreshold

      if (currentlyStale) {
        ctx.globalAlpha = staleness?.dimOpacity ?? 0.5
      }

      // Background paint deliberately lives in the SVG layer below this
      // transparent mark canvas; see `resolvedCanvasBackground` above.

      const isRadial = projection === "radial"

      // Clip to chart area so items outside rExtent don't overflow
      ctx.save()
      ctx.beginPath()
      ctx.rect(margin.left, margin.top, adjustedWidth, adjustedHeight)
      ctx.clip()

      if (isRadial) {
        // Radial: translate to center of chart area
        ctx.save()
        ctx.translate(margin.left + adjustedWidth / 2, margin.top + adjustedHeight / 2)
      } else {
        ctx.translate(margin.left, margin.top)
      }

      // Custom layouts may emit any node type, so use the self-filtering custom set.
      const renderers = customLayout ? RENDERERS.custom : (RENDERERS[chartType] || [])
      const layout: OrdinalLayout = { width: adjustedWidth, height: adjustedHeight }
      const scales = store.scales
      if (scales) paintSceneWithBackend({
        context: ctx,
        nodes: store.scene,
        renderMode,
        pixelRatio: dpr,
        paintBuiltIn: (nodes) => {
          for (const renderer of renderers) {
            renderer(ctx, nodes, scales, layout)
          }
        }
      })

      if (isRadial) {
        ctx.restore()
      }

      // Restore clip
      ctx.restore()

      // Reset alpha after staleness dimming
      if (currentlyStale) {
        ctx.globalAlpha = 1
      }

      // Push scales to React state for SVG overlay
      if (computedSceneThisFrame && store.scales) {
        setCurrentScales(store.scales)
        setAnnotationFrame(f => f + 1)
        lastAnnotationFrameTimeRef.current = now
      } else if (isTransitioning && store.scales && now - lastAnnotationFrameTimeRef.current >= 33) {
        setAnnotationFrame(f => f + 1)
        lastAnnotationFrameTimeRef.current = now
      }

      // Update staleness badge state
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
    useStalenessCheck(staleness, storeRef, dirtyRef, scheduleRender, frameRuntime.now, isStale, setIsStale)

    // ── Tooltip positioning ──────────────────────────────────────────────

    const tooltipRendered = effectiveHoverAnnotation && hoverPoint
      ? (tooltipContent ? tooltipContent(hoverPoint) : <DefaultOrdinalTooltip hover={hoverPoint} />)
      : null

    // For radial projection, hit coords are center-relative — convert back
    // to margin-relative for tooltip positioning
    const isRadialMode = projection === "radial"
    const tooltipX = hoverPoint
      ? (isRadialMode ? hoverPoint.x + adjustedWidth / 2 : hoverPoint.x)
      : 0
    const tooltipY = hoverPoint
      ? (isRadialMode ? hoverPoint.y + adjustedHeight / 2 : hoverPoint.y)
      : 0

    const tooltipElement = tooltipRendered ? (
      <FlippingTooltip
        x={tooltipX}
        y={tooltipY}
        containerWidth={adjustedWidth}
        containerHeight={adjustedHeight}
        margin={margin}
        className="stream-ordinal-tooltip"
      >
        {tooltipRendered}
      </FlippingTooltip>
    ) : null

    // ── Annotation accessor resolution ─────────────────────────────────
    // OrdinalSVGOverlay needs string keys to read coordinates from
    // annotationData. When the effective ordinal/range accessors are functions
    // we bake resolved values under synthetic stable keys and
    // forward those keys as the annotation context's xAccessor /
    // yAccessor. Without this, annotation rules like `trend` would
    // see `undefined` accessors and silently fail to read the data.
    // Mirrors StreamXYFrame's same pattern; helpers shared via
    // `./annotationAccessorResolver`.
    const annotationXAccessor =
      projection === "horizontal" ? effectiveRAccessor : effectiveOAccessor
    const annotationYAccessor =
      projection === "horizontal" ? effectiveOAccessor : effectiveRAccessor
    const xResolved = resolveAnnotationAccessor(
      annotationXAccessor,
      undefined,
      "__semiotic_resolvedO",
      ""
    )
    const yResolved = resolveAnnotationAccessor(
      annotationYAccessor,
      undefined,
      "__semiotic_resolvedR",
      ""
    )
    const annXAccessor = xResolved.key
    const annYAccessor = yResolved.key
    const hasAnnotations = (annotations && annotations.length > 0) || false
    const enrichAnnotationData = buildEnrichAnnotationData(xResolved, yResolved, hasAnnotations)

    // ── SSR path: render SVG instead of canvas ──────────────────────────

    // SSR + actual SSR-hydration only — pure CSR mounts skip the
    // wasted SVG render. See StreamXYFrame for the full rationale.
    if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
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
      const isRadial = projection === "radial"
      const translateX = isRadial ? margin.left + adjustedWidth / 2 : margin.left
      const translateY = isRadial ? margin.top + adjustedHeight / 2 : margin.top

      return (
        <div
          // Attached on both the SVG and canvas branches so the
          // `ResizeObserver` in `useResponsiveSize` latches at first
          // commit. See `StreamXYFrame.tsx` for the full rationale.
          ref={responsiveRef}
          className={`stream-ordinal-frame${className ? ` ${className}` : ""}`}
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
          style={{
            position: "relative",
            fontFamily: "var(--semiotic-font-family, sans-serif)",
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
              {background && (
                <rect x={0} y={0} width={adjustedWidth} height={adjustedHeight} fill={background} />
              )}
              {ssrBackground}
            </g>
            <g transform={`translate(${translateX},${translateY})`}>
              {renderOrdinalSceneListWithBackend({
                nodes: scene, renderMode, idPrefix: tableId
              }).map(entry => entry.element)}
            </g>
          </svg>
          <OrdinalSVGOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={scales}
            showAxes={showAxes}
            showCategoryTicks={showCategoryTicks}
            oLabel={oLabel}
            rLabel={rLabel}
            oFormat={oFormat}
            rFormat={rFormat}
            rTickValues={rTickValues}
            tickLabelEdgeAlign={tickLabelEdgeAlign}
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
            annotations={annotations}
            onAnnotationActivate={onAnnotationActivate}
            onObservation={annotationObservationCallback ?? onObservation}
            chartId={chartId}
            chartType="StreamOrdinalFrame"
            autoPlaceAnnotations={autoPlaceAnnotations}
            svgAnnotationRules={svgAnnotationRules}
            annotationFrame={0}
            xAccessor={annXAccessor}
            yAccessor={annYAccessor}
            annotationData={enrichAnnotationData(store?.getData())}
          />
          {centerContent && projection === "radial" && (
            <div
              style={{
                position: "absolute",
                left: margin.left + adjustedWidth / 2,
                top: margin.top + adjustedHeight / 2,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                textAlign: "center"
              }}
            >
              {centerContent}
            </div>
          )}
        </div>
      )
    }

    // ── Render ───────────────────────────────────────────────────────────

    // tableId comes from useFrame above (semiotic-table-${React.useId()}).

    return (
      <div
        ref={responsiveRef}
        className={`stream-ordinal-frame${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
        tabIndex={0}
        style={{
          position: "relative",
          fontFamily: "var(--semiotic-font-family, sans-serif)",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1],
          overflow: "visible",
        }}
      onKeyDown={onKeyDown}
    >
      {process.env.NODE_ENV !== "production" && storeRef.current && (
        <SceneRevisionDiagnosticsObserver
          store={storeRef.current}
          diagnostics={sceneRevisionDiagnosticsRef.current}
        />
      )}
      {accessibleTable && <AccessibleTablePortal accessibleTable={accessibleTable}><SkipToTableLink tableId={tableId} /><AccessibleDataTable scene={storeRef.current?.scene ?? []} chartType={chartType + " chart"} tableId={tableId} chartTitle={typeof title === "string" ? title : undefined} /></AccessibleTablePortal>}
        <ScreenReaderSummary summary={summary} />
        {/* Live region MUST live outside the role="img" wrapper — AT treats the
            image as atomic and never announces content nested inside it. */}
        <AriaLiveTooltip hoverPoint={hoverPoint} />
        <div
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
          style={{ position: "relative", width: "100%", height: "100%" }}
          onMouseMove={onMouseMoveWrapped}
          onMouseLeave={onPointerLeave}
          onClick={hasClickBehavior ? onClick : undefined}
        >
        <CanvasFrameBackground size={size} margin={margin}>
          {resolvedCombinedBackground}
          {resolvedCanvasBackground}
          {resolvedBackground}
        </CanvasFrameBackground>

        <OrdinalSVGUnderlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          showGrid={showGrid}
          rFormat={rFormat}
          rTickValues={rTickValues}
          axisExtent={axisExtent}
        />

        <canvas
          ref={canvasRef}
          aria-label={computeCanvasAriaLabel(storeRef.current?.scene ?? [], chartType + " chart")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size[0],
            height: size[1]
          }}
        />

        <OrdinalSVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          showCategoryTicks={showCategoryTicks}
          oLabel={oLabel}
          rLabel={rLabel}
          oFormat={oFormat}
          rFormat={rFormat}
          rTickValues={rTickValues}
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
          annotations={annotations}
          onAnnotationActivate={onAnnotationActivate}
          onObservation={annotationObservationCallback ?? onObservation}
          chartId={chartId}
          chartType="StreamOrdinalFrame"
          autoPlaceAnnotations={autoPlaceAnnotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
          xAccessor={annXAccessor}
          yAccessor={annYAccessor}
          annotationData={enrichAnnotationData(storeRef.current?.getData())}
          underlayRendered
          // The retained mark canvas is intentionally transparent. The SVG
          // background and underlay precede it, so no overlay grid copy is
          // needed and gridlines remain behind the marks.
          canvasObscuresUnderlay={false}
        />

        {/* Brush overlay — not supported for radial projection (pie/donut) */}
        {(brush || onBrushProp) && projection !== "radial" && (
          <OrdinalBrushOverlayLazy
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={currentScales}
            onBrush={onBrushProp || (() => {})}
          />
        )}

        {/* Donut center content */}
        {centerContent && projection === "radial" && (
          <div
            style={{
              position: "absolute",
              left: margin.left + adjustedWidth / 2,
              top: margin.top + adjustedHeight / 2,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              textAlign: "center"
            }}
          >
            {centerContent}
          </div>
        )}

        {staleness?.showBadge && (
          <StalenessBadge isStale={isStale} position={staleness.badgePosition} />
        )}
        <FocusRing
          active={kbFocusIndexRef.current >= 0}
          hoverPoint={hoverPoint}
          margin={margin}
          size={size}
          shape={focusedNavPointRef.current?.shape}
          width={focusedNavPointRef.current?.w}
          height={focusedNavPointRef.current?.h}
        />
        {tooltipElement}
        </div>{/* end role="img" */}
      </div>
    )
  }
))

StreamOrdinalFrame.displayName = "StreamOrdinalFrame"
export default StreamOrdinalFrame
