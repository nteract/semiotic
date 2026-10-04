import type { NetworkCustomLayout } from "../../../stream/networkCustomLayout"
import type { ResolutionAppearance } from "./appearance"
import type { ResolutionProjection } from "./project"
import { sceneBuilder, shortLabel } from "./scene"

export interface ResolutionLayoutConfig {
  projection: ResolutionProjection
  appearance?: ResolutionAppearance
}

/** Fixed source rows, within-page graph edges, separate membership gutters and cycle accounts. */
export const resolutionAtlasLayout: NetworkCustomLayout<
  ResolutionLayoutConfig
> = (ctx) => {
  const { projection: p } = ctx.config,
    scene = sceneBuilder(ctx.theme, ctx.config.appearance, p.generationCount)
  const width = ctx.dimensions.plot.width,
    height = ctx.dimensions.plot.height
  const panelWidth = width / Math.max(1, p.pages.length),
    capsuleWidth = Math.min(116, panelWidth * 0.48)
  const top = 65,
    bottom = 78,
    rowHeight = Math.max(
      1,
      (height - top - bottom) / Math.max(1, p.rowOrder.length)
    )
  const y = (row: number) => top + (row + 0.5) * rowHeight
  const rowIndex = new Map(p.rowOrder.map((id, row) => [id, row]))
  const section = new Map(p.sections.map((s) => [s.nodeId, s.sectionId]))
  const anchors = new Map<string, { x: number; y: number }>()
  for (let i = 0; i < p.pages.length; i++) {
    const page = p.pages[i],
      x = panelWidth * (i + 0.42)
    scene.label(x, 13, `Page ${page.ordinal}`, "middle", 13)
    const names: Record<string, string> = {
      "fold-serial-interiors": "Serial interiors",
      "fold-pendant-fans": "Pendant fans",
      "contain-scc": "Contain feedback",
      "group-authored": "Authored groups",
      "annotate-dag-transitivity": "Reachability reading"
    }
    scene.label(
      x,
      30,
      shortLabel(
        page.label
          .split(" + ")
          .map((name) => names[name] ?? name)
          .join(" + "),
        27
      ),
      "middle",
      10
    )
    scene.label(
      x,
      46,
      `${page.groupIds.length} blocks · ${page.boundaryEdgeCount} boundary edges`,
      "middle",
      9
    )
    const groups = p.groups.filter((group) => group.pageId === page.id)
    for (const group of groups) {
      // Only gaps occupied by other groups split a capsule. Section boundaries
      // describe members; contiguous members still form one aggregation.
      const fragments: number[][] = []
      for (const row of group.rows) {
        const last = fragments.at(-1)
        if (last && row === last.at(-1)! + 1) last.push(row)
        else fragments.push([row])
      }
      anchors.set(JSON.stringify([page.id, group.groupId]), {
        x,
        y: y(group.rows[0])
      })
      fragments.forEach((rows, fragment) => {
        const y0 = y(rows[0]) - rowHeight * 0.4,
          h = (rows.length - 1) * rowHeight + rowHeight * 0.8
        const members = rows.map((row) => p.rowOrder[row])
        const sections = [
          ...new Set(members.map((id) => section.get(id)).filter(Boolean))
        ]
        const sectionLabel = sections.join(" + ")
        const part =
          fragments.length > 1
            ? `Part ${fragment + 1}/${fragments.length}: ${members.join(", ")}. One component across ${fragments.length} parts; ${group.nodeIds.length} nodes and ${group.internalEdges} internal edges in total. `
            : ""
        scene.rect(
          {
            ...group,
            id: `${group.id}:fragment:${fragment}`,
            description:
              part +
              group.description +
              (sectionLabel ? `; sections: ${sectionLabel}` : "")
          },
          x - capsuleWidth / 2,
          y0,
          capsuleWidth,
          Math.max(5, h),
          undefined,
          undefined,
          "component",
          page.ordinal
        )
        {
          const icon =
            group.kind === "scc"
              ? "↻ "
              : group.kind === "authored-group"
                ? "▏"
                : ""
          const suffix =
            fragments.length > 1 ? ` ${fragment + 1}/${fragments.length}` : ""
          scene.label(
            x,
            y0 + Math.min(h / 2 + 3, 15),
            shortLabel(
              `${icon}${group.label}`,
              Math.max(3, Math.floor(capsuleWidth / 6) - suffix.length)
            ) + suffix,
            "middle",
            10,
            true
          )
          if (h > 34)
            scene.label(
              x,
              y0 + 29,
              fragments.length > 1
                ? `${members.length} of ${group.nodeIds.length} nodes`
                : `${group.nodeIds.length} nodes · ${group.internalEdges} inside`,
              "middle",
              9,
              true
            )
          if ((sections.length > 1 || fragments.length > 1) && h > 49)
            scene.label(
              x,
              y0 + 43,
              shortLabel(sectionLabel, 18),
              "middle",
              9,
              true
            )
        }
        if (fragment > 0)
          scene.path(
            { ...group, id: `${group.id}:bracket:${fragment}` },
            `M${x - capsuleWidth / 2},${y(fragments[fragment - 1].at(-1)!)} H${x - capsuleWidth / 2 - 7} V${y(rows[0])} H${x - capsuleWidth / 2}`,
            scene.colors.primary,
            1.5,
            1,
            "bracket"
          )
      })
      for (const nodeId of group.labelPortals) {
        const row = rowIndex.get(nodeId)
        if (row !== undefined)
          scene.label(
            x + capsuleWidth / 2 - 3,
            y(row) + 3,
            `↳ ${shortLabel(nodeId, 10)} (portal)`,
            "end",
            8,
            true
          )
      }
    }
    for (const [edgeIndex, edge] of p.edges.entries()) {
      const from = page.nodeOwner[edge.source],
        to = page.nodeOwner[edge.targetNode]
      if (
        (from === to && edge.source !== edge.targetNode) ||
        !anchors.has(JSON.stringify([page.id, from])) ||
        !anchors.has(JSON.stringify([page.id, to]))
      )
        continue
      const sy = y(rowIndex.get(edge.source)!),
        ty = y(rowIndex.get(edge.targetNode)!)
      const side = ty >= sy ? 1 : -1,
        portX = x + (side * capsuleWidth) / 2
      const laneX = portX + side * (10 + (edgeIndex % 5) * 4)
      if (edge.source === edge.targetNode) {
        // A real self-loop keeps its identity even though it is internal on page zero.
        scene.path(
          {
            ...edge,
            connectionType: "internal",
            id: `${page.id}:${edge.id}:self-loop`
          },
          `M${portX},${sy - 5} C${laneX + 12},${sy - 24} ${laneX + 12},${sy + 24} ${portX},${sy + 5} L${portX + 5},${sy + 3}`,
          scene.edgeColors.internal,
          1.4
        )
        continue
      }
      scene.path(
        { ...edge, connectionType: "boundary", id: `${page.id}:${edge.id}` },
        `M${portX},${sy} H${laneX} V${ty} H${portX} M${portX + side * 5},${ty - 3} L${portX},${ty} L${portX + side * 5},${ty + 3}`,
        scene.edgeColors.boundary,
        1.4,
        edge.subduedPageIds.includes(page.id) ? 0.45 : 0.8
      )
      for (const [nodeId, py, direction] of [
        [edge.source, sy, "out"],
        [edge.targetNode, ty, "in"]
      ] as const) {
        scene.circle(
          {
            ...edge,
            connectionType: "boundary",
            id: `${page.id}:${edge.id}:${direction}`,
            description: `${direction === "in" ? "Ingress" : "Egress"} at original node ${nodeId}. ${edge.description}`
          },
          portX,
          py,
          2,
          scene.edgeColors.boundary
        )
      }
    }
    const barX = x - capsuleWidth / 2,
      barY = height - 51,
      total = page.cycles.sourceRank
    const barMark = groups[0]
    if (barMark) {
      const common = {
        ...barMark,
        description: `Cycle rank: ${page.cycles.internalRank} internal + ${page.cycles.boundaryRank} boundary = ${total}; undirected multigraph`
      }
      const internalWidth = total
        ? (capsuleWidth * page.cycles.internalRank) / total
        : 0
      if (internalWidth)
        scene.rect(
          { ...common, id: `${page.id}:internal-rank` },
          barX,
          barY,
          internalWidth,
          9,
          scene.colors.secondary,
          scene.colors.secondary,
          "cycleInternal",
          page.ordinal
        )
      if (total - page.cycles.internalRank)
        scene.rect(
          { ...common, id: `${page.id}:boundary-rank` },
          barX + internalWidth,
          barY,
          capsuleWidth - internalWidth,
          9,
          scene.colors.primary,
          scene.colors.primary,
          "cycleBoundary",
          page.ordinal
        )
    }
    scene.label(
      x,
      height - 25,
      `Cycles: ${page.cycles.internalRank} inside + ${page.cycles.boundaryRank} between`,
      "middle",
      9
    )
    scene.label(
      x,
      height - 9,
      `${page.originalNodeCount} nodes · ${page.originalEdgeCount} edges`,
      "middle",
      9
    )
  }
  for (const membership of p.memberships) {
    const from = anchors.get(
      JSON.stringify([membership.fromPageId, membership.fromGroupId])
    )
    const to = anchors.get(
      JSON.stringify([membership.toPageId, membership.toGroupId])
    )
    if (!from || !to) continue
    const a = from.x + capsuleWidth / 2 + 32,
      b = to.x - capsuleWidth / 2 - 32
    if (b > a)
      scene.path(
        membership,
        `M${a},${from.y} C${(a + b) / 2},${from.y} ${(a + b) / 2},${to.y} ${b},${to.y}`,
        scene.colors.border,
        0.8,
        1,
        "membership"
      )
  }
  for (let i = 1; i < p.pages.length; i++)
    scene.label(
      panelWidth * i - panelWidth * 0.08,
      58,
      "membership",
      "middle",
      8
    )
  return scene.result()
}
