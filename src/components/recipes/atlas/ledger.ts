import { idDictionary, ownValue, setOwnValue } from "./ids"
import type {
  LedgerEntry,
  MeasureLedger,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  SectionIndex
} from "./types"

function nodeKind(
  subjectId: string,
  source: NetworkAtlasSource,
  sections: SectionIndex
): LedgerEntry["subjectKind"] {
  if (source.nodes.some((node) => node.id === subjectId)) return "node"
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
  const authoredSectionKeys = new Set<string>()

  for (const row of source.measureValues) {
    const measure = spec.measures[row.measureId]
    if (!measure) continue
    const subjectKind = nodeKind(row.subjectId, source, sections)
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
      authoredSectionKeys.add(`${row.measureId}\0${row.subjectId}`)
    }
  }

  const nodeById = idDictionary<(typeof source.nodes)[number]>()
  for (const node of source.nodes) setOwnValue(nodeById, node.id, node)

  const derived = idDictionary<number>()
  const derivedStatus = idDictionary<LedgerEntry["status"]>()
  for (const entry of entries) {
    if (entry.subjectKind !== "node") continue
    const node = nodeById[entry.subjectId]
    if (!node?.sectionId) continue
    const key = `${entry.measureId}\0${node.sectionId}`
    if (authoredSectionKeys.has(key)) continue
    derived[key] = (derived[key] ?? 0) + entry.value
    if (entry.status !== "exact") derivedStatus[key] = entry.status
    else if (!derivedStatus[key]) derivedStatus[key] = "exact"
  }

  for (const [key, value] of Object.entries(derived)) {
    const split = key.split("\0")
    const measureId = split[0]
    const subjectId = split[1]
    const measure = spec.measures[measureId]
    if (!measure) continue
    entries.push({
      measureId,
      subjectId,
      subjectKind: "section",
      value,
      status: derivedStatus[key] ?? "exact",
      unitKind: measure.unitKind,
      countUnit: measure.countUnit,
      timeDenominator: measure.timeDenominator
    })
  }

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
