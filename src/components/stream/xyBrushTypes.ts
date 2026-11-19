/** A brush selection in data units: each axis's range, ascending. */
export interface XYBrushExtent {
  x: [number, number]
  y: [number, number]
}

/**
 * A controlled brush selection in data units, in the shape `onBrush` reports.
 * An axis the brush doesn't move may be left out (an x brush reads only `x`);
 * leaving out an axis the brush moves clears it.
 */
export interface XYBrushExtentInput {
  x?: readonly [number, number]
  y?: readonly [number, number]
}

/** How a brush change ended. The brushed axis is y for a y brush, else x. */
export interface XYBrushEndMeta {
  /** A pointer release (a drag, or a click that clears) or a keyboard step or reset. */
  source: "pointer" | "keyboard"
  /** The selection reaches the start of the brushed axis, or was cleared. */
  atDomainStart: boolean
  /** The selection reaches the end of the brushed axis, or was cleared. */
  atDomainEnd: boolean
}
