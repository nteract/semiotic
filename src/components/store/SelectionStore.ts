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

interface OwnedSelectionWriter {
  setClause: SelectionStoreState["setClause"]
  releaseClause: SelectionStoreState["clearClause"]
}

// Ownership is private, store-scoped metadata, never part of a serialized clause.
const ownedClauseClearers = /* @__PURE__ */ new WeakMap<
  SelectionStoreState["setClause"],
  (name: string, clientId: string, owner: object) => void
>()

/** Internal writer whose lifecycle cleanup releases only its latest clause. */
export function createOwnedSelectionWriter(
  setClause: (name: string, clause: SelectionClause, owner?: object) => void
): OwnedSelectionWriter {
  const release = ownedClauseClearers.get(setClause)
  const owner = {}
  // A consumer-supplied action has no store-owned lifecycle to release.
  return {
    setClause: release ? (name, clause) => setClause(name, clause, owner) : setClause,
    releaseClause: (name, clientId) => release?.(name, clientId, owner)
  }
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

function fieldSelectionsAreEqual(
  a: FieldSelection,
  b: FieldSelection
): boolean {
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
  const fields = Object.keys(a.fields)
  return a.clientId === b.clientId && a.type === b.type &&
    fields.length === Object.keys(b.fields).length &&
    fields.every((field) => !!b.fields[field] && fieldSelectionsAreEqual(a.fields[field], b.fields[field]))
}

export const [SelectionProvider, useSelectionSelector] =
  /* @__PURE__ */ createStore<SelectionStoreState>((set) => {
    const owners = new WeakMap<SelectionClause, object | undefined>()
    // Every mutation replaces just its named selection and preserves the rest.
    function updateSelection(
      name: string,
      update: (selection: Selection | undefined) => Selection | undefined
    ) {
      set((current) => {
        const selection = update(current.selections.get(name))
        return selection
          ? { selections: new Map(current.selections).set(name, selection) }
          : {}
      })
    }

    function setClause(
      selectionName: string,
      clause: SelectionClause,
      owner?: object
    ) {
      updateSelection(selectionName, (existingSelection) => {
        const existingClause = existingSelection?.clauses.get(clause.clientId)
        const unchanged =
          existingClause && clausesAreEqual(existingClause, clause)
        const storedClause = unchanged ? existingClause : clause
        // Equal values still transfer ownership, without notifying readers.
        owners.set(storedClause, owner)
        if (unchanged) return
        return {
          name: selectionName,
          resolution: "union",
          ...existingSelection,
          clauses: new Map(existingSelection?.clauses).set(clause.clientId, clause)
        }
      })
    }

    function clearClause(
      selectionName: string,
      clientId: string,
      owner?: object
    ) {
      updateSelection(selectionName, (existing) => {
        const clause = existing?.clauses.get(clientId)
        if (!existing || !clause || (owner && owners.get(clause) !== owner))
          return
        const clauses = new Map(existing.clauses)
        clauses.delete(clientId)
        return { ...existing, clauses }
      })
    }

    const state: SelectionStoreState = {
      selections: new Map<string, Selection>(),
      setClause,
      clearClause,

      setResolution(selectionName: string, mode: ResolutionMode) {
        updateSelection(selectionName, (existing) =>
          existing?.resolution === mode ? undefined : {
            name: selectionName,
            clauses: new Map(),
            ...existing,
            resolution: mode
          }
        )
      },

      clearSelection(selectionName: string) {
        updateSelection(selectionName, (sel) =>
          sel?.clauses.size ? { ...sel, clauses: new Map() } : undefined
        )
      }
    }
    ownedClauseClearers.set(setClause, clearClause)
    return state
  })
