import type { Datum } from "../charts/shared/datumTypes"
import {
  extractNetworkDataRow,
  type AccessibleSceneNode,
  type DataRow,
} from "./accessibleDataRows"

export const fmt = (value: number | undefined | null): string => {
  if (value == null) return ""
  const rounded = Math.round(value * 100) / 100
  if (Number.isNaN(rounded)) return ""
  return String(rounded)
}

export function fmtCell(value: unknown): string {
  if (value == null || value === "") return "—"
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "—"
    return fmt(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return "—"
  return String(value)
}

interface FieldStats {
  name: string
  count: number
  numeric: boolean
  min?: number
  max?: number
  mean?: number
  uniqueValues?: string[]
}

/** Compute per-field statistics from extracted rows. Defensive against weird values. */
export function computeFieldStats(rows: DataRow[]): FieldStats[] {
  type Accumulator = {
    count: number
    min: number
    max: number
    sum: number
    strings: Set<string>
  }
  const fields = new Map<string, Accumulator>()
  for (const row of rows ?? []) {
    for (const [name, value] of Object.entries(row?.values ?? {})) {
      if (value == null || value === "") continue
      let field = fields.get(name)
      if (!field) {
        field = {
          count: 0,
          min: Infinity,
          max: -Infinity,
          sum: 0,
          strings: new Set(),
        }
        fields.set(name, field)
      }
      if (typeof value === "number") {
        if (!Number.isFinite(value)) continue
        field.count++
        field.sum += value
        if (value < field.min) field.min = value
        if (value > field.max) field.max = value
      } else if (typeof value !== "object" && typeof value !== "function") {
        field.strings.add(String(value))
      }
    }
  }

  return Array.from(fields, ([name, field]) => {
    if (field.count) {
      return {
        name,
        count: field.count,
        numeric: true,
        min: field.min,
        max: field.max,
        mean: field.sum / field.count,
      }
    }
    const uniqueValues = Array.from(field.strings)
    return {
      name,
      count: uniqueValues.length,
      numeric: false,
      uniqueValues: uniqueValues.slice(0, 5),
    }
  }).filter((field) => field.count > 0)
}

/** Format a summary string from field stats. */
export function formatSummary(
  totalRows: number,
  fieldStats: FieldStats[],
): string {
  const parts: string[] = [`${totalRows} data points.`]

  for (const field of fieldStats) {
    if (field.numeric) {
      parts.push(
        `${field.name}: ${fmt(field.min)} to ${fmt(field.max)}, mean ${fmt(field.mean)}.`,
      )
    } else {
      const values = field.uniqueValues!
      const label =
        values.length <= 3
          ? values.join(", ")
          : `${values.slice(0, 3).join(", ")}… (${field.count} unique)`
      parts.push(`${field.name}: ${label}.`)
    }
  }

  return parts.join(" ")
}

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
    target: endpointId(raw.target ?? edge.target),
  }
}

/** Derive authored rows and topology metrics without coupling them to React. */
export function buildNetworkTableModel(
  nodes: NetworkTableElement[],
  edges: NetworkTableElement[],
): NetworkTableModel {
  // [incoming, outgoing, weighted incoming, weighted outgoing]
  const degrees = new Map<string, [number, number, number, number]>()
  const edgeRows: DataRow[] = []
  let hasWeights = false

  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index]
    if (!edge || typeof edge !== "object") continue
    const raw = datumRecord(edge.datum)
    const { source, target } = edgeEndpoints(edge)
    const weighted = typeof raw.value === "number" && Number.isFinite(raw.value)
    const value = weighted ? (raw.value as number) : 0
    hasWeights ||= weighted
    for (const [endpoint, degreeIndex, weightIndex] of [
      [source, 1, 3],
      [target, 0, 2],
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
    if (!node || typeof node !== "object") continue
    if (node.datum === null) continue
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
      semantic: extractNetworkDataRow(node, id),
    })
  }
  nodeRows.sort((a, b) => b.degree - a.degree)

  const summaryParts = [`${nodeRows.length} nodes, ${edges.length} edges.`]
  if (nodeRows.length > 0) {
    summaryParts.push(
      `Mean degree: ${fmt(degreeSum / nodeRows.length)}, max degree: ${maxDegree}.`,
    )
  }

  return {
    nodeRows,
    edgeRows,
    hasWeights,
    summary: summaryParts.join(" "),
  }
}
