"use client"
import type { Datum } from "../charts/shared/datumTypes"
import { useId, useMemo, useCallback, useEffect } from "react"
import { useStableShallow } from "../stream/useStableShallow"
import {
  useSelectionSelector,
  createOwnedSelectionWriter,
  buildPredicate,
  type FieldSelection,
  type SelectionStoreState
} from "./SelectionStore"
import { selectionFieldValues } from "./selectionProvenance"
import { hasOwnEnumerableKey } from "./createStore"

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
  /** Whether selection is active. Set false to release this client's clause and pause updates. Defaults to true. */
  enabled?: boolean
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
  return useSelectionState(options)
}

function useSelectionState(options: UseSelectionOptions, fieldScope?: readonly unknown[]): UseSelectionResult {
  const { name, enabled = true } = options
  const actions = useSelectionWriter(options, fieldScope)
  const { clientId } = actions
  const selection = useSelectionSelector(
    (state: SelectionStoreState) => enabled ? state.selections.get(name) : undefined
  )

  const isActive = !!selection?.clauses.size
  const predicate = useMemo(() => {
    if (!selection) return () => true
    return buildPredicate(selection, clientId)
  }, [selection, clientId])

  return useStableShallow({ ...actions, predicate, isActive })
}

// Both public writers share callbacks and cleanup without subscribing to values.
function useSelectionWriter(options: UseSelectionOptions, fieldScope?: readonly unknown[]) {
  const autoId = useId()
  const clientId = options.clientId || autoId
  const { name, enabled = true } = options

  const storeSetClause = useSelectionSelector((state: SelectionStoreState) => state.setClause)
  const { setClause, releaseClause } = useMemo(
    () => createOwnedSelectionWriter(storeSetClause),
    [storeSetClause]
  )
  const clearClauseFn = useSelectionSelector((state: SelectionStoreState) => state.clearClause)

  // Sharing a client ID replaces values, but only the latest writer owns cleanup.
  useEffect(() => {
    if (!enabled) return
    return () => releaseClause(name, clientId)
  }, [releaseClause, name, clientId, enabled, fieldScope])

  return useMemo(() => {
    const select = (type: FieldSelection["type"], fieldValues: Record<string, unknown[]>) => {
      if (!enabled) return
      const fields: Record<string, FieldSelection> = {}
      for (const [field, values] of Object.entries(fieldValues)) {
        fields[field] = type === "point"
          ? { type, values: new Set(values) }
          : { type, range: values as [number, number] }
      }
      if (hasOwnEnumerableKey(fields)) setClause(name, { clientId, type, fields })
    }
    return {
      selectPoints: (values: Record<string, unknown[]>) => select("point", values),
      selectInterval: (ranges: Record<string, [number, number]>) => select("interval", ranges),
      clear: () => clearClauseFn(name, clientId),
      clientId
    }
  }, [name, clientId, enabled, setClause, clearClauseFn])
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
  const { selectPoints, clear, clientId: cid } = useSelectionWriter({ name, clientId })
  return useStableShallow({ selectPoints, clear, clientId: cid })
}

// ── useLinkedHover ─────────────────────────────────────────────────────────

export interface UseLinkedHoverOptions {
  /** Selection name. Defaults to "hover" */
  name?: string
  /** Fields to include in the hover selection */
  fields: string[]
  /** Whether linked hover is active. Set false to release its clause and pause updates. Defaults to true. */
  enabled?: boolean
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
  const fields = useStableShallow(options.fields)

  const { predicate, isActive, selectPoints, clear } = useSelectionState({
    name: selName,
    enabled: options.enabled
  }, fields)

  const onHover = useCallback(
    (datum: Datum | null) => {
      if (!datum) {
        clear()
        return
      }
      const fieldValues = selectionFieldValues(datum, fields)
      if (hasOwnEnumerableKey(fieldValues)) {
        selectPoints(fieldValues)
      } else {
        clear()
      }
    },
    [fields, selectPoints, clear]
  )

  return useStableShallow({ onHover, predicate, isActive })
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

  const fields = useStableShallow([xField, yField])
  const { predicate, isActive, selectInterval, clear } = useSelectionState({ name }, fields)

  const brushType = xField && yField ? "xyBrush" : xField ? "xBrush" : "yBrush"

  const handleBrush = useCallback(
    (extent: BrushExtent | null) => {
      if (!extent) {
        clear()
        return
      }

      const fieldRanges: Record<string, [number, number]> = {}
      const setRange = (field: string | undefined, start: number, end: number) => {
        if (field) fieldRanges[field] = [Math.min(start, end), Math.max(start, end)]
      }

      if (brushType === "xyBrush" && isXYBrushExtent(extent)) {
        // extent = [[x0, y0], [x1, y1]]
        setRange(xField, extent[0][0], extent[1][0])
        setRange(yField, extent[0][1], extent[1][1])
      } else if (brushType !== "xyBrush" && isLinearBrushExtent(extent)) {
        setRange(xField || yField, extent[0], extent[1])
      }

      selectInterval(fieldRanges)
    },
    [brushType, xField, yField, selectInterval, clear]
  )

  const brushInteraction = useStableShallow<UseBrushSelectionResult["brushInteraction"]>({
    brush: brushType,
    during: handleBrush,
    end: handleBrush
  })

  return useStableShallow({ brushInteraction, predicate, isActive, clear })
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
