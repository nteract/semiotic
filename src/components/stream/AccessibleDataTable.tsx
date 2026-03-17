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
  }

  for (const [type, count] of Object.entries(typeCounts)) {
    const label = typeLabels[type] || type
    parts.push(`${count} ${label}`)
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

interface AccessibleDataTableProps {
  scene: AnySceneNode[]
  chartType: string
}

/**
 * Visually-hidden data table for screen readers, generated from the scene graph.
 * Renders up to 50 rows with a truncation note.
 */
export function AccessibleDataTable({ scene, chartType }: AccessibleDataTableProps) {
  const maxRows = 50
  const rows: { label: string; values: Record<string, string> }[] = []

  for (const node of scene) {
    if (rows.length >= maxRows) break
    if (node.type === "point") {
      rows.push({
        label: "Point",
        values: {
          x: String(Math.round(node.x * 100) / 100),
          y: String(Math.round(node.y * 100) / 100),
        },
      })
    } else if (node.type === "rect") {
      rows.push({
        label: "Bar",
        values: {
          category: node.datum?.category || "",
          value: String(Math.round((node.datum?.value ?? 0) * 100) / 100),
        },
      })
    } else if (node.type === "heatcell") {
      rows.push({
        label: "Cell",
        values: {
          x: String(Math.round(node.x * 100) / 100),
          y: String(Math.round(node.y * 100) / 100),
          value: String(Math.round((node.value ?? 0) * 100) / 100),
        },
      })
    }
  }

  if (rows.length === 0) return null

  const columns = Object.keys(rows[0].values)

  return (
    <table style={SR_ONLY_STYLE} role="table" aria-label={`Data table for ${chartType}`}>
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
              <td key={c}>{r.values[c]}</td>
            ))}
          </tr>
        ))}
        {scene.length > maxRows && (
          <tr>
            <td colSpan={columns.length}>
              ...and {scene.length - maxRows} more items
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

interface NetworkAccessibleDataTableProps {
  nodes: Array<{ datum?: any; id?: string; cx?: number; cy?: number; x?: number; y?: number }>
  edges: Array<{ datum?: any; source?: string; target?: string }>
  chartType: string
}

/**
 * Visually-hidden data table for network charts.
 */
export function NetworkAccessibleDataTable({ nodes, edges, chartType }: NetworkAccessibleDataTableProps) {
  const maxRows = 50
  const rows: { values: Record<string, string> }[] = []

  for (const node of nodes) {
    if (rows.length >= maxRows) break
    rows.push({
      values: {
        id: node.datum?.id || node.id || "",
        x: String(Math.round((node.cx ?? node.x ?? 0) * 100) / 100),
        y: String(Math.round((node.cy ?? node.y ?? 0) * 100) / 100),
      },
    })
  }

  if (rows.length === 0) return null

  const columns = Object.keys(rows[0].values)

  return (
    <table style={SR_ONLY_STYLE} role="table" aria-label={`Data table for ${chartType}`}>
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
              <td key={c}>{r.values[c]}</td>
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
