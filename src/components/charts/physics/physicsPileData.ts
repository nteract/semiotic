import type { Datum } from "../shared/datumTypes"
import { positiveNumber, seededRandom } from "./physicsChartShared"

export interface PhysicsPileMechanicalSampleOptions {
  categories?: readonly string[]
  count?: number
  idPrefix?: string
  seed?: number
  unitValue?: number
}
export function generatePhysicsPileMechanicalSamples(
  options: PhysicsPileMechanicalSampleOptions = {}
): Datum[] {
  const categories = (
    options.categories?.length
      ? options.categories
      : ["Intake", "Review", "Build", "Ship"]
  )
    .map((category) => String(category).trim())
    .filter(Boolean)
  const resolvedCategories = categories.length ? categories : ["Intake"]
  const count = Math.max(
    resolvedCategories.length,
    Math.round(options.count ?? Math.max(48, resolvedCategories.length * 12))
  )
  const unitValue = positiveNumber(options.unitValue, 1)
  const random = seededRandom(options.seed ?? 1)
  const idPrefix = options.idPrefix ?? "mechanical-pile"
  const weights = resolvedCategories.map(() => 0.65 + random() * 0.9)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1
  const remaining = count - resolvedCategories.length
  const rawShares = weights.map((weight) => (weight / weightTotal) * remaining)
  const counts = rawShares.map((share) => 1 + Math.floor(share))
  let remainder = count - counts.reduce((sum, value) => sum + value, 0)
  const order = rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let index = 0; remainder > 0; index = (index + 1) % order.length) {
    counts[order[index].index] += 1
    remainder -= 1
  }

  return resolvedCategories.map((category, index) => ({
    id: `${idPrefix}-${index}`,
    category,
    value: counts[index] * unitValue,
    mechanical: true,
    unitCount: counts[index],
    unitValue,
    share: counts[index] / count
  }))
}

/** Full units plus one partial circle per positive record, without float slivers. */
export function physicsPileUnitCount(value: number, unitValue: number): number {
  const units = value / unitValue
  const nearest = Math.round(units)
  return Math.ceil(
    nearest > 0 && Math.abs(units - nearest) <= Number.EPSILON * units * 4
      ? nearest
      : units
  )
}
