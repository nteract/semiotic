import * as React from "react"

/** React-empty callback results suppress the tooltip; numeric zero is content.
 * Inspect fragments/arrays, but never invoke a consumer component to find out
 * what it renders. A conditional renderer should return null directly. */
export function hasTooltipContent(node: React.ReactNode): boolean {
  if (node == null || typeof node === "boolean") return false
  if (typeof node === "string") return node.trim().length > 0
  if (Array.isArray(node)) return node.some(hasTooltipContent)
  if (
    React.isValidElement<{ children?: React.ReactNode }>(node) &&
    node.type === React.Fragment
  )
    return hasTooltipContent(node.props.children)
  return true
}

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
 * Mark a component or tooltip renderer as owning its tooltip chrome. Marking
 * the renderer passed to `tooltip` or `tooltipContent` covers every non-empty
 * result, even when it returns an unmarked wrapper component. Plain renderers
 * should stay unmarked to retain Semiotic's default surface.
 * Returns the same component or renderer without invoking or wrapping it.
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
 * Whether a renderer or the immediate tooltip content owns its visual chrome.
 * A class name alone is deliberately not enough: many callbacks use a class
 * only for internal layout and would otherwise become transparent.
 */
export function hasOwnTooltipChrome(
  node: React.ReactNode | ((...args: never[]) => React.ReactNode)
): boolean {
  if (typeof node === "function") {
    return (node as { ownsChrome?: boolean }).ownsChrome === true
  }
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
