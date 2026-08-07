import type {
  ProcessSankeyEdge,
  ProcessSankeyNode,
  ProcessSankeySlot,
} from "./algorithm"
import { bondedSlotOrder } from "./orderingBond"

export interface BoundaryHubMetrics {
  crossings: number
  cost: number
}

export function acceptsBoundaryHubCandidate<T extends BoundaryHubMetrics>(
  candidate: Pick<T, "crossings" | "cost">,
  current: Pick<T, "crossings" | "cost">,
  centeringAllowance = 0,
): boolean {
  return candidate.crossings < current.crossings ||
    (candidate.crossings === current.crossings &&
      candidate.cost <= current.cost + centeringAllowance)
}

interface CenterBoundaryHubsOptions<T extends BoundaryHubMetrics> {
  order: ProcessSankeySlot[]
  after: T
  nodes: readonly ProcessSankeyNode[]
  edges: readonly ProcessSankeyEdge[]
  outgoingPartners: ReadonlyMap<string, ReadonlySet<string>>
  incomingPartners: ReadonlyMap<string, ReadonlySet<string>>
  slotForNode: ReadonlyMap<string, ProcessSankeySlot>
  averageGap: number
  evaluate: (order: readonly ProcessSankeySlot[]) => T
}

/** Center boundary fan hubs while bounding the cost of the topology correction. */
export function centerBoundaryHubs<T extends BoundaryHubMetrics>({
  order,
  after,
  nodes,
  edges,
  outgoingPartners,
  incomingPartners,
  slotForNode,
  averageGap,
  evaluate,
}: CenterBoundaryHubsOptions<T>): { order: ProcessSankeySlot[]; after: T } {
  const centerBoundaryHub = (
    hub: ProcessSankeySlot,
    partners: readonly ProcessSankeySlot[],
  ): void => {
    const partnerPositions = [...new Set(partners.map((slot) => order.indexOf(slot)))]
      .sort((a, b) => a - b)
    const hubPosition = order.indexOf(hub)
    const first = partnerPositions[0]
    const last = partnerPositions[partnerPositions.length - 1]
    if (partnerPositions.length < 3 || !partnerPositions.includes(hubPosition) ||
        last - first + 1 !== partnerPositions.length ||
        Math.abs(hubPosition * 2 - first - last) <= 1) return
    const candidate = [...order]
    candidate.splice(hubPosition, 1)
    candidate.splice((first + last) >> 1, 0, hub)
    const projected = bondedSlotOrder(candidate)
    const metrics = evaluate(projected)
    const hubIds = new Set(hub.occupants.map((occupant) => occupant.id))
    const partnerIds = new Set(partners.flatMap((slot) => slot.occupants.map((occupant) => occupant.id)))
    const fanWeight = edges.reduce((total, edge) => {
      const connectsHub = (hubIds.has(edge.source) && partnerIds.has(edge.target)) ||
        (hubIds.has(edge.target) && partnerIds.has(edge.source))
      return connectsHub ? total + (edge.value > 0 ? edge.value : 1) : total
    }, 0)
    // Centering a large fan is an authored topology constraint. Permit only
    // the cost attributable to correcting its lane displacement; unrelated
    // route-cost regressions must still be rejected.
    const centeringAllowance = Math.abs(hubPosition * 2 - first - last) *
      averageGap * Math.max(1, fanWeight)
    if (acceptsBoundaryHubCandidate(metrics, after, centeringAllowance)) {
      order = projected
      after = metrics
    }
  }

  // Boundary fans meet through their middle row, not whichever edge is widest.
  for (const [source, partners] of outgoingPartners) {
    if (!incomingPartners.has(source) && partners.size >= 3) {
      centerBoundaryHub(
        slotForNode.get(source)!,
        [...partners].map((id) => slotForNode.get(id)!),
      )
    }
  }
  for (const node of nodes) {
    const hub = slotForNode.get(node.id)!
    if (!node.group && hub.group && (incomingPartners.get(node.id)?.size ?? 0) >= 3) {
      // Use the actual incoming fan, not every member of the sink's bonded
      // group; unrelated occupants must not widen the centering span.
      centerBoundaryHub(
        hub,
        [...(incomingPartners.get(node.id) ?? [])]
          .map((id) => slotForNode.get(id)!)
          .filter((slot) => slot === hub || slot.group === hub.group)
          .filter((slot, index, all) => all.indexOf(slot) === index),
      )
    }
  }
  return { order, after }
}
