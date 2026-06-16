"use client"
import * as React from "react"
import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react"
import { SelectionProvider, useSelectionSelector } from "./store/SelectionStore"
import type { ResolutionMode, SelectionStoreState } from "./store/SelectionStore"
import { ObservationProvider } from "./store/ObservationStore"
import { useLinkedHover, useSelection } from "./store/useSelection"
import { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
import { DEFAULT_COLORS } from "./charts/shared/colorUtils"
import Legend from "./Legend"
import type { LegendGroup } from "./types/legendTypes"
import { useResponsiveSize } from "./stream/useResponsiveSize"

type LegendInteractionMode = "highlight" | "isolate" | "none"

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

/** Hook: returns true when a parent LinkedCharts is handling the legend. */
export function useLinkedLegendSuppression(): boolean {
  return useContext(LinkedLegendContext)
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

// ── Resolution initializer ─────────────────────────────────────────────────

function ResolutionInit({ selections }: { selections: Record<string, { resolution?: ResolutionMode }> }) {
  const setResolution = useSelectionSelector((state: SelectionStoreState) => state.setResolution)

  useEffect(() => {
    for (const [name, config] of Object.entries(selections)) {
      if (config.resolution) {
        setResolution(name, config.resolution)
      }
    }
  }, [selections, setResolution])

  return null
}

// ── Interactive unified legend ─────────────────────────────────────────────

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

  // Highlight mode: hover produces a linkedHover selection
  const linkedHoverHook = useLinkedHover({
    name: selectionName,
    fields: [field],
  })

  // Isolate mode: click toggles point selections
  const selectionHook = useSelection({
    name: selectionName,
    fields: [field],
    clientId: "__linked-legend-isolate__",
  })

  const [isolatedCategories, setIsolatedCategories] = useState<Set<string>>(new Set())
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)

  // Use refs for store methods to avoid infinite effect loops
  // (selectPoints/clear change identity when selection state changes)
  const selectPointsRef = useRef(selectionHook.selectPoints)
  selectPointsRef.current = selectionHook.selectPoints
  const clearRef = useRef(selectionHook.clear)
  clearRef.current = selectionHook.clear

  // Sync isolatedCategories → selection store via effect to avoid setState-during-render
  useEffect(() => {
    if (interaction !== "isolate") return
    if (isolatedCategories.size > 0) {
      selectPointsRef.current({ [field]: Array.from(isolatedCategories) })
    } else {
      clearRef.current()
    }
  }, [interaction, isolatedCategories, field])

  const handleHover = useCallback(
    (item: { label: string } | null) => {
      if (interaction !== "highlight") return
      if (item) {
        setHighlightedCategory(item.label)
        linkedHoverHook.onHover({ [field]: item.label })
      } else {
        setHighlightedCategory(null)
        linkedHoverHook.onHover(null)
      }
    },
    [interaction, field, linkedHoverHook]
  )

  const handleClick = useCallback(
    (item: { label: string }) => {
      if (interaction !== "isolate") return
      setIsolatedCategories(prev => {
        const next = new Set(prev)
        if (next.has(item.label)) {
          next.delete(item.label)
        } else {
          next.add(item.label)
        }
        // If all categories selected, reset (Carbon behavior)
        if (next.size === allCategories.length) {
          return new Set()
        }
        return next
      })
    },
    [interaction, allCategories.length]
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
    <SelectionProvider>
      <ObservationProvider>
        {selections && <ResolutionInit selections={selections} />}
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
      </ObservationProvider>
    </SelectionProvider>
  )
}
