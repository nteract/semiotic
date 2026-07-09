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
 * True when the tooltip content's root element looks like the
 * consumer is handling chrome themselves. Signals (any one is enough):
 *
 *   1. Component-type `ownsChrome: true` (for components that paint
 *      chrome internally — avoids double-wrap).
 *   2. An inline `background` / `backgroundColor` on `style`.
 *   3. `data-semiotic-tooltip-chrome` for CSS-class-only chrome
 *      where the background is defined outside the React element.
 *
 * **`.semiotic-tooltip` class alone is NOT ownership.** Charts and
 * examples repeatedly return `<div className="semiotic-tooltip">…</div>`
 * without a background (expecting a global CSS rule or theme var that
 * is missing or transparent). Treating the class as ownership was the
 * transparent-tooltip regression. Shared helpers that truly own chrome
 * pass `defaultTooltipStyle` (inline background) or `ownsChrome`.
 *
 * When none of these fire, `FlippingTooltip` paints `defaultTooltipStyle`
 * on its wrapper so the tooltip can never come out chrome-less.
 */
export function hasOwnChrome(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false
  // Component-level opt-in. The auto-chrome path only inspects props
  // on the *immediate* React element, which works for intrinsic
  // HTML (`<div className="…">`) but misses components whose render
  // output paints chrome internally. Result: <DefaultNetworkTooltip />
  // (and any other "I own my chrome" component) silently got the
  // wrapper's chrome layered on top, producing the double-padded
  // double-background "box around the tooltip" regression. A static
  // `ownsChrome` flag on the component type lets those declare
  // ownership without exposing the className on their wrapping
  // React element.
  const type = node.type as { ownsChrome?: boolean } | string
  if (typeof type !== "string" && type && type.ownsChrome === true) return true
  const props = node.props as {
    className?: unknown
    style?: React.CSSProperties
  } & Record<string, unknown>
  if (props["data-semiotic-tooltip-chrome"] === true) return true
  if (props["data-semiotic-tooltip-chrome"] === "true") return true
  const style = props.style
  if (style && typeof style === "object") {
    if (style.background != null && style.background !== "" && style.background !== "transparent") {
      return true
    }
    if (
      style.backgroundColor != null &&
      style.backgroundColor !== "" &&
      style.backgroundColor !== "transparent"
    ) {
      return true
    }
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
  // explicit chrome, the user/helper handled it — don't double up.
  // Otherwise apply `defaultTooltipStyle` to the wrapper itself so the
  // tooltip is never transparent. `width: max-content` overrides the
  // chrome's `maxWidth` constraint to keep the existing flip math
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
