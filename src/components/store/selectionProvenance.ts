import type { Datum } from "../charts/shared/datumTypes"

const SELECTION_PROVENANCE = "__semioticSelectionData"

type DatumWithSelectionProvenance = Datum & {
  [SELECTION_PROVENANCE]?: readonly Datum[]
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
