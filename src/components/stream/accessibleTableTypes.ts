/** A DOM destination outside an atomic `role="img"` wrapper. String targets
 * are resolved as element IDs after mount; callback targets support refs. */
export type AccessibleTablePortalTarget =
  string | Element | (() => Element | null)

/** Options for the screen-reader data summary. The object form keeps the
 * existing table enabled while relocating its interactive UI with a portal. */
export interface AccessibleTableOptions {
  portalTarget: AccessibleTablePortalTarget
}

/** `true` keeps the historical in-chart placement, `false` disables the
 * fallback, and the object form enables it at an explicit portal target. */
export type AccessibleTableProp = boolean | AccessibleTableOptions
