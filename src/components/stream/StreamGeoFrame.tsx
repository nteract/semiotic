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
  forwardRef
} from "react"
import type {
  StreamGeoFrameProps,
  StreamGeoFrameHandle,
  GeoSceneNode,
  GeoAreaSceneNode,
  GeoLineSceneNode,
  ProjectionName,
  ProjectionProp
} from "./geoTypes"
import type { PointSceneNode, SceneNode, StreamLayout, StreamScales } from "./types"
import type { HoverData } from "../realtime/types"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"
import { findNearestGeoNode } from "./GeoCanvasHitTester"
import { useFrame } from "./useFrame"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { useStalenessCheck } from "./useStalenessCheck"
import { SVGOverlay } from "./SVGOverlay"
import { isServerEnvironment, geoSceneNodeToSVG } from "./SceneToSVG"
import { useHydration, useWasHydratingFromSSR, useHydrationLifecycle } from "./useHydration"
import { useStableShallow } from "./useStableShallow"
import { resolveCSSColor } from "./renderers/resolveCSSColor"
import { AccessibleDataTable, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { extractCategoryDomain, sameCategoryDomain } from "./categoryDomain"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { extractGeoNavPoints, nextIndex } from "./keyboardNav"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom"
import type { ZoomBehavior, ZoomTransform, D3ZoomEvent } from "d3-zoom"
import { select, type Selection } from "d3-selection"

// Canvas renderers
import { geoCanvasRenderer } from "./renderers/geoCanvasRenderer"
import { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { TileCache, renderTiles } from "./GeoTileRenderer"
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"
import { GeoParticlePool } from "./GeoParticlePool"
import type { HoverPointerCoords } from "./hoverUtils"
import { resolveNodeColor } from "./sceneUtils"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 10, right: 10, bottom: 10, left: 10 }

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

const zoomButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid rgba(0,0,0,0.2)",
  borderRadius: 4,
  background: "rgba(255,255,255,0.9)",
  color: "#333",
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
}

type GeoTooltipData = HoverData | null
type GeoFeatureLike = Datum & {
  properties?: Datum
  geometry?: unknown
  data?: Datum
}
type HitCanvas = HTMLCanvasElement | OffscreenCanvas
type HitCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type GeoZoomSelection = Selection<HTMLDivElement, unknown, null, undefined>

interface GeoZoomControlBehavior {
  scaleBy(selection: GeoZoomSelection, factor: number): void
  transform(selection: GeoZoomSelection, transform: ZoomTransform | Pick<ZoomTransform, "k">): void
}

function resolveProjectionName(projection: ProjectionProp): ProjectionName | null {
  if (typeof projection === "string") return projection
  if (typeof projection === "object" && projection && "type" in projection) {
    return projection.type
  }
  return null
}

function ensureHitCanvasContext(canvas: HitCanvas | null): HitCanvasContext | null {
  if (!canvas) return null
  return canvas.getContext("2d")
}

