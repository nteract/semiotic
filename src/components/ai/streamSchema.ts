import type {
  StreamFieldKind,
  StreamFieldRole,
  StreamFieldSchema,
  StreamSchema,
  StreamShape,
  StreamThroughputBand,
  StreamThroughputThresholds
} from "./streamingTypes"
import { closestMatch } from "../charts/shared/stringDistance"

const DEFAULT_MEDIUM = 1
const DEFAULT_HIGH = 100

const FIELD_KINDS: ReadonlyArray<StreamFieldKind> = [
  "numeric",
  "categorical",
  "date",
  "boolean"
]
const KIND_ALIASES: Readonly<Record<string, StreamFieldKind>> = {
  timestamp: "date",
  datetime: "date",
  time: "date",
  string: "categorical",
  text: "categorical",
  category: "categorical",
  enum: "categorical",
  number: "numeric",
  int: "numeric",
  integer: "numeric",
  float: "numeric",
  double: "numeric",
  decimal: "numeric",
  long: "numeric",
  bool: "boolean"
}
const FIELD_ROLES: ReadonlyArray<StreamFieldRole> = [
  "x",
  "y",
  "value",
  "category",
  "series",
  "size",
  "key"
]
const SCHEMA_KEYS = ["fields", "throughput", "retention", "shape", "keyFields"]
const FIELD_KEYS = ["name", "kind", "role", "cardinality", "additive"]
const FIELD_KEY_ALIASES: Readonly<Record<string, string>> = {
  distinct: "cardinality",
  distinctcount: "cardinality",
  distinctvalues: "cardinality",
  distinctkeys: "cardinality",
  uniquecount: "cardinality",
  unique: "cardinality",
  nunique: "cardinality",
  ndv: "cardinality"
}

function suggestKey(key: string, candidates: string[]): string {
  const match =
    FIELD_KEY_ALIASES[key.toLowerCase()] ?? closestMatch(key, candidates, 2)
  return match && candidates.includes(match) ? ` (did you mean "${match}"?)` : ""
}

export interface NormalizedStreamSchema {
  schema: StreamSchema
  /** One message per input problem; empty when the schema is clean. */
  warnings: string[]
}

/**
 * Check a schema the way a typed caller would have been checked, and
 * repair what can be repaired: kind aliases (`"timestamp"` → `"date"`)
 * are mapped, duplicate field names and invalid hints are dropped. Every
 * repair and every unknown key is reported. Unknown keys stay on the
 * returned schema so custom capabilities can still read them.
 */
