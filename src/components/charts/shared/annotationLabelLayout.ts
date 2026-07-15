// Labels that sit inside the plot need enough inset for their bold face and
// white outline before the first mark, edge, or title chrome.
export const TOP_LABEL_BASELINE = 16

const TOP_THRESHOLD_LABEL_FLIP = 20

/** Keep a horizontal-threshold label inside the plot when its rule is near the top. */
export function thresholdLabelY(y: number, height: number): number {
  return y < TOP_THRESHOLD_LABEL_FLIP
    ? Math.min(height - 4, y + TOP_LABEL_BASELINE)
    : y - 4
}

/** Place a horizontal-band label just inside its visible top edge. */
export function bandLabelY(y0: number, y1: number): number {
  return Math.max(Math.min(y0, y1), 0) + TOP_LABEL_BASELINE
}
