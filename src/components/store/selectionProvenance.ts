import type { Datum } from "../charts/shared/datumTypes"

const SELECTION_PROVENANCE = "__semioticSelectionData"
const SELECTION_PROVENANCE_REQUIRED = Symbol.for(
  "semiotic.selectionProvenanceRequired"
)

type DatumWithSelectionProvenance = Datum & {
  [SELECTION_PROVENANCE]?: readonly Datum[]
}

type SelectionProvenanceStyle = {
  [SELECTION_PROVENANCE_REQUIRED]?: true
}

/**
 * Mark a selection-aware aggregate style without changing its call contract.
 * Scene builders use this non-enumerable tag to retain raw rows only when a
 * selection predicate may need to inspect them; ordinary styling stays on the
 * allocation-free aggregation path.
 */
export function markSelectionProvenanceRequired<TStyle extends object>(
  style: TStyle
): TStyle {
  Object.defineProperty(style, SELECTION_PROVENANCE_REQUIRED, {
    configurable: true,
    value: true
  })
  return style
}

/** Whether an aggregate style was produced by the selection wrapper. */
export function requiresSelectionProvenance(style: unknown): boolean {
  return (
    typeof style === "function" &&
    (style as unknown as SelectionProvenanceStyle)[
      SELECTION_PROVENANCE_REQUIRED
    ] === true
  )
}

/**
 * Attach the raw rows represented by a derived mark without exposing that
 * internal bookkeeping to tooltips, accessible tables, or serialization.
 */
export function attachSelectionProvenance<TDatum extends Datum>(
  datum: TDatum,
  rows: readonly Datum[] | undefined
): TDatum {
  if (!rows?.length) return datum
  Object.defineProperty(datum, SELECTION_PROVENANCE, {
    configurable: true,
    enumerable: false,
    value: rows
  })
  return datum
}

/** Return the raw rows represented by an aggregate mark, when available. */
export function getSelectionProvenance(
  datum: Datum
): readonly Datum[] | undefined {
  return (datum as DatumWithSelectionProvenance)[SELECTION_PROVENANCE]
}
