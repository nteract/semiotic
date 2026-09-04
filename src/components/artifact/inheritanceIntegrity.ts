import { auditClaims } from "./claims"
import { auditTemporalContext } from "./temporal"
import type { ArtifactContract } from "./types"

/** Return blocking semantic findings before an artifact changes format. */
export function semanticContractErrors(contract: ArtifactContract): string[] {
  const findings = [
    ...auditClaims(contract).findings,
    ...auditTemporalContext(contract.time, {
      claims: contract.claims,
      corrections: contract.contestability?.corrections
    }).findings
  ]
  return findings
    .filter(({ status }) => status === "fail")
    .map(({ path, message }) => `${path ? `${path}: ` : ""}${message}`)
}
