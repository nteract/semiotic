import type { ArtifactContract, ObligationResult } from "./types"

function duplicates(values: ReadonlyArray<string>): Set<string> {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return repeated
}

/** Audit correction references and their corresponding claim lifecycle states. */
export function auditClaimCorrections(
  contract: Pick<ArtifactContract, "claims" | "contestability">
): ObligationResult[] {
  const findings: ObligationResult[] = []
  const claimIds = new Set(contract.claims.map(({ id }) => id))
  const claimsById = new Map(contract.claims.map((claim) => [claim.id, claim]))
  const corrections = contract.contestability?.corrections ?? []

  for (const id of duplicates(corrections.map(({ id }) => id))) {
    findings.push({
      id: `corrections.duplicate.${id}`,
      relation: "challenge-and-correction",
      status: "fail",
      path: "contestability.corrections",
      message: `Correction identifier "${id}" is not unique.`,
      repair: "Assign a stable, unique identifier to each correction."
    })
  }
  for (const [index, correction] of corrections.entries()) {
    const path = `contestability.corrections[${index}]`
    const affected = correction.affectedClaimIds
    const replacements = correction.replacementClaimIds ?? []
    for (const claimId of [...affected, ...replacements]) {
      if (!claimIds.has(claimId)) {
        findings.push({
          id: `corrections.missing-claim.${correction.id}.${claimId}`,
          relation: "challenge-and-correction",
          status: "fail",
          path,
          message: `Correction "${correction.id}" references missing claim "${claimId}".`,
          repair: "Add the claim record or correct the correction reference."
        })
      }
    }
    for (const claimId of affected) {
      const affectedClaim = claimsById.get(claimId)
      if (!affectedClaim) continue
      const expectedStatus =
        replacements.length > 0 ? "superseded" : "retracted"
      if (affectedClaim.status !== expectedStatus) {
        findings.push({
          id: `corrections.affected-status.${correction.id}.${claimId}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: `${path}.affectedClaimIds`,
          message: `Correction "${correction.id}" requires affected claim "${claimId}" to be ${expectedStatus}, but it remains ${affectedClaim.status}.`,
          repair: `Mark the affected claim ${expectedStatus} while preserving its record.`
        })
      }
    }
    for (const affectedId of replacements.length > 0 ? affected : []) {
      const linked = replacements.some((replacementId) =>
        claimsById.get(replacementId)?.supersedes?.includes(affectedId)
      )
      if (!linked) {
        findings.push({
          id: `corrections.replacement-link.${correction.id}.${affectedId}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: `${path}.replacementClaimIds`,
          message: `Correction "${correction.id}" does not link a replacement claim back to affected claim "${affectedId}".`,
          repair:
            "Add the affected claim identifier to a replacement claim's supersedes list."
        })
      }
    }
  }
  return findings
}
