import { aiDataRows, aiNumericValue } from "./aiData"
import type { Datum } from "../charts/shared/datumTypes"

export function readProp(
  datum: Datum,
  accessor: unknown,
  fallback: string
): unknown {
  if (typeof accessor === "function") return accessor(datum)
  const key = typeof accessor === "string" && accessor ? accessor : fallback
  return datum[key]
}

export function stringValue(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback
  if (typeof value === "object") {
    const record = value as Datum
    return stringValue(record.id ?? record.name ?? record.label, fallback)
  }
  return String(value)
}

export function finiteValue(value: unknown): number | undefined {
  const number = aiNumericValue(value)
  return Number.isFinite(number) ? number : undefined
}

export function slug(value: unknown): string {
  return (
    (
      stringValue(value, "unknown")
        .toLowerCase()
        .match(/[a-z0-9]+/g) || []
    ).join("-") || "unknown"
  )
}

export function interactionCue(props: Datum, linkedCue: string): string {
  return `${props.linkedHover || props.selection || props.linkedBrush ? ` ${linkedCue}` : ""}${props.enableHover || props.tooltip ? " Hover or focus a mark for its details." : ""}`
}

/** Omit absent/non-record children while preserving authored node identity. */
export function hierarchyChildren(node: Datum, accessor: unknown): Datum[] {
  return aiDataRows(readProp(node, accessor, "children"))
}
