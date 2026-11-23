import { isDataRecord } from "../src/components/charts/shared/dataRecords"
import { inferNodesFromEdges } from "../src/components/charts/shared/inferNodesFromEdges"

export function chartProfileInput(args: {
  component: string
  data?: unknown[]
  props?: Record<string, unknown>
}): {
  data: Record<string, unknown>[]
  rawInput?: unknown
} {
  const props = args.props ?? {}
  if (Array.isArray(args.data)) {
    return { data: args.data as Record<string, unknown>[] }
  }
  if (Array.isArray(props.data)) {
    return { data: props.data as Record<string, unknown>[] }
  }
  const points = args.component === "FlowMap" ? props.nodes : props.points
  if (Array.isArray(props.areas) || Array.isArray(points) || Array.isArray(props.flows)) {
    return {
      data: [],
      rawInput: {
        type: "FeatureCollection",
        features: Array.isArray(props.areas) ? props.areas : [],
        points,
        flows: props.flows
      }
    }
  }
  const edges = props.edges ?? props.links
  if (Array.isArray(edges)) {
    const derivesNodes = ["SankeyDiagram", "ChordDiagram", "ProcessSankey"].includes(args.component)
    const nodes = derivesNodes ? inferNodesFromEdges(
      Array.isArray(props.nodes) ? props.nodes.filter(isDataRecord) : undefined, edges.filter(isDataRecord),
      typeof props.sourceAccessor === "string" ? props.sourceAccessor : "source",
      typeof props.targetAccessor === "string" ? props.targetAccessor : "target"
    ) : props.nodes
    if (Array.isArray(nodes)) return { data: [], rawInput: { nodes, edges } }
  }
  if (
    props.data &&
    typeof props.data === "object" &&
    !Array.isArray(props.data)
  ) {
    return { data: [], rawInput: props.data }
  }
  return { data: [] }
}
