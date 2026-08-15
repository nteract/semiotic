/**
 * Semantic and encoding roles callers can assign to fields before profiling.
 *
 * Semantic roles (`measure`, `dimension`, `temporal`) constrain a field to the
 * compatible encoding candidates. Exact roles (`x`, `y`, etc.) additionally
 * boost that candidate and are useful when the normal type/name heuristics are
 * insufficient. `identifier` and `ignore` always win over positive roles.
 */
export type ProfileFieldRole =
  | "identifier"
  | "measure"
  | "dimension"
  | "temporal"
  | "x"
  | "y"
  | "size"
  | "category"
  | "series"
  | "time"
  | "ignore"

export type ProfileFieldRoleHint =
  | ProfileFieldRole
  | ReadonlyArray<ProfileFieldRole>

export type ProfileFieldRoleHints = Readonly<
  Record<string, ProfileFieldRoleHint>
>

export type NormalizedProfileFieldRoles = Readonly<
  Record<string, ReadonlyArray<ProfileFieldRole>>
>

export type CandidateFieldRole =
  | "x"
  | "y"
  | "size"
  | "category"
  | "series"
  | "time"

export const PROFILE_X_FIELD_HINT =
  /^(x|index|rank|order|step|sequence|year|quarter|qtr|fiscal|month|week|day|date|time|timestamp)$/i

const PROFILE_FIELD_ROLE_SET: ReadonlySet<string> = new Set<ProfileFieldRole>([
  "identifier",
  "measure",
  "dimension",
  "temporal",
  "x",
  "y",
  "size",
  "category",
  "series",
  "time",
  "ignore",
])

/** Normalize the two public hint forms into one immutable role map. */
export function normalizeProfileFieldRoles(
  fieldRoles: ProfileFieldRoleHints | undefined,
  identifiers: ReadonlyArray<string> | undefined,
  seriesField?: string,
): NormalizedProfileFieldRoles {
  const normalized: Record<string, ProfileFieldRole[]> = {}

  for (const [field, rawRoles] of Object.entries(fieldRoles ?? {})) {
    const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles]
    normalized[field] = Array.from(
      new Set(
        roles.filter(
          (role): role is ProfileFieldRole =>
            typeof role === "string" && PROFILE_FIELD_ROLE_SET.has(role),
        ),
      ),
    )
  }

  for (const field of identifiers ?? []) {
    if (typeof field !== "string" || field.length === 0) continue
    normalized[field] = Array.from(
      new Set([...(normalized[field] ?? []), "identifier"]),
    )
  }

  // Keep the original seriesField option source-compatible while routing it
  // through the same ranking and exclusion logic as the richer role API.
  if (seriesField) {
    normalized[seriesField] = Array.from(
      new Set([...(normalized[seriesField] ?? []), "series"]),
    )
  }

  return normalized
}

export function fieldHasRole(
  roles: NormalizedProfileFieldRoles,
  field: string,
  role: ProfileFieldRole,
): boolean {
  return roles[field]?.includes(role) ?? false
}

export function identifierFields(
  roles: NormalizedProfileFieldRoles,
): string[] {
  return Object.keys(roles).filter((field) =>
    fieldHasRole(roles, field, "identifier"),
  )
}

/**
 * Whether a field may participate in a candidate list:
 * 0 = excluded, 1 = native heuristic, 2 = explicitly hinted. Exact roles can
 * opt atypical x/category/series fields into their corresponding list.
 */
export function fieldRoleCandidateMatch(
  roles: NormalizedProfileFieldRoles,
  field: string,
  candidateRole: CandidateFieldRole,
  nativeTypeAllowed: boolean,
): 0 | 1 | 2 {
  const hints = roles[field] ?? []
  if (hints.includes("identifier") || hints.includes("ignore")) return 0
  if (hints.length === 0) return nativeTypeAllowed ? 1 : 0

  // Exact categorical roles may opt atypical field types into one candidate
  // list. Semantic and quantitative/time roles retain the native type gate.
  const semanticRole =
    candidateRole === "category" || candidateRole === "series"
      ? "dimension"
      : candidateRole === "time"
        ? "temporal"
        : "measure"
  const hinted =
    hints.includes(candidateRole) ||
    hints.includes(semanticRole) ||
    (candidateRole === "x" && hints.includes("temporal"))
  const atypicalExactRole =
    hints.includes(candidateRole) &&
    (candidateRole === "x" ||
      candidateRole === "category" ||
      candidateRole === "series")
  return hinted && (nativeTypeAllowed || atypicalExactRole) ? 2 : 0
}
