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
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkChartType,
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  ParticleStyle,
  ThresholdAlertConfig
} from "./networkTypes"
import {
  DEFAULT_TENSION_CONFIG,
  DEFAULT_PARTICLE_STYLE
} from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import {
  findNearestNetworkNode,
  type NetworkHitResult
} from "./NetworkCanvasHitTester"
import { extractNetworkNavPoints, nextIndex, navPointToHover } from "./keyboardNav"
import { useResponsiveSize } from "./useResponsiveSize"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"

// Canvas renderers
import { networkRectRenderer } from "./renderers/networkRectRenderer"
import { networkCircleRenderer } from "./renderers/networkCircleRenderer"
import { networkArcRenderer } from "./renderers/networkArcRenderer"
import { networkEdgeRenderer } from "./renderers/networkEdgeRenderer"
import {
  renderNetworkParticles,
  spawnNetworkParticles
} from "./renderers/networkParticleRenderer"
import { DEFAULT_COLORS } from "../charts/shared/colorUtils"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 80, bottom: 20, left: 80 }
const CENTERED_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 }
const CENTERED_TYPES = new Set(["chord", "force", "circlepack"])
const DEFAULT_SIZE: [number, number] = [800, 600]

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

function DefaultNetworkTooltip({
  data
}: {
  data: { type: "node" | "edge"; data: any }
}) {
  if (data.type === "edge") {
    const edge = data.data
    const sourceId =
      typeof edge.source === "object" ? edge.source.id : edge.source
    const targetId =
      typeof edge.target === "object" ? edge.target.id : edge.target
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>
          {sourceId} → {targetId}
        </div>
        {edge.value != null && (
          <div style={{ marginTop: 4, opacity: 0.8 }}>
            Value:{" "}
            {typeof edge.value === "number"
              ? edge.value.toLocaleString()
              : String(edge.value)}
          </div>
        )}
      </div>
    )
  }

  const node = data.data

  // Hierarchy nodes have a __hierarchyNode with a .parent chain.
  // Show ancestor breadcrumb: grandparent → parent → **node**
  const hNode = node?.__hierarchyNode
  if (hNode) {
    const ancestors: string[] = []
    let cur = hNode
    while (cur) {
      const name = cur.data?.name ?? cur.data?.id ?? node.id
      if (name != null) ancestors.unshift(String(name))
      cur = cur.parent
    }
    // Drop root (first entry) from the breadcrumb — it's usually unnamed
    if (ancestors.length > 1) ancestors.shift()

    const last = ancestors.length - 1
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div>
          {ancestors.map((name, i) => (
            <span key={i}>
              {i > 0 && (
                <span style={{ margin: "0 3px", opacity: 0.5 }}>{" → "}</span>
              )}
              {i === last ? (
                <strong>{name}</strong>
              ) : (
                <span style={{ opacity: 0.7 }}>{name}</span>
              )}
            </span>
          ))}
        </div>
        {node.value != null && node.value > 0 && (
          <div style={{ marginTop: 4, opacity: 0.8 }}>
            {typeof node.value === "number"
              ? node.value.toLocaleString()
              : String(node.value)}
          </div>
        )}
      </div>
    )
  }

  // Compute degree centrality from source/target links
  const degree = (node.sourceLinks?.length || 0) + (node.targetLinks?.length || 0)
  const weightedDegree = (node.sourceLinks || []).reduce((s: number, e: any) => s + (e.value || 0), 0)
    + (node.targetLinks || []).reduce((s: number, e: any) => s + (e.value || 0), 0)

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600 }}>{node.id}</div>
      {node.value != null && node.value > 0 && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Total:{" "}
          {typeof node.value === "number"
            ? node.value.toLocaleString()
            : String(node.value)}
        </div>
      )}
      {degree > 0 && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Connections: {degree}
          {weightedDegree !== degree && ` (weighted: ${weightedDegree.toLocaleString()})`}
        </div>
      )}
    </div>
  )
}

// ── StreamNetworkFrame ─────────────────────────────────────────────────

const StreamNetworkFrame = forwardRef<
  StreamNetworkFrameHandle,
  StreamNetworkFrameProps
