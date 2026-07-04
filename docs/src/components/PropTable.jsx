import React from "react"

const typeColors = {
  string: { background: "#dbeafe", color: "#1e40af" },
  number: { background: "#dcfce7", color: "#166534" },
  function: { background: "#f3e8ff", color: "#6b21a8" },
  object: { background: "#ffedd5", color: "#9a3412" },
  array: { background: "#cffafe", color: "#155e75" },
  boolean: { background: "#fce7f3", color: "#9d174d" },
}

const defaultTypeColor = { background: "#f3f4f6", color: "#374151" }

function TypeBadge({ type }) {
  const colors = typeColors[type] || defaultTypeColor
  const normalizedClass = `type-${type.toLowerCase().replace(/[^a-z0-9]/g, "-")}`

  return (
    <span
      className={`type-badge ${normalizedClass}`}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.8em",
        fontWeight: 500,
        background: colors.background,
        color: colors.color,
      }}
    >
      {type}
    </span>
  )
}

function PropRow({ prop, isOdd }) {
  const { name, type, required, default: defaultValue, description } = prop

  const hasDefault =
    defaultValue !== undefined && defaultValue !== null && defaultValue !== ""

  return (
    <tr
      data-prop={name}
      data-required={required ? "true" : "false"}
      style={{
        background: isOdd ? "var(--surface-1)" : "transparent",
      }}
    >
      <td
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--surface-3)",
        }}
      >
        <code
          style={{
            fontFamily: "var(--font-code)",
            fontSize: "0.9em",
          }}
        >
          {name}
        </code>
      </td>
      <td
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--surface-3)",
        }}
      >
        <TypeBadge type={type} />
      </td>
      <td
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--surface-3)",
          color: required ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        {required ? "Yes" : "\u2014"}
      </td>
      <td
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--surface-3)",
        }}
      >
        {hasDefault ? (
          <code
            style={{
              fontFamily: "var(--font-code)",
              fontSize: "0.9em",
            }}
          >
            {defaultValue}
          </code>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>
        )}
      </td>
      <td
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--surface-3)",
        }}
      >
        {description}
      </td>
    </tr>
  )
}

export default function PropTable({ componentName, props }) {
  return (
    <div
      className="prop-table-wrapper"
      data-component={componentName}
      data-section="props"
      style={{
        overflowX: "auto",
      }}
    >
      <table
        data-component={componentName}
        className="prop-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--surface-2)",
            }}
          >
            {["Prop", "Type", "Required", "Default", "Description"].map(
              (heading) => (
                <th
                  key={heading}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    background: "var(--surface-2)",
                    borderBottom: "1px solid var(--surface-3)",
                  }}
                >
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {props.map((prop, index) => (
            <PropRow key={prop.name} prop={prop} isOdd={index % 2 !== 0} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
