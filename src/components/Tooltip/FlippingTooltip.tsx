import * as React from "react"
import { flushSync } from "react-dom"
import { useTooltipChrome } from "./tooltipChrome"
import {
  defaultTooltipStyle,
  hasOwnTooltipChrome,
  hasTooltipContent,
  useRenderedRootOwnsChrome
} from "./tooltipChrome"

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
  /** The callback owns chrome independently of its returned element tree. */
  contentOwnsChrome?: boolean
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
 * These read the React element before it renders. After rendering,
 * `FlippingTooltip` also reads the DOM: a single rendered root element
 * carrying `data-semiotic-tooltip-chrome` owns chrome however many
 * components produced it.
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
export const hasOwnChrome = hasOwnTooltipChrome

/**
 * Viewport-aware tooltip wrapper that flips horizontally and vertically,
 * then clamps to the chart area when neither side has enough room.
 *
 * On first render, uses a heuristic (similar to the old 70%/30% thresholds).
 * After measuring the actual tooltip size via ref, repositions precisely to
 * prevent clipping against container edges.
 *
 * Placement is exposed on the wrapper as `data-placement` (`"pending"`
 * before measurement, then `"placed"`) and `data-flip-x` / `data-flip-y`.
 * A consumer CSS `transition` on `left`/`top` eases same-side moves only:
 * the first placement and any flip set an inline `transition: none`, so the
 * tooltip never glides in from the pointer or swings across it.
 *
 * Defensive behaviors:
 *
 *   - **Empty content guard.** Null, false and other React-empty callback
 *     results suppress the wrapper as well as its content.
 *   - **Chrome guarantee.** If the rendered tooltip content does not declare
 *     chrome ownership, the wrapper applies `defaultTooltipStyle` so the
 *     tooltip always has a visible background, padding, and shadow.
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
  contentOwnsChrome = false,
  className = "stream-frame-tooltip",
  zIndex = 1
}: FlippingTooltipProps) {
  const themeChrome = useTooltipChrome()
  // Position guard. The early-return form (before hooks) tripped React's
  // "static flag" hook-order check when y oscillated between NaN and a
  // finite number (the hover handler can emit either as a frame transitions
  // through a degenerate hit-test). Treat the guard as a render-time
  // decision instead so the hooks always run in the same order, and emit
  // null at the very end when the position is unusable.
  const positionFinite = Number.isFinite(x) && Number.isFinite(y)
  const hasContent = hasTooltipContent(children)

  const ref = React.useRef<HTMLDivElement>(null)
  const declaresChrome =
    themeChrome === "none" || contentOwnsChrome || hasOwnTooltipChrome(children)
  const rendersOwnChrome = useRenderedRootOwnsChrome(
    ref,
    !declaresChrome && positionFinite && hasContent
  )
  const ownsChrome = declaresChrome || rendersOwnChrome
  const [measured, setMeasured] = React.useState<{
    width: number
    height: number
    ownsChrome: boolean
  } | null>(null)

  // Measure once on mount/container changes, then let ResizeObserver report
  // actual content-box changes. Depending directly on `children` made a fresh
  // tooltip React element re-run this layout effect after every parent hover
  // render. In browsers, fractional layout jitter could then alternate the
  // measured width by a tiny amount and synchronously set state forever.
  // Dropping fallback chrome changes the box, so each size records the chrome
  // it was taken with and a chrome change re-measures before the first paint.
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      // Placement uses untransformed chart pixels. This wrapper is border-box,
      // so its computed dimensions preserve fractional sizes without inheriting
      // an ancestor's CSS scale from the viewport bounding rectangle.
      const style = getComputedStyle(el)
      let width = parseFloat(style.width)
      let height = parseFloat(style.height)
      // Avoid a second layout read when computed dimensions already suffice.
      if (!width || !height) {
        const rect = el.getBoundingClientRect()
        width = width || rect.width
        height = height || rect.height
      }
      if (!Number.isFinite(width) || !Number.isFinite(height)) return
      setMeasured((prev) => {
        // Sub-pixel text/layout jitter does not affect flip placement. Treat
        // differences below half a CSS pixel as the same size so an observer
        // cannot create a measurement → render → measurement feedback loop.
        if (
          prev &&
          prev.ownsChrome === ownsChrome &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev
        }
        return { width, height, ownsChrome }
      })
    }

    measure()
    if (typeof ResizeObserver === "undefined") return
    // Observer callbacks run after browser layout and before paint. Commit the
    // re-placement synchronously so a content-size change never paints one
    // frame at the previous box; a plain state update would land after paint.
    const observer = new ResizeObserver(() => flushSync(measure))
    observer.observe(el)
    return () => observer.disconnect()
  }, [className, containerWidth, containerHeight, positionFinite, hasContent, ownsChrome])

  // The placement of the last committed render. Read during render and
  // written after commit, so a StrictMode double render compares against the
  // same value.
  const committedPlacement = React.useRef<{ flipX: boolean; flipY: boolean } | null>(null)

  const offset = 12
  // A size taken under the other chrome describes a different box, so the
  // tooltip stays unplaced until the current box is measured.
  const size = measured?.ownsChrome === ownsChrome ? measured : null

  // Compute position
  let left = x
  let top = y
  let transform: string
  let flipX = false
  let flipY = false
  if (size) {
    // Precise flip based on actual tooltip dimensions
    const spaceRight = containerWidth - x
    const spaceBelow = containerHeight - y

    flipX = spaceRight < size.width + offset
    flipY = spaceBelow < size.height + offset

    // Flipping alone can overflow the opposite edge in a narrow chart, or
    // when a camera projects the hovered mark's center outside the viewport.
    left = Math.max(
      0,
      Math.min(
        x + (flipX ? -size.width - offset : offset),
        containerWidth - size.width
      )
    )
    top = Math.max(
      0,
      Math.min(
        y + (flipY ? -size.height - 4 : 4),
        containerHeight - size.height
      )
    )
    transform = "none"
  } else {
    // Heuristic fallback on first render (before measurement)
    const tx =
      x > containerWidth * 0.7 ? `calc(-100% - ${offset}px)` : `${offset}px`
    const ty = y < containerHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
    transform = `translate(${tx}, ${ty})`
  }

  // Chrome auto-apply: if the rendered content's root already carries
  // explicit chrome, the user/helper handled it — don't double up.
  // Otherwise apply `defaultTooltipStyle` to the wrapper itself so the
  // tooltip is never transparent. Prefer intrinsic width, capped to the plot
  // width so block content can wrap before placement is measured. Border-box
  // sizing includes the default chrome's padding in this cap.
  const placement = size ? { flipX, flipY } : null
  const previous = committedPlacement.current
  // A consumer's CSS transition should only ease moves along the same side.
  // The first measured placement and every flip jump instead.
  const instantMove = !placement || !previous ||
    previous.flipX !== placement.flipX || previous.flipY !== placement.flipY
  React.useLayoutEffect(() => {
    committedPlacement.current = placement
  })

  const chromeStyle = ownsChrome ? null : defaultTooltipStyle
  const compositeClassName = ownsChrome
    ? className
    : `${className} semiotic-tooltip`.trim()
  // Late guard return: bail AFTER all hooks have run so the hook call
  // order stays stable across re-renders. An earlier early-return form
  // (before useRef / useState / useLayoutEffect) tripped React's
  // "Expected static flag was missing" check whenever y oscillated
  // between NaN and a finite number.
  if (!positionFinite || !hasContent) return null
  return (
    <div
      ref={ref}
      className={compositeClassName}
      data-placement={placement ? "placed" : "pending"}
      data-flip-x={flipX ? "true" : "false"}
      data-flip-y={flipY ? "true" : "false"}
      style={{
        ...chromeStyle,
        position: "absolute",
        left: margin.left + left,
        top: margin.top + top,
        transform,
        transition: instantMove ? "none" : undefined,
        pointerEvents: "none",
        zIndex,
        width: "max-content",
        maxWidth: ownsChrome
          ? containerWidth
          : `min(${containerWidth}px, ${defaultTooltipStyle.maxWidth})`,
        boxSizing: "border-box"
      }}
    >
      {children}
    </div>
  )
}
