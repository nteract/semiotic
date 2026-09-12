import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import type {
  NetworkCurvedEdge,
  NetworkLabel,
  NetworkSceneNode
} from "../../stream/networkTypes"
import {
  offsetTransitPath,
  roundedTransitPath,
  type TransitDiagramPoint
} from "../transitDiagramGeometry"
import { prefixIdFor } from "./ids"
import type { MotifBraidProjection, TrajectoryGroup } from "./braid"

export type MotifBraidLayoutConfig = {
  braid: MotifBraidProjection
}

type PrefixTreeNode = {
  id: string
  state: string
  depth: number
  parent?: PrefixTreeNode
  children: Map<string, PrefixTreeNode>
  signatures: Set<string>
}

const FALSE_ROOT_ID = ""

function steppedRoute(
  from: TransitDiagramPoint,
  to: TransitDiagramPoint
): TransitDiagramPoint[] {
  if (Math.abs(from.y - to.y) < 0.5) return [from, to]
  if (Math.abs(from.x - to.x) < 0.5) return [from, to]
  return [from, { x: from.x, y: to.y }, to]
}

function packCenters(widths: number[], gap: number): number[] {
  if (widths.length === 0) return []
  if (widths.length === 1) return [0]
  const total =
    widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)
  let cursor = -total / 2
  return widths.map((width) => {
    const center = cursor + width / 2
    cursor += width + gap
    return center
  })
}

function strokeWidthFor(count: number, maxCount: number): number {
  const minWidth = 2
  const maxWidth = 16
  if (maxCount <= 0) return minWidth
  return minWidth + (count / maxCount) * (maxWidth - minWidth)
}

function buildPrefixTree(groups: readonly TrajectoryGroup[]): PrefixTreeNode {
  const root: PrefixTreeNode = {
    id: FALSE_ROOT_ID,
    state: FALSE_ROOT_ID,
    depth: 0,
    children: new Map(),
    signatures: new Set()
  }
  for (const group of groups) {
    let cursor = root
    cursor.signatures.add(group.signature)
    for (const state of group.nodePath) {
      const id = prefixIdFor(group.nodePath, cursor.depth)
      let child = cursor.children.get(state)
      if (!child) {
        child = {
          id,
          state,
          depth: cursor.depth + 1,
          parent: cursor,
          children: new Map(),
          signatures: new Set()
        }
        cursor.children.set(state, child)
      }
      child.signatures.add(group.signature)
      cursor = child
    }
  }
  return root
}

