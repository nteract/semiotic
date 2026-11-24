"use client"
import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import { SR_ONLY_STYLE } from "../../screenReaderStyles"

interface MatrixGridProps {
  fields: string[]
  labelFor: (field: string) => string
  cellSize: number
  cellGap: number
  labelWidth: number
  brush: boolean
  onMouseLeave?: () => void
  children: (
    rowField: string,
    row: number,
    colField: string,
    col: number,
    label: string
  ) => ReactNode
}

export function MatrixGrid({
  fields,
  labelFor,
  cellSize,
  cellGap,
  labelWidth,
  brush,
  onMouseLeave,
  children
}: MatrixGridProps) {
  const [active, setActive] = useState([fields[0], fields[0]])
  const helpId = useId()
  const n = fields.length
  const cells = `repeat(${n}, ${cellSize}px)`
  const [activeRow, activeCol] = active.every(field => fields.includes(field))
    ? active : [fields[0], fields[0]]
  const labelStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: "bold",
    color: "var(--semiotic-text, #333)"
  }

  function onKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    row: number,
    col: number
  ) {
    const cell = event.currentTarget
    if (event.target !== cell) {
      if (event.key === "Escape") cell.focus()
      return
    }
    if (event.key === "Enter") {
      const control = cell.querySelector<HTMLElement>(
        brush ? 'svg[role="region"]' : ".stream-xy-frame"
      )
      if (control) {
        event.preventDefault()
        control.focus()
      }
      return
    }
    switch (event.key) {
      case "ArrowLeft":
        col--
        break
      case "ArrowRight":
        col++
        break
      case "ArrowUp":
        row--
        break
      case "ArrowDown":
        row++
        break
      case "Home":
        col = 0
        break
      case "End":
        col = n - 1
        break
      default:
        return
    }
    event.preventDefault()
    const targets = cell.closest('[role="grid"]')?.querySelectorAll<HTMLElement>('[role="gridcell"]')
    if (row >= 0 && col >= 0 && col < n) targets?.[row * n + col]?.focus()
  }

  return (
    <>
      <span hidden id={helpId}>
        Use arrow keys to move between cells. Enter explores a scatterplot.
        Escape returns to its cell.
      </span>
      <div
        role="grid"
        aria-label="Scatterplot matrix"
        aria-describedby={helpId}
        onMouseLeave={onMouseLeave}
        style={{
          display: "grid",
          gridTemplateColumns: `${labelWidth}px ${cells}`,
          gridTemplateRows: `${cells} ${labelWidth}px`,
          gap: cellGap,
          width: "fit-content"
        }}
      >
        {fields.map((rowField, row) => (
          <div role="row" key={rowField} style={{ display: "contents" }}>
            <div
              role="rowheader"
              style={{
                ...labelStyle,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)"
              }}
            >
              {labelFor(rowField)}
            </div>
            {fields.map((colField, col) => {
              const label = row === col ? labelFor(rowField) : `${labelFor(colField)} versus ${labelFor(rowField)}`
              return (
                <div
                  role="gridcell"
                  key={colField}
                  aria-label={label}
                  tabIndex={rowField === activeRow && colField === activeCol ? 0 : -1}
                  onFocus={() => setActive([rowField, colField])}
                  onKeyDownCapture={(event) => onKeyDown(event, row, col)}
                >
                  {children(rowField, row, colField, col, label)}
                </div>
              )
            })}
          </div>
        ))}
        <div role="row" style={{ display: "contents" }}>
          <div role="columnheader"><span style={SR_ONLY_STYLE}>Fields</span></div>
          {fields.map((field) => (
            <div key={field} role="columnheader" style={labelStyle}>
              {labelFor(field)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
