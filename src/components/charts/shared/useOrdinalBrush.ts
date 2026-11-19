/**
 * useOrdinalBrush — shared brush wiring for ordinal HOC charts.
 *
 * Deduplicates the linkedBrush → normalizeLinkedBrush → useBrushSelection →
 * handleBrush pipeline that was copy-pasted across SwimlaneChart, SwarmPlot,
 * Histogram, and ViolinPlot.
 *
 * Dependencies:
 *   selectionUtils.ts  — normalizeLinkedBrush
 *   useSelection.ts    — useBrushSelection (bridges brush to SelectionStore)
 *
 * Consumers pass through the three brush-related HOC props (brush, onBrush,
 * linkedBrush) plus the valueAccessor. The hook returns hasBrush, handleBrush,
 * and brushStreamProps ready to spread into StreamOrdinalFrame props.
 */
import { useCallback, useMemo, useRef } from "react"
import { normalizeLinkedBrush } from "./selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import type { ChartAccessor } from "./types"
import type { Datum } from "./datumTypes"
import type { OrdinalBrushEndMeta, OrdinalBrushExtent, OrdinalBrushExtentInput } from "../../stream/ordinalBrushTypes"

export interface OrdinalBrushInput<TDatum extends Datum = Datum> {
  brushProp: boolean | undefined
  onBrushProp: ((extent: { r: [number, number] } | null) => void) | undefined
  linkedBrush: string | { name: string; rField?: string } | undefined
  valueAccessor: ChartAccessor<TDatum, number>
  /** Controlled selection, passed to the frame brush; a controlled move publishes nothing. */
  brushExtent?: OrdinalBrushExtentInput | null
  onBrushEnd?: (extent: OrdinalBrushExtent | null, meta: OrdinalBrushEndMeta) => void
}

export interface OrdinalBrushResult {
  hasBrush: boolean
  handleBrush: (extent: { r: [number, number] } | null) => void
  /** Spread into streamProps: `...brushStreamProps` */
  brushStreamProps: {
    brush: { dimension: "r" }
    onBrush: (extent: { r: [number, number] } | null) => void
    brushExtent: OrdinalBrushExtentInput | null | undefined
    onBrushEnd: ((extent: OrdinalBrushExtent | null, meta: OrdinalBrushEndMeta) => void) | undefined
  } | Record<string, never>
}

export function useOrdinalBrush<TDatum extends Datum = Datum>({
  brushProp,
  onBrushProp,
  linkedBrush,
  valueAccessor,
  brushExtent,
  onBrushEnd,
}: OrdinalBrushInput<TDatum>): OrdinalBrushResult {
  // Normalize rField → xField for the selection store. Memoized so
  // `handleBrush`'s useCallback below (keyed on `brushConfig`) gets a stable
  // identity across renders instead of a fresh object every time.
  const brushConfig = useMemo(() => {
    const normalizedLinkedBrush = typeof linkedBrush === "string"
      ? linkedBrush
      : linkedBrush
        ? { name: linkedBrush.name, xField: linkedBrush.rField }
        : undefined
    return normalizeLinkedBrush(normalizedLinkedBrush)
  }, [linkedBrush])
  const rFieldStr = typeof valueAccessor === "string" ? valueAccessor : "value"

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_ordinal_brush__",
    xField: brushConfig?.xField || rFieldStr,
  })

  const brushInteractionRef = useRef(brushHook.brushInteraction)
  brushInteractionRef.current = brushHook.brushInteraction

  const handleBrush = useCallback(
    (extent: { r: [number, number] } | null) => {
      if (brushConfig) {
        const bi = brushInteractionRef.current
        if (!extent) { bi.end(null) } else { bi.end(extent.r) }
      }
      onBrushProp?.(extent)
    },
    [onBrushProp, brushConfig]
  )

  const hasBrush = !!(brushProp || linkedBrush || onBrushProp)

  return {
    hasBrush,
    handleBrush,
    brushStreamProps: hasBrush
      ? { brush: { dimension: "r" as const }, onBrush: handleBrush, brushExtent, onBrushEnd }
      : {} as Record<string, never>,
  }
}
