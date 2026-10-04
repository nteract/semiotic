import { stableEvidenceHash } from "../../../evidence/stableJsonHash"

/** Code-unit order, independent of the host locale. */
export function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function contentId(kind: string, content: unknown): string {
  return `nr:${kind}:${stableEvidenceHash(content)}`
}

export function sortedIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(compareIds)
}
