"use client"
import * as React from "react"
import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react"
import { SelectionProvider, useSelectionSelector } from "./store/SelectionStore"
import type { ResolutionMode, Selection, SelectionStoreState } from "./store/SelectionStore"
import { ObservationProvider } from "./store/ObservationStore"
import { useSelection } from "./store/useSelection"
import { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
import { DEFAULT_COLORS } from "./charts/shared/colorUtils"
import Legend from "./Legend"
import type { LegendGroup } from "./types/legendTypes"
import { useResponsiveSize } from "./stream/useResponsiveSize"

export type LegendInteractionMode = "highlight" | "isolate" | "none"

// Re-export hooks for convenience
export { useSelection, useSelectionActions, useLinkedHover, useBrushSelection, useFilteredData } from "./store/useSelection"
export type {
  UseSelectionOptions,
  UseSelectionResult,
  UseSelectionActionsResult,
  UseLinkedHoverOptions,
  UseLinkedHoverResult,
  UseBrushSelectionOptions,
  UseBrushSelectionResult
} from "./store/useSelection"

// Re-export observation hook
export { useChartObserver } from "./store/useObservation"
export type { UseChartObserverOptions, UseChartObserverResult } from "./store/useObservation"

// ── Linked legend context ──────────────────────────────────────────────────

/**
 * When LinkedCharts renders its own legend, child charts should suppress theirs.
 * This context signals that suppression.
 */
const LinkedLegendContext = createContext<boolean>(false)
const LinkedChartsActiveContext = createContext<boolean>(false)

/** Hook: returns true when a parent LinkedCharts is handling the legend. */
export function useLinkedLegendSuppression(): boolean {
  return useContext(LinkedLegendContext)
}

/** Hook: returns true when descendants are already inside a LinkedCharts provider. */
export function useLinkedChartsActive(): boolean {
  return useContext(LinkedChartsActiveContext)
}

interface LinkedCategoryRegistry {
  registerCategories: (id: string, categories: string[]) => void
  unregisterCategories: (id: string) => void
}

const LinkedCategoryRegistryContext = createContext<LinkedCategoryRegistry | null>(null)
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

function uniqueCategories(categories: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const category of categories) {
    if (seen.has(category)) continue
    seen.add(category)
    unique.push(category)
  }
  return unique
}

