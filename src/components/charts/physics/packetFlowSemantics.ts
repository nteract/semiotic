import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicalFlowProjectionMetadata } from "./physicsChartUtils"

export function formatPhysicalFlowThroughput(value: number): string {
  return Math.abs(value) >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function physicalFlowPathD(
  points: PhysicalFlowProjectionMetadata["links"][number]["path"]
): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
}

/** Build keyboard/reader targets from the authored throughput routes. */
export function physicalFlowSemanticItems(
  metadata: PhysicalFlowProjectionMetadata | undefined
): PhysicsSemanticItem[] {
  if (!metadata) return []
  return metadata.links.map((link) => {
    const mid = link.path[Math.floor(link.path.length / 2)] ?? link.path[0]
    const label = `${link.sourceLabel} to ${link.targetLabel}: ${formatPhysicalFlowThroughput(link.throughput)} throughput, ${link.packetCount} packets`
    return {
      id: link.id,
      label,
      description: label,
      datum: link,
      x: mid?.x ?? 0,
      y: mid?.y ?? 0,
      shape: "path" as const,
      pathData: physicalFlowPathD(link.path),
      group: "flow"
    }
  })
}
