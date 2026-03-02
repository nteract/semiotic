"use client"
import { createStore } from "./createStore"

// ── Types ──────────────────────────────────────────────────────────────────

export type ResolutionMode = "union" | "intersect" | "crossfilter"

export interface FieldConstraint {
  type: "point"
  values: Set<any>
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

function buildClausePredicate(clause: SelectionClause): (d: Record<string, any>) => boolean {
  const fieldTests: Array<(d: Record<string, any>) => boolean> = []

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
): (d: Record<string, any>) => boolean {
  const clausePredicates: Array<(d: Record<string, any>) => boolean> = []

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

export const [SelectionProvider, useSelectionSelector] = createStore(
  (set: Function) => ({
    selections: new Map<string, Selection>(),

    setClause(selectionName: string, clause: SelectionClause) {
      set((current: SelectionStoreState) => {
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
        if (!existing) return {}
        const selections = new Map(current.selections)
        const clauses = new Map(existing.clauses)
        clauses.delete(clientId)
        selections.set(selectionName, { ...existing, clauses })
        return { selections }
      })
    },

    setResolution(selectionName: string, mode: ResolutionMode) {
      set((current: SelectionStoreState) => {
        const selections = new Map(current.selections)
        const sel = ensureSelection(selections, selectionName)
        selections.set(selectionName, { ...sel, resolution: mode })
        return { selections }
      })
    },

    clearSelection(selectionName: string) {
      set((current: SelectionStoreState) => {
        const selections = new Map(current.selections)
        const sel = selections.get(selectionName)
        if (sel) {
          selections.set(selectionName, { ...sel, clauses: new Map() })
        }
        return { selections }
      })
    }
  })
)
