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
import { useCallback, useRef } from "react"
import { normalizeLinkedBrush } from "./selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import type { ChartAccessor } from "./types"

export interface OrdinalBrushInput {
  brushProp: boolean | undefined
  onBrushProp: ((extent: { r: [number, number] } | null) => void) | undefined
  linkedBrush: string | { name: string; rField?: string } | undefined
  valueAccessor: ChartAccessor<any, number>
}

export interface OrdinalBrushResult {
  hasBrush: boolean
  handleBrush: (extent: { r: [number, number] } | null) => void
  /** Spread into streamProps: `...brushStreamProps` */
  brushStreamProps: { brush: { dimension: "r" }; onBrush: (extent: { r: [number, number] } | null) => void } | Record<string, never>
}

export function useOrdinalBrush({
  brushProp,
  onBrushProp,
  linkedBrush,
  valueAccessor,
}: OrdinalBrushInput): OrdinalBrushResult {
  // Normalize rField → xField for the selection store
  const normalizedLinkedBrush = typeof linkedBrush === "string"
    ? linkedBrush
    : linkedBrush
      ? { name: linkedBrush.name, xField: linkedBrush.rField }
      : undefined
  const brushConfig = normalizeLinkedBrush(normalizedLinkedBrush)
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
      ? { brush: { dimension: "r" as const }, onBrush: handleBrush }
      : {} as Record<string, never>,
  }
}
