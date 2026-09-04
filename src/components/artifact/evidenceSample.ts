import { canonicalJson } from "./fingerprint"
import type { EvidenceRef, JsonValue } from "./types"

const DEFAULT_MAX_ROWS = 20
const DEFAULT_MAX_FIELDS = 24
const DEFAULT_MAX_FIELD_LENGTH = 120
const DEFAULT_MAX_CHARACTERS = 12_000

function objectValue(value: JsonValue): Record<string, JsonValue> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined
}

/** Bound rows, fields, names, and total payload size as one consistent unit. */
export function boundEvidenceSample(
  sample: NonNullable<EvidenceRef["sample"]>,
  options: {
    maxRows?: number
    maxFields?: number
    maxFieldLength?: number
    maxCharacters?: number
  } = {}
): NonNullable<EvidenceRef["sample"]> {
  const maxRows = Math.max(0, Math.floor(options.maxRows ?? DEFAULT_MAX_ROWS))
  const maxFields = Math.max(
    0,
    Math.floor(options.maxFields ?? DEFAULT_MAX_FIELDS)
  )
  const maxFieldLength = Math.max(
    1,
    Math.floor(options.maxFieldLength ?? DEFAULT_MAX_FIELD_LENGTH)
  )
  const maxCharacters = Math.max(
    2,
    Math.floor(options.maxCharacters ?? DEFAULT_MAX_CHARACTERS)
  )
  const inferredFields = [
    ...new Set(
      (sample.values ?? []).flatMap((value) =>
        Object.keys(objectValue(value) ?? {})
      )
    )
  ].sort()
  const sourceFields = sample.fields ?? inferredFields
  const fields = [...new Set(sourceFields)]
    .filter((field) => field.length <= maxFieldLength)
    .slice(0, maxFields)
  const fieldSet = new Set(fields)
  const output: NonNullable<EvidenceRef["sample"]> = {
    ...(sample.rowCount !== undefined ? { rowCount: sample.rowCount } : {}),
    ...(sample.fields !== undefined || inferredFields.length > 0
      ? { fields }
      : {})
  }
  let truncated =
    sample.truncated === true ||
    fields.length < new Set(sourceFields).size ||
    inferredFields.some((field) => !fieldSet.has(field))

  if (sample.values) {
    const values: JsonValue[] = []
    for (const value of sample.values.slice(0, maxRows)) {
      const record = objectValue(value)
      let next: JsonValue
      if (record) {
        const selected: Record<string, JsonValue> = {}
        for (const field of fields) {
          if (!Object.prototype.hasOwnProperty.call(record, field)) continue
          Object.defineProperty(selected, field, {
            value: record[field],
            enumerable: true,
            configurable: true,
            writable: true
          })
        }
        if (Object.keys(record).some((field) => !fieldSet.has(field))) {
          truncated = true
        }
        next = canonicalJson(selected).value
      } else {
        next = canonicalJson(value).value
      }
      const candidate = { ...output, values: [...values, next] }
      if (JSON.stringify(candidate).length > maxCharacters) {
        truncated = true
        break
      }
      values.push(next)
    }
    if (values.length < sample.values.length) truncated = true
    output.values = values
  }
  return { ...output, ...(truncated ? { truncated: true } : {}) }
}
