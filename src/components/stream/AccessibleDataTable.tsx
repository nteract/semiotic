"use client"
import * as React from "react"
import { useDataSummary } from "../DataSummaryContext"

/** Scene node type used by the accessible data table — accepts any frame's scene nodes */
type AnySceneNode = { type: string; [key: string]: any }

const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
}

// ── Aria-label helpers ──────────────────────────────────────────────────

/**
 * Compute an aria-label describing the chart type and data shape from the scene graph.
 */
export function computeCanvasAriaLabel(
  scene: AnySceneNode[],
  chartType: string
): string {
  if (!scene || scene.length === 0) return `${chartType}, empty`

  const typeCounts: Record<string, number> = {}
  for (const node of scene) {
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1
  }

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
    geoarea: "regions",
  }

  // Sort by a fixed type order for stable aria-label output
  const typeOrder = ["point", "line", "area", "rect", "heatcell", "circle", "candlestick", "wedge", "arc", "geoarea"]
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

// ── Data extraction from scene nodes ────────────────────────────────────

interface DataRow { label: string; values: Record<string, string | number> }

/** Extract a flat list of typed rows from scene nodes, preserving raw numeric values.
 *  Defensively handles missing/malformed data — never throws. */
function extractAllRows(scene: AnySceneNode[]): DataRow[] {
  const rows: DataRow[] = []
  if (!Array.isArray(scene)) return rows

  for (const node of scene) {
    if (!node || typeof node !== "object") continue
    try {
      switch (node.type) {
        case "point":
          rows.push({ label: "Point", values: { x: node.x, y: node.y } })
          break
        case "line": {
          const path = node.path
          const data = Array.isArray(node.datum) ? node.datum : []
          if (!Array.isArray(path)) break
          for (let i = 0; i < path.length && i < data.length; i++) {
            const pt = path[i]
            if (!Array.isArray(pt)) continue
            rows.push({ label: "Line point", values: { x: pt[0], y: pt[1] } })
          }
          break
        }
        case "area": {
          const topPath = node.topPath
          const data = Array.isArray(node.datum) ? node.datum : []
          if (!Array.isArray(topPath)) break
          for (let i = 0; i < topPath.length && i < data.length; i++) {
            const pt = topPath[i]
            if (!Array.isArray(pt)) continue
            rows.push({ label: "Area point", values: { x: pt[0], y: pt[1] } })
          }
          break
        }
        case "rect": {
          const datum = (node.datum != null && typeof node.datum === "object") ? node.datum : {}
          const category = datum.category ?? node.group ?? ""
          const rawValue = datum.value ?? datum.__aggregateValue ?? datum.total
          rows.push({ label: "Bar", values: { category, value: rawValue ?? "" } })
          break
        }
        case "heatcell":
          rows.push({ label: "Cell", values: { x: node.x, y: node.y, value: node.value } })
          break
        case "wedge":
          rows.push({
            label: "Wedge",
            values: {
              category: node.datum?.category ?? node.datum?.label ?? "",
              value: node.datum?.value ?? "",
            },
          })
          break
        case "circle":
          rows.push({
            label: "Node",
            values: { id: node.datum?.id ?? "", x: node.cx ?? node.x, y: node.cy ?? node.y },
          })
          break
        case "arc":
          rows.push({
            label: "Arc",
            values: { id: node.datum?.id ?? "", x: node.cx ?? node.x, y: node.cy ?? node.y },
          })
          break
        case "candlestick":
          rows.push({
            label: "Candlestick",
            values: { x: node.x, open: node.open, high: node.high, low: node.low, close: node.close },
          })
          break
        case "geoarea":
          rows.push({
            label: "Region",
            values: {
              name: node.datum?.properties?.name ?? node.datum?.name ?? "",
              value: node.datum?.value ?? "",
            },
          })
          break
        // Unknown types are silently skipped
      }
    } catch {
      // Malformed node — skip rather than crash the panel
    }
  }
  return rows
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
      let min = nums[0], max = nums[0], sum = 0
      for (const n of nums) {
        if (n < min) min = n
        if (n > max) max = n
        sum += n
      }
      stats.push({ name, count: nums.length, numeric: true, min, max, mean: sum / nums.length })
    } else if (strs.size > 0) {
      const unique = Array.from(strs)
      stats.push({ name, count: unique.length, numeric: false, uniqueValues: unique.slice(0, 5) })
    }
  }

  return stats
}

