import type { ResolutionMark } from "./project"
import type { SetRef } from "./types"
import type { CutawayProjection } from "./componentCutawayLayout"
import { sceneBuilder, shortLabel } from "./scene"

/** Original nodes and directed edges, including the outside neighbors of real ports. */
export function drawCutawayGraph(
  scene: ReturnType<typeof sceneBuilder>,
  cutaway: CutawayProjection,
  selected: CutawayProjection["value"]["cells"][number] | undefined,
  width: number,
  height: number
) {
  const { context, ingress, egress } = cutaway.value
  const witness =
    selected?.result.verdict === "yes" ? selected.result.witness : undefined
  const witnessNodes = new Set(witness?.nodeIds ?? [])
  const witnessEdges = new Set(witness?.edgeIds ?? [])
  const entry = ingress.find(
    (p) => p.id === selected?.query.ingressId
  )?.internalNodeId
  const exit = egress.find(
    (p) => p.id === selected?.query.egressId
  )?.internalNodeId
  const mark = (
    id: string,
    target: ResolutionMark["target"],
    set: SetRef,
    description: string,
    nodeIds: string[],
    edgeIds: string[] = []
  ): ResolutionMark => ({
    id,
    target,
    description,
    label: description,
    nodeIds,
    edgeIds,
    selection: {
      revision: cutaway.revision,
      analysisRevision: cutaway.analysisRevision,
      target: { kind: "source-set", set }
    }
  })
  const columns = [0, 1, 2, 3, 4].map(() => [] as typeof context.nodes)
  for (const node of context.nodes) {
    const column = node.inside
      ? node.entry && !node.exit
        ? 1
        : node.exit && !node.entry
          ? 3
          : 2
      : context.edges.some((e) => e.source === node.id)
        ? 0
        : 4
    columns[column].push(node)
  }
  const positions = new Map<string, { x: number; y: number }>()
  const x = [32, width * 0.28, width * 0.5, width * 0.72, width - 32]
  columns.forEach((nodes, column) =>
    nodes.forEach((node, row) => {
      positions.set(node.id, {
        x: x[column],
        y: 45 + ((row + 0.5) * (height - 70)) / Math.max(1, nodes.length)
      })
    })
  )
  // Decorative enclosure; it must not obscure or compete with the actual edges.
  scene.sceneEdges.push({
    type: "curved",
    id: "cutaway:enclosure",
    interactive: false,
    pathD: `M${width * 0.18},${height - 12} V27 H${width * 0.82} V${height - 12} Z`,
    datum: { kind: "enclosure" },
    style: scene.style(
      {
        datum: { kind: "enclosure" },
        role: "bracket",
        highlighted: false,
        selected: true
      },
      {
        fill: "none",
        stroke: scene.colors.border,
        strokeWidth: 1,
        strokeDasharray: "4 3"
      }
    )
  })
  scene.label(width / 2, 16, shortLabel(context.label, 36), "middle", 12)
  scene.label(4, 16, "Incoming", "start", 10)
  scene.label(width - 4, 16, "Outgoing", "end", 10)
  const parallelCounts = new Map<string, number>()
  for (const edge of context.edges) {
    const a = positions.get(edge.source)!,
      b = positions.get(edge.target)!
    const key = JSON.stringify([edge.source, edge.target])
    const parallel = parallelCounts.get(key) ?? 0
    parallelCounts.set(key, parallel + 1)
    let path: string
    if (edge.source === edge.target) {
      const reach = 26 + parallel * 8
      path = `M${a.x + 6},${a.y - 3} C${a.x + reach},${a.y - reach} ${a.x + reach},${a.y + reach} ${a.x + 6},${a.y + 3} l7,0 m-7,0 l3,6`
    } else {
      const distance = Math.hypot(b.x - a.x, b.y - a.y)
      const ux = (b.x - a.x) / distance,
        uy = (b.y - a.y) / distance
      const start = { x: a.x + ux * 10, y: a.y + uy * 10 }
      const end = { x: b.x - ux * 11, y: b.y - uy * 11 }
      const bend = a.x === b.x ? 28 : 12 + parallel * 12
      const cx = (start.x + end.x) / 2 - uy * bend
      const cy = (start.y + end.y) / 2 + ux * bend
      const angle = Math.atan2(end.y - cy, end.x - cx)
      path = `M${start.x},${start.y} Q${cx},${cy} ${end.x},${end.y} M${end.x - 7 * Math.cos(angle - 0.5)},${end.y - 7 * Math.sin(angle - 0.5)} L${end.x},${end.y} L${end.x - 7 * Math.cos(angle + 0.5)},${end.y - 7 * Math.sin(angle + 0.5)}`
    }
    const highlighted = witnessEdges.has(edge.id)
    scene.path(
      {
        ...mark(
          `cutaway:edge:${edge.id}`,
          { kind: "original-edge", edgeId: edge.id },
          edge.sourceSet,
          `${edge.id}: ${edge.source} → ${edge.target}; ${edge.internal ? "inside component" : "boundary connection"}${highlighted ? "; supporting path" : ""}`,
          [edge.source, edge.target],
          [edge.id]
        ),
        connectionType: edge.internal ? "internal" : "boundary"
      },
      path,
      highlighted
        ? scene.colors.success
        : edge.internal
          ? scene.edgeColors.internal
          : scene.edgeColors.boundary,
      highlighted ? 3 : 1.5,
      1,
      highlighted ? "cutawayWitness" : "edge"
    )
  }
  for (const node of context.nodes) {
    const p = positions.get(node.id)!
    const isEntry = node.id === entry,
      isExit = node.id === exit
    const onPath = witnessNodes.has(node.id)
    const role = isEntry
      ? "cutawayEntry"
      : isExit
        ? "cutawayExit"
        : onPath
          ? "cutawayWitness"
          : "cutawayNode"
    const color = isEntry
      ? scene.colors.primary
      : isExit
        ? scene.colors.secondary
        : onPath
          ? scene.colors.success
          : scene.colors.border
    const description = `${node.id}; ${node.inside ? "inside component" : "outside neighbor"}${isEntry ? "; selected entry" : ""}${isExit ? "; selected exit" : ""}${onPath ? "; supporting path" : ""}`
    scene.rect(
      mark(
        `cutaway:node:${node.id}`,
        { kind: "original-node", nodeId: node.id },
        node.sourceSet,
        description,
        [node.id]
      ),
      p.x - 6,
      p.y - 6,
      12,
      12,
      scene.colors.surface,
      color,
      role,
      undefined,
      isEntry || isExit || onPath ? 3 : 1.2
    )
    scene.label(p.x, p.y - 14, shortLabel(node.id, 15), "middle", 11, true)
  }
}
