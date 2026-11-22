import type { Datum } from "../charts/shared/datumTypes"
import { isDataRecord as isAIDataRecord } from "../charts/shared/dataRecords"
import { resolveRawAccessor } from "../stream/accessorUtils"
import { withFrameAnnotationProps } from "../charts/shared/frameAnnotationProps"

export { isAIDataRecord }

export const GROUNDED_PHYSICS_CHARTS = new Set([
  "StreamPhysicsFrame",
  "EventDropChart",
  "GaltonBoardChart",
  "UnitPileChart",
  "CollisionSwarmChart",
  "PacketFlowChart",
  "ProcessFlowChart",
  "PhysicsCustomChart",
])

export function isPhysicsChart(component: string): boolean {
  return GROUNDED_PHYSICS_CHARTS.has(component) || component === "GauntletChart" || component === "CrucibleChart"
}

/** AI summaries retain valid row objects and omit absent/non-record rows. */
export function aiDataRows(value: unknown): Datum[] {
  if (!Array.isArray(value)) return []
  for (const row of value)
    if (!isAIDataRecord(row)) return value.filter(isAIDataRecord)
  return value
}

/** Preserve props and datum identity when the input already contains records. */
export function aiChartProps(props: Datum, component: string): Datum {
  let result = withFrameAnnotationProps(props, props.frameProps, isPhysicsChart(component))
  for (const key of [
    "data",
    "nodes",
    "edges",
    "points",
    "areas",
    "lines",
    "flows",
    "spawns",
    "projectionRows",
    "annotations"
  ]) {
    const input = result[key]
    if (!Array.isArray(input)) continue
    const rows = aiDataRows(input)
    if (rows !== input) {
      if (result === props) result = { ...props }
      result[key] = rows
    }
  }
  return result
}

/** Numeric accessors never coerce BigInt, Symbol, or arbitrary objects. */
export function aiNumericValue(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim() !== "") return Number(value)
  return NaN
}

/** Labels never invoke application objects' string/primitive coercion hooks. */
export function aiScalarLabel(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : undefined
  }
  if (value == null || typeof value === "object" || typeof value === "function") {
    return undefined
  }
  return String(value)
}

export function aiNumericAccessor(
  accessor: string | ((datum: Datum) => unknown) | undefined,
  fallback: string
): (datum: Datum) => number {
  const read = resolveRawAccessor(accessor, fallback)
  return (datum) => aiNumericValue(read(datum))
}
