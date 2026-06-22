"use client"
import type { Datum } from "../charts/shared/datumTypes"
import { createStore } from "./createStore"

// ── Types ──────────────────────────────────────────────────────────────────

export type ResolutionMode = "union" | "intersect" | "crossfilter"

export interface FieldConstraint {
  type: "point"
  values: Set<unknown>
}

export interface IntervalConstraint {
  type: "interval"
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

function buildClausePredicate(clause: SelectionClause): (d: Datum) => boolean {
  const fieldTests: Array<(d: Datum) => boolean> = []

  for (const [field, constraint] of Object.entries(clause.fields)) {
    if (constraint.type === "point") {
      fieldTests.push((d) => constraint.values.has(d[field]))
    } else {
      const [lo, hi] = constraint.range
      fieldTests.push((d) => {
        const v = d[field]
        return v >= lo && v <= hi
      })
    }
  }

  // All fields in a clause must match (AND within clause)
  return (d) => fieldTests.every((fn) => fn(d))
}

export function buildPredicate(
  selection: Selection,
  requestingClientId?: string
): (d: Datum) => boolean {
  const clausePredicates: Array<(d: Datum) => boolean> = []

  for (const [clientId, clause] of selection.clauses) {
    // In crossfilter mode, exclude the requesting client's own clause
    if (selection.resolution === "crossfilter" && clientId === requestingClientId) continue
    clausePredicates.push(buildClausePredicate(clause))
  }

  if (clausePredicates.length === 0) return () => true

  return selection.resolution === "intersect"
    ? (d) => clausePredicates.every((fn) => fn(d))
    : (d) => clausePredicates.some((fn) => fn(d))
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

function fieldSelectionsAreEqual(a: FieldSelection, b: FieldSelection): boolean {
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
    if (!otherSelection || !fieldSelectionsAreEqual(selection, otherSelection)) {
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

export const [SelectionProvider, useSelectionSelector] = createStore<SelectionStoreState>(
  (set) => ({
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
  })
)
