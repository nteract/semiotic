/**
 * Validates chart data and accessors at render time.
 * Returns null if data is valid, or an error message string if not.
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
        return `${name} is required. Provide a field name or function.`
      }
    }
  }

  // Check data exists and is non-empty
  if (!data || !Array.isArray(data) || data.length === 0) {
    return "No data provided. Pass a non-empty array to the data prop."
  }

  // Check accessors against a sample of data points
  if (accessors) {
    for (const sample of sampleRows(data)) {
      if (!sample || typeof sample !== "object") continue
      for (const [label, accessor] of Object.entries(accessors)) {
        if (!accessor) continue
        if (typeof accessor === "string" && !(accessor in sample)) {
          return (
            `${label} "${accessor}" not found in data. ` +
            `Available fields: ${Object.keys(sample).join(", ")}.`
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
    return `No ${dataLabel} provided. Pass a hierarchical data object to the ${dataLabel} prop.`
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
    return "No edges provided. Pass a non-empty array to the edges prop."
  }

  if (nodesRequired && (!nodes || !Array.isArray(nodes) || nodes.length === 0)) {
    return "No nodes provided. Pass a non-empty array to the nodes prop."
  }

  // Check accessors against a sample of node data
  if (accessors && nodes && nodes.length > 0) {
    for (const sample of sampleRows(nodes)) {
      if (!sample || typeof sample !== "object") continue
      for (const [label, accessor] of Object.entries(accessors)) {
        if (!accessor) continue
        if (typeof accessor === "string" && !(accessor in sample)) {
          return (
            `${label} "${accessor}" not found in node data. ` +
            `Available fields: ${Object.keys(sample).join(", ")}.`
          )
        }
      }
    }
  }

  return null
}
