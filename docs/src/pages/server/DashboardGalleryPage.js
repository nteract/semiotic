import React, { useMemo, useState } from "react"
import { renderDashboard } from "../../../../src/components/server/renderToStaticSVG"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Shared data ──────────────────────────────────────────────────────

const revenueData = [
  { category: "North", value: 42000 }, { category: "South", value: 28000 },
  { category: "East", value: 35000 }, { category: "West", value: 51000 },
]

const shareData = [
  { category: "Desktop", value: 58 }, { category: "Mobile", value: 28 },
  { category: "Tablet", value: 10 }, { category: "Other", value: 4 },
]

const trendData = [
  { x: 1, y: 42 }, { x: 2, y: 58 }, { x: 3, y: 52 }, { x: 4, y: 71 },
  { x: 5, y: 68 }, { x: 6, y: 84 }, { x: 7, y: 79 }, { x: 8, y: 91 },
  { x: 9, y: 87 }, { x: 10, y: 95 }, { x: 11, y: 102 }, { x: 12, y: 118 },
]

const scatterData = [
  { x: 25, y: 35 }, { x: 32, y: 72 }, { x: 28, y: 48 }, { x: 45, y: 95 },
  { x: 38, y: 68 }, { x: 29, y: 55 }, { x: 52, y: 110 }, { x: 35, y: 62 },
]

const sankeyEdges = [
  { source: "Web", target: "API", value: 400 },
  { source: "Mobile", target: "API", value: 250 },
  { source: "API", target: "DB", value: 500 },
  { source: "API", target: "Cache", value: 150 },
]

const boxData = Array.from({ length: 60 }, (_, i) => ({
  category: ["API", "Web", "Mobile"][i % 3],
  value: 50 + Math.sin(i * 0.5) * 40 + (Math.random() - 0.5) * 30,
}))

// ── Dashboard definitions ────────────────────────────────────────────

