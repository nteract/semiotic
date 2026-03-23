"use client"

/**
 * Selection integration utilities for HOC charts.
 *
 * Provides helpers to normalize linkedHover/linkedBrush props and
 * wrap style functions with selection-aware opacity.
 */

// ── Normalized config types ────────────────────────────────────────────────

export interface NormalizedLinkedHover {
  name: string
  fields: string[]
}

export interface NormalizedLinkedBrush {
  name: string
  xField?: string
  yField?: string
}

// ── Prop normalizers ───────────────────────────────────────────────────────

/**
 * Normalize the linkedHover prop into a consistent config object.
 *
 * - `true` → { name: "hover", fields: [] }
 * - `"mySelection"` → { name: "mySelection", fields: [] }
 * - `{ name: "hl", fields: ["category"] }` → as-is
 */
export function normalizeLinkedHover(
  prop: boolean | string | { name?: string; fields: string[] } | undefined,
  fallbackFields?: string[]
): NormalizedLinkedHover | null {
  if (!prop) return null
  if (prop === true) {
    return { name: "hover", fields: fallbackFields || [] }
  }
  if (typeof prop === "string") {
    return { name: prop, fields: fallbackFields || [] }
  }
  return { name: prop.name || "hover", fields: prop.fields }
}

/**
 * Normalize the linkedBrush prop into a consistent config object.
 *
 * - `"timeRange"` → { name: "timeRange" }
 * - `{ name: "dash", xField: "age", yField: "income" }` → as-is
 */
export function normalizeLinkedBrush(
  prop: string | { name: string; xField?: string; yField?: string } | undefined
): NormalizedLinkedBrush | null {
  if (!prop) return null
  if (typeof prop === "string") {
    return { name: prop }
  }
  return prop
}

// ── Style wrapper ──────────────────────────────────────────────────────────

export interface SelectionHookResult {
  isActive: boolean
  predicate: (datum: Record<string, any>) => boolean
}

export interface SelectionStyleConfig {
  unselectedOpacity?: number
  unselectedStyle?: Record<string, any>
  selectedStyle?: Record<string, any>
}

/** Default opacity for unselected (dimmed) elements */
export const DEFAULT_SELECTION_OPACITY = 0.2

/**
 * Read the --semiotic-selection-opacity CSS variable from a container element.
 * Returns the numeric value or the default if not set or not parseable.
 */
export function readSelectionOpacityFromCSS(container: Element | null): number {
  if (!container) return DEFAULT_SELECTION_OPACITY
  const raw = getComputedStyle(container).getPropertyValue("--semiotic-selection-opacity").trim()
  if (!raw) return DEFAULT_SELECTION_OPACITY
  const val = parseFloat(raw)
  if (!Number.isFinite(val)) return DEFAULT_SELECTION_OPACITY
  return Math.min(1, Math.max(0, val))
}

/**
 * Wrap a base style function with selection awareness.
 * When a selection is active, non-matching datums get dimmed.
 *
 * Dimming opacity is resolved in this order:
 * 1. `config.unselectedOpacity` (explicit prop)
 * 2. `DEFAULT_SELECTION_OPACITY` (0.2)
 */
export function wrapStyleWithSelection(
  baseStyleFn: (d: Record<string, any>) => Record<string, any>,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): (d: Record<string, any>) => Record<string, any> {
  if (!selectionHook) return baseStyleFn

  return (d: Record<string, any>) => {
    const style = { ...baseStyleFn(d) }

    if (selectionHook.isActive) {
      if (selectionHook.predicate(d)) {
        // Selected: apply selectedStyle overrides if any
        if (config?.selectedStyle) {
          Object.assign(style, config.selectedStyle)
        }
      } else {
        // Unselected: dim the element
        const dimOpacity = config?.unselectedOpacity ?? DEFAULT_SELECTION_OPACITY
        style.opacity = dimOpacity
        style.fillOpacity = dimOpacity
        style.strokeOpacity = dimOpacity
        if (config?.unselectedStyle) {
          Object.assign(style, config.unselectedStyle)
        }
      }
    }

    return style
  }
}