/** Format a summary string from field stats. */
function formatSummary(totalRows: number, fieldStats: FieldStats[]): string {
  const parts: string[] = [`${totalRows} data points.`]

  for (const fs of fieldStats) {
    if (fs.numeric) {
      parts.push(`${fs.name}: ${fmt(fs.min)} to ${fmt(fs.max)}, mean ${fmt(fs.mean)}.`)
    } else {
      const vals = fs.uniqueValues!
      const label = vals.length <= 3 ? vals.join(", ") : `${vals.slice(0, 3).join(", ")}… (${fs.count} unique)`
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
}

const SAMPLE_SIZE = 5

const VISIBLE_PANEL_STYLE: React.CSSProperties = {
  position: "relative",
  zIndex: 5,
  padding: "14px 16px 12px",
  borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
  fontFamily: "var(--semiotic-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--semiotic-text, #333)",
  background: "var(--semiotic-bg, #fff)",
  borderRadius: "var(--semiotic-border-radius, 0px) var(--semiotic-border-radius, 0px) 0 0",
}

const SUMMARY_NOTE_STYLE: React.CSSProperties = {
  marginBottom: 8,
  paddingRight: 28,
  color: "var(--semiotic-text-secondary, #666)",
  fontSize: 12,
  letterSpacing: "0.01em",
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
  border: "1px solid var(--semiotic-border, #e0e0e0)",
  background: "var(--semiotic-bg, #fff)",
  cursor: "pointer",
  color: "var(--semiotic-text-secondary, #666)",
  fontSize: 13,
  lineHeight: 1,
  padding: 0,
  borderRadius: "var(--semiotic-border-radius, 4px)",
}

const VISIBLE_TABLE_STYLE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
}

const VISIBLE_TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "5px 10px",
  borderBottom: "2px solid var(--semiotic-border, #e0e0e0)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  color: "var(--semiotic-text-secondary, #666)",
}

const VISIBLE_TD_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
}

const CAPTION_STYLE: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  color: "var(--semiotic-text-secondary, #999)",
  marginBottom: 4,
  fontStyle: "italic",
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
 * computes a statistical summary (.describe()-style) and shows 5 sample rows.
 */
