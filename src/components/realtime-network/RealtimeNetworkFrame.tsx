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

import { TopologyStore } from "./TopologyStore"
import { ParticlePool } from "./ParticlePool"
import {
  fullSankeyRelayout,
  type SankeyLayoutConfig
} from "./sankeyIncrementalLayout"
import { renderParticles, spawnParticles } from "./renderSankeyCanvas"
import { RenderSankeySVG } from "./renderSankeySVG"
import { DEFAULT_COLORS } from "../charts/shared/colorUtils"
import type {
  RealtimeNetworkFrameProps,
  RealtimeNetworkFrameHandle,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  TensionConfig,
  DEFAULT_TENSION_CONFIG
} from "./types"
import {
  DEFAULT_TENSION_CONFIG as TENSION_DEFAULTS,
  DEFAULT_PARTICLE_STYLE
} from "./types"

const DEFAULT_MARGIN = { top: 20, right: 80, bottom: 20, left: 80 }
const DEFAULT_SIZE: [number, number] = [800, 600]

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

/**
 * RealtimeNetworkFrame — Core frame for streaming network visualizations.
 *
 * Architecture:
 * - SVG underneath for static structure (nodes, link bands, labels) + hover
 * - Canvas on top for high-performance particle animation (pointerEvents: none)
 * - Tooltip div on top of both
 *
 * Push API via ref: push({ source, target, value })
 */
