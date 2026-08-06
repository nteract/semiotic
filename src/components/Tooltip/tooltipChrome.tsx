import * as React from "react"

/**
 * Canonical tooltip chrome. Every value is expressed through a Semiotic CSS
 * variable first so a ThemeProvider (or a consumer-owned variable scope) can
 * switch the tooltip without rebuilding chart-specific content.
 */
export const defaultTooltipStyle: React.CSSProperties = {
  background: "var(--semiotic-tooltip-bg, rgba(0, 0, 0, 0.85))",
  color: "var(--semiotic-tooltip-text, white)",
  padding: "8px 12px",
  borderRadius: "var(--semiotic-tooltip-radius, 6px)",
  fontSize: "var(--semiotic-tooltip-font-size, 14px)",
  fontFamily: "var(--semiotic-font-family, inherit)",
  lineHeight: "1.5",
  boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0, 0, 0, 0.15))",
  pointerEvents: "none",
  maxWidth: "300px",
  wordWrap: "break-word"
}

export type TooltipChromeMode = "default" | "css"

export interface TooltipRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `"default"` applies Semiotic's theme-aware chrome. Use `"css"` when the
   * supplied class owns background, text color, border, padding, and shadow.
   * In both modes the root is marked so FlippingTooltip never adds a second
   * box around it.
   * @default "default"
   */
  chrome?: TooltipChromeMode
}

/**
 * Public tooltip root for custom renderers.
 *
 * @example
 * ```tsx
 * tooltip={d => (
 *   <TooltipRoot chrome="css" className="my-tooltip">
 *     {d.label}
 *   </TooltipRoot>
 * )}
 * ```
 */
export function TooltipRoot({
  chrome = "default",
  className = "",
  style,
  children,
  ...rest
}: TooltipRootProps) {
  const resolvedStyle = chrome === "default"
    ? { ...defaultTooltipStyle, ...style }
    : style

  return (
    <div
      {...rest}
      data-semiotic-tooltip-chrome
      className={`semiotic-tooltip ${className}`.trim()}
      style={resolvedStyle}
    >
      {children}
    </div>
  )
}

/**
 * Mark a wrapper component whose rendered root owns tooltip chrome. This is
 * useful when a tooltip callback returns `<MyTooltip />`: FlippingTooltip can
 * inspect the component type before React renders its inner TooltipRoot.
 */
export function markTooltipChrome<T>(component: T): T {
  ;(component as T & { ownsChrome: boolean }).ownsChrome = true
  return component
}

// FlippingTooltip inspects the immediate React element before function
// components render. The static flag lets <TooltipRoot /> declare ownership at
// that point, just like the built-in frame tooltip components do.
markTooltipChrome(TooltipRoot)

function paintsInlineBackground(value: unknown): boolean {
  if (typeof value !== "string") return value != null
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === "transparent") return false
  // Common explicitly transparent CSS colors. Unknown expressions (including
  // CSS variables and color-mix()) are treated as intentional ownership.
  if (/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(normalized)) return false
  if (/^hsla\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(normalized)) return false
  return true
}

/**
 * Whether the immediate tooltip content explicitly owns its visual chrome.
 * A class name alone is deliberately not enough: many callbacks use a class
 * only for internal layout and would otherwise become transparent.
 */
export function hasOwnTooltipChrome(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false

  const type = node.type as { ownsChrome?: boolean } | string
  if (typeof type !== "string" && type && type.ownsChrome === true) return true

  const props = node.props as {
    style?: React.CSSProperties
  } & Record<string, unknown>
  const marker = props["data-semiotic-tooltip-chrome"]
  if (marker !== undefined && marker !== null && marker !== false && marker !== "false") {
    return true
  }

  const style = props.style
  if (style && typeof style === "object") {
    if (paintsInlineBackground(style.background)) return true
    if (paintsInlineBackground(style.backgroundColor)) return true
  }
  return false
}
