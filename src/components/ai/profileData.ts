import type { Datum } from "../charts/shared/datumTypes"
import { summarizeData, type FieldSummary } from "../data/DataSummarizer"
import type { ChartDataProfile, FieldCandidate, FieldKind } from "./chartCapabilityTypes"
import { profileNumericFields } from "../data/auditData"
import { deriveProfileFields } from "./deriveProfileFields"
import {
  fieldRoleCandidateMatch,
  identifierFields,
  normalizeProfileFieldRoles,
  PROFILE_X_FIELD_HINT,
  type CandidateFieldRole,
  type NormalizedProfileFieldRoles,
  type ProfileFieldRoleHints,
} from "./fieldRoles"

const Y_FIELD_HINT = /^(y|value|amount|total|count|revenue|sales|price|score|rate|population|measure)$/i
const SIZE_FIELD_HINT = /(size|magnitude|volume|weight|count|amount)/i
const CATEGORY_FIELD_HINT = /^(category|label|name|type|group|region|segment|kind|class)$/i
const SERIES_FIELD_HINT = /^(series|group|type|category|segment|cohort|product)$/i

const NUMERIC_LIKE_FOR_SIZE = new Set<FieldKind>(["numeric"])
const NUMERIC_OR_TIME_FOR_X = new Set<FieldKind>(["numeric", "date"])
const NUMERIC_FOR_Y = new Set<FieldKind>(["numeric"])
const DATE_FOR_TIME = new Set<FieldKind>(["date"])
const CATEGORICAL_LIKE = new Set<FieldKind>(["categorical", "boolean"])

function fieldKindFromSummary(summary: FieldSummary): FieldKind {
  if (summary.type === "numeric") return "numeric"
  if (summary.type === "date") return "date"
  if (summary.type === "categorical") return "categorical"
  return "unknown"
}

function nameBonus(field: string, hint: RegExp): number {
  return hint.test(field) ? 0.2 : 0
}

function monotonic(data: ReadonlyArray<Datum>, field: string): boolean {
  let prev: number | null = null
  for (let i = 0; i < data.length; i++) {
    const v = data[i]?.[field]
    if (v == null) continue
    const n = v instanceof Date ? v.getTime() : Number(v)
    if (!Number.isFinite(n)) return false
    if (prev !== null && n < prev) return false
    prev = n
  }
  return prev !== null
}

function rankCandidates(
  fields: Record<string, FieldSummary>,
  data: ReadonlyArray<Datum>,
  allowed: Set<FieldKind>,
  hint: RegExp,
  candidateRole: CandidateFieldRole,
  fieldRoles: NormalizedProfileFieldRoles,
  options: { computeMonotonic?: boolean } = {}
): FieldCandidate[] {
  const out: FieldCandidate[] = []
  for (const [field, summary] of Object.entries(fields)) {
    const kind = fieldKindFromSummary(summary)
    const roleMatch = fieldRoleCandidateMatch(
      fieldRoles,
      field,
      candidateRole,
      allowed.has(kind),
    )
    if (roleMatch === 0) continue
    const hinted = roleMatch === 2
    let quality = 0.5
    quality += nameBonus(field, hint)
    if (hinted) quality += 0.35

    let distinctCount: number | undefined
    if (summary.type === "categorical") {
      distinctCount = summary.distinctCount
      // Categories with too few or too many values are less useful
      if (distinctCount && distinctCount >= 2 && distinctCount <= 12) quality += 0.2
      if (distinctCount && distinctCount > 50) quality -= 0.2
    }
    if (summary.type === "numeric") {
      // Stable numerics with a real range score better
      if (Number.isFinite(summary.min) && Number.isFinite(summary.max) && summary.max > summary.min) quality += 0.1
    }

    const candidate: FieldCandidate = {
      field,
      kind,
      quality: Math.max(0, Math.min(1, quality)),
      distinctCount,
      ...(hinted ? { hinted: true } : {}),
    }
    if (options.computeMonotonic && (kind === "numeric" || kind === "date")) {
      candidate.monotonic = monotonic(data, field)
      if (candidate.monotonic) candidate.quality = Math.min(1, candidate.quality + 0.2)
    }
    out.push(candidate)
  }
  out.sort((a, b) => b.quality - a.quality)
  return out
}

interface InferStructure {
  hasHierarchy: boolean
  hasNetwork: boolean
  hasGeo: boolean
  network?: { nodes: ReadonlyArray<Datum>; edges: ReadonlyArray<Datum> }
  hierarchy?: Datum
  geo?: { features: ReadonlyArray<Datum>; points?: ReadonlyArray<Datum>; flows?: ReadonlyArray<Datum> }
}

