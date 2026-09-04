import type { ArtifactContract, ArtifactRelation } from "./types"

export function hasActiveArtifactClaims(contract: ArtifactContract): boolean {
  return contract.claims.some(
    ({ status }) => status !== "retracted" && status !== "superseded"
  )
}

export function artifactDeclaresRelation(
  contract: ArtifactContract,
  relation: ArtifactRelation
): boolean {
  const form = contract.form
  const reception = contract.reception
  const contestability = contract.contestability
  const accountability = contract.accountability
  const inheritance = contract.inheritance
  switch (relation) {
    case "claim-support":
      return contract.claims.length > 0 || contract.evidence.length > 0
    case "representation-fit":
      return Boolean(
        form &&
        (form.chartFamily ||
          form.whyThisForm ||
          form.rejectedAlternatives?.length ||
          form.risks?.length ||
          form.misuse?.length)
      )
    case "reception":
      return Boolean(
        reception &&
        (reception.channels.length > 0 ||
          reception.audience ||
          reception.description ||
          reception.dataFallback !== undefined ||
          reception.strengths?.length ||
          reception.risks?.length ||
          reception.scaffolds?.length ||
          reception.manualChecks?.length)
      )
    case "time":
      return Boolean(contract.time && Object.keys(contract.time).length > 0)
    case "challenge-and-correction":
      return Boolean(
        contestability &&
        (contestability.sourceRequestsAllowed !== undefined ||
          contestability.alternativeViews?.length ||
          contestability.challenges?.length ||
          contestability.corrections?.length ||
          contestability.editorialExceptions?.length)
      )
    case "accountability":
      return Boolean(
        accountability &&
        (accountability.authors?.length ||
          accountability.generatedBy ||
          accountability.dataSources?.length ||
          accountability.codeRef ||
          accountability.reviews?.length ||
          accountability.actions?.length)
      )
    case "abstention":
      return Boolean(
        contract.purpose.allowedUses?.length ||
        contract.purpose.prohibitedUses?.length
      )
    case "preservation":
      return Boolean(
        inheritance &&
        (inheritance.sourceArtifactIds?.length ||
          inheritance.requiredPaths?.length ||
          inheritance.prohibitedExports?.length ||
          inheritance.privacy ||
          inheritance.rawDataDefault ||
          inheritance.preservation)
      )
  }
}
