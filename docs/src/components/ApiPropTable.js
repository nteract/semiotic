import React from "react"
import { extractProps, findPropsInterface, getComponentDocs } from "./apiDocs"

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
                {prop.inheritedFrom && (
                  <div style={metaStyle}>from {prop.inheritedFrom}</div>
                )}
              </td>
              <td style={tdStyle}><code style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{prop.type}</code></td>
              <td style={tdStyle}>{prop.defaultValue ? <code>{prop.defaultValue}</code> : <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>}</td>
              <td style={tdStyle}>
                {prop.description}
                {prop.examples.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={summaryStyle}>Example</summary>
                    {prop.examples.map((example, exampleIndex) => (
                      <pre key={exampleIndex} style={preStyle}><code>{example}</code></pre>
                    ))}
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ApiComponentDocs({ componentName, apiData, fallbackSummary = "" }) {
  const docs = getComponentDocs(apiData, componentName)
  const summary = docs?.summary || fallbackSummary
  if (!summary && !docs?.examples?.length) return null

  return (
    <div style={componentDocsStyle}>
      {summary && <p style={componentSummaryStyle}>{summary}</p>}
      {docs?.examples?.length > 0 && (
        <details>
          <summary style={summaryStyle}>Component example</summary>
          {docs.examples.map((example, index) => (
            <pre key={index} style={preStyle}><code>{example}</code></pre>
          ))}
        </details>
      )}
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

const metaStyle = {
  color: "var(--text-muted)",
  fontSize: 11,
  marginTop: 4,
}

const summaryStyle = {
  cursor: "pointer",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
}

const preStyle = {
  margin: "8px 0 0",
  padding: "10px 12px",
  overflowX: "auto",
  borderRadius: 6,
  background: "var(--surface-2)",
  fontSize: 12,
}

const componentDocsStyle = {
  marginBottom: 16,
}

const componentSummaryStyle = {
  margin: "0 0 8px",
  color: "var(--text-secondary)",
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

export default ApiPropTable
