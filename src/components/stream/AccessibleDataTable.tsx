"use client"
import * as React from "react"
import { useDataSummary } from "../DataSummaryContext"
import type { Datum } from "../charts/shared/datumTypes"
import { SR_ONLY_STYLE } from "./AriaLiveTooltip"
import {
  extractAllRows,
  type AccessibleSceneNode as AnySceneNode,
  type DataRow,
} from "./accessibleDataRows"

export { extractAllRows } from "./accessibleDataRows"
export type { DataRow } from "./accessibleDataRows"
export { AriaLiveTooltip, SR_ONLY_STYLE } from "./AriaLiveTooltip"

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
  const typeOrder = [
    "point",
    "line",
    "area",
    "rect",
    "heatcell",
    "circle",
    "candlestick",
    "wedge",
    "arc",
    "geoarea"
  ]
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

// ── Formatting ──────────────────────────────────────────────────────────

const fmt = (v: number | undefined | null): string => {
  if (v == null) return ""
  const n = Math.round(v * 100) / 100
  if (Number.isNaN(n)) return ""
  return String(n)
}

// ── Statistical summary ─────────────────────────────────────────────────

interface FieldStats {
  name: string
  count: number
  numeric: boolean
  min?: number
  max?: number
  mean?: number
  uniqueValues?: string[]
}

/** Compute per-field statistics from extracted rows. Defensive against weird values. */
function computeFieldStats(rows: DataRow[]): FieldStats[] {
  if (!rows || rows.length === 0) return []

  // Collect all field names
  const fieldNames = new Set<string>()
  for (const r of rows) {
    if (!r || !r.values) continue
    for (const k of Object.keys(r.values)) fieldNames.add(k)
  }

  const stats: FieldStats[] = []
  for (const name of fieldNames) {
    const nums: number[] = []
    const strs = new Set<string>()

    for (const r of rows) {
      if (!r || !r.values) continue
      const v = r.values[name]
      if (v == null || v === "") continue
      if (typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v)) {
        nums.push(v)
      } else if (typeof v === "number") {
        // NaN/Infinity — skip rather than corrupt stats
      } else if (typeof v !== "object" && typeof v !== "function") {
        strs.add(String(v))
      }
      // Objects/functions silently skipped — not meaningful for stats
    }

    if (nums.length > 0) {
      let min = nums[0],
        max = nums[0],
        sum = 0
      for (const n of nums) {
        if (n < min) min = n
        if (n > max) max = n
        sum += n
      }
      stats.push({
        name,
        count: nums.length,
        numeric: true,
        min,
        max,
        mean: sum / nums.length
      })
    } else if (strs.size > 0) {
      const unique = Array.from(strs)
      stats.push({
        name,
        count: unique.length,
        numeric: false,
        uniqueValues: unique.slice(0, 5)
      })
    }
  }

  return stats
}

/** Format a summary string from field stats. */
function formatSummary(totalRows: number, fieldStats: FieldStats[]): string {
  const parts: string[] = [`${totalRows} data points.`]

  for (const fs of fieldStats) {
    if (fs.numeric) {
      parts.push(
        `${fs.name}: ${fmt(fs.min)} to ${fmt(fs.max)}, mean ${fmt(fs.mean)}.`
      )
    } else {
      const vals = fs.uniqueValues!
      const label =
        vals.length <= 3
          ? vals.join(", ")
          : `${vals.slice(0, 3).join(", ")}… (${fs.count} unique)`
      parts.push(`${fs.name}: ${label}.`)
    }
  }

  return parts.join(" ")
}

// ── AccessibleDataTable ─────────────────────────────────────────────────

interface AccessibleDataTableProps {
  scene: AnySceneNode[]
  chartType: string
  /** Unique ID for skip-navigation link targeting */
  tableId?: string
  /** Chart title — used to disambiguate aria-labels when multiple charts of the same type exist */
  chartTitle?: string
}

