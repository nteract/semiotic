/**
 * Scene graph → SVG element converters for the geo family.
 *
 * Split out of SceneToSVG.tsx (see scripts/file-size-policy.json) to keep
 * that module under the file-size ratchet ceiling. Re-exported from
 * SceneToSVG.tsx so existing imports are unaffected.
 */

import * as React from "react"

import type { PointSceneNode, GlyphSceneNode } from "./types"
import type { GeoSceneNode, GeoAreaSceneNode } from "./geoTypes"
import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"
import { svgFill, glyphNodeToSVG } from "./sceneToSVGShared"

export function geoSceneNodeToSVG(node: GeoSceneNode, i: number): React.ReactNode {
  switch (node.type) {
    case "geoarea": {
      const n = node as GeoAreaSceneNode
      if (!n.pathData) return null
      // A HatchFill descriptor becomes an inline <pattern> (SSR parity with the
      // canvas backend, which resolves the same descriptor to a CanvasPattern).
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, `geoarea-${i}-hatch`) : undefined
      return (
        <React.Fragment key={`geoarea-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <path
            d={n.pathData}
            fill={hatch ? `url(#geoarea-${i}-hatch)` : svgFill(n.style.fill, "#e0e0e0")}
            fillOpacity={n.style.fillOpacity ?? 1}
            stroke={n.style.stroke || "none"}
            strokeWidth={n.style.strokeWidth || 0.5}
            strokeDasharray={n.style.strokeDasharray}
            opacity={n._decayOpacity ?? 1}
          />
        </React.Fragment>
      )
    }
    case "point": {
      const n = node as PointSceneNode
      const hatch = isHatchFill(n.style.fill) ? hatchPatternDef(n.style.fill, `geopoint-${i}-hatch`) : undefined
      return (
        <React.Fragment key={`point-${i}`}>
          {hatch && <defs>{hatch}</defs>}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={hatch ? `url(#geopoint-${i}-hatch)` : svgFill(n.style.fill)}
            fillOpacity={n.style.fillOpacity ?? 0.8}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
            opacity={n._decayOpacity ?? (n.style.opacity ?? 1)}
          />
        </React.Fragment>
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
    case "glyph": {
      const n = node as GlyphSceneNode
      return glyphNodeToSVG(n, n.x, n.y, `geo-glyph-${n.pointId ?? i}`)
    }
    default:
      return null
  }
}