const RealtimeNetworkFrame = forwardRef<RealtimeNetworkFrameHandle, RealtimeNetworkFrameProps>(
  function RealtimeNetworkFrame(props, ref) {
    const {
      initialEdges,
      size = DEFAULT_SIZE,
      margin: marginProp,
      orientation = "horizontal",
      nodeAlign = "justify",
      nodePaddingRatio = 0.05,
      nodeWidth = 15,
      tensionConfig: tensionConfigProp,
      showParticles = true,
      particleStyle: particleStyleProp,
      colorBy,
      colorScheme = "category10",
      edgeColorBy = "source",
      edgeOpacity = 0.5,
      nodeLabel,
      showLabels = true,
      enableHover = true,
      tooltipContent,
      onTopologyChange,
      background,
      className
    } = props

    const margin = { ...DEFAULT_MARGIN, ...marginProp }
    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom
    const direction = orientation === "vertical" ? "down" : "right"

    const tensionConfig: TensionConfig = useMemo(
      () => ({ ...TENSION_DEFAULTS, ...tensionConfigProp }),
      [tensionConfigProp]
    )

    const particleStyle = useMemo(
      () => ({ ...DEFAULT_PARTICLE_STYLE, ...particleStyleProp }),
      [particleStyleProp]
    )

    // ── Refs ──────────────────────────────────────────────────────────────

    const storeRef = useRef(new TopologyStore(tensionConfig))
    const poolRef = useRef(new ParticlePool(2000))
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef(0)
    const lastFrameTimeRef = useRef(0)
    const layoutVersionRef = useRef(0)

    // Track transition animation (targets stored on nodes/edges as _target* fields)
    const transitionRef = useRef<{
      startTime: number
      duration: number
    } | null>(null)

    // ── State ─────────────────────────────────────────────────────────────

    const [layoutVersion, setLayoutVersion] = useState(0)
    const [hoverData, setHoverData] = useState<{
      type: "node" | "edge"
      data: any
      x: number
      y: number
    } | null>(null)

    // ── Color functions ───────────────────────────────────────────────────

    const nodeColorMap = useRef(new Map<string, string>())
    let colorIndex = useRef(0)

    const getNodeColor = useCallback((node: RealtimeNode): string => {
      if (typeof colorBy === "function") return colorBy(node)
      if (typeof colorBy === "string" && node.data) {
        const val = node.data[colorBy]
        if (val !== undefined) {
          if (!nodeColorMap.current.has(String(val))) {
            const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
            nodeColorMap.current.set(
              String(val),
              colors[colorIndex.current++ % colors.length]
            )
          }
          return nodeColorMap.current.get(String(val))!
        }
      }
      // Default: assign color by node ID
      if (!nodeColorMap.current.has(node.id)) {
        const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
        nodeColorMap.current.set(
          node.id,
          colors[colorIndex.current++ % colors.length]
        )
      }
      return nodeColorMap.current.get(node.id)!
    }, [colorBy, colorScheme])

    const getEdgeColor = useCallback((edge: RealtimeEdge): string => {
      if (typeof edgeColorBy === "function") return edgeColorBy(edge)
      const sourceNode = typeof edge.source === "object" ? edge.source : null
      const targetNode = typeof edge.target === "object" ? edge.target : null

      if (edgeColorBy === "target" && targetNode) {
        return getNodeColor(targetNode)
      }
      if (sourceNode) {
        return getNodeColor(sourceNode)
      }
      return "#999"
    }, [edgeColorBy, getNodeColor])

    // ── Label function ────────────────────────────────────────────────────

    const labelFn = useMemo(() => {
      if (!showLabels) return null
      if (typeof nodeLabel === "function") return nodeLabel
      if (typeof nodeLabel === "string") return (n: RealtimeNode) => (n as any)[nodeLabel] || n.id
      return (n: RealtimeNode) => n.id
    }, [showLabels, nodeLabel])

    // ── Layout config ─────────────────────────────────────────────────────

    const layoutConfig = useMemo<SankeyLayoutConfig>(() => ({
      orient: nodeAlign,
      direction: direction as "right" | "down",
      iterations: 100,
      nodePaddingRatio,
      nodeWidth,
      size: [adjustedWidth, adjustedHeight]
    }), [nodeAlign, direction, nodePaddingRatio, nodeWidth, adjustedWidth, adjustedHeight])

    // ── Layout execution ──────────────────────────────────────────────────

    const runLayout = useCallback(() => {
      const store = storeRef.current

      store.prepareForRelayout()
      fullSankeyRelayout(store, layoutConfig)
      store.finalizeLayout(direction)

      // Save target positions from the relayout result
      for (const node of store.nodes.values()) {
        node._targetX0 = node.x0
        node._targetX1 = node.x1
        node._targetY0 = node.y0
        node._targetY1 = node.y1
      }
      for (const edge of store.edges.values()) {
        edge._targetY0 = edge.y0
        edge._targetY1 = edge.y1
        edge._targetSankeyWidth = edge.sankeyWidth
      }

      // Check if we have meaningful previous positions to animate from
      const hasOldPositions = Array.from(store.nodes.values()).some(
        (n) => n._prevX0 !== undefined && (n._prevX0 !== 0 || n._prevX1 !== 0 || n._prevY0 !== 0 || n._prevY1 !== 0)
      )

      if (hasOldPositions && tensionConfig.transitionDuration > 0) {
        // Reset positions to previous (start of transition)
        for (const node of store.nodes.values()) {
          if (node._prevX0 !== undefined && (node._prevX0 !== 0 || node._prevX1 !== 0)) {
            node.x0 = node._prevX0
            node.x1 = node._prevX1!
            node.y0 = node._prevY0!
            node.y1 = node._prevY1!
          }
          // New nodes (prev = 0,0,0,0) keep their target positions
        }
        for (const edge of store.edges.values()) {
          if (edge._prevY0 !== undefined && edge._prevSankeyWidth !== undefined && edge._prevSankeyWidth > 0) {
            edge.y0 = edge._prevY0
            edge.y1 = edge._prevY1!
            edge.sankeyWidth = edge._prevSankeyWidth
          }
        }
        store.rebuildAllBeziers(direction)

        // Start transition animation
        transitionRef.current = {
          startTime: performance.now(),
          duration: tensionConfig.transitionDuration
        }
      }

      layoutVersionRef.current = store.layoutVersion
      setLayoutVersion(store.layoutVersion)

      if (onTopologyChange) {
        const { nodes, edges } = store.getLayoutData()
        onTopologyChange(nodes, edges)
      }
    }, [layoutConfig, direction, onTopologyChange, tensionConfig])

    // ── Push API ──────────────────────────────────────────────────────────

    const pushEdge = useCallback((edge: EdgePush) => {
      const store = storeRef.current
      const needsRelayout = store.ingestEdge(edge)

      if (needsRelayout) {
        runLayout()
      }
    }, [runLayout])

    const pushManyEdges = useCallback((edges: EdgePush[]) => {
      const store = storeRef.current
      let needsRelayout = false

      for (const edge of edges) {
        if (store.ingestEdge(edge)) {
          needsRelayout = true
        }
      }

      if (needsRelayout) {
        runLayout()
      }
    }, [runLayout])

    const clearAll = useCallback(() => {
      storeRef.current.clear()
      poolRef.current.clear()
      nodeColorMap.current.clear()
      colorIndex.current = 0
      transitionRef.current = null
      setLayoutVersion(0)
      setHoverData(null)
    }, [])

    const forceRelayout = useCallback(() => {
      storeRef.current.tension = storeRef.current.tension + 999
      runLayout()
    }, [runLayout])

    // ── Imperative handle ─────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      push: pushEdge,
      pushMany: pushManyEdges,
      clear: clearAll,
      getTopology: () => storeRef.current.getLayoutData(),
      relayout: forceRelayout,
      getTension: () => storeRef.current.tension
    }), [pushEdge, pushManyEdges, clearAll, forceRelayout])

    // ── Initial data ──────────────────────────────────────────────────────

    useEffect(() => {
      if (initialEdges && initialEdges.length > 0) {
        pushManyEdges(initialEdges)
      }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Canvas rAF loop for particles ─────────────────────────────────────

    const renderCanvasRef = useRef<() => void>(() => {})

    renderCanvasRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const now = performance.now()
      const deltaTime = lastFrameTimeRef.current
        ? Math.min((now - lastFrameTimeRef.current) / 1000, 0.1) // Cap at 100ms
        : 0.016
      lastFrameTimeRef.current = now

      const store = storeRef.current
      const pool = poolRef.current

      // ── Transition animation ──────────────────────────────────────────
      const transition = transitionRef.current
      if (transition) {
        const elapsed = now - transition.startTime
        const rawT = Math.min(elapsed / transition.duration, 1)
        // Ease-out cubic for smooth deceleration
        const t = 1 - Math.pow(1 - rawT, 3)

        for (const node of store.nodes.values()) {
          if (node._targetX0 !== undefined && node._prevX0 !== undefined &&
              (node._prevX0 !== 0 || node._prevX1 !== 0)) {
            node.x0 = node._prevX0 + (node._targetX0 - node._prevX0) * t
            node.x1 = node._prevX1! + (node._targetX1! - node._prevX1!) * t
            node.y0 = node._prevY0! + (node._targetY0! - node._prevY0!) * t
            node.y1 = node._prevY1! + (node._targetY1! - node._prevY1!) * t
          }
        }

        for (const edge of store.edges.values()) {
          if (edge._targetY0 !== undefined && edge._prevY0 !== undefined &&
              edge._prevSankeyWidth !== undefined && edge._prevSankeyWidth > 0) {
            edge.y0 = edge._prevY0 + (edge._targetY0 - edge._prevY0) * t
            edge.y1 = edge._prevY1! + (edge._targetY1! - edge._prevY1!) * t
            edge.sankeyWidth = edge._prevSankeyWidth + (edge._targetSankeyWidth! - edge._prevSankeyWidth) * t
          }
        }

        store.rebuildAllBeziers(direction)

        // Trigger SVG re-render during transition
        setLayoutVersion((v) => v + 0.001)

        if (rawT >= 1) {
          // Snap to final target positions
          for (const node of store.nodes.values()) {
            if (node._targetX0 !== undefined) {
              node.x0 = node._targetX0
              node.x1 = node._targetX1!
              node.y0 = node._targetY0!
              node.y1 = node._targetY1!
            }
          }
          for (const edge of store.edges.values()) {
            if (edge._targetY0 !== undefined) {
              edge.y0 = edge._targetY0
              edge.y1 = edge._targetY1!
              edge.sankeyWidth = edge._targetSankeyWidth!
            }
          }
          store.rebuildAllBeziers(direction)
          transitionRef.current = null
        }
      }

      const edges = Array.from(store.edges.values())

      // DPR handling
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      canvas.width = size[0] * dpr
      canvas.height = size[1] * dpr
      canvas.style.width = `${size[0]}px`
      canvas.style.height = `${size[1]}px`
      ctx.scale(dpr, dpr)
      ctx.translate(margin.left, margin.top)
      ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

      if (showParticles && edges.length > 0) {
        // Spawn new particles
        spawnParticles(pool, edges, deltaTime, particleStyle)

        // Advance particles
        const speed = (particleStyle.speedMultiplier ?? 1) * 0.5
        pool.step(deltaTime, speed, edges)

        // Render particles
        renderParticles(ctx, pool, edges, particleStyle, getEdgeColor)
      }

      // Schedule next frame
      rafRef.current = requestAnimationFrame(() => renderCanvasRef.current())
    }

    useEffect(() => {
      rafRef.current = requestAnimationFrame(() => renderCanvasRef.current())
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-render when layout version changes so particles use updated beziers
    useEffect(() => {
      // Force a canvas render on layout change
    }, [layoutVersion])

    // ── Hover handlers ────────────────────────────────────────────────────

    const handleNodeHover = useCallback(
      (node: RealtimeNode | null, event: React.MouseEvent) => {
        if (!enableHover) return
        if (!node) {
          setHoverData(null)
          return
        }
        const rect = (event.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect()
        if (!rect) return
        setHoverData({
          type: "node",
          data: node,
          x: node.x,
          y: node.y0
        })
      },
      [enableHover]
    )

    const handleEdgeHover = useCallback(
      (edge: RealtimeEdge | null, event: React.MouseEvent) => {
        if (!enableHover) return
        if (!edge) {
          setHoverData(null)
          return
        }
        setHoverData({
          type: "edge",
          data: edge,
          x: ((typeof edge.source === "object" ? edge.source.x1 : 0) +
            (typeof edge.target === "object" ? edge.target.x0 : 0)) / 2,
          y: (edge.y0 + edge.y1) / 2
        })
      },
      [enableHover]
    )

    // ── Get current topology for SVG rendering ────────────────────────────

    const { nodes, edges } = storeRef.current.getLayoutData()

    // ── Tooltip ───────────────────────────────────────────────────────────

    const tooltipElement = enableHover && hoverData ? (
      <div
        className="realtime-sankey-tooltip"
        style={{
          position: "absolute",
          left: margin.left + hoverData.x,
          top: margin.top + hoverData.y,
          transform: `translate(${
            hoverData.x > adjustedWidth * 0.6 ? "calc(-100% - 12px)" : "12px"
          }, ${
            hoverData.y < adjustedHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
          })`,
          pointerEvents: "none",
          zIndex: 2
        }}
      >
        {tooltipContent
          ? tooltipContent(hoverData)
          : <DefaultTooltip data={hoverData} />}
      </div>
    ) : null

    return (
      <div
        className={`realtime-network-frame${className ? ` ${className}` : ""}`}
        style={{
          position: "relative",
          width: size[0],
          height: size[1]
        }}
      >
        {/* SVG structure layer (underneath) */}
        <svg
          width={size[0]}
          height={size[1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0
          }}
        >
          {background && (
            <rect
              x={margin.left}
              y={margin.top}
              width={adjustedWidth}
              height={adjustedHeight}
              fill={background}
            />
          )}
          <g transform={`translate(${margin.left},${margin.top})`}>
            <RenderSankeySVG
              nodes={nodes}
              edges={edges}
              width={adjustedWidth}
              height={adjustedHeight}
              nodeColorFn={getNodeColor}
              edgeColorFn={getEdgeColor}
              edgeOpacity={edgeOpacity}
              labelFn={labelFn}
              showLabels={showLabels}
              direction={direction}
              onNodeHover={enableHover ? handleNodeHover : undefined}
              onEdgeHover={enableHover ? handleEdgeHover : undefined}
            />
          </g>
        </svg>

        {/* Canvas particle layer (on top, no pointer events) */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none"
          }}
        />

        {/* Tooltip */}
        {tooltipElement}
      </div>
    )
  }
)

function DefaultTooltip({ data }: { data: { type: "node" | "edge"; data: any } }) {
  if (data.type === "edge") {
    const edge = data.data as RealtimeEdge
    const sourceId = typeof edge.source === "object" ? edge.source.id : edge.source
    const targetId = typeof edge.target === "object" ? edge.target.id : edge.target
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>{sourceId} → {targetId}</div>
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Value: {typeof edge.value === "number" ? edge.value.toLocaleString() : String(edge.value)}
        </div>
      </div>
    )
  }

  const node = data.data as RealtimeNode
  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600 }}>{node.id}</div>
      {node.value != null && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Total: {typeof node.value === "number" ? node.value.toLocaleString() : String(node.value)}
        </div>
      )}
    </div>
  )
}

export default RealtimeNetworkFrame
