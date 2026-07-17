/**
 * Scene graph → SVG element converters for the network family.
 *
 * Split out of SceneToSVG.tsx (see scripts/file-size-policy.json) to keep
 * that module under the file-size ratchet ceiling. Re-exported from
 * SceneToSVG.tsx so existing imports are unaffected.
 */

import * as React from "react"
import { arc as d3Arc } from "d3-shape"

import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkArcNode,
  NetworkSymbolNode,
  NetworkGlyphNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "./networkTypes"
import { symbolPathString } from "./symbolPath"
import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"
import { ARC_NOOP, svgFill, glyphNodeToSVG } from "./sceneToSVGShared"

export function networkSceneNodeToSVG(node: NetworkSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "circle": {
      const n = node as NetworkCircleNode
      // HatchFill (e.g. from node styleRules) → inline <pattern> (SSR parity).
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, `net-circle-${i}-hatch`) : undefined
      return (
        <React.Fragment key={`net-circle-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <circle
            cx={n.cx} cy={n.cy} r={n.r}
            fill={hatch ? `url(#net-circle-${i}-hatch)` : svgFill(n.style.fill)}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
            opacity={n.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "rect": {
      const n = node as NetworkRectNode
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, `net-rect-${i}-hatch`) : undefined
      return (
        <React.Fragment key={`net-rect-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <rect
            x={n.x} y={n.y} width={n.w} height={n.h}
            fill={hatch ? `url(#net-rect-${i}-hatch)` : svgFill(n.style.fill)}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
            opacity={n.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "arc": {
      const n = node as NetworkArcNode
      // Scene stores angles in canvas convention (0 = 3 o'clock).
      // d3-shape arc expects 0 = 12 o'clock. Add π/2 to compensate.
      const arcPath = d3Arc()
        .innerRadius(n.innerR)
        .outerRadius(n.outerR)
        .startAngle(n.startAngle + Math.PI / 2)
        .endAngle(n.endAngle + Math.PI / 2)(ARC_NOOP) || ""
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, `net-arc-${i}-hatch`) : undefined
      return (
        <React.Fragment key={`net-arc-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <path
            d={arcPath}
            transform={`translate(${n.cx},${n.cy})`}
            fill={hatch ? `url(#net-arc-${i}-hatch)` : svgFill(n.style.fill)}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
            opacity={n.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "symbol": {
      const n = node as NetworkSymbolNode
      const d = symbolPathString(n.symbolType, n.size, n.path)
      const transform = n.rotation
        ? `translate(${n.cx},${n.cy}) rotate(${(n.rotation * 180) / Math.PI})`
        : `translate(${n.cx},${n.cy})`
      return (
        <path
          key={`net-symbol-${i}`}
          d={d}
          transform={transform}
          fill={n.style.fill ? svgFill(n.style.fill) : "none"}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "glyph": {
      const n = node as NetworkGlyphNode
      return glyphNodeToSVG(n, n.cx, n.cy, `net-glyph-${n.id ?? i}`)
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
      // Cast via React's `SVGAttributes["dominantBaseline"]` rather
      // than `any`. `NetworkLabel.baseline` is a free-form string
      // (consumers control it); React types this attribute as a strict
      // SVG-spec union. The cast is the boundary, not a type-safety
      // bypass — runtime accepts whatever the user supplied.
      dominantBaseline={(label.baseline || "auto") as React.SVGAttributes<SVGTextElement>["dominantBaseline"]}
      fontSize={label.fontSize || 11}
      fontWeight={label.fontWeight}
      fill={label.fill || "var(--semiotic-text, #333)"}
      stroke={label.stroke}
      strokeWidth={label.strokeWidth}
      paintOrder={label.paintOrder}
    >
      {label.text}
    </text>
  )
}
