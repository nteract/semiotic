import { scaleLinear } from "d3-scale"
import { getMinMax } from "../../charts/shared/minMax"
import type { Datum } from "../../charts/shared/datumTypes"
import type { RealtimeNode } from "../networkTypes"

/**
 * Build a function that returns a node radius. If `nodeSize` is a number,
 * use it directly. If it is a string accessor, look up `node.data[nodeSize]`
 * and scale the result to `nodeSizeRange`. If it is a function, call it.
 * Falls back to a default radius of 8.
 *
 * Lives outside `forceLayoutPlugin` so the force worker client can serialize
 * radii without importing d3-force.
 */
export function resolveNodeSizeFn(
  nodeSize: number | string | ((d: Datum) => number) | undefined,
  nodeSizeRange: [number, number] | undefined,
  allNodes: RealtimeNode[]
): (node: RealtimeNode) => number {
  if (allNodes.some((node) => node.__forceRadius != null)) {
    return (node: RealtimeNode) => node.__forceRadius ?? 8
  }
  if (nodeSize == null) {
    return () => 8
  }

  if (typeof nodeSize === "number") {
    return () => nodeSize
  }

  if (typeof nodeSize === "function") {
    return (node: RealtimeNode) => nodeSize(node) || 8
  }

  const range = nodeSizeRange || [5, 20]

  const values: number[] = []
  for (const node of allNodes) {
    const value = node.data?.[nodeSize]
    if (typeof value === "number") values.push(value)
  }

  if (values.length === 0) {
    return () => range[0]
  }

  const [domainMin, domainMax] = getMinMax(values)

  if (domainMin === domainMax) {
    return () => (range[0] + range[1]) / 2
  }

  const scale = scaleLinear()
    .domain([domainMin, domainMax])
    .range(range)
    .clamp(true)

  return (node: RealtimeNode) => {
    const raw = node.data?.[nodeSize]
    if (raw == null || typeof raw !== "number") return range[0]
    return scale(raw)
  }
}
