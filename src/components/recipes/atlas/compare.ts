import { countMotifEntities, traceStatus } from "./entityCounts"
import { ledgerValue } from "./ledger"
import { ownValue } from "./ids"
import { isOutcomeMeasure } from "./validate"
import type {
  LedgerEntry,
  MotifMatch,
  MotifTemplate,
  PreparedComparison,
  PreparedNetworkAtlas
} from "./types"

export function availableValue(entry?: LedgerEntry) {
  return entry?.status === "exact" || entry?.status === "estimated" ? entry.value : undefined
}

export function templateEvidence(
  atlas: PreparedNetworkAtlas, template: MotifTemplate,
  window?: { kind: "completion" | "intersection"; sectionId: string }
) {
  const matches = atlas.motifs.matches.filter(match => match.template === template && (
    !window || (window.kind === "completion"
      ? match.completionSectionId === window.sectionId
      : match.intersectSectionIds.includes(window.sectionId))
  ))
  return { template, matches, truncated: matches.some(match => match.truncation) }
}

export function observedTemplates(matches: readonly MotifMatch[], selected?: MotifTemplate[]) {
  return [...new Set(selected ?? matches.map((match) => match.template))]
}

export function denominatorId(atlas: PreparedNetworkAtlas) {
  return atlas.spec.comparison?.denominatorMeasureId ?? atlas.spec.motifs.denominatorRef ?? "assigned"
}

export function countsEntities(atlas: PreparedNetworkAtlas) {
  const population = ownValue(atlas.spec.measures, denominatorId(atlas))
  return atlas.spec.motifs.countUnit === "entity" && population?.unitKind === "stock" && population.countUnit === "entity"
}

export function resolveComparison(atlas: PreparedNetworkAtlas) {
  return atlas.comparison?.outcomeMeasureIds ? atlas.comparison : buildComparison(atlas)
}

export function buildComparison(
  atlas: PreparedNetworkAtlas
): PreparedComparison | undefined {
  const spec = atlas.spec.comparison
  if (!spec) return undefined
  const { partitions, denominatorMeasureId } = spec
  // The ledger keeps authored entries first when derived section totals share their IDs.
  const partitionValues = new Map(partitions.map(id => [id, new Map<string, number | undefined>()]))
  for (const entry of atlas.ledger.entries) {
    const values = partitionValues.get(entry.subjectId)
    if (values && !values.has(entry.measureId)) values.set(entry.measureId, availableValue(entry))
  }
  const outcomeMeasureIds = [
    ...new Set(
      spec.outcomeMeasureIds ??
        Object.keys(atlas.spec.measures).filter(
          (id) =>
            id !== denominatorMeasureId &&
            partitions.some(partition => partitionValues.get(partition)!.has(id)) &&
            isOutcomeMeasure(atlas.spec, id, denominatorMeasureId)
        )
    )
  ]
  const motifTemplates = observedTemplates(atlas.motifs.matches, spec.motifTemplates)
  const countable = countsEntities(atlas)
    ? motifTemplates.map(template => templateEvidence(atlas, template)).filter(item => !item.truncated)
    : []
  const rows = partitions.map((partition) => {
    const values = partitionValues.get(partition)!
    const occurrences = (atlas.source.occurrences ?? []).filter((row) => row.partition === partition)
    const complete = traceStatus(occurrences) === "exact"
    return {
      partition,
      assigned: values.get(denominatorMeasureId) ?? 0,
      outcomes: Object.fromEntries(
        outcomeMeasureIds.flatMap((id) => {
          const value = values.get(id)
          return value === undefined ? [] : [[id, value]]
        })
      ),
      motifUsers: Object.fromEntries(
        (complete ? countable : []).map(({ template, matches }) =>
          [template, countMotifEntities(matches, occurrences)])
      )
    }
  })
  return {
    ...spec,
    partitions: [...partitions],
    outcomeMeasureIds,
    motifTemplates,
    rows
  }
}

export function assignedDenominator(
  atlas: PreparedNetworkAtlas,
  subjectId: string
): number | undefined {
  return availableValue(ledgerValue(atlas.ledger, denominatorId(atlas), subjectId))
}

export function signedDifferenceBps(
  left: number,
  right: number,
  leftDenominator: number,
  rightDenominator = leftDenominator
): number | null {
  if (
    ![left, right, leftDenominator, rightDenominator].every(Number.isFinite) ||
    leftDenominator <= 0 ||
    rightDenominator <= 0
  )
    return null
  const delta =
    leftDenominator === rightDenominator
      ? (right - left) / leftDenominator
      : right / rightDenominator - left / leftDenominator
  const signed = Math.sign(delta) * Math.round(Math.abs(delta) * 10000)
  return Number.isFinite(signed) ? signed || 0 : null
}

export type SignedReadout = {
  motif: string
  leftPartition: string
  rightPartition: string
  leftCount: number
  rightCount: number
  deltaCount: number
  deltaBps: number
  /** Reference partition population. */
  denominator: number
  leftDenominator?: number
  rightDenominator?: number
  kind?: "motif" | "outcome"
}

export type UnavailableDifference = Pick<
  SignedReadout,
  "motif" | "leftPartition" | "rightPartition" | "kind"
> & {
  status: "unknown"
  reason: "denominator" | "missing-count"
}

export function comparePartitionRates(comparison: PreparedComparison | undefined): {
  differences: SignedReadout[]
  unavailableDifferences?: UnavailableDifference[]
} {
  const differences: SignedReadout[] = []
  const unavailableDifferences: UnavailableDifference[] = []
  if (!comparison) return { differences }
  const { rows, referencePartition = comparison.partitions[0] } = comparison
  const left = rows.find(row => row.partition === referencePartition)
  if (!left) return { differences }

  for (const [kind, counts, names] of [
    ["motif", "motifUsers", comparison.motifTemplates],
    ["outcome", "outcomes", comparison.outcomeMeasureIds]
  ] as const) {
    for (const right of rows) {
      if (right === left) continue
      for (const motif of names ?? []) {
        const ids = {
          motif,
          kind,
          leftPartition: left.partition,
          rightPartition: right.partition
        }
        const leftCount = ownValue(left[counts], motif)
        const rightCount = ownValue(right[counts], motif)
        const leftDenominator = left.assigned
        const rightDenominator = right.assigned
        const countsAvailable = leftCount !== undefined && rightCount !== undefined
        const deltaBps = countsAvailable
          ? signedDifferenceBps(leftCount, rightCount, leftDenominator, rightDenominator)
          : null
        if (deltaBps !== null && countsAvailable) {
          differences.push({
            ...ids,
            leftCount,
            rightCount,
            deltaCount: rightCount - leftCount,
            denominator: leftDenominator,
            leftDenominator,
            rightDenominator,
            deltaBps
          })
          continue
        }
        unavailableDifferences.push({
          ...ids,
          status: "unknown",
          reason: countsAvailable ? "denominator" : "missing-count"
        })
      }
    }
  }
  return {
    differences,
    ...(unavailableDifferences.length > 0 && { unavailableDifferences })
  }
}
