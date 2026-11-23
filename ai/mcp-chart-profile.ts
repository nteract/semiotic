import { isDataRecord } from "../src/components/charts/shared/dataRecords"
import { inferNodesFromEdges } from "../src/components/charts/shared/inferNodesFromEdges"
import { normalizeLineChartData } from "../src/components/charts/shared/lineChartData"

function profileHierarchy(root: Record<string, unknown>, key: string) {
  const data: Record<string, unknown>[] = []
  function visit(node: unknown): unknown {
    if (!isDataRecord(node)) return node
    data.push(node)
    const children = node[key]
    if (!Array.isArray(children)) return key === "children" ? node : { ...node, children: undefined }
    return { ...node, children: children.map(visit) }
  }
  const rawInput = visit(root)
  return { data, rawInput }
}

export function chartProfileInput(args: {
  component: string
  data?: unknown[]
  props?: Record<string, unknown>
}): {
  data: Record<string, unknown>[]
  rawInput?: unknown
} {
  const props = args.props ?? {}
  const rows = args.data ?? props.data
  if (Array.isArray(rows)) {
    const key = typeof props.lineDataAccessor === "string" ? props.lineDataAccessor : "coordinates"
    if (args.component === "LineChart" && Array.isArray(rows[0]?.[key])) {
      const lineBy = typeof props.lineBy === "string" ? props.lineBy : undefined
      return { data: normalizeLineChartData(rows.filter(isDataRecord), key, lineBy).rows }
    }
    return { data: rows as Record<string, unknown>[] }
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
    if (Array.isArray(nodes)) {
      const { startTimeAccessor, endTimeAccessor } = props
      const customTimes = args.component === "ProcessSankey" &&
        (typeof startTimeAccessor === "string" || typeof endTimeAccessor === "string")
      const timedEdges = customTimes ? edges.map(edge => isDataRecord(edge) ? {
        ...edge,
        ...(typeof startTimeAccessor === "string" && { startTime: edge[startTimeAccessor], start: edge[startTimeAccessor] }),
        ...(typeof endTimeAccessor === "string" && { endTime: edge[endTimeAccessor], end: edge[endTimeAccessor] })
      } : edge) : edges
      return { data: [], rawInput: { nodes, edges: timedEdges } }
    }
  }
  if (isDataRecord(props.data)) {
    const key = props.childrenAccessor
    const childrenKey = typeof key === "string" ? key : "children"
    if (Array.isArray(props.data[childrenKey])) return profileHierarchy(props.data, childrenKey)
    return { data: [], rawInput: props.data }
  }
  return { data: [] }
}
