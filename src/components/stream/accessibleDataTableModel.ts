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
  if (!rows || rows.length === 0) return []

  const fieldNames = new Set<string>()
  for (const row of rows) {
    if (!row || !row.values) continue
    for (const key of Object.keys(row.values)) fieldNames.add(key)
  }

  const stats: FieldStats[] = []
  for (const name of fieldNames) {
    const numbers: number[] = []
    const strings = new Set<string>()

    for (const row of rows) {
      if (!row || !row.values) continue
      const value = row.values[name]
      if (value == null || value === "") continue
      if (
        typeof value === "number" &&
        !Number.isNaN(value) &&
        Number.isFinite(value)
      ) {
        numbers.push(value)
      } else if (typeof value === "number") {
        // NaN/Infinity — skip rather than corrupt stats.
      } else if (typeof value !== "object" && typeof value !== "function") {
        strings.add(String(value))
      }
    }

    if (numbers.length > 0) {
      let min = numbers[0]
      let max = numbers[0]
      let sum = 0
      for (const value of numbers) {
        if (value < min) min = value
        if (value > max) max = value
        sum += value
      }
      stats.push({
        name,
        count: numbers.length,
        numeric: true,
        min,
        max,
        mean: sum / numbers.length,
      })
    } else if (strings.size > 0) {
      const unique = Array.from(strings)
      stats.push({
        name,
        count: unique.length,
        numeric: false,
        uniqueValues: unique.slice(0, 5),
      })
    }
  }

  return stats
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
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()
  const weightedInDegree = new Map<string, number>()
  const weightedOutDegree = new Map<string, number>()

  for (const edge of edges) {
    if (!edge || typeof edge !== "object") continue
    const raw = datumRecord(edge.datum)
    const { source, target } = edgeEndpoints(edge)
    const value =
      typeof raw.value === "number" && Number.isFinite(raw.value)
        ? raw.value
        : 0
    if (source != null && source !== "") {
      const id = String(source)
      outDegree.set(id, (outDegree.get(id) ?? 0) + 1)
      weightedOutDegree.set(id, (weightedOutDegree.get(id) ?? 0) + value)
    }
    if (target != null && target !== "") {
      const id = String(target)
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1)
      weightedInDegree.set(id, (weightedInDegree.get(id) ?? 0) + value)
    }
  }

  const nodeRows: NetworkNodeTableRow[] = []
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (!node || typeof node !== "object") continue
    const rawId = datumRecord(node.datum).id ?? node.id
    const id = rawId != null ? String(rawId) : `node-${index}`
    const incoming = inDegree.get(id) ?? 0
    const outgoing = outDegree.get(id) ?? 0
    const weightedIncoming = weightedInDegree.get(id) ?? 0
    const weightedOutgoing = weightedOutDegree.get(id) ?? 0
    nodeRows.push({
      id,
      degree: incoming + outgoing,
      inDeg: incoming,
      outDeg: outgoing,
      wDegree: weightedIncoming + weightedOutgoing,
      wInDeg: weightedIncoming,
      wOutDeg: weightedOutgoing,
      semantic: extractNetworkDataRow(node, id),
    })
  }
  nodeRows.sort((a, b) => b.degree - a.degree)

  let averageDegree = 0
  let maxDegree = 0
  if (nodeRows.length > 0) {
    let sum = 0
    for (const row of nodeRows) {
      sum += row.degree
      if (row.degree > maxDegree) maxDegree = row.degree
    }
    averageDegree = sum / nodeRows.length
  }

  const hasWeights = edges.some((edge) => {
    const raw = datumRecord(edge?.datum)
    return typeof raw.value === "number" && Number.isFinite(raw.value)
  })

  const summaryParts = [`${nodeRows.length} nodes, ${edges.length} edges.`]
  if (nodeRows.length > 0) {
    summaryParts.push(
      `Mean degree: ${fmt(averageDegree)}, max degree: ${maxDegree}.`,
    )
  }

  const edgeRows = edges.flatMap((edge, index) => {
    if (!edge || typeof edge !== "object") return []
    const { source, target } = edgeEndpoints(edge)
    const fallbackLabel =
      source != null || target != null
        ? `${source == null ? "?" : String(source)} → ${target == null ? "?" : String(target)}`
        : `Edge ${index + 1}`
    return [extractNetworkDataRow(edge, fallbackLabel)]
  })

  return {
    nodeRows,
    edgeRows,
    hasWeights,
    summary: summaryParts.join(" "),
  }
}
