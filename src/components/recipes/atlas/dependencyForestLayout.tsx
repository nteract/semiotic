import * as React from "react"
import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import type {
  NetworkCurvedEdge,
  NetworkLabel,
  NetworkSceneNode
} from "../../stream/networkTypes"
import {
  branchMembers,
  requiredTargets,
  type DependencyForestProjection
} from "./dependencyForest"
import type { DependencySelection } from "./dependencyTypes"

export type DependencyForestLayoutConfig = {
  forest: DependencyForestProjection
  reading?: "organize" | "required-paths"
  selection?: DependencySelection
  collapsedNodeIds?: string[]
  highlightedEdgeIds?: string[]
}

/** Sections and backbone order position nodes; every painted link is original. */
export const dependencyForestLayout: NetworkCustomLayout<
  DependencyForestLayoutConfig
> = (ctx) => {
  const { forest, selection, reading = "organize" } = ctx.config
  const { atlas } = forest
  const plot = ctx.dimensions.plot
  const text = ctx.theme.semantic.text ?? "#273442"
  const quiet = "#8995a3"
  const tie = "#b66631"
  const required = "#3983a5"
  const selected =
    selection?.analysisRevision === atlas.analysisRevision &&
    selection.relationScopeId === "directed-admitted" &&
    atlas.source.nodes.some((node) => node.id === selection.nodeId)
      ? selection.nodeId
      : undefined
  const hidden = new Map<string, string>()
  for (const id of forest.order) {
    if (!ctx.config.collapsedNodeIds?.includes(id) || hidden.has(id)) continue
    for (const member of branchMembers(forest, id))
      if (member !== id) hidden.set(member, id)
  }
  const visible = forest.order.filter((id) => !hidden.has(id))
  const sections = [...atlas.sections.sectionIds]
  if (atlas.source.nodes.some((node) => !node.sectionId))
    sections.push("Unsectioned")
  const sectionByNode = new Map(
    atlas.source.nodes.map((node) => [node.id, node.sectionId ?? "Unsectioned"])
  )
  const rowBySection = sections.map((section) =>
    visible.filter((id) => sectionByNode.get(id) === section)
  )
  const positions = new Map<string, { x: number; y: number }>()
  const labels: NetworkLabel[] = []
  const sceneNodes: NetworkSceneNode[] = []
  const sceneEdges: NetworkCurvedEdge[] = []
  const overlays: React.ReactNode[] = []
  const label = (x: number, y: number, value: string, size = 11) =>
    labels.push({
      x,
      y,
      text: value,
      fill: text,
      anchor: "middle",
      fontSize: size
    })
  const nodeWidth = Math.max(
    16,
    Math.min(94, plot.width / Math.max(1, sections.length) - 20)
  )
  const nodeHeight = 34
  rowBySection.forEach((ids, col) => {
    const x = plot.x + (plot.width * (col + 0.5)) / sections.length
    label(x, plot.y + 18, sections[col], 12)
    ids.forEach((id, row) => {
      const y =
        plot.y +
        58 +
        ((row + 0.5) * Math.max(40, plot.height - 110)) /
          Math.max(1, ids.length)
      positions.set(id, { x, y })
    })
  })
  for (const id of visible) {
    const point = positions.get(id)!
    const node = atlas.source.nodes.find((item) => item.id === id)!
    const hiddenCount = [...hidden.values()].filter(
      (owner) => owner === id
    ).length
    const internalEdgeIds = hiddenCount
      ? atlas.source.edges
          .filter(
            (edge) =>
              (hidden.get(edge.source) ?? edge.source) === id &&
              (hidden.get(edge.target) ?? edge.target) === id &&
              (edge.source !== id || edge.target !== id)
          )
          .map((edge) => edge.id)
      : []
    const unreachable = atlas.requiredPaths?.unreachableNodeIds.includes(id)
    const unknown = node.completeness && node.completeness !== "known"
    const status = unknown
      ? "Unknown upstream"
      : unreachable
        ? "Unreachable from roots"
        : undefined
    sceneNodes.push({
      type: "glyph",
      id,
      cx: point.x,
      cy: point.y,
      size: nodeHeight,
      glyph: {
        viewBox: [nodeWidth, nodeHeight],
        parts: [
          {
            d: `M6,0 H${nodeWidth - 6} Q${nodeWidth},0 ${nodeWidth},6 V28 Q${nodeWidth},34 ${nodeWidth - 6},34 H6 Q0,34 0,28 V6 Q0,0 6,0 Z`,
            stroke: "accent"
          }
        ]
      },
      accent: selected === id ? required : unknown ? tie : quiet,
      style: {
        fill: ctx.theme.semantic.surface ?? "#fff",
        strokeWidth: selected === id ? 2.5 : 1
      },
      label: id,
      datum: {
        ...node,
        kind: "dependency-node",
        analysisRevision: atlas.analysisRevision,
        hiddenCount,
        internalEdgeIds
      },
      accessibleDatum: {
        node: id,
        section: sectionByNode.get(id),
        status: status ?? "Admitted",
        hiddenCount,
        internalEdges: internalEdgeIds.join(", ")
      }
    })
    label(point.x, point.y + 4, hiddenCount ? `${id} +${hiddenCount}` : id, 12)
    if (status) label(point.x, point.y + 30, status, 9)
    else if (hiddenCount)
      label(
        point.x,
        point.y + 30,
        `${internalEdgeIds.length} internal links`,
        9
      )
  }
  const backbone = new Set(forest.forest.backboneEdgeIds)
  const highlighted = new Set(ctx.config.highlightedEdgeIds)
  const duplicates = new Map<string, number>()
  for (const edge of atlas.source.edges) {
    const fromId = hidden.get(edge.source) ?? edge.source
    const toId = hidden.get(edge.target) ?? edge.target
    // Internal edges in a collapsed branch are explicitly counted on its glyph;
    // boundary links retain their original endpoints in the inspector and datum.
    if (fromId === toId && (edge.source !== fromId || edge.target !== toId))
      continue
    const from = positions.get(fromId)!
    const to = positions.get(toId)!
    const key = JSON.stringify([fromId, toId])
    const offset = (duplicates.get(key) ?? 0) * 12
    duplicates.set(key, (duplicates.get(key) ?? 0) + 1)
    const isBackbone = backbone.has(edge.id)
    const color = highlighted.has(edge.id) ? required : isBackbone ? quiet : tie
    const forward = to.x > from.x
    const startX = from.x + (forward ? nodeWidth / 2 : -nodeWidth / 2)
    const endX = to.x + (forward ? -nodeWidth / 2 : nodeWidth / 2)
    const between = [...positions.values()].filter(
      (point) =>
        point.x > Math.min(from.x, to.x) && point.x < Math.max(from.x, to.x)
    )
    let d: string
    let endDirection: number
    if (fromId === toId) {
      d = `M${from.x - 14},${from.y - 17} C${from.x - 35 - offset},${from.y - 64 - offset} ${from.x + 35 + offset},${from.y - 64 - offset} ${from.x + 14},${from.y - 17}`
      endDirection = 1
    } else if (from.x === to.x) {
      // Same-section ties run outside the glyph column, never across a node.
      const side = to.y > from.y ? 1 : -1
      const port = from.x + (side * nodeWidth) / 2
      const channel = port + side * (32 + offset)
      d = `M${port},${from.y} C${channel},${from.y} ${channel},${to.y} ${port},${to.y}`
      endDirection = side === 1 ? 2 : 0
    } else if (between.length) {
      // A skip link must not imply a relationship to an intervening glyph.
      const channel =
        Math.min(from.y, to.y, ...between.map((point) => point.y)) -
        nodeHeight / 2 -
        26 -
        offset
      const gap =
        ((plot.width / sections.length - nodeWidth) / 2) * (forward ? 1 : -1)
      d = `M${startX},${from.y} C${startX + gap},${from.y} ${startX},${channel} ${startX + gap},${channel} H${endX - gap} C${endX},${channel} ${endX - gap},${to.y} ${endX},${to.y}`
      endDirection = forward ? 0 : 2
    } else if (forward) {
      const mid = (startX + endX) / 2
      d = `M${startX},${from.y} C${mid},${from.y - offset} ${mid},${to.y - offset} ${endX},${to.y}`
      endDirection = 0
    } else {
      const channel = Math.min(from.y, to.y) - 48 - offset
      d = `M${startX},${from.y} C${startX - 25},${channel} ${endX + 25},${channel} ${endX},${to.y}`
      endDirection = 2
    }
    sceneEdges.push({
      type: "curved",
      id: edge.id,
      pathD: d,
      style: {
        stroke: color,
        strokeWidth: highlighted.has(edge.id) ? 3 : isBackbone ? 1.3 : 2,
        fill: "none"
      },
      datum: {
        ...edge,
        kind: "dependency-edge",
        edgeClass: isBackbone ? "backbone" : "residual"
      },
      accessibleDatum: {
        edge: edge.id,
        source: edge.source,
        target: edge.target,
        display: isBackbone ? "backbone" : "residual cross-link"
      }
    })
    const arrowX =
      fromId === toId
        ? from.x + 14
        : from.x === to.x
          ? from.x + (to.y > from.y ? nodeWidth / 2 : -nodeWidth / 2)
          : endX
    const arrowY = fromId === toId ? from.y - 17 : to.y
    overlays.push(
      React.createElement("path", {
        key: `arrow:${edge.id}`,
        "data-dependency-edge": edge.id,
        "data-source": edge.source,
        "data-target": edge.target,
        d: "M-6,-3 L0,0 L-6,3",
        fill: "none",
        stroke: color,
        transform: `translate(${arrowX},${arrowY}) rotate(${endDirection * 90})`
      })
    )
  }
  if (reading === "required-paths" && selected) {
    const claims = requiredTargets(forest, selected)
    const targets = [
      ...new Set(claims.map((id) => hidden.get(id) ?? id))
    ].filter((id) => id !== selected && positions.has(id))
    if (targets.length) {
      const points = targets.map((id) => positions.get(id)!)
      const x = Math.max(...points.map((point) => point.x)) + nodeWidth / 2 + 8
      const low = Math.min(...points.map((point) => point.y)) - 23
      const high = Math.max(...points.map((point) => point.y)) + 23
      overlays.push(
        React.createElement("path", {
          key: "required-bracket",
          d: `M${x - 7},${low} H${x} V${high} H${x - 7}`,
          fill: "none",
          stroke: required,
          strokeWidth: 2,
          "data-kind": "dominator-bracket"
        })
      )
    }
    label(
      plot.x + plot.width / 2,
      plot.y + plot.height - 16,
      claims.length
        ? `${selected} lies on all admitted paths to ${claims.join(", ")}${atlas.requiredPaths?.status === "incomplete" ? " · incomplete scope" : ""}`
        : atlas.requiredPaths
          ? `${selected}: no other required targets in the admitted graph`
          : "Required paths have not been prepared"
    )
  }
  return {
    sceneNodes,
    sceneEdges,
    labels,
    overlays: React.createElement("g", { "aria-hidden": true }, overlays)
  }
}
