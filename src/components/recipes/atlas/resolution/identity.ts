import { compareRecipeIds as compareIds } from "../../../utils/compareRecipeIds"
export { compareIds }
import { stableEvidenceHash } from "../../../evidence/stableJsonHash"


export function contentId(kind: string, content: unknown): string {
  return `nr:${kind}:${stableEvidenceHash(content)}`
}

export function sortedIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(compareIds)
}
