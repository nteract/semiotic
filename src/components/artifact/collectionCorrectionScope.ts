import type {
  ArtifactCollectionContract,
  CollectionClaimReference,
  CollectionCorrectionRecord
} from "./collection"

export function claimReferenceKey(reference: CollectionClaimReference): string {
  return JSON.stringify([reference.artifactId, reference.claimId])
}

export function scopedCorrectionReferences(
  collection: ArtifactCollectionContract,
  correction: CollectionCorrectionRecord,
  kind: "affected" | "replacement"
): CollectionClaimReference[] {
  const ids = new Set(
    kind === "affected"
      ? correction.affectedClaimIds
      : (correction.replacementClaimIds ?? [])
  )
  const explicit =
    kind === "affected"
      ? correction.scope?.affectedClaims
      : correction.scope?.replacementClaims
  if (explicit) {
    return explicit.filter(
      ({ artifactId, claimId }) =>
        ids.has(claimId) &&
        collection.artifacts.some(
          (artifact) =>
            artifact.artifact.id === artifactId &&
            artifact.claims.some((claim) => claim.id === claimId)
        )
    )
  }

  const references: CollectionClaimReference[] = []
  for (const claimId of ids) {
    const matches = collection.artifacts.flatMap((artifact) =>
      artifact.claims.some((claim) => claim.id === claimId)
        ? [{ artifactId: artifact.artifact.id, claimId }]
        : []
    )
    if (matches.length === 1) references.push(matches[0])
  }
  return references
}

export function correctionScopeIsValid(
  collection: ArtifactCollectionContract,
  correction: CollectionCorrectionRecord
): boolean {
  const entries: Array<
    [ReadonlyArray<string>, ReadonlyArray<CollectionClaimReference> | undefined]
  > = [
    [correction.affectedClaimIds, correction.scope?.affectedClaims],
    [correction.replacementClaimIds ?? [], correction.scope?.replacementClaims]
  ]
  return entries.every(
    ([ids, references]) =>
      !references ||
      (references.every(
        ({ artifactId, claimId }) =>
          ids.includes(claimId) &&
          collection.artifacts.some(
            (artifact) =>
              artifact.artifact.id === artifactId &&
              artifact.claims.some((claim) => claim.id === claimId)
          )
      ) &&
        ids.every((claimId) =>
          references.some((reference) => reference.claimId === claimId)
        ))
  )
}
