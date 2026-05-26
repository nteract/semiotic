import React, { useState, useMemo } from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import capabilitiesData from "../../../../ai/capabilities.json"

// ── Styles ───────────────────────────────────────────────────────────

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px",
  marginBottom: "32px",
}

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--border, #e0e0e0)",
  background: "var(--surface-2, #f8f8f8)",
  fontWeight: 600,
  position: "sticky",
  top: 0,
  zIndex: 1,
}

const tdStyle = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border, #e8e8e8)",
}

const centerCell = {
  ...tdStyle,
  textAlign: "center",
}

const tickStyle = (b) => ({
  ...centerCell,
  color: b ? "var(--semiotic-success, #16a34a)" : "var(--text-secondary, #999)",
  fontWeight: b ? 700 : 400,
})

const featureBadge = {
  display: "inline-block",
  padding: "1px 6px",
  marginRight: "4px",
  marginBottom: "2px",
  fontSize: "11px",
  background: "var(--surface-3, #eee)",
  color: "var(--text-primary, #333)",
  borderRadius: "3px",
  fontFamily: "monospace",
}

const filterBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
  padding: "12px",
  background: "var(--surface-2, #f8f8f8)",
  borderRadius: "8px",
  marginBottom: "16px",
}

const checkboxLabel = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "13px",
  cursor: "pointer",
}

// Stable category ordering for the section blocks.
const CATEGORY_ORDER = ["xy", "ordinal", "network", "geo", "realtime"]
const CATEGORY_LABEL = {
  xy: "XY (continuous-axis)",
  ordinal: "Ordinal (categorical)",
  network: "Network",
  geo: "Geo",
  realtime: "Realtime",
}

// ── Page ──────────────────────────────────────────────────────────────

export default function CapabilitiesPage() {
  const charts = capabilitiesData.charts

  const [requirements, setRequirements] = useState({
    push: false,
    linkedHover: false,
    ssr: false,
    selection: false,
    legend: false,
  })

  const filteredByCategory = useMemo(() => {
    const out = {}
    for (const cat of CATEGORY_ORDER) out[cat] = []
    for (const [name, spec] of Object.entries(charts)) {
      if (requirements.push && !spec.supportsPush) continue
      if (requirements.linkedHover && !spec.supportsLinkedHover) continue
      if (requirements.ssr && !spec.supportsSSR) continue
      if (requirements.selection && !spec.supportsSelection) continue
      if (requirements.legend && !spec.supportsLegend) continue
      const list = out[spec.category] || (out[spec.category] = [])
      list.push({ name, ...spec })
    }
    for (const cat of Object.keys(out)) out[cat].sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [charts, requirements])

  const totalShown = useMemo(
    () => Object.values(filteredByCategory).reduce((n, list) => n + list.length, 0),
    [filteredByCategory],
  )

  const totalAll = Object.keys(charts).length

  const filterToggle = (key) => () =>
    setRequirements((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <PageLayout
      title="Capability Matrix"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Capability Matrix", path: "/intelligence/capabilities" },
      ]}
      prevPage={{ title: "Observation Hooks", path: "/intelligence/observation-hooks" }}
      nextPage={{ title: "Chart Suggestions", path: "/intelligence/suggestions" }}
    >
      <p>
        Every Semiotic chart declares a fixed set of capabilities — does it
        support a ref-based push API? Server-side rendering? Linked hover for
        cross-chart highlight? A top-level legend? The matrix below is
        generated directly from{" "}
        <code>src/components/charts/shared/chartSpecs.ts</code> and
        validated in CI against the actual HOC source. Use the toggles to
        narrow the list to charts that satisfy a set of constraints.
      </p>

      <p>
        For programmatic access, the same matrix is exposed to the
        <code>suggestChart</code> AI tool — pass{" "}
        <code>{`capabilities: { push: true, linkedHover: true }`}</code> to
        the MCP <code>suggestChart</code> tool and it will only surface
        charts that satisfy your constraints.
      </p>

      <div style={filterBarStyle}>
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Require:</span>
        {[
          { key: "push", label: "Push API" },
          { key: "linkedHover", label: "Linked Hover" },
          { key: "ssr", label: "SSR" },
          { key: "selection", label: "Selection" },
          { key: "legend", label: "Legend" },
        ].map((f) => (
          <label key={f.key} style={checkboxLabel}>
            <input
              type="checkbox"
              checked={requirements[f.key]}
              onChange={filterToggle(f.key)}
            />
            {f.label}
          </label>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-secondary, #888)" }}>
          {totalShown} of {totalAll} charts match
        </span>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const rows = filteredByCategory[cat]
        if (!rows || rows.length === 0) return null
        return (
          <section key={cat} style={{ marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "8px" }}>{CATEGORY_LABEL[cat] || cat}</h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Chart</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Push</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Linked Hover</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>SSR</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Selection</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Legend</th>
                  <th style={thStyle}>Color</th>
                  <th style={thStyle}>Layout</th>
                  <th style={thStyle}>Features</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name}</td>
                    <td style={tickStyle(row.supportsPush)}>{row.supportsPush ? "✓" : "—"}</td>
                    <td style={tickStyle(row.supportsLinkedHover)}>{row.supportsLinkedHover ? "✓" : "—"}</td>
                    <td style={tickStyle(row.supportsSSR)}>{row.supportsSSR ? "✓" : "—"}</td>
                    <td style={tickStyle(row.supportsSelection)}>{row.supportsSelection ? "✓" : "—"}</td>
                    <td style={tickStyle(row.supportsLegend)}>{row.supportsLegend ? "✓" : "—"}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>{row.colorModel}</td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>{row.layoutMode}</td>
                    <td style={tdStyle}>
                      {row.specialFeatures.length === 0
                        ? <span style={{ color: "var(--text-secondary, #aaa)" }}>—</span>
                        : row.specialFeatures.map((f) => (
                          <code key={f} style={featureBadge}>{f}</code>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}

      <h2 id="ai-tool">Programmatic Access</h2>
      <p>
        Pass capability constraints to the MCP <code>suggestChart</code>{" "}
        tool to get a narrowed recommendation set:
      </p>

      <CodeBlock
        language="json"
        code={`{
  "name": "suggestChart",
  "arguments": {
    "data": [
      { "category": "A", "value": 10 },
      { "category": "B", "value": 20 }
    ],
    "intent": "comparison",
    "capabilities": {
      "push": true,
      "linkedHover": true
    }
  }
}`}
      />

      <p>
        Charts that don't satisfy every constraint are dropped; the tool
        also reports which suggestions were filtered out so callers can
        relax constraints if the result set is empty.
      </p>

      <h2 id="raw-json">Raw JSON</h2>
      <p>
        The full matrix is published at{" "}
        <code>ai/capabilities.json</code> with the same shape shown
        below. The <code>npm run docs:capabilities</code> script
        regenerates both the markdown table and this JSON; CI's{" "}
        <code>check:capabilities</code> step locks them against{" "}
        <code>chartSpecs.ts</code>.
      </p>

      <CodeBlock
        language="json"
        code={JSON.stringify({
          __generated: capabilitiesData.__generated,
          __source: capabilitiesData.__source,
          charts: {
            BarChart: charts.BarChart,
            "...": `(${totalAll} charts indexed total)`,
          },
        }, null, 2)}
      />
    </PageLayout>
  )
}
