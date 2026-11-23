import { ownValue } from "./ids"
import type {
  LedgerEntry,
  MeasureLedger,
  NetworkAtlasSource,
  NetworkAtlasSpec,
  SectionIndex
} from "./types"

const certainty: LedgerEntry["status"][] = ["unknown", "incomplete", "estimated", "exact"]

export function leastCertain(a: LedgerEntry["status"], b: LedgerEntry["status"]) {
  return certainty.indexOf(a) < certainty.indexOf(b) ? a : b
}

export function measureSubjectKey(measureId: string, subjectId: string): string {
  return JSON.stringify([measureId, subjectId])
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
  const nodes = new Map(source.nodes.map((node) => [node.id, node]))
  const authoredSectionKeys = new Set<string>()

  for (const row of source.measureValues) {
    const measure = ownValue(spec.measures, row.measureId)
    if (!measure) continue
    const subjectKind = nodes.has(row.subjectId)
      ? "node"
      : ownValue(sections.nodeIdsBySection, row.subjectId) ? "section" : "global"
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
      authoredSectionKeys.add(measureSubjectKey(row.measureId, row.subjectId))
    }
  }

  const derived = new Map<string, LedgerEntry>()
  for (const entry of entries) {
    if (entry.subjectKind !== "node") continue
    const sectionId = nodes.get(entry.subjectId)?.sectionId
    if (!sectionId) continue
    const key = measureSubjectKey(entry.measureId, sectionId)
    if (authoredSectionKeys.has(key)) continue
    const previous = derived.get(key)
    if (previous) {
      previous.value += entry.value
      previous.status = leastCertain(previous.status, entry.status)
    } else {
      const section: LedgerEntry = { ...entry, subjectId: sectionId, subjectKind: "section" }
      derived.set(key, section)
      entries.push(section)
    }
  }
  return { entries }
}

export function ledgerValue(
  ledger: MeasureLedger,
  measureId: string,
  subjectId: string,
  kind?: LedgerEntry["subjectKind"]
): LedgerEntry | undefined {
  return ledger.entries.find(
    (entry) => entry.measureId === measureId && entry.subjectId === subjectId && (!kind || entry.subjectKind === kind)
  )
}
