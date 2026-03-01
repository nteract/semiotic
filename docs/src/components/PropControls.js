import React from "react"

/**
 * Generic control panel for playground pages.
 * Renders form controls from a declarative schema.
 *
 * Props:
 *   controls  - Array of control schema objects
 *   values    - Current values object
 *   onChange  - (name, value) => void
 *   onReset   - () => void
 */
export default function PropControls({ controls, values, onChange, onReset }) {
  // Group controls by their `group` field
  const groups = []
  const groupMap = {}
  for (const control of controls) {
    const g = control.group || "General"
    if (!groupMap[g]) {
      groupMap[g] = []
      groups.push(g)
    }
    groupMap[g].push(control)
  }

  return (
    <div className="playground-controls">
      {groups.map((group) => (
        <div key={group}>
          <div className="playground-group-header">{group}</div>
          <div className="playground-controls-grid">
            {groupMap[group].map((control) => (
              <ControlRow
                key={control.name}
                control={control}
                value={values[control.name]}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="playground-toolbar">
        <button
          className="playground-reset-button"
          onClick={onReset}
        >
          Reset Defaults
        </button>
      </div>
    </div>
  )
}

function ControlRow({ control, value, onChange }) {
  const { name, type, label } = control

  return (
    <div className="playground-control-row">
      <label className="playground-control-label" htmlFor={`pg-${name}`}>
        {label}
      </label>
      <div className="playground-control-input">
        {type === "number" && (
          <NumberControl control={control} value={value} onChange={onChange} />
        )}
        {type === "boolean" && (
          <BooleanControl control={control} value={value} onChange={onChange} />
        )}
        {type === "select" && (
          <SelectControl control={control} value={value} onChange={onChange} />
        )}
        {type === "string" && (
          <StringControl control={control} value={value} onChange={onChange} />
        )}
        {type === "color" && (
          <ColorControl control={control} value={value} onChange={onChange} />
        )}
      </div>
    </div>
  )
}

function NumberControl({ control, value, onChange }) {
  const { name, min, max, step } = control
  return (
    <div className="playground-range">
      <input
        id={`pg-${name}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
      />
      <input
        type="number"
        className="playground-number-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(name, v)
        }}
      />
    </div>
  )
}

function BooleanControl({ control, value, onChange }) {
  const { name } = control
  return (
    <button
      id={`pg-${name}`}
      className={`playground-toggle${value ? " active" : ""}`}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(name, !value)}
    >
      <span className="playground-toggle-label">{value ? "On" : "Off"}</span>
    </button>
  )
}

function SelectControl({ control, value, onChange }) {
  const { name, options } = control
  return (
    <select
      id={`pg-${name}`}
      className="playground-select"
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function StringControl({ control, value, onChange }) {
  const { name } = control
  return (
    <input
      id={`pg-${name}`}
      type="text"
      className="playground-text-input"
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={`Enter ${control.label.toLowerCase()}...`}
    />
  )
}

function ColorControl({ control, value, onChange }) {
  const { name } = control
  return (
    <div className="playground-color-wrapper">
      <input
        id={`pg-${name}`}
        type="color"
        className="playground-color-input"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
      <span className="playground-color-value">{value}</span>
    </div>
  )
}