export function AccessibleDataTable({ scene, chartType, tableId }: AccessibleDataTableProps) {
  const [srExpanded, setSrExpanded] = React.useState(false)
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)

  // When the skip link targets this element, expand visibly.
  const handleFocus = React.useCallback(() => {
    if (!srExpanded && !visible) setSrExpanded(true)
  }, [srExpanded, visible])

  // Collapse when focus leaves the panel entirely (not for context-controlled mode).
  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    if (visible) return // ChartContainer controls visibility
    // Check if focus moved to another element inside this container
    if (containerRef.current?.contains(e.relatedTarget as Node)) return
    setSrExpanded(false)
  }, [visible])

  if (!scene || scene.length === 0) {
    return tableId ? <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} /> : null
  }

  const totalCount = scene.length

  if (!isExpanded) {
    return (
      <div id={tableId} tabIndex={-1} onFocus={handleFocus} style={SR_ONLY_STYLE} role="region" aria-label={`Data summary for ${chartType}`}>
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
  const sampleRows = allRows.slice(0, SAMPLE_SIZE)

  const columnSet = new Set<string>()
  for (const r of sampleRows) {
    for (const k of Object.keys(r.values)) columnSet.add(k)
  }
  const columns = Array.from(columnSet)

  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
  }

  return (
    <div ref={containerRef} id={tableId} tabIndex={-1} onBlur={handleBlur} style={VISIBLE_PANEL_STYLE} role="region" aria-label={`Data summary for ${chartType}`}>
      <button type="button" onClick={dismiss} aria-label="Close data summary" style={CLOSE_BUTTON_STYLE}>&times;</button>
      <div role="note" style={SUMMARY_NOTE_STYLE}>{summary}</div>
      <table role="table" aria-label={`Sample data for ${chartType}`} style={VISIBLE_TABLE_STYLE}>
        <caption style={CAPTION_STYLE}>
          First {sampleRows.length} of {allRows.length} data points
        </caption>
        <thead>
          <tr>
            <th style={VISIBLE_TH_STYLE}>type</th>
            {columns.map((c) => (
              <th key={c} style={VISIBLE_TH_STYLE}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((r, i) => (
            <tr key={i}>
              <td style={VISIBLE_TD_STYLE}>{r.label}</td>
              {columns.map((c) => (
                <td key={c} style={VISIBLE_TD_STYLE}>{fmtCell(r.values[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── NetworkAccessibleDataTable ──────────────────────────────────────────

interface NetworkAccessibleDataTableProps {
  nodes: Array<{ datum?: any; id?: string; cx?: number; cy?: number; x?: number; y?: number }>
  edges: Array<{ datum?: any; source?: string; target?: string }>
  chartType: string
  tableId?: string
}

/**
 * JIT accessible data summary for network charts.
 */
export function NetworkAccessibleDataTable({ nodes, edges, chartType, tableId }: NetworkAccessibleDataTableProps) {
  const [srExpanded, setSrExpanded] = React.useState(false)
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleFocus = React.useCallback(() => {
    if (!srExpanded && !visible) setSrExpanded(true)
  }, [srExpanded, visible])

  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    if (visible) return
    if (containerRef.current?.contains(e.relatedTarget as Node)) return
    setSrExpanded(false)
  }, [visible])

  if (!nodes || nodes.length === 0) {
    return tableId ? <span id={tableId} tabIndex={-1} style={SR_ONLY_STYLE} /> : null
  }

  if (!isExpanded) {
    return (
      <div id={tableId} tabIndex={-1} onFocus={handleFocus} style={SR_ONLY_STYLE} role="region" aria-label={`Data summary for ${chartType}`}>
        <button type="button" onClick={() => setSrExpanded(true)}>
          View data summary ({nodes.length} nodes, {edges.length} edges)
        </button>
      </div>
    )
  }

  // JIT: compute stats on activation — defensive against weird data shapes
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const safeEdges = Array.isArray(edges) ? edges : []

  const xVals: number[] = []
  const yVals: number[] = []
  for (const n of safeNodes) {
    if (!n || typeof n !== "object") continue
    const x = n.cx ?? n.x
    const y = n.cy ?? n.y
    if (typeof x === "number" && !Number.isNaN(x) && Number.isFinite(x)) xVals.push(x)
    if (typeof y === "number" && !Number.isNaN(y) && Number.isFinite(y)) yVals.push(y)
  }

  const rangePart = (name: string, vals: number[]) => {
    if (vals.length === 0) return ""
    let min = vals[0], max = vals[0]
    for (const v of vals) { if (v < min) min = v; if (v > max) max = v }
    return `${name}: ${fmt(min)} to ${fmt(max)}.`
  }

  // Degree distribution
  const degreeMap = new Map<string, number>()
  for (const e of safeEdges) {
    if (!e || typeof e !== "object") continue
    const src = typeof e.source === "object" ? (e.source as any)?.id : e.source
    const tgt = typeof e.target === "object" ? (e.target as any)?.id : e.target
    if (src != null && src !== "") degreeMap.set(String(src), (degreeMap.get(String(src)) ?? 0) + 1)
    if (tgt != null && tgt !== "") degreeMap.set(String(tgt), (degreeMap.get(String(tgt)) ?? 0) + 1)
  }
  const degrees = Array.from(degreeMap.values())
  let avgDegree = 0
  if (degrees.length > 0) {
    let sum = 0
    for (const d of degrees) sum += d
    avgDegree = sum / degrees.length
  }

  const summaryParts = [`${safeNodes.length} nodes, ${safeEdges.length} edges.`]
  const xRange = rangePart("x", xVals)
  const yRange = rangePart("y", yVals)
  if (xRange) summaryParts.push(xRange)
  if (yRange) summaryParts.push(yRange)
  if (degrees.length > 0) summaryParts.push(`Mean degree: ${fmt(avgDegree)}.`)

  const sampleNodes = safeNodes.slice(0, SAMPLE_SIZE)

  const dismiss = () => {
    if (visible && dataSummary) dataSummary.setVisible(false)
    setSrExpanded(false)
  }

  return (
    <div ref={containerRef} id={tableId} tabIndex={-1} onBlur={handleBlur} style={VISIBLE_PANEL_STYLE} role="region" aria-label={`Data summary for ${chartType}`}>
      <button type="button" onClick={dismiss} aria-label="Close data summary" style={CLOSE_BUTTON_STYLE}>&times;</button>
      <div role="note" style={SUMMARY_NOTE_STYLE}>{summaryParts.join(" ")}</div>
      <table role="table" aria-label={`Sample nodes for ${chartType}`} style={VISIBLE_TABLE_STYLE}>
        <caption style={CAPTION_STYLE}>
          First {sampleNodes.length} of {safeNodes.length} nodes
        </caption>
        <thead>
          <tr>
            <th style={VISIBLE_TH_STYLE}>id</th>
            <th style={VISIBLE_TH_STYLE}>x</th>
            <th style={VISIBLE_TH_STYLE}>y</th>
          </tr>
        </thead>
        <tbody>
          {sampleNodes.map((n, i) => (
            <tr key={i}>
              <td style={VISIBLE_TD_STYLE}>{n.datum?.id || n.id || ""}</td>
              <td style={VISIBLE_TD_STYLE}>{fmt(n.cx ?? n.x)}</td>
              <td style={VISIBLE_TD_STYLE}>{fmt(n.cy ?? n.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          left: "4px",
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

// ── AriaLiveTooltip ─────────────────────────────────────────────────────

/**
 * Visually-hidden aria-live region that mirrors tooltip text for screen readers.
 */
export function AriaLiveTooltip({ hoverPoint }: { hoverPoint: any }) {
  let text = ""
  if (hoverPoint) {
    const data = hoverPoint.data || hoverPoint
    if (typeof data === "object") {
      const entries = Object.entries(data).filter(
        ([, v]) => typeof v !== "object" && typeof v !== "function"
      )
      text = `Focused on data point: ${entries.map(([k, v]) => `${k}: ${v}`).join(", ")}`
    } else {
      text = `Focused on data point: ${String(data)}`
    }
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={SR_ONLY_STYLE}
    >
      {text}
    </div>
  )
}

export { SR_ONLY_STYLE }
