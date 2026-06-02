"use client"
import type { Datum } from "./datumTypes"

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
  mode?: "field" | "x-position" | "series"
  xField?: string
  /** Explicit series-identity field for `mode: "series"`; overrides the auto-resolved one. */
  seriesField?: string
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
  prop: boolean | string | { name?: string; fields?: string[]; mode?: "field" | "x-position" | "series"; xField?: string; seriesField?: string } | undefined,
  fallbackFields?: string[]
): NormalizedLinkedHover | null {
  if (!prop) return null
  if (prop === true) {
    return { name: "hover", fields: fallbackFields || [] }
  }
  if (typeof prop === "string") {
    return { name: prop, fields: fallbackFields || [] }
  }
  return {
    name: prop.name || "hover",
    fields: prop.fields || fallbackFields || [],
    mode: prop.mode,
    xField: prop.xField,
    seriesField: prop.seriesField,
  }
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
  predicate: (datum: Datum) => boolean
}

export interface SelectionStyleConfig {
  unselectedOpacity?: number
  unselectedStyle?: Datum
  selectedStyle?: Datum
}

/**
 * Library fallback opacity for unselected (dimmed) elements.
 *
 * This is the last-resort value when nothing else supplies one. Clients
 * control the effective default declaratively through `ThemeProvider`'s
 * `colors.selectionOpacity` (built-in presets set this). Per-chart
 * `selection.unselectedOpacity` still overrides the theme value.
 */
export const DEFAULT_SELECTION_OPACITY = 0.5

/**
 * Wrap a base style function with selection awareness.
 * When a selection is active, non-matching datums get dimmed.
 *
 * Dimming opacity is resolved in this order:
 * 1. `config.unselectedOpacity` (explicit, usually per-chart or theme-merged)
 * 2. `DEFAULT_SELECTION_OPACITY`
 *
 * Variadic in the trailing args so callers can pass `(datum, group)` —
 * the `group` argument that `PipelineStore.resolveLineStyle` threads
 * through for line/area styles must reach the wrapped base function,
 * or group-dependent styling (`fillArea: string[]`, `resolveStroke(d,
 * group)` in `useXYLineStyle`'s MultiAxisLineChart path) silently
 * drops to its no-group branch whenever a selection is active.
 */
export function wrapStyleWithSelection<TArgs extends unknown[]>(
  baseStyleFn: (d: Datum, ...args: TArgs) => Datum,
  selectionHook: SelectionHookResult | null,
  config?: SelectionStyleConfig,
): (d: Datum, ...args: TArgs) => Datum {
  if (!selectionHook) return baseStyleFn

  return (d: Datum, ...args: TArgs) => {
    const style = { ...baseStyleFn(d, ...args) }

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