>(function StreamNetworkFrame(props, ref) {
  const {
    chartType,
    nodes: nodesProp,
    edges: edgesProp,
    data: dataProp,
    initialEdges,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    childrenAccessor,
    hierarchySum,
    orientation = "horizontal",
    nodeAlign = "justify",
    nodePaddingRatio = 0.05,
    nodeWidth = 15,
    iterations = 300,
    forceStrength = 0.1,
    padAngle = 0.01,
    groupWidth = 20,
    sortGroups,
    edgeSort,
    treeOrientation = "vertical",
    edgeType = "curve",
    padding,
    paddingTop,
    tensionConfig: tensionConfigProp,
    showParticles = false,
    particleStyle: particleStyleProp,
    nodeStyle,
    edgeStyle,
    colorBy,
    colorScheme = "category10",
    edgeColorBy = "source",
    edgeOpacity = 0.5,
    colorByDepth = false,
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    nodeLabel,
    showLabels = true,
    size: sizeProp = DEFAULT_SIZE,
    responsiveWidth,
    responsiveHeight,
    margin: marginProp,
    className,
    background,
    enableHover = true,
    tooltipContent,
    customHoverBehavior: customHoverBehaviorProp,
    customClickBehavior: customClickBehaviorProp,
    onObservation,
    chartId,
    onTopologyChange,
    annotations,
    svgAnnotationRules,
    legend,
    title,
    foregroundGraphics,
    backgroundGraphics,
    decay,
    pulse,
    staleness,
    thresholds
  } = props

  const baseMargin = CENTERED_TYPES.has(chartType) ? CENTERED_MARGIN : DEFAULT_MARGIN
  const [responsiveRef, size] = useResponsiveSize(sizeProp, responsiveWidth, responsiveHeight)
  const margin = { ...baseMargin, ...marginProp }
  const adjustedWidth = size[0] - margin.left - margin.right
  const adjustedHeight = size[1] - margin.top - margin.bottom

  const tensionConfig = useMemo(
    () => ({ ...DEFAULT_TENSION_CONFIG, ...tensionConfigProp }),
    [tensionConfigProp]
  )

  const particleStyle = useMemo(
    () => ({ ...DEFAULT_PARTICLE_STYLE, ...particleStyleProp }),
    [particleStyleProp]
  )

  // ── Pipeline config ──────────────────────────────────────────────────

  const pipelineConfig = useMemo(
    (): NetworkPipelineConfig => ({
      chartType,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      valueAccessor,
      childrenAccessor,
      hierarchySum,
      orientation,
      nodeAlign,
      nodePaddingRatio,
      nodeWidth,
      iterations,
      forceStrength,
      padAngle,
      groupWidth,
      sortGroups,
      edgeSort,
      treeOrientation,
      edgeType,
      padding,
      paddingTop,
      tensionConfig,
      showParticles,
      particleStyle,
      nodeStyle,
      edgeStyle,
      nodeLabel,
      showLabels,
      colorBy,
      colorScheme,
      edgeColorBy,
      edgeOpacity,
      colorByDepth,
      nodeSize,
      nodeSizeRange,
      decay,
      pulse,
      staleness,
      thresholds
    }),
    [
      chartType,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      valueAccessor,
      childrenAccessor,
      hierarchySum,
      orientation,
      nodeAlign,
      nodePaddingRatio,
      nodeWidth,
      iterations,
      forceStrength,
      padAngle,
      groupWidth,
      sortGroups,
      edgeSort,
      treeOrientation,
      edgeType,
      padding,
      paddingTop,
      tensionConfig,
      showParticles,
      particleStyle,
      nodeStyle,
      edgeStyle,
      nodeLabel,
      showLabels,
      colorBy,
      colorScheme,
      edgeColorBy,
      edgeOpacity,
      colorByDepth,
      nodeSize,
      nodeSizeRange,
      decay,
      pulse,
      staleness,
      thresholds
    ]
  )

  // ── Refs ─────────────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const dirtyRef = useRef(true)
  const renderFnRef = useRef<() => void>(() => {})

  // ── Store ────────────────────────────────────────────────────────────

  const storeRef = useRef<NetworkPipelineStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = new NetworkPipelineStore(pipelineConfig)
  }

  // ── State ────────────────────────────────────────────────────────────

  const [hoverData, setHoverData] = useState<{
    type: "node" | "edge"
    data: any
    x: number
    y: number
  } | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [annotationFrame, setAnnotationFrame] = useState(0)
  const [isStale, setIsStale] = useState(false)

  const hoverRef = useRef<typeof hoverData>(null)

  // ── Color functions ──────────────────────────────────────────────────

  const nodeColorMap = useRef(new Map<string, string>())
  const colorIndexRef = useRef(0)

  const getNodeColor = useCallback(
    (node: RealtimeNode): string => {
      if (typeof colorBy === "function") return colorBy(node)
      if (typeof colorBy === "string" && node.data) {
        const val = node.data[colorBy]
        if (val !== undefined) {
          if (!nodeColorMap.current.has(String(val))) {
            const colors = Array.isArray(colorScheme)
              ? colorScheme
              : DEFAULT_COLORS
            nodeColorMap.current.set(
              String(val),
              colors[colorIndexRef.current++ % colors.length]
            )
          }
          return nodeColorMap.current.get(String(val))!
        }
      }
      if (!nodeColorMap.current.has(node.id)) {
        const colors = Array.isArray(colorScheme)
          ? colorScheme
          : DEFAULT_COLORS
        nodeColorMap.current.set(
          node.id,
          colors[colorIndexRef.current++ % colors.length]
        )
      }
      return nodeColorMap.current.get(node.id)!
    },
    [colorBy, colorScheme]
  )

  const getEdgeColor = useCallback(
    (edge: RealtimeEdge): string => {
      if (typeof edgeColorBy === "function") return edgeColorBy(edge)
      const sourceNode =
        typeof edge.source === "object" ? edge.source : null
      const targetNode =
        typeof edge.target === "object" ? edge.target : null

      if (edgeColorBy === "target" && targetNode) {
        return getNodeColor(targetNode)
      }
      if (sourceNode) {
        return getNodeColor(sourceNode)
      }
      return "#999"
    },
    [edgeColorBy, getNodeColor]
  )

  const getParticleColor = useCallback(
    (edge: RealtimeEdge): string => {
      // When the user hasn't explicitly set particleStyle.colorBy,
      // inherit the edge color so particles match their edge's fill.
      if (!particleStyleProp?.colorBy) {
        return getEdgeColor(edge)
      }
      const colorByMode = particleStyle.colorBy!
      const sourceNode = typeof edge.source === "object" ? edge.source : null
      const targetNode = typeof edge.target === "object" ? edge.target : null

      if (colorByMode === "target" && targetNode) {
        return getNodeColor(targetNode)
      }
      if (sourceNode) {
        return getNodeColor(sourceNode)
      }
      return "#999"
    },
    [particleStyleProp?.colorBy, particleStyle.colorBy, getNodeColor, getEdgeColor]
  )

  // ── Stable scheduleRender ────────────────────────────────────────────

  const isContinuous =
    (chartType === "sankey" && showParticles) || !!pulse

  const scheduleRender = useCallback(() => {
    if (rafRef.current && !isContinuous) return
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }
  }, [isContinuous])

  // Update config when props change
  useEffect(() => {
    storeRef.current?.updateConfig(pipelineConfig)
    dirtyRef.current = true
    scheduleRender()
  }, [pipelineConfig, scheduleRender])

  // ── Layout execution ─────────────────────────────────────────────────

  const runLayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return

    store.runLayout([adjustedWidth, adjustedHeight])
    store.buildScene([adjustedWidth, adjustedHeight])
    dirtyRef.current = true

    // Sync the component's node color map with the scene builder's
    // color assignments. The scene builder (layout plugin) assigns
    // node colors by iteration order, while this component's
    // getNodeColor assigns lazily. Without syncing, particle colors
    // diverge from the rendered edge band colors.
    // We only ADD missing entries (never overwrite) so that existing
    // streaming color assignments remain stable.
    const colors = Array.isArray(colorScheme)
      ? colorScheme
      : DEFAULT_COLORS
    const layoutNodes = Array.from(store.nodes.values())
    for (let i = 0; i < layoutNodes.length; i++) {
      const node = layoutNodes[i]
      if (!nodeColorMap.current.has(node.id)) {
        nodeColorMap.current.set(node.id, colors[i % colors.length])
      }
    }
    colorIndexRef.current = layoutNodes.length

    setLayoutVersion(store.layoutVersion)

    if (onTopologyChange) {
      const { nodes, edges } = store.getLayoutData()
      onTopologyChange(nodes, edges)
    }
  }, [adjustedWidth, adjustedHeight, onTopologyChange, colorScheme])

  // ── Push API ─────────────────────────────────────────────────────────

  const pushEdge = useCallback(
    (edge: EdgePush) => {
      const store = storeRef.current
      if (!store) return
      const needsRelayout = store.ingestEdge(edge)
      if (needsRelayout) {
        runLayout()
      }
      scheduleRender()
    },
    [runLayout, scheduleRender]
  )

  const pushManyEdges = useCallback(
    (edges: EdgePush[]) => {
      const store = storeRef.current
      if (!store) return
      let needsRelayout = false
      for (const edge of edges) {
        if (store.ingestEdge(edge)) {
          needsRelayout = true
        }
      }
      if (needsRelayout) {
        runLayout()
      }
      scheduleRender()
    },
    [runLayout, scheduleRender]
  )

  const clearAll = useCallback(() => {
    storeRef.current?.clear()
    nodeColorMap.current.clear()
    colorIndexRef.current = 0
    setLayoutVersion(0)
    setHoverData(null)
    hoverRef.current = null
    dirtyRef.current = true
    scheduleRender()
  }, [scheduleRender])

  const forceRelayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    store.tension += 999
    runLayout()
    scheduleRender()
  }, [runLayout, scheduleRender])

  useImperativeHandle(
    ref,
    () => ({
      push: pushEdge,
      pushMany: pushManyEdges,
      clear: clearAll,
      getTopology: () =>
        storeRef.current?.getLayoutData() ?? { nodes: [], edges: [] },
      getTopologyDiff: () => {
        const store = storeRef.current
        if (!store) return { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [] }
        return {
          addedNodes: Array.from(store.addedNodes),
          removedNodes: Array.from(store.removedNodes),
          addedEdges: Array.from(store.addedEdges),
          removedEdges: Array.from(store.removedEdges),
        }
      },
      relayout: forceRelayout,
      getTension: () => storeRef.current?.tension ?? 0
    }),
    [pushEdge, pushManyEdges, clearAll, forceRelayout]
  )

  // ── Bounded data ingestion ───────────────────────────────────────────

  // Determine if this is a hierarchical chart type
  const isHierarchical = ["tree", "cluster", "treemap", "circlepack", "partition"].includes(chartType)
  // Resolve hierarchy root: `data` prop or single-object `edges` prop
  const hierarchyRoot = isHierarchical ? (dataProp || (!Array.isArray(edgesProp) ? edgesProp : undefined)) : undefined

  useEffect(() => {
    const store = storeRef.current
    if (!store) return

    if (isHierarchical && hierarchyRoot) {
      // Hierarchy data: single root object
      store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight])
      store.buildScene([adjustedWidth, adjustedHeight])
      dirtyRef.current = true
      scheduleRender()
    } else {
      // Graph data: nodes + edges arrays
      const rawNodes = nodesProp || []
      const rawEdges = Array.isArray(edgesProp) ? edgesProp : []

      if (rawNodes.length === 0 && rawEdges.length === 0) return

      store.ingestBounded(rawNodes, rawEdges, [adjustedWidth, adjustedHeight])
      store.buildScene([adjustedWidth, adjustedHeight])

      // Sync component node color map (same logic as runLayout sync)
      const colors = Array.isArray(colorScheme)
        ? colorScheme
        : DEFAULT_COLORS
      const layoutNodes = Array.from(store.nodes.values())
      for (let i = 0; i < layoutNodes.length; i++) {
        const node = layoutNodes[i]
        if (!nodeColorMap.current.has(node.id)) {
          nodeColorMap.current.set(node.id, colors[i % colors.length])
        }
      }
      colorIndexRef.current = layoutNodes.length

      dirtyRef.current = true
      scheduleRender()
    }
  }, [nodesProp, edgesProp, dataProp, hierarchyRoot, isHierarchical, adjustedWidth, adjustedHeight, pipelineConfig, scheduleRender, colorScheme])

  // ── Initial streaming data ───────────────────────────────────────────

  useEffect(() => {
    if (initialEdges && initialEdges.length > 0) {
      pushManyEdges(initialEdges)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Observation wrappers ─────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: { type: "node" | "edge"; data: any; x: number; y: number } | null) => {
      if (customHoverBehaviorProp) customHoverBehaviorProp(d)
      if (onObservation) {
        const now = Date.now()
        if (d) {
          onObservation({ type: "hover", datum: d.data || {}, x: d.x, y: d.y, timestamp: now, chartType: "StreamNetworkFrame", chartId })
        } else {
          onObservation({ type: "hover-end", timestamp: now, chartType: "StreamNetworkFrame", chartId })
        }
      }
    },
    [customHoverBehaviorProp, onObservation, chartId]
  )

  const customClickBehavior = useCallback(
    (d: { type: "node" | "edge"; data: any; x: number; y: number } | null) => {
      if (customClickBehaviorProp) customClickBehaviorProp(d)
      if (onObservation) {
        const now = Date.now()
        if (d) {
          onObservation({ type: "click", datum: d.data || {}, x: d.x, y: d.y, timestamp: now, chartType: "StreamNetworkFrame", chartId })
        } else {
          onObservation({ type: "click-end", timestamp: now, chartType: "StreamNetworkFrame", chartId })
        }
      }
    },
    [customClickBehaviorProp, onObservation, chartId]
  )

  // ── Hover handlers ───────────────────────────────────────────────────

  const hoverHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})
  const hoverLeaveRef = useRef<() => void>(() => {})

  hoverHandlerRef.current = (e: React.MouseEvent) => {
    if (!enableHover) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const chartX = e.clientX - rect.left - margin.left
    const chartY = e.clientY - rect.top - margin.top

    if (
      chartX < 0 ||
      chartX > adjustedWidth ||
      chartY < 0 ||
      chartY > adjustedHeight
    ) {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverData(null)
        if (customHoverBehavior) { customHoverBehavior(null); dirtyRef.current = true }
        scheduleRender()
      }
      return
    }

    const store = storeRef.current
    if (!store) return

    const hit = findNearestNetworkNode(
      store.sceneNodes,
      store.sceneEdges,
      chartX,
      chartY
    )

    if (!hit) {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverData(null)
        if (customHoverBehavior) { customHoverBehavior(null); dirtyRef.current = true }
        scheduleRender()
      }
      return
    }

    const hover = {
      type: hit.type,
      data: hit.datum,
      x: hit.x,
      y: hit.y
    }

    hoverRef.current = hover
    setHoverData(hover)
    if (customHoverBehavior) { customHoverBehavior(hover); dirtyRef.current = true }
    scheduleRender()
  }

  hoverLeaveRef.current = () => {
    if (hoverRef.current) {
      hoverRef.current = null
      setHoverData(null)
      if (customHoverBehavior) { customHoverBehavior(null); dirtyRef.current = true }
      scheduleRender()
    }
  }

  // ── Click handler ────────────────────────────────────────────────────

  const clickHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})

  clickHandlerRef.current = (e: React.MouseEvent) => {
    if (!customClickBehaviorProp && !onObservation) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const chartX = e.clientX - rect.left - margin.left
    const chartY = e.clientY - rect.top - margin.top

    if (
      chartX < 0 ||
      chartX > adjustedWidth ||
      chartY < 0 ||
      chartY > adjustedHeight
    ) {
      return
    }

    const store = storeRef.current
    if (!store) return

    const hit = findNearestNetworkNode(
      store.sceneNodes,
      store.sceneEdges,
      chartX,
      chartY
    )

    if (hit) {
      customClickBehavior({
        type: hit.type,
        data: hit.datum,
        x: hit.x,
        y: hit.y
      })
    } else {
      customClickBehavior(null)
    }
  }

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => hoverHandlerRef.current(e),
    []
  )
  const onMouseLeave = useCallback(
    () => hoverLeaveRef.current(),
    []
  )
  const onClick = useCallback(
    (e: React.MouseEvent) => clickHandlerRef.current(e),
    []
  )

  // ── Keyboard navigation ───────────────────────────────────────────

  const kbFocusIndexRef = useRef(-1)

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const store = storeRef.current
    if (!store) return

    const navPoints = extractNetworkNavPoints(store.sceneNodes as any)
    if (navPoints.length === 0) return

    const current = kbFocusIndexRef.current
    const next = nextIndex(e.key, current < 0 ? -1 : current, navPoints.length)
    if (next === null) return

    e.preventDefault()

    if (next < 0) {
      kbFocusIndexRef.current = -1
      hoverRef.current = null
      setHoverData(null)
      if (customHoverBehavior) { customHoverBehavior(null); dirtyRef.current = true }
      scheduleRender()
      return
    }

    const idx = current < 0 ? 0 : next
    kbFocusIndexRef.current = idx
    const point = navPoints[idx]
    const hover = { type: "node" as const, data: point.datum, x: point.x, y: point.y }
    hoverRef.current = hover
    setHoverData(hover)
    if (customHoverBehavior) { customHoverBehavior(hover); dirtyRef.current = true }
    scheduleRender()
  }, [customHoverBehavior, scheduleRender])

  const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
    kbFocusIndexRef.current = -1
    hoverHandlerRef.current(e)
  }, [])

  // ── Render function ──────────────────────────────────────────────────

  renderFnRef.current = () => {
    rafRef.current = 0
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const store = storeRef.current
    if (!store) return

    const now = performance.now()
    const deltaTime = lastFrameTimeRef.current
      ? Math.min((now - lastFrameTimeRef.current) / 1000, 0.1)
      : 0.016
    lastFrameTimeRef.current = now

    // Advance transition animation
    const isTransitioning = store.advanceTransition(now)
    if (isTransitioning || dirtyRef.current) {
      // Rebuild scene for current positions
      store.buildScene([adjustedWidth, adjustedHeight])
    }

    // DPR setup
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    canvas.width = size[0] * dpr
    canvas.height = size[1] * dpr
    canvas.style.width = `${size[0]}px`
    canvas.style.height = `${size[1]}px`
    ctx.scale(dpr, dpr)
    ctx.translate(margin.left, margin.top)
    ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

    // Background
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
    }

    // Apply realtime encoding (pulse/decay/thresholds)
    if (decay) {
      store.applyDecay()
    }
    if (pulse) {
      store.applyPulse(now)
    }
    if (thresholds) {
      store.applyThresholds(now)
    }

    // Topology diff highlighting (always active for streaming)
    store.applyTopologyDiff(now)

    // Staleness dimming
    const staleThreshold = staleness?.threshold ?? 5000
    const currentlyStale = staleness && store.lastIngestTime > 0 &&
      (now - store.lastIngestTime) > staleThreshold

    if (currentlyStale) {
      ctx.globalAlpha = staleness?.dimOpacity ?? 0.5
    }

    // Render edges first (they go behind nodes)
    networkEdgeRenderer(ctx, store.sceneEdges)

    // Render nodes
    networkRectRenderer(ctx, store.sceneNodes)
    networkCircleRenderer(ctx, store.sceneNodes)
    networkArcRenderer(ctx, store.sceneNodes)

    // Render particles (sankey only) — stop entirely when stale
    if (showParticles && store.particlePool && !currentlyStale) {
      const edges = Array.from(store.edges.values())
      if (edges.length > 0) {
        spawnNetworkParticles(
          store.particlePool,
          edges,
          deltaTime,
          particleStyle
        )
        const speed = (particleStyle.speedMultiplier ?? 1) * 0.5

        // Compute per-edge speed multipliers for proportional flow rate
        let edgeSpeedMultipliers: number[] | undefined
        if (particleStyle.proportionalSpeed) {
          const maxValue = edges.reduce((max, e) => Math.max(max, e.value || 1), 1)
          edgeSpeedMultipliers = edges.map(e => {
            const ratio = (e.value || 1) / maxValue
            // Scale between 0.3x and 2x so low-value edges still move
            return 0.3 + ratio * 1.7
          })
        }

        store.particlePool.step(deltaTime, speed, edges, edgeSpeedMultipliers)
        renderNetworkParticles(
          ctx,
          store.particlePool,
          edges,
          particleStyle,
          getParticleColor
        )
      }
    }

    // Reset staleness dimming
    if (currentlyStale) {
      ctx.globalAlpha = 1
    }

    const wasDirty = dirtyRef.current
    dirtyRef.current = false

    // Update SVG overlay when layout changes
    if (wasDirty || isTransitioning) {
      setAnnotationFrame((f) => f + 1)
    }

    // Schedule next frame for continuous rendering (particles/transitions/pulses/thresholds/diffs)
    if (isContinuous || isTransitioning || store.hasActivePulses || store.hasActiveThresholds || store.hasActiveTopologyDiff) {
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    scheduleRender()
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
    }
  }, [scheduleRender])

  useEffect(() => {
    dirtyRef.current = true
    scheduleRender()
  }, [chartType, adjustedWidth, adjustedHeight, background, scheduleRender])

  // ── Staleness timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (!staleness) return
    const interval = setInterval(() => {
      const store = storeRef.current
      if (!store || store.lastIngestTime === 0) return
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const threshold = staleness.threshold ?? 5000
      const stale = (now - store.lastIngestTime) > threshold
      if (stale !== isStale) {
        setIsStale(stale)
        dirtyRef.current = true
        scheduleRender()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [staleness, isStale, scheduleRender])

  // ── Tooltip ──────────────────────────────────────────────────────────

  const tooltipElement =
    enableHover && hoverData ? (
      <div
        className="stream-network-tooltip"
        style={{
          position: "absolute",
          left: margin.left + hoverData.x,
          top: margin.top + hoverData.y,
          transform: `translate(${
            hoverData.x > adjustedWidth * 0.6
              ? "calc(-100% - 12px)"
              : "12px"
          }, ${
            hoverData.y < adjustedHeight * 0.3
              ? "4px"
              : "calc(-100% - 4px)"
          })`,
          pointerEvents: "none",
          zIndex: 2
        }}
      >
        {tooltipContent ? (
          tooltipContent(hoverData)
        ) : (
          <DefaultNetworkTooltip data={hoverData} />
        )}
      </div>
    ) : null

  // ── Render ───────────────────────────────────────────────────────────

  const store = storeRef.current

  return (
    <div
      ref={responsiveRef}
      className={`stream-network-frame${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={typeof title === "string" ? title : "Network chart"}
      tabIndex={0}
      style={{
        position: "relative",
        width: responsiveWidth ? "100%" : size[0],
        height: responsiveHeight ? "100%" : size[1],
      }}
      onMouseMove={enableHover ? onMouseMoveWrapped : undefined}
      onMouseLeave={enableHover ? onMouseLeave : undefined}
      onClick={(customClickBehaviorProp || onObservation) ? onClick : undefined}
      onKeyDown={onKeyDown}
    >
      {backgroundGraphics && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size[0],
            height: size[1],
            pointerEvents: "none"
          }}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {backgroundGraphics}
          </g>
        </svg>
      )}

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0
        }}
      />

      <NetworkSVGOverlay
        width={adjustedWidth}
        height={adjustedHeight}
        totalWidth={size[0]}
        totalHeight={size[1]}
        margin={margin}
        labels={store?.labels || []}
        sceneNodes={store?.sceneNodes as any}
        title={title}
        legend={legend}
        foregroundGraphics={foregroundGraphics}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        annotationFrame={annotationFrame}
      />

      {tooltipElement}

      {staleness?.showBadge && (
        <div
          className="stream-staleness-badge"
          style={{
            position: "absolute",
            ...(staleness.badgePosition === "top-left"
              ? { top: 4, left: 4 }
              : staleness.badgePosition === "bottom-left"
              ? { bottom: 4, left: 4 }
              : staleness.badgePosition === "bottom-right"
              ? { bottom: 4, right: 4 }
              : { top: 4, right: 4 }),
            background: isStale ? "#dc3545" : "#28a745",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 3,
            letterSpacing: "0.05em",
            zIndex: 3,
            pointerEvents: "none"
          }}
        >
          {isStale ? "STALE" : "LIVE"}
        </div>
      )}
    </div>
  )
})

StreamNetworkFrame.displayName = "StreamNetworkFrame"
export default StreamNetworkFrame
