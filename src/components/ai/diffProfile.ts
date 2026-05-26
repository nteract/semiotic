import type { ChartDataProfile, FieldKind } from "./chartCapabilityTypes"
import { getCapabilities } from "./chartCapabilities"

export type PrimaryRole = "x" | "y" | "size" | "category" | "series" | "time"

export interface FieldTypeChange {
  field: string
  from: FieldKind | "unknown"
  to: FieldKind | "unknown"
}

export interface PrimaryRoleChange {
  role: PrimaryRole
  from: string | undefined
  to: string | undefined
}

export interface ProfileDiff {
  /** Row count change (b.rowCount - a.rowCount). */
  rowCountChange: number
  /** Fields present in b but not in a. */
  added: ReadonlyArray<string>
  /** Fields present in a but not in b. */
  removed: ReadonlyArray<string>
  /** Fields whose inferred type changed. */
  typeChanges: ReadonlyArray<FieldTypeChange>
  /** Primary role re-assignments (e.g. x switched from "month" to "date"). */
  primaryChanges: ReadonlyArray<PrimaryRoleChange>
  /** Suggestion components that fit a but not b. */
  becameUnfit: ReadonlyArray<string>
  /** Suggestion components that fit b but not a. */
  becameFit: ReadonlyArray<string>
  /** True when no observable change was detected. */
  unchanged: boolean
}

const PRIMARY_ROLES: ReadonlyArray<PrimaryRole> = ["x", "y", "size", "category", "series", "time"]

function fieldKind(profile: ChartDataProfile, field: string): FieldKind | "unknown" {
  const summary = profile.fields[field]
  if (!summary) return "unknown"
  if (summary.type === "numeric") return "numeric"
  if (summary.type === "categorical") return "categorical"
  if (summary.type === "date") return "date"
  return "unknown"
}

function fittingComponents(profile: ChartDataProfile): Set<string> {
  const set = new Set<string>()
  for (const capability of getCapabilities()) {
    if (capability.fits(profile) === null) set.add(capability.component)
  }
  return set
}

/**
 * Compare two profiles and report what changed plus how the change affects
 * chart suitability. Useful for:
 *
 *   • "Why does my dashboard look different after the data refreshed?"
 *   • Editor warnings when a CSV upload would change the visible charts.
 *   • CI checks that flag when a fixture migration affects descriptor coverage.
 *
 * Doesn't compute *which suggestions ranked first* (that requires intent +
 * full suggestCharts). Reports only structural deltas — added/removed fields,
 * type changes, primary role re-assignments, fit set changes.
 *
 * @example
 * const a = profileData(yesterdaysData)
 * const b = profileData(todaysData)
 * const diff = diffProfile(a, b)
 * if (diff.becameUnfit.length) {
 *   console.warn(`These charts no longer fit: ${diff.becameUnfit.join(", ")}`)
 * }
 */
export function diffProfile(a: ChartDataProfile, b: ChartDataProfile): ProfileDiff {
  const aFields = new Set(Object.keys(a.fields))
  const bFields = new Set(Object.keys(b.fields))

  const added: string[] = []
  const removed: string[] = []
  for (const field of bFields) {
    if (!aFields.has(field)) added.push(field)
  }
  for (const field of aFields) {
    if (!bFields.has(field)) removed.push(field)
  }
  added.sort()
  removed.sort()

  const typeChanges: FieldTypeChange[] = []
  for (const field of bFields) {
    if (!aFields.has(field)) continue
    const aKind = fieldKind(a, field)
    const bKind = fieldKind(b, field)
    if (aKind !== bKind) typeChanges.push({ field, from: aKind, to: bKind })
  }
  typeChanges.sort((x, y) => x.field.localeCompare(y.field))

  const primaryChanges: PrimaryRoleChange[] = []
  for (const role of PRIMARY_ROLES) {
    const aValue = a.primary[role]
    const bValue = b.primary[role]
    if (aValue !== bValue) primaryChanges.push({ role, from: aValue, to: bValue })
  }

  const aFit = fittingComponents(a)
  const bFit = fittingComponents(b)
  const becameUnfit = Array.from(aFit).filter((c) => !bFit.has(c)).sort()
  const becameFit = Array.from(bFit).filter((c) => !aFit.has(c)).sort()

  const unchanged =
    added.length === 0 &&
    removed.length === 0 &&
    typeChanges.length === 0 &&
    primaryChanges.length === 0 &&
    becameUnfit.length === 0 &&
    becameFit.length === 0 &&
    a.rowCount === b.rowCount

  return {
    rowCountChange: b.rowCount - a.rowCount,
    added,
    removed,
    typeChanges,
    primaryChanges,
    becameUnfit,
    becameFit,
    unchanged,
  }
}