function sameCategories(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/** Register a chart's current color categories with the nearest LinkedCharts. */
export function useLinkedChartCategories(categories: string[]): void {
  const registry = useContext(LinkedCategoryRegistryContext)
  const id = useId()
  const nextCategories = uniqueCategories(categories)
  const stableCategoriesRef = useRef<string[]>([])
  if (!sameCategories(stableCategoriesRef.current, nextCategories)) {
    stableCategoriesRef.current = nextCategories
  }
  const stableCategories = stableCategoriesRef.current

  useIsomorphicLayoutEffect(() => {
    if (!registry) return
    return () => registry.unregisterCategories(id)
  }, [registry, id])

  useIsomorphicLayoutEffect(() => {
    if (!registry) return
    registry.registerCategories(id, stableCategories)
  }, [registry, id, stableCategories])
}

/** True when a chart can register live categories with a parent LinkedCharts. */
export function useLinkedChartCategoryRegistryActive(): boolean {
  return useContext(LinkedCategoryRegistryContext) !== null
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface LinkedChartsProps {
  children: React.ReactNode
  /** Pre-configure selections with resolution modes */
  selections?: Record<string, { resolution?: ResolutionMode }>
  /**
   * Show a unified legend for all linked charts.
   * When true, child chart legends are automatically suppressed unless explicitly set.
   * @default true
   */
  showLegend?: boolean
  /**
   * Position of the unified legend.
   * @default "top"
   */
  legendPosition?: "top" | "bottom"
  /**
   * Legend interaction mode for the unified legend.
   * - "highlight": hover dims non-hovered categories across all linked charts
   * - "isolate": click toggles category visibility across all linked charts
   * - "none": static legend (default)
   */
  legendInteraction?: LegendInteractionMode
  /**
   * Selection name that the unified legend produces on.
   * Child charts must use the same name in their `selection` prop to respond.
   * @default "legend"
   */
  legendSelectionName?: string
  /**
   * Field name that the unified legend uses for cross-chart highlighting.
   * This must match the field used in child charts' `linkedHover.fields` / `colorBy`.
   * @default first field from the first child's linkedHover config, or "category"
   */
  legendField?: string
}

// ── Interactive unified legend ─────────────────────────────────────────────

// Stable clientIds for the unified legend's own selection clauses. Module
// scope so they're not reactive inputs to the legend's hooks.
const ISOLATE_CLIENT = "__linked-legend-isolate__"
const HIGHLIGHT_CLIENT = "__linked-legend-highlight__"

/**
 * Inner component rendered inside SelectionProvider so it can use selection hooks.
 * Handles highlight (hover) and isolate (click) interactions on the unified legend,
 * producing selections that all child charts respond to.
 */
function LinkedLegend({
  categoryColors,
  interaction,
  selectionName,
  field,
}: {
  categoryColors: Record<string, string>
  interaction: LegendInteractionMode
  selectionName: string
  field: string
}) {
  // All hooks must run unconditionally on every render — when
  // `categoryColors` starts empty (e.g. a streaming chart hasn't pushed
  // any rows yet) and later populates, an early return before the hook
  // calls would change the static-flag profile of the fiber and trip
  // React 19's "Internal React error: Expected static flag was missing"
  // on the first non-empty render. The empty-state early return lives
  // *after* every hook below.
  const entries = Object.entries(categoryColors)
  const allCategories = entries.map(([label]) => label)
  const items = entries.map(([label, color]) => ({ label, color }))
  const legendGroups: LegendGroup[] = [{
    styleFn: (d) => ({ fill: d.color || "#333", stroke: d.color || "#333" }),
    type: "fill" as const,
    items,
    label: ""
  }]

  // The selection store is the single source of truth for both the
  // highlight (hover) and isolate (click) interactions. Each writes its
  // own clause directly from the event handler; nothing is mirrored into
  // React state and synced back with an effect. The legend's own swatch
  // emphasis is *derived* from the store below, so there is exactly one
  // place this state lives.
  // Isolate mode: click toggles point selections.
  const { selectPoints: selectIsolate, clear: clearIsolate } = useSelection({
    name: selectionName,
    fields: [field],
    clientId: ISOLATE_CLIENT,
  })
  // Highlight mode: hover produces a transient point selection.
  const { selectPoints: selectHighlight, clear: clearHighlight } = useSelection({
    name: selectionName,
    fields: [field],
    clientId: HIGHLIGHT_CLIENT,
  })

  // Read the legend's emphasis straight back from the store rather than
  // keeping a parallel React-state copy. `selections.get` returns a stable
  // reference until *this* selection changes, so the subscription only
  // re-renders the legend on its own updates.
  const selection = useSelectionSelector(
    (state: SelectionStoreState) => state.selections.get(selectionName)
  )
  const { isolatedCategories, highlightedCategory } = useMemo(() => {
    const isolated = new Set<string>()
    let highlighted: string | null = null
    const isolateField = selection?.clauses.get(ISOLATE_CLIENT)?.fields[field]
    if (isolateField?.type === "point") {
      for (const v of isolateField.values) isolated.add(String(v))
    }
    const highlightField = selection?.clauses.get(HIGHLIGHT_CLIENT)?.fields[field]
    if (highlightField?.type === "point") {
      const first = highlightField.values.values().next().value
      if (first != null) highlighted = String(first)
    }
    return { isolatedCategories: isolated, highlightedCategory: highlighted }
  }, [selection, field])

  const handleHover = useCallback(
    (item: { label: string } | null) => {
      if (interaction !== "highlight") return
      if (item) {
        selectHighlight({ [field]: [item.label] })
      } else {
        clearHighlight()
      }
    },
    [interaction, field, selectHighlight, clearHighlight]
  )

  const handleClick = useCallback(
    (item: { label: string }) => {
      if (interaction !== "isolate") return
      const next = new Set(isolatedCategories)
      if (next.has(item.label)) {
        next.delete(item.label)
      } else {
        next.add(item.label)
      }
      // Empty, or all categories selected (Carbon behavior): clear the
      // isolate clause so every category shows.
      if (next.size === 0 || next.size === allCategories.length) {
        clearIsolate()
      } else {
        selectIsolate({ [field]: Array.from(next) })
      }
    },
    [interaction, field, isolatedCategories, allCategories.length, selectIsolate, clearIsolate]
  )

  // Measure the container's actual laid-out width so we can tell <Legend>
  // how much room it has. Without this, the `width` prop defaults to 100
  // (fallback in Legend), which `renderLegendGroupHorizontal` treats as
  // `maxWidth` — so any label over ~100px causes the items to wrap one
  // per row. With the SVG at height=30, wrapped rows clip into whatever
  // sits below (the first chart in the composed layout).
  //
  // `useResponsiveSize` is the same hook Stream Frames use to measure
  // their container — reusing it keeps ResizeObserver wiring
  // centralized (single source of cleanup + change-debouncing).
  //
  // The ROW_HEIGHT_H used by Legend's horizontal renderer is 22; with
  // a 4px breathing margin the single-row height comfortably fits in
  // 30. If the container is narrow enough that the legend genuinely
  // needs to wrap, we grow the SVG height so nothing clips.
  const [containerRef, [measuredWidth]] = useResponsiveSize([0, 0], true, false)
  const rowCount = useMemo(
    () => estimateLegendRowCount(entries.map(([label]) => label), measuredWidth),
    [entries, measuredWidth]
  )
  const svgHeight = Math.max(30, rowCount * 22 + 8)

  // Empty-state guard lives here, after every hook above, so the hook
  // count and static-flag profile stay constant across renders — see
  // the comment near `entries` for why an earlier return would crash.
  if (entries.length === 0) return null

  return (
    <div ref={containerRef} style={{ width: "100%", display: "block" }}>
      <svg
        width="100%"
        height={svgHeight}
        style={{ display: "block", overflow: "visible" }}
      >
        <Legend
          legendGroups={legendGroups}
          title={false}
          orientation="horizontal"
          width={measuredWidth}
          height={20}
          customHoverBehavior={interaction === "highlight" ? handleHover : undefined}
          customClickBehavior={interaction === "isolate" ? handleClick : undefined}
          highlightedCategory={highlightedCategory}
          isolatedCategories={isolatedCategories}
        />
      </svg>
    </div>
  )
}

/**
 * Mirror of the wrap logic in Legend's renderLegendGroupHorizontal:
 * itemWidth = SWATCH(16) + 10 + label.length * 7, wrap when the cursor
 * would exceed maxWidth. Used only to size the container SVG — the
 * authoritative layout still happens inside <Legend>. When width is
 * unknown (e.g. first paint, SSR), return 1 so we don't pre-grow.
 */
export function estimateLegendRowCount(labels: string[], width: number): number {
  if (!width || labels.length === 0) return 1
  let offset = 0
  let rows = 1
  for (const label of labels) {
    const itemWidth = 16 + 10 + label.length * 7
    if (offset > 0 && offset + itemWidth > width) {
      rows++
      offset = 0
    }
    offset += itemWidth
  }
  return rows
}

// ── LinkedCharts component ─────────────────────────────────────────────────

/**
 * LinkedCharts — context provider for coordinated chart views.
 *
 * Wraps any number of chart components (at any depth) and enables
 * cross-highlighting, brushing-and-linking, and cross-filtering via
 * the `selection`, `linkedHover`, and `linkedBrush` props on each chart.
 *
 * @example
 * ```tsx
 * <LinkedCharts>
 *   <Scatterplot data={d} xAccessor="x" yAccessor="y" colorBy="cat"
 *     linkedHover={{ name: "hl", fields: ["cat"] }}
 *     selection={{ name: "hl" }} />
 *   <BarChart data={agg} categoryAccessor="cat" valueAccessor="total"
 *     selection={{ name: "hl" }} />
 * </LinkedCharts>
 * ```
 *
 * @example
 * ```tsx
 * // Cross-filtering (each chart's own brush is excluded from its filter)
 * <LinkedCharts selections={{ dash: { resolution: "crossfilter" } }}>
 *   <Scatterplot data={d} xAccessor="age" yAccessor="income"
 *     linkedBrush={{ name: "dash", xField: "age", yField: "income" }}
 *     selection={{ name: "dash" }} />
 *   <BarChart data={d} categoryAccessor="region" valueAccessor="count"
 *     selection={{ name: "dash" }} />
 * </LinkedCharts>
 * ```
 */
export function LinkedCharts({
  children,
  selections,
  showLegend,
  legendPosition = "top",
  legendInteraction = "none",
  legendSelectionName = "legend",
  legendField = "category",
}: LinkedChartsProps) {
  // Seed configured resolution modes at store construction rather than
  // mirroring them in with a mount effect — the resolution is initial
  // config, so it belongs in `initialState`, not a synchronize-after-commit
  // pass. createStore builds the source once with this, then ignores later
  // identity changes (resolution isn't a runtime-dynamic input).
  const initialSelectionState = useMemo(() => {
    if (!selections) return undefined
    const seeded = new Map<string, Selection>()
    for (const [name, config] of Object.entries(selections)) {
      if (config.resolution) {
        seeded.set(name, { name, resolution: config.resolution, clauses: new Map() })
      }
    }
    return seeded.size > 0 ? { selections: seeded } : undefined
  }, [selections])

  const parentCategoryColors = useCategoryColors()
  const [registeredCategories, setRegisteredCategories] = useState<Record<string, string[]>>({})
  const generatedCategoryColorsRef = useRef<Record<string, string>>({})

  const registry = useMemo<LinkedCategoryRegistry>(() => ({
    registerCategories: (id, categories) => {
      const nextCategories = uniqueCategories(categories)
      setRegisteredCategories(prev => {
        if (sameCategories(prev[id] ?? [], nextCategories)) return prev
        return { ...prev, [id]: nextCategories }
      })
    },
    unregisterCategories: (id) => {
      setRegisteredCategories(prev => {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }), [])

  const dynamicCategories = useMemo(() => {
    const merged: string[] = []
    for (const categories of Object.values(registeredCategories)) {
      for (const category of categories) merged.push(category)
    }
    return uniqueCategories(merged)
  }, [registeredCategories])

  const categoryColors = useMemo(() => {
    const parentMap = parentCategoryColors ?? {}
    const generatedMap = generatedCategoryColorsRef.current
    let paletteIndex = Object.keys(parentMap).length + Object.keys(generatedMap).length

    for (const category of dynamicCategories) {
      if (parentMap[category] || generatedMap[category]) continue
      generatedMap[category] = DEFAULT_COLORS[paletteIndex % DEFAULT_COLORS.length]
      paletteIndex++
    }

    const map: Record<string, string> = { ...parentMap }
    for (const category of dynamicCategories) {
      map[category] = parentMap[category] ?? generatedMap[category]
    }
    return map
  }, [parentCategoryColors, dynamicCategories])

  // Determine if we should show a unified legend
  const shouldShowLegend = showLegend !== undefined
    ? showLegend
    : true

  // Only suppress child-chart legends once the unified legend actually has
  // categories to render. Setting LinkedLegendContext = true on first render
  // (before any chart has registered) would silence child legends while
  // <LinkedLegend> still returns null on empty categoryColors — leaving the
  // page with no legend at all for one tick.
  const hasCategories = Object.keys(categoryColors).length > 0
  const suppressChildLegends = shouldShowLegend && hasCategories

  return (
    <SelectionProvider initialState={initialSelectionState}>
      <ObservationProvider>
        <LinkedChartsActiveContext.Provider value={true}>
          <LinkedCategoryRegistryContext.Provider value={registry}>
            <CategoryColorProvider colors={categoryColors}>
              <LinkedLegendContext.Provider value={suppressChildLegends}>
                {shouldShowLegend && legendPosition === "top" && (
                  <LinkedLegend
                    categoryColors={categoryColors}
                    interaction={legendInteraction}
                    selectionName={legendSelectionName}
                    field={legendField}
                  />
                )}
                {children}
                {shouldShowLegend && legendPosition === "bottom" && (
                  <LinkedLegend
                    categoryColors={categoryColors}
                    interaction={legendInteraction}
                    selectionName={legendSelectionName}
                    field={legendField}
                  />
                )}
              </LinkedLegendContext.Provider>
            </CategoryColorProvider>
          </LinkedCategoryRegistryContext.Provider>
        </LinkedChartsActiveContext.Provider>
      </ObservationProvider>
    </SelectionProvider>
  )
}