export function normalizeStreamSchema(input: StreamSchema): NormalizedStreamSchema {
  const warnings: string[] = []
  if (input === null || typeof input !== "object") {
    return { schema: { fields: [] }, warnings: ["schema must be an object with a fields array"] }
  }
  const raw = input as unknown as Record<string, unknown>
  for (const key of Object.keys(raw)) {
    if (SCHEMA_KEYS.includes(key)) continue
    const belongsOnField = FIELD_KEYS.includes(key) || FIELD_KEY_ALIASES[key.toLowerCase()]
    warnings.push(
      belongsOnField
        ? `schema key "${key}" was ignored — set it on each field instead${suggestKey(key, FIELD_KEYS)}`
        : `unknown schema key "${key}" was ignored${suggestKey(key, SCHEMA_KEYS)}`
    )
  }

  const schema: StreamSchema & Record<string, unknown> = { ...raw, fields: [] }
  const rawFields: unknown[] = Array.isArray(raw.fields) ? raw.fields : []
  if (!Array.isArray(raw.fields)) warnings.push("schema.fields must be an array")
  else if (rawFields.length === 0) warnings.push("schema has no fields")

  const seen = new Set<string>()
  const fields: StreamFieldSchema[] = []
  rawFields.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object") {
      warnings.push(`fields[${index}] is not an object and was ignored`)
      return
    }
    const field = { ...(entry as Record<string, unknown>) }
    const name = field.name
    if (typeof name !== "string" || name.length === 0) {
      warnings.push(`fields[${index}] has no name and was ignored`)
      return
    }
    const label = `field "${name}"`
    if (seen.has(name)) {
      warnings.push(`${label} is listed more than once; the duplicate was ignored`)
      return
    }
    seen.add(name)
    for (const key of Object.keys(field)) {
      if (!FIELD_KEYS.includes(key)) {
        warnings.push(`${label} has unknown key "${key}"${suggestKey(key, FIELD_KEYS)}`)
      }
    }
    const kind = field.kind
    if (!FIELD_KINDS.includes(kind as StreamFieldKind)) {
      const alias =
        typeof kind === "string" ? KIND_ALIASES[kind.toLowerCase()] : undefined
      const expected = `expected ${FIELD_KINDS.join(", ")}`
      if (alias) {
        warnings.push(`${label} has kind "${kind}"; treated as "${alias}" (${expected})`)
        field.kind = alias
      } else {
        warnings.push(`${label} has unknown kind ${JSON.stringify(kind)} and is unused (${expected})`)
      }
    }
    if (field.role !== undefined && !FIELD_ROLES.includes(field.role as StreamFieldRole)) {
      warnings.push(`${label} has unknown role ${JSON.stringify(field.role)}; the role was ignored`)
      delete field.role
    }
    if (
      field.cardinality !== undefined &&
      !(typeof field.cardinality === "number" && Number.isFinite(field.cardinality) && field.cardinality >= 0)
    ) {
      warnings.push(`${label} cardinality must be a non-negative number; it was ignored`)
      delete field.cardinality
    }
    if (field.additive !== undefined && typeof field.additive !== "boolean") {
      warnings.push(`${label} additive must be true or false; it was ignored`)
      delete field.additive
    }
    fields.push(field as unknown as StreamFieldSchema)
  })
  schema.fields = fields

  const throughput = raw.throughput
  if (
    throughput !== undefined &&
    !(throughput === "low" || throughput === "medium" || throughput === "high") &&
    !(typeof throughput === "number" && Number.isFinite(throughput) && throughput >= 0)
  ) {
    warnings.push(
      `throughput ${JSON.stringify(throughput)} was ignored (expected "low", "medium", "high", or rows per second)`
    )
    delete schema.throughput
  }
  if (
    raw.retention !== undefined &&
    raw.retention !== "windowed" &&
    raw.retention !== "cumulative"
  ) {
    warnings.push(`retention ${JSON.stringify(raw.retention)} was ignored (expected "windowed" or "cumulative")`)
    delete schema.retention
  }
  if (
    raw.shape !== undefined &&
    raw.shape !== "append" &&
    raw.shape !== "keyed" &&
    raw.shape !== "aggregate"
  ) {
    warnings.push(`shape ${JSON.stringify(raw.shape)} was ignored (expected "append", "keyed", or "aggregate")`)
    delete schema.shape
  }
  if (raw.keyFields !== undefined) {
    if (!Array.isArray(raw.keyFields)) {
      warnings.push("keyFields must be an array of field names; it was ignored")
      delete schema.keyFields
    } else {
      for (const key of raw.keyFields) {
        if (typeof key !== "string" || !seen.has(key)) {
          warnings.push(`keyFields entry ${JSON.stringify(key)} is not a field name`)
        }
      }
    }
  }
  if (fields.length > 0 && !fields.some((field) => FIELD_KINDS.includes(field.kind))) {
    warnings.push("no field has a usable kind, so no chart can be suggested")
  }
  return { schema, warnings }
}

const ID_EXACT = /^(id|uuid|guid|pk)$/i
const ID_SUFFIX = /(_id|Id|ID)$/

/** Names that should not be plotted as measures when no value role is set. */
export function isIdLikeFieldName(name: string): boolean {
  return ID_EXACT.test(name) || ID_SUFFIX.test(name)
}

function schemaFields(schema: StreamSchema): ReadonlyArray<StreamFieldSchema> {
  return schema.fields ?? []
}

/** Identity columns: explicit `keyFields` unioned with `role: "key"`. */
export function streamKeyFields(schema: StreamSchema): string[] {
  const keys = new Set<string>()
  for (const name of schema.keyFields ?? []) {
    if (typeof name === "string" && name.length > 0) keys.add(name)
  }
  for (const field of schemaFields(schema)) {
    if (field.role === "key") keys.add(field.name)
  }
  return Array.from(keys)
}

/**
 * Resolve changelog semantics. Explicit `shape` wins; otherwise a schema
 * with identity columns is keyed, and everything else is append-only.
 */
export function resolveStreamShape(schema: StreamSchema): StreamShape {
  if (schema.shape) return schema.shape
  return streamKeyFields(schema).length > 0 ? "keyed" : "append"
}

