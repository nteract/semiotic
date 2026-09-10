import type { Datum } from "../charts/shared/datumTypes"

const SELECTION_PROVENANCE = "__semioticSelectionData"

type DatumWithSelectionProvenance = Datum & {
  [SELECTION_PROVENANCE]?: readonly Datum[]
}

/**
 * Attach the raw rows represented by a derived mark without exposing that
 * internal bookkeeping to tooltips, accessible tables, or serialization.
 */
export function attachSelectionProvenance<TTarget extends object>(
  datum: TTarget,
  rows: readonly Datum[] | undefined
): TTarget {
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
  datum: unknown
): readonly Datum[] | undefined {
  return (datum as DatumWithSelectionProvenance | null | undefined)?.[
    SELECTION_PROVENANCE
  ]
}

/** Parent series metadata is a fallback; authored coordinate fields take precedence. */
export function selectionDatumWithParent(datum: Datum): Datum {
  return datum.parentLine
    ? attachSelectionProvenance({ ...datum.parentLine, ...datum }, getSelectionProvenance(datum))
    : datum
}

/** Keep the representative styling row while matching any row in a series. */
export function seriesSelectionDatum(rows: readonly Datum[]): Datum {
  return attachSelectionProvenance({ ...rows[0] }, rows.map(selectionDatumWithParent))
}

/** Selection-aware style callbacks request source rows on aggregate marks. */
export function requestsSelectionProvenance(style: unknown): boolean {
  return !!style && getSelectionProvenance(style)?.[0] === style
}
