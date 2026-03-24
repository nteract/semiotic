/**
 * Scene graph → SVG element converters.
 *
 * Shared module used by Stream Frames for SSR rendering and
 * by semiotic/server for static SVG export.
 */

import * as React from "react"
import { arc as d3Arc } from "d3-shape"

import type {
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  CandlestickSceneNode
} from "./types"

import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "./networkTypes"

import type {
  OrdinalSceneNode,
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  ConnectorSceneNode,
  TrapezoidSceneNode
} from "./ordinalTypes"

import type {
  GeoSceneNode,
  GeoAreaSceneNode
} from "./geoTypes"

// ── Color parsing helper (for heatcell contrast text) ───────────────────

function parseHeatcellColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    let hex = color.slice(1)
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
    }
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return [+m[1], +m[2], +m[3]]
  return [128, 128, 128]
}

// ── Fill helper (CanvasPattern → fallback for SVG) ─────────────────────

function svgFill(fill: string | CanvasPattern | undefined, fallback = "#4e79a7"): string {
  if (!fill || typeof fill !== "string") return fallback
  return fill
}

// ── XY Scene Nodes ───────────────────────────────────────────────────────

export function xySceneNodeToSVG(node: SceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "line": {
      const n = node as LineSceneNode
      if (n.path.length === 0) return null
      const d = "M" + n.path.map(([x, y]) => `${x},${y}`).join("L")
      return (
        <path
          key={`line-${i}`}
          d={d}
          fill="none"
          stroke={n.style.stroke || "#4e79a7"}
          strokeWidth={n.style.strokeWidth || 2}
          strokeDasharray={n.style.strokeDasharray}
          opacity={n.style.opacity}
        />
      )
    }
    case "area": {
      const n = node as AreaSceneNode
      if (n.topPath.length === 0) return null
      const top = n.topPath.map(([x, y]) => `${x},${y}`).join("L")
      const bottom = [...n.bottomPath].reverse().map(([x, y]) => `${x},${y}`).join("L")
      const d = `M${top}L${bottom}Z`
      return (
        <path
          key={`area-${i}`}
          d={d}
          fill={svgFill(n.style.fill)}
          fillOpacity={n.style.fillOpacity ?? n.style.opacity ?? 0.7}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={`point-${i}`}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "rect": {
      const n = node as RectSceneNode
      return (
        <rect
          key={`rect-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "heatcell": {
      const n = node as HeatcellSceneNode
      if (n.showValues && n.value != null && n.w >= 20 && n.h >= 20) {
        const formatted = n.valueFormat
          ? n.valueFormat(n.value)
          : Number.isInteger(n.value) ? String(n.value)
            : Math.abs(n.value) >= 100 ? n.value.toFixed(0)
            : Math.abs(n.value) >= 1 ? n.value.toFixed(1)
            : n.value.toPrecision(3)
        const [r, g, b] = parseHeatcellColor(n.fill)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        const textColor = luminance > 128 ? "#000" : "#fff"
        const fontSize = Math.max(10, Math.min(16, Math.min(n.w, n.h) * 0.3))
        return (
          <g key={`heatcell-${i}`}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={n.fill} />
            <text
              x={n.x + n.w / 2}
              y={n.y + n.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={textColor}
              fontSize={`${fontSize}px`}
            >
              {formatted}
            </text>
          </g>
        )
      }
      return (
        <rect
          key={`heatcell-${i}`}
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          fill={n.fill}
        />
      )
    }
    case "candlestick": {
      const n = node as CandlestickSceneNode
      const bodyTop = Math.min(n.openY, n.closeY)
      const bodyHeight = Math.max(Math.abs(n.openY - n.closeY), 1)
      const bodyColor = n.isUp ? n.upColor : n.downColor
      return (
        <g key={`candle-${i}`}>
          <line
            x1={n.x} y1={n.highY} x2={n.x} y2={n.lowY}
            stroke={n.wickColor} strokeWidth={n.wickWidth}
          />
          <rect
            x={n.x - n.bodyWidth / 2} y={bodyTop}
            width={n.bodyWidth} height={bodyHeight}
            fill={bodyColor} stroke={bodyColor} strokeWidth={1}
          />
        </g>
      )
    }
    default:
      return null
  }
}

// ── Network Scene Nodes ──────────────────────────────────────────────────

export function networkSceneNodeToSVG(node: NetworkSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "circle": {
      const n = node as NetworkCircleNode
      return (
        <circle
          key={`net-circle-${i}`}
          cx={n.cx} cy={n.cy} r={n.r}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "rect": {
      const n = node as NetworkRectNode
      return (
        <rect
          key={`net-rect-${i}`}
          x={n.x} y={n.y} width={n.w} height={n.h}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "arc": {
      const n = node as NetworkArcNode
      const arcPath = d3Arc()
        .innerRadius(n.innerR)
        .outerRadius(n.outerR)
        .startAngle(n.startAngle)
        .endAngle(n.endAngle)({} as any) || ""
      return (
        <path
          key={`net-arc-${i}`}
          d={arcPath}
          transform={`translate(${n.cx},${n.cy})`}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    default:
      return null
  }
}

export function networkSceneEdgeToSVG(edge: NetworkSceneEdge, i: number): React.ReactNode {
  switch (edge.type) {
    case "line": {
      const e = edge as NetworkLineEdge
      return (
        <line
          key={`net-edge-${i}`}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={e.style.stroke || "#999"}
          strokeWidth={e.style.strokeWidth || 1}
          opacity={e.style.opacity}
        />
      )
    }
    case "bezier": {
      const e = edge as NetworkBezierEdge
      return (
        <path
          key={`net-edge-${i}`}
          d={e.pathD}
          fill={svgFill(e.style.fill, "#999")}
          fillOpacity={e.style.fillOpacity}
          stroke={e.style.stroke || "none"}
          strokeWidth={e.style.strokeWidth}
          opacity={e.style.opacity}
        />
      )
    }
    case "ribbon": {
      const e = edge as NetworkRibbonEdge
      return (
        <path
          key={`net-edge-${i}`}
          d={e.pathD}
          fill={svgFill(e.style.fill, "#999")}
          fillOpacity={e.style.fillOpacity}
          stroke={e.style.stroke || "none"}
          strokeWidth={e.style.strokeWidth}
          opacity={e.style.opacity}
        />
      )
    }
    case "curved": {
      const e = edge as NetworkCurvedEdge
      return (
        <path
          key={`net-edge-${i}`}
          d={e.pathD}
          fill={svgFill(e.style.fill, "none")}
          stroke={e.style.stroke || "#999"}
          strokeWidth={e.style.strokeWidth || 1}
          opacity={e.style.opacity}
        />
      )
    }
    default:
      return null
  }
}

export function networkLabelToSVG(label: NetworkLabel, i: number): React.ReactNode {
  return (
    <text
      key={`net-label-${i}`}
      x={label.x} y={label.y}
      textAnchor={label.anchor || "middle"}
      dominantBaseline={(label.baseline || "auto") as any}
      fontSize={label.fontSize || 11}
      fontWeight={label.fontWeight}
      fill={label.fill || "#333"}
      stroke={label.stroke}
      strokeWidth={label.strokeWidth}
      paintOrder={label.paintOrder}
    >
      {label.text}
    </text>
  )
}

// ── Ordinal Scene Nodes ──────────────────────────────────────────────────

export function ordinalSceneNodeToSVG(node: OrdinalSceneNode, i: number): React.ReactNode {
  // Build a unique key combining node type, category (or group), and index
  // to avoid duplicate key warnings when multiple nodes share the same index
  // within stacked/grouped ordinal charts.
  const category = (node as any).category || (node as any).group || ""
  const nodeKey = (suffix: string) => `ord-${node.type}-${category}-${i}-${suffix}`
  const baseKey = `ord-${node.type}-${category}-${i}`

  switch (node.type) {
    case "rect": {
      const n = node as RectSceneNode
      return (
        <rect
          key={baseKey}
          x={n.x} y={n.y} width={n.w} height={n.h}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={baseKey}
          cx={n.x} cy={n.y} r={n.r}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "wedge": {
      const n = node as WedgeSceneNode
      const arcPath = d3Arc()
        .innerRadius(n.innerRadius)
        .outerRadius(n.outerRadius)
        .startAngle(n.startAngle)
        .endAngle(n.endAngle)({} as any) || ""
      return (
        <path
          key={baseKey}
          d={arcPath}
          transform={`translate(${n.cx},${n.cy})`}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "boxplot": {
      const n = node as BoxplotSceneNode
      const halfW = n.columnWidth / 2
      if (n.projection === "vertical") {
        return (
          <g key={baseKey}>
            <line x1={n.x} y1={n.minPos} x2={n.x} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={n.x - halfW} y={Math.min(n.q1Pos, n.q3Pos)}
              width={n.columnWidth} height={Math.abs(n.q3Pos - n.q1Pos)}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.x - halfW} y1={n.medianPos} x2={n.x + halfW} y2={n.medianPos} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.x - halfW * 0.5} y1={n.minPos} x2={n.x + halfW * 0.5} y2={n.minPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.x - halfW * 0.5} y1={n.maxPos} x2={n.x + halfW * 0.5} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      } else {
        return (
          <g key={baseKey}>
            <line x1={n.minPos} y1={n.y} x2={n.maxPos} y2={n.y} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={Math.min(n.q1Pos, n.q3Pos)} y={n.y - halfW}
              width={Math.abs(n.q3Pos - n.q1Pos)} height={n.columnWidth}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.medianPos} y1={n.y - halfW} x2={n.medianPos} y2={n.y + halfW} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.minPos} y1={n.y - halfW * 0.5} x2={n.minPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.maxPos} y1={n.y - halfW * 0.5} x2={n.maxPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      }
    }
    case "violin": {
      const n = node as ViolinSceneNode
      const elements: React.ReactNode[] = [
        <path
          key={nodeKey("path")}
          d={n.pathString}
          transform={n.translateX || n.translateY ? `translate(${n.translateX},${n.translateY})` : undefined}
          fill={svgFill(n.style.fill)}
          fillOpacity={n.style.fillOpacity ?? 0.6}
          stroke={n.style.stroke || "#333"}
          strokeWidth={n.style.strokeWidth || 1}
        />
      ]
      if (n.iqrLine && n.bounds) {
        const b = n.bounds
        const midX = b.x + b.width / 2
        const midY = b.y + b.height / 2
        const isVertical = b.height > b.width
        if (isVertical) {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={midX} y1={n.iqrLine.q1Pos} x2={midX} y2={n.iqrLine.q3Pos}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={midX} cy={n.iqrLine.medianPos} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        } else {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={n.iqrLine.q1Pos} y1={midY} x2={n.iqrLine.q3Pos} y2={midY}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={n.iqrLine.medianPos} cy={midY} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        }
      }
      return <g key={baseKey}>{elements}</g>
    }
    case "connector": {
      const n = node as ConnectorSceneNode
      return (
        <line
          key={baseKey}
          x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
          stroke={n.style.stroke || "#999"}
          strokeWidth={n.style.strokeWidth || 1}
          opacity={n.style.opacity ?? 0.5}
        />
      )
    }
    case "trapezoid": {
      const n = node as TrapezoidSceneNode
      const pts = n.points.map(p => `${p[0]},${p[1]}`).join(" ")
      return (
        <polygon
          key={baseKey}
          points={pts}
          fill={svgFill(n.style.fill, "#999")}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    default:
      return null
  }
}

// ── Geo Scene Nodes ─────────────────────────────────────────────────────

export function geoSceneNodeToSVG(node: GeoSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "geoarea": {
      const n = node as GeoAreaSceneNode
      if (!n.pathData) return null
      return (
        <path
          key={`geoarea-${i}`}
          d={n.pathData}
          fill={svgFill(n.style.fill, "#e0e0e0")}
          fillOpacity={n.style.fillOpacity ?? 1}
          stroke={n.style.stroke || "none"}
          strokeWidth={n.style.strokeWidth || 0.5}
          strokeDasharray={n.style.strokeDasharray}
          opacity={n._decayOpacity ?? 1}
        />
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={`point-${i}`}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={svgFill(n.style.fill)}
          fillOpacity={n.style.fillOpacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n._decayOpacity ?? (n.style.opacity ?? 1)}
        />
      )
    }
    case "line": {
      const n = node
      if (n.path.length < 2) return null
      const d = "M" + n.path.map(p => `${p[0]},${p[1]}`).join("L")
      return (
        <path
          key={`line-${i}`}
          d={d}
          fill="none"
          stroke={n.style.stroke || "#4e79a7"}
          strokeWidth={n.style.strokeWidth || 1.5}
          strokeDasharray={n.style.strokeDasharray}
          opacity={n.style.opacity ?? 1}
        />
      )
    }
    default:
      return null
  }
}

// ── Server detection ─────────────────────────────────────────────────────

/**
 * Returns true when running in a true server/Node.js context where
 * window and document are not available.
 */
export const isServerEnvironment: boolean =
  typeof window === "undefined" || typeof document === "undefined"
