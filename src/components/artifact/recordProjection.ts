import type { Claim, EvidenceRef } from "./types"

export function projectContractRecords(
  claims: ReadonlyArray<Claim>,
  evidence: ReadonlyArray<EvidenceRef>,
  maxClaims: number,
  maxEvidence: number
): {
  claims: Claim[]
  evidence: EvidenceRef[]
  unresolvedClaims: boolean
  unresolvedEvidence: boolean
} {
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]))
  const evidenceById = new Map(evidence.map((item) => [item.id, item]))
  const selectedClaimIds = new Set<string>()
  const selectedEvidenceIds = new Set<string>()
  let unresolvedClaims = false
  let unresolvedEvidence = false

  const evidenceClosure = (
    ids: ReadonlyArray<string>,
    closure = new Map<string, EvidenceRef>(),
    active = new Set<string>()
  ): Map<string, EvidenceRef> | undefined => {
    for (const id of ids) {
      if (active.has(id)) return undefined
      if (closure.has(id)) continue
      const item = evidenceById.get(id)
      if (!item) return undefined
      active.add(id)
      closure.set(id, item)
      if (
        !evidenceClosure(
          item.transformation?.inputEvidenceIds ?? [],
          closure,
          active
        )
      ) {
        return undefined
      }
      active.delete(id)
    }
    return closure
  }

  const claimClosure = (
    claim: Claim,
    closure = new Map<string, Claim>(),
    active = new Set<string>()
  ): Map<string, Claim> | undefined => {
    if (active.has(claim.id)) return undefined
    if (closure.has(claim.id)) return closure
    active.add(claim.id)
    closure.set(claim.id, claim)
    for (const priorId of claim.supersedes ?? []) {
      const prior = claimsById.get(priorId)
      if (!prior || !claimClosure(prior, closure, active)) return undefined
    }
    active.delete(claim.id)
    return closure
  }

  for (const candidate of claims) {
    if (selectedClaimIds.has(candidate.id)) continue
    const closure = claimClosure(candidate)
    if (!closure) {
      unresolvedClaims = true
      continue
    }
    const newClaims = [...closure.values()].filter(
      ({ id }) => !selectedClaimIds.has(id)
    )
    const requiredEvidence = evidenceClosure(
      [...closure.values()].flatMap(({ evidenceIds }) => evidenceIds)
    )
    if (!requiredEvidence) {
      unresolvedClaims = true
      continue
    }
    const newEvidence = [...requiredEvidence.values()].filter(
      ({ id }) => !selectedEvidenceIds.has(id)
    )
    if (
      selectedClaimIds.size + newClaims.length > maxClaims ||
      selectedEvidenceIds.size + newEvidence.length > maxEvidence
    ) {
      unresolvedClaims = true
      continue
    }
    newClaims.forEach(({ id }) => selectedClaimIds.add(id))
    newEvidence.forEach(({ id }) => selectedEvidenceIds.add(id))
  }

  for (const item of evidence) {
    if (selectedEvidenceIds.has(item.id)) continue
    const closure = evidenceClosure([item.id])
    const additions = [...(closure?.values() ?? [])].filter(
      ({ id }) => !selectedEvidenceIds.has(id)
    )
    if (!closure || selectedEvidenceIds.size + additions.length > maxEvidence) {
      unresolvedEvidence = true
      continue
    }
    additions.forEach(({ id }) => selectedEvidenceIds.add(id))
  }

  return {
    claims: claims.filter(({ id }) => selectedClaimIds.has(id)),
    evidence: evidence.filter(({ id }) => selectedEvidenceIds.has(id)),
    unresolvedClaims,
    unresolvedEvidence
  }
}
