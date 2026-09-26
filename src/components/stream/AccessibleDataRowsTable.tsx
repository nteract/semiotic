import * as React from "react"
import type { DataRow } from "./accessibleDataRows"
import { fmtCell } from "./accessibleDataTableModel"
import {
  VISIBLE_TABLE_STYLE,
  VISIBLE_TH_STYLE,
  VISIBLE_TD_STYLE,
  CAPTION_STYLE
} from "./accessibleTableStyles"

/** Shared semantic cells keep paging and row focus consistent across families. */
export function AccessibleDataRowsTable({
  rows,
  label,
  caption,
  typeLabel,
  labelRows = false,
  className = "semiotic-accessible-data-table-table",
  style,
  extraColumns = []
}: {
  rows: DataRow[]
  label: string
  caption: string
  typeLabel: string
  labelRows?: boolean
  className?: string
  style?: React.CSSProperties
  extraColumns?: { label: string; values: number[] }[]
}) {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.values)))
  )
  return (
    <table
      className={className}
      role="table"
      aria-label={label}
      style={style ?? VISIBLE_TABLE_STYLE}
    >
      <caption
        className="semiotic-accessible-data-table-caption"
        style={CAPTION_STYLE}
      >
        {caption}
      </caption>
      <thead>
        <tr>
          {[
            typeLabel,
            ...columns,
            ...extraColumns.map((column) => column.label)
          ].map((column, index) => (
            <th key={index} style={VISIBLE_TH_STYLE}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={index}
            tabIndex={-1}
            aria-label={labelRows ? row.label : undefined}
          >
            <td style={VISIBLE_TD_STYLE}>{row.label}</td>
            {columns.map((column) => (
              <td key={column} style={VISIBLE_TD_STYLE}>
                {fmtCell(row.values[column])}
              </td>
            ))}
            {extraColumns.map((column, extraIndex) => (
              <td key={extraIndex} style={VISIBLE_TD_STYLE}>
                {fmtCell(column.values[index])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
