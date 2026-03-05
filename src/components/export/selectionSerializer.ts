import type {
  Selection,
  SelectionClause,
  FieldSelection
} from "../store/SelectionStore"

// ── Serialized types (JSON-safe) ────────────────────────────────────────

export type SerializedFieldSelection =
  | { type: "point"; values: any[] }
  | { type: "interval"; range: [number, number] }

export interface SerializedSelection {
  name: string
  resolution: "union" | "intersect" | "crossfilter"
  clauses: Array<{
    clientId: string
    type: "point" | "interval"
    fields: Record<string, SerializedFieldSelection>
  }>
}

export type SerializedSelections = Record<string, SerializedSelection>

// ── Serialize ───────────────────────────────────────────────────────────

export function serializeSelections(
  selections: Map<string, Selection>
): SerializedSelections {
  const result: SerializedSelections = {}

  for (const [name, sel] of selections) {
    const clauses: SerializedSelection["clauses"] = []

    for (const [, clause] of sel.clauses) {
      const fields: Record<string, SerializedFieldSelection> = {}

      for (const [fieldName, constraint] of Object.entries(clause.fields)) {
        if (constraint.type === "point") {
          fields[fieldName] = { type: "point", values: Array.from(constraint.values) }
        } else {
          fields[fieldName] = { type: "interval", range: constraint.range }
        }
      }

      clauses.push({
        clientId: clause.clientId,
        type: clause.type,
        fields
      })
    }

    result[name] = { name: sel.name, resolution: sel.resolution, clauses }
  }

  return result
}

// ── Deserialize ─────────────────────────────────────────────────────────

export function deserializeSelections(
  serialized: SerializedSelections
): Map<string, Selection> {
  const result = new Map<string, Selection>()

  for (const [name, sSel] of Object.entries(serialized)) {
    const clauses = new Map<string, SelectionClause>()

    for (const sClause of sSel.clauses) {
      const fields: Record<string, FieldSelection> = {}

      for (const [fieldName, sConstraint] of Object.entries(sClause.fields)) {
        if (sConstraint.type === "point") {
          fields[fieldName] = { type: "point", values: new Set(sConstraint.values) }
        } else {
          fields[fieldName] = { type: "interval", range: sConstraint.range }
        }
      }

      clauses.set(sClause.clientId, {
        clientId: sClause.clientId,
        type: sClause.type,
        fields
      })
    }

    result.set(name, { name: sSel.name, resolution: sSel.resolution, clauses })
  }

  return result
}
