"use client"
import * as React from "react"
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { SelectionProvider, useSelectionSelector } from "./store/SelectionStore"
import type { ResolutionMode } from "./store/SelectionStore"
import { ObservationProvider } from "./store/ObservationStore"
import { useLinkedHover, useSelection } from "./store/useSelection"
import { useCategoryColors } from "./CategoryColors"
import Legend from "./Legend"
import type { LegendGroup } from "./types/legendTypes"

type LegendInteractionMode = "highlight" | "isolate" | "none"

// Re-export hooks for convenience
export { useSelection, useLinkedHover, useBrushSelection, useFilteredData } from "./store/useSelection"
export type {
  UseSelectionOptions,
  UseSelectionResult,
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

// ── Props ──────────────────────────────────────────────────────────────────

export interface LinkedChartsProps {
  children: React.ReactNode
  /** Pre-configure selections with resolution modes */
  selections?: Record<string, { resolution?: ResolutionMode }>
  /**
   * Show a unified legend for all linked charts.
   * When true, child chart legends are automatically suppressed unless explicitly set.
   * @default true (when a CategoryColorProvider is present)
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
  const setResolution = useSelectionSelector((state: any) => state.setResolution)

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
  const entries = Object.entries(categoryColors)
  if (entries.length === 0) return null

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

  // Measure the SVG's actual laid-out width so we can tell <Legend> how
  // much room it has. Without this, the `width` prop defaults to 100
  // (fallback in Legend), which `renderLegendGroupHorizontal` treats as
  // `maxWidth` — so any label over ~100px causes the items to wrap one
  // per row. The <svg> itself is height=30, so the wrapped rows clip
  // into whatever sits below (the first chart in the composed layout).
  //
  // The ROW_HEIGHT_H used by Legend's horizontal renderer is 22; with
  // standard rendering + a 4px breathing margin the single-row height
  // comfortably fits in 30. If the container is narrow enough that the
  // legend genuinely needs to wrap, we grow the SVG to the computed
  // number of rows so nothing clips.
  const svgRef = useRef<SVGSVGElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number>(0)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    // ResizeObserver absent in jsdom / old SSR environments — skip the
    // dynamic measurement and fall back to the large-width sentinel
    // below (Legend.width = 10000 effectively disables horizontal wrap).
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setMeasuredWidth(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Rough estimate of how many rows the horizontal legend will need at
  // this width, mirroring the wrap logic in `renderLegendGroupHorizontal`
  // (itemWidth = SWATCH(16) + 10 + label.length * 7, wrap when offset +
  // itemWidth > maxWidth). Used only to size the SVG — the authoritative
  // layout still happens inside <Legend>.
  const rowCount = useMemo(() => {
    if (!measuredWidth) return 1
    let offset = 0
    let rows = 1
    for (const [label] of entries) {
      const itemWidth = 16 + 10 + label.length * 7
      if (offset > 0 && offset + itemWidth > measuredWidth) {
        rows++
        offset = 0
      }
      offset += itemWidth
    }
    return rows
  }, [entries, measuredWidth])
  const svgHeight = Math.max(30, rowCount * 22 + 8)

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={svgHeight}
      style={{ display: "block", overflow: "visible" }}
    >
      <Legend
        legendGroups={legendGroups}
        title={false as any}
        orientation="horizontal"
        width={measuredWidth || 10000}
        height={20}
        customHoverBehavior={interaction === "highlight" ? handleHover : undefined}
        customClickBehavior={interaction === "isolate" ? handleClick : undefined}
        highlightedCategory={highlightedCategory}
        isolatedCategories={isolatedCategories}
      />
    </svg>
  )
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
  const categoryColors = useCategoryColors()

  // Determine if we should show a unified legend
  const shouldShowLegend = showLegend !== undefined
    ? showLegend
    : !!(categoryColors && Object.keys(categoryColors).length > 0)

  return (
    <SelectionProvider>
      <ObservationProvider>
        {selections && <ResolutionInit selections={selections} />}
        <LinkedLegendContext.Provider value={shouldShowLegend}>
          {shouldShowLegend && legendPosition === "top" && categoryColors && (
            <LinkedLegend
              categoryColors={categoryColors}
              interaction={legendInteraction}
              selectionName={legendSelectionName}
              field={legendField}
            />
          )}
          {children}
          {shouldShowLegend && legendPosition === "bottom" && categoryColors && (
            <LinkedLegend
              categoryColors={categoryColors}
              interaction={legendInteraction}
              selectionName={legendSelectionName}
              field={legendField}
            />
          )}
        </LinkedLegendContext.Provider>
      </ObservationProvider>
    </SelectionProvider>
  )
}
