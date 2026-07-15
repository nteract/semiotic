import type { D3BrushEvent } from "d3-brush"
import type { Datum } from "../shared/datumTypes"

export interface ScatterplotMatrixHoverInfo {
  datum: Datum
  xField: string
  yField: string
  colIndex: number
  rowIndex: number
  px: number
  py: number
}

export function isTwoDimensionalBrushSelection(
  selection: D3BrushEvent<Datum>["selection"],
): selection is [[number, number], [number, number]] {
  return !!selection && Array.isArray(selection[0])
}
