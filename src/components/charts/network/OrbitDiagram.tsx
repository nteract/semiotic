"use client"
import * as React from "react"
import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { pie as d3Pie } from "d3-shape"
import type { BaseChartProps } from "../shared/types"
import { useChartMode, useChartSelection, useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { getColor } from "../shared/colorUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"

// ── Orbit layout types ──────────────────────────────────────────────────

export interface OrbitNode {
  datum: any
  x: number
  y: number
  ring: number
  angle: number
  depth: number
  parent?: OrbitNode
  children?: OrbitNode[]
  id?: string
}

interface OrbitalRing {
  x: number
  y: number
  r: number
  ry: number // vertical radius (for eccentricity)
  source: OrbitNode
}

type OrbitMode = "flat" | "solar" | "atomic" | number[]

// ── OrbitDiagram props ──────────────────────────────────────────────────

export interface OrbitDiagramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Hierarchical data — single root object with children */
  data: TDatum
  /** How to access children from each datum @default "children" */
  childrenAccessor?: string | ((d: TDatum) => TDatum[] | null | undefined)
  /** How to identify each node @default "name" */
  nodeIdAccessor?: string | ((d: any) => string)
  /** Field or function for node color */
  colorBy?: string | ((d: any) => string)
  /** Color scheme @default "category10" */
  colorScheme?: string | string[]
  /** Color by hierarchy depth instead of field @default false */
  colorByDepth?: boolean
  /**
   * Ring arrangement mode:
   * - "flat": all children in one ring
   * - "solar": one child per ring
   * - "atomic": [2, 8] electron shell pattern
   * - number[]: custom ring capacities (last value repeats)
   * @default "flat"
   */
  orbitMode?: OrbitMode
  /** Ring size divisor per depth. Larger = tighter orbits. @default 2.95 */
  orbitSize?: number | ((node: OrbitNode) => number)
  /** Orbit speed in degrees per frame @default 0.25 */
  speed?: number
  /** Per-node speed modifier @default (node) => 1 / (node.depth + 1) */
  revolution?: (node: OrbitNode) => number
  /** Vertical squash for elliptical orbits. 1 = circle, 0.5 = ellipse @default 1 */
  eccentricity?: number | ((node: OrbitNode) => number)
  /** Show orbital ring paths @default true */
  showRings?: boolean
  /** Node radius. Number or function of node. @default 6 */
  nodeRadius?: number | ((node: OrbitNode) => number)
  /** Show node labels @default false */
  showLabels?: boolean
  /** Enable animation @default true */
  animated?: boolean
  /** Tooltip configuration */
  tooltip?: (node: OrbitNode) => React.ReactNode
  /** Enable hover @default true */
  enableHover?: boolean
  /** Annotation objects. Supports type: "widget" with content (ReactNode) anchored to a node by nodeId. */
  annotations?: Array<{
    type: string
    nodeId?: string
    dx?: number
    dy?: number
    width?: number
    height?: number
    content?: React.ReactNode
    label?: string
    [key: string]: any
  }>
  /** Additional SVG content */
  foregroundGraphics?: React.ReactNode
  /** Frame props passthrough (unused, for API consistency) */
  frameProps?: Record<string, any>
}

// ── Depth palette (same as Treemap/CirclePack) ──────────────────────────

const DEPTH_COLORS = [
  "#93c5fd", "#fca5a5", "#86efac", "#fde68a", "#c4b5fd", "#f9a8d4", "#a5f3fc"
]

// ── Orbit layout engine ─────────────────────────────────────────────────

function resolveMode(mode: OrbitMode): number[] {
  if (Array.isArray(mode)) return mode
  switch (mode) {
    case "solar": return [1]
    case "atomic": return [2, 8]
    case "flat":
    default: return [9999]
  }
}

