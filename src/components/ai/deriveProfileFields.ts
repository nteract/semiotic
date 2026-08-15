import type { Datum } from "../charts/shared/datumTypes"
import type { ChartDataProfile } from "./chartCapabilityTypes"
import {
  fieldHasRole,
  identifierFields,
  normalizeProfileFieldRoles,
  PROFILE_X_FIELD_HINT,
  type CandidateFieldRole,
  type NormalizedProfileFieldRoles,
} from "./fieldRoles"

export interface ProfilePrimaryFields {
  x?: string
  y?: string
  size?: string
  category?: string
  series?: string
  time?: string
}

export interface ReprofileFieldsOptions {
  /**
   * Explicit primary assignments to apply after candidate selection. A field
   * must remain a candidate for that role; identifiers and ignored fields can
   * never be assigned. Passing an explicit `undefined` clears a role.
   */
  primary?: Partial<ProfilePrimaryFields>
}

export interface DerivedProfileFields {
  primary: ProfilePrimaryFields
  categoryCount?: number
  seriesCount?: number
  uniqueXCount?: number
  hasRepeatedX: boolean
  monotonicX: boolean
  hasTimeAxis: boolean
  xProvenance: ChartDataProfile["xProvenance"]
  stackability?: ChartDataProfile["stackability"]
}

type FieldCandidates = ChartDataProfile["candidates"]

function fieldCardinality(
  data: ReadonlyArray<Datum>,
  field: string | undefined,
): { distinct?: number; repeated: boolean } {
  if (!field) return { repeated: false }
  const seen = new Set<string>()
  let count = 0
  for (const row of data) {
    const value = row?.[field]
    if (value == null) continue
    count++
    seen.add(String(value))
  }
  return { distinct: seen.size, repeated: seen.size < count }
}

function xProvenanceFor(
  x: string | undefined,
  time: string | undefined,
  roles: NormalizedProfileFieldRoles,
): ChartDataProfile["xProvenance"] {
  if (!x) return "none"
  if (x === time) return "time"
  // An explicit x assignment is high-confidence in the same way a strong
  // field-name signal is; retain the existing public provenance vocabulary.
  if (fieldHasRole(roles, x, "x") || PROFILE_X_FIELD_HINT.test(x)) return "named"
  return "scatter"
}

function computeStackability(
  data: ReadonlyArray<Datum>,
  x: string | undefined,
  series: string | undefined,
): ChartDataProfile["stackability"] {
  if (!x || !series) return undefined
  const seriesByX = new Map<string, Set<string>>()
  for (const row of data) {
    const xValue = row?.[x]
    const seriesValue = row?.[series]
    if (xValue == null || seriesValue == null) continue
    const key = String(xValue)
    const values = seriesByX.get(key) ?? new Set<string>()
    values.add(String(seriesValue))
    seriesByX.set(key, values)
  }
  if (seriesByX.size === 0) return undefined
  let seriesTotal = 0
  let multiSeriesColumns = 0
  for (const values of seriesByX.values()) {
    seriesTotal += values.size
    if (values.size >= 2) multiSeriesColumns++
  }
  return {
    seriesPerX: seriesTotal / seriesByX.size,
    multiSeriesFraction: multiSeriesColumns / seriesByX.size,
    xColumns: seriesByX.size,
  }
}

function validateOverride(
  candidates: FieldCandidates,
  roles: NormalizedProfileFieldRoles,
  role: CandidateFieldRole,
  field: string,
): void {
  const fieldRoles = roles[field] ?? []
  if (
    fieldRoles.some((fieldRole) =>
      fieldRole === "identifier" || fieldRole === "ignore",
    ) ||
    !candidates[role].some((candidate) => candidate.field === field)
  ) {
    throw new Error(
      `Invalid ${role} field "${field}": identifier, ignored, or not a candidate.`,
    )
  }
}

/**
 * Derive primary roles and every dependent count from candidate lists.
 * Exported separately so callers that reorder/filter candidates can restore a
 * coherent profile without mutating stale `primary` or cardinality fields.
 */
export function deriveProfileFields(
  data: ReadonlyArray<Datum>,
  candidates: FieldCandidates,
  roles: NormalizedProfileFieldRoles,
  options: ReprofileFieldsOptions = {},
): DerivedProfileFields {
  const time = candidates.time[0]?.field

  let x: string | undefined =
    candidates.x.find((candidate) =>
      fieldHasRole(roles, candidate.field, "x"),
    )?.field ?? time
  if (!x) {
    x = candidates.x.find(
      (candidate) =>
        candidate.kind === "numeric" && PROFILE_X_FIELD_HINT.test(candidate.field),
    )?.field
  }

  const y = candidates.y.find((candidate) => candidate.field !== x)?.field

  // Two quantitative candidates with no ordered/time signal form a scatter
  // fallback. Candidate edits remain authoritative because we only inspect the
  // lists supplied to this function.
  if (!x && y) {
    x = candidates.x.find(
      (candidate) =>
        candidate.kind === "numeric" && candidate.field !== y,
    )?.field
  }

  const size = candidates.size.find(
    (candidate) => candidate.field !== x && candidate.field !== y,
  )?.field

  const provenance = xProvenanceFor(x, time, roles)
  const strongX = provenance === "time" || provenance === "named"
  let category: string | undefined
  let series: string | undefined
  if (strongX) {
    series = candidates.series[0]?.field
    category = candidates.category.find(
      (candidate) => candidate.field !== series,
    )?.field
  } else {
    category = candidates.category[0]?.field
    series = candidates.series.find(
      (candidate) => candidate.field !== category,
    )?.field
  }

  const primary: ProfilePrimaryFields = {
    x,
    y,
    size,
    category,
    series,
    time,
  }

  if (options.primary) {
    for (const [role, field] of Object.entries(options.primary) as Array<
      [CandidateFieldRole, string | undefined]
    >) {
      if (field !== undefined) validateOverride(candidates, roles, role, field)
      primary[role] = field
    }
  }

  const finalProvenance = xProvenanceFor(primary.x, primary.time, roles)
  const categoryStats = fieldCardinality(data, primary.category)
  const seriesStats = fieldCardinality(data, primary.series)
  const xValues = fieldCardinality(data, primary.x)
  return {
    primary,
    categoryCount: categoryStats.distinct,
    seriesCount: seriesStats.distinct,
    uniqueXCount: xValues.distinct,
    hasRepeatedX: xValues.repeated,
    monotonicX:
      candidates.x.find((candidate) => candidate.field === primary.x)
        ?.monotonic ?? false,
    hasTimeAxis: candidates.time.length > 0,
    xProvenance: finalProvenance,
    stackability: computeStackability(data, primary.x, primary.series),
  }
}

/** Return a new profile whose derived fields match its current candidates. */
export function rederiveProfile(
  profile: ChartDataProfile,
  options: ReprofileFieldsOptions = {},
): ChartDataProfile {
  const roles = normalizeProfileFieldRoles(
    profile.fieldRoles,
    profile.identifiers,
  )
  return {
    ...profile,
    fieldRoles: roles,
    identifiers: identifierFields(roles),
    ...deriveProfileFields(profile.data, profile.candidates, roles, options),
  }
}
