import * as React from "react"
import type { WordCloudGroupHull } from "../charts/wordcloud/WordCloud"
import type { NetworkRectNode } from "../stream/networkTypes"
import {
  convexHull,
  expandConvexHull,
  roundedHullPath
} from "../stream/networkHullGeometry"

/** Share the network hull geometry with lineage diagrams; use occupied bounds,
 * including rotated words, rather than centers that could cut through the ink. */
export function wordCloudGroupHulls(
  nodes: NetworkRectNode[],
  groups: WordCloudGroupHull[] | undefined,
  forcedColors = false
): React.ReactNode {
  if (!groups?.length) return null
  const byId = new Map(nodes.map((node) => [String(node.id), node]))
  return (
    <g className="wordcloud-group-hulls" style={{ pointerEvents: "none" }}>
      {groups.map((group) => {
        const members = [...new Set(group.ids)].flatMap((id) => {
          const node = byId.get(id)
          return node ? [node] : []
        })
        if (!members.length) return null
        const corners = members.flatMap(({ x, y, w, h }) => [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h }
        ])
        const padding = Number.isFinite(group.padding)
          ? Math.max(0, group.padding!)
          : 8
        const hull = expandConvexHull(convexHull(corners), padding)
        const color = forcedColors ? "CanvasText" : (group.color ?? "#685987")
        return (
          <path
            key={group.id}
            data-wordcloud-hull={group.id}
            data-member-count={members.length}
            role="img"
            aria-label={`${group.label ?? group.id}: ${members.length} placed terms`}
            d={roundedHullPath(hull, Math.min(8, padding))}
            fill={forcedColors ? "none" : color}
            fillOpacity={0.07}
            stroke={color}
            strokeOpacity={forcedColors ? 1 : 0.7}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </g>
  )
}
