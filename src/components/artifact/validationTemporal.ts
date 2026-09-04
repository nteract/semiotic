import {
  isRecord,
  rejectUnknownKeys,
  stringIfPresent,
  optionalRecord,
  optionalArray,
  validateStringFields,
  type StringFieldRule,
  type ValidationIssue
} from "./validationPrimitives"

const FRESHNESS = ["fresh", "stale", "unknown"]
const COMPLETENESS = ["partial", "provisional", "settled", "unknown"]
const CLOCKS = [
  "observedAt",
  "ingestedAt",
  "processedAt",
  "publishedAt",
  "snapshotAt"
]

// The ordered definitions supply both the allowed keys and their validation.
// Adding a clock field cannot accidentally leave the closed-shape check stale.
const RECORDS: Record<string, Record<string, StringFieldRule>> = {
  eventTime: { field: {}, value: {}, timezone: {}, granularity: {} },
  presentation: {
    state: { values: ["live", "historical", "mixed"] },
    label: {}
  },
  freshness: {
    status: { required: true, values: FRESHNESS },
    checkedAt: {},
    heartbeatAt: {},
    expiresAt: {},
    basis: {}
  },
  watermark: { value: { required: true }, policy: {}, allowedLateness: {} },
  window: {
    start: { required: true },
    end: { required: true },
    status: {
      required: true,
      values: ["open", "provisional", "settled", "reopened", "corrected"]
    }
  },
  completeness: { status: { required: true, values: COMPLETENESS }, basis: {} },
  revision: {
    status: {
      required: true,
      values: ["original", "backfilled", "corrected", "superseded"]
    },
    previousArtifactId: {},
    correctionId: {},
    reason: {}
  },
  snapshot: {
    id: {},
    format: { values: ["iceberg", "delta", "other"] },
    schemaVersion: {},
    catalogRef: {}
  }
}

const SOURCE: Record<string, StringFieldRule> = {
  id: { required: true },
  kind: {
    required: true,
    values: [
      "stream",
      "processing-job",
      "quality-check",
      "snapshot",
      "publication"
    ]
  },
  label: {},
  observedAt: {},
  version: {},
  timezone: {},
  granularity: {},
  freshness: { values: FRESHNESS },
  completeness: { values: COMPLETENESS }
}

/** Validate nested clock and source shapes used by the deterministic audit. */
export function validateTemporalStructure(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const path = "$.time"
  rejectUnknownKeys(
    value,
    [...CLOCKS, ...Object.keys(RECORDS), "sources"],
    path,
    errors
  )
  for (const key of CLOCKS) stringIfPresent(value, key, path, errors)
  for (const [key, fields] of Object.entries(RECORDS)) {
    const record = optionalRecord(value, key, path, errors)
    if (record) validateStringFields(record, fields, `${path}.${key}`, errors)
  }
  optionalArray(value, "sources", path, errors)?.forEach((source, index) => {
    const sourcePath = `${path}.sources[${index}]`
    if (!isRecord(source)) {
      errors.push({ path: sourcePath, message: "Expected a source object." })
      return
    }
    validateStringFields(source, SOURCE, sourcePath, errors)
  })
}
