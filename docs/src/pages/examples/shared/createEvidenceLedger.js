function duplicateIds(records) {
  const seen = new Set()
  const duplicates = new Set()
  records.forEach((record) => {
    if (typeof record?.id !== "string" || !record.id.trim()) return
    if (seen.has(record?.id)) duplicates.add(record?.id)
    seen.add(record?.id)
  })
  return [...duplicates]
}

export function validateEvidenceLedger({ sources = [], claims = [], claimClasses = {} }) {
  const errors = []
  if (!Array.isArray(sources)) errors.push("Evidence sources must be an array.")
  if (!Array.isArray(claims)) errors.push("Evidence claims must be an array.")
  if (!claimClasses || typeof claimClasses !== "object") {
    errors.push("Evidence claimClasses must be an object.")
  }
  if (errors.length) return { ok: false, errors }

  duplicateIds(sources).forEach((id) => errors.push(`Duplicate evidence source id "${id}".`))
  duplicateIds(claims).forEach((id) => errors.push(`Duplicate evidence claim id "${id}".`))
  sources.forEach((source) => {
    if (typeof source?.id !== "string" || !source.id.trim()) {
      errors.push("Every evidence source requires a non-empty id.")
    }
  })
  const sourceIds = new Set(
    sources
      .map((source) => source?.id)
      .filter((id) => typeof id === "string" && id.trim()),
  )
  claims.forEach((claim) => {
    if (typeof claim?.id !== "string" || !claim.id.trim()) {
      errors.push("Every evidence claim requires a non-empty id.")
    }
    if (!Object.prototype.hasOwnProperty.call(claimClasses, claim?.claimClass)) {
      errors.push(`Claim "${claim?.id}" uses unknown class "${claim?.claimClass}".`)
    }
    const claimSourceIds = claim?.sourceIds ?? []
    if (!Array.isArray(claimSourceIds)) {
      errors.push(`Claim "${claim?.id}" sourceIds must be an array.`)
      return
    }
    claimSourceIds.forEach((sourceId) => {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Claim "${claim?.id}" references missing source "${sourceId}".`)
      }
    })
  })
  return { ok: errors.length === 0, errors }
}

function freezeLedgerRecord(record) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        Array.isArray(value) ? Object.freeze([...value]) : value,
      ]),
    ),
  )
}

export function createEvidenceLedger({ sources = [], claims = [], claimClasses = {} }) {
  const validation = validateEvidenceLedger({ sources, claims, claimClasses })
  if (!validation.ok) throw new Error(validation.errors.join(" "))
  const stableSources = Object.freeze(sources.map(freezeLedgerRecord))
  const stableClaims = Object.freeze(claims.map(freezeLedgerRecord))
  const stableClaimClasses = Object.freeze({ ...claimClasses })
  const sourcesById = new Map(stableSources.map((source) => [source.id, source]))
  const claimsById = new Map(stableClaims.map((claim) => [claim.id, claim]))
  return Object.freeze({
    sources: stableSources,
    claims: stableClaims,
    claimClasses: stableClaimClasses,
    sourceById: (id) => sourcesById.get(id),
    claimById: (id) => claimsById.get(id),
    claimsForSection: (sectionId) =>
      stableClaims.filter((claim) =>
        (claim.chapters ?? claim.sections ?? []).includes(sectionId),
      ),
  })
}
