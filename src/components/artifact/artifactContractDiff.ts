import type { ArtifactContract } from "./types"

export interface ArtifactContractChange {
  path: string
  kind: "added" | "removed" | "changed"
  before?: unknown
  after?: unknown
}

interface IdentifiedValue {
  value: Record<string, unknown>
}

function identifiedValues(
  values: unknown[]
): Map<string, IdentifiedValue> | undefined {
  const identified = new Map<string, IdentifiedValue>()
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined
    }
    const id = (value as Record<string, unknown>).id
    if (typeof id !== "string" || !id || identified.has(id)) return undefined
    identified.set(id, { value: value as Record<string, unknown> })
  }
  return identified
}

function semanticDiff(
  before: unknown,
  after: unknown,
  path: string,
  changes: ArtifactContractChange[]
): void {
  if (Object.is(before, after)) return
  if (Array.isArray(before) && Array.isArray(after)) {
    if (path === "claims" || path === "evidence") {
      const beforeById = identifiedValues(before)
      const afterById = identifiedValues(after)
      if (beforeById && afterById) {
        for (const [id, entry] of beforeById) {
          semanticDiff(
            entry.value,
            afterById.get(id)?.value,
            `${path}[id=${JSON.stringify(id)}]`,
            changes
          )
        }
        for (const [id, entry] of afterById) {
          if (!beforeById.has(id)) {
            semanticDiff(
              undefined,
              entry.value,
              `${path}[id=${JSON.stringify(id)}]`,
              changes
            )
          }
        }
        return
      }
    }
    const length = Math.max(before.length, after.length)
    for (let index = 0; index < length; index += 1) {
      semanticDiff(before[index], after[index], `${path}[${index}]`, changes)
    }
    return
  }
  const beforeObject =
    before && typeof before === "object" && !Array.isArray(before)
      ? (before as Record<string, unknown>)
      : undefined
  const afterObject =
    after && typeof after === "object" && !Array.isArray(after)
      ? (after as Record<string, unknown>)
      : undefined
  if (beforeObject && afterObject) {
    const keys = new Set([
      ...Object.keys(beforeObject),
      ...Object.keys(afterObject)
    ])
    for (const key of [...keys].sort()) {
      semanticDiff(
        beforeObject[key],
        afterObject[key],
        path ? `${path}.${key}` : key,
        changes
      )
    }
    return
  }
  changes.push({
    path: path || "$",
    kind:
      before === undefined
        ? "added"
        : after === undefined
          ? "removed"
          : "changed",
    ...(before !== undefined ? { before } : {}),
    ...(after !== undefined ? { after } : {})
  })
}

export function diffArtifactContracts(
  before: ArtifactContract,
  after: ArtifactContract
): ArtifactContractChange[] {
  const changes: ArtifactContractChange[] = []
  semanticDiff(before, after, "", changes)
  return changes
}
