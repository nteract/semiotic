/**
 * Default network hover tooltip for StreamNetworkFrame.
 * Uses shared `defaultTooltipStyle` for theme CSS-var consistency.
 */

import type { Datum } from "../charts/shared/datumTypes"
import { formatVal, smartTooltipEntries } from "../charts/shared/tooltipUtils"
import * as React from "react"
import type { HoverData } from "../realtime/types"
import type { RealtimeNode, RealtimeEdge } from "./networkTypes"
import { defaultTooltipStyle } from "../Tooltip/Tooltip"

const VALUE_ROW_RE = /^(value|amount|total|count|weight|score)$/i

function DefaultNetworkTooltip({ data }: { data: HoverData }) {
  if (data.nodeOrEdge === "edge") {
    const edge = data.data as RealtimeEdge | null
    if (!edge) return null
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

  const node = data.data as RealtimeNode | null
  if (!node) return null

  // Hierarchy nodes have a __hierarchyNode with a .parent chain.
  // Show ancestor breadcrumb: grandparent → parent → **node**
  type HierarchyNode = { data?: Datum; parent?: HierarchyNode }
  const hNode = (node as RealtimeNode & { __hierarchyNode?: HierarchyNode })
    .__hierarchyNode
  if (hNode) {
    const ancestors: string[] = []
    let cur: HierarchyNode | undefined = hNode
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
  const degree =
    (node.sourceLinks?.length || 0) + (node.targetLinks?.length || 0)
  const weightedDegree =
    (node.sourceLinks || []).reduce((s, e) => s + (e.value || 0), 0) +
    (node.targetLinks || []).reduce((s, e) => s + (e.value || 0), 0)

  // Smartly surface the user datum's meaningful fields — a name for the title,
  // then a type/kind, then a value, then the rest — instead of just the id.
  const userDatum = (node.data ?? node) as Datum
  const smart = smartTooltipEntries(userDatum)
  const heading = smart.title != null ? String(smart.title) : node.id
  const hasValueRow = smart.entries.some((e) => VALUE_ROW_RE.test(e.key))

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600 }}>{heading}</div>
      {smart.entries.map((e) => (
        <div key={e.key} style={{ marginTop: 4, opacity: 0.8 }}>
          {e.key}: {formatVal(e.value)}
        </div>
      ))}
      {!hasValueRow && node.value != null && node.value > 0 && (
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
          {weightedDegree !== degree &&
            ` (weighted: ${weightedDegree.toLocaleString()})`}
        </div>
      )}
    </div>
  )
}
// Tell FlippingTooltip's chrome detector that this component paints its
// own chrome internally.
;(DefaultNetworkTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

export { DefaultNetworkTooltip }
