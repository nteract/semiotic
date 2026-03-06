"use client"
import { useId, useMemo, useCallback } from "react"
import {
  useSelectionSelector,
  buildPredicate,
  type SelectionClause,
  type FieldSelection
} from "./SelectionStore"

// ── useSelection ───────────────────────────────────────────────────────────

export interface UseSelectionOptions {
  /** Name of the selection to participate in */
  name: string
  /** Unique client ID. Defaults to React.useId() */
  clientId?: string
  /** Fields this client cares about (for predicate context) */
  fields?: string[]
}

export interface UseSelectionResult {
  /** Returns true if the datum matches the current selection */
  predicate: (datum: Record<string, any>) => boolean
  /** Whether any selection clause is currently active */
  isActive: boolean
  /** Set a point selection (categorical values) */
  selectPoints: (fieldValues: Record<string, any[]>) => void
  /** Set an interval selection (numeric ranges) */
  selectInterval: (fieldRanges: Record<string, [number, number]>) => void
  /** Clear this client's clause */
  clear: () => void
  /** This client's ID */
  clientId: string
}

export function useSelection(options: UseSelectionOptions): UseSelectionResult {
  const autoId = useId()
  const clientId = options.clientId || autoId
  const { name } = options

  const selection = useSelectionSelector(
    (state: any) => state.selections.get(name)
  )

  const setClause = useSelectionSelector((state: any) => state.setClause)
  const clearClauseFn = useSelectionSelector((state: any) => state.clearClause)

  const isActive = useMemo(() => {
    if (!selection) return false
    return selection.clauses.size > 0
  }, [selection])

  const predicate = useMemo(() => {
    if (!selection || selection.clauses.size === 0) return () => true
    return buildPredicate(selection, clientId)
  }, [selection, clientId])

  const selectPoints = useCallback(
    (fieldValues: Record<string, any[]>) => {
      const fields: Record<string, FieldSelection> = {}
      for (const [field, values] of Object.entries(fieldValues)) {
        fields[field] = { type: "point", values: new Set(values) }
      }
      const clause: SelectionClause = {
        clientId,
        type: "point",
        fields
      }
      setClause(name, clause)
    },
    [clientId, name, setClause]
  )

  const selectInterval = useCallback(
    (fieldRanges: Record<string, [number, number]>) => {
      const fields: Record<string, FieldSelection> = {}
      for (const [field, range] of Object.entries(fieldRanges)) {
        fields[field] = { type: "interval", range }
      }
      const clause: SelectionClause = {
        clientId,
        type: "interval",
        fields
      }
      setClause(name, clause)
    },
    [clientId, name, setClause]
  )

  const clear = useCallback(() => {
    clearClauseFn(name, clientId)
  }, [clearClauseFn, name, clientId])

  return { predicate, isActive, selectPoints, selectInterval, clear, clientId }
}

// ── useLinkedHover ─────────────────────────────────────────────────────────

export interface UseLinkedHoverOptions {
  /** Selection name. Defaults to "hover" */
  name?: string
  /** Fields to include in the hover selection */
  fields: string[]
}

export interface UseLinkedHoverResult {
  /** Call with a datum to set hover, or null to clear */
  onHover: (datum: Record<string, any> | null) => void
  /** Returns true if datum matches the hover selection */
  predicate: (datum: Record<string, any>) => boolean
  /** Whether any hover is active */
  isActive: boolean
}

export function useLinkedHover(options: UseLinkedHoverOptions): UseLinkedHoverResult {
  const selName = options.name || "hover"
  const { fields } = options

  const { predicate, isActive, selectPoints, clear, clientId } = useSelection({
    name: selName,
    fields
  })

  const onHover = useCallback(
    (datum: Record<string, any> | null) => {
      if (!datum) {
        clear()
        return
      }
      const fieldValues: Record<string, any[]> = {}
      for (const field of fields) {
        const val = datum[field]
        if (val !== undefined) {
          fieldValues[field] = [val]
        }
      }
      if (Object.keys(fieldValues).length > 0) {
        selectPoints(fieldValues)
      }
    },
    [fields, selectPoints, clear, selName]
  )

  return { onHover, predicate, isActive }
}

// ── useBrushSelection ──────────────────────────────────────────────────────

export interface UseBrushSelectionOptions {
  /** Selection name */
  name: string
  /** Field mapped to the x-axis brush extent */
  xField?: string
  /** Field mapped to the y-axis brush extent */
  yField?: string
}

export interface UseBrushSelectionResult {
  /** Interaction config to pass to frameProps.interaction */
  brushInteraction: {
    brush: "xyBrush" | "xBrush" | "yBrush"
    during: (extent: any) => void
    end: (extent: any) => void
  }
  /** Returns true if datum matches the brush selection */
  predicate: (datum: Record<string, any>) => boolean
  /** Whether any brush is active */
  isActive: boolean
  /** Clear the brush */
  clear: () => void
}

export function useBrushSelection(options: UseBrushSelectionOptions): UseBrushSelectionResult {
  const { name, xField, yField } = options

  const { predicate, isActive, selectInterval, clear, clientId } = useSelection({
    name,
    fields: [xField, yField].filter(Boolean) as string[]
  })

  const brushType = xField && yField ? "xyBrush" : xField ? "xBrush" : "yBrush"

  const handleBrush = useCallback(
    (extent: any) => {
      if (!extent) {
        clear()
        return
      }

      const fieldRanges: Record<string, [number, number]> = {}

      if (brushType === "xyBrush" && Array.isArray(extent) && extent.length === 2) {
        // extent = [[x0, y0], [x1, y1]]
        if (xField) fieldRanges[xField] = [Math.min(extent[0][0], extent[1][0]), Math.max(extent[0][0], extent[1][0])]
        if (yField) fieldRanges[yField] = [Math.min(extent[0][1], extent[1][1]), Math.max(extent[0][1], extent[1][1])]
      } else if (brushType === "xBrush" && Array.isArray(extent)) {
        if (xField) fieldRanges[xField] = [Math.min(...extent), Math.max(...extent)]
      } else if (brushType === "yBrush" && Array.isArray(extent)) {
        if (yField) fieldRanges[yField] = [Math.min(...extent), Math.max(...extent)]
      }

      if (Object.keys(fieldRanges).length > 0) {
        selectInterval(fieldRanges)
      }
    },
    [brushType, xField, yField, selectInterval, clear]
  )

  const brushInteraction = useMemo(
    () => ({
      brush: brushType as "xyBrush" | "xBrush" | "yBrush",
      during: handleBrush,
      end: handleBrush
    }),
    [brushType, handleBrush]
  )

  return { brushInteraction, predicate, isActive, clear }
}

// ── useFilteredData ────────────────────────────────────────────────────────

/**
 * Returns the subset of `data` that matches the given selection.
 * In crossfilter mode, pass the consumer's clientId so its own clause is excluded.
 */
export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  selectionName: string,
  clientId?: string
): T[] {
  const selection = useSelectionSelector(
    (state: any) => state.selections.get(selectionName)
  )

  return useMemo(() => {
    if (!selection || selection.clauses.size === 0) return data
    const pred = buildPredicate(selection, clientId)
    return data.filter(pred)
  }, [data, selection, clientId])
}
