import type { Datum } from "./datumTypes"

// ── Smart default-tooltip field selection ──────────────────────────────────
//
// For charts that don't (or can't) declare tooltip fields — network/custom
// layouts, recipes, "weird" charts, or any default that would otherwise dump
// every property in object order — this picks a human-meaningful title (a
// name/label) and orders the rest by role (a type/kind first, then a value,
// then the remainder), skipping the fields that are layout bookkeeping rather
// than data.
//
// Pure and dependency-free (only the `Datum` type) so it can be shared by the
// tooltip components, the per-family default-tooltip builders, and the frames
// without import cycles.

/** Field-name hints, in priority order, for the tooltip's bold title. */
const TITLE_HINTS = ["name", "label", "title"]
/** Type/kind family — only the first present member is shown (rest are its synonyms). */
const TYPE_FAMILY = ["type", "kind", "category", "group", "class", "status", "role", "shape"]
/** Value family — likewise deduped to the first present member. */
const VALUE_FAMILY = ["value", "amount", "total", "count", "weight", "score"]
/** Positional / geometry / topology keys that are layout bookkeeping, not data. */
const POSITIONAL_KEYS = new Set([
  "x", "y", "z", "x0", "x1", "y0", "y1", "r", "cx", "cy", "radius",
  "layer", "row", "rowindex", "col", "column", "depth", "index", "order",
  "sankeywidth", "coincidentpoints", "sourcelinks", "targetlinks",
  "parent", "children", "fx", "fy", "vx", "vy",
])

export interface SmartTooltipEntry {
  key: string
  value: unknown
}

export interface SmartTooltipResult {
  /** The key the title came from, if any. */
  titleKey?: string
  /** The display title (a name/label/title/id). */
  title?: unknown
  /** Ordered rows to show beneath the title (type → value → rest). */
  entries: SmartTooltipEntry[]
}

interface ScannedField {
  key: string
  lower: string
  value: unknown
}

function pickFamily(fields: ScannedField[], family: string[]): ScannedField | undefined {
  for (const name of family) {
    const found = fields.find((f) => f.lower === name)
    if (found) return found
  }
  return undefined
}

/**
 * Choose a title + ordered, de-noised rows from an arbitrary datum. Pure.
 *
 * - Skips `_`/`__`-prefixed keys, `data`, positional/topology keys, and
 *   non-primitive values (nested objects/arrays).
 * - Title: the first `name`/`label`/`title` field, else `id`, else the first
 *   string field. When a real name is used, `id` is dropped as redundant.
 * - Rows: one type-family field, then one value-family field, then the rest in
 *   insertion order (capped at `maxEntries`).
 */
export function smartTooltipEntries(
  raw: Datum | null | undefined,
  options: { maxEntries?: number; skipPositional?: boolean } = {},
): SmartTooltipResult {
  if (!raw || typeof raw !== "object") return { entries: [] }
  const maxEntries = options.maxEntries ?? 6
  // Positional/geometry keys are layout bookkeeping for scene data (network /
  // custom layouts), but for user data (XY/ordinal) `x`/`y` ARE the values —
  // so this is opt-out. Defaults on (the network/scene-data caller).
  const skipPositional = options.skipPositional !== false

  const fields: ScannedField[] = []
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("_")) continue
    if (key === "data") continue
    if (skipPositional && POSITIONAL_KEYS.has(key.toLowerCase())) continue
    if (value == null) continue
    const t = typeof value
    if (t !== "string" && t !== "number" && t !== "boolean" && !(value instanceof Date)) continue
    fields.push({ key, lower: key.toLowerCase(), value })
  }
  if (fields.length === 0) return { entries: [] }

  let titleIdx = fields.findIndex((f) => TITLE_HINTS.includes(f.lower))
  const usedName = titleIdx >= 0
  if (titleIdx < 0) titleIdx = fields.findIndex((f) => f.lower === "id")
  if (titleIdx < 0) titleIdx = fields.findIndex((f) => typeof f.value === "string")
  const titleField = titleIdx >= 0 ? fields[titleIdx] : undefined

  let rest = fields.filter((_, i) => i !== titleIdx)
  if (usedName) rest = rest.filter((f) => f.lower !== "id")

  const typeField = pickFamily(rest, TYPE_FAMILY)
  const valueField = pickFamily(rest, VALUE_FAMILY)
  const typeFamily = new Set(TYPE_FAMILY)
  const valueFamily = new Set(VALUE_FAMILY)

  const entries: SmartTooltipEntry[] = []
  if (typeField) entries.push({ key: typeField.key, value: typeField.value })
  if (valueField) entries.push({ key: valueField.key, value: valueField.value })
  for (const f of rest) {
    if (entries.length >= maxEntries) break
    if (f === typeField || f === valueField) continue
    // Skip the other synonyms of an already-shown family.
    if (typeFamily.has(f.lower) || valueFamily.has(f.lower)) continue
    entries.push({ key: f.key, value: f.value })
  }

  return { titleKey: titleField?.key, title: titleField?.value, entries }
}
