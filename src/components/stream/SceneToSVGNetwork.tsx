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
  NetworkSymbolNode,
  NetworkGlyphNode,
  NetworkLineEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "./networkTypes"
import { symbolPathString } from "./symbolPath"
import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"
import { ARC_NOOP, svgFill, svgPaintStyle, glyphNodeToSVG } from "./sceneToSVGShared"
import { withSceneMarkCursor } from "./sceneCursor"
import { shadeColor } from "./colorShade"

/** Side walls of a perspective piece, shaded from its fill, painted first. */
function perspectiveFacesToSVG(
  n: { style: NetworkSceneNode["style"]; faces?: ReadonlyArray<{ pathD: string; shade: number }> },
  fill: string | undefined,
  part = "slab-face"
): React.ReactNode {
  // Invisible pieces (hit targets) have no walls.
  const f = n.style.fill
  if (
    (n.style.opacity ?? 1) <= 0 ||
    (n.style.fillOpacity ?? 1) <= 0 ||
    (typeof f === "string" && /^\s*(none|transparent)\s*$|^rgba\(.*,\s*0(\.0+)?\s*\)$|^#[\da-f]{3}0$|^#[\da-f]{6}00$/i.test(f))
  ) {
    return null
  }
  return n.faces?.map((face, faceIndex) => (
    <path
      key={`face-${faceIndex}`}
      data-perspective-part={part}
      data-perspective-face={faceIndex}
      d={face.pathD}
      fill={typeof n.style.fill === "string" ? shadeColor(n.style.fill, face.shade) : fill}
      fillOpacity={n.style.fillOpacity}
      opacity={n.style.opacity}
    />
  ))
}

export function networkSceneNodeToSVG(node: NetworkSceneNode, i: number): React.ReactNode {
  return withSceneMarkCursor(
    networkSceneNodeToSVGMark(node, i),
    node,
    `network-node-cursor-${i}`
  )
}

function networkSceneNodeToSVGMark(node: NetworkSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "circle":
    case "rect":
    case "arc": {
      const n = node
      const key = `net-${n.type}-${i}`
      const hatchId = `${key}-hatch`
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, hatchId) : undefined
      const paint = {
        fill: hatch ? `url(#${hatchId})` : svgFill(n.style.fill),
        ...svgPaintStyle(n.style)
      }
      const token = n.type === "circle" && n._perspectiveToken
      let mark: React.ReactNode
      if (n.pathD) {
        mark = <path data-perspective-part={token ? "token-top" : "slab-top"} d={n.pathD} {...paint} />
      } else if (n.type === "circle") {
        mark = <circle cx={n.cx} cy={n.cy} r={n.r} {...paint} />
      } else if (n.type === "rect") {
        mark = <rect x={n.x} y={n.y} width={n.w} height={n.h} {...paint} />
      } else {
        // Canvas angles start at 3 o'clock; d3-shape starts at 12 o'clock.
        const d = d3Arc()
          .innerRadius(n.innerR)
          .outerRadius(n.outerR)
          .startAngle(n.startAngle + Math.PI / 2)
          .endAngle(n.endAngle + Math.PI / 2)(ARC_NOOP) || ""
        mark = <path d={d} transform={`translate(${n.cx},${n.cy})`} {...paint} />
      }
      return (
        <React.Fragment key={key}>
          {hatch && <defs>{hatch}</defs>}
          {n.pathD && perspectiveFacesToSVG(n, paint.fill, token ? "token-rim" : "slab-face")}
          {mark}
        </React.Fragment>
      )
    }
    case "symbol": {
      const n = node as NetworkSymbolNode
      const d = symbolPathString(n.symbolType, n.size, n.path)
      const transform = n.rotation
        ? `translate(${n.cx},${n.cy}) rotate(${(n.rotation * 180) / Math.PI})`
        : `translate(${n.cx},${n.cy})`
      const mark = (
        <path
          key={`net-symbol-${i}`}
          data-perspective-part={n._perspectiveToken ? "token-top" : undefined}
          d={d}
          transform={transform}
          fill={n.style.fill ? svgFill(n.style.fill) : "none"}
          {...svgPaintStyle(n.style)}
        />
      )
      // Perspective tokens carry screen-space side walls under the symbol.
      return n.faces?.length
        ? (
            <React.Fragment key={`net-symbol-${i}`}>
              {perspectiveFacesToSVG(n, n.style.fill ? svgFill(n.style.fill) : undefined, "token-rim")}
              {mark}
            </React.Fragment>
          )
        : mark
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
  return withSceneMarkCursor(
    networkSceneEdgeToSVGMark(edge, i),
    edge,
    `network-edge-cursor-${i}`
  )
}

function networkSceneEdgeToSVGMark(edge: NetworkSceneEdge, i: number): React.ReactNode {
  switch (edge.type) {
    case "line": {
      const e = edge as NetworkLineEdge
      return (
        <line
          key={`net-edge-${i}`}
          data-perspective-part={e._perspectivePart}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={e.style.stroke || "#999"}
          strokeOpacity={e.style.strokeOpacity}
          strokeWidth={e.style.strokeWidth ?? 1}
          strokeDasharray={e.style.strokeDasharray}
          strokeLinecap={e.style.strokeLinecap}
          opacity={e.style.opacity}
        />
      )
    }
    case "bezier": {
      const e = edge as NetworkBezierEdge
      const hatchId = `net-bezier-${i}-hatch`
      const hatch = isHatchFill(e.style.fill) ? hatchPatternDef(e.style.fill, hatchId) : undefined
      return (
        <React.Fragment key={`net-edge-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <path
            d={e.pathD}
            data-perspective-part={e._perspectivePart}
            fill={hatch ? `url(#${hatchId})` : svgFill(e.style.fill, "#999")}
            fillOpacity={e.style.fillOpacity ?? 0.5}
            stroke={e.style.stroke || "none"}
            strokeOpacity={(e.style.strokeOpacity ?? 1) * 0.5}
            strokeWidth={e.style.strokeWidth}
            strokeDasharray={e.style.strokeDasharray}
            strokeLinecap={e.style.strokeLinecap}
            opacity={e.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "ribbon": {
      const e = edge as NetworkRibbonEdge
      const hatchId = `net-ribbon-${i}-hatch`
      const hatch = isHatchFill(e.style.fill) ? hatchPatternDef(e.style.fill, hatchId) : undefined
      return (
        <React.Fragment key={`net-edge-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <path
            d={e.pathD}
            data-perspective-part={e._perspectivePart}
            fill={hatch ? `url(#${hatchId})` : svgFill(e.style.fill, "#999")}
            fillOpacity={e.style.fillOpacity ?? 0.5}
            stroke={e.style.stroke || "none"}
            strokeOpacity={(e.style.strokeOpacity ?? 1) * 0.3}
            strokeWidth={e.style.strokeWidth}
            strokeDasharray={e.style.strokeDasharray}
            strokeLinecap={e.style.strokeLinecap}
            opacity={e.style.opacity}
          />
        </React.Fragment>
      )
    }
    case "curved": {
      const e = edge as NetworkCurvedEdge
      return (
        <path
          key={`net-edge-${i}`}
          d={e.pathD}
          data-perspective-part={e._perspectivePart}
          fill={svgFill(e.style.fill, "none")}
          // Mirror the canvas renderer, which fills curved edges at
          // `fillOpacity ?? 0.1`; without this, SSR painted fills opaque.
          fillOpacity={e.style.fill && e.style.fill !== "none" ? e.style.fillOpacity ?? 0.1 : undefined}
          stroke={e.style.stroke || "#999"}
          strokeOpacity={e.style.strokeOpacity}
          strokeWidth={e.style.strokeWidth ?? 1}
          strokeDasharray={e.style.strokeDasharray}
          strokeLinecap={e.style.strokeLinecap}
          opacity={e.style.opacity}
        />
      )
    }
    default:
      return null
  }
}

export function networkLabelToSVG(label: NetworkLabel, i: number, anchor: NetworkLabel["anchor"] = "middle", baseline = "auto"): React.ReactNode {
  return (
    <text
      key={`net-label-${i}`}
      x={label.x} y={label.y}
      textAnchor={label.anchor || anchor}
      // Cast via React's `SVGAttributes["dominantBaseline"]` rather
      // than `any`. `NetworkLabel.baseline` is a free-form string
      // (consumers control it); React types this attribute as a strict
      // SVG-spec union. The cast is the boundary, not a type-safety
      // bypass — runtime accepts whatever the user supplied.
      dominantBaseline={(label.baseline || baseline) as React.SVGAttributes<SVGTextElement>["dominantBaseline"]}
      fontSize={label.fontSize || 11}
      fontWeight={label.fontWeight}
      fill={label.fill || "var(--semiotic-text, #333)"}
      stroke={label.stroke}
      strokeWidth={label.strokeWidth}
      paintOrder={label.paintOrder}
      transform={label.rotate
        ? `rotate(${Math.round((label.rotate * 180) / Math.PI * 100) / 100} ${label.x} ${label.y})`
        : undefined}
      style={{ pointerEvents: "none" }}
    >
      {label.text}
    </text>
  )
}
