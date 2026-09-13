import type { NetworkCustomLayout } from "../../stream/networkCustomLayout"
import type { GlyphDef } from "../../stream/glyphDef"
import { getMax } from "../../charts/shared/minMax"
import { mean } from "../recipeUtils"
import type {
  NetworkCurvedEdge,
  NetworkLabel,
  NetworkSceneNode
} from "../../stream/networkTypes"
import {
  roundedTransitPath,
  type TransitDiagramPoint as Point
} from "../transitDiagramGeometry"
import { packBraidLanes, taperedBraidPath } from "./motifBraidGeometry"
import type { MotifBraidProjection, TrajectoryGroup } from "./braid"

export type MotifBraidLayoutConfig = {
  braid: MotifBraidProjection
}

const STEP_GLYPH: GlyphDef = {
  viewBox: [24, 24],
  parts: [
    {
      d: "M5,0 H19 Q24,0 24,5 V19 Q24,24 19,24 H5 Q0,24 0,19 V5 Q0,0 5,0 Z",
      stroke: "accent"
    }
  ]
}

type PrefixStep = {
  id: string
  state: string
  depth: number
  signatures: Set<string>
}

// Signatures already escape embedded separators during atlas preparation.
function pathPrefixes(signature: string): string[] {
  let prefix = ""
  return signature
    .split(">")
    .map((state, i) => (prefix = i ? `${prefix}>${state}` : state))
}

function prefixSteps(groups: readonly TrajectoryGroup[]): PrefixStep[] {
  const steps = new Map<string, PrefixStep>()
  for (const group of groups) {
    const ids = pathPrefixes(group.signature)
    group.nodePath.forEach((state, index) => {
      const id = ids[index]
      let step = steps.get(id)
      if (!step) {
        step = { id, state, depth: index + 1, signatures: new Set() }
        steps.set(id, step)
      }
      step.signatures.add(group.signature)
    })
  }
  return [...steps.values()]
}

const trafficAt = (group: TrajectoryGroup, step: number) =>
  group.stepEntityCounts?.[step] ?? group.entityCount

/**
 * Depth-aligned prefix steps with one labeled square per vertex visit. Each
 * journey keeps its own lane through shared steps and splits only when its
 * prefix diverges. Width interpolates between the two supplied step counts.
 */
