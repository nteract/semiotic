import type { ArtifactCollectionContract } from "./collection"

/** Identify every dependent claim and panel affected by changed evidence. */
export function affectedCollectionClaims(
  collection: ArtifactCollectionContract,
  changedEvidenceIds: ReadonlyArray<string>
): Array<{ artifactId: string; claimId: string }> {
  const changed = new Set(changedEvidenceIds)
  const artifactsById = new Map(
    collection.artifacts.map((artifact) => [artifact.artifact.id, artifact])
  )
  const affectedEvidenceByArtifact = new Map<string, Set<string>>()
  const affectedForArtifact = (artifactId: string): Set<string> => {
    const cached = affectedEvidenceByArtifact.get(artifactId)
    if (cached) return cached
    const affected = new Set(changed)
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
    while (queue.length > 0) {
      const evidenceId = queue.shift()
      if (!evidenceId) continue
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