function inferStructure(rawInput: unknown): InferStructure {
  if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
    const obj = rawInput as Record<string, unknown>
    if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
      return {
        hasHierarchy: false,
        hasNetwork: false,
        hasGeo: true,
        geo: {
          features: obj.features as ReadonlyArray<Datum>,
          points: Array.isArray(obj.points) ? (obj.points as ReadonlyArray<Datum>) : undefined,
          flows: Array.isArray(obj.flows) ? (obj.flows as ReadonlyArray<Datum>) : undefined,
        },
      }
    }
    if (Array.isArray(obj.children)) {
      return { hasHierarchy: true, hasNetwork: false, hasGeo: false, hierarchy: obj as Datum }
    }
    if (Array.isArray(obj.nodes) && (Array.isArray(obj.edges) || Array.isArray(obj.links))) {
      const edges = (obj.edges ?? obj.links) as ReadonlyArray<Datum>
      return {
        hasHierarchy: false,
        hasNetwork: true,
        hasGeo: false,
        network: { nodes: obj.nodes as ReadonlyArray<Datum>, edges },
      }
    }
  }
  return { hasHierarchy: false, hasNetwork: false, hasGeo: false }
}

// Field-name patterns for transition-event detection. A row like
// { stage: "Qualified", nextStage: "Discovery", startTime: "...", value: 14 }
// is conceptually an edge in a network — even though the rows themselves are
// a flat array, not a {nodes, edges} object. Recognising this pattern lets
// SankeyDiagram, ProcessSankey, ChordDiagram, and ForceDirectedGraph fit.
const SOURCE_FIELD_PATTERNS = /^(source|from|origin|stage|currentstage|sourcestage|fromstage)$/i
const TARGET_FIELD_PATTERNS =
  /^(target|to|destination|nextstage|next|targetstage|tostage|destinationstage|status)$/i
const TRANSITION_START_PATTERNS = /^(starttime|startedat|enteredat|startdate|start|timestamp|date|time)$/i
const TRANSITION_END_PATTERNS = /^(endtime|endedat|exitedat|completedat|finishtime|enddate|end)$/i
const TRANSITION_VALUE_PATTERNS = /^(value|weight|amount|count|magnitude|volume)$/i

function findField(fieldNames: ReadonlyArray<string>, pattern: RegExp): string | undefined {
  return fieldNames.find((f) => pattern.test(f))
}

/**
 * Detect transition-event data — a flat array of rows where each row encodes
 * an edge ({source, target, value?, startTime?}). When detected, derive an
 * aggregated {nodes, edges} network so the network/flow chart family becomes
 * viable.
 *
 * Returns null when the row shape doesn't look like transitions (e.g. when
 * source and target aren't both present, or every row has source === target).
 */
function detectTransitionNetwork(
  rows: ReadonlyArray<Datum>,
): { nodes: ReadonlyArray<Datum>; edges: ReadonlyArray<Datum> } | null {
  if (rows.length < 3) return null
  const firstRow = rows[0]
  if (!firstRow || typeof firstRow !== "object") return null
  const fieldNames = Object.keys(firstRow)

  const sourceField = findField(fieldNames, SOURCE_FIELD_PATTERNS)
  const targetField = findField(fieldNames, TARGET_FIELD_PATTERNS)
  if (!sourceField || !targetField || sourceField === targetField) return null

  const startTimeField = findField(fieldNames, TRANSITION_START_PATTERNS)
  const endTimeField = findField(fieldNames, TRANSITION_END_PATTERNS)
  const valueField = findField(fieldNames, TRANSITION_VALUE_PATTERNS)

  // Validate: at least 3 rows must have both source and target with different,
  // non-empty values. Guards against false positives on data where one of the
  // matched fields happens to be present but isn't a transition signal.
  const validRows: Datum[] = []
  for (const row of rows) {
    if (!row) continue
    const source = row[sourceField]
    const target = row[targetField]
    if (source == null || target == null) continue
    const sourceStr = String(source).trim()
    const targetStr = String(target).trim()
    if (!sourceStr || !targetStr || sourceStr === targetStr) continue
    validRows.push(row)
  }
  if (validRows.length < 3) return null

  // Build nodes (one per distinct source/target label) and edges (one per row,
  // aggregating value across duplicates).
  const nodes = new Map<string, Datum>()
  const edgeWeights = new Map<string, number>()
  const edgeMeta = new Map<string, Datum>()

  for (const row of validRows) {
    const sourceLabel = String(row[sourceField]).trim()
    const targetLabel = String(row[targetField]).trim()
    if (!nodes.has(sourceLabel)) nodes.set(sourceLabel, { id: sourceLabel, label: sourceLabel })
    if (!nodes.has(targetLabel)) nodes.set(targetLabel, { id: targetLabel, label: targetLabel })

    const edgeKey = `${sourceLabel}->${targetLabel}`
    const weight = valueField ? Number(row[valueField]) : 1
    const w = Number.isFinite(weight) ? weight : 1
    edgeWeights.set(edgeKey, (edgeWeights.get(edgeKey) ?? 0) + w)

    // Preserve the *first* row's timestamps for the edge — ProcessSankey reads
    // startTime/endTime off each edge for its temporal layout. Aggregating
    // weights across duplicates is correct; aggregating timestamps isn't.
    if (!edgeMeta.has(edgeKey)) {
      edgeMeta.set(edgeKey, {
        source: sourceLabel,
        target: targetLabel,
        ...(startTimeField ? { startTime: row[startTimeField] } : {}),
        ...(endTimeField ? { endTime: row[endTimeField] } : {}),
      })
    }
  }

  const edges: Datum[] = []
  for (const [key, meta] of edgeMeta) {
    edges.push({ ...meta, value: edgeWeights.get(key) ?? 1 })
  }

  return { nodes: Array.from(nodes.values()), edges }
}

