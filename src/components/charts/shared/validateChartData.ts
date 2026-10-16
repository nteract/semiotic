import type { Datum } from "./datumTypes"
import { isDataRecord, sampleDataRecords } from "./dataRecords"
/**
 * Validates chart data and accessors at render time.
 * Returns null if data is valid, or an error message string if not.
 *
 * Error messages are designed for AI-agent consumption:
 * they include the problem, the available fields, AND the suggested fix.
 *
 * Samples first, last, and a middle element to catch common mistakes
 * (wrong field names, missing data) without iterating the entire dataset.
 */

type AccessorResult =
  string | number | boolean | Date | Datum | null | undefined
type AccessorLike = string | ((datum: Datum, index?: number) => AccessorResult)
type ChartDataInput =
  ReadonlyArray<Datum> | Datum | string | number | boolean | null | undefined

import { closestMatch } from "./stringDistance"

/** Find the closest match to a string from a list of candidates */
function suggestField(target: string, available: string[]): string | null {
  if (available.length === 0) return null
  const lower = target.toLowerCase()
  // Exact substring match first
  const sub = available.find(
    (k) =>
      Math.min(k.length, lower.length) >= 3 &&
      (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()))
  )
  if (sub) return sub
  // Levenshtein distance match (max 3 edits)
  return (
    closestMatch(
      target,
      available,
      Math.min(3, Math.floor(target.length / 2))
    ) ?? null
  )
}

/**
 * String accessors are convenient for a direct field lookup, but HOC charts
 * also accept functions for computed or dynamic values. Keep that escape hatch
 * in every missing-field diagnosis so a suggested field name does not imply
 * that strings are the only supported accessor form.
 */
function accessorFunctionHint(label: string): string {
  return ` Or use a function: ${label}={d => d.myValue}.`
}

/** Share field discovery and diagnostics across tabular and network charts. */
function validateAccessors(
  componentName: string,
  samples: Datum[],
  accessors: Record<string, AccessorLike | undefined> | undefined,
  dataLabel: string
): string | null {
  if (!accessors) return null
  const available = [...new Set(samples.flatMap(Object.keys))]
  for (const [label, accessor] of Object.entries(accessors)) {
    if (accessor && typeof accessor === "string" && !available.includes(accessor)) {
      const suggestion = suggestField(accessor, available)
      const fix = suggestion ? ` Try ${label}="${suggestion}".` : ""
      return (
        `${componentName}: ${label} "${accessor}" not found in ${dataLabel}. ` +
        `Available fields: ${available.join(", ")}.${fix}` +
        accessorFunctionHint(label)
      )
    }
  }
  return null
}

interface ArrayDataValidation {
  componentName: string
  data: ChartDataInput
  accessors?: Record<string, AccessorLike | undefined>
  requiredProps?: Datum
}

interface ObjectDataValidation {
  componentName: string
  data: ChartDataInput
  dataLabel?: string
}

interface NetworkDataValidation {
  componentName: string
  nodes?: ReadonlyArray<Datum> | null
  edges?: ReadonlyArray<Datum> | null
  nodesRequired?: boolean
  edgesRequired?: boolean
  accessors?: Record<string, AccessorLike | undefined>
}

/**
 * Validate array-based chart data (LineChart, BarChart, Scatterplot, etc.)
 */
export function validateArrayData({
  componentName,
  data,
  accessors,
  requiredProps
}: ArrayDataValidation): string | null {
  // Check required props first
  if (requiredProps) {
    for (const [name, value] of Object.entries(requiredProps)) {
      if (value === undefined || value === null) {
        return `${componentName}: ${name} is required. Provide a field name or function.`
      }
    }
  }

  // Check data exists and is non-empty
  // undefined/null = push API mode, skip validation
  if (data == null) return null

  // Check if data is an object but not an array (common hierarchy mistake)
  if (!Array.isArray(data) && typeof data === "object") {
    return (
      `${componentName}: data should be an array, but received an object. ` +
      `If this is hierarchical data, use TreeDiagram, Treemap, or CirclePack instead.`
    )
  }

  if (!Array.isArray(data) || data.length === 0) {
    return `${componentName}: No data provided. Pass a non-empty array to the data prop.`
  }

  const samples = sampleDataRecords(data)
  if (!samples.length) {
    return `${componentName}: No data records provided. Pass a non-empty array of objects to the data prop.`
  }

  // Accessors can appear in different rows of a sparse/ragged table.
  return validateAccessors(componentName, samples, accessors, "data")
}

/**
 * Validate object/hierarchical data (TreeDiagram, Treemap, CirclePack)
 */
export function validateObjectData({
  componentName,
  data,
  dataLabel = "data"
}: ObjectDataValidation): string | null {
  if (data === undefined || data === null) {
    return (
      `${componentName}: No ${dataLabel} provided. ` +
      `Pass a hierarchical object with children: { name: "root", children: [...] }.`
    )
  }
  if (Array.isArray(data)) {
    return (
      `${componentName}: ${dataLabel} should be a single root object, not an array. ` +
      `Expected: { name: "root", children: [...] }. ` +
      `If you have flat data, use LineChart, BarChart, or Scatterplot instead.`
    )
  }
  if (!isDataRecord(data)) {
    return `${componentName}: ${dataLabel} should be a hierarchical object with children: { name: "root", children: [...] }.`
  }
  return null
}

/**
 * Validate network data (ForceDirectedGraph, ChordDiagram, SankeyDiagram)
 */
export function validateNetworkData({
  componentName,
  nodes,
  edges,
  nodesRequired = false,
  edgesRequired = true,
  accessors
}: NetworkDataValidation): string | null {
  // Push API mode: both nodes and edges null/undefined means push mode — skip validation.
  // If only one is null while the other is provided, that's a user error, not push mode.
  if (nodes == null && edges == null) return null

  if (
    edgesRequired &&
    (!edges || !Array.isArray(edges) || edges.length === 0)
  ) {
    return (
      `${componentName}: No edges provided. Pass a non-empty array: ` +
      `edges={[{ source: "A", target: "B", value: 10 }, ...]}.`
    )
  }

  if (
    nodesRequired &&
    (!nodes || !Array.isArray(nodes) || nodes.length === 0)
  ) {
    return (
      `${componentName}: No nodes provided. Pass a non-empty array: ` +
      `nodes={[{ id: "A" }, { id: "B" }, ...]}.`
    )
  }

  for (const [label, rows] of [
    ["nodes", nodes],
    ["edges", edges]
  ] as const) {
    if (
      rows != null &&
      (!Array.isArray(rows) ||
        (rows.length > 0 && !sampleDataRecords(rows).length))
    ) {
      return `${componentName}: ${label} should be an array containing data records.`
    }
  }

  // Check accessors against a sample of node data
  if (accessors && nodes && nodes.length > 0) {
    return validateAccessors(componentName, sampleDataRecords(nodes), accessors, "node data")
  }

  return null
}