export const motifBraidLayout: NetworkCustomLayout<MotifBraidLayoutConfig> = (
  ctx
) => {
  const braid = ctx.config.braid
  const plot = ctx.dimensions.plot
  const partitions = braid.atlas.spec.comparison?.partitions ?? [
    ...new Set(braid.groups.map((group) => group.partition))
  ]
  const groups = braid.groups.filter(
    (group) => partitions.includes(group.partition) && group.nodePath.length > 0
  )
  const sceneEdges: NetworkCurvedEdge[] = []
  const sceneNodes: NetworkSceneNode[] = []
  const labels: NetworkLabel[] = []
  if (groups.length === 0) return { sceneNodes, sceneEdges, labels }

  const signatures = new Set(groups.map((group) => group.signature))
  const signatureOrder = [
    ...new Set([
      ...braid.signatureOrder.filter((signature) => signatures.has(signature)),
      ...signatures
    ])
  ]
  const rank = new Map(signatureOrder.map((signature, i) => [signature, i]))
  const ordered = [...groups].sort(
    (a, b) => rank.get(a.signature)! - rank.get(b.signature)!
  )
  const panelGroupsByIndex = partitions.map((partition) =>
    ordered.filter((group) => group.partition === partition)
  )
  const nodes = prefixSteps(ordered)
  const maxDepth = getMax(nodes.map((node) => node.depth))
  const maxCount = getMax(
    groups.flatMap((group) => group.stepEntityCounts ?? [group.entityCount])
  )
  const strokeWidth = (count: number) =>
    count <= 0 ? 0 : Math.max(1, (10 * count) / maxCount)
  const peakWidth = new Map(
    groups.map((group) => [
      group.id,
      strokeWidth(getMax(group.stepEntityCounts ?? [group.entityCount]))
    ])
  )
  const panelHeight = plot.height / Math.max(partitions.length, 1)
  const ink = ctx.theme.semantic.text ?? "#333"
  const label = (
    x: number,
    y: number,
    text: string,
    style: Partial<NetworkLabel> = {}
  ) =>
    labels.push({
      x,
      y,
      text,
      fill: ink,
      fontSize: 10,
      anchor: "middle",
      ...style
    })
  const strandColor = (group: TrajectoryGroup) =>
    ctx.theme.categorical[rank.get(group.signature)!] ??
    ctx.resolveColor(`strand:${group.signature}`)

  // Reserve the same square size in every comparison panel. This keeps the
  // step columns and lane topology comparable when traffic differs.
  const glyphSize = new Map(
    nodes.map((node) => {
      // Each lane contributes its peak width and a 3 px gap; the remaining
      // 5 px completes the 8 px enclosure without a gap after the last lane.
      const panelWidths = panelGroupsByIndex.map((panelGroups) =>
        panelGroups.reduce(
          (width, group) =>
            width +
            (node.signatures.has(group.signature)
              ? peakWidth.get(group.id)! + 3
              : 0),
          5
        )
      )
      return [node.id, getMax(panelWidths, 24)] as const
    })
  )
  const maxGlyph = getMax([...glyphSize.values()], 24)
  const inset = Math.min(plot.width / 4, maxGlyph / 2 + 16)
  const colWidth = (plot.width - inset * 2) / Math.max(maxDepth - 1, 1)
  const stepX = (depth: number) => plot.x + inset + (depth - 1) * colWidth
  const topInset = 48 + maxGlyph / 2
  const bottomInset = 22 + maxGlyph / 2
  const leafY = (panelTop: number, signature: string) =>
    panelTop +
    topInset +
    ((rank.get(signature)! + 0.5) *
      Math.max(0, panelHeight - topInset - bottomInset)) /
      signatureOrder.length

  const emitTrack = (
    points: Point[],
    group: TrajectoryGroup,
    id: string,
    fromStep: number,
    toStep: number
  ) => {
    const fromCount = trafficAt(group, fromStep)
    const toCount = trafficAt(group, toStep)
    const fromWidth = strokeWidth(fromCount)
    const toWidth = strokeWidth(toCount)
    if (fromWidth === 0 && toWidth === 0) return
    const tapered = fromWidth !== toWidth
    const color = strandColor(group)
    sceneEdges.push({
      type: "curved",
      id,
      pathD: tapered
        ? taperedBraidPath(points, fromWidth, toWidth)
        : roundedTransitPath(points, 8),
      style: {
        fill: tapered ? color : "none",
        fillOpacity: 1,
        stroke: tapered ? "none" : color,
        strokeWidth: tapered ? 0 : fromWidth
      },
      datum: {
        kind: "braid-track",
        groupId: group.id,
        signature: group.signature,
        partition: group.partition,
        entityCount: group.entityCount,
        fromStep,
        toStep,
        fromCount,
        toCount,
        falseRoot: false
      },
      accessibleDatum: {
        journey: group.nodePath.join(" → "),
        partition: group.partition ?? "all",
        fromStep: fromStep + 1,
        toStep: toStep + 1,
        fromCount,
        toCount
      }
    })
  }

  partitions.forEach((partition, panelIndex) => {
    const panelTop = plot.y + panelIndex * panelHeight
    const panelGroups = panelGroupsByIndex[panelIndex]
    if (partition)
      label(plot.x + 8, panelTop + 14, partition, {
        fontSize: 12,
        fontWeight: 600,
        anchor: "start"
      })
    if (panelGroups.length === 0) return
    for (let depth = 1; depth <= maxDepth; depth++) {
      label(stepX(depth), panelTop + 34, `Step ${depth}`)
    }

    const ports = new Map<string, Map<string, Point & { offset: number }>>()
    for (const node of nodes) {
      const strands = panelGroups.filter((group) =>
        node.signatures.has(group.signature)
      )
      if (strands.length === 0) continue
      const x = stepX(node.depth)
      const ys = [...node.signatures].map((signature) =>
        leafY(panelTop, signature)
      )
      const y = mean(ys)
      const offsets = packBraidLanes(
        strands.map((group) => peakWidth.get(group.id)!)
      )
      ports.set(
        node.id,
        new Map(
          strands.map((group, i) => [
            group.id,
            { x, y: y + offsets[i], offset: offsets[i] }
          ])
        )
      )
      const size = glyphSize.get(node.id)!
      const accessibleDatum = {
        state: node.state,
        step: node.depth,
        partition: partition ?? "all"
      }
      sceneNodes.push({
        type: "glyph",
        id: `vertex:${partition ?? "all"}:${node.id}`,
        cx: x,
        cy: y,
        size,
        depth: node.depth,
        label: `${node.state} (step ${node.depth})`,
        glyph: STEP_GLYPH,
        accent: ctx.theme.semantic.border ?? "#888",
        style: { fill: ctx.theme.semantic.surface ?? "#fff" },
        datum: {
          kind: "braid-step",
          prefixId: node.id,
          ...accessibleDatum
        },
        accessibleDatum
      })
      label(x, y + size / 2 + 12, node.state)
    }

    for (const group of panelGroups) {
      const path = pathPrefixes(group.signature)
      for (let step = 1; step < path.length; step++) {
        const from = ports.get(path[step - 1])!.get(group.id)!
        const to = ports.get(path[step])!.get(group.id)!
        const bendX = (from.x + to.x) / 2 - Math.sign(to.y - from.y) * to.offset
        const points =
          Math.abs(from.y - to.y) < 1e-8
            ? [from, to]
            : [from, { x: bendX, y: from.y }, { x: bendX, y: to.y }, to]
        emitTrack(
          points,
          group,
          `step:${partition ?? "all"}:${path[step]}:${group.id}`,
          step - 1,
          step
        )
      }
    }
  })
  return { sceneNodes, sceneEdges, labels }
}
