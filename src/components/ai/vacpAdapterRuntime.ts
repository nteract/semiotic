import type {
  VacpCapabilitiesRequest,
  VacpCapabilitiesSnapshot,
  VacpDataSchemaDetail,
  VacpDataSchemaResult,
  VacpLayer,
  VacpNode,
  VacpNodeKind,
  VacpRef,
  VacpStateDeltaPayload,
  VacpStateRequest,
  VacpStateSnapshot,
} from "./vacpTypes"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/**
 * Convert application values to bounded, JSON-compatible data. Functions,
 * symbols, React elements, and cyclic references are intentionally omitted.
 */
export function jsonSafe(
  value: unknown,
  options: { maxDepth?: number; maxArrayLength?: number } = {}
): unknown {
  const maxDepth =
    typeof options.maxDepth === "number" &&
    Number.isFinite(options.maxDepth)
      ? Math.max(1, Math.floor(options.maxDepth))
      : 10
  const maxArrayLength =
    typeof options.maxArrayLength === "number" &&
    Number.isFinite(options.maxArrayLength)
      ? Math.max(1, Math.floor(options.maxArrayLength))
      : 1000
  const seen = new WeakSet<object>()

  const visit = (entry: unknown, depth: number): unknown => {
    if (
      entry == null ||
      typeof entry === "string" ||
      typeof entry === "boolean"
    ) {
      return entry
    }
    if (typeof entry === "number") {
      return Number.isFinite(entry) ? entry : String(entry)
    }
    if (typeof entry === "bigint") return entry.toString()
    if (
      typeof entry === "function" ||
      typeof entry === "symbol" ||
      typeof entry === "undefined"
    ) {
      return undefined
    }
    if (entry instanceof Date) return entry.toISOString()
    if (depth >= maxDepth) return "[depth limit]"
    if (typeof entry !== "object") return String(entry)
    if ("$$typeof" in entry) return undefined
    if (seen.has(entry)) return "[circular]"
    seen.add(entry)

    if (Array.isArray(entry)) {
      const result = entry
        .slice(0, maxArrayLength)
        .map((item) => visit(item, depth + 1))
        .filter((item) => item !== undefined)
      seen.delete(entry)
      return result
    }

    if (entry instanceof Set) {
      const result = Array.from(entry)
        .slice(0, maxArrayLength)
        .map((item) => visit(item, depth + 1))
        .filter((item) => item !== undefined)
      seen.delete(entry)
      return result
    }

    if (entry instanceof Map) {
      const result = Object.create(null) as Record<string, unknown>
      let count = 0
      for (const [key, item] of entry) {
        if (count++ >= maxArrayLength) break
        const safe = visit(item, depth + 1)
        if (safe !== undefined) result[String(key)] = safe
      }
      seen.delete(entry)
      return result
    }

    const result = Object.create(null) as Record<string, unknown>
    for (const key of Object.keys(entry as Record<string, unknown>).sort()) {
      const safe = visit(
        (entry as Record<string, unknown>)[key],
        depth + 1
      )
      if (safe !== undefined) result[key] = safe
    }
    seen.delete(entry)
    return result
  }

  return visit(value, 0)
}

export function safeRecord(value: unknown): Record<string, unknown> {
  const safe = jsonSafe(value)
  return isRecord(safe) ? safe : {}
}

function normalizedForStringify(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizedForStringify)
  if (!isRecord(value)) return value
  const result = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(value).sort()) {
    result[key] = normalizedForStringify(value[key])
  }
  return result
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizedForStringify(jsonSafe(value)))
}

function fnv1a64(value: string): string {
  let hash = BigInt("14695981039346656037")
  const prime = BigInt("1099511628211")
  const mask = BigInt("0xffffffffffffffff")
  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(value.charCodeAt(i))
    hash = (hash * prime) & mask
  }
  return hash.toString(16).padStart(16, "0")
}

export function stableHash(value: unknown): string {
  return fnv1a64(stableStringify(value))
}

export function stateToken(snapshot: VacpStateSnapshot): string {
  return `st_${stableHash({
    state: snapshot.state,
    ...(snapshot.summary ? { summary: snapshot.summary } : {}),
  })}`
}

function uniqueSortedRefs(values: VacpRef[] | undefined): VacpRef[] | undefined {
  if (!values?.length) return undefined
  const refs = Array.from(
    new Set(values.filter((value) => typeof value === "string" && value.length))
  ).sort()
  return refs.length ? refs : undefined
}

function matchesRefScope(ref: VacpRef, refs: VacpRef[]): boolean {
  return refs.some(
    (candidate) => ref === candidate || ref.startsWith(`${candidate}/`)
  )
}

