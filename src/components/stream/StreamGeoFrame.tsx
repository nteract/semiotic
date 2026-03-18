"use client"
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
  GeoAreaSceneNode
} from "./geoTypes"
import type { PointSceneNode } from "./types"
import type { HoverData } from "../realtime/types"
import { GeoPipelineStore } from "./GeoPipelineStore"
import type { GeoPipelineConfig } from "./geoTypes"
import { findNearestGeoNode } from "./GeoCanvasHitTester"
import { useResponsiveSize } from "./useResponsiveSize"
import { useStalenessCheck } from "./useStalenessCheck"
import { SVGOverlay } from "./SVGOverlay"
import { isServerEnvironment, geoSceneNodeToSVG } from "./SceneToSVG"
import { AccessibleDataTable, AriaLiveTooltip, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom"
import type { ZoomBehavior, ZoomTransform, D3ZoomEvent } from "d3-zoom"
import { select } from "d3-selection"

// Canvas renderers
import { geoCanvasRenderer } from "./renderers/geoCanvasRenderer"
import { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { TileCache, renderTiles } from "./GeoTileRenderer"
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"
import { GeoParticlePool } from "./GeoParticlePool"
import type { LineSceneNode } from "./types"

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

function DefaultGeoTooltip({ data }: { data: any }) {
  if (!data) return null
  // GeoJSON features: show properties
  if (data.properties) {
    const name = data.properties.name || data.properties.NAME || data.properties.id || "Feature"
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>{name}</div>
      </div>
    )
  }
  // Point data: show first string/number fields
  const entries = Object.entries(data).slice(0, 3)
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
      runtimeMode,

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
      transition,
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
      showAxes,
      accessibleTable
    } = props

    // ── Sizing ────────────────────────────────────────────────────────

    const sizeFromProps: [number, number] = sizeProp || [widthProp || 600, heightProp || 400]
    const [responsiveRef, size] = useResponsiveSize(sizeFromProps, responsiveWidth, responsiveHeight)

    const margin = useMemo(() => ({
      ...DEFAULT_MARGIN,
      ...marginProp
    }), [marginProp])

    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom

    // Resolve dragRotate — defaults to true for orthographic
    const effectiveDragRotate = useMemo(() => {
      if (dragRotateProp != null) return dragRotateProp
      const projName = typeof projection === "string"
        ? projection
        : typeof projection === "object" && "type" in projection
          ? (projection as any).type
          : null
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
      graticule,
      projectionTransform,
      decay,
      pulse,
      transition,
      annotations,
      pointIdAccessor
    }), [
      projection, projectionExtent, fitPadding, xAccessor, yAccessor, lineDataAccessor,
      lineType, flowStyle, areaStyle, pointStyle, lineStyle, colorScheme, graticule,
      projectionTransform, decay, pulse, transition, annotations, pointIdAccessor
    ])

    // ── Store ─────────────────────────────────────────────────────────

    const storeRef = useRef<GeoPipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new GeoPipelineStore(pipelineConfig)
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
    const rafRef = useRef(0)
    const dirtyRef = useRef(true)
    const renderFnRef = useRef<() => void>(() => {})

    // Zoom state
    const zoomBehaviorRef = useRef<ZoomBehavior<Element, unknown> | null>(null)
    const zoomTransformRef = useRef<ZoomTransform>(zoomIdentity)
    const isZoomingRef = useRef(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Drag-rotate state (globe spinning)
    const dragStartRef = useRef<{ x: number; y: number; rotation: [number, number, number] } | null>(null)

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
    const [hoverPoint, setHoverPoint] = useState<any>(null)
    const [annotationFrame, setAnnotationFrame] = useState(0)

    // Staleness
    const [isStale, setIsStale] = useState(false)

    // ── Schedule render ───────────────────────────────────────────────

    const scheduleRender = useCallback(() => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }, [])

    // ── Sync config ───────────────────────────────────────────────────

    useEffect(() => {
      storeRef.current?.updateConfig(pipelineConfig)
      dirtyRef.current = true
      scheduleRender()
    }, [pipelineConfig, scheduleRender])

    // ── Sync bounded data ─────────────────────────────────────────────

    useEffect(() => {
      const store = storeRef.current
      if (!store) return
      if (areas) store.setAreas(areas)
      if (points) store.setPoints(points)
      if (lines) store.setLines(lines)
      dirtyRef.current = true
      scheduleRender()
    }, [areas, points, lines, scheduleRender])

    // ── Push API ──────────────────────────────────────────────────────

    const pushPoint = useCallback((datum: Record<string, any>) => {
      storeRef.current?.pushPoint(datum)
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    const pushMany = useCallback((data: Record<string, any>[]) => {
      storeRef.current?.pushMany(data)
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
            (zoomBehaviorRef.current as any).transform,
            zoomIdentity
          )
        }
      }
    }), [pushPoint, pushMany, clearAll])

    // ── Hover handler ─────────────────────────────────────────────────

    const hoverHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})

    useEffect(() => {
      hoverHandlerRef.current = (e: React.MouseEvent) => {
        if (!enableHover) return
        const store = storeRef.current
        if (!store || !store.scene.length) return

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
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
        const hitCtx = (hitCanvasRef.current as any).getContext("2d")
        if (!hitCtx) return

        const hit = findNearestGeoNode(store.scene, chartX, chartY, 30, hitCtx)

        if (hit) {
          const node = hit.node
          const datum = node.datum
          const rawData = datum?.properties ? datum : (datum?.data || datum)

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
          const hover = {
            ...rawData,
            ...(rawData?.properties || {}),
            data: rawData, x, y, time: 0
          }
          hoverRef.current = hover
          hoveredNodeRef.current = node
          setHoverPoint(hover)
          customHoverBehavior?.({ type: node.type, data: rawData, x, y })
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

    const onMouseMove = useCallback((e: React.MouseEvent) => hoverHandlerRef.current(e), [])

    const onMouseLeave = useCallback(() => {
      hoverRef.current = null
      hoveredNodeRef.current = null
      setHoverPoint(null)
      customHoverBehavior?.(null)
      scheduleRender()
    }, [customHoverBehavior, scheduleRender])

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
      const hitCtx = (hitCanvasRef.current as any).getContext("2d")
      if (!hitCtx) return

      const hit = findNearestGeoNode(store.scene, chartX, chartY, 30, hitCtx)
      if (hit) {
        const datum = hit.node.datum
        const rawData = datum?.properties ? datum : (datum?.data || datum)
        customClickBehavior({ type: hit.node.type, data: rawData, x: chartX, y: chartY })
      }
    }, [customClickBehavior, margin])

    // ── Main render function ──────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = 0
      const canvas = canvasRef.current
      const store = storeRef.current
      if (!canvas || !store) return

      const now = performance.now()
      let needsContinuation = false

      // Advance transition
      const isTransitioning = store.advanceTransition(now)

      // Recompute scene when dirty
      if (dirtyRef.current && !isTransitioning) {
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

      // Background (skip if tiles are rendering — tiles are the background)
      if (background && !tileURL) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, adjustedWidth, adjustedHeight)
      ctx.clip()

      const scene = store.scene
      const scales = store.scales
      const layout = { width: adjustedWidth, height: adjustedHeight }

      geoCanvasRenderer(ctx, scene, scales, layout)
      lineCanvasRenderer(ctx, scene as any, scales as any, layout)
      pointCanvasRenderer(ctx, scene as any, scales as any, layout)

      // ── Geo particles ──
      if (showParticles && particlePoolRef.current) {
        const pool = particlePoolRef.current
        const lineNodes = scene.filter(
          (n): n is LineSceneNode => n.type === "line"
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
              ? pStyle.color(lineNode?.datum)
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
            ictx.beginPath()
            ictx.arc(pn.x, pn.y, pn.r + 3, 0, Math.PI * 2)
            ictx.fillStyle = "rgba(255, 255, 255, 0.4)"
            ictx.fill()
            ictx.strokeStyle = "rgba(0, 0, 0, 0.5)"
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

      setAnnotationFrame(f => f + 1)

      // Reschedule if animating or tiles still loading
      if (isTransitioning || store.hasActivePulses || needsContinuation) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    useEffect(() => {
      scheduleRender()
      return () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
        tileCacheRef.current?.clear()
      }
    }, [scheduleRender])

    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [adjustedWidth, adjustedHeight, background, scheduleRender])

    useStalenessCheck(staleness, storeRef as any, dirtyRef, scheduleRender, isStale, setIsStale)

    // Dev warning: tiles only work with Mercator projection
    useEffect(() => {
      if (process.env.NODE_ENV !== "production" && tileURL) {
        const projName = typeof projection === "string"
          ? projection
          : typeof projection === "object" && "type" in projection
            ? (projection as any).type
            : null
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
            onZoom?.({
              projection: store.scales?.projection!,
              zoom: store.currentZoom
            })
          }
        }

        // Expose a synthetic zoom behavior for the +/- buttons and resetZoom()
        zoomBehaviorRef.current = {
          scaleBy: (_sel: any, factor: number) => applyScale(currentK * factor),
          transform: (_sel: any, t: any) => applyScale(t?.k ?? 1)
        } as any

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

          const store = storeRef.current
          if (store) {
            store.applyRotation(newRotation, layout)
            dirtyRef.current = false
            scheduleRender()
          }
        }

        const onPointerUp = (e: PointerEvent) => {
          if (!dragStartRef.current) return
          dragStartRef.current = null
          container.releasePointerCapture(e.pointerId)

          const store = storeRef.current
          if (store) {
            onZoom?.({
              projection: store.scales?.projection!,
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
      const behavior = d3Zoom()
        .scaleExtent([minZoom, maxZoom])
        .extent([[0, 0], [size[0], size[1]]])
        .translateExtent([[-Infinity, -Infinity], [Infinity, Infinity]])
        .on("zoom", (event: D3ZoomEvent<Element, unknown>) => {
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
        .on("end", (event: D3ZoomEvent<Element, unknown>) => {
          zoomTransformRef.current = event.transform
          isZoomingRef.current = false

          const store = storeRef.current
          if (store) {
            onZoom?.({
              projection: store.scales?.projection!,
              zoom: store.currentZoom
            })
          }
        })

      zoomBehaviorRef.current = behavior
      select(container).call(behavior as any)

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
      <div
        className="stream-frame-tooltip"
        style={{
          position: "absolute",
          left: margin.left + hoverPoint!.x,
          top: margin.top + hoverPoint!.y,
          transform: `translate(${
            hoverPoint!.x > adjustedWidth * 0.7 ? "calc(-100% - 12px)" : "12px"
          }, ${
            hoverPoint!.y < adjustedHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
          })`,
          pointerEvents: "none",
          zIndex: 10
        }}
      >
        {tooltipRendered}
      </div>
    ) : null

    // ── SSR path ──────────────────────────────────────────────────────

    if (isServerEnvironment) {
      const store = storeRef.current
      if (store && (areas || points || lines)) {
        if (areas) store.setAreas(areas)
        if (points) store.setPoints(points)
        if (lines) store.setLines(lines)
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
      }

      const scene = store?.scene ?? []

      return (
        <div
          className={`stream-geo-frame${className ? ` ${className}` : ""}`}
          role="img"
          aria-label={typeof title === "string" ? title : "Geographic chart"}
          style={{ position: "relative", width: size[0], height: size[1] }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size[0]}
            height={size[1]}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {backgroundGraphics}
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
            foregroundGraphics={foregroundGraphics}
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

    // Combine responsive + zoom refs
    const combinedRef = useCallback((el: HTMLDivElement | null) => {
      containerRef.current = el
      // Forward to responsive ref (RefObject)
      if (responsiveRef && typeof responsiveRef === "object") {
        (responsiveRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }
    }, [responsiveRef])

    return (
      <div
        ref={combinedRef}
        className={`stream-geo-frame${className ? ` ${className}` : ""}`}
        role="img"
        aria-label={typeof title === "string" ? title : "Geographic chart"}
        tabIndex={0}
        style={{
          position: "relative",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1],
          overflow: "hidden",
          ...(zoomable ? { touchAction: "none" } : {})
        }}
        onMouseMove={effectiveHoverAnnotation ? onMouseMove : undefined}
        onMouseLeave={effectiveHoverAnnotation ? onMouseLeave : undefined}
        onClick={customClickBehavior ? onClick : undefined}
      >
        {backgroundGraphics && (
          <svg
            style={{
              position: "absolute",
              left: 0, top: 0,
              width: size[0], height: size[1],
              pointerEvents: "none"
            }}
          >
            {backgroundGraphics}
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
        {accessibleTable && <AccessibleDataTable scene={storeRef.current?.scene ?? []} chartType="Geographic chart" />}
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
          foregroundGraphics={foregroundGraphics}
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
                const behavior = zoomBehaviorRef.current as any
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
                const behavior = zoomBehaviorRef.current as any
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
        {tooltipElement}
      </div>
    )
  }
)

StreamGeoFrame.displayName = "StreamGeoFrame"
export default StreamGeoFrame
