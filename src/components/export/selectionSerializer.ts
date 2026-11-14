import type {
  Selection,
  SelectionClause,
  FieldSelection
} from "../store/SelectionStore"
import { encodeDates, restoreDates, cloneConfigValue } from "./configDates"
import { nonJsonValuePaths } from "../artifact/jsonCompatibility"

// ── Serialized types (JSON-safe) ────────────────────────────────────────

export type SerializedFieldSelection =
  | { type: "point"; values: unknown[]; datePaths?: string[][] }
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
  const result = Object.create(null) as SerializedSelections

  for (const [name, sel] of selections) {
    const clauses: SerializedSelection["clauses"] = []

    for (const [, clause] of sel.clauses) {
      const fields = Object.create(null) as Record<
        string,
        SerializedFieldSelection
      >

      for (const [fieldName, constraint] of Object.entries(clause.fields)) {
        if (constraint.type === "point") {
          const encoded = encodeDates(Array.from(constraint.values))
          requireJsonSelection(encoded.value)
          fields[fieldName] = {
            type: "point",
            values: cloneConfigValue(encoded.value) as unknown[],
            ...(encoded.datePaths.length
              ? { datePaths: encoded.datePaths }
              : {})
          }
        } else {
          requireJsonSelection(constraint.range)
          fields[fieldName] = { type: "interval", range: [...constraint.range] }
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
  requireJsonSelection(serialized)
  const result = new Map<string, Selection>()

  for (const [name, sSel] of Object.entries(serialized)) {
    const clauses = new Map<string, SelectionClause>()

    for (const sClause of sSel.clauses) {
      const fields = Object.create(null) as Record<string, FieldSelection>

      for (const [fieldName, sConstraint] of Object.entries(sClause.fields)) {
        if (sConstraint.type === "point") {
          fields[fieldName] = {
            type: "point",
            values: new Set(
              restoreDates(sConstraint.values, sConstraint.datePaths)
            )
          }
        } else {
          fields[fieldName] = {
            type: "interval",
            range: [...sConstraint.range]
          }
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

function requireJsonSelection(value: unknown): void {
  const invalid = nonJsonValuePaths(value)
  if (invalid.length)
    throw new TypeError(
      `Selection contains unsupported JSON values at: ${invalid.join(", ")}.`
    )
}
