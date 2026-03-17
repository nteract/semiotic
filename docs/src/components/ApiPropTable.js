import React from "react"

/**
 * Renders a prop table from TypeDoc JSON for a given component.
 * Falls back to a simple display if JSON is not available.
 */
export function ApiPropTable({ componentName, apiData }) {
  if (!apiData) {
    return <p>API data not available. Run <code>npm run docs:api:json</code> to generate.</p>
  }

  // Find the component's props interface in TypeDoc JSON
  const propsInterface = findPropsInterface(apiData, componentName)
  if (!propsInterface) {
    return <p>No props found for {componentName}.</p>
  }

  const props = extractProps(propsInterface)

  return (
    <div className="api-prop-table-wrapper" style={{ overflowX: "auto" }}>
      <table className="api-prop-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop, index) => (
            <tr key={prop.name} style={{ borderBottom: "1px solid var(--surface-3)", background: index % 2 !== 0 ? "var(--surface-1)" : "transparent" }}>
              <td style={tdStyle}>
                <code style={{ fontFamily: "var(--font-code)", fontSize: "0.9em" }}>{prop.name}</code>
                {prop.required && <span style={{ color: "#e53e3e", marginLeft: 4 }}>*</span>}
              </td>
              <td style={tdStyle}><code style={{ fontSize: 12 }}>{prop.type}</code></td>
              <td style={tdStyle}>{prop.defaultValue ? <code>{prop.defaultValue}</code> : <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>}</td>
              <td style={tdStyle}>{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: 13,
  position: "sticky",
  top: 0,
  background: "var(--surface-2)",
  borderBottom: "1px solid var(--surface-3)",
}

const tdStyle = {
  padding: "6px 12px",
  fontSize: 13,
  verticalAlign: "top",
  borderBottom: "1px solid var(--surface-3)",
}

// Map components whose props interface names do not follow the `${componentName}Props` convention
const COMPONENT_PROPS_NAME_MAP = {
  RealtimeHistogram: "RealtimeTemporalHistogramProps",
}

function findPropsInterface(apiData, componentName) {
  const propsName = COMPONENT_PROPS_NAME_MAP[componentName] || `${componentName}Props`
  // Search through TypeDoc children recursively
  function search(node) {
    if (!node) return null
    if (node.name === propsName && (node.kindString === "Interface" || node.kind === 256)) return node
    if (node.children) {
      for (const child of node.children) {
        const found = search(child)
        if (found) return found
      }
    }
    return null
  }
  return search(apiData)
}

function extractProps(iface) {
  if (!iface.children) return []
  return iface.children
    .filter((c) => c.kindString === "Property" || c.kind === 1024)
    .map((c) => ({
      name: c.name,
      type: formatType(c.type),
      description: c.comment?.summary?.map((s) => s.text).join("") || "",
      defaultValue: c.comment?.blockTags?.find((t) => t.tag === "@default")?.content?.map((s) => s.text).join("") || "",
      required: !c.flags?.isOptional,
    }))
}

function formatType(type) {
  if (!type) return "unknown"
  if (type.type === "intrinsic") return type.name
  if (type.type === "literal") return JSON.stringify(type.value)
  if (type.type === "union") return type.types.map(formatType).join(" | ")
  if (type.type === "reference") return type.name + (type.typeArguments ? `<${type.typeArguments.map(formatType).join(", ")}>` : "")
  if (type.type === "array") return `${formatType(type.elementType)}[]`
  if (type.type === "reflection") return "object"
  if (type.type === "intersection") return type.types.map(formatType).join(" & ")
  if (type.type === "tuple") return `[${type.elements.map(formatType).join(", ")}]`
  return type.name || "unknown"
}

export default ApiPropTable
