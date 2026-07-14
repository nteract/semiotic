import React, { useEffect, useId, useRef } from "react"

function columnDefinition(column, index) {
  if (typeof column === "string") return { key: column, label: column }
  return column ?? { key: index, label: `Column ${index + 1}` }
}

function cellValue(row, column, rowIndex) {
  const raw = Array.isArray(row) ? row[column.index] : row?.[column.key]
  return column.format ? column.format(raw, row, rowIndex) : raw
}

/** Accessible, non-modal data-summary dialog with a responsive native table. */
export function DataSummaryPanel({
  open = false,
  title = "Accessible data summary",
  summary,
  columns = [],
  rows = [],
  caption,
  children,
  onClose,
  className = "",
}) {
  const closeRef = useRef(null)
  const priorFocus = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const tableColumns = (Array.isArray(columns) ? columns : []).map((column, index) => ({
    index,
    ...columnDefinition(column, index),
  }))
  const tableRows = Array.isArray(rows) ? rows : []

  useEffect(() => {
    if (open) {
      priorFocus.current = document.activeElement
      closeRef.current?.focus({ preventScroll: true })
      return undefined
    }

    if (priorFocus.current instanceof HTMLElement && priorFocus.current.isConnected) {
      priorFocus.current.focus({ preventScroll: true })
      priorFocus.current = null
    }
    return undefined
  }, [open])

  return (
    <dialog
      open={open}
      className={`aa-data-summary ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={summary ? descriptionId : undefined}
      aria-modal="false"
      onCancel={(event) => {
        event.preventDefault()
        onClose?.("cancel", event)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          onClose?.("escape", event)
        }
      }}
    >
      <header className="aa-data-summary__header">
        <div>
          <span>Reader channel // D</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="aa-icon-button"
          onClick={(event) => onClose?.("close", event)}
          aria-label="Close data summary"
        >
          ×
        </button>
      </header>

      {summary ? (
        <div id={descriptionId} className="aa-data-summary__description">
          {summary}
        </div>
      ) : null}

      {children}

      {tableColumns.length > 0 ? (
        <div
          className="aa-data-summary__table-wrap"
          tabIndex="0"
          role="region"
          aria-label="Data table"
        >
          <table>
            <caption>{caption ?? `${title}: ${tableRows.length} rows`}</caption>
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.align ? `aa-align-${column.align}` : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIndex) => (
                <tr key={row?.id ?? rowIndex}>
                  {tableColumns.map((column, columnIndex) => {
                    const value = cellValue(row, column, rowIndex)
                    const Cell = columnIndex === 0 && column.rowHeader !== false ? "th" : "td"
                    return (
                      <Cell
                        key={column.key}
                        scope={Cell === "th" ? "row" : undefined}
                        className={column.align ? `aa-align-${column.align}` : undefined}
                      >
                        {value == null ? "—" : value}
                      </Cell>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tableColumns.length > 0 && tableRows.length === 0 ? (
        <p className="aa-data-summary__empty">No observations in the current scope.</p>
      ) : null}
    </dialog>
  )
}

export default DataSummaryPanel
