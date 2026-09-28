"use client"
import type { Datum } from "../charts/shared/datumTypes"
import { createStore } from "./createStore"
import {
  getSelectionCoverage,
  getSelectionProvenance,
  type SelectionCoverage
} from "./selectionProvenance"

// ── Types ──────────────────────────────────────────────────────────────────

/** Crossfilter intersects all clauses except the requesting client's own. */
export type ResolutionMode = "union" | "intersect" | "crossfilter"

export interface FieldConstraint {
  type: "point"
  /** Exact values; valid Dates match other Dates with the same timestamp. */
  values: Set<unknown>
}

export interface IntervalConstraint {
  type: "interval"
  /** Inclusive bounds for finite numbers and valid Dates (epoch milliseconds). */
  range: [number, number]
}

export type FieldSelection = FieldConstraint | IntervalConstraint

export interface SelectionClause {
  clientId: string
  type: "point" | "interval"
  fields: Record<string, FieldSelection>
}

export interface Selection {
  name: string
  resolution: ResolutionMode
  clauses: Map<string, SelectionClause> // keyed by clientId
}

export interface SelectionStoreState {
  selections: Map<string, Selection>
  setClause: (selectionName: string, clause: SelectionClause) => void
  clearClause: (selectionName: string, clientId: string) => void
  setResolution: (selectionName: string, mode: ResolutionMode) => void
  clearSelection: (selectionName: string) => void
}

// ── Predicate builders ─────────────────────────────────────────────────────

type RowTest = (d: Datum, coverage?: SelectionCoverage) => boolean

const coverageNumber = (value: unknown): number =>
  value instanceof Date ? value.getTime() : typeof value === "number" ? value : NaN

/** Whether sorted `values` contain one inside the half-open `[start, end)`. */
function hasValueInRange(values: Float64Array, start: number, end: number): boolean {
  let lo = 0
  let hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (values[mid] < start) lo = mid + 1
    else hi = mid
  }
  return lo < values.length && values[lo] < end
}

function buildRowClausePredicate(clause: SelectionClause): RowTest {
  const fieldTests: RowTest[] = []

  for (const [field, constraint] of Object.entries(clause.fields)) {
    if (constraint.type === "point") {
      // Compile Date membership once per predicate, keeping ordinary point
      // values type-sensitive and avoiding a value scan for every data row.
      let timestamps: Set<number> | undefined
      for (const value of constraint.values) {
        if (value instanceof Date && Number.isFinite(value.getTime())) {
          timestamps ??= new Set<number>()
          timestamps.add(value.getTime())
        }
      }
      // A datum covering a range on this field (a histogram bin) matches any
      // selected value inside it. Sorted values are built once per coercer.
      const sortedByCoercer = new Map<(value: unknown) => number, Float64Array>()
      const sortedValues = (toNumber: (value: unknown) => number) => {
        let sorted = sortedByCoercer.get(toNumber)
        if (!sorted) {
          const numbers: number[] = []
          for (const value of constraint.values) {
            const n = toNumber(value)
            if (Number.isFinite(n)) numbers.push(n)
          }
          sorted = Float64Array.from(numbers).sort()
          sortedByCoercer.set(toNumber, sorted)
        }
        return sorted
      }
      fieldTests.push((d, coverage) => {
        if (coverage && Object.prototype.hasOwnProperty.call(coverage.ranges, field)) {
          const [start, end] = coverage.ranges[field]
          return hasValueInRange(sortedValues(coverage.toNumber ?? coverageNumber), start, end)
        }
        const value = d[field]
        return value instanceof Date
          ? (timestamps?.has(value.getTime()) ?? false)
          : constraint.values.has(value)
      })
    } else {
      const [lo, hi] = constraint.range
      fieldTests.push((d) => {
        const value = d[field]
        const v = value instanceof Date ? value.getTime() : value
        return typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi
      })
    }
  }

  return (d, coverage) => fieldTests.every((fn) => fn(d, coverage))
}

