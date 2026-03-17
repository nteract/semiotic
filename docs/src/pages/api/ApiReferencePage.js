import React, { useState, useEffect } from "react"
import PageLayout from "../../components/PageLayout"
import { ApiPropTable } from "../../components/ApiPropTable"

const CHART_CATEGORIES = [
  {
    title: "XY Charts",
    components: [
      "LineChart", "AreaChart", "StackedAreaChart", "Scatterplot", "BubbleChart",
      "ConnectedScatterplot", "Heatmap",
    ],
  },
  {
    title: "Categorical Charts",
    components: [
      "BarChart", "StackedBarChart", "GroupedBarChart", "PieChart", "DonutChart",
      "Histogram", "SwarmPlot", "BoxPlot", "ViolinPlot", "DotPlot",
    ],
  },
  {
    title: "Network Charts",
    components: [
      "ForceDirectedGraph", "SankeyDiagram", "ChordDiagram", "TreeDiagram",
      "Treemap", "CirclePack", "OrbitDiagram",
    ],
  },
  {
    title: "Geo Charts",
    components: [
      "ChoroplethMap", "ProportionalSymbolMap", "FlowMap", "DistanceCartogram",
    ],
  },
  {
    title: "Realtime Charts",
    components: [
      "RealtimeLineChart", "RealtimeHistogram", "RealtimeSwarmChart",
      "RealtimeWaterfallChart", "RealtimeHeatmap",
    ],
  },
]

const ALL_COMPONENTS = CHART_CATEGORIES.flatMap((c) => c.components)

export default function ApiReferencePage() {
  const [apiData, setApiData] = useState(null)
  const [filter, setFilter] = useState("")
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch("/api/api.json")
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then(setApiData)
      .catch(() => setLoadError(true))
  }, [])

  const filterLower = filter.toLowerCase()

  return (
    <PageLayout
      title="TypeDoc API Reference"
      breadcrumbs={[
        { label: "API Reference", path: "/api" },
        { label: "TypeDoc", path: "/api/typedoc" },
      ]}
    >
      <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24, maxWidth: "72ch" }}>
        Auto-generated prop tables extracted from TypeScript source via TypeDoc.
        Run <code>npm run docs:api:json</code> to regenerate after source changes.
      </p>

      {loadError && (
        <div style={{ padding: "16px 20px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, marginBottom: 24, fontSize: 14 }}>
          <strong>API JSON not found.</strong> Generate it by running: <code>npm run docs:api:json</code>
        </div>
      )}

      <input
        type="text"
        placeholder="Filter components..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          padding: "8px 12px",
          border: "1px solid var(--surface-3)",
          borderRadius: 4,
          width: 300,
          marginBottom: 32,
          fontSize: 14,
          background: "var(--surface-1)",
          color: "var(--text-primary)",
        }}
      />

      {CHART_CATEGORIES.map((category) => {
        const filtered = category.components.filter((c) =>
          c.toLowerCase().includes(filterLower)
        )
        if (filtered.length === 0) return null

        return (
          <section key={category.title} style={{ marginBottom: 48 }}>
            <h2 style={{ marginBottom: 16 }}>{category.title}</h2>
            {filtered.map((name) => (
              <div
                key={name}
                id={name.toLowerCase()}
                style={{
                  border: "1px solid var(--surface-3)",
                  borderRadius: 8,
                  padding: "20px 24px",
                  marginBottom: 24,
                  background: "var(--surface-1)",
                }}
              >
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
                  {name}
                </h3>
                <ApiPropTable componentName={name} apiData={apiData} />
              </div>
            ))}
          </section>
        )
      })}
    </PageLayout>
  )
}
