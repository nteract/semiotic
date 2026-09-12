import { idDictionary, setOwnValue } from "./ids"
import type { AtlasOccurrence, PrefixForest, PrefixForestNode } from "./types"

type TrieNode = {
  id: string
  stateId: string
  prefix: string[]
  children: Map<string, TrieNode>
  occurrenceIds: string[]
  entityCount: number
  partitionCounts: Map<string, number>
}

function entityCountOf(occurrence: AtlasOccurrence): number {
  return occurrence.entityCount ?? 1
}

function addPartition(node: TrieNode, partition: string | undefined, count: number): void {
  const key = partition ?? ""
  node.partitionCounts.set(key, (node.partitionCounts.get(key) ?? 0) + count)
}

/**
 * Observed prefix forest from admitted journeys. Identifiers are full prefixes,
 * so two groups that share a state name with different histories stay distinct.
 */
export function buildPrefixForest(
  occurrences: readonly AtlasOccurrence[],
  options: { referencePartition?: string } = {}
): PrefixForest {
  const root: TrieNode = {
    id: "",
    stateId: "",
    prefix: [],
    children: new Map(),
    occurrenceIds: [],
    entityCount: 0,
    partitionCounts: new Map()
  }

  for (const occurrence of occurrences) {
    if (occurrence.missingPrehistory) continue
    const weight = entityCountOf(occurrence)
    let cursor = root
    cursor.occurrenceIds.push(occurrence.id)
    cursor.entityCount += weight
    addPartition(cursor, occurrence.partition, weight)
    for (const stateId of occurrence.nodePath) {
      const prefix = [...cursor.prefix, stateId]
      const id = prefix.join(">")
      let child = cursor.children.get(stateId)
      if (!child) {
        child = {
          id,
          stateId,
          prefix,
          children: new Map(),
          occurrenceIds: [],
          entityCount: 0,
          partitionCounts: new Map()
        }
        cursor.children.set(stateId, child)
      }
      child.occurrenceIds.push(occurrence.id)
      child.entityCount += weight
      addPartition(child, occurrence.partition, weight)
      cursor = child
    }
  }

  const nodes: PrefixForestNode[] = []
  const order: string[] = []
  const reference = options.referencePartition

  function childKeys(node: TrieNode): string[] {
    const keys = [...node.children.keys()]
    keys.sort((left, right) => {
      const leftChild = node.children.get(left)!
      const rightChild = node.children.get(right)!
      const leftRef = reference ? (leftChild.partitionCounts.get(reference) ?? 0) : 1
      const rightRef = reference ? (rightChild.partitionCounts.get(reference) ?? 0) : 1
      if ((leftRef > 0) !== (rightRef > 0)) return leftRef > 0 ? -1 : 1
      return left.localeCompare(right)
    })
    return keys
  }

  function walk(node: TrieNode, parentId: string | null): void {
    if (node.id) {
      const partitionCounts = idDictionary<number>()
      for (const [partition, count] of node.partitionCounts) {
        setOwnValue(partitionCounts, partition, count)
      }
      nodes.push({
        id: node.id,
        stateId: node.stateId,
        prefix: node.prefix,
        parentId,
        childIds: childKeys(node).map((key) => node.children.get(key)!.id),
        entityCount: node.entityCount,
        occurrenceIds: [...node.occurrenceIds],
        partitionCounts
      })
      order.push(node.id)
    }
    for (const key of childKeys(node)) {
      walk(node.children.get(key)!, node.id || null)
    }
  }

  walk(root, null)
  return {
    kind: "observed-prefix",
    rootIds: childKeys(root).map((key) => root.children.get(key)!.id),
    nodes,
    order,
    referencePartition: reference
  }
}

export function prefixIdFor(path: readonly string[], depth: number): string {
  return path.slice(0, depth + 1).join(">")
}