const SAMPLE_SIZE = 5
/** Rows revealed per "Show more" click. Bounded paging keeps a 50k-row dataset
 *  from instantiating a giant table in one go while still letting a determined
 *  user page all the way through their data. */
const PAGE_SIZE = 25
const DATA_TABLE_CLASS = "semiotic-accessible-data-table"
const DATA_TABLE_HIDDEN_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-hidden`
const DATA_TABLE_VISIBLE_CLASS = `${DATA_TABLE_CLASS} semiotic-accessible-data-table-visible`
const DATA_TABLE_NETWORK_CLASS = `${DATA_TABLE_VISIBLE_CLASS} semiotic-accessible-data-table-network`

const VISIBLE_PANEL_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex:
    "var(--semiotic-data-table-z-index, var(--semiotic-overlay-z-index, 20))",
  padding: "14px 16px 12px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontFamily:
    "var(--semiotic-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  borderRadius:
    "var(--semiotic-border-radius, 0px) var(--semiotic-border-radius, 0px) 0 0"
}

const SUMMARY_NOTE_STYLE: React.CSSProperties = {
  marginBottom: 8,
  paddingRight: 28,
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 12,
  letterSpacing: "0.01em"
}

const CLOSE_BUTTON_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  cursor: "pointer",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  borderRadius: "var(--semiotic-border-radius, 4px)"
}

const VISIBLE_TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums"
}

const VISIBLE_TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "5px 10px",
  borderBottom:
    "2px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))"
}

const VISIBLE_TD_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  borderBottom:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))"
}

const CAPTION_STYLE: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  // #666 fallback = LIGHT_THEME.textSecondary; #999 fails WCAG AA for text.
  color:
    "var(--semiotic-data-table-muted-text, var(--semiotic-text-secondary, #666))",
  marginBottom: 4,
  fontStyle: "italic"
}

const SHOW_MORE_BUTTON_STYLE: React.CSSProperties = {
  marginTop: 8,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
  border:
    "1px solid var(--semiotic-data-table-border, var(--semiotic-border, #e0e0e0))",
  borderRadius: "var(--semiotic-border-radius, 4px)",
  background:
    "var(--semiotic-data-table-bg, var(--semiotic-surface, var(--semiotic-bg, #fff)))",
  color: "var(--semiotic-data-table-text, var(--semiotic-text, #333))",
  fontFamily: "inherit"
}

function fmtCell(v: unknown): string {
  if (v == null || v === "") return "—"
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "—"
    return fmt(v)
  }
  if (typeof v === "boolean") return v ? "true" : "false"
  if (typeof v === "object") return "—" // Don't render [object Object]
  return String(v)
}

/**
 * JIT accessible data summary. Renders a lightweight sr-only button by default.
 * On activation (or when ChartContainer's dataSummary action is toggled),
 * computes a statistical summary (.describe()-style) and shows a sample of rows
 * (5 to start), pageable to the full dataset via "Show more".
 */
export function AccessibleDataTable({
  scene,
  chartType,
  tableId,
  chartTitle
}: AccessibleDataTableProps) {
  const [srExpanded, setSrExpanded] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(SAMPLE_SIZE)
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)
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

  // Expand only when focus lands on the region container itself (the skip-link
  // path programmatically focuses it). Focus bubbling up from the inner trigger
  // button must NOT auto-expand — otherwise merely tabbing onto the button
  // forces the screen reader through the entire table without the user opting in.
  const handleFocus = React.useCallback(
    (e: React.FocusEvent) => {
      if (e.target !== e.currentTarget) return
      if (!srExpanded && !visible) setSrExpanded(true)
    },
    [srExpanded, visible]
  )

  // Collapse when focus leaves the panel entirely (not for context-controlled mode).
  const handleBlur = React.useCallback(
    (e: React.FocusEvent) => {
      if (visible) return // ChartContainer controls visibility
      // Check if focus moved to another element inside this container
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      setSrExpanded(false)
    },
    [visible]
  )

  if (!scene || scene.length === 0) {
    return tableId ? (
      <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
    ) : null
  }

  const totalCount = scene.length

  if (!isExpanded) {
    return (
      <div
        id={tableId}
        className={DATA_TABLE_HIDDEN_CLASS}
        tabIndex={-1}
        onFocus={handleFocus}
        style={SR_ONLY_STYLE}
        role="region"
        aria-label={regionLabel}
      >
        <button type="button" onClick={() => setSrExpanded(true)}>
          View data summary ({totalCount} elements)
        </button>
      </div>
    )
  }

  // JIT: only compute stats + sample on activation
  const allRows = extractAllRows(scene)
  const fieldStats = computeFieldStats(allRows)
  const summary = formatSummary(allRows.length, fieldStats)
  const shownCount = Math.min(visibleCount, allRows.length)
  const sampleRows = allRows.slice(0, shownCount)
  const remaining = allRows.length - shownCount

  const columnSet = new Set<string>()
  for (const r of sampleRows) {
    for (const k of Object.keys(r.values)) columnSet.add(k)
  }
  const columns = Array.from(columnSet)

  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
    // visibleCount resets via the collapse effect above.
  }

  const showMore = () => setVisibleCount((c) => c + PAGE_SIZE)

  return (
    <div
      ref={containerRef}
      id={tableId}
      className={DATA_TABLE_VISIBLE_CLASS}
      tabIndex={-1}
      onBlur={handleBlur}
      style={VISIBLE_PANEL_STYLE}
      role="region"
      aria-label={regionLabel}
    >
      <button
        type="button"
        className="semiotic-accessible-data-table-close"
        onClick={dismiss}
        aria-label="Close data summary"
        style={CLOSE_BUTTON_STYLE}
      >
        &times;
      </button>
      <div
        className="semiotic-accessible-data-table-summary"
        role="note"
        style={SUMMARY_NOTE_STYLE}
      >
        {summary}
      </div>
      <table
        className="semiotic-accessible-data-table-table"
        role="table"
        aria-label={`Sample data for ${chartType}`}
        style={VISIBLE_TABLE_STYLE}
      >
        <caption
          className="semiotic-accessible-data-table-caption"
          style={CAPTION_STYLE}
        >
          {remaining > 0
            ? `First ${shownCount} of ${allRows.length} data points`
            : `All ${allRows.length} data points`}
        </caption>
        <thead>
          <tr>
            <th style={VISIBLE_TH_STYLE}>type</th>
            {columns.map((c) => (
              <th key={c} style={VISIBLE_TH_STYLE}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((r, i) => (
            <tr key={i}>
              <td style={VISIBLE_TD_STYLE}>{r.label}</td>
              {columns.map((c) => (
                <td key={c} style={VISIBLE_TD_STYLE}>
                  {fmtCell(r.values[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <button
          type="button"
          className="semiotic-accessible-data-table-show-more"
          onClick={showMore}
          style={SHOW_MORE_BUTTON_STYLE}
        >
          Show {Math.min(PAGE_SIZE, remaining)} more{" "}
          {remaining === 1 ? "row" : "rows"} ({remaining} remaining)
        </button>
      )}
    </div>
  )
}

// ── NetworkAccessibleDataTable ──────────────────────────────────────────

interface NetworkAccessibleDataTableProps {
  nodes: Array<{
    datum?: Datum | null
    id?: string
    cx?: number
    cy?: number
    x?: number
    y?: number
  }>
  edges: Array<{ datum?: Datum | null; source?: string; target?: string }>
  chartType: string
  tableId?: string
  chartTitle?: string
}

/**
 * JIT accessible data summary for network charts.
 */
export function NetworkAccessibleDataTable({
  nodes,
  edges,
  chartType,
  tableId,
  chartTitle
}: NetworkAccessibleDataTableProps) {
  const [srExpanded, setSrExpanded] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(SAMPLE_SIZE)
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const regionLabel = chartTitle
    ? `Data summary for ${chartTitle}`
    : tableId
      ? `Data summary for ${chartType} ${tableId}`
      : `Data summary for ${chartType}`
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Reset paging on any collapse path (close button, blur, ChartContainer
  // toggle) so reopening never re-renders the full node set at once.
  React.useEffect(() => {
    if (!isExpanded) setVisibleCount(SAMPLE_SIZE)
  }, [isExpanded])

  // Only the skip-link path (which focuses the region container itself) auto-
  // expands; focus bubbling from the inner trigger button must not. See the
  // matching note in AccessibleDataTable.
  const handleFocus = React.useCallback(
    (e: React.FocusEvent) => {
      if (e.target !== e.currentTarget) return
      if (!srExpanded && !visible) setSrExpanded(true)
    },
    [srExpanded, visible]
  )

  const handleBlur = React.useCallback(
    (e: React.FocusEvent) => {
      if (visible) return
      if (containerRef.current?.contains(e.relatedTarget as Node)) return
      setSrExpanded(false)
    },
    [visible]
  )

  if (!nodes || nodes.length === 0) {
    return tableId ? (
      <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} />
    ) : null
  }

  if (!isExpanded) {
    return (
      <div
        id={tableId}
        className={DATA_TABLE_HIDDEN_CLASS}
        tabIndex={-1}
        onFocus={handleFocus}
        style={SR_ONLY_STYLE}
        role="region"
        aria-label={regionLabel}
      >
        <button type="button" onClick={() => setSrExpanded(true)}>
          View data summary ({nodes.length} nodes, {edges.length} edges)
        </button>
      </div>
    )
  }

  // JIT: compute degree stats on activation — defensive against weird data shapes
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const safeEdges = Array.isArray(edges) ? edges : []

  // Compute per-node degree stats: in-degree, out-degree (count and weighted)
  const inDeg = new Map<string, number>()
  const outDeg = new Map<string, number>()
  const wInDeg = new Map<string, number>()
  const wOutDeg = new Map<string, number>()

  for (const e of safeEdges) {
    if (!e || typeof e !== "object") continue
    const raw: Datum = e.datum ?? { source: e.source, target: e.target }
    const srcRaw = typeof raw.source === "object" ? raw.source?.id : raw.source
    const tgtRaw = typeof raw.target === "object" ? raw.target?.id : raw.target
    const hasVal = typeof raw.value === "number" && Number.isFinite(raw.value)
    const val = hasVal ? raw.value : 0
    if (srcRaw != null && srcRaw !== "") {
      const src = String(srcRaw)
      outDeg.set(src, (outDeg.get(src) ?? 0) + 1)
      wOutDeg.set(src, (wOutDeg.get(src) ?? 0) + val)
    }
    if (tgtRaw != null && tgtRaw !== "") {
      const tgt = String(tgtRaw)
      inDeg.set(tgt, (inDeg.get(tgt) ?? 0) + 1)
      wInDeg.set(tgt, (wInDeg.get(tgt) ?? 0) + val)
    }
  }

  type NodeDegreeRow = {
    id: string
    degree: number
    inDeg: number
    outDeg: number
    wDegree: number
    wInDeg: number
    wOutDeg: number
  }
  const nodeRows: NodeDegreeRow[] = []
  for (let ni = 0; ni < safeNodes.length; ni++) {
    const n = safeNodes[ni]
    if (!n || typeof n !== "object") continue
    const rawId = n.datum?.id ?? n.id
    const id = rawId != null ? String(rawId) : `node-${ni}`
    const ind = inDeg.get(id) ?? 0
    const outd = outDeg.get(id) ?? 0
    const wind = wInDeg.get(id) ?? 0
    const woutd = wOutDeg.get(id) ?? 0
    nodeRows.push({
      id,
      degree: ind + outd,
      inDeg: ind,
      outDeg: outd,
      wDegree: wind + woutd,
      wInDeg: wind,
      wOutDeg: woutd
    })
  }

  // Sort by degree descending for most useful summary
  nodeRows.sort((a, b) => b.degree - a.degree)

  let avgDegree = 0
  let maxDegree = 0
  if (nodeRows.length > 0) {
    let sum = 0
    for (const r of nodeRows) {
      sum += r.degree
      if (r.degree > maxDegree) maxDegree = r.degree
    }
    avgDegree = sum / nodeRows.length
  }

  // Show weighted columns when any edge carries a numeric value
  const hasWeights = safeEdges.some((e) => {
    const raw: Datum = e?.datum ?? { source: e?.source, target: e?.target }
    return typeof raw?.value === "number" && Number.isFinite(raw.value)
  })

  const summaryParts = [`${nodeRows.length} nodes, ${safeEdges.length} edges.`]
  if (nodeRows.length > 0) {
    summaryParts.push(
      `Mean degree: ${fmt(avgDegree)}, max degree: ${maxDegree}.`
    )
  }

  const shownCount = Math.min(visibleCount, nodeRows.length)
  const sampleNodes = nodeRows.slice(0, shownCount)
  const remaining = nodeRows.length - shownCount

  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
    // visibleCount resets via the collapse effect above.
  }

  const showMore = () => setVisibleCount((c) => c + PAGE_SIZE)

  return (
    <div
      ref={containerRef}
      id={tableId}
      className={DATA_TABLE_NETWORK_CLASS}
      tabIndex={-1}
      onBlur={handleBlur}
      style={VISIBLE_PANEL_STYLE}
      role="region"
      aria-label={regionLabel}
    >
      <button
        type="button"
        className="semiotic-accessible-data-table-close"
        onClick={dismiss}
        aria-label="Close data summary"
        style={CLOSE_BUTTON_STYLE}
      >
        &times;
      </button>
      <div
        className="semiotic-accessible-data-table-summary"
        role="note"
        style={SUMMARY_NOTE_STYLE}
      >
        {summaryParts.join(" ")}
      </div>
      <table
        className="semiotic-accessible-data-table-table"
        role="table"
        aria-label={`Node degree summary for ${chartType}`}
        style={VISIBLE_TABLE_STYLE}
      >
        <caption
          className="semiotic-accessible-data-table-caption"
          style={CAPTION_STYLE}
        >
          {remaining > 0
            ? `Top ${shownCount} of ${nodeRows.length} nodes by degree`
            : `All ${nodeRows.length} nodes by degree`}
        </caption>
        <thead>
          <tr>
            <th style={VISIBLE_TH_STYLE}>id</th>
            <th style={VISIBLE_TH_STYLE}>degree</th>
            <th style={VISIBLE_TH_STYLE}>in</th>
            <th style={VISIBLE_TH_STYLE}>out</th>
            {hasWeights && <th style={VISIBLE_TH_STYLE}>w. degree</th>}
            {hasWeights && <th style={VISIBLE_TH_STYLE}>w. in</th>}
            {hasWeights && <th style={VISIBLE_TH_STYLE}>w. out</th>}
          </tr>
        </thead>
        <tbody>
          {sampleNodes.map((row, i) => (
            <tr key={i}>
              <td style={VISIBLE_TD_STYLE}>{row.id}</td>
              <td style={VISIBLE_TD_STYLE}>{row.degree}</td>
              <td style={VISIBLE_TD_STYLE}>{row.inDeg}</td>
              <td style={VISIBLE_TD_STYLE}>{row.outDeg}</td>
              {hasWeights && (
                <td style={VISIBLE_TD_STYLE}>{fmt(row.wDegree)}</td>
              )}
              {hasWeights && (
                <td style={VISIBLE_TD_STYLE}>{fmt(row.wInDeg)}</td>
              )}
              {hasWeights && (
                <td style={VISIBLE_TD_STYLE}>{fmt(row.wOutDeg)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <button
          type="button"
          className="semiotic-accessible-data-table-show-more"
          onClick={showMore}
          style={SHOW_MORE_BUTTON_STYLE}
        >
          Show {Math.min(PAGE_SIZE, remaining)} more{" "}
          {remaining === 1 ? "node" : "nodes"} ({remaining} remaining)
        </button>
      )}
    </div>
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
