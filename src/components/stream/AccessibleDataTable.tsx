"use client"
import * as React from "react"
import { AccessibleTableMoreRows } from "./AccessibleTableMoreRows"
import { AccessibleDataRowsTable } from "./AccessibleDataRowsTable"
import { AccessibleTableShell } from "./AccessibleTableShell"
import { SAMPLE_SIZE, PAGE_SIZE } from "./accessibleTableStyles"
import { useAccessibleTableInteraction } from "./useAccessibleTableInteraction"
import { SR_ONLY_STYLE } from "./AriaLiveTooltip"
import type { AccessibleTableProp } from "./accessibleTableTypes"
import {
  countDataRows,
  extractAllRows,
  type AccessibleSceneNode as AnySceneNode,
} from "./accessibleDataRows"
import {
  computeFieldStats,
  formatSummary,
} from "./accessibleDataTableModel"
export type { AccessibleTableOptions, AccessibleTablePortalTarget, AccessibleTableProp } from "./accessibleTableTypes"
export { extractAllRows } from "./accessibleDataRows"
export type { DataRow } from "./accessibleDataRows"
export { AriaLiveTooltip, SR_ONLY_STYLE } from "./AriaLiveTooltip"

const AccessibleTablePortalImpl = React.lazy(() => import("./AccessibleTablePortalImpl"))

/** Relocate the complete interactive accessible-table UI when a chart lives
 * inside a consumer-owned `role="img"`. The historical inline DOM remains
 * unchanged for `accessibleTable={true}`. */
export function AccessibleTablePortal({
  accessibleTable,
  children
}: {
  accessibleTable: AccessibleTableProp
  children: React.ReactNode
}) {
  if (typeof accessibleTable !== "object") return children
  if (typeof document === "undefined") return null
  return <React.Suspense fallback={null}><AccessibleTablePortalImpl target={accessibleTable.portalTarget}>{children}</AccessibleTablePortalImpl></React.Suspense>
}

// ── Aria-label helpers ──────────────────────────────────────────────────

/**
 * Compute an aria-label describing the chart type and data shape from the scene graph.
 */
