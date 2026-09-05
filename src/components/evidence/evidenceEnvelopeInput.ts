/**
 * Remove raw row/network/hierarchy/geo payloads from a data profile before
 * placing it in a portable envelope. Shape and aggregate evidence remain;
 * caller-owned source records do not.
 */
const PRIVATE_PROFILE_KEYS = new Set([
  "data",
  "rawInput",
  "sample",
  "numericFields",
  "network",
  "hierarchy",
  "geo",
  "topValues",
  "distinctValues"
])

export function redactProfileForEnvelope(profile: unknown): unknown {
  if (Array.isArray(profile)) return profile.map(redactProfileForEnvelope)
  if (!profile || typeof profile !== "object") return profile
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(
    profile as Record<string, unknown>
  )) {
    if (value === undefined || PRIVATE_PROFILE_KEYS.has(key)) continue
    output[key] = redactProfileForEnvelope(value)
  }
  return output
}

/** Recursively remove raw source records from a navigation tree. */
export function redactNavigationTree(tree: unknown): unknown {
  if (Array.isArray(tree)) return tree.map(redactNavigationTree)
  if (!tree || typeof tree !== "object") return tree
  const output = { ...(tree as Record<string, unknown>) }
  delete output.datum
  if (Array.isArray(output.children)) {
    output.children = output.children.map(redactNavigationTree)
  }
  return output
}

/**
 * Normalize the chart's primary source records across supported data shapes.
 * Used for count and integrity hashing only; records are never stored.
 */
export function normalizeSourceRecords(
  component: string,
  props: Record<string, unknown>
): ReadonlyArray<unknown> {
  if (Array.isArray(props.data)) return props.data
  if (
    component === "ForceDirectedGraph" ||
    component === "SankeyDiagram" ||
    component === "ProcessSankey" ||
    component === "ChordDiagram"
  ) {
    return [
      ...(Array.isArray(props.nodes) ? props.nodes : []),
      ...(Array.isArray(props.edges) ? props.edges : [])
    ]
  }
  if (component === "ChoroplethMap") {
    if (Array.isArray(props.areas)) return props.areas
    if (
      props.areas &&
      typeof props.areas === "object" &&
      Array.isArray((props.areas as Record<string, unknown>).features)
    ) {
      return (props.areas as { features: unknown[] }).features
    }
    return typeof props.areas === "string"
      ? [{ geographyReference: props.areas }]
      : []
  }
  if (component === "ProportionalSymbolMap") {
    return Array.isArray(props.points) ? props.points : []
  }
  if (component === "FlowMap") {
    return [
      ...(Array.isArray(props.nodes) ? props.nodes : []),
      ...(Array.isArray(props.flows) ? props.flows : [])
    ]
  }
  if (component === "DistanceCartogram") {
    return [
      ...(Array.isArray(props.points) ? props.points : []),
      ...(Array.isArray(props.lines) ? props.lines : [])
    ]
  }
  if (
    component === "TreeDiagram" ||
    component === "Treemap" ||
    component === "CirclePack" ||
    component === "OrbitDiagram"
  ) {
    return props.data && typeof props.data === "object" ? [props.data] : []
  }
  if (component === "BigNumber" || component === "GaugeChart") {
    const value = props.value
    return value === undefined ? [] : [{ value }]
  }
  return []
}

