import type { Claim, EvidenceRef } from "./types"

export function supersessionCycles(claims: ReadonlyArray<Claim>): string[][] {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  const cycles: string[][] = []
  const completed = new Set<string>()

  function visit(id: string, path: string[], active: Set<string>): void {
    if (active.has(id)) {
      const start = path.indexOf(id)
      cycles.push([...path.slice(start), id])
      return
    }
    if (completed.has(id)) return
    const claim = byId.get(id)
    if (!claim) return
    const nextActive = new Set(active).add(id)
    for (const prior of claim.supersedes ?? []) {
      visit(prior, [...path, id], nextActive)
    }
    completed.add(id)
  }

  for (const claim of claims) visit(claim.id, [], new Set())
  return cycles
}

export function transformationCycles(
  evidence: ReadonlyArray<EvidenceRef>
): string[][] {
  const byId = new Map(evidence.map((item) => [item.id, item]))
  const cycles: string[][] = []
  const completed = new Set<string>()

  function visit(id: string, path: string[], active: Set<string>): void {
    if (active.has(id)) {
      const start = path.indexOf(id)
      cycles.push([...path.slice(start), id])
      return
    }
    if (completed.has(id)) return
    const item = byId.get(id)
    if (!item) return
    const nextActive = new Set(active).add(id)
    for (const inputId of item.transformation?.inputEvidenceIds ?? []) {
      visit(inputId, [...path, id], nextActive)
    }
    completed.add(id)
  }

  for (const item of evidence) visit(item.id, [], new Set())
  return cycles
}

export function evidenceUsedByClaims(
  claims: ReadonlyArray<Claim>,
  evidenceById: ReadonlyMap<string, EvidenceRef>
): Set<string> {
  const used = new Set<string>()

  function collect(id: string): void {
    if (used.has(id)) return
    used.add(id)
    const item = evidenceById.get(id)
    for (const inputId of item?.transformation?.inputEvidenceIds ?? []) {
      collect(inputId)
    }
  }

  for (const claim of claims) {
    for (const evidenceId of claim.evidenceIds) collect(evidenceId)
  }
  return used
}

export function hasIndependentEvidenceBasis(
  ids: ReadonlyArray<string>,
  evidenceById: ReadonlyMap<string, EvidenceRef>,
  active = new Set<string>()
): boolean {
  return ids.some((id) => {
    if (active.has(id)) return false
    const item = evidenceById.get(id)
    if (!item || item.role === "model-output") return false
    if (item.role !== "transformation") return true
    const inputs = item.transformation?.inputEvidenceIds ?? []
    if (inputs.length === 0) return false
    return hasIndependentEvidenceBasis(
      inputs,
      evidenceById,
      new Set(active).add(id)
    )
  })
}
