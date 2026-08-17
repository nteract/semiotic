import type {
  SemanticViabilityDiagnostic,
  SemanticViabilityRule
} from "../../ai/chartCapabilityTypes"
import type { Datum } from "../shared/datumTypes"
import { bumpXIdentity } from "./bumpIdentity"

export const BUMP_CHART_SEMANTIC_VIABILITY: SemanticViabilityRule = {
  kind: "rank-competition"
}

function accessorValue(
  accessor: unknown,
  fallback: string,
  datum: Datum,
  index: number
): unknown {
  const resolved = accessor ?? fallback
  return typeof resolved === "function"
    ? resolved(datum, index)
    : datum[String(resolved)]
}

/** Capability-owned rank-competition check shared by AI and static rendering. */
export function evaluateRankCompetition(
  props: Readonly<Datum>
): ReadonlyArray<SemanticViabilityDiagnostic> {
  const seriesByColumn = new Map<string, Set<string>>()
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : []
  data.forEach((datum, index) => {
    if (!Number.isFinite(Number(accessorValue(props.yAccessor, "y", datum, index)))) return
    const rawColumn = accessorValue(props.xAccessor, "x", datum, index)
    const column = bumpXIdentity(rawColumn)
    const columnSeries = seriesByColumn.get(column) ?? new Set<string>()
    columnSeries.add(String(accessorValue(props.lineBy, "series", datum, index)))
    seriesByColumn.set(column, columnSeries)
  })
  const counts = Array.from(seriesByColumn.values(), (series) => series.size)
    .sort((a, b) => a - b)
  if (counts.length === 0) return []
  const middle = Math.floor(counts.length / 2)
  const occupancy = {
    columns: counts.length,
    median: counts.length % 2
      ? counts[middle]
      : (counts[middle - 1] + counts[middle]) / 2,
    max: counts[counts.length - 1],
    contestedColumns: counts.filter((count) => count >= 2).length
  }
  const noCompetition = occupancy.max < 2
  if (!noCompetition && occupancy.contestedColumns >= 2 && occupancy.median >= 2) return []
  return [{
    code: noCompetition ? "BUMP_NO_RANK_COMPETITION" : "BUMP_SPARSE_RANK_COMPETITION",
    severity: noCompetition ? "error" : "warning",
    message: noCompetition
      ? "Every ranking column contains one series, so every trajectory remains at rank 1."
      : "Too few ranking columns contain competing series for reliable rank movement.",
    fix: "Use a lineBy field with repeated series across shared x columns, or choose a value-based chart.",
    metrics: { ...occupancy }
  }]
}
