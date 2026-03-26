"use client"
import * as React from "react"

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

// ── Helpers ─────────────────────────────────────────────────────────────

const fmt = (v: number | undefined | null): string =>
  String(Math.round((v ?? 0) * 100) / 100)

function extractRow(node: AnySceneNode): { label: string; values: Record<string, string> } | null {
  switch (node.type) {
    case "point":
      return {
        label: "Point",
        values: { x: fmt(node.x), y: fmt(node.y) },
      }
    case "line": {
      // Lines produce multiple rows — handled separately
      return null
    }
    case "area":
      return null // handled separately like line
    case "rect":
      return {
        label: "Bar",
        values: {
          category: node.datum?.category || "",
          value: fmt(node.datum?.value),
        },
      }
    case "heatcell":
      return {
        label: "Cell",
        values: { x: fmt(node.x), y: fmt(node.y), value: fmt(node.value) },
      }
    case "wedge":
      return {
        label: "Wedge",
        values: {
          category: node.datum?.category || node.datum?.label || "",
          value: fmt(node.datum?.value),
        },
      }
    case "circle":
      return {
        label: "Node",
        values: {
          id: node.datum?.id || "",
          x: fmt(node.cx ?? node.x),
          y: fmt(node.cy ?? node.y),
        },
      }
    case "arc":
      return {
        label: "Arc",
        values: {
          id: node.datum?.id || "",
          x: fmt(node.cx ?? node.x),
          y: fmt(node.cy ?? node.y),
        },
      }
    case "candlestick":
      return {
        label: "Candlestick",
        values: {
          x: fmt(node.x),
          open: fmt(node.open),
          high: fmt(node.high),
          low: fmt(node.low),
          close: fmt(node.close),
        },
      }
    case "geoarea":
      return {
        label: "Region",
        values: {
          name: node.datum?.properties?.name || node.datum?.name || "",
          value: node.datum?.value != null ? fmt(node.datum.value) : "",
        },
      }
    default:
      return null
  }
}

function extractLineAreaRows(
  node: AnySceneNode,
  maxRows: number,
  currentCount: number
): Array<{ label: string; values: Record<string, string> }> {
  const rows: Array<{ label: string; values: Record<string, string> }> = []
  const isLine = node.type === "line"
  const path = isLine ? node.path : node.topPath
  const data = Array.isArray(node.datum) ? node.datum : []
  const label = isLine ? "Line point" : "Area point"

  if (!path) return rows

  const limit = Math.min(path.length, data.length, maxRows - currentCount)
  for (let i = 0; i < limit; i++) {
    rows.push({
      label,
      values: {
        x: fmt(path[i][0]),
        y: fmt(path[i][1]),
      },
    })
  }
  return rows
}

/** Count total rows a scene would produce without the maxRows cap */
function countTotalRows(scene: AnySceneNode[]): number {
  let total = 0
  for (const node of scene) {
    if (node.type === "line") {
      const data = Array.isArray(node.datum) ? node.datum : []
      total += Math.min(node.path?.length ?? 0, data.length)
    } else if (node.type === "area") {
      const data = Array.isArray(node.datum) ? node.datum : []
      total += Math.min(node.topPath?.length ?? 0, data.length)
    } else if (extractRow(node) !== null) {
      total += 1
    }
  }
  return total
}

// ── AccessibleDataTable ─────────────────────────────────────────────────

interface AccessibleDataTableProps {
  scene: AnySceneNode[]
  chartType: string
  /** Unique ID for skip-navigation link targeting */
  tableId?: string
}

/**
 * Visually-hidden data table for screen readers, generated from the scene graph.
 * Supports all scene node types. Renders up to 500 rows with a truncation note.
 */
export function AccessibleDataTable({ scene, chartType, tableId }: AccessibleDataTableProps) {
  const maxRows = 500
  const rows: { label: string; values: Record<string, string> }[] = []

  for (const node of scene) {
    if (rows.length >= maxRows) break

    if (node.type === "line" || node.type === "area") {
      const lineRows = extractLineAreaRows(node, maxRows, rows.length)
      rows.push(...lineRows)
    } else {
      const row = extractRow(node)
      if (row) rows.push(row)
    }
  }

  if (rows.length === 0) return null

  // Compute union of all keys across rows
  const columnSet = new Set<string>()
  for (const r of rows) {
    for (const k of Object.keys(r.values)) columnSet.add(k)
  }
  const columns = Array.from(columnSet)

  const totalRows = countTotalRows(scene)

  return (
    <table
      id={tableId}
      style={SR_ONLY_STYLE}
      role="table"
      aria-label={`Data table for ${chartType}`}
    >
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c}>{r.values[c] ?? ""}</td>
            ))}
          </tr>
        ))}
        {totalRows > maxRows && (
          <tr>
            <td colSpan={columns.length}>
              ...and {totalRows - rows.length} more items
            </td>
          </tr>
        )}
      </tbody>
    </table>
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
 * Visually-hidden data table for network charts.
 */
export function NetworkAccessibleDataTable({ nodes, edges, chartType, tableId }: NetworkAccessibleDataTableProps) {
  const maxRows = 500
  const rows: { values: Record<string, string> }[] = []

  for (const node of nodes) {
    if (rows.length >= maxRows) break
    rows.push({
      values: {
        id: node.datum?.id || node.id || "",
        x: fmt(node.cx ?? node.x),
        y: fmt(node.cy ?? node.y),
      },
    })
  }

  if (rows.length === 0) return null

  const columnSet = new Set<string>()
  for (const r of rows) {
    for (const k of Object.keys(r.values)) columnSet.add(k)
  }
  const columns = Array.from(columnSet)

  return (
    <table
      id={tableId}
      style={SR_ONLY_STYLE}
      role="table"
      aria-label={`Data table for ${chartType}`}
    >
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c}>{r.values[c] ?? ""}</td>
            ))}
          </tr>
        ))}
        {nodes.length > maxRows && (
          <tr>
            <td colSpan={columns.length}>
              ...and {nodes.length - maxRows} more items
            </td>
          </tr>
        )}
      </tbody>
    </table>
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
