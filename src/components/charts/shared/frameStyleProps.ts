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

/** Wrap function styles for selection while preserving nullish per-datum fallbacks. */
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

/** Caller fields override the chart style for the same datum. */
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
