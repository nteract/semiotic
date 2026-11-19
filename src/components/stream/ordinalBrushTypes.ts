/** An ordinal brush selection: the value (r) range in data units, ascending. */
export interface OrdinalBrushExtent {
  r: [number, number]
}

/** A controlled ordinal brush selection, in the shape `onBrush` reports. */
export interface OrdinalBrushExtentInput {
  r: readonly [number, number]
}

/** How an ordinal brush change ended, on the value (r) axis. */
export interface OrdinalBrushEndMeta {
  /** A pointer release (a drag, or a click that clears) or a keyboard step or reset. */
  source: "pointer" | "keyboard"
  /** The selection reaches the minimum of the value axis, or was cleared. */
  atDomainStart: boolean
  /** The selection reaches the maximum of the value axis, or was cleared. */
  atDomainEnd: boolean
}