export function streamThroughputBand(
  schema: StreamSchema,
  thresholds?: StreamThroughputThresholds
): StreamThroughputBand | undefined {
  const throughput = schema.throughput
  if (throughput === undefined) return undefined
  if (
    throughput === "low" ||
    throughput === "medium" ||
    throughput === "high"
  ) {
    return throughput
  }
  if (!Number.isFinite(throughput) || throughput < 0) return undefined
  const medium = thresholds?.medium ?? DEFAULT_MEDIUM
  const high = thresholds?.high ?? DEFAULT_HIGH
  if (throughput >= high) return "high"
  if (throughput >= medium) return "medium"
  return "low"
}

function isKeyField(
  field: StreamFieldSchema,
  keyNames: ReadonlySet<string>
): boolean {
  return field.role === "key" || keyNames.has(field.name)
}

/**
 * A key column can stand in as the category of a keyed table — each row
 * describes one key. Dates are time, not categories, and id-like names
 * (`order_id`) usually identify events rather than groups; set
 * `role: "category"` to plot one anyway.
 */
function isCategoryLikeKey(
  field: StreamFieldSchema,
  keyNames: ReadonlySet<string>,
  timeName: string | undefined
): boolean {
  return (
    isKeyField(field, keyNames) &&
    field.kind !== "date" &&
    field.name !== timeName &&
    field.role !== "series" &&
    !isIdLikeFieldName(field.name)
  )
}

export function pickTimeField(
  schema: StreamSchema
): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  return (
    fields.find(
      (field) =>
        field.role === "x" &&
        (field.kind === "numeric" || field.kind === "date")
    ) ?? fields.find((field) => field.kind === "date")
  )
}

export function pickValueField(
  schema: StreamSchema
): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const byValueRole = fields.find(
    (field) =>
      field.kind === "numeric" &&
      field.role === "value" &&
      !isKeyField(field, keyNames)
  )
  if (byValueRole) return byValueRole
  const byYRole = fields.find(
    (field) =>
      field.kind === "numeric" &&
      field.role === "y" &&
      !isKeyField(field, keyNames)
  )
  if (byYRole) return byYRole
  return fields.find(
    (field) =>
      field.kind === "numeric" &&
      !isKeyField(field, keyNames) &&
      field.role == null &&
      !isIdLikeFieldName(field.name)
  )
}

/**
 * The primary categorical channel. An explicit `role: "category"` wins
 * (key or not); then the first non-key categorical, then a boolean; then,
 * for keyed tables, a key column (see {@link isCategoryLikeKey}).
 */
export function pickCategoryField(
  schema: StreamSchema
): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const timeName = pickTimeField(schema)?.name
  const byRole = fields.find(
    (field) => field.role === "category" && field.name !== timeName
  )
  if (byRole) return byRole
  const unkeyed = (kind: StreamFieldSchema["kind"]) =>
    fields.find(
      (field) =>
        field.kind === kind &&
        !isKeyField(field, keyNames) &&
        field.role !== "series"
    )
  return (
    unkeyed("categorical") ??
    unkeyed("boolean") ??
    fields.find((field) => isCategoryLikeKey(field, keyNames, timeName))
  )
}

/** A second categorical channel distinct from {@link pickCategoryField}. */
export function pickSeriesField(
  schema: StreamSchema
): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const timeName = pickTimeField(schema)?.name
  const byRole = fields.find(
    (field) => field.role === "series" && field.name !== timeName
  )
  if (byRole) return byRole
  const category = pickCategoryField(schema)
  const candidate = (field: StreamFieldSchema) =>
    field.name !== category?.name && field.role !== "category"
  return (
    fields.find(
      (field) =>
        (field.kind === "categorical" || field.kind === "boolean") &&
        !isKeyField(field, keyNames) &&
        candidate(field)
    ) ??
    fields.find(
      (field) => isCategoryLikeKey(field, keyNames, timeName) && candidate(field)
    )
  )
}

/**
 * The field that splits a time chart into one series per value. Time charts
 * have no category axis, so an explicit series role wins and otherwise the
 * primary category becomes the series.
 */
export function pickSplitField(
  schema: StreamSchema
): StreamFieldSchema | undefined {
  const timeName = pickTimeField(schema)?.name
  return (
    schemaFields(schema).find(
      (field) => field.role === "series" && field.name !== timeName
    ) ?? pickCategoryField(schema)
  )
}

