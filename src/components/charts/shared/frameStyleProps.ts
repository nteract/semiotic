/**
 * frameStyleProps — keep a caller's `frameProps.*Style` interactive.
 *
 * Chart components build their mark style in layers and finish by wrapping it
 * so shared selection, linked hover, and legend highlighting can dim the marks
 * that do not match. `frameProps` spreads last, so a style function passed
 * there takes the place of the chart's own. That swap used to remove the
 * selection wrapper too: a chart given `frameProps.pointStyle` stopped
 * responding to `selection`, `linkedHover`, and legend interaction, with no
 * warning.
 *
 * `selectionAwareFrameStyle` wraps the caller's function with the same
 * selection wrapper the chart applies to its own style, so the interaction
 * layer survives the override. While no selection is active the wrapped
 * function returns the caller's fields unchanged, so a chart at rest renders
 * exactly as it did before. Chart components call it through
 * `useSelectionAwareFrameStyle`, which memoizes the result.
 *
 * Only function-form styles are wrapped. Object-form styles and `undefined`
 * pass through untouched, because the frames resolve those through different
 * defaults and converting one into the other would change the drawn marks.
 *
 * Ordinal charts layer `frameProps.pieceStyle` over their base style through
 * `useOrdinalPieceStyle`, which already ends in the selection wrap; they do
 * not need this helper for that key.
 *
 * This module is free of React so the static renderer can share
 * `overlayFrameStyle` with the chart components.
 */
import type { Datum } from "./datumTypes"
import {
  wrapStyleWithSelection,
  type SelectionHookResult,
  type SelectionStyleConfig,
} from "./selectionUtils"
import {
  attachSelectionProvenance,
  requestsSelectionProvenance,
} from "../../store/selectionProvenance"

type FrameStyleFn = (datum: Datum, ...args: unknown[]) => Datum

/**
 * Selection wrapper with the signature the family helpers share
 * (`wrapStyleWithSelection`, `wrapNetworkNodeStyleWithSelection`,
 * `wrapNetworkEdgeStyleWithSelection`).
 */
export type FrameStyleSelectionWrapper = (
  style: FrameStyleFn,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
  selectionDatum?: (datum: Datum) => Datum,
) => FrameStyleFn

export interface FrameStyleSelectionOptions {
  /**
   * The wrapper the chart uses for its own style on this key. Defaults to
   * `wrapStyleWithSelection`. Pass a module-level function so the memoized
   * result keeps a stable identity.
   */
  wrap?: FrameStyleSelectionWrapper
  /**
   * Adapts the styled datum to the shape the selection predicate reads, when
   * the chart's own style uses one. Pass a stable function.
   */
  selectionDatum?: (datum: Datum) => Datum
}

const NO_STYLE: Datum = Object.freeze({})

/**
 * Return `frameStyle` with the chart's selection wrapper applied.
 *
 * Returns the input unchanged when it is not a function or when the chart has
 * no selection hook. A style function that returns `null` or `undefined` for a
 * datum keeps returning that value, so the frame's own fallback still applies.
 */
export function selectionAwareFrameStyle<TStyle>(
  frameStyle: TStyle,
  selectionHook: SelectionHookResult | null | undefined,
  config?: SelectionStyleConfig,
  options: FrameStyleSelectionOptions = {},
): TStyle {
  if (typeof frameStyle !== "function" || !selectionHook) return frameStyle

  const userStyle = frameStyle as unknown as (
    datum: Datum,
    ...args: unknown[]
  ) => Datum | null | undefined
  const wrap = options.wrap ?? (wrapStyleWithSelection as FrameStyleSelectionWrapper)

  // The family wrappers spread their base style into a new object, which would
  // turn a deliberate `undefined` return into `{}`. Remember the raw value so
  // the frame still sees it.
  let raw: Datum | null | undefined
  const tracked: FrameStyleFn = (datum, ...args) => {
    raw = userStyle(datum, ...args)
    return raw ?? NO_STYLE
  }
  const wrapped = wrap(tracked, selectionHook, config, options.selectionDatum)
  const aware: FrameStyleFn = (datum, ...args) => {
    const style = wrapped(datum, ...args)
    return raw == null ? (raw as unknown as Datum) : style
  }
  // Selection-aware styles ask aggregate marks for their source rows; carry
  // that request over from the wrapper to the function the frame receives.
  if (requestsSelectionProvenance(wrapped)) {
    attachSelectionProvenance(aware, [aware as unknown as Datum])
  }
  return aware as unknown as TStyle
}

/**
 * Layer a caller's style over a chart-owned style function, field by field.
 * Used where a chart composes a secondary style itself and a raw `frameProps`
 * spread would otherwise replace or drop it.
 *
 * Returns `base` unchanged when `overlay` is undefined.
 */
export function overlayFrameStyle<TArgs extends unknown[]>(
  base: (...args: TArgs) => Datum,
  overlay: Datum | ((...args: TArgs) => Datum | null | undefined) | null | undefined,
): (...args: TArgs) => Datum {
  if (overlay == null) return base
  if (typeof overlay === "function") {
    return (...args: TArgs) => ({ ...base(...args), ...(overlay(...args) ?? {}) })
  }
  return (...args: TArgs) => ({ ...base(...args), ...overlay })
}
