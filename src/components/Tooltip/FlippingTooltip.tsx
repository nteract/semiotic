import * as React from "react"
import { defaultTooltipStyle } from "./Tooltip"

interface FlippingTooltipProps {
  /** X position within the chart area (relative to margin.left) */
  x: number
  /** Y position within the chart area (relative to margin.top) */
  y: number
  /** Chart area width (excluding margins) */
  containerWidth: number
  /** Chart area height (excluding margins) */
  containerHeight: number
  /** Chart margins */
  margin: { left: number; top: number; right: number; bottom: number }
  /** Tooltip content */
  children: React.ReactNode
  /** CSS class name for the wrapper */
  className?: string
  /** z-index (default 1) */
  zIndex?: number
}

/**
 * True when `node` is a React element whose root already carries
 * tooltip chrome — either via the canonical `.semiotic-tooltip`
 * className (the shared helpers' pattern) OR via an inline
 * `background` / `backgroundColor` style declaration. When neither
 * is present, `FlippingTooltip` paints `defaultTooltipStyle` on its
 * own wrapper so the tooltip can never come out chrome-less.
 *
 * Why this exists: chart-specific `tooltipContent` callbacks have
 * recurringly forgotten the `.semiotic-tooltip` class +
 * `defaultTooltipStyle`, producing transparent floating divs (the
 * ProcessSankey and DifferenceChart regressions of 2026-05-12).
 * The shared `Tooltip()` / `MultiLineTooltip()` / `buildDefaultTooltip()`
 * helpers do it right; bespoke per-chart tooltips don't. Auto-applying
 * chrome at the wrapper level converts the "you forgot the wrapper"
 * footgun into a no-op.
 *
 * The inline-background fallback catches bespoke tooltips that paint
 * their OWN visual chrome via `style={{ background: "white", ... }}`
 * — applying `defaultTooltipStyle` on top of those wraps the user's
 * tooltip in a second, contrasting box (the Landing-page gallery
 * regression). The check is intentionally narrow: presence of either
 * declaration is treated as "chrome handled" — no attempt to parse
 * or validate the values, because partial declarations (just a
 * background with no padding, etc.) are still the consumer's call.
 */
function hasOwnChrome(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false
  const props = node.props as { className?: unknown; style?: React.CSSProperties }
  if (typeof props.className === "string" && props.className.split(/\s+/).includes("semiotic-tooltip")) return true
  const style = props.style
  if (style && typeof style === "object") {
    if (style.background != null && style.background !== "") return true
    if (style.backgroundColor != null && style.backgroundColor !== "") return true
  }
  return false
}

/**
 * Viewport-aware tooltip wrapper that flips horizontally and vertically
 * when the tooltip would overflow the chart container.
 *
 * On first render, uses a heuristic (similar to the old 70%/30% thresholds).
 * After measuring the actual tooltip size via ref, repositions precisely to
 * prevent clipping against container edges.
 *
 * Two defensive behaviors:
 *
 *   - **Chrome guarantee.** If the rendered tooltip content lacks the
 *     `semiotic-tooltip` className on its root, the wrapper applies
 *     `defaultTooltipStyle` to itself so the tooltip always has a
 *     visible background, padding, and shadow. Shared tooltip helpers
 *     keep working unchanged (their `semiotic-tooltip` class causes the
 *     wrapper to stay transparent).
 *   - **Non-finite position guard.** Returns `null` when `x` or `y` is
 *     `NaN` / `Infinity`. The frame's hover plumbing can occasionally
 *     produce a non-finite hit-test result during a scale rebuild or
 *     when a custom layout emits a degenerate vertex; without the
 *     guard, React throws `'NaN' is an invalid value for the 'top' css
 *     style property` and the entire frame stops rendering.
 */
export function FlippingTooltip({
  x,
  y,
  containerWidth,
  containerHeight,
  margin,
  children,
  className = "stream-frame-tooltip",
  zIndex = 1
}: FlippingTooltipProps) {
  // Position guard. The early-return form (before hooks) tripped React's
  // "static flag" hook-order check when y oscillated between NaN and a
  // finite number (the hover handler can emit either as a frame transitions
  // through a degenerate hit-test). Treat the guard as a render-time
  // decision instead so the hooks always run in the same order, and emit
  // null at the very end when the position is unusable.
  const positionFinite = Number.isFinite(x) && Number.isFinite(y)

  const ref = React.useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = React.useState<{
    width: number
    height: number
  } | null>(null)

  // Measure the tooltip when content or container changes
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMeasured((prev) => {
      // Only update if size actually changed to avoid infinite loop
      if (prev && prev.width === rect.width && prev.height === rect.height) {
        return prev
      }
      return { width: rect.width, height: rect.height }
    })
  }, [children, className, containerWidth, containerHeight])

  const offset = 12

  // Compute position
  let transform: string
  if (measured) {
    // Precise flip based on actual tooltip dimensions
    const spaceRight = containerWidth - x
    const spaceBelow = containerHeight - y

    const flipX = spaceRight < measured.width + offset
    const flipY = spaceBelow < measured.height + offset

    const tx = flipX ? `calc(-100% - ${offset}px)` : `${offset}px`
    const ty = flipY ? `calc(-100% - 4px)` : "4px"
    transform = `translate(${tx}, ${ty})`
  } else {
    // Heuristic fallback on first render (before measurement)
    const tx = x > containerWidth * 0.7 ? `calc(-100% - ${offset}px)` : `${offset}px`
    const ty = y < containerHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
    transform = `translate(${tx}, ${ty})`
  }

  // Chrome auto-apply: if the rendered content's root already carries
  // `.semiotic-tooltip`, the user/helper handled chrome — don't double
  // up. Otherwise apply `defaultTooltipStyle` to the wrapper itself so
  // the tooltip is never transparent. `width: max-content` overrides
  // the chrome's `maxWidth` constraint to keep the existing flip math
  // working; the chrome's `wordWrap: break-word` still handles long
  // tokens. `pointerEvents` is set on the wrapper regardless.
  const ownsChrome = hasOwnChrome(children)
  const chromeStyle = ownsChrome ? null : defaultTooltipStyle
  const compositeClassName = ownsChrome ? className : `${className} semiotic-tooltip`.trim()
  // Late guard return: bail AFTER all hooks have run so the hook call
  // order stays stable across re-renders. An earlier early-return form
  // (before useRef / useState / useLayoutEffect) tripped React's
  // "Expected static flag was missing" check whenever y oscillated
  // between NaN and a finite number.
  if (!positionFinite) return null
  return (
    <div
      ref={ref}
      className={compositeClassName}
      style={{
        ...(chromeStyle || {}),
        position: "absolute",
        left: margin.left + x,
        top: margin.top + y,
        transform,
        pointerEvents: "none",
        zIndex,
        width: "max-content",
      }}
    >
      {children}
    </div>
  )
}
