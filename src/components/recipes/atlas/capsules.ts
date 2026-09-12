import type { MotifMatch, MotifTemplate } from "./types"

export type MotifCapsule = {
  id: string
  matchId: string
  template: MotifTemplate
  entryState: string
  exitState: string
  entityCount: number
  occurrenceIds: string[]
  selected: boolean
}

function occurrenceKeys(match: MotifMatch): string[] {
  return match.entityIds
}

/**
 * Deterministic nonoverlapping layout capsules. Unselected overlapping matches
 * stay in the match index; this choice must never change match counts.
 */
export function selectCapsules(
  matches: readonly MotifMatch[],
  options: { templates?: MotifTemplate[] } = {}
): MotifCapsule[] {
  const templates = new Set(
    options.templates ?? ["repeated-state-episode"]
  )
  const candidates = matches
    .filter((match) => templates.has(match.template))
    .map((match) => {
      const entryState =
        typeof match.roles.state === "string"
          ? match.roles.state
          : match.nodePath[0]
      const last = match.nodePath[match.nodePath.length - 1]
      return {
        id: `capsule:${match.id}`,
        matchId: match.id,
        template: match.template,
        entryState,
        exitState: last,
        entityCount: match.entityCount,
        occurrenceIds: occurrenceKeys(match),
        selected: false as boolean
      } satisfies MotifCapsule
    })
    .sort((left, right) => {
      if (right.entityCount !== left.entityCount) {
        return right.entityCount - left.entityCount
      }
      return left.id.localeCompare(right.id)
    })

  const claimed = new Set<string>()
  for (const capsule of candidates) {
    const overlap = capsule.occurrenceIds.some((id) => claimed.has(id))
    if (overlap) continue
    capsule.selected = true
    for (const id of capsule.occurrenceIds) claimed.add(id)
  }
  return candidates
}
