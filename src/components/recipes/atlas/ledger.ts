import { idDictionary, ownValue, setOwnValue } from "./ids"
import type {
  LedgerEntry,
  MeasureLedger,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  SectionIndex
} from "./types"

const uncertainty: Record<LedgerEntry["status"], number> = {
  exact: 0,
  estimated: 1,
  incomplete: 2,
  unknown: 3
}

function nodeKind(
  subjectId: string,
  nodeIds: ReadonlySet<string>,
  sections: SectionIndex
): LedgerEntry["subjectKind"] {
  if (nodeIds.has(subjectId)) return "node"
  if (ownValue(sections.nodeIdsBySection, subjectId)) return "section"
  return "global"
}

/**
 * Independent measure ledger. Does not call ProcessSankey inventoryAtTime
 * and does not require inbound mass to equal outbound mass.
 */
export function buildLedger(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  sections: SectionIndex
): MeasureLedger {
  const entries: LedgerEntry[] = []
  const nodeIds = new Set(source.nodes.map((node) => node.id))
  const authoredSectionKeys = new Set<string>()

  for (const row of source.measureValues) {
    const measure = ownValue(spec.measures, row.measureId)
    if (!measure) continue
    const subjectKind = nodeKind(row.subjectId, nodeIds, sections)
    entries.push({
      measureId: row.measureId,
      subjectId: row.subjectId,
      subjectKind,
      value: row.value,
      status: row.status,
      unitKind: measure.unitKind,
      countUnit: measure.countUnit,
      timeDenominator: measure.timeDenominator
    })
    if (subjectKind === "section") {
      authoredSectionKeys.add(JSON.stringify([row.measureId, row.subjectId]))
    }
  }

  const nodeById = idDictionary<(typeof source.nodes)[number]>()
  for (const node of source.nodes) setOwnValue(nodeById, node.id, node)

  const derived = new Map<string, LedgerEntry>()
  for (const entry of entries) {
    if (entry.subjectKind !== "node") continue
    const node = nodeById[entry.subjectId]
    if (!node?.sectionId) continue
    const key = JSON.stringify([entry.measureId, node.sectionId])
    if (authoredSectionKeys.has(key)) continue
    const previous = derived.get(key)
    if (previous) {
      previous.value += entry.value
      if (uncertainty[entry.status] > uncertainty[previous.status])
        previous.status = entry.status
    } else {
      derived.set(key, {
        ...entry,
        subjectId: node.sectionId,
        subjectKind: "section"
      })
    }
  }
  for (const entry of derived.values()) entries.push(entry)

  return { entries }
}

export function ledgerValue(
  ledger: MeasureLedger,
  measureId: string,
  subjectId: string
): LedgerEntry | undefined {
  return ledger.entries.find(
    (entry) => entry.measureId === measureId && entry.subjectId === subjectId
  )
}
