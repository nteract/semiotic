import * as React from "react"
import type { SentenceFilterNumberDefinition, SentenceFilterRangeDefinition } from "./sentenceFilterTypes"
import type { ControlProps } from "./sentenceFilterOptions"
import { fieldStyle, visuallyHiddenStyle } from "./sentenceFilterStyles"

/** Keep incomplete native number edits local while publishing only finite, bounded values. */
function NumberInput({
  value, onValue, min, max, ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max"> & {
  value: number
  min?: number
  max?: number
  onValue: (value: number) => void
}) {
  const [draft, setDraft] = React.useState(String(value))
  const emittedValue = React.useRef(value)
  React.useEffect(() => {
    // A parent's acknowledgement must not discard an unfinished draft (e.g. 1e-).
    if (!Object.is(value, emittedValue.current)) setDraft(String(value))
    emittedValue.current = value
  }, [value])

  const publish = (text: string) => {
    if (!text.trim()) return null
    const parsed = Number(text)
    if (!Number.isFinite(parsed)) return null
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
    emittedValue.current = next
    if (!Object.is(next, value)) onValue(next)
    return next
  }
  const commit = () => setDraft(String(publish(draft) ?? value))
  return (
    <input
      {...props}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => {
        const text = event.currentTarget.value
        setDraft(text)
        publish(text)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}

export function NumberControl({ value, definition, setValue }: ControlProps) {
  const number = definition as SentenceFilterNumberDefinition
  const mode = number.inputMode ?? "input"
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : number.min ?? 0
  const shared = {
    min: number.min,
    max: number.max,
    step: number.step ?? 1,
    value: numericValue,
  }
  return (
    <>
      {mode !== "slider" ? (
        <NumberInput
          {...shared}
          onValue={(next) => setValue(next, "input")}
          data-sentence-filter-autofocus
          aria-label={number.label}
          style={fieldStyle}
        />
      ) : null}
      {mode !== "input" ? (
        <input
          {...shared}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber
            if (Number.isFinite(next)) setValue(next, "input")
          }}
          data-sentence-filter-autofocus={mode === "slider" ? "" : undefined}
          type="range"
          aria-label={number.label}
          style={{ width: "100%" }}
        />
      ) : null}
    </>
  )
}

export function RangeControl({ value, definition, setValue }: ControlProps) {
  const range = definition as SentenceFilterRangeDefinition
  const current = Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === "number" && Number.isFinite(part))
    ? value as [number, number]
    : [range.min, range.max] as [number, number]
  const update = (part: 0 | 1, next: number) => {
    if (!Number.isFinite(next)) return
    const bounded = Math.min(range.max, Math.max(range.min, next))
    setValue(
      part === 0
        ? [Math.min(bounded, current[1]), current[1]]
        : [current[0], Math.max(bounded, current[0])],
      "input",
    )
  }
  const inputProps = { step: range.step ?? 1 }
  return (
    <>
      <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <span>Minimum</span>
          <NumberInput
            {...inputProps}
            min={range.min}
            max={current[1]}
            data-sentence-filter-autofocus
            value={current[0]}
            onValue={(next) => update(0, next)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span>Maximum</span>
          <NumberInput
            {...inputProps}
            min={current[0]}
            max={range.max}
            value={current[1]}
            onValue={(next) => update(1, next)}
            style={fieldStyle}
          />
        </label>
      </span>
      <label>
        <span style={visuallyHiddenStyle}>Minimum {range.label}</span>
        <input
          {...inputProps}
          min={range.min}
          max={current[1]}
          type="range"
          value={current[0]}
          onChange={(event) => update(0, event.currentTarget.valueAsNumber)}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        <span style={visuallyHiddenStyle}>Maximum {range.label}</span>
        <input
          {...inputProps}
          min={current[0]}
          max={range.max}
          type="range"
          value={current[1]}
          onChange={(event) => update(1, event.currentTarget.valueAsNumber)}
          style={{ width: "100%" }}
        />
      </label>
    </>
  )
}
