import { compareRecipeIds } from "../../utils/compareRecipeIds"
import { idDictionary, prefixIdFor } from "./ids"
import type { AtlasOccurrence, PrefixForest, PrefixForestNode } from "./types"

type TrieNode = {
  id: string
  stateId: string
  prefix: string[]
  children: Map<string, TrieNode>
  occurrenceIds: string[]
  entityCount: number
  partitionCounts: Record<string, number>
}

function trieNode(prefix: string[]): TrieNode {
  return {
    id: prefixIdFor(prefix, prefix.length - 1),
    stateId: prefix[prefix.length - 1] ?? "",
    prefix,
    children: new Map(),
    occurrenceIds: [],
    entityCount: 0,
    partitionCounts: idDictionary()
  }
}

/**
 * Observed prefix forest from admitted journeys. Identifiers are full prefixes,
 * so two groups that share a state name with different histories stay distinct.
 */
export function buildPrefixForest(
  occurrences: readonly AtlasOccurrence[],
  options: { referencePartition?: string } = {}
): PrefixForest {
  const root = trieNode([])
  for (const occurrence of occurrences) {
    if (occurrence.missingPrehistory) continue
    const weight = occurrence.entityCount ?? 1
    const partition = occurrence.partition ?? ""
    let cursor = root
    for (const stateId of occurrence.nodePath) {
      let child = cursor.children.get(stateId)
      if (!child) {
        child = trieNode([...cursor.prefix, stateId])
        cursor.children.set(stateId, child)
      }
      child.occurrenceIds.push(occurrence.id)
      child.entityCount += weight
      child.partitionCounts[partition] =
        (child.partitionCounts[partition] ?? 0) + weight
      cursor = child
    }
  }

  const nodes: PrefixForestNode[] = []
  const order: string[] = []
  const reference = options.referencePartition

  function walkChildren(parent: TrieNode): string[] {
    const preferred = (node: TrieNode) =>
      reference && node.partitionCounts[reference] > 0 ? 1 : 0
    const children = [...parent.children.values()].sort(
      (a, b) =>
        preferred(b) - preferred(a) || compareRecipeIds(a.stateId, b.stateId)
    )
    for (const child of children) {
      if (!child.id) {
        walkChildren(child)
        continue
      }
      const {
        id,
        stateId,
        prefix,
        occurrenceIds,
        partitionCounts,
        entityCount
      } = child
      const row = {
        id,
        stateId,
        prefix,
        parentId: parent.id || null,
        childIds: [] as string[],
        entityCount,
        occurrenceIds,
        partitionCounts
      }
      nodes.push(row)
      order.push(id)
      row.childIds = walkChildren(child)
    }
    return children.map((child) => child.id)
  }

  const rootIds = walkChildren(root)
  return {
    kind: "observed-prefix",
    rootIds,
    nodes,
    order,
    referencePartition: reference
  }
}

export { prefixIdFor } from "./ids"
