/**
 * `Datum` — the canonical "user-supplied chart data row" type.
 *
 * A charting library cannot know the shape of the user's data ahead of time.
 * This alias names that intent: "an object whose field types we do not know
 * until the user plugs in a concrete generic." Every HOC threads a
 * `<TDatum extends Datum = Datum>` generic so accessors can autocomplete
 * user field names when a concrete type is supplied, while still accepting
 * arbitrary data otherwise.
 *
 * Why `any` (and not `unknown`) on the value side: the library and user code
 * both do unguarded field access (`d.x`, `d[accessor]`, `...d` spreads). With
 * `unknown`, each access would require a narrowing step that adds no runtime
 * safety (the data is still dynamically shaped at runtime) but imposes
 * ergonomic cost on every user accessor function and every internal pass
 * that augments rows. The `any` in this specific alias is the single,
 * documented, library-wide allowance; it's the "clear and established
 * reason" referenced by the lint policy for `@typescript-eslint/no-explicit-any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see file header
export type Datum = Record<string, any>

/** Values that can be returned by a chart accessor or stored in a datum field. */
export type DatumValue =
  | string
  | number
  | boolean
  | Date
  | Datum
  | Datum[]
  | null
  | undefined