export interface ProfileDataOptions {
  /** If you have access to the raw input (which might be {nodes, edges} or GeoJSON), pass it for structure detection. */
  rawInput?: unknown
  /** Override the field used as the primary series, useful when the heuristic guesses wrong. */
  seriesField?: string
  /**
   * Fields that identify records rather than encode values. Identifier fields
   * are excluded from every x/y/size/category/series/time candidate list.
   */
  identifiers?: ReadonlyArray<string>
  /**
   * Per-field semantic or exact encoding roles. `identifier` and `ignore`
   * always take precedence; exact roles boost that candidate deterministically.
   */
  fieldRoles?: ProfileFieldRoleHints
}

/**
 * Build a ChartDataProfile from row data. Extends DataSummary with shape inference —
 * candidate fields per role, distinct counts, monotonicity, and structure detection.
 *
 * Designed to be called once per dataset; the result is what `suggestCharts` and
 * capability evaluators consume.
 */
export function profileData(
  data: ReadonlyArray<Datum> | null | undefined,
  options: ProfileDataOptions = {}
): ChartDataProfile {
  const summary = summarizeData(data ?? [])
  const rows: ReadonlyArray<Datum> = Array.isArray(data) ? data : []
  const structure = inferStructure(options.rawInput)
  const fieldRoles = normalizeProfileFieldRoles(
    options.fieldRoles,
    options.identifiers,
    options.seriesField,
  )

  // Transition-event detection: a flat array of rows with source/target fields
  // is conceptually a network even though there's no {nodes, edges} payload.
  // Derive one so flow charts (SankeyDiagram, ProcessSankey, ChordDiagram,
  // ForceDirectedGraph) become viable on this data shape. Skip when rawInput
  // already produced a structured network — that takes precedence.
  if (!structure.hasNetwork && !structure.hasHierarchy && !structure.hasGeo) {
    const transitionNet = detectTransitionNetwork(rows)
    if (transitionNet) {
      structure.hasNetwork = true
      structure.network = transitionNet
    }
  }

  const xCandidates = rankCandidates(
    summary.fields,
    rows,
    NUMERIC_OR_TIME_FOR_X,
    PROFILE_X_FIELD_HINT,
    "x",
    fieldRoles,
    { computeMonotonic: true },
  )
  const yCandidates = rankCandidates(
    summary.fields,
    rows,
    NUMERIC_FOR_Y,
    Y_FIELD_HINT,
    "y",
    fieldRoles,
  )
  const sizeCandidates = rankCandidates(
    summary.fields,
    rows,
    NUMERIC_LIKE_FOR_SIZE,
    SIZE_FIELD_HINT,
    "size",
    fieldRoles,
  )
  const categoryCandidates = rankCandidates(
    summary.fields,
    rows,
    CATEGORICAL_LIKE,
    CATEGORY_FIELD_HINT,
    "category",
    fieldRoles,
  )
  const seriesCandidates = rankCandidates(
    summary.fields,
    rows,
    CATEGORICAL_LIKE,
    SERIES_FIELD_HINT,
    "series",
    fieldRoles,
  )
  const timeCandidates = rankCandidates(
    summary.fields,
    rows,
    DATE_FOR_TIME,
    /(date|time|timestamp)/i,
    "time",
    fieldRoles,
    { computeMonotonic: true },
  )
  const candidates = {
    x: xCandidates,
    y: yCandidates,
    size: sizeCandidates,
    category: categoryCandidates,
    series: seriesCandidates,
    time: timeCandidates,
  }
  const derived = deriveProfileFields(rows, candidates, fieldRoles)

  return {
    ...summary,
    data: rows,
    // summarizeData already sorts numeric columns for medians. The health pass
    // keeps its second scan linear here; callers that need exact quartiles can
    // request them directly from profileNumericFields().
    numericFields: profileNumericFields(rows, { quantiles: false }),
    fieldRoles,
    identifiers: identifierFields(fieldRoles),
    candidates,
    ...derived,
    hasHierarchy: structure.hasHierarchy,
    hasNetwork: structure.hasNetwork,
    hasGeo: structure.hasGeo,
    network: structure.network,
    hierarchy: structure.hierarchy,
    geo: structure.geo,
  }
}