const DASHBOARDS = [
  {
    id: "executive",
    title: "Executive Summary",
    description: "Classic 2x2 business dashboard with revenue trend, regional breakdown, market share, and correlation analysis.",
    theme: "bi-tool",
    options: {
      title: "Q1 2026 Revenue Report",
      subtitle: "Performance across all regions",
      width: 1000,
      layout: { columns: 2, gap: 16 },
      background: "#f5f6f8",
    },
    charts: [
      {
        component: "LineChart",
        props: {
          data: trendData, xAccessor: "x", yAccessor: "y",
          title: "Revenue Trend", showGrid: true, height: 260,
          annotations: [{ type: "y-threshold", value: 80, label: "Target", color: "#e45050" }],
        },
      },
      {
        component: "BarChart",
        props: {
          data: revenueData, categoryAccessor: "category", valueAccessor: "value",
          title: "Revenue by Region", showGrid: true, height: 260,
        },
      },
      {
        component: "PieChart",
        props: {
          data: shareData, categoryAccessor: "category", valueAccessor: "value",
          title: "Market Share", height: 280,
        },
      },
      {
        component: "Scatterplot",
        props: {
          data: scatterData, xAccessor: "x", yAccessor: "y",
          title: "Experience vs Productivity", showGrid: true, height: 280,
        },
      },
    ],
    code: `renderDashboard([
  { component: "LineChart", props: { data: trendData, xAccessor: "x", yAccessor: "y", title: "Revenue Trend", showGrid: true, annotations: [{ type: "y-threshold", value: 80, label: "Target" }] } },
  { component: "BarChart", props: { data: revenueData, categoryAccessor: "category", valueAccessor: "value", title: "Revenue by Region" } },
  { component: "PieChart", props: { data: shareData, categoryAccessor: "category", valueAccessor: "value", title: "Market Share" } },
  { component: "Scatterplot", props: { data: scatterData, xAccessor: "x", yAccessor: "y", title: "Experience vs Productivity" } },
], { title: "Q1 2026 Revenue Report", theme: "bi-tool", width: 1000, layout: { columns: 2 } })`,
  },
  {
    id: "engineering",
    title: "Engineering Metrics",
    description: "Infrastructure monitoring dashboard with request flow, latency distribution, and service health.",
    theme: "carbon",
    options: {
      title: "Infrastructure Overview",
      width: 1000,
      layout: { columns: 2, gap: 16 },
      background: "#ffffff",
    },
    charts: [
      {
        component: "SankeyDiagram",
        colSpan: 2,
        props: { edges: sankeyEdges, title: "Request Flow", height: 240 },
      },
      {
        component: "BoxPlot",
        props: {
          data: boxData, categoryAccessor: "category", valueAccessor: "value",
          title: "Latency by Service (ms)", showGrid: true, height: 260,
        },
      },
      {
        component: "BarChart",
        props: {
          data: [
            { category: "API", value: 99.7 }, { category: "Web", value: 99.9 },
            { category: "Mobile", value: 99.2 }, { category: "DB", value: 99.99 },
          ],
          categoryAccessor: "category", valueAccessor: "value",
          title: "Uptime % by Service", showGrid: true, height: 260,
          annotations: [{ type: "y-threshold", value: 99.5, label: "SLA", color: "#da1e28" }],
        },
      },
    ],
    code: `renderDashboard([
  { component: "SankeyDiagram", colSpan: 2, props: { edges: sankeyEdges, title: "Request Flow" } },
  { component: "BoxPlot", props: { data: boxData, categoryAccessor: "category", valueAccessor: "value", title: "Latency by Service" } },
  { component: "BarChart", props: { data: uptimeData, title: "Uptime %", annotations: [{ type: "y-threshold", value: 99.5, label: "SLA" }] } },
], { title: "Infrastructure Overview", theme: "carbon", layout: { columns: 2 } })`,
  },
  {
    id: "editorial",
    title: "Editorial Report",
    description: "Data journalism style with Tufte aesthetics — minimal chrome, annotations tell the story.",
    theme: "tufte",
    options: {
      title: "Annual Revenue Analysis",
      subtitle: "A year of steady growth, but Q3 was flat",
      width: 1000,
      layout: { columns: 2, gap: 20 },
      background: "#fffff8",
    },
    charts: [
      {
        component: "LineChart",
        colSpan: 2,
        props: {
          data: trendData, xAccessor: "x", yAccessor: "y",
          title: "Monthly Revenue ($K)", showGrid: false, height: 260,
          annotations: [
            { type: "y-threshold", value: 80, label: "Board target", color: "#8b0000", strokeDasharray: "4,4" },
            { type: "band", y0: 75, y1: 95, label: "Q3 plateau", fill: "#8b4513" },
          ],
        },
      },
      {
        component: "BarChart",
        props: {
          data: revenueData, categoryAccessor: "category", valueAccessor: "value",
          title: "By Region", orientation: "horizontal", height: 260,
        },
      },
      {
        component: "DonutChart",
        props: {
          data: shareData, categoryAccessor: "category", valueAccessor: "value",
          title: "Channel Mix", height: 260,
        },
      },
    ],
    code: `renderDashboard([
  { component: "LineChart", colSpan: 2, props: { data: trendData, title: "Monthly Revenue", annotations: [{ type: "y-threshold", value: 80, label: "Board target" }, { type: "band", y0: 75, y1: 95, label: "Q3 plateau" }] } },
  { component: "BarChart", props: { data: revenueData, title: "By Region", orientation: "horizontal" } },
  { component: "DonutChart", props: { data: shareData, title: "Channel Mix" } },
], { title: "Annual Revenue Analysis", theme: "tufte" })`,
  },
  {
    id: "dark-ops",
    title: "Dark Mode Operations",
    description: "Operations dashboard with dark theme — designed for NOC displays and ambient monitoring.",
    theme: "dark",
    options: {
      title: "Operations Dashboard",
      width: 1000,
      layout: { columns: 2, gap: 16 },
      background: "#1a1a2e",
    },
    charts: [
      {
        component: "LineChart",
        props: {
          data: trendData, xAccessor: "x", yAccessor: "y",
          title: "Request Volume", showGrid: true, height: 260,
        },
      },
      {
        component: "BarChart",
        props: {
          data: revenueData, categoryAccessor: "category", valueAccessor: "value",
          title: "Errors by Region", showGrid: true, height: 260,
        },
      },
      {
        component: "Scatterplot",
        props: {
          data: scatterData, xAccessor: "x", yAccessor: "y",
          title: "Latency vs Load", showGrid: true, height: 260,
        },
      },
      {
        component: "DotPlot",
        props: {
          data: [
            { category: "API", value: 12 }, { category: "Web", value: 3 },
            { category: "DB", value: 7 }, { category: "Cache", value: 1 },
          ],
          categoryAccessor: "category", valueAccessor: "value",
          title: "Active Incidents", height: 260,
        },
      },
    ],
    code: `renderDashboard([
  { component: "LineChart", props: { data, title: "Request Volume", showGrid: true } },
  { component: "BarChart", props: { data, title: "Errors by Region" } },
  { component: "Scatterplot", props: { data, title: "Latency vs Load" } },
  { component: "DotPlot", props: { data, title: "Active Incidents" } },
], { title: "Operations Dashboard", theme: "dark", background: "#1a1a2e" })`,
  },
]

