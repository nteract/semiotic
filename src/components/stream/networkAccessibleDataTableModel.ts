import type { Datum } from "../charts/shared/datumTypes"
import {
  extractNetworkDataRow,
  type AccessibleSceneNode,
  type DataRow
} from "./accessibleDataRows"
import { fmt } from "./accessibleDataTableModel"

export type NetworkTableElement = AccessibleSceneNode & {
  id?: string | number
  source?: unknown
  target?: unknown
}

export interface NetworkNodeTableRow {
  id: string
  degree: number
  inDeg: number
  outDeg: number
  wDegree: number
  wInDeg: number
  wOutDeg: number
  semantic: DataRow
}

export interface NetworkTableModel {
  nodeRows: NetworkNodeTableRow[]
  edgeRows: DataRow[]
  hasWeights: boolean
  summary: string
}

function datumRecord(value: unknown): Datum {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Datum)
    : {}
}

function endpointId(value: unknown): unknown {
  return value != null && typeof value === "object"
    ? datumRecord(value).id
    : value
}

function edgeEndpoints(edge: NetworkTableElement) {
  const raw = datumRecord(edge.datum)
  return {
    source: endpointId(raw.source ?? edge.source),
    target: endpointId(raw.target ?? edge.target)
  }
}

/** Derive authored rows and topology metrics without coupling them to React. */
export function buildNetworkTableModel(
  nodes: NetworkTableElement[],
  edges: NetworkTableElement[]
): NetworkTableModel {
  // [incoming, outgoing, weighted incoming, weighted outgoing]
  const degrees = new Map<string, [number, number, number, number]>()
  const edgeRows: DataRow[] = []
  let hasWeights = false

  // Chord ribbons combine parallel rows and reciprocal directions. Expand
  // their retained inputs for tables/degrees without duplicating painted marks.
  const inputEdges = edges.flatMap((edge) => {
    const contributors = datumRecord(edge?.datum).__chordEdges
    return Array.isArray(contributors)
      ? contributors.map((datum) => ({
          ...edge,
          datum,
          accessibleDatum: datumRecord(datum).data ?? datum
        }))
      : [edge]
  })
  for (let index = 0; index < inputEdges.length; index++) {
    const edge = inputEdges[index]
    if (!edge || typeof edge !== "object") continue
    const raw = datumRecord(edge.datum)
    const { source, target } = edgeEndpoints(edge)
    const weighted = typeof raw.value === "number" && Number.isFinite(raw.value)
    const value = weighted ? (raw.value as number) : 0
    hasWeights ||= weighted
    for (const [endpoint, degreeIndex, weightIndex] of [
      [source, 1, 3],
      [target, 0, 2]
    ] as const) {
      if (endpoint == null || endpoint === "") continue
      const id = String(endpoint)
      const values = degrees.get(id) ?? [0, 0, 0, 0]
      values[degreeIndex]++
      values[weightIndex] += value
      degrees.set(id, values)
    }
    const fallbackLabel =
      source != null || target != null
        ? `${source == null ? "?" : String(source)} → ${target == null ? "?" : String(target)}`
        : `Edge ${index + 1}`
    edgeRows.push(extractNetworkDataRow(edge, fallbackLabel))
  }

  const nodeRows: NetworkNodeTableRow[] = []
  let degreeSum = 0
  let maxDegree = 0
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (!node || typeof node !== "object" || node.datum === null) continue
    const rawId = datumRecord(node.datum).id ?? node.id
    const id = rawId != null ? String(rawId) : `node-${index}`
    const [incoming, outgoing, weightedIncoming, weightedOutgoing] =
      degrees.get(id) ?? [0, 0, 0, 0]
    const degree = incoming + outgoing
    degreeSum += degree
    if (degree > maxDegree) maxDegree = degree
    nodeRows.push({
      id,
      degree,
      inDeg: incoming,
      outDeg: outgoing,
      wDegree: weightedIncoming + weightedOutgoing,
      wInDeg: weightedIncoming,
      wOutDeg: weightedOutgoing,
      semantic: extractNetworkDataRow(node, id)
    })
  }
  nodeRows.sort((a, b) => b.degree - a.degree)

  const summaryParts = [`${nodeRows.length} nodes, ${edgeRows.length} edges.`]
  if (nodeRows.length > 0) {
    summaryParts.push(
      `Mean degree: ${fmt(degreeSum / nodeRows.length)}, max degree: ${maxDegree}.`
    )
  }

  return {
    nodeRows,
    edgeRows,
    hasWeights,
    summary: summaryParts.join(" ")
  }
}
