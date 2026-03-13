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

type AccessorLike = string | ((...args: any[]) => any)

/** Pick a few representative rows to validate without scanning everything */
function sampleRows(data: any[]): any[] {
  if (data.length <= 3) return data
  const mid = Math.floor(data.length / 2)
  return [data[0], data[mid], data[data.length - 1]]
}

import { closestMatch } from "./stringDistance"

/** Find the closest match to a string from a list of candidates */
function suggestField(target: string, available: string[]): string | null {
  if (available.length === 0) return null
  const lower = target.toLowerCase()
  // Exact substring match first
  const sub = available.find(k => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()))
  if (sub) return sub
  // Levenshtein distance match (max 3 edits)
  return closestMatch(target, available, 3) ?? null
}

interface ArrayDataValidation {
  componentName: string
  data: any[] | undefined | null
  accessors?: Record<string, AccessorLike | undefined>
  requiredProps?: Record<string, any>
}

interface ObjectDataValidation {
  componentName: string
  data: any | undefined | null
  dataLabel?: string
}

interface NetworkDataValidation {
  componentName: string
  nodes?: any[] | undefined | null
  edges?: any[] | undefined | null
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
  requiredProps,
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
  if (!data || !Array.isArray(data) || data.length === 0) {
    return `${componentName}: No data provided. Pass a non-empty array to the data prop.`
  }

  // Check if data is an object but not an array (common hierarchy mistake)
  if (!Array.isArray(data) && typeof data === "object") {
    return (
      `${componentName}: data should be an array, but received an object. ` +
      `If this is hierarchical data, use TreeDiagram, Treemap, or CirclePack instead.`
    )
  }

  // Check accessors against a sample of data points
  if (accessors) {
    const sample = sampleRows(data).find(s => s && typeof s === "object")
    if (sample) {
      const available = Object.keys(sample)
      for (const [label, accessor] of Object.entries(accessors)) {
        if (!accessor) continue
        if (typeof accessor === "string" && !(accessor in sample)) {
          const suggestion = suggestField(accessor, available)
          const fix = suggestion
            ? ` Try ${label}="${suggestion}".`
            : ""
          return (
            `${componentName}: ${label} "${accessor}" not found in data. ` +
            `Available fields: ${available.join(", ")}.${fix}`
          )
        }
      }
    }
  }

  return null
}

/**
 * Validate object/hierarchical data (TreeDiagram, Treemap, CirclePack)
 */
export function validateObjectData({
  componentName,
  data,
  dataLabel = "data",
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
  accessors,
}: NetworkDataValidation): string | null {
  if (edgesRequired && (!edges || !Array.isArray(edges) || edges.length === 0)) {
    return (
      `${componentName}: No edges provided. Pass a non-empty array: ` +
      `edges={[{ source: "A", target: "B", value: 10 }, ...]}.`
    )
  }

  if (nodesRequired && (!nodes || !Array.isArray(nodes) || nodes.length === 0)) {
    return (
      `${componentName}: No nodes provided. Pass a non-empty array: ` +
      `nodes={[{ id: "A" }, { id: "B" }, ...]}.`
    )
  }

  // Check accessors against a sample of node data
  if (accessors && nodes && nodes.length > 0) {
    const sample = sampleRows(nodes).find(s => s && typeof s === "object")
    if (sample) {
      const available = Object.keys(sample)
      for (const [label, accessor] of Object.entries(accessors)) {
        if (!accessor) continue
        if (typeof accessor === "string" && !(accessor in sample)) {
          const suggestion = suggestField(accessor, available)
          const fix = suggestion
            ? ` Try ${label}="${suggestion}".`
            : ""
          return (
            `${componentName}: ${label} "${accessor}" not found in node data. ` +
            `Available fields: ${available.join(", ")}.${fix}`
          )
        }
      }
    }
  }

  return null
}
