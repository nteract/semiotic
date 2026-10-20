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

export type TooltipChromeMode = "default" | "css" | "none"

// Neutral entries import tooltip utilities under react-server too, where
// createContext/useContext are absent. Resolve the context only while rendering.
// Client and neutral entries can contain separate copies of these utilities.
// Share the context at first render so /utils roots inherit /themes/react policy.
const tooltipChromeContextKey = /* @__PURE__ */ Symbol.for("semiotic.tooltipChromeContext")
function getTooltipChromeContext() {
  const registry = globalThis as typeof globalThis & {
    [key: symbol]: React.Context<TooltipChromeMode | undefined> | undefined
  }
  return registry[tooltipChromeContextKey] ??= React.createContext<TooltipChromeMode | undefined>(undefined)
}

export function useTooltipChrome(): TooltipChromeMode | undefined {
  return React.useContext(getTooltipChromeContext())
}

/** Apply a chart policy to a built-in renderer that already supplies its root. */
export const TooltipChromeScope = /* @__PURE__ */ markTooltipChrome(function TooltipChromeScope({ chrome, children }: {
  chrome?: TooltipChromeMode
  children: React.ReactNode
}) {
  const Context = getTooltipChromeContext()
  return <Context.Provider value={chrome}>{children}</Context.Provider>
})

export interface TooltipRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `"default"` applies Semiotic's theme-aware chrome. Use `"none"` or `"css"` when the
   * supplied class owns background, text color, border, padding, and shadow.
   * In both modes the root is marked so FlippingTooltip never adds a second
   * box around it. When this prop is omitted, the chrome comes from the theme
   * policy (else `"default"`) and yields to content whose rendered root
   * element carries `data-semiotic-tooltip-chrome`.
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
// FlippingTooltip inspects the immediate React element before function
// components render. The static flag lets <TooltipRoot /> declare ownership at
// that point, just like the built-in frame tooltip components do.
export const TooltipRoot = /* @__PURE__ */ markTooltipChrome(function TooltipRoot({
  chrome,
  className = "",
  style,
  children,
  ...rest
}: TooltipRootProps) {
  const inheritedChrome = useTooltipChrome()
  const paintsDefault = (chrome ?? inheritedChrome ?? "default") === "default"
  const ref = React.useRef<HTMLDivElement>(null)
  // React 19 passes a consumer's `ref` as a prop; keep forwarding it.
  React.useImperativeHandle(
    (rest as { ref?: React.Ref<HTMLDivElement> }).ref,
    () => ref.current as HTMLDivElement
  )
  // An explicit `chrome` prop is kept as given. Inherited or default chrome
  // gives way to content that declares its own.
  const contentOwnsChrome = useRenderedRootOwnsChrome(
    ref,
    chrome === undefined && paintsDefault
  )

  return (
    <div
      {...rest}
      ref={ref}
      data-semiotic-tooltip-chrome
      className={contentOwnsChrome ? className : `semiotic-tooltip ${className}`.trim()}
      style={
        paintsDefault && !contentOwnsChrome ? { ...defaultTooltipStyle, ...style } : style
      }
    >
      {children}
    </div>
  )
})

/**
 * Whether a tooltip slot needs no fallback chrome from what it rendered:
 * either a single root element carrying `data-semiotic-tooltip-chrome`, or
 * nothing at all (a component that rendered `null` leaves no box to draw).
 * Only the slot's direct children are read, so the marker counts however
 * many components sit above that element. Whitespace text and comments are
 * ignored; any other text or a second element keeps the fallback chrome.
 */
export function renderedRootOwnsChrome(slot: Element): boolean {
  let root: Element | undefined
  for (const node of slot.childNodes) {
    // nodeType 1 is an element and 3 is text.
    if (node.nodeType === 1) {
      if (root) return false
      root = node as Element
    } else if (node.nodeType === 3 && node.textContent?.trim()) return false
  }
  const marker = root?.getAttribute("data-semiotic-tooltip-chrome")
  return !root || (marker != null && marker !== "false")
}

/**
 * `renderedRootOwnsChrome` for the element behind `ref`. It is read after
 * every commit and before paint, so a slot that paints fallback chrome drops
 * it in the same frame its content renders a marked root, and again whenever
 * the content's DOM changes without the slot re-rendering (a nested
 * component's own state update). Always `false` while `enabled` is false;
 * the caller keeps `ref` attached to a mounted element whenever `enabled` is
 * true.
 */
export function useRenderedRootOwnsChrome(
  ref: React.RefObject<Element | null>,
  enabled: boolean
): boolean {
  const [owns, setOwns] = React.useState(false)
  // Resolved here rather than at module scope: neutral entries load this
  // module under react-server, where neither hook exists.
  const useCommitEffect =
    typeof window === "undefined" ? React.useEffect : React.useLayoutEffect
  useCommitEffect(() => {
    const next = enabled && ref.current !== null && renderedRootOwnsChrome(ref.current)
    if (next !== owns) setOwns(next)
  })
  React.useEffect(() => {
    const slot = ref.current
    if (!enabled || !slot) return
    const observer = new MutationObserver(() => setOwns(renderedRootOwnsChrome(slot)))
    observer.observe(slot, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ["data-semiotic-tooltip-chrome"]
    })
    return () => observer.disconnect()
  }, [enabled, ref])
  return enabled && owns
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
 *
 * This reads React elements before they render. Content whose chrome lives
 * inside a component declares it on the rendered root element instead
 * (`data-semiotic-tooltip-chrome`), which the tooltip slot reads after
 * rendering (`renderedRootOwnsChrome`).
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