function buildOrbitLayout(
  data: any,
  size: [number, number],
  childrenFn: (d: any) => any[] | null | undefined,
  nodeIdFn: (d: any) => string,
  mode: OrbitMode,
  orbitSizeOpt: number | ((n: OrbitNode) => number),
  eccentricityOpt: number | ((n: OrbitNode) => number),
) {
  const ringCapacities = resolveMode(mode)
  const orbitSizeFn = typeof orbitSizeOpt === "number" ? () => orbitSizeOpt : orbitSizeOpt
  const eccentricityFn = typeof eccentricityOpt === "number" ? () => eccentricityOpt : eccentricityOpt

  const nodes: OrbitNode[] = []
  const rings: OrbitalRing[] = []

  const root: OrbitNode = {
    datum: data,
    x: size[0] / 2,
    y: size[1] / 2,
    ring: Math.min(size[0], size[1]) / 2 * 0.85,
    angle: 0,
    depth: 0,
    id: nodeIdFn(data),
  }
  nodes.push(root)

  function buildTree(parent: OrbitNode) {
    const kids = childrenFn(parent.datum)
    if (!kids?.length) return

    parent.children = []
    const totalChildren = kids.length

    let ringCount = 0
    let counted = 0
    let p = 0
    while (counted < totalChildren) {
      counted += ringCapacities[Math.min(p, ringCapacities.length - 1)]
      p++
      ringCount++
    }

    let childIndex = 0
    for (let currentRing = 0; currentRing < ringCount; currentRing++) {
      const capacity = ringCapacities[Math.min(currentRing, ringCapacities.length - 1)]
      const ringSlice = kids.slice(childIndex, childIndex + capacity)
      if (!ringSlice.length) break

      const ringFraction = (currentRing + 1) / ringCount
      const r = parent.parent
        ? (parent.ring / orbitSizeFn(parent)) * ringFraction
        : parent.ring * ringFraction

      const pieGen = d3Pie<any>()
        .value((kid) => {
          const hasKids = childrenFn(kid)?.length
          return hasKids ? 4 : 1
        })
        .sort(null)

      const arcs = pieGen(ringSlice)

      const ecc = eccentricityFn(parent)

      // Add ring (deduplicated by source + radius)
      rings.push({ source: parent, x: parent.x, y: parent.y, r, ry: r * ecc })

      for (let j = 0; j < ringSlice.length; j++) {
        const angle = (arcs[j].startAngle + arcs[j].endAngle) / 2

        const child: OrbitNode = {
          datum: ringSlice[j],
          x: parent.x + r * Math.sin(angle),
          y: parent.y + r * Math.cos(angle) * ecc,
          ring: r,
          angle,
          depth: parent.depth + 1,
          parent,
          id: nodeIdFn(ringSlice[j]),
        }

        parent.children.push(child)
        nodes.push(child)
        buildTree(child)
      }

      childIndex += capacity
    }
  }

  buildTree(root)
  return { nodes, rings, eccentricityFn }
}

function tickNodes(
  nodes: OrbitNode[],
  rings: OrbitalRing[],
  frame: number,
  tickStep: number,
  revolutionFn: (n: OrbitNode) => number,
  eccentricityFn: (n: OrbitNode) => number,
) {
  for (const node of nodes) {
    if (!node.parent) continue
    const a = node.angle + frame * tickStep * revolutionFn(node)
    const ecc = eccentricityFn(node)
    node.x = node.parent.x + node.ring * Math.sin(a)
    node.y = node.parent.y + node.ring * Math.cos(a) * ecc
  }
  for (const ring of rings) {
    ring.x = ring.source.x
    ring.y = ring.source.y
  }
}

// ── Component ───────────────────────────────────────────────────────────

