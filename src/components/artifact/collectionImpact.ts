import type {
  ArtifactCollectionContract,
  CollectionEvidenceReference
} from "./collection"

/**
 * Identify dependent claims using artifact-qualified evidence references.
 * Legacy string IDs are accepted when unique across the collection; ambiguous
 * IDs throw instead of invalidating unrelated panels. Unknown legacy IDs are
 * ignored, while explicit references must identify existing evidence.
 */
export function affectedCollectionClaims(
  collection: ArtifactCollectionContract,
  changedEvidenceIds: ReadonlyArray<string | CollectionEvidenceReference>
): Array<{ artifactId: string; claimId: string }> {
  const artifactsById = new Map(
    collection.artifacts.map((artifact) => [artifact.artifact.id, artifact])
  )
  if (artifactsById.size !== collection.artifacts.length) {
    throw new TypeError("Collection artifact IDs must be unique.")
  }
  const owners = new Map<string, Set<string>>()
  for (const artifact of collection.artifacts) {
    for (const evidence of artifact.evidence) {
      const artifactIds = owners.get(evidence.id) ?? new Set<string>()
      artifactIds.add(artifact.artifact.id)
      owners.set(evidence.id, artifactIds)
    }
  }
  const changedByArtifact = new Map<string, Set<string>>()
  for (const reference of changedEvidenceIds) {
    let artifactId: string
    let evidenceId: string
    if (typeof reference === "string") {
      const candidates = owners.get(reference)
      if (!candidates?.size) continue
      if (candidates.size > 1) {
        throw new TypeError(
          `Evidence ID "${reference}" is ambiguous; use an artifact-qualified evidence reference.`
        )
      }
      artifactId = [...candidates][0]
      evidenceId = reference
    } else {
      artifactId = reference.artifactId
      evidenceId = reference.evidenceId
      if (!owners.get(evidenceId)?.has(artifactId)) {
        throw new TypeError(
          `Unknown evidence reference ${JSON.stringify(reference)}.`
        )
      }
    }
    const changed = changedByArtifact.get(artifactId) ?? new Set<string>()
    changed.add(evidenceId)
    changedByArtifact.set(artifactId, changed)
  }
  const affectedEvidenceByArtifact = new Map<string, Set<string>>()
  const affectedForArtifact = (artifactId: string): Set<string> => {
    const cached = affectedEvidenceByArtifact.get(artifactId)
    if (cached) return cached
    const affected = new Set(changedByArtifact.get(artifactId))
    const dependents = new Map<string, string[]>()
    for (const evidence of artifactsById.get(artifactId)?.evidence ?? []) {
      for (const inputId of evidence.transformation?.inputEvidenceIds ?? []) {
        dependents.set(inputId, [
          ...(dependents.get(inputId) ?? []),
          evidence.id
        ])
      }
    }
    const queue = [...affected]
    for (let index = 0; index < queue.length; index += 1) {
      const evidenceId = queue[index]
      for (const dependentId of dependents.get(evidenceId) ?? []) {
        if (affected.has(dependentId)) continue
        affected.add(dependentId)
        queue.push(dependentId)
      }
    }
    affectedEvidenceByArtifact.set(artifactId, affected)
    return affected
  }
  const results = new Map<string, { artifactId: string; claimId: string }>()
  for (const dependency of collection.claimDependencies ?? []) {
    const affected = affectedForArtifact(dependency.artifactId)
    if (!dependency.evidenceIds.some((id) => affected.has(id))) continue
    const result = {
      artifactId: dependency.artifactId,
      claimId: dependency.claimId
    }
    results.set(JSON.stringify([result.artifactId, result.claimId]), result)
  }
  return [...results.values()]
}