function visitTree(
  node: PrefixTreeNode,
  visit: (node: PrefixTreeNode) => void
): void {
  visit(node)
  for (const child of node.children.values()) visitTree(child, visit)
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Stepped dendrogram of journey types. A hidden false root orders forests that
 * do not share a prefix. Shared steps are parallel offset tracks; a lone path
 * is a simple rounded stroke. Stroke width is that strand's magnitude.
 */
export const motifBraidLayout: NetworkCustomLayout<MotifBraidLayoutConfig> = (
  ctx
) => {
  const braid = ctx.config.braid
  const plot = ctx.dimensions.plot
  const groups = braid.groups
  const partitions = braid.atlas.spec.comparison?.partitions ?? [
    ...new Set(groups.map((group) => group.partition))
  ]
  const renderedGroups = groups.filter((group) =>
    partitions.includes(group.partition)
  )
  const renderedSignatures = new Set(
    renderedGroups.map((group) => group.signature)
  )
  const panelCount = Math.max(partitions.length, 1)
  const panelHeight = plot.height / panelCount
  const signatureOrder =
    braid.signatureOrder.length > 0
      ? braid.signatureOrder.filter((signature) =>
          renderedSignatures.has(signature)
        )
      : [...renderedSignatures]
  const tree = buildPrefixTree(renderedGroups)
  const maxDepth = Math.max(
    ...renderedGroups.map((group) => group.nodePath.length),
    1
  )
  const maxCount = Math.max(
    ...renderedGroups.map((group) => group.entityCount),
    1
  )
  const colWidth = plot.width / (maxDepth + 0.5)
  const sceneEdges: NetworkCurvedEdge[] = []
  const sceneNodes: NetworkSceneNode[] = []
  const labels: NetworkLabel[] = []

  const leafY = (panelTop: number, signature: string) => {
    const slot = Math.max(0, signatureOrder.indexOf(signature))
    const slotHeight = Math.max(
      18,
      (panelHeight - 36) / Math.max(signatureOrder.length, 1)
    )
    return panelTop + 28 + slot * slotHeight + slotHeight / 2
  }

  const nodePoint = (
    node: PrefixTreeNode,
    panelTop: number
  ): TransitDiagramPoint => {
    const signatures = [...node.signatures].sort(
      (left, right) =>
        signatureOrder.indexOf(left) - signatureOrder.indexOf(right)
    )
    const x =
      node.depth === 0 ? plot.x : plot.x + 12 + (node.depth - 0.5) * colWidth
    return {
      x,
      y: mean(signatures.map((signature) => leafY(panelTop, signature)))
    }
  }

  const emitTrack = (
    points: TransitDiagramPoint[],
    group: TrajectoryGroup,
    key: string,
    offset: number
  ) => {
    if (points.length < 2) return
    const path = offset === 0 ? points : offsetTransitPath(points, offset)
    const width = strokeWidthFor(group.entityCount, maxCount)
    const strandIndex = Math.max(0, signatureOrder.indexOf(group.signature))
    const stroke =
      ctx.theme.categorical[strandIndex] ??
      ctx.resolveColor(`strand:${strandIndex}`)
    sceneEdges.push({
      type: "curved",
      id: key,
      pathD: roundedTransitPath(path, 8),
      style: {
        fill: "none",
        stroke,
        strokeWidth: width,
        strokeLinecap: "round"
      },
      datum: {
        kind: "braid-track",
        groupId: group.id,
        signature: group.signature,
        partition: group.partition,
        entityCount: group.entityCount,
        falseRoot: false
      }
    })
  }

  const drawCorridor = (
    from: TransitDiagramPoint,
    to: TransitDiagramPoint,
    strands: TrajectoryGroup[],
    key: string
  ) => {
    const ordered = [...strands].sort(
      (left, right) =>
        signatureOrder.indexOf(left.signature) -
        signatureOrder.indexOf(right.signature)
    )
    const widths = ordered.map((group) =>
      strokeWidthFor(group.entityCount, maxCount)
    )
    const centers = packCenters(widths, 2)
    const base = steppedRoute(from, to)
    ordered.forEach((group, index) => {
      emitTrack(base, group, `${key}:${group.id}`, centers[index] ?? 0)
    })
  }

  partitions.forEach((partition, panelIndex) => {
    const panelTop = plot.y + panelIndex * panelHeight
    if (partition) {
      labels.push({
        x: plot.x + 8,
        y: panelTop + 14,
        text: String(partition),
        fill: ctx.theme.semantic.primary ?? "#333",
        fontSize: 12,
        anchor: "start"
      })
    }
    const panelGroups = groups.filter((group) => group.partition === partition)
    if (panelGroups.length === 0) return

    visitTree(tree, (node) => {
      if (node.depth === 0) return
      const parent = node.parent!
      const strands = panelGroups.filter((group) =>
        node.signatures.has(group.signature)
      )
      if (strands.length === 0) return
      if (parent.depth === 0) {
        const start = nodePoint(node, panelTop)
        const leading = { x: plot.x + 8, y: start.y }
        drawCorridor(
          leading,
          start,
          strands,
          `lead:${partition ?? "all"}:${node.id}`
        )
        return
      }
      drawCorridor(
        nodePoint(parent, panelTop),
        nodePoint(node, panelTop),
        strands,
        `step:${partition ?? "all"}:${node.id}`
      )
    })

    for (const group of panelGroups) {
      let leaf = tree
      for (const state of group.nodePath) {
        leaf = leaf.children.get(state) ?? leaf
      }
      const from = nodePoint(leaf, panelTop)
      const to = {
        x: plot.x + plot.width - 8,
        y: leafY(panelTop, group.signature)
      }
      drawCorridor(from, to, [group], `tail:${group.id}`)
      labels.push({
        x: to.x - 4,
        y: to.y,
        text: group.nodePath[group.nodePath.length - 1] ?? group.signature,
        fill:
          ctx.theme.categorical[
            Math.max(0, signatureOrder.indexOf(group.signature))
          ] ?? ctx.resolveColor(`strand:${group.signature}`),
        fontSize: 10,
        anchor: "end",
        baseline: "middle"
      })
    }
  })

  return { sceneNodes, sceneEdges, labels }
}
