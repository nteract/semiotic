/**
 * Shared title clearance for StreamFrame plot areas.
 *
 * Stream titles live in the outer SVG chrome while marks are translated into
 * the plot margin. Reserving this strip before layout keeps titles from
 * touching or overlapping the first row of marks when consumers supply a
 * compact top margin.
 */

export interface TitleMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/** Enough room for the standard 14px title plus a visible gap to the plot. */
export const MIN_TITLE_TOP_MARGIN = 36

/** One horizontal legend row plus its inset when no title is present. */
export const MIN_TOP_LEGEND_MARGIN = 34

/** The standard title strip plus one horizontal legend row and plot gap. */
export const MIN_TITLE_TOP_LEGEND_MARGIN = 58

/** Baseline that leaves a calm outer-edge inset for the standard title face. */
export const TITLE_BASELINE = 22

/** Static SVG and GIF output only render text titles in their SVG chrome. */
export function hasTextTitle(title: unknown): title is string {
  return typeof title === "string" && title.length > 0
}

/**
 * Reserve the shared top chrome before any frame calculates plot geometry.
 * A raw StreamFrame can supply both a compact margin and a top legend, so the
 * legend's first row needs its own minimum rather than relying on HOC margins.
 */
export function reserveFrameChromeMargin<T extends TitleMargin>(
  margin: T,
  hasTitle: boolean,
  hasTopLegend = false,
): T {
  const minimumTop = hasTopLegend
    ? hasTitle ? MIN_TITLE_TOP_LEGEND_MARGIN : MIN_TOP_LEGEND_MARGIN
    : hasTitle ? MIN_TITLE_TOP_MARGIN : 0
  if (margin.top >= minimumTop) return margin
  return { ...margin, top: minimumTop } as T
}

export function reserveTitleMargin<T extends TitleMargin>(
  margin: T,
  title: unknown,
): T {
  return reserveFrameChromeMargin(margin, hasTextTitle(title))
}
