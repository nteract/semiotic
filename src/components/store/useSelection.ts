"use client"
import type { Datum } from "../charts/shared/datumTypes"
import { useId, useMemo, useCallback } from "react"
import {
  useSelectionSelector,
  buildPredicate,
  type SelectionClause,
  type FieldSelection,
  type SelectionStoreState
} from "./SelectionStore"

// Re-export crosshair store for convenience
export { useCrosshairPosition, setCrosshairPosition, clearCrosshairPosition } from "./LinkedCrosshairStore"

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
  predicate: (datum: Datum) => boolean
  /** Whether any selection clause is currently active */
  isActive: boolean
  /** Set a point selection (categorical values) */
  selectPoints: (fieldValues: Record<string, unknown[]>) => void
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
    (state: SelectionStoreState) => state.selections.get(name)
  )

  const setClause = useSelectionSelector((state: SelectionStoreState) => state.setClause)
  const clearClauseFn = useSelectionSelector((state: SelectionStoreState) => state.clearClause)

  const isActive = useMemo(() => {
    if (!selection) return false
    return selection.clauses.size > 0
  }, [selection])

  const predicate = useMemo(() => {
    if (!selection || selection.clauses.size === 0) return () => true
    return buildPredicate(selection, clientId)
  }, [selection, clientId])

  const selectPoints = useCallback(
    (fieldValues: Record<string, unknown[]>) => {
      const fields: Record<string, FieldSelection> = {}
      let hasFields = false
      for (const [field, values] of Object.entries(fieldValues)) {
        fields[field] = { type: "point", values: new Set(values) }
        hasFields = true
      }
      if (!hasFields) return
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
      let hasFields = false
      for (const [field, range] of Object.entries(fieldRanges)) {
        fields[field] = { type: "interval", range }
        hasFields = true
      }
      if (!hasFields) return
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

// ── useSelectionActions ──────────────────────────────────────────────────────

export interface UseSelectionActionsResult {
  /** Set a point selection (categorical values) under this client's clause. */
  selectPoints: (fieldValues: Record<string, unknown[]>) => void
  /** Clear this client's clause. */
  clear: () => void
  /** This client's ID. */
  clientId: string
}

/**
 * Write-only access to a named selection that **does not subscribe** to the
 * selection state — selecting only the stable `setClause`/`clearClause`
 * actions, so the calling component never re-renders when the selection
 * changes.
 *
 * Use this when a *container* needs to push a selection (e.g. from a hover
 * handler) but only the leaf consumers (the charts reading the selection)
 * should re-render. Pairs with `LinkedCharts` for the
 * provider-at-top / consumers-at-leaves pattern: the writer stays out of the
 * re-render path, avoiding per-interaction reconciliation + allocation in the
 * container subtree. For read + write, use `useSelection`.
 */
export function useSelectionActions(name: string, clientId?: string): UseSelectionActionsResult {
  const autoId = useId()
  const cid = clientId || autoId
  // Selecting stable action refs only — never the `selections` slice — so this
  // component is not a subscriber and won't re-render on selection changes.
  const setClause = useSelectionSelector((state: SelectionStoreState) => state.setClause)
  const clearClauseFn = useSelectionSelector((state: SelectionStoreState) => state.clearClause)

  const selectPoints = useCallback(
    (fieldValues: Record<string, unknown[]>) => {
      const fields: Record<string, FieldSelection> = {}
      let hasFields = false
      for (const [field, values] of Object.entries(fieldValues)) {
        fields[field] = { type: "point", values: new Set(values) }
        hasFields = true
      }
      if (!hasFields) return
      setClause(name, { clientId: cid, type: "point", fields })
    },
    [name, cid, setClause]
  )

  const clear = useCallback(() => clearClauseFn(name, cid), [name, cid, clearClauseFn])

  return { selectPoints, clear, clientId: cid }
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
  onHover: (datum: Datum | null) => void
  /** Returns true if datum matches the hover selection */
  predicate: (datum: Datum) => boolean
  /** Whether any hover is active */
  isActive: boolean
}

export function useLinkedHover(options: UseLinkedHoverOptions): UseLinkedHoverResult {
  const selName = options.name || "hover"
  const { fields } = options

  const { predicate, isActive, selectPoints, clear } = useSelection({
    name: selName,
    fields
  })

  const onHover = useCallback(
    (datum: Datum | null) => {
      if (!datum) {
        clear()
        return
      }
      const fieldValues: Record<string, unknown[]> = {}
      for (const field of fields) {
        const val = datum[field]
        if (val !== undefined) {
          fieldValues[field] = [val]
        }
      }
      if (hasOwnEnumerableKey(fieldValues)) {
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
  brushInteraction: {
    brush: "xyBrush" | "xBrush" | "yBrush"
    during: (extent: BrushExtent | null) => void
    end: (extent: BrushExtent | null) => void
  }
  /** Interaction config to pass to frameProps.interaction */
  /** Returns true if datum matches the brush selection */
  predicate: (datum: Datum) => boolean
  /** Whether any brush is active */
  isActive: boolean
  /** Clear the brush */
  clear: () => void
}

type LinearBrushExtent = [number, number]
type XYBrushExtent = [[number, number], [number, number]]
type BrushExtent = LinearBrushExtent | XYBrushExtent | [number, number][]

function isXYBrushExtent(extent: BrushExtent): extent is XYBrushExtent {
  return (
    extent.length === 2 &&
    Array.isArray(extent[0]) &&
    extent[0].length === 2 &&
    Array.isArray(extent[1]) &&
    extent[1].length === 2
  )
}

function isLinearBrushExtent(extent: BrushExtent): extent is LinearBrushExtent {
  return (
    extent.length === 2 &&
    typeof extent[0] === "number" &&
    typeof extent[1] === "number"
  )
}

export function useBrushSelection(options: UseBrushSelectionOptions): UseBrushSelectionResult {
  const { name, xField, yField } = options

  const { predicate, isActive, selectInterval, clear } = useSelection({
    name,
    fields: [xField, yField].filter(Boolean) as string[]
  })

  const brushType = xField && yField ? "xyBrush" : xField ? "xBrush" : "yBrush"

  const handleBrush = useCallback(
    (extent: BrushExtent | null) => {
      if (!extent) {
        clear()
        return
      }

      const fieldRanges: Record<string, [number, number]> = {}

      if (brushType === "xyBrush" && isXYBrushExtent(extent)) {
        // extent = [[x0, y0], [x1, y1]]
        if (xField) fieldRanges[xField] = [Math.min(extent[0][0], extent[1][0]), Math.max(extent[0][0], extent[1][0])]
        if (yField) fieldRanges[yField] = [Math.min(extent[0][1], extent[1][1]), Math.max(extent[0][1], extent[1][1])]
      } else if (brushType === "xBrush" && isLinearBrushExtent(extent)) {
        if (xField) fieldRanges[xField] = [Math.min(extent[0], extent[1]), Math.max(extent[0], extent[1])]
      } else if (brushType === "yBrush" && isLinearBrushExtent(extent)) {
        if (yField) fieldRanges[yField] = [Math.min(extent[0], extent[1]), Math.max(extent[0], extent[1])]
      }

      if (hasOwnEnumerableKey(fieldRanges)) {
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

function hasOwnEnumerableKey(value: object): boolean {
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) return true
  }
  return false
}

// ── useFilteredData ────────────────────────────────────────────────────────

/**
 * Returns the subset of `data` that matches the given selection.
 * In crossfilter mode, pass the consumer's clientId so its own clause is excluded.
 */
export function useFilteredData<T extends Datum>(
  data: T[],
  selectionName: string,
  clientId?: string
): T[] {
  const selection = useSelectionSelector(
    (state: SelectionStoreState) => state.selections.get(selectionName)
  )

  return useMemo(() => {
    if (!selection || selection.clauses.size === 0) return data
    const pred = buildPredicate(selection, clientId)
    return data.filter(pred)
  }, [data, selection, clientId])
}
