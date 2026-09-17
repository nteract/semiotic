import type {
  StreamFieldSchema,
  StreamSchema,
  StreamShape,
  StreamThroughputBand,
  StreamThroughputThresholds,
} from "./streamingTypes"

const DEFAULT_MEDIUM = 1
const DEFAULT_HIGH = 100

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
  thresholds?: StreamThroughputThresholds,
): StreamThroughputBand | undefined {
  const throughput = schema.throughput
  if (throughput === undefined) return undefined
  if (throughput === "low" || throughput === "medium" || throughput === "high") {
    return throughput
  }
  if (!Number.isFinite(throughput) || throughput < 0) return undefined
  const medium = thresholds?.medium ?? DEFAULT_MEDIUM
  const high = thresholds?.high ?? DEFAULT_HIGH
  if (throughput >= high) return "high"
  if (throughput >= medium) return "medium"
  return "low"
}

function isKeyField(field: StreamFieldSchema, keyNames: ReadonlySet<string>): boolean {
  return field.role === "key" || keyNames.has(field.name)
}

export function pickTimeField(schema: StreamSchema): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  return (
    fields.find((field) => field.role === "x") ??
    fields.find((field) => field.kind === "date")
  )
}

export function pickValueField(schema: StreamSchema): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const byValueRole = fields.find(
    (field) => field.role === "value" && !isKeyField(field, keyNames),
  )
  if (byValueRole) return byValueRole
  const byYRole = fields.find(
    (field) => field.role === "y" && !isKeyField(field, keyNames),
  )
  if (byYRole) return byYRole
  return fields.find(
    (field) =>
      field.kind === "numeric" &&
      !isKeyField(field, keyNames) &&
      field.role !== "size" &&
      !isIdLikeFieldName(field.name),
  )
}

export function pickCategoryField(schema: StreamSchema): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const byRole = fields.find(
    (field) => field.role === "category" && !isKeyField(field, keyNames),
  )
  if (byRole) return byRole
  return fields.find(
    (field) =>
      field.kind === "categorical" &&
      !isKeyField(field, keyNames) &&
      field.role !== "series",
  )
}

export function pickSeriesField(schema: StreamSchema): StreamFieldSchema | undefined {
  const fields = schemaFields(schema)
  const keyNames = new Set(streamKeyFields(schema))
  const byRole = fields.find(
    (field) => field.role === "series" && !isKeyField(field, keyNames),
  )
  if (byRole) return byRole
  const category = pickCategoryField(schema)
  return fields.find(
    (field) =>
      field.kind === "categorical" &&
      !isKeyField(field, keyNames) &&
      field.role !== "category" &&
      field.name !== category?.name,
  )
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