/** Every numeric field usable as a measure, value/y roles first. */
export function pickMeasureFields(schema: StreamSchema): StreamFieldSchema[] {
  const keyNames = new Set(streamKeyFields(schema))
  const timeName = pickTimeField(schema)?.name
  const measures = schemaFields(schema).filter(
    (field) =>
      field.kind === "numeric" &&
      field.name !== timeName &&
      !isKeyField(field, keyNames) &&
      (field.role === "value" ||
        field.role === "y" ||
        field.role === "size" ||
        (field.role == null && !isIdLikeFieldName(field.name)))
  )
  const rank = (field: StreamFieldSchema) =>
    field.role === "value" ? 0 : field.role === "y" ? 1 : 2
  return measures.sort((a, b) => rank(a) - rank(b))
}

/** Declared distinct-value count; booleans are always two. */
export function streamFieldCardinality(
  field: StreamFieldSchema | undefined
): number | undefined {
  if (!field) return undefined
  if (
    typeof field.cardinality === "number" &&
    Number.isFinite(field.cardinality) &&
    field.cardinality >= 0
  ) {
    return field.cardinality
  }
  return field.kind === "boolean" ? 2 : undefined
}

function nameTokens(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

const DELTA_TOKENS = new Set([
  "delta",
  "deltas",
  "change",
  "changes",
  "diff",
  "net",
  "pnl",
  "flow",
  "inflow",
  "outflow"
])
const COUNT_TOKENS = new Set(["count", "counts", "cnt", "qty", "quantity"])

/** Names that read as a signed change (`price_delta`, `netFlow`). */
export function isDeltaLikeFieldName(name: string): boolean {
  return nameTokens(name).some((token) => DELTA_TOKENS.has(token))
}

/**
 * Whether summing the measure across events is meaningful: the explicit
 * `additive` hint, else `true` for count- or delta-like names, else
 * unknown. Names never infer `false`; only the hint excludes charts.
 */
export function streamMeasureAdditivity(
  field: StreamFieldSchema | undefined
): boolean | undefined {
  if (!field) return undefined
  if (typeof field.additive === "boolean") return field.additive
  const tokens = nameTokens(field.name)
  return tokens.some((token) => DELTA_TOKENS.has(token) || COUNT_TOKENS.has(token))
    ? true
    : undefined
}

/**
 * Whether a chart that totals the measure per bound value adds up several
 * events. False for a single-row aggregate and for a keyed table whose
 * every key is among `boundNames` (one current row per bound value). A
 * keyed table that declares no keys is assumed to be keyed by what the
 * chart binds.
 */
export function streamSumsAcrossEvents(
  schema: StreamSchema,
  boundNames: ReadonlyArray<string | undefined>
): boolean {
  const shape = resolveStreamShape(schema)
  if (shape === "aggregate") return false
  if (shape !== "keyed") return true
  return streamKeyFields(schema).some((key) => !boundNames.includes(key))
}

export interface StreamSumPolicy {
  /** Exclusion reason when the measure is declared non-additive. */
  exclude?: string
  /** Score multiplier: 0.5 while additivity is unknown, otherwise 1. */
  factor: number
  caveats: string[]
}

/**
 * How a chart that totals the measure per category behaves on this
 * stream. Nothing changes when each bound value is one current row;
 * otherwise a non-additive measure excludes the chart and an unknown one
 * halves its scores and says what is being summed.
 */
export function streamCategorySumPolicy(
  schema: StreamSchema,
  component: string,
  boundNames: ReadonlyArray<string | undefined>
): StreamSumPolicy {
  const value = pickValueField(schema)
  const category = boundNames[0]
  if (!value || !streamSumsAcrossEvents(schema, boundNames)) {
    return { factor: 1, caveats: [] }
  }
  const additive = streamMeasureAdditivity(value)
  if (additive === false) {
    return {
      exclude: `${component} would sum "${value.name}" across events per "${category}", but "${value.name}" is marked non-additive — aggregate it upstream (for example a keyed windowed mean) first`,
      factor: 0,
      caveats: []
    }
  }
  if (additive === true) {
    return {
      factor: 1,
      caveats: [`values are running totals of "${value.name}" over the retained events`]
    }
  }
  return {
    factor: 0.5,
    caveats: [
      `sums "${value.name}" across every retained event per "${category}" — meaningful for counts and amounts, not levels such as prices or latencies; set additive on "${value.name}", or stream a keyed table with one row per "${category}"`
    ]
  }
}

/**
 * How a push-mode chart keeps one row per key on a keyed stream: pushing a
 * changelog adds a row per update, so updates must replace rows by id.
 * Empty for append and aggregate streams.
 */
export function streamKeyedChangelogCaveat(
  schema: StreamSchema,
  idProp: string
): string[] {
  if (resolveStreamShape(schema) !== "keyed") return []
  const keys = streamKeyFields(schema)
  const key =
    keys.length === 1
      ? `"${keys[0]}"`
      : keys.length > 1
        ? `a composite id of ${keys.map((name) => `"${name}"`).join(" + ")}`
        : "the row key"
  return [
    `keyed stream: feed changelog rows through applyChangelog(ref.current, rows, { key }) with ${idProp} set to ${key}, so updates replace rows instead of adding to them`
  ]
}

/**
 * True when nothing in the schema varies by time or group, so a display
 * can only show one current value: a declared aggregate, or an append
 * stream with a measure and no time, category, or key fields.
 */
export function isSingleValueStream(schema: StreamSchema): boolean {
  if (!hasNumericValue(schema)) return false
  const shape = resolveStreamShape(schema)
  if (shape === "aggregate") return true
  return (
    shape === "append" &&
    !hasTimeField(schema) &&
    !hasCategoryField(schema) &&
    streamKeyFields(schema).length === 0
  )
}

/**
 * Rows per second: the numeric `throughput`, or the lower bound of a
 * string band (so "high" means at least 100/s). Undefined when unset.
 */
export function streamRowsPerSecond(schema: StreamSchema): number | undefined {
  const throughput = schema.throughput
  if (typeof throughput === "number") {
    return Number.isFinite(throughput) && throughput >= 0 ? throughput : undefined
  }
  if (throughput === "high") return DEFAULT_HIGH
  if (throughput === "medium") return DEFAULT_MEDIUM
  return undefined
}

/** Realtime charts retain 200 rows unless told otherwise. */
export const DEFAULT_STREAM_BUFFER = 200
/** Seconds of history a suggested retention buffer aims to keep visible. */
export const STREAM_VISIBLE_SECONDS = 30

/**
 * Ring-buffer props for a raw-event realtime chart: `windowMode: "growing"`
 * for cumulative retention, otherwise a `windowSize` large enough for
 * {@link STREAM_VISIBLE_SECONDS} at the stream's rate (capped at `cap`).
 * Empty when the 200-row default already covers the window.
 */
export function streamBufferProps(
  schema: StreamSchema,
  cap: number
): { windowMode?: "growing"; windowSize?: number } {
  if (schema.retention === "cumulative") return { windowMode: "growing" }
  const rate = streamRowsPerSecond(schema)
  if (rate === undefined) return {}
  const size = Math.min(cap, Math.ceil(rate * STREAM_VISIBLE_SECONDS))
  return size > DEFAULT_STREAM_BUFFER ? { windowSize: size } : {}
}

const NICE_DURATIONS_MS = [
  10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000,
  120000, 300000, 600000, 900000, 1800000, 3600000
]

/** The smallest readable duration (ms) at or above `ms`. */
export function niceStreamDuration(ms: number): number {
  return (
    NICE_DURATIONS_MS.find((nice) => nice >= ms) ??
    NICE_DURATIONS_MS[NICE_DURATIONS_MS.length - 1]
  )
}

// Typical rates inside each band, for sizing bins rather than buffers.
const BAND_TYPICAL_RATE: Readonly<Record<StreamThroughputBand, number>> = {
  low: 0.5,
  medium: 10,
  high: DEFAULT_HIGH
}

/**
 * Time-bin width (ms) giving about 30 bins across the retained window,
 * or one second when the rate is unknown.
 */
export function streamBinSize(schema: StreamSchema, bufferSize: number): number {
  const throughput = schema.throughput
  const rate =
    typeof throughput === "number"
      ? streamRowsPerSecond(schema)
      : throughput && BAND_TYPICAL_RATE[throughput]
  if (!rate || schema.retention === "cumulative") return 1000
  return niceStreamDuration(((bufferSize / rate) * 1000) / 30)
}

export function hasNumericValue(schema: StreamSchema): boolean {
  return pickValueField(schema) !== undefined
}

export function hasTimeField(schema: StreamSchema): boolean {
  return pickTimeField(schema) !== undefined
}

export function hasCategoryField(schema: StreamSchema): boolean {
  return pickCategoryField(schema) !== undefined
}

export function hasSeriesField(schema: StreamSchema): boolean {
  return pickSeriesField(schema) !== undefined
}