function DashboardCard({ dashboard }) {
  const [showCode, setShowCode] = useState(false)
  const isDark = dashboard.theme.includes("dark")

  const svg = useMemo(() => {
    try {
      return renderDashboard(dashboard.charts, {
        ...dashboard.options,
        theme: dashboard.theme,
      })
    } catch (e) {
      return `<svg width="800" height="200"><text x="20" y="40" fill="red">${e.message}</text></svg>`
    }
  }, [dashboard])

  return (
    <div style={{
      marginBottom: "40px",
      background: "var(--card-bg, #fff)",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid var(--border-color, #e0e0e0)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>{dashboard.title}</h3>
        <span style={{
          fontSize: "12px", fontFamily: "monospace", padding: "2px 8px",
          borderRadius: "4px",
          background: isDark ? "#2a2a3e" : "#f0f0f5",
          color: isDark ? "#aaa" : "#666",
        }}>
          theme: {dashboard.theme}
        </span>
      </div>
      <p style={{ fontSize: "14px", color: "var(--text-secondary, #666)", margin: "0 0 16px" }}>
        {dashboard.description}
      </p>

      <div
        style={{
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border-color, #e0e0e0)",
          display: "flex", justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <div style={{ marginTop: "12px" }}>
        <button
          onClick={() => setShowCode(!showCode)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: "13px", color: "var(--accent, #007bff)",
          }}
        >
          {showCode ? "Hide code" : "Show renderDashboard() code"}
        </button>
        {showCode && (
          <div style={{ marginTop: "8px" }}>
            <CodeBlock code={dashboard.code} language="js" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardGalleryPage() {
  return (
    <PageLayout
      title="Dashboard Gallery"
      breadcrumbs={[
        { label: "Server Rendering", path: "/server" },
        { label: "Dashboard Gallery", path: "/server/dashboards" },
      ]}
      prevPage={{ title: "Theme Showcase", path: "/server/themes" }}
      nextPage={{ title: "Email Preview", path: "/server/email" }}
    >
      <p>
        Pre-built dashboards composed with <code>renderDashboard()</code>. Each dashboard
        is a single function call that produces a self-contained SVG — no browser, no React
        tree, no layout engine. Grid positioning, titles, and theme propagation are handled
        automatically.
      </p>

      {DASHBOARDS.map(d => <DashboardCard key={d.id} dashboard={d} />)}

      <h2>Creating your own dashboard</h2>
      <CodeBlock code={`import { renderDashboard } from "semiotic/server"

const svg = renderDashboard([
  { component: "LineChart", colSpan: 2, props: { data, xAccessor: "time", yAccessor: "value", title: "Trend" } },
  { component: "BarChart", props: { data: byRegion, categoryAccessor: "region", valueAccessor: "total" } },
  { component: "PieChart", props: { data: bySegment, categoryAccessor: "segment", valueAccessor: "share" } },
], {
  title: "My Dashboard",
  theme: "dark",
  width: 1200,
  layout: { columns: 2, gap: 16 },
})`} language="js" />
    </PageLayout>
  )
}