export function computeCanvasAriaLabel(
  scene: AnySceneNode[] | null | undefined,
  chartType: string
): string {
  if (!scene || scene.length === 0) return `${chartType}, empty`

  const typeCounts: Record<string, number> = {}
  for (const node of scene) {
    if (node?.datum === null) continue
    const type = String(node.type)
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }
  if (Object.keys(typeCounts).length === 0) return `${chartType}, empty`

  const parts: string[] = []
  const typeLabels: Record<string, string> = {
    point: "points",
    line: "lines",
    area: "areas",
    rect: "bars",
    heatcell: "cells",
    circle: "nodes",
    candlestick: "candlesticks",
    wedge: "wedges",
    arc: "arcs",
    geoarea: "regions"
  }

  // Sort by a fixed type order for stable aria-label output
  const typeOrder = Object.keys(typeLabels)
  const sortedTypes = Object.keys(typeCounts).sort((a, b) => {
    const ai = typeOrder.indexOf(a)
    const bi = typeOrder.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  for (const type of sortedTypes) {
    const label = typeLabels[type] || type
    parts.push(`${typeCounts[type]} ${label}`)
  }

  return `${chartType}, ${parts.join(", ")}`
}

/**
 * Compute an aria-label for network charts from scene nodes and edges.
 */
export function computeNetworkAriaLabel(
  nodeCount: number,
  edgeCount: number,
  chartType: string
): string {
  const parts: string[] = []
  if (nodeCount > 0) parts.push(`${nodeCount} nodes`)
  if (edgeCount > 0) parts.push(`${edgeCount} edges`)
  if (parts.length === 0) return `${chartType}, empty`
  return `${chartType}, ${parts.join(", ")}`
}

// ── AccessibleDataTable ─────────────────────────────────────────────────

interface AccessibleDataTableProps {
  scene: AnySceneNode[]
  /** Refresh semantic rows after an in-place scene update. */
  sceneRevision?: number
  chartType: string
  /** Unique ID for skip-navigation link targeting */
  tableId?: string
  /** Chart title — used to disambiguate aria-labels when multiple charts of the same type exist */
  chartTitle?: string
}


/**
 * JIT accessible data summary. Renders a lightweight sr-only button by default.
 * On activation (or when ChartContainer's dataSummary action is toggled),
 * computes a statistical summary (.describe()-style) and shows a sample of rows
 * (5 to start), pageable to the full dataset via "Show more".
 */
export function AccessibleDataTable({
  scene,
  sceneRevision,
  chartType,
  tableId,
  chartTitle
}: AccessibleDataTableProps) {
  const [visibleCount, setVisibleCount] = React.useState(SAMPLE_SIZE)
  const interaction = useAccessibleTableInteraction()
  const { isExpanded, revealRows } = interaction
  const sceneKey = sceneRevision ?? scene
  const model = React.useMemo(() => {
    if (!isExpanded) return null
    const allRows = extractAllRows(scene)
    return { allRows, summary: formatSummary(allRows.length, computeFieldStats(allRows)) }
    // A supplied semantic revision is authoritative across geometry-only builds.
    // Without one, direct callers invalidate by replacing the scene array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, sceneKey])
  const regionLabel = chartTitle
    ? `Data summary for ${chartTitle}`
    : tableId
      ? `Data summary for ${chartType} ${tableId}`
      : `Data summary for ${chartType}`

  // Reset paging whenever the panel collapses — via the close button, a blur in
  // sr-only mode, or ChartContainer toggling visibility off — so reopening never
  // re-renders the full (potentially huge) row set at once.
  React.useEffect(() => {
    if (!isExpanded) setVisibleCount(SAMPLE_SIZE)
  }, [isExpanded])

  if (!scene || scene.length === 0) {
    return tableId ? (
      <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
    ) : null
  }

  const shell = { interaction, tableId, regionLabel, countLabel: `${countDataRows(scene)} elements` }
  if (!isExpanded) return <AccessibleTableShell {...shell} />


  // JIT: only compute stats + sample on activation
  const { allRows, summary } = model!
  const shownCount = Math.min(visibleCount, allRows.length)
  const sampleRows = allRows.slice(0, shownCount)
  const remaining = allRows.length - shownCount


  const showMore = (event: React.MouseEvent<HTMLButtonElement>) => {
    revealRows(event.currentTarget, shownCount, Math.min(shownCount + PAGE_SIZE, allRows.length), allRows.length)
    setVisibleCount((c) => c + PAGE_SIZE)
  }

  return (
    <AccessibleTableShell {...shell} summary={summary}>
      <AccessibleDataRowsTable rows={sampleRows} label={`Sample data for ${chartType}`} typeLabel="type" caption={remaining > 0 ? `First ${shownCount} of ${allRows.length} data points` : `All ${allRows.length} data points`} />
      <AccessibleTableMoreRows remaining={remaining} onClick={showMore} kind="row" />
    </AccessibleTableShell>
  )
}


// ── ScreenReaderSummary ─────────────────────────────────────────────────

/**
 * Screen-reader-only summary note for the chart.
 * Rendered as role="note" so assistive technology can discover it.
 */
export function ScreenReaderSummary({ summary }: { summary?: string }) {
  if (!summary) return null
  return (
    <div role="note" style={SR_ONLY_STYLE}>
      {summary}
    </div>
  )
}

// ── SkipToTableLink ─────────────────────────────────────────────────────

/**
 * Screen-reader-only skip link to jump past chart canvas to the data table.
 * Only rendered when accessibleTable is enabled.
 */
export function SkipToTableLink({ tableId }: { tableId: string }) {
  return (
    <a
      href={`#${tableId}`}
      style={SR_ONLY_STYLE}
      onClick={(e) => {
        e.preventDefault()
        // Programmatically focus the target so it reliably expands via onFocus
        const target = document.getElementById(tableId)
        if (target) {
          requestAnimationFrame(() => target.focus())
        }
      }}
      onFocus={(e) => {
        // Briefly make visible on focus for sighted keyboard users
        const el = e.currentTarget
        Object.assign(el.style, {
          position: "absolute",
          width: "auto",
          height: "auto",
          overflow: "visible",
          clip: "auto",
          whiteSpace: "normal",
          padding: "4px 8px",
          background: "var(--semiotic-bg, #fff)",
          color: "var(--semiotic-text, #000)",
          border: "2px solid var(--semiotic-focus, #005fcc)",
          borderRadius: "4px",
          zIndex: "10",
          fontSize: "12px",
          top: "4px",
          left: "4px"
        })
      }}
      onBlur={(e) => {
        const el = e.currentTarget
        el.removeAttribute("style")
        Object.assign(el.style, SR_ONLY_STYLE)
      }}
    >
      Skip to data table
    </a>
  )
}