function DefaultGeoTooltip({ data }: { data: GeoTooltipData }) {
  if (!data) return null
  // GeoJSON features: show properties (lifted to top-level on the hover wrapper)
  if (data.properties) {
    const name = data.properties.name || data.properties.NAME || data.properties.id || "Feature"
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>{name}</div>
      </div>
    )
  }
  // Point data: hover wrapper now has the canonical { data, x, y } shape
  // (no flattened fields), so read user-facing fields off `data.data`.
  // Skip wrapper-internal keys when iterating so the default tooltip
  // shows the user's actual datum fields, not "data: [object]".
  const source = (data as any).data ?? data
  const entries = Object.entries(source as Record<string, unknown>)
    .filter(([k]) => k !== "data" && !k.startsWith("__"))
    .slice(0, 3)
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <span style={{ opacity: 0.7 }}>{k}: </span>
          <span style={{ fontWeight: 600 }}>{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

// ── StreamGeoFrame ─────────────────────────────────────────────────────

const StreamGeoFrame = forwardRef<StreamGeoFrameHandle, StreamGeoFrameProps>(
  function StreamGeoFrame(props, ref) {
    const {
      // Projection
      projection,
      projectionExtent,
      fitPadding,
      projectionTransform,

      // Data
      areas,
      points,
      lines,

      // Accessors
      xAccessor,
      yAccessor,
      lineDataAccessor,
      pointIdAccessor,

      // Geo-specific
      lineType = "geo",
      flowStyle = "basic",
      graticule,
      zoomable,
      zoomExtent,
      onZoom,
      dragRotate: dragRotateProp,

      // Particles
      showParticles,
      particleStyle,

      // Tiles
      tileURL,
      tileAttribution,
      tileCacheSize,

      // Layout
      size: sizeProp,
      width: widthProp,
      height: heightProp,
      responsiveWidth,
      responsiveHeight,
      margin: marginProp,
      className,
      background,
      runtimeMode: _runtimeMode,

      // Style
      areaStyle,
      pointStyle,
      lineStyle,
      colorScheme,

      // Interaction
      enableHover = true,
      hoverAnnotation,
      tooltipContent,
      customClickBehavior,
      customHoverBehavior,
      annotations,

      // Realtime
      decay,
      pulse,
      transition: transitionProp,
      animate,
      staleness,

      // Rendering
      backgroundGraphics,
      foregroundGraphics,
      title,

      // Legend (passed from HOCs)
      legend,
      legendPosition,
      legendHoverBehavior,
      legendClickBehavior,
      legendHighlightedCategory,
      legendIsolatedCategories,
      legendCategoryAccessor,
      onCategoriesChange,
      showAxes,
      accessibleTable = true,
      description,
      summary
    } = props

    // ── Frame composition (Tier A + B concerns; see useFrame.ts) ────────
    // Geo accepts size as either `size: [w, h]` or as separate `width`/
    // `height` props (legacy form). Resolve before handing to useFrame.
    const sizeFromProps: [number, number] = sizeProp || [widthProp || 600, heightProp || 400]
    // dirtyRef declared before useFrame so it can be threaded in for the
    // theme-change effect. Geo inits to true (load-bearing for first paint).
    const dirtyRef = useRef(true)
    const frame = useFrame({
      sizeProp: sizeFromProps,
      responsiveWidth,
      responsiveHeight,
      userMargin: marginProp,
      marginDefault: DEFAULT_MARGIN,
      foregroundGraphics,
      backgroundGraphics,
      animate,
      transitionProp,
      themeDirtyRef: dirtyRef,
    })
    const {
      reducedMotionRef,
      responsiveRef,
      size,
      margin,
      adjustedWidth,
      adjustedHeight,
      resolvedForeground,
      resolvedBackground,
      transition,
      introEnabled,
      tableId,
      rafRef,
      renderFnRef,
      scheduleRender,
      currentTheme,
    } = frame

    // ── Hydration boundary ─────────────────────────────────────────────
    // See `HYDRATION.md` for the full recipe + `StreamXYFrame` for the
    // canonical comment. SVG-branch gate is
    // `isServerEnvironment || (!hydrated && wasHydratingFromSSR)`:
    // SSR pass + first client render after SSR get the SVG branch
    // (matches server output); pure CSR mounts skip it.
    const hydrated = useHydration()
    const wasHydratingFromSSR = useWasHydratingFromSSR()
    const safeAreas = useMemo(
      () => Array.isArray(areas) ? filterSparseArray(areas) : areas,
      [areas]
    )
    const safePoints = useMemo(() => filterSparseArray(points), [points])
    const safeLines = useMemo(() => filterSparseArray(lines), [lines])

    // Resolve dragRotate — defaults to true for orthographic
    const effectiveDragRotate = useMemo(() => {
      if (dragRotateProp != null) return dragRotateProp
      const projName = resolveProjectionName(projection)
      return projName === "orthographic"
    }, [dragRotateProp, projection])

    // ── Pipeline config ───────────────────────────────────────────────

    const pipelineConfig: GeoPipelineConfig = useMemo(() => ({
      projection,
      projectionExtent,
      fitPadding,
      xAccessor,
      yAccessor,
      lineDataAccessor,
      lineType,
      flowStyle,
      areaStyle,
      pointStyle,
      lineStyle,
      colorScheme,
      themeSemantic: resolveThemeSemanticColors(currentTheme),
      themeSequential: currentTheme?.colors?.sequential,
      themeDiverging: currentTheme?.colors?.diverging,
      graticule,
      projectionTransform,
      decay,
      pulse,
      transition,
      introAnimation: introEnabled,
      annotations,
      pointIdAccessor
    }), [
      projection, projectionExtent, fitPadding, xAccessor, yAccessor, lineDataAccessor,
      lineType, flowStyle, areaStyle, pointStyle, lineStyle, colorScheme, graticule,
      projectionTransform, decay, pulse, transition?.duration, transition?.easing, introEnabled, annotations, pointIdAccessor, currentTheme
    ])

    // Stabilize the config reference so inline-object / inline-array
    // props don't shed identity every parent render. See
    // StreamNetworkFrame for the full incident write-up; the same loop
    // applies here.
    const stablePipelineConfig = useStableShallow(pipelineConfig)

    // ── Store ─────────────────────────────────────────────────────────

    const storeRef = useRef<GeoPipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new GeoPipelineStore(stablePipelineConfig)
    }

    // ── Refs ──────────────────────────────────────────────────────────

    const tileCanvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null)
    const hitCanvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null)
    const tileCacheRef = useRef<TileCache | null>(null)
    if (tileURL && !tileCacheRef.current) {
      tileCacheRef.current = new TileCache(tileCacheSize || 256)
    }
    // rafRef + renderFnRef + scheduleRender + cancel-on-unmount + dirtyRef
    // + theme-change effect all destructured from useFrame above; not
    // redeclared here.
    const prevAnnotationsRef = useRef(annotations)

    // Zoom state
    const zoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | GeoZoomControlBehavior | null>(null)
    const zoomTransformRef = useRef<ZoomTransform>(zoomIdentity)
    const isZoomingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Combine responsive + container refs. Hoisted above the SSR
    // early-return so the hook count stays equal across renders —
    // before this lived inside the canvas branch, which made the
    // SVG-branch first render call fewer hooks than the canvas-branch
    // re-render and tripped React's rules-of-hooks check.
    const combinedRef = useCallback((el: HTMLDivElement | null) => {
      containerRef.current = el
      if (responsiveRef && typeof responsiveRef === "object") {
        (responsiveRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }
    }, [responsiveRef])

    // Drag-rotate state (globe spinning)
    const dragStartRef = useRef<{ x: number; y: number; rotation: [number, number, number] } | null>(null)
    // Pending rotation from drag — applied in the render loop to coalesce pointer events
    const pendingRotationRef = useRef<[number, number, number] | null>(null)

    // Particle pool
    const particlePoolRef = useRef<GeoParticlePool | null>(null)
    const lastParticleTimeRef = useRef(0)
    if (showParticles && !particlePoolRef.current) {
      const maxPerLine = particleStyle?.maxPerLine ?? 30
      particlePoolRef.current = new GeoParticlePool(maxPerLine * 50)
    }

    // Hover state
    const hoverRef = useRef<HoverData | null>(null)
    const hoveredNodeRef = useRef<GeoSceneNode | null>(null)
    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)
    const [annotationFrame, setAnnotationFrame] = useState(0)

    // Staleness
    const [isStale, setIsStale] = useState(false)

    // ── Push-mode legend category emission ───────────────────────────
    // Mirrors StreamXYFrame: keep the latest accessor + callback in
    // refs so the renderFn closure (recomputed via dirtyRef) reads
    // current values without rebinding. Each rebuild of the scene
    // diffs the discovered category list against the last emit and
    // fires `onCategoriesChange` only on change. Empty data, missing
    // accessor, or no callback are all no-ops; this is safe to call
    // unconditionally inside the render loop.
    const lastLegendCategoriesRef = useRef<string[]>([])
    const legendCategoryAccessorRef = useRef(legendCategoryAccessor)
    const onCategoriesChangeRef = useRef(onCategoriesChange)
    legendCategoryAccessorRef.current = legendCategoryAccessor
    onCategoriesChangeRef.current = onCategoriesChange

    const emitLegendCategories = useCallback(() => {
      const accessor = legendCategoryAccessorRef.current
      const onChange = onCategoriesChangeRef.current
      if (!onChange || !accessor) return
      const categories = extractCategoryDomain(storeRef.current?.getPoints() ?? [], accessor)
      if (sameCategoryDomain(categories, lastLegendCategoriesRef.current)) return
      lastLegendCategoriesRef.current = categories
      onChange(categories)
    }, [])

    // scheduleRender comes from useFrame above.

    // Theme-change repaint (clearCSSColorCache + dirty + scheduleRender)
    // is handled by useFrame above when themeDirtyRef is provided.

    // ── Sync config ───────────────────────────────────────────────────

    useEffect(() => {
      storeRef.current?.updateConfig(stablePipelineConfig)
      dirtyRef.current = true
      scheduleRender()
    }, [stablePipelineConfig, scheduleRender])

    // ── Sync bounded data ─────────────────────────────────────────────

    useEffect(() => {
      const store = storeRef.current
      if (!store) return
      if (safeAreas) store.setAreas(safeAreas)
      if (points) store.setPoints(safePoints)
      if (lines) store.setLines(safeLines)
      dirtyRef.current = true
      scheduleRender()
    }, [safeAreas, points, safePoints, lines, safeLines, scheduleRender])

    // ── Push API ──────────────────────────────────────────────────────

    // Drop sparse entries before they reach `GeoPipelineStore` —
    // mirrors the bounded-ingest hardening. `ref.push(null)` or
    // `ref.pushMany([null, valid])` would otherwise crash extent /
    // accessor reads inside the store.
    const pushPoint = useCallback((datum: Datum) => {
      if (datum == null || typeof datum !== "object") return
      storeRef.current?.pushPoint(datum)
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    const pushMany = useCallback((data: Datum[]) => {
      const safe = filterSparseArray(data)
      if (safe.length === 0) return
      storeRef.current?.pushMany(safe)
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    const clearAll = useCallback(() => {
      storeRef.current?.clear()
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    useImperativeHandle(ref, () => ({
      push: pushPoint,
      pushMany,
      removePoint: (id: string | string[]) => {
        const removed = storeRef.current?.removePoint(id) ?? []
        if (removed.length > 0) {
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
      clear: clearAll,
      getProjection: () => storeRef.current?.scales?.projection ?? null,
      getGeoPath: () => storeRef.current?.scales?.geoPath ?? null,
      getCartogramLayout: () => storeRef.current?.cartogramLayout ?? null,
      getZoom: () => zoomTransformRef.current.k,
      resetZoom: () => {
        const container = containerRef.current
        if (container && zoomBehaviorRef.current) {
          // Reset zoom transform — immediate (no d3-transition dependency)
          select(container).call(
            zoomBehaviorRef.current.transform,
            zoomIdentity
          )
        }
      },
      getData: () => storeRef.current?.getPoints() ?? []
    }), [pushPoint, pushMany, clearAll, scheduleRender])

    // ── Hover handler ─────────────────────────────────────────────────
    // hoverHandlerRef + hoverLeaveRef + onPointerMove/Leave + cleanup all
    // come from useFrame above. Geo assigns BOTH bodies: the hover-move
    // body (hit testing on hover) further down via useEffect, and the
    // hover-leave body (clear hover state + schedule render) inline
    // where `frame.hoverLeaveRef.current = ...` is set a few lines below.
    const { hoverHandlerRef, onPointerMove, onPointerLeave } = frame

    useEffect(() => {
      hoverHandlerRef.current = (e: HoverPointerCoords) => {
        if (!enableHover) return
        const store = storeRef.current
        if (!store || !store.scene.length) return

        // Read the rect from canvasRef rather than e.currentTarget so this
        // handler still works when invoked from the rAF-coalesced path with a
        // synthetic `{ clientX, clientY }` payload (no currentTarget).
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const chartX = e.clientX - rect.left - margin.left
        const chartY = e.clientY - rect.top - margin.top

        if (chartX < 0 || chartX > adjustedWidth || chartY < 0 || chartY > adjustedHeight) {
          hoverRef.current = null
          hoveredNodeRef.current = null
          setHoverPoint(null)
          customHoverBehavior?.(null)
          scheduleRender()
          return
        }

        // Ensure hit testing canvas
        if (!hitCanvasRef.current) {
          if (typeof OffscreenCanvas !== "undefined") {
            hitCanvasRef.current = new OffscreenCanvas(1, 1)
          } else {
            hitCanvasRef.current = document.createElement("canvas")
          }
        }
        const hitCtx = ensureHitCanvasContext(hitCanvasRef.current)
        if (!hitCtx) return

        const hit = findNearestGeoNode(store.scene, chartX, chartY, 30, hitCtx, store.quadtree, store.maxPointRadius)

        if (hit) {
          const node = hit.node
          const datum = node.datum
          const rawData = Array.isArray(datum)
            ? null
            : (datum?.properties ? datum : (datum?.data || datum))

          let x: number, y: number
          if (node.type === "point") {
            x = (node as PointSceneNode).x
            y = (node as PointSceneNode).y
          } else if (node.type === "geoarea") {
            const geoNode = node as GeoAreaSceneNode
            x = geoNode.centroid[0]
            y = geoNode.centroid[1]
          } else {
            x = chartX
            y = chartY
          }

          // Flatten GeoJSON feature properties so custom tooltips
          // can access d.name, d.population etc. directly
          const hover: HoverData = {
            ...rawData,
            ...(rawData?.properties || {}),
            data: rawData,
            properties: rawData?.properties,
            __semioticHoverData: true,
            x, y,
            time: x,
            value: y,
          }
          hoverRef.current = hover
          hoveredNodeRef.current = node
          setHoverPoint(hover)
          customHoverBehavior?.(hover)
          scheduleRender()
        } else {
          if (hoverRef.current) {
            hoverRef.current = null
            hoveredNodeRef.current = null
            setHoverPoint(null)
            customHoverBehavior?.(null)
            scheduleRender()
          }
        }
      }
    }, [enableHover, adjustedWidth, adjustedHeight, margin, customHoverBehavior, scheduleRender])

    // pointermove coalescing + onPointerLeave come from useFrame above.
    // Geo's family-specific leave behavior goes into hoverLeaveRef.current,
    // which the hook's onPointerLeave invokes after cancelling any pending
    // coalesced move.
    frame.hoverLeaveRef.current = () => {
      hoverRef.current = null
      hoveredNodeRef.current = null
      setHoverPoint(null)
      customHoverBehavior?.(null)
      scheduleRender()
    }

    const onClick = useCallback((e: React.MouseEvent) => {
      if (!customClickBehavior) return
      const store = storeRef.current
      if (!store || !store.scene.length) return

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const chartX = e.clientX - rect.left - margin.left
      const chartY = e.clientY - rect.top - margin.top

      if (!hitCanvasRef.current) {
        if (typeof OffscreenCanvas !== "undefined") {
          hitCanvasRef.current = new OffscreenCanvas(1, 1)
        } else {
          hitCanvasRef.current = document.createElement("canvas")
        }
      }
      const hitCtx = ensureHitCanvasContext(hitCanvasRef.current)
      if (!hitCtx) return

      const hit = findNearestGeoNode(store.scene, chartX, chartY, 30, hitCtx, store.quadtree, store.maxPointRadius)
      if (hit) {
        const datum = hit.node.datum
        const rawData = Array.isArray(datum)
          ? null
          : (datum?.properties ? datum : (datum?.data || datum))
        const flattened = rawData?.properties ? { ...rawData, ...rawData.properties } : rawData
        customClickBehavior({
          ...flattened,
          data: rawData,
          properties: rawData?.properties,
          __semioticHoverData: true,
          x: chartX,
          y: chartY,
          time: chartX,
          value: chartY,
        })
      }
    }, [customClickBehavior, margin])

    // ── Keyboard navigation ───────────────────────────────────────────

    const kbFocusIndexRef = useRef(-1)
    const focusedNavPointRef = useRef<{ shape?: string; w?: number; h?: number } | null>(null)

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
      const store = storeRef.current
      if (!store || store.scene.length === 0) return

      const navPoints = extractGeoNavPoints(store.scene)
      if (navPoints.length === 0) return

      const current = kbFocusIndexRef.current
      const next = nextIndex(e.key, current < 0 ? -1 : current, navPoints.length)
      if (next === null) return

      e.preventDefault()

      if (next < 0) {
        kbFocusIndexRef.current = -1
        focusedNavPointRef.current = null
        hoverRef.current = null
        hoveredNodeRef.current = null
        setHoverPoint(null)
        customHoverBehavior?.(null)
        scheduleRender()
        return
      }

      const idx = current < 0 ? 0 : next
      kbFocusIndexRef.current = idx
      const point = navPoints[idx]
      focusedNavPointRef.current = { shape: point.shape, w: point.w, h: point.h }
      // Build full HoverData with flattened GeoJSON properties — same shape for
      // both state (tooltip) and customHoverBehavior (no mismatch)
      const rawDatum = point.datum as GeoFeatureLike | null
      const hover: HoverData = {
        data: rawDatum,
        properties: rawDatum?.properties,
        x: point.x,
        y: point.y,
        __semioticHoverData: true,
      }
      hoverRef.current = hover
      setHoverPoint(hover)
      customHoverBehavior?.(hover)
      scheduleRender()
    }, [customHoverBehavior, scheduleRender])

    // Clear keyboard focus on mouse interaction; reuses useFrame's
    // rAF-coalesced pointermove path.
    const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    }, [onPointerMove])

    // ── Main render function ──────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = 0
      const canvas = canvasRef.current
      const store = storeRef.current
      if (!canvas || !store) return

      const now = performance.now()
      let needsContinuation = false

      // Apply pending drag-rotation (coalesced from pointer events)
      const pendingRot = pendingRotationRef.current
      if (pendingRot) {
        pendingRotationRef.current = null
        const rotLayout = { width: adjustedWidth, height: adjustedHeight }
        store.applyRotation(pendingRot, rotLayout)
      }

      // Advance transition — skip when reduced motion
      // Fast-forward transitions when reduced motion is active so target positions
      // are applied immediately and transition state is cleared properly
      const transitionActive = store.advanceTransition(reducedMotionRef.current ? now + 1e6 : now)
      const isTransitioning = reducedMotionRef.current ? false : transitionActive

      // Recompute scene when dirty
      if (dirtyRef.current && !transitionActive) {
        const layout = { width: adjustedWidth, height: adjustedHeight }

        // In drag-rotate mode, preserve the current rotation across
        // computeScene() which resets the projection via fitProjection.
        const savedRotation = effectiveDragRotate
          ? store.getRotation()
          : null

        store.computeScene(layout)

        // Preserve zoom/rotation — computeScene resets to base projection.
        // Use setRotation (no rebuild) then let applyZoomScale do the single
        // rebuild; if no zoom, use applyRotation for the rebuild.
        const zt = zoomTransformRef.current
        const hasZoom = zt.k !== 1 || zt.x !== 0 || zt.y !== 0
        if (effectiveDragRotate && savedRotation) {
          if (hasZoom) {
            store.setRotation(savedRotation)
            store.applyZoomScale(zt.k, layout)
          } else {
            store.applyRotation(savedRotation, layout)
          }
        } else if (hasZoom) {
          store.applyZoomTransform(zt, layout)
        }
        dirtyRef.current = false

        // Update canvas aria-label imperatively after scene changes
        canvas.setAttribute("aria-label", computeCanvasAriaLabel(store.scene, "Geographic chart"))

        // Emit live category domain for push-mode legend synthesis.
        // Runs after the scene rebuild so HOC-side `useChartSetup` /
        // `useStreamingLegend` see the same category set the renderer
        // just drew.
        emitLegendCategories()
      }

      const dpr = getDevicePixelRatio()

      // ── Tile canvas (behind data canvas) ──
      if (tileURL && tileCacheRef.current) {
        const tileCanvas = tileCanvasRef.current
        if (tileCanvas && store.scales?.projection) {
          const tctx = prepareCanvas(tileCanvas, size, margin, dpr)
          if (tctx) {
            tctx.clearRect(-margin.left, -margin.top, size[0], size[1])
            tctx.save()
            tctx.beginPath()
            tctx.rect(0, 0, adjustedWidth, adjustedHeight)
            tctx.clip()

            const allLoaded = renderTiles(tctx, {
              tileURL,
              projection: store.scales.projection,
              width: adjustedWidth,
              height: adjustedHeight,
              tileCache: tileCacheRef.current,
              onTileLoad: () => scheduleRender()
            })

            tctx.restore()
            if (!allLoaded) needsContinuation = true
          }
        }
      }

      // ── Data canvas ──
      const ctx = prepareCanvas(canvas, size, margin, dpr)
      if (!ctx) return
      ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

      // Background (skip if tiles are rendering — tiles are the background).
      // Resolve CSS-variable strings before assignment; canvas's `fillStyle`
      // silently rejects `var(...)` syntax and leaves the previous fill
      // (a node/edge/particle color) in place — see the matching comment
      // in StreamNetworkFrame for the flashing-background incident.
      if (background && !tileURL) {
        const resolvedBg = resolveCSSColor(ctx, background)
        if (resolvedBg) {
          ctx.fillStyle = resolvedBg
          ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
        }
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, adjustedWidth, adjustedHeight)
      ctx.clip()

      const scene = store.scene
      const scales = store.scales
      const layout = { width: adjustedWidth, height: adjustedHeight }

      geoCanvasRenderer(ctx, scene, scales, layout)
      lineCanvasRenderer(ctx, scene as unknown as SceneNode[], scales as unknown as StreamScales, layout as StreamLayout)
      pointCanvasRenderer(ctx, scene as unknown as SceneNode[], scales as unknown as StreamScales, layout as StreamLayout)

      // ── Geo particles ──
      if (showParticles && particlePoolRef.current) {
        const pool = particlePoolRef.current
        const lineNodes = scene.filter(
          (n): n is GeoLineSceneNode => n.type === "line"
        )

        if (lineNodes.length > 0) {
          const pStyle = particleStyle || {}
          const speed = (pStyle.speedMultiplier ?? 1) * 0.3
          const maxPerLine = pStyle.maxPerLine ?? 30
          const spawnRate = pStyle.spawnRate ?? 0.15
          const radius = pStyle.radius ?? 2
          const opacity = pStyle.opacity ?? 0.7

          // Compute deltaTime
          const nowMs = now / 1000
          const dt = lastParticleTimeRef.current > 0
            ? Math.min(nowMs - lastParticleTimeRef.current, 0.1)
            : 0.016
          lastParticleTimeRef.current = nowMs

          // Build path and width arrays
          const paths = lineNodes.map(n => n.path)
          const widths = lineNodes.map(n => n.style.strokeWidth || 2)

          // Spawn particles
          for (let li = 0; li < lineNodes.length; li++) {
            if (Math.random() < spawnRate && pool.countForLine(li) < maxPerLine) {
              pool.spawn(li)
            }
          }

          // Step
          pool.step(dt, speed, paths, widths)

          // Render
          ctx.globalAlpha = opacity
          for (let i = 0; i < pool.particles.length; i++) {
            const p = pool.particles[i]
            if (!p.active) continue
            const lineNode = lineNodes[p.lineIndex]
            const color = typeof pStyle.color === "function"
              ? pStyle.color(lineNode?.datum ?? {})
              : pStyle.color === "source" || !pStyle.color
                ? (lineNode?.style.stroke || "#fff")
                : pStyle.color
            ctx.beginPath()
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          }
          ctx.globalAlpha = 1

          needsContinuation = true
        }
      }

      ctx.restore()

      // ── Interaction canvas (hover highlight) ──
      const interCanvas = interactionCanvasRef.current
      if (interCanvas) {
        const ictx = prepareCanvas(interCanvas, size, margin, dpr)
        if (ictx) {
          ictx.clearRect(-margin.left, -margin.top, size[0], size[1])

          const hoveredNode = hoveredNodeRef.current
          if (hoveredNode && hoveredNode.type === "geoarea") {
            const geoNode = hoveredNode as GeoAreaSceneNode
            const path = new Path2D(geoNode.pathData)
            ictx.fillStyle = "rgba(255, 255, 255, 0.3)"
            ictx.fill(path)
            ictx.strokeStyle = "rgba(0, 0, 0, 0.5)"
            ictx.lineWidth = 2
            ictx.stroke(path)
          }

          if (hoveredNode && hoveredNode.type === "point") {
            const pn = hoveredNode as PointSceneNode
            // Respect hoverAnnotation.pointColor for consistency with XY frame
            const hoverConfig = typeof hoverAnnotation === "object" ? hoverAnnotation : undefined
            const pointColor = hoverConfig?.pointColor || resolveNodeColor(hoveredNode)
            ictx.beginPath()
            ictx.arc(pn.x, pn.y, pn.r + 3, 0, Math.PI * 2)
            if (pointColor) {
              ictx.save()
              ictx.globalAlpha = 0.4
              ictx.fillStyle = pointColor
              ictx.fill()
              ictx.restore()
            } else {
              ictx.fillStyle = "rgba(255, 255, 255, 0.4)"
              ictx.fill()
            }
            ictx.strokeStyle = pointColor || "rgba(0, 0, 0, 0.5)"
            ictx.lineWidth = 2
            ictx.stroke()
          }
        }
      }

      // Staleness
      if (staleness) {
        const stale = performance.now() - store.lastIngestTime > (staleness.threshold ?? 5000)
        if (stale !== isStale) setIsStale(stale)
      }

      // Only trigger SVG overlay re-render when data or hover/annotation state changed
      const annotationsChanged = annotations !== prevAnnotationsRef.current
      if (annotationsChanged) prevAnnotationsRef.current = annotations
      if (dirtyRef.current || annotationsChanged) {
        setAnnotationFrame(f => f + 1)
      }

      // Reschedule if animating or tiles still loading
      if (isTransitioning || store.activeTransition != null || store.hasActivePulses || needsContinuation) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    useHydrationLifecycle({
      hydrated,
      wasHydratingFromSSR,
      storeRef,
      dirtyRef,
      renderFnRef,
      // Geo-specific: clear the tile cache on unmount so background
      // map tiles don't leak across remounts.
      cleanup: () => tileCacheRef.current?.clear(),
    })

    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [adjustedWidth, adjustedHeight, background, scheduleRender])

    useStalenessCheck(staleness, storeRef, dirtyRef, scheduleRender, isStale, setIsStale)

    // Dev warning: tiles only work with Mercator projection
    useEffect(() => {
      if (process.env.NODE_ENV !== "production" && tileURL) {
        const projName = resolveProjectionName(projection)
        if (projName && projName !== "mercator") {
          console.warn(
            `[StreamGeoFrame] tileURL is set but projection is "${projName}". ` +
            `Raster tiles use Web Mercator and will not align with other projections.`
          )
        }
      }
    }, [tileURL, projection])

    // ── Zoom/Pan/Rotate ───────────────────────────────────────────────

    useEffect(() => {
      const container = containerRef.current
      if (!zoomable || !container) {
        // Clean up if toggled off
        if (zoomBehaviorRef.current && container) {
          select(container).on(".zoom", null)
          zoomBehaviorRef.current = null
        }
        if (container) {
          select(container).on("mousedown.rotate", null)
            .on("touchstart.rotate", null)
        }
        return
      }

      const [minZoom, maxZoom] = zoomExtent || [1, 8]
      const layout = { width: adjustedWidth, height: adjustedHeight }

      // ── Drag-rotate mode (globe spinning) ──
      // No d3-zoom — manual wheel/button zoom + pointer drag rotation.
      // This avoids translate drift that d3-zoom introduces on orthographic.
      if (effectiveDragRotate) {
        let currentK = zoomTransformRef.current.k

        const applyScale = (k: number) => {
          currentK = Math.max(minZoom, Math.min(maxZoom, k))
          zoomTransformRef.current = zoomIdentity.scale(currentK)

          const store = storeRef.current
          if (store) {
            store.applyZoomScale(currentK, layout)
            dirtyRef.current = false
            scheduleRender()
            if (store.scales?.projection) {
              onZoom?.({
                projection: store.scales.projection,
                zoom: store.currentZoom
              })
            }
          }
        }

        // Expose a synthetic zoom behavior for the +/- buttons and resetZoom()
        zoomBehaviorRef.current = {
          scaleBy: (_selection: GeoZoomSelection, factor: number) => applyScale(currentK * factor),
          transform: (_selection: GeoZoomSelection, t: ZoomTransform | Pick<ZoomTransform, "k">) => applyScale(t?.k ?? 1)
        }

        const onWheel = (e: WheelEvent) => {
          e.preventDefault()
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
          applyScale(currentK * factor)
        }

        const onDblClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement | null
          if (target && (target.closest("button") || target.closest(".stream-geo-zoom-controls"))) return
          e.preventDefault()
          applyScale(currentK * 1.5)
        }

        container.addEventListener("wheel", onWheel, { passive: false })
        container.addEventListener("dblclick", onDblClick)

        // Manual drag handler for rotation
        const sensitivity = 0.4

        const onPointerDown = (e: PointerEvent) => {
          if (e.button !== 0) return
          // Don't start rotation when clicking zoom buttons or other controls
          const target = e.target as HTMLElement
          if (target.closest("button") || target.closest(".stream-geo-zoom-controls")) return
          const store = storeRef.current
          if (!store) return

          const rotation = store.getRotation()
          dragStartRef.current = { x: e.clientX, y: e.clientY, rotation: [...rotation] as [number, number, number] }
          container.setPointerCapture(e.pointerId)
          e.preventDefault()
        }

        const onPointerMove = (e: PointerEvent) => {
          const dragStart = dragStartRef.current
          if (!dragStart) return

          const dx = e.clientX - dragStart.x
          const dy = e.clientY - dragStart.y

          const newRotation: [number, number, number] = [
            dragStart.rotation[0] + dx * sensitivity,
            Math.max(-90, Math.min(90, dragStart.rotation[1] - dy * sensitivity)),
            dragStart.rotation[2]
          ]

          // Defer the expensive scene rebuild to the next animation frame.
          // Multiple pointer events between frames are coalesced — only the
          // latest rotation is applied, avoiding redundant buildSceneNodes().
          pendingRotationRef.current = newRotation
          scheduleRender()
        }

        const onPointerUp = (e: PointerEvent) => {
          if (!dragStartRef.current) return
          dragStartRef.current = null
          container.releasePointerCapture(e.pointerId)

          // Flush any pending rotation immediately so the final position is exact
          const pendingRot = pendingRotationRef.current
          if (pendingRot) {
            pendingRotationRef.current = null
            const store = storeRef.current
            if (store) {
              store.applyRotation(pendingRot, layout)
              scheduleRender()
            }
          }

          const store = storeRef.current
          if (store?.scales?.projection) {
            onZoom?.({
              projection: store.scales.projection,
              zoom: store.currentZoom
            })
          }
        }

        container.addEventListener("pointerdown", onPointerDown)
        container.addEventListener("pointermove", onPointerMove)
        container.addEventListener("pointerup", onPointerUp)
        container.addEventListener("pointercancel", onPointerUp)

        return () => {
          container.removeEventListener("wheel", onWheel)
          container.removeEventListener("dblclick", onDblClick)
          container.removeEventListener("pointerdown", onPointerDown)
          container.removeEventListener("pointermove", onPointerMove)
          container.removeEventListener("pointerup", onPointerUp)
          container.removeEventListener("pointercancel", onPointerUp)
          zoomBehaviorRef.current = null
        }
      }

      // ── Standard pan/zoom mode ──
      const behavior = d3Zoom<HTMLDivElement, unknown>()
        .scaleExtent([minZoom, maxZoom])
        .extent([[0, 0], [size[0], size[1]]])
        .translateExtent([[-Infinity, -Infinity], [Infinity, Infinity]])
        .on("zoom", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
          const transform = event.transform
          zoomTransformRef.current = transform
          isZoomingRef.current = true

          // Re-render projection directly — no CSS transform
          const store = storeRef.current
          if (store) {
            store.applyZoomTransform(transform, layout)
            dirtyRef.current = false
            scheduleRender()
          }
        })
        .on("end", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
          zoomTransformRef.current = event.transform
          isZoomingRef.current = false

          const store = storeRef.current
          if (store?.scales?.projection) {
            onZoom?.({
              projection: store.scales.projection,
              zoom: store.currentZoom
            })
          }
        })

      zoomBehaviorRef.current = behavior
      select(container).call(behavior)

      return () => {
        select(container).on(".zoom", null)
      }
    }, [zoomable, zoomExtent, effectiveDragRotate, size, adjustedWidth, adjustedHeight, margin, onZoom, scheduleRender])

    // ── Tooltip ───────────────────────────────────────────────────────

    const effectiveHoverAnnotation = enableHover && (hoverAnnotation !== false)

    const tooltipRendered = effectiveHoverAnnotation && hoverPoint
      ? (tooltipContent ? tooltipContent(hoverPoint) : <DefaultGeoTooltip data={hoverPoint} />)
      : null

    const tooltipElement = tooltipRendered ? (
      <FlippingTooltip
        x={hoverPoint!.x}
        y={hoverPoint!.y}
        containerWidth={adjustedWidth}
        containerHeight={adjustedHeight}
        margin={margin}
        className="stream-frame-tooltip"
        zIndex={10}
      >
        {tooltipRendered}
      </FlippingTooltip>
    ) : null

    // ── SSR path ──────────────────────────────────────────────────────

    // SSR + actual SSR-hydration only — pure CSR mounts skip the
    // wasted SVG render. See StreamXYFrame for the full rationale.
    if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
      const store = storeRef.current
      if (store && (safeAreas || points || lines)) {
        if (safeAreas) store.setAreas(safeAreas)
        if (points) store.setPoints(safePoints)
        if (lines) store.setLines(safeLines)
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
      }

      const scene = store?.scene ?? []

      return (
        <div
          // Same combined ref both branches use so the responsive
          // observer + container-aware zoom handlers latch from first
          // commit. See `StreamXYFrame.tsx` for the rationale.
          ref={combinedRef}
          className={`stream-geo-frame${className ? ` ${className}` : ""}`}
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Geographic chart")}
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
              {scene.map((node, i) => geoSceneNodeToSVG(node, i))}
            </g>
          </svg>
          <SVGOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={null}
            showAxes={false}
            title={title}
            legend={legend}
            legendPosition={legendPosition}
            legendHoverBehavior={legendHoverBehavior}
            legendClickBehavior={legendClickBehavior}
            legendHighlightedCategory={legendHighlightedCategory}
            legendIsolatedCategories={legendIsolatedCategories}
            foregroundGraphics={resolvedForeground}
            annotations={annotations}
            annotationFrame={0}
            xValues={[]}
            yValues={[]}
            pointNodes={scene.filter(
              (n): n is PointSceneNode => n.type === "point"
            )}
          />
        </div>
      )
    }

    // ── Client render ─────────────────────────────────────────────────

    return (
      <div
        ref={combinedRef}
        className={`stream-geo-frame${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={description || (typeof title === "string" ? title : "Geographic chart")}
        tabIndex={0}
        style={{
          position: "relative",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1],
          overflow: "hidden",
          ...(zoomable ? { touchAction: "none" } : {})
        }}
        onKeyDown={onKeyDown}
      >
        {accessibleTable && <SkipToTableLink tableId={tableId} />}
        {accessibleTable && <AccessibleDataTable scene={storeRef.current?.scene ?? []} chartType="Geographic chart" tableId={tableId} chartTitle={typeof title === "string" ? title : undefined} />}
        <ScreenReaderSummary summary={summary} />
        <div
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Geographic chart")}
          style={{ position: "relative", width: "100%", height: "100%" }}
          onMouseMove={effectiveHoverAnnotation ? onMouseMoveWrapped : undefined}
          onMouseLeave={effectiveHoverAnnotation ? onPointerLeave : undefined}
          onClick={customClickBehavior ? onClick : undefined}
        >
        {resolvedBackground && (
          <svg
            style={{
              position: "absolute",
              left: 0, top: 0,
              width: size[0], height: size[1],
              pointerEvents: "none"
            }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
          </svg>
        )}
        {tileURL && (
          <canvas
            ref={tileCanvasRef}
            style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
          />
        )}
        <canvas
          ref={canvasRef}
          aria-label={computeCanvasAriaLabel(storeRef.current?.scene ?? [], "Geographic chart")}
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        <canvas
          ref={interactionCanvasRef}
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        />
        <AriaLiveTooltip hoverPoint={hoverPoint} />
        <SVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={null}
          showAxes={showAxes ?? false}
          title={title}
          legend={legend}
          legendPosition={legendPosition}
          legendHoverBehavior={legendHoverBehavior}
          legendClickBehavior={legendClickBehavior}
          legendHighlightedCategory={legendHighlightedCategory}
          legendIsolatedCategories={legendIsolatedCategories}
          foregroundGraphics={resolvedForeground}
          annotations={annotations}
          annotationFrame={annotationFrame}
          xValues={[]}
          yValues={[]}
          pointNodes={storeRef.current?.scene.filter(
            (n): n is PointSceneNode => n.type === "point"
          )}
        />
        {staleness?.showBadge && (
          <div
            className="stream-staleness-badge"
            style={{
              position: "absolute",
              ...(staleness.badgePosition === "top-left" ? { top: 4, left: 4 } :
                staleness.badgePosition === "bottom-left" ? { bottom: 4, left: 4 } :
                staleness.badgePosition === "bottom-right" ? { bottom: 4, right: 4 } :
                { top: 4, right: 4 }),
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              pointerEvents: "none",
              background: isStale ? "#dc3545" : "#28a745",
              color: "white"
            }}
          >
            {isStale ? "STALE" : "LIVE"}
          </div>
        )}
        {zoomable && (
          <div
            className="stream-geo-zoom-controls"
            style={{
              position: "absolute",
              bottom: margin.bottom + 8,
              left: margin.left + 8,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              zIndex: 2
            }}
          >
            <button
              type="button"
              aria-label="Zoom in"
              onClick={(e) => {
                e.stopPropagation()
                const container = containerRef.current
                const behavior = zoomBehaviorRef.current
                if (container && behavior?.scaleBy) {
                  behavior.scaleBy(select(container), 1.5)
                }
              }}
              style={zoomButtonStyle}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={(e) => {
                e.stopPropagation()
                const container = containerRef.current
                const behavior = zoomBehaviorRef.current
                if (container && behavior?.scaleBy) {
                  behavior.scaleBy(select(container), 1 / 1.5)
                }
              }}
              style={zoomButtonStyle}
            >
              −
            </button>
          </div>
        )}
        {tileAttribution && (
          <div
            className="stream-geo-tile-attribution"
            style={{
              position: "absolute",
              bottom: margin.bottom + 2,
              right: margin.right + 4,
              fontSize: 10,
              color: "rgba(0,0,0,0.6)",
              background: "rgba(255,255,255,0.7)",
              padding: "1px 4px",
              borderRadius: 2,
              pointerEvents: "none",
              zIndex: 2
            }}
          >
            {tileAttribution}
          </div>
        )}
        <FocusRing
          active={kbFocusIndexRef.current >= 0}
          hoverPoint={hoverPoint}
          margin={margin}
          size={size}
          shape={focusedNavPointRef.current?.shape as "circle" | "rect" | "wedge" | undefined}
          width={focusedNavPointRef.current?.w}
          height={focusedNavPointRef.current?.h}
        />
        {tooltipElement}
        </div>{/* end role="img" */}
      </div>
    )
  }
)

StreamGeoFrame.displayName = "StreamGeoFrame"
export default StreamGeoFrame
