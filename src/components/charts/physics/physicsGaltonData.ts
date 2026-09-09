import type { Datum } from "../shared/datumTypes"
import { clampNumber, seededRandom } from "./physicsChartShared"

export interface GaltonMechanicalSampleOptions {
  bins: number
  count?: number
  pegRows?: number
  branchProbability?: number
  seed?: number
  idPrefix?: string
}
export function generateGaltonMechanicalSamples(
  options: GaltonMechanicalSampleOptions
): Datum[] {
  const bins = Math.max(2, Math.round(options.bins))
  const pegRows = Math.max(1, Math.round(options.pegRows ?? bins - 1))
  const count = Math.max(1, Math.round(options.count ?? Math.max(64, bins * 4)))
  const branchProbability = clampNumber(
    Number.isFinite(options.branchProbability) ? options.branchProbability ?? 0.5 : 0.5,
    0,
    1
  )
  const random = seededRandom(options.seed ?? 1)
  const idPrefix = options.idPrefix ?? "mechanical"

  return Array.from({ length: count }, (_, index) => {
    let rights = 0
    for (let row = 0; row < pegRows; row += 1) {
      if (random() < branchProbability) rights += 1
    }
    const midpoint = pegRows / 2
    return {
      id: `${idPrefix}-${index}`,
      value: rights,
      mechanical: true,
      pegRows,
      branchProbability,
      pathRights: rights,
      side: rights < midpoint ? "left" : rights > midpoint ? "right" : "center"
    }
  })
}