export function scopeStateSnapshot(
  snapshot: VacpStateSnapshot,
  request: VacpStateRequest
): { snapshot: VacpStateSnapshot; refs?: VacpRef[] } {
  const refs = uniqueSortedRefs(request.refs)
  const includeSummary = request.includeSummary !== false

  if (!refs) {
    return {
      snapshot: {
        version: snapshot.version,
        createdAt: snapshot.createdAt,
        state: snapshot.state,
        ...(includeSummary && snapshot.summary
          ? { summary: snapshot.summary }
          : {}),
      },
    }
  }

  const state = {} as Record<VacpRef, unknown>
  for (const [ref, value] of Object.entries(snapshot.state) as Array<
    [VacpRef, unknown]
  >) {
    if (matchesRefScope(ref, refs)) state[ref] = value
  }

  const summary = {} as Record<VacpRef, unknown>
  if (includeSummary && snapshot.summary) {
    for (const [ref, value] of Object.entries(snapshot.summary) as Array<
      [VacpRef, unknown]
    >) {
      if (matchesRefScope(ref, refs)) summary[ref] = value
    }
  }

  return {
    snapshot: {
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      state,
      ...(Object.keys(summary).length ? { summary } : {}),
    },
    refs,
  }
}

export function diffStateSnapshots(
  baseline: VacpStateSnapshot,
  current: VacpStateSnapshot
): VacpStateDeltaPayload {
  const changed = {} as Record<VacpRef, unknown>
  const removed: VacpRef[] = []

  for (const [ref, value] of Object.entries(current.state) as Array<
    [VacpRef, unknown]
  >) {
    if (
      !Object.prototype.hasOwnProperty.call(baseline.state, ref) ||
      stableStringify(baseline.state[ref]) !== stableStringify(value)
    ) {
      changed[ref] = value
    }
  }
  for (const ref of Object.keys(baseline.state) as VacpRef[]) {
    if (!Object.prototype.hasOwnProperty.call(current.state, ref)) {
      removed.push(ref)
    }
  }

  const summaryChanged = {} as Record<VacpRef, unknown>
  const summaryRemoved: VacpRef[] = []
  const previousSummary =
    baseline.summary ?? ({} as Record<VacpRef, unknown>)
  const nextSummary = current.summary ?? ({} as Record<VacpRef, unknown>)

  for (const [ref, value] of Object.entries(nextSummary) as Array<
    [VacpRef, unknown]
  >) {
    if (
      !Object.prototype.hasOwnProperty.call(previousSummary, ref) ||
      stableStringify(previousSummary[ref]) !== stableStringify(value)
    ) {
      summaryChanged[ref] = value
    }
  }
  for (const ref of Object.keys(previousSummary) as VacpRef[]) {
    if (!Object.prototype.hasOwnProperty.call(nextSummary, ref)) {
      summaryRemoved.push(ref)
    }
  }

  return {
    changed,
    removed: removed.sort(),
    ...(Object.keys(summaryChanged).length ? { summaryChanged } : {}),
    ...(summaryRemoved.length ? { summaryRemoved: summaryRemoved.sort() } : {}),
  }
}

interface CapabilityScope {
  refs?: VacpRef[]
  prefixes?: VacpRef[]
  kinds?: Set<VacpNodeKind>
  layers?: Set<VacpLayer>
  includeActions: boolean
  includeEdges: boolean
  includeNodeData: boolean
}

function capabilityScope(request: VacpCapabilitiesRequest): CapabilityScope {
  return {
    refs: uniqueSortedRefs(request.refs),
    prefixes: uniqueSortedRefs(request.prefixes),
    kinds: request.kinds?.length ? new Set(request.kinds) : undefined,
    layers: request.layers?.length ? new Set(request.layers) : undefined,
    includeActions: request.includeActions !== false,
    includeEdges: request.includeEdges !== false,
    includeNodeData: request.includeNodeData !== false,
  }
}

function nodeSurvives(node: VacpNode, scope: CapabilityScope): boolean {
  const hasRefFilter = !!scope.refs?.length || !!scope.prefixes?.length
  const matchesRef =
    !hasRefFilter ||
    scope.refs?.includes(node.ref) ||
    scope.prefixes?.some(
      (prefix) => node.ref === prefix || node.ref.startsWith(`${prefix}/`)
    )
  return (
    !!matchesRef &&
    (!scope.kinds || scope.kinds.has(node.kind)) &&
    (!scope.layers || scope.layers.has(node.layer))
  )
}

export function scopeCapabilitiesSnapshot(
  snapshot: VacpCapabilitiesSnapshot,
  request: VacpCapabilitiesRequest
): VacpCapabilitiesSnapshot {
  const scope = capabilityScope(request)
  const nodes = snapshot.graph.nodes
    .filter((node) => nodeSurvives(node, scope))
    .map((node) => {
      if (scope.includeNodeData) return node
      const { data: _data, ...withoutData } = node
      return withoutData
    })
  const refs = new Set(nodes.map((node) => node.ref))
  const actions = scope.includeActions
    ? snapshot.graph.actions.filter((action) => {
        if (!action.targetRef) return true
        if (refs.has(action.targetRef)) return true
        for (const ref of refs) {
          if (ref.startsWith(`${action.targetRef}/`)) return true
        }
        return false
      })
    : []

  return {
    version: snapshot.version,
    createdAt: snapshot.createdAt,
    graph: {
      version: snapshot.graph.version,
      nodes,
      edges: scope.includeEdges
        ? snapshot.graph.edges.filter(
            (edge) => refs.has(edge.from) && refs.has(edge.to)
          )
        : [],
      actions,
    },
  }
}

