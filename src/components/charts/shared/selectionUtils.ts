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

/**
 * Wrap a base style function with selection awareness.
 * When a selection is active, non-matching datums get dimmed.
 */
export function wrapStyleWithSelection(
  baseStyleFn: (d: Record<string, any>) => Record<string, any>,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig
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
        const dimOpacity = config?.unselectedOpacity ?? 0.2
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
