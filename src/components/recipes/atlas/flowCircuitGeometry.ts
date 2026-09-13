import { processStageLayout } from "../processPhysics"
import { physicalFlowPathD } from "../../charts/physics/packetFlowSemantics"
import type { CircuitGeometry, FlowCircuitProjection } from "./flowCircuitTypes"

/** One geometry object owns the module, queue, sensor and original-edge routes. */
export function layoutFlowCircuit(
  circuit: FlowCircuitProjection,
  width: number,
  height: number
): CircuitGeometry {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 360 ||
    height < 300
  )
    throw new Error("Circuit geometry needs at least 360 × 300 pixels")
  const sections = [...circuit.atlas.sections.sectionIds]
  if (circuit.atlas.source.nodes.some((node) => !node.sectionId))
    sections.push("Unsectioned")
  const stage = processStageLayout({
    width,
    height: height - 110,
    padX: 22,
    padY: 70,
    stages: sections.map((id) => ({ id })),
    shape: "lane"
  })
  const sectionByNode = new Map(
    circuit.atlas.source.nodes.map((node) => [
      node.id,
      node.sectionId ?? "Unsectioned"
    ])
  )
  const modules = stage.stages.flatMap((band) => {
    const members = circuit.order.filter(
      (id) => sectionByNode.get(id) === band.id
    )
    const row = (height - 235) / Math.max(1, members.length)
    if (members.length && row < 78)
      throw new Error("Increase circuit height to keep every module readable")
    return members.map((id, index) => {
      const module = circuit.modules.find((item) => item.nodeId === id)!
      const moduleWidth = Math.max(68, Math.min(142, band.width - 56))
      const moduleHeight = Math.min(68, row - 10)
      const x = band.x - moduleWidth / 2
      const y = 95 + (index + 0.5) * row - moduleHeight / 2
      return {
        module,
        x,
        y,
        width: moduleWidth,
        height: moduleHeight,
        queue: {
          x: x + 8,
          y: y + moduleHeight - 8,
          width: moduleWidth - 16,
          height: 4
        },
        sensor: {
          x: x + moduleWidth - 5,
          y: y + moduleHeight / 2 - 4,
          width: 8,
          height: 8
        }
      }
    })
  })
  const byNode = new Map(
    modules.map((region) => [region.module.nodeId, region])
  )
  const residual = new Set(circuit.residualEdgeIds)
  let channel = 0
  const routes = circuit.atlas.source.edges.map((edge) => {
    const source = byNode.get(edge.source)!
    const target = byNode.get(edge.target)!
    const forward = target.x > source.x
    const sameColumn = target.x === source.x
    const portY = (region: typeof source, direction: "in" | "out") => {
      const ports = region.module.ports.filter(
        (port) => port.direction === direction
      )
      const index = ports.findIndex((port) => port.edgeId === edge.id)
      return (
        region.y + 10 + ((index + 0.5) * (region.height - 20)) / ports.length
      )
    }
    const from = {
      x: source.x + (forward || sameColumn ? source.width : 0),
      y: portY(source, "out")
    }
    const to = {
      x: target.x + (forward ? 0 : target.width),
      y: portY(target, "in")
    }
    let points: { x: number; y: number }[]
    if (sameColumn) {
      const side = from.x + 18 + channel++ * 5
      points =
        edge.source === edge.target
          ? [
              from,
              { x: side, y: from.y },
              { x: side, y: source.y - 15 },
              { x: to.x - 8, y: source.y - 15 },
              { x: to.x - 8, y: source.y }
            ]
          : [from, { x: side, y: from.y }, { x: side, y: to.y }, to]
    } else if (
      !forward ||
      Math.abs(
        sections.indexOf(sectionByNode.get(edge.source)!) -
          sections.indexOf(sectionByNode.get(edge.target)!)
      ) > 1
    ) {
      const sign = forward ? 1 : -1
      const y = 62 + channel++ * 7
      points = [
        from,
        { x: from.x + sign * 16, y: from.y },
        { x: from.x + sign * 16, y },
        { x: to.x - sign * 16, y },
        { x: to.x - sign * 16, y: to.y },
        to
      ]
    } else {
      const x = (from.x + to.x) / 2
      points = [from, { x, y: from.y }, { x, y: to.y }, to]
    }
    return {
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      residual: residual.has(edge.id),
      points,
      pathD: physicalFlowPathD(points)
    }
  })
  return {
    width,
    height,
    modules,
    routes,
    sections: stage.stages.map((band) => ({ id: band.id, x: band.x })),
    history: { x: 42, y: height - 88, width: width - 84, height: 46 }
  }
}

/** A bounded visual sample along an authored route, independent of its volume. */
export function circuitRoutePoint(
  points: { x: number; y: number }[],
  fraction: number
) {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - points[index].x, point.y - points[index].y)
    )
  const length = lengths.reduce((sum, value) => sum + value, 0)
  let remaining = Math.max(0, Math.min(1, fraction)) * length
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const t = lengths[index] ? remaining / lengths[index] : 0
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * t,
        y: points[index].y + (points[index + 1].y - points[index].y) * t
      }
    }
    remaining -= lengths[index]
  }
  return points[points.length - 1]
}
