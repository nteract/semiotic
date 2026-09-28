import type { Datum } from "../charts/shared/datumTypes"

const SELECTION_PROVENANCE = "__semioticSelectionData"
const SELECTION_COVERAGE = "__semioticSelectionCoverage"

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

/**
 * Authored rows behind an aggregate mark (a histogram bin or stacked segment),
 * one of its `categories` entries, or a hover wrapping either. Returns
 * `undefined` for a plain data row.
 */
export function getSourceRows<TDatum extends Datum = Datum>(
  value: unknown
): readonly TDatum[] | undefined {
  const hover = value as { __semioticHoverData?: unknown; data?: unknown } | null | undefined
  return getSelectionProvenance(
    hover?.__semioticHoverData === true ? hover.data : value
  ) as readonly TDatum[] | undefined
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

/** Numeric field ranges an aggregate mark covers, for point-selection matching. */
export interface SelectionCoverage {
  /** Half-open `[start, end)` range per field. */
  ranges: Readonly<Record<string, readonly [number, number]>>
  /** Coerces selected values before the range test. Default: finite numbers and valid Dates. */
  toNumber?: (value: unknown) => number
}

/**
 * Let a point selection on a covered field match this mark when any selected
 * value falls inside its range, not only on an exact value. Hidden from
 * enumeration like selection provenance.
 */
export function attachSelectionCoverage<TTarget extends object>(
  datum: TTarget,
  coverage: SelectionCoverage
): TTarget {
  Object.defineProperty(datum, SELECTION_COVERAGE, {
    configurable: true,
    enumerable: false,
    value: coverage
  })
  return datum
}

export function getSelectionCoverage(datum: unknown): SelectionCoverage | undefined {
  return (datum as { [SELECTION_COVERAGE]?: SelectionCoverage } | null | undefined)?.[
    SELECTION_COVERAGE
  ]
}

/**
 * Point-selection values a datum publishes for `fields`: its own value (with
 * parent-line metadata as a fallback), else the distinct values of the source
 * rows behind it. Fields with neither are omitted.
 */
export function selectionFieldValues(
  datum: Datum,
  fields: readonly string[]
): Record<string, unknown[]> {
  const selectionDatum = selectionDatumWithParent(datum)
  const fieldValues: Record<string, unknown[]> = {}
  for (const field of fields) {
    const value = selectionDatum[field]
    if (value !== undefined) {
      fieldValues[field] = [value]
      continue
    }
    const values = getSelectionProvenance(datum)
      ?.map(row => selectionDatumWithParent(row)[field])
      .filter(rowValue => rowValue !== undefined)
    if (values?.length) fieldValues[field] = [...new Set(values)]
  }
  return fieldValues
}
