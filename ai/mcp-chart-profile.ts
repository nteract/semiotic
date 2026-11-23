import { isDataRecord } from "../src/components/charts/shared/dataRecords"
import { inferNodesFromEdges } from "../src/components/charts/shared/inferNodesFromEdges"
import { normalizeLineChartData } from "../src/components/charts/shared/lineChartData"

function profileRecords(rows: unknown[], fields: Record<string, unknown>) {
  const aliases = Object.entries(fields).filter((pair): pair is [string, string] =>
    typeof pair[1] === "string" && pair[1] !== pair[0])
  const records = rows.filter(isDataRecord)
  if (!aliases.length) return records
  return records.map(row => ({
    ...row, ...Object.fromEntries(aliases.map(([canonical, authored]) => [canonical, row[authored]]))
  }))
}

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
  seriesField?: string
} {
  const props = args.props ?? {}
  const rows = args.data ?? props.data
  if (Array.isArray(rows)) {
    const key = typeof props.lineDataAccessor === "string" ? props.lineDataAccessor : "coordinates"
    if (args.component === "LineChart") {
      const lineBy = typeof props.lineBy === "string" ? props.lineBy : undefined
      const lines = rows.filter(isDataRecord)
      const normalized = normalizeLineChartData(lines, key, lineBy)
      const parents = new Map(normalized.isLineObjectFormat ? lines.map(line => {
        const { [key]: _coordinates, ...metadata } = line
        return [line, metadata] as const
      }) : [])
      return {
        data: normalized.isLineObjectFormat
          ? normalized.rows.map(row => ({ ...row, parentLine: parents.get(row.parentLine) }))
          : normalized.rows,
        seriesField: typeof normalized.groupAccessor === "string" ? normalized.groupAccessor : undefined
      }
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
        points: Array.isArray(points) ? profileRecords(points, {
          lon: props.xAccessor, lat: props.yAccessor, id: props.nodeIdAccessor ?? props.pointIdAccessor
        }) : undefined,
        flows: Array.isArray(props.flows) ? profileRecords(props.flows, { value: props.valueAccessor }) : undefined
      }
    }
  }
  const edges = props.edges ?? props.links
  if (Array.isArray(edges)) {
    const { sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor } = props
    const records = profileRecords(edges, {
      source: sourceAccessor, target: targetAccessor, value: valueAccessor,
      ...(args.component === "ProcessSankey" && {
        startTime: startTimeAccessor, start: startTimeAccessor, endTime: endTimeAccessor, end: endTimeAccessor
      })
    })
    const explicitNodes = Array.isArray(props.nodes)
      ? profileRecords(props.nodes, { id: props.nodeIdAccessor ?? props.nodeIDAccessor })
      : undefined
    const nodes = ["SankeyDiagram", "ChordDiagram", "ProcessSankey"].includes(args.component)
      ? inferNodesFromEdges(explicitNodes, records, "source", "target")
      : explicitNodes
    if (nodes) return { data: [], rawInput: { nodes, edges: records } }
  }
  if (isDataRecord(props.data)) {
    const key = props.childrenAccessor
    const childrenKey = typeof key === "string" ? key : "children"
    if (Array.isArray(props.data[childrenKey])) return profileHierarchy(props.data, childrenKey)
    return { data: [], rawInput: props.data }
  }
  return { data: [] }
}