export function buildPredicate(
  selection: Selection,
  requestingClientId?: string
): (d: Datum) => boolean {
  const rowClausePredicates: RowTest[] = []

  for (const [clientId, clause] of selection.clauses) {
    // In crossfilter mode, exclude the requesting client's own clause
    if (
      selection.resolution === "crossfilter" &&
      clientId === requestingClientId
    )
      continue
    rowClausePredicates.push(buildRowClausePredicate(clause))
  }

  if (rowClausePredicates.length === 0) return () => true

  // An aggregate represents a set of source rows. Intersected clauses must
  // all match the same row, including crossfilter's remaining clauses. The
  // aggregate's covered ranges apply to it and to each of its rows.
  const matchesRow: RowTest =
    selection.resolution !== "union"
      ? (row, coverage) => rowClausePredicates.every((predicate) => predicate(row, coverage))
      : (row, coverage) => rowClausePredicates.some((predicate) => predicate(row, coverage))

  return (datum) => {
    const coverage = getSelectionCoverage(datum)
    return (
      matchesRow(datum, coverage) ||
      (getSelectionProvenance(datum)?.some((row) => matchesRow(row, coverage)) ?? false)
    )
  }
}

// ── Store factory ──────────────────────────────────────────────────────────

function ensureSelection(
  selections: Map<string, Selection>,
  name: string
): Selection {
  let sel = selections.get(name)
  if (!sel) {
    sel = { name, resolution: "union", clauses: new Map() }
    selections.set(name, sel)
  }
  return sel
}

function fieldSelectionsAreEqual(
  a: FieldSelection,
  b: FieldSelection
): boolean {
  if (a.type !== b.type) return false
  if (a.type === "interval" && b.type === "interval") {
    return a.range[0] === b.range[0] && a.range[1] === b.range[1]
  }
  if (a.type === "point" && b.type === "point") {
    if (a.values.size !== b.values.size) return false
    for (const value of a.values) {
      if (!b.values.has(value)) return false
    }
    return true
  }
  return false
}

function clausesAreEqual(a: SelectionClause, b: SelectionClause): boolean {
  if (a.clientId !== b.clientId || a.type !== b.type) return false
  const aFields = Object.entries(a.fields)
  if (aFields.length !== countObjectKeys(b.fields)) return false
  for (const [field, selection] of aFields) {
    const otherSelection = b.fields[field]
    if (
      !otherSelection ||
      !fieldSelectionsAreEqual(selection, otherSelection)
    ) {
      return false
    }
  }
  return true
}

function countObjectKeys(value: object): number {
  let count = 0
  for (const _key in value) {
    count++
  }
  return count
}

export const [SelectionProvider, useSelectionSelector] =
  createStore<SelectionStoreState>((set) => ({
    selections: new Map<string, Selection>(),

    setClause(selectionName: string, clause: SelectionClause) {
      set((current: SelectionStoreState) => {
        const existingSelection = current.selections.get(selectionName)
        const existingClause = existingSelection?.clauses.get(clause.clientId)
        if (existingClause && clausesAreEqual(existingClause, clause)) return {}
        const selections = new Map(current.selections)
        const sel = ensureSelection(selections, selectionName)
        const clauses = new Map(sel.clauses)
        clauses.set(clause.clientId, clause)
        selections.set(selectionName, { ...sel, clauses })
        return { selections }
      })
    },

    clearClause(selectionName: string, clientId: string) {
      set((current: SelectionStoreState) => {
        const existing = current.selections.get(selectionName)
        if (!existing || !existing.clauses.has(clientId)) return {}
        const selections = new Map(current.selections)
        const clauses = new Map(existing.clauses)
        clauses.delete(clientId)
        selections.set(selectionName, { ...existing, clauses })
        return { selections }
      })
    },

    setResolution(selectionName: string, mode: ResolutionMode) {
      set((current: SelectionStoreState) => {
        const existing = current.selections.get(selectionName)
        if (existing?.resolution === mode) return {}
        const selections = new Map(current.selections)
        const sel = ensureSelection(selections, selectionName)
        selections.set(selectionName, { ...sel, resolution: mode })
        return { selections }
      })
    },

    clearSelection(selectionName: string) {
      set((current: SelectionStoreState) => {
        const sel = current.selections.get(selectionName)
        if (!sel || sel.clauses.size === 0) return {}
        const selections = new Map(current.selections)
        selections.set(selectionName, { ...sel, clauses: new Map() })
        return { selections }
      })
    }
  }))
