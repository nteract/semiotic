"use client"
import * as React from "react"
import type { NetworkPerspectiveName } from "../networkPerspective"

const LABELS: Record<NetworkPerspectiveName, string> = {
  flat: "Flat",
  isometric: "Isometric",
  pixel: "Pixel",
  dimetric: "Dimetric",
  military: "Military",
  cabinet: "Cabinet"
}

export interface PerspectiveToggleProps {
  value: NetworkPerspectiveName
  onChange: (value: NetworkPerspectiveName) => void
  /** Choices, in order. @default ["flat", "isometric"] */
  options?: NetworkPerspectiveName[]
  /** Accessible group name. @default "Perspective" */
  label?: string
  className?: string
  style?: React.CSSProperties
}

const buttonStyle = (checked: boolean): React.CSSProperties => ({
  minWidth: 44,
  minHeight: 44,
  padding: "4px 12px",
  font: "inherit",
  border: "1px solid var(--semiotic-border, #b6c4ce)",
  background: checked ? "var(--semiotic-primary, #4e79a7)" : "var(--semiotic-bg, #fff)",
  color: checked ? "var(--semiotic-bg, #fff)" : "inherit",
  cursor: "pointer"
})

/**
 * Accessible segmented control for switching a chart's `perspective`
 * (a radio group with roving focus and arrow-key selection). Pair with
 * `perspective={{ type: value, transition: true }}` for an animated switch.
 */
export function PerspectiveToggle({
  value,
  onChange,
  options = ["flat", "isometric"],
  label = "Perspective",
  className,
  style
}: PerspectiveToggleProps): React.ReactElement {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([])
  const select = (index: number) => {
    const next = (index + options.length) % options.length
    onChange(options[next])
    refs.current[next]?.focus()
  }
  const current = Math.max(0, options.indexOf(value))
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={className}
      style={{ display: "inline-flex", gap: 0, ...style }}
      onKeyDown={(event) => {
        const delta =
          event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1
              : 0
        if (event.key === "Home") select(0)
        else if (event.key === "End") select(options.length - 1)
        else if (delta) select(current + delta)
        else return
        event.preventDefault()
      }}
    >
      {options.map((option, index) => (
        <button
          key={option}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="button"
          role="radio"
          aria-checked={option === value}
          tabIndex={index === current ? 0 : -1}
          onClick={() => onChange(option)}
          style={{
            ...buttonStyle(option === value),
            borderRadius:
              index === 0 ? "6px 0 0 6px" : index === options.length - 1 ? "0 6px 6px 0" : 0,
            marginLeft: index ? -1 : 0
          }}
        >
          {LABELS[option] ?? option}
        </button>
      ))}
    </div>
  )
}
