import type { BaseChartProps } from "../../charts/shared/types"

/** Shared chart contracts retained by the source Atlas readers. */
export type AtlasChartOptions = Pick<
  BaseChartProps,
  | "chartId"
  | "className"
  | "title"
  | "description"
  | "summary"
  | "accessibleTable"
  | "onObservation"
  | "linkedHover"
>

/** Atlas views link on canonical vertices, not their distinct scene IDs. */
export function atlasLinkedHover(value: AtlasChartOptions["linkedHover"]) {
  if (!value) return value
  return {
    fields: ["nodeId"],
    ...(typeof value === "object"
      ? value
      : { name: typeof value === "string" ? value : "hover" })
  }
}
