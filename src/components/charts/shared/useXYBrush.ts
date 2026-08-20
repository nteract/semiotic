/**
 * Shared XY brush wiring for LineChart / Scatterplot (and similar).
 *
 * Enables the frame brush overlay when `brush` is true or `linkedBrush` is set.
 */
import { useCallback, useRef } from "react"
import { normalizeLinkedBrush } from "./selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import type { ChartAccessor, LinkedBrushProp } from "./types"
import type { Datum } from "./datumTypes"

export interface XYBrushInput<TDatum extends Datum = Datum> {
  brush?: boolean
  linkedBrush?: LinkedBrushProp
  xAccessor?: ChartAccessor<TDatum, unknown>
  yAccessor?: ChartAccessor<TDatum, unknown>
  /** Default brush dimension when `brush` is true without a linked config. */
  defaultDimension?: "x" | "y" | "xy"
}

export interface XYBrushResult {
  brushStreamProps: {
    brush: { dimension: "x" | "y" | "xy" }
    onBrush: (extent: { x: [number, number]; y: [number, number] } | null) => void
  } | Record<string, never>
}

export function useXYBrush<TDatum extends Datum = Datum>({
  brush,
  linkedBrush,
  xAccessor,
  yAccessor,
  defaultDimension = "xy",
}: XYBrushInput<TDatum>): XYBrushResult {
  const brushConfig = normalizeLinkedBrush(linkedBrush)
  const enabled = Boolean(brush) || Boolean(brushConfig)

  const resolvedXField = brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined)
  const resolvedYField = brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  // Honor the chart's default dimension unless the linked config names the
  // other field. A LineChart string `linkedBrush` is an x-brush; Scatterplot
  // keeps xy.
  const xField = defaultDimension === "y" && !brushConfig?.xField ? undefined : resolvedXField
  const yField = defaultDimension === "x" && !brushConfig?.yField ? undefined : resolvedYField

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField,
    yField,
  })

  const brushDimension: "x" | "y" | "xy" = brushConfig
    ? (brushHook.brushInteraction.brush === "xyBrush" ? "xy" : brushHook.brushInteraction.brush === "xBrush" ? "x" : "y")
    : defaultDimension

  const brushInteractionRef = useRef(brushHook.brushInteraction)
  brushInteractionRef.current = brushHook.brushInteraction

  const onBrush = useCallback(
    (extent: { x: [number, number]; y: [number, number] } | null) => {
      const bi = brushInteractionRef.current
      if (!extent) {
        bi.end(null)
        return
      }
      if (bi.brush === "xyBrush") {
        bi.end([[extent.x[0], extent.y[0]], [extent.x[1], extent.y[1]]])
      } else if (bi.brush === "xBrush") {
        bi.end(extent.x)
      } else {
        bi.end(extent.y)
      }
    },
    []
  )

  if (!enabled) return { brushStreamProps: {} }
  return { brushStreamProps: { brush: { dimension: brushDimension }, onBrush } }
}