export function OrbitDiagram<TDatum extends Record<string, any> = Record<string, any>>(
  props: OrbitDiagramProps<TDatum>
) {
  const resolved = useChartMode(props.mode as any, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    title: props.title,
  }, { width: 600, height: 600 })

  const {
    data,
    childrenAccessor = "children",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    orbitMode = "flat",
    orbitSize = 2.95,
    speed = 0.25,
    revolution = (n: OrbitNode) => 1 / (n.depth + 1),
    eccentricity = 1,
    showRings = true,
    nodeRadius: nodeRadiusProp = 6,
    showLabels = false,
    animated = true,
    tooltip: tooltipFn,
    enableHover: _enableHover,
    foregroundGraphics,
    className,
    annotations: annotationsProp,
    selection,
    linkedHover,
    onObservation,
    chartId,
    frameProps = {},
  } = props

  const width = resolved.width
  const height = resolved.height
  const title = resolved.title

  const childrenFn = useMemo(() =>
    typeof childrenAccessor === "function"
      ? childrenAccessor as (d: any) => any[]
      : (d: any) => d[childrenAccessor],
    [childrenAccessor]
  )

  const nodeIdFn = useMemo(() =>
    typeof nodeIdAccessor === "function"
      ? nodeIdAccessor as (d: any) => string
      : (d: any) => String(d[nodeIdAccessor] ?? ""),
    [nodeIdAccessor]
  )

  const nodeRadiusFn = useMemo(() =>
    typeof nodeRadiusProp === "function" ? nodeRadiusProp : () => nodeRadiusProp,
    [nodeRadiusProp]
  )

  // ── Selection ─────────────────────────────────────────────────────────

  const { customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "OrbitDiagram", chartId,
  })

  // ── Flatten for color scale ───────────────────────────────────────────

  const allNodes = useMemo(() => {
    const flat: any[] = []
    function walk(d: any) {
      flat.push(d)
      const kids = childrenFn(d)
      if (kids) kids.forEach(walk)
    }
    walk(data)
    return flat
  }, [data, childrenFn])

  const colorScale = useColorScale(allNodes, colorByDepth ? undefined : colorBy as any, colorScheme)

  // ── Layout ────────────────────────────────────────────────────────────

  const { nodes, rings, eccentricityFn } = useMemo(
    () => buildOrbitLayout(data, [width, height], childrenFn, nodeIdFn, orbitMode, orbitSize, eccentricity),
    [data, width, height, childrenFn, nodeIdFn, orbitMode, orbitSize, eccentricity]
  )

  // ── Animation ─────────────────────────────────────────────────────────

  const [, forceRender] = useState(0)
  const frameRef = useRef(0)
  const tickStep = speed * (Math.PI / 360)

  useEffect(() => {
    if (!animated) return
    let rafId: number
    const loop = () => {
      frameRef.current++
      tickNodes(nodes, rings, frameRef.current, tickStep, revolution, eccentricityFn)
      forceRender(n => n + 1)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [animated, nodes, rings, tickStep, revolution, eccentricityFn])

  // ── Hover ─────────────────────────────────────────────────────────────

  const [hovered, setHovered] = useState<OrbitNode | null>(null)

  const handleNodeHover = useCallback((node: OrbitNode | null) => {
    setHovered(node)
    if (customHoverBehavior) {
      customHoverBehavior(node ? { data: node.datum, x: node.x, y: node.y } : null)
    }
  }, [customHoverBehavior])

  // ── Node color ────────────────────────────────────────────────────────

  const getNodeColor = useCallback((node: OrbitNode) => {
    if (colorByDepth) return DEPTH_COLORS[node.depth % DEPTH_COLORS.length]
    if (colorBy) return getColor(node.datum, colorBy, colorScale)
    return DEFAULT_COLOR
  }, [colorBy, colorByDepth, colorScale])

  // ── Validate ──────────────────────────────────────────────────────────

  const error = validateObjectData({ componentName: "OrbitDiagram", data })
  if (error) return <ChartError componentName="OrbitDiagram" message={error} width={width} height={height} />

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SafeRender componentName="OrbitDiagram" width={width} height={height}>
      <div
        className={`semiotic-orbit-diagram${className ? ` ${className}` : ""}`}
        role="img"
        aria-label={typeof title === "string" ? title : "Orbit diagram"}
        tabIndex={0}
        style={{ position: "relative", width, height }}
      >
        <svg width={width} height={height}>
          {/* Orbital rings */}
          {showRings && rings.map((ring, i) => (
            <ellipse
              key={`ring-${i}`}
              cx={ring.x}
              cy={ring.y}
              rx={ring.r}
              ry={ring.ry}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.15}
            />
          ))}

          {/* Edges: lines from parent to child */}
          {nodes.map((node, i) => node.parent ? (
            <line
              key={`edge-${i}`}
              x1={node.parent.x}
              y1={node.parent.y}
              x2={node.x}
              y2={node.y}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.1}
            />
          ) : null)}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const r = nodeRadiusFn(node)
            const color = getNodeColor(node)
            const isHovered = hovered === node
            return (
              <g key={`node-${i}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? r * 1.5 : r}
                  fill={color}
                  stroke="white"
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={node.depth === 0 ? 1 : 0.85}
                  style={{ cursor: "pointer", transition: "r 0.15s" }}
                  onMouseEnter={() => handleNodeHover(node)}
                  onMouseLeave={() => handleNodeHover(null)}
                />
                {showLabels && r > 4 && (
                  <text
                    x={node.x}
                    y={node.y + r + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    opacity={0.7}
                  >
                    {nodeIdFn(node.datum)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Widget annotations */}
          {annotationsProp?.map((ann, i) => {
            if (ann.type !== "widget") return null
            const targetNode = ann.nodeId
              ? nodes.find(n => n.id === ann.nodeId)
              : null
            if (!targetNode) return null
            const dx = ann.dx ?? 0
            const dy = ann.dy ?? -16
            const w = ann.width ?? 32
            const h = ann.height ?? 32
            const content = ann.content ?? (
              <span style={{ fontSize: 18, cursor: "default" }} title={ann.label || "Info"}>
                {"ℹ️"}
              </span>
            )
            return (
              <foreignObject
                key={`ann-${i}`}
                x={targetNode.x + dx - w / 2}
                y={targetNode.y + dy - h / 2}
                width={w}
                height={h}
                style={{ overflow: "visible", pointerEvents: "auto" }}
              >
                <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {content}
                </div>
              </foreignObject>
            )
          })}

          {foregroundGraphics}
        </svg>

        {/* Tooltip */}
        {hovered && tooltipFn && (
          <div style={{
            position: "absolute",
            left: hovered.x + 12,
            top: hovered.y - 12,
            background: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}>
            {tooltipFn(hovered)}
          </div>
        )}

        {/* Default tooltip */}
        {hovered && !tooltipFn && (
          <div style={{
            position: "absolute",
            left: hovered.x + 12,
            top: hovered.y - 12,
            background: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}>
            <strong>{nodeIdFn(hovered.datum)}</strong>
            {hovered.depth > 0 && <span style={{ opacity: 0.7 }}> (depth {hovered.depth})</span>}
          </div>
        )}

        {title && (
          <div style={{
            position: "absolute", top: 8, left: 0, width: "100%",
            textAlign: "center", fontSize: 14, fontWeight: 600,
            color: "currentColor", pointerEvents: "none",
          }}>
            {title}
          </div>
        )}
      </div>
    </SafeRender>
  )
}

OrbitDiagram.displayName = "OrbitDiagram"
