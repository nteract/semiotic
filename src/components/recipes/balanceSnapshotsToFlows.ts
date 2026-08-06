/**
 * Convert two allocation snapshots into deterministic conserved flows.
 *
 * Values retained by the same identity are emitted first as `stay` flows.
 * Residual values from shrinking identities are then assigned to growing
 * identities in input order. The helper makes no claim that this is the only
 * possible migration: it is a stable, transparent balancing policy for
 * before/after Sankeys and allocation-transition explanations.
 */

export interface BalancedSnapshotFlow {
  sourceId: string
  targetId: string
  value: number
  kind: "stay" | "move"
}

export interface SnapshotResidual {
  id: string
  value: number
}

export interface BalancedSnapshotsResult {
  flows: BalancedSnapshotFlow[]
  beforeTotal: number
  afterTotal: number
  balanced: boolean
  unmatchedBefore: SnapshotResidual[]
  unmatchedAfter: SnapshotResidual[]
}

export interface BalanceSnapshotsToFlowsOptions<TBefore, TAfter = TBefore> {
  beforeId: (datum: TBefore, index: number) => string | number
  afterId?: (datum: TAfter, index: number) => string | number
  beforeValue: (datum: TBefore, index: number) => number
  afterValue?: (datum: TAfter, index: number) => number
  /** Floating-point comparison tolerance. Defaults to 1e-9. */
  epsilon?: number
  /**
   * Return unmatched residuals instead of throwing when totals differ.
   * Conserved inputs are strict by default so a Sankey cannot silently lose
   * or create volume.
   */
  allowImbalance?: boolean
}

interface AllocationValue {
  id: string
  value: number
}

function readSnapshot<T>(
  data: readonly T[],
  idAccessor: (datum: T, index: number) => string | number,
  valueAccessor: (datum: T, index: number) => number,
  label: string,
): AllocationValue[] {
  const seen = new Set<string>()
  return data.map((datum, index) => {
    const id = String(idAccessor(datum, index))
    const value = Number(valueAccessor(datum, index))
    if (!id) throw new Error(`${label} snapshot contains an empty id at index ${index}.`)
    if (seen.has(id)) throw new Error(`${label} snapshot contains duplicate id "${id}".`)
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} snapshot value for "${id}" must be a finite non-negative number.`)
    }
    seen.add(id)
    return { id, value }
  })
}

export function balanceSnapshotsToFlows<TBefore, TAfter = TBefore>(
  before: readonly TBefore[],
  after: readonly TAfter[],
  options: BalanceSnapshotsToFlowsOptions<TBefore, TAfter>,
): BalancedSnapshotsResult {
  const afterId = options.afterId ?? (options.beforeId as unknown as (datum: TAfter, index: number) => string | number)
  const afterValue = options.afterValue ?? (options.beforeValue as unknown as (datum: TAfter, index: number) => number)
  const epsilon = options.epsilon != null && options.epsilon >= 0 ? options.epsilon : 1e-9
  const beforeValues = readSnapshot(before, options.beforeId, options.beforeValue, "Before")
  const afterValues = readSnapshot(after, afterId, afterValue, "After")
  const beforeById = new Map(beforeValues.map((datum) => [datum.id, datum.value]))
  const afterById = new Map(afterValues.map((datum) => [datum.id, datum.value]))
  const beforeTotal = beforeValues.reduce((sum, datum) => sum + datum.value, 0)
  const afterTotal = afterValues.reduce((sum, datum) => sum + datum.value, 0)
  const balanced = Math.abs(beforeTotal - afterTotal) <= epsilon

  if (!balanced && !options.allowImbalance) {
    throw new Error(
      `Snapshot totals must match (before ${beforeTotal}, after ${afterTotal}). Pass allowImbalance to inspect residuals.`,
    )
  }

  const flows: BalancedSnapshotFlow[] = []
  const orderedIds = [
    ...beforeValues.map((datum) => datum.id),
    ...afterValues.map((datum) => datum.id).filter((id) => !beforeById.has(id)),
  ]
  for (const id of orderedIds) {
    const value = Math.min(beforeById.get(id) ?? 0, afterById.get(id) ?? 0)
    if (value > epsilon) flows.push({ sourceId: id, targetId: id, value, kind: "stay" })
  }

  const shrinkers = beforeValues
    .map((datum) => ({
      id: datum.id,
      value: datum.value - (afterById.get(datum.id) ?? 0),
    }))
    .filter((datum) => datum.value > epsilon)
  const growers = afterValues
    .map((datum) => ({
      id: datum.id,
      value: datum.value - (beforeById.get(datum.id) ?? 0),
    }))
    .filter((datum) => datum.value > epsilon)

  let sourceIndex = 0
  let targetIndex = 0
  while (sourceIndex < shrinkers.length && targetIndex < growers.length) {
    const source = shrinkers[sourceIndex]
    const target = growers[targetIndex]
    const value = Math.min(source.value, target.value)
    if (value > epsilon) {
      flows.push({ sourceId: source.id, targetId: target.id, value, kind: "move" })
    }
    source.value -= value
    target.value -= value
    if (source.value <= epsilon) sourceIndex += 1
    if (target.value <= epsilon) targetIndex += 1
  }

  return {
    flows,
    beforeTotal,
    afterTotal,
    balanced,
    unmatchedBefore: shrinkers
      .slice(sourceIndex)
      .filter((datum) => datum.value > epsilon)
      .map(({ id, value }) => ({ id, value })),
    unmatchedAfter: growers
      .slice(targetIndex)
      .filter((datum) => datum.value > epsilon)
      .map(({ id, value }) => ({ id, value })),
  }
}
