import { getMax, getMin } from "../../../charts/shared/minMax"
import type { NetworkCustomLayout } from "../../../stream/networkCustomLayout"
import type { ResolutionLayoutConfig } from "./resolutionAtlasLayout"
import { sceneBuilder, shortLabel } from "./scene"

/** Literal edge columns freeze across page changes; crossings without endpoint marks mean nothing. */
export const boundaryLoomLayout: NetworkCustomLayout<ResolutionLayoutConfig> = (
  ctx
) => {
  const { projection: p } = ctx.config,
    scene = sceneBuilder(ctx.theme, ctx.config.appearance, p.generationCount),
    page = p.pages.at(-1)!
  const width = ctx.dimensions.plot.width,
    height = ctx.dimensions.plot.height
  const top = 48 + p.pages.length * 18,
    left = Math.min(170, width * 0.28)
  const laneWidth = Math.max(
    1,
    (width - left - 15) / Math.max(1, p.edges.length)
  )
  const rows = p.view.collapseGroups
    ? [...new Set(p.rowOrder.map((id) => page.nodeOwner[id]))].filter((id) =>
        p.groups.some((g) => g.pageId === page.id && g.groupId === id)
      )
    : p.rowOrder
  const rowHeight = (height - top - 25) / Math.max(1, rows.length)
  const rowIndex = new Map(rows.map((id, i) => [id, i]))
  const y = (node: string) =>
    top +
    (rowIndex.get(p.view.collapseGroups ? page.nodeOwner[node] : node)! + 0.5) *
      rowHeight
  if (!p.view.collapseGroups) {
    for (const group of p.groups.filter(
      (g) => g.pageId === page.id && g.nodeIds.length > 1
    )) {
      const members = group.nodeIds.filter((id) => rowIndex.has(id))
      if (!members.length) continue
      const from = getMin(members.map(y)) - rowHeight * 0.4
      const to = getMax(members.map(y)) + rowHeight * 0.4
      scene.path(
        { ...group, id: `${group.id}:ownership-bracket` },
        `M${left - 62},${from} H${left - 69} V${to} H${left - 62}`,
        scene.colors.border,
        1,
        1,
        "bracket"
      )
      scene.label(4, from + 11, shortLabel(group.label, 13), "start", 9)
    }
  }
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i],
      py = top + (i + 0.5) * rowHeight
    const group = p.groups.find(
      (g) =>
        g.pageId === page.id &&
        (p.view.collapseGroups ? g.groupId === key : g.nodeIds.includes(key))
    )
    scene.label(
      left - 12,
      py + 3,
      shortLabel(
        p.view.collapseGroups
          ? `${group!.label} [component, ${group!.nodeIds.length}]`
          : key,
        23
      ),
      "end",
      11
    )
    // Rail is decorative evidence context, excluded from edge hit testing.
    scene.sceneEdges.push({
      type: "line",
      id: `rail:${key}`,
      x1: left,
      x2: width - 8,
      y1: py,
      y2: py,
      interactive: false,
      datum: { kind: "rail", label: key },
      style: scene.style(
        {
          datum: { kind: "rail", label: key },
          role: "rail",
          highlighted: false,
          selected: true
        },
        { stroke: scene.colors.grid, strokeWidth: 1 }
      )
    })
  }
  for (let column = 0; column < p.edges.length; column++) {
    const projectedEdge = p.edges[column],
      internal =
        page.nodeOwner[projectedEdge.source] ===
        page.nodeOwner[projectedEdge.targetNode],
      connectionType = internal ? ("internal" as const) : ("boundary" as const),
      edge = {
        ...projectedEdge,
        connectionType,
        description: `${projectedEdge.description}; page ${page.ordinal}: ${internal ? "intra-group (internal)" : "inter-group (boundary)"}`
      },
      color = scene.edgeColors[connectionType],
      x = left + (column + 0.5) * laneWidth,
      sy = y(edge.source),
      ty = y(edge.targetNode)
    const collapsedInternal =
      p.view.collapseGroups && internal && edge.source !== edge.targetNode
    const selfLoop = edge.source === edge.targetNode
    scene.label(x, 16, shortLabel(edge.label, 8), "middle", 9)
    for (let history = 0; history < p.pages.length; history++) {
      const previous = p.pages[history],
        internal =
          previous.nodeOwner[edge.source] ===
          previous.nodeOwner[edge.targetNode]
      const historyMark = {
        ...edge,
        connectionType: internal
          ? ("internal" as const)
          : ("boundary" as const),
        id: `${edge.id}:history:${previous.id}`,
        description: `${projectedEdge.description}; page ${previous.ordinal}: ${internal ? "intra-group (internal)" : "inter-group (boundary)"}; ${previous.label}`
      }
      scene.rect(
        historyMark,
        x - 4,
        27 + history * 18,
        8,
        10,
        internal ? scene.edgeColors.internal : scene.colors.surface,
        scene.edgeColors[internal ? "internal" : "boundary"],
        internal ? "historyInternal" : "historyBoundary",
        previous.ordinal
      )
    }
    if (
      column === 0 ||
      p.edges[column - 1].history.firstInternalPage !==
        edge.history.firstInternalPage
    ) {
      scene.label(
        x,
        top - 8,
        edge.history.firstInternalPage === null
          ? "still boundary"
          : `inside p${edge.history.firstInternalPage}`,
        "start",
        8
      )
    }
    if (collapsedInternal || selfLoop) {
      scene.path(
        {
          ...edge,
          description: `${collapsedInternal ? "Internal-edge cap" : "Original self-loop"}. ${edge.description}`
        },
        collapsedInternal
          ? `M${x - 4},${sy - 4} V${sy + 4} H${x + 4} V${sy - 4}`
          : `M${x - 4},${sy} V${sy - 10} H${x + 4} V${sy} L${x + 1},${sy - 3}`,
        color,
        2
      )
    } else {
      scene.path(
        edge,
        `M${x},${sy} V${ty}`,
        color,
        1.6,
        edge.subdued ? 0.45 : 1
      )
      scene.circle(
        {
          ...edge,
          id: `${edge.id}:source`,
          description: `Source ${edge.source}. ${edge.description}`
        },
        x,
        sy,
        3,
        color
      )
      const direction = ty > sy ? 1 : -1
      scene.path(
        {
          ...edge,
          id: `${edge.id}:target`,
          description: `Target ${edge.targetNode}. ${edge.description}`
        },
        `M${x - 4},${ty - direction * 5} L${x},${ty} L${x + 4},${ty - direction * 5}`,
        color,
        2
      )
    }
    if (edge.subdued) scene.label(x + 3, top - 20, "/", "middle", 13)
  }
  p.pages.forEach((previous, i) =>
    scene.label(left - 12, 36 + i * 18, `Page ${previous.ordinal}`, "end", 10)
  )
  for (const [i, connectionType] of (
    ["internal", "boundary"] as const
  ).entries()) {
    const x = left + i * 115
    scene.sceneEdges.push({
      type: "line",
      id: `legend:${connectionType}`,
      interactive: false,
      x1: x,
      x2: x + 16,
      y1: height - 19,
      y2: height - 19,
      datum: { kind: "legend", connectionType },
      style: { stroke: scene.edgeColors[connectionType], strokeWidth: 2 }
    })
    scene.label(
      x + 21,
      height - 16,
      connectionType === "internal" ? "Intra-group" : "Inter-group",
      "start",
      9
    )
  }
  scene.label(
    left,
    height - 3,
    "● source · chevron target · filled history = internal · / indirect structural path",
    "start",
    9
  )
  return scene.result()
}