type ColumnType =
  | "NULL"
  | "DOUBLE"
  | "VARCHAR"
  | "BOOLEAN"
  | "TIMESTAMP"
  | "ARRAY"
  | "OBJECT"

function valueType(value: unknown): ColumnType {
  if (value == null) return "NULL"
  if (typeof value === "number") return "DOUBLE"
  if (typeof value === "string") return "VARCHAR"
  if (typeof value === "boolean") return "BOOLEAN"
  if (value instanceof Date) return "TIMESTAMP"
  if (Array.isArray(value)) return "ARRAY"
  return "OBJECT"
}

function fieldTypes(
  rows: readonly unknown[]
): Array<{ name: string; type: string }> {
  const types = new Map<string, Set<ColumnType>>()
  for (const row of rows) {
    if (!isRecord(row)) continue
    for (const [field, value] of Object.entries(row)) {
      const existing = types.get(field) ?? new Set<ColumnType>()
      existing.add(valueType(value))
      types.set(field, existing)
    }
  }
  return Array.from(types)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, variants]) => {
      const material = Array.from(variants).filter((type) => type !== "NULL")
      return {
        name,
        type:
          material.length === 0
            ? "NULL"
            : new Set(material).size === 1
              ? material[0]
              : "MIXED",
      }
    })
}

function numericSummaries(
  rows: readonly unknown[],
  fields: readonly string[]
): Record<string, { min: number; max: number; avg: number }> | undefined {
  const result = Object.create(null) as Record<
    string,
    { min: number; max: number; avg: number }
  >
  for (const field of fields) {
    const values: number[] = []
    for (const row of rows) {
      if (!isRecord(row)) continue
      const value = row[field]
      if (typeof value === "number" && Number.isFinite(value)) values.push(value)
    }
    if (!values.length) continue
    let min = values[0]
    let max = values[0]
    let total = 0
    for (const value of values) {
      min = Math.min(min, value)
      max = Math.max(max, value)
      total += value
    }
    result[field] = { min, max, avg: total / values.length }
  }
  return Object.keys(result).length ? result : undefined
}

function temporalSummaries(
  rows: readonly unknown[],
  fields: readonly string[]
): Record<
  string,
  {
    minIso: string
    maxIso: string
    minEpochMs: number
    maxEpochMs: number
  }
> | undefined {
  const result = Object.create(null) as Record<
    string,
    {
      minIso: string
      maxIso: string
      minEpochMs: number
      maxEpochMs: number
    }
  >
  for (const field of fields) {
    const values: number[] = []
    for (const row of rows) {
      if (!isRecord(row)) continue
      const value = row[field]
      if (value instanceof Date && Number.isFinite(value.getTime())) {
        values.push(value.getTime())
      }
    }
    if (!values.length) continue
    const minEpochMs = Math.min(...values)
    const maxEpochMs = Math.max(...values)
    result[field] = {
      minIso: new Date(minEpochMs).toISOString(),
      maxIso: new Date(maxEpochMs).toISOString(),
      minEpochMs,
      maxEpochMs,
    }
  }
  return Object.keys(result).length ? result : undefined
}

function categoricalSummaries(
  rows: readonly unknown[],
  fields: readonly string[]
): Record<string, Array<{ value: string; n: number }>> | undefined {
  const result = Object.create(null) as Record<
    string,
    Array<{ value: string; n: number }>
  >
  for (const field of fields) {
    const counts = new Map<string, number>()
    for (const row of rows) {
      if (!isRecord(row)) continue
      const value = row[field]
      if (typeof value !== "string" && typeof value !== "boolean") continue
      const key = String(value)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    if (!counts.size) continue
    result[field] = Array.from(counts)
      .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b))
      .slice(0, 10)
      .map(([value, n]) => ({ value, n }))
  }
  return Object.keys(result).length ? result : undefined
}

export function buildDataSchema(args: {
  handleRef: VacpRef
  rows: readonly unknown[]
  detail: VacpDataSchemaDetail
  sampleRows: number
}): VacpDataSchemaResult {
  const sampled = args.rows.slice(0, Math.max(0, args.sampleRows))
  // VACP's `sampleRows` bounds summaries, not schema discovery. Scan the
  // records for their complete field/type union so a sparse late column does
  // not silently disappear from the default `columns` response.
  const columns = fieldTypes(args.rows)
  const fields = columns.map((column) => column.name)
  if (args.detail === "columns") {
    return {
      handleRef: args.handleRef,
      detail: args.detail,
      table: null,
      rowCount: args.rows.length,
      columns,
    }
  }
  const numeric = numericSummaries(sampled, fields)
  const temporal = temporalSummaries(sampled, fields)
  const categoricalTopValues = categoricalSummaries(sampled, fields)
  return {
    handleRef: args.handleRef,
    detail: args.detail,
    table: null,
    rowCount: args.rows.length,
    columns,
    ...(numeric ? { numeric } : {}),
    ...(temporal ? { temporal } : {}),
    ...(categoricalTopValues ? { categoricalTopValues } : {}),
    sampledRows: sampled.length,
  }
}
