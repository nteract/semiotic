import * as React from "react"
import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"
import type {
  ConnectorSceneNode,
  OrdinalSceneNode
} from "./ordinalTypes"
import type { SceneRenderMode } from "./types"
import {
  renderSceneListWithBackend,
  type RenderedSceneEntry
} from "./renderBackend"
import { ordinalSceneNodeToSVG } from "./SceneToSVGOrdinal"
import { safeSvgId, svgFill } from "./sceneToSVGShared"
import { withSceneMarkCursor } from "./sceneCursor"

type OrdinalSceneEntry = RenderedSceneEntry<OrdinalSceneNode>
type ConnectorEntry = OrdinalSceneEntry & { node: ConnectorSceneNode }

function isConnectorEntry(entry: OrdinalSceneEntry): entry is ConnectorEntry {
  return entry.node.type === "connector"
}

function connectorFill(
  entries: ConnectorEntry[],
  idPrefix: string | undefined,
  runIndex: number,
  groupIndex: number
): React.ReactNode {
  if (entries.length < 2) return null
  const first = entries[0].node
  const fill = first.style.fill
  if (!fill || fill === "none") return null

  const patternId = safeSvgId(
    `${idPrefix ? `${idPrefix}-` : ""}connector-${runIndex}-${groupIndex}-hatch`
  )
  const pattern = isHatchFill(fill) ? hatchPatternDef(fill, patternId) : null
  const points = [
    `${first.x1},${first.y1}`,
    ...entries.map(({ node }) => `${node.x2},${node.y2}`)
  ].join(" ")
  const polygon = (
    <React.Fragment>
      {pattern && <defs>{pattern}</defs>}
      <polygon
        points={points}
        fill={pattern ? `url(#${patternId})` : svgFill(fill, "#999")}
        opacity={first.style.fillOpacity ?? first.style.opacity ?? 0.3}
        data-semiotic-connector-fill={first.group || "_default"}
      />
    </React.Fragment>
  )
  return withSceneMarkCursor(
    polygon,
    first,
    `ordinal-connector-fill-${runIndex}-${groupIndex}`
  )
}

/**
 * Reproduce the ordinal canvas connector renderer's grouped-polygon pass for
 * SVG/SSR. Backend-rendered marks split fallback runs exactly as they do in
 * `paintSceneWithBackend`; within each run connectors render before the other
 * built-in marks, grouped by key in first-seen order, with every segment stroke
 * retained after its optional fill.
 */
function groupFallbackConnectorRun(
  entries: OrdinalSceneEntry[],
  idPrefix: string | undefined,
  runIndex: number
): void {
  const groups = new Map<string, ConnectorEntry[]>()
  for (const entry of entries) {
    if (!isConnectorEntry(entry)) continue
    const key = entry.node.group || "_default"
    const group = groups.get(key)
    if (group) group.push(entry)
    else groups.set(key, [entry])
  }
  if (groups.size === 0) return

  const connectorGroups = Array.from(groups.values()).map((group, groupIndex) => (
    <g key={`ordinal-connectors-${runIndex}-${groupIndex}`}>
      {connectorFill(group, idPrefix, runIndex, groupIndex)}
      {group.map(entry => entry.element)}
    </g>
  ))
  const anchor = entries[0]
  const anchorElement = isConnectorEntry(anchor) ? null : anchor.element
  for (const group of groups.values()) {
    for (const entry of group) entry.element = null
  }
  anchor.element = (
    <React.Fragment key={`ordinal-connector-run-${runIndex}`}>
      {connectorGroups}
      {anchorElement}
    </React.Fragment>
  )
}

export function renderOrdinalSceneListWithBackend(args: {
  nodes: OrdinalSceneNode[]
  renderMode: SceneRenderMode<OrdinalSceneNode> | undefined
  idPrefix?: string
}): OrdinalSceneEntry[] {
  const entries = renderSceneListWithBackend({
    nodes: args.nodes,
    renderMode: args.renderMode,
    fallback: (node, index) =>
      ordinalSceneNodeToSVG(node, index, args.idPrefix)
  })

  let runIndex = 0
  for (let start = 0; start < entries.length;) {
    if (entries[start].renderedByBackend) {
      start++
      continue
    }
    let end = start + 1
    while (end < entries.length && !entries[end].renderedByBackend) end++
    groupFallbackConnectorRun(entries.slice(start, end), args.idPrefix, runIndex++)
    start = end
  }
  return entries
}
