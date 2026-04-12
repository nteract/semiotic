import React, { useMemo } from "react"
import { renderChart } from "../../../src/components/server/renderToStaticSVG"
import PageLayout from "../components/PageLayout"
import CodeBlock from "../components/CodeBlock"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const timeSeriesData = [
  { month: 1, revenue: 42000 },
  { month: 2, revenue: 58000 },
  { month: 3, revenue: 52000 },
  { month: 4, revenue: 71000 },
  { month: 5, revenue: 68000 },
  { month: 6, revenue: 84000 },
  { month: 7, revenue: 79000 },
  { month: 8, revenue: 91000 },
  { month: 9, revenue: 87000 },
  { month: 10, revenue: 95000 },
  { month: 11, revenue: 102000 },
  { month: 12, revenue: 118000 },
]

const scatterData = [
  { age: 25, income: 35000 },
  { age: 32, income: 72000 },
  { age: 28, income: 48000 },
  { age: 45, income: 95000 },
  { age: 38, income: 68000 },
  { age: 29, income: 55000 },
  { age: 52, income: 110000 },
  { age: 35, income: 62000 },
  { age: 41, income: 85000 },
  { age: 27, income: 42000 },
]

const categoryData = [
  { department: "Engineering", headcount: 142 },
  { department: "Sales", headcount: 89 },
  { department: "Marketing", headcount: 64 },
  { department: "Operations", headcount: 51 },
  { department: "Finance", headcount: 38 },
]

const pieData = [
  { category: "Desktop", value: 58 },
  { category: "Mobile", value: 28 },
  { category: "Tablet", value: 10 },
  { category: "Other", value: 4 },
]

const sankeyEdges = [
  { source: "Revenue", target: "Product", value: 500 },
  { source: "Revenue", target: "Services", value: 300 },
  { source: "Revenue", target: "Licensing", value: 200 },
  { source: "Product", target: "COGS", value: 200 },
  { source: "Product", target: "Gross Profit", value: 300 },
  { source: "Services", target: "Gross Profit", value: 200 },
  { source: "Licensing", target: "Gross Profit", value: 200 },
  { source: "Gross Profit", target: "OpEx", value: 350 },
  { source: "Gross Profit", target: "Net Income", value: 350 },
]

const networkNodes = [
  { id: "Alice" }, { id: "Bob" }, { id: "Carol" },
  { id: "Dave" }, { id: "Eve" }, { id: "Frank" },
]
const networkEdges = [
  { source: "Alice", target: "Bob" }, { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Dave" }, { source: "Carol", target: "Eve" },
  { source: "Dave", target: "Frank" }, { source: "Eve", target: "Alice" },
]

const treeData = {
  name: "CEO",
  children: [
    {
      name: "CTO",
      children: [
        { name: "Eng Lead", children: [{ name: "Frontend" }, { name: "Backend" }] },
        { name: "Data Lead", children: [{ name: "ML" }, { name: "Analytics" }] },
      ],
    },
    {
      name: "CFO",
      children: [{ name: "Accounting" }, { name: "FP&A" }],
    },
  ],
}

const treemapData = {
  name: "Budget",
  children: [
    {
      name: "Engineering",
      children: [
        { name: "Salaries", value: 800 },
        { name: "Tools", value: 150 },
        { name: "Cloud", value: 300 },
      ],
    },
    {
      name: "Marketing",
      children: [
        { name: "Ads", value: 400 },
        { name: "Events", value: 200 },
      ],
    },
    {
      name: "Operations",
      children: [
        { name: "Office", value: 250 },
        { name: "Travel", value: 100 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Gallery card
// ---------------------------------------------------------------------------

function GalleryCard({ title, svgString, code, darkCard }) {
  return (
    <div style={{
      background: darkCard ? "#1a1a2e" : "var(--card-bg, #fff)",
      borderRadius: "8px",
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      border: darkCard ? "1px solid #333" : "1px solid var(--border-color, #e0e0e0)",
    }}>
      <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: darkCard ? "#aaa" : "var(--text-secondary, #666)", fontWeight: 500 }}>
        {title}
      </h4>
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: code ? 12 : 0 }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      {code && (
        <details style={{ fontSize: "13px" }}>
          <summary style={{ cursor: "pointer", color: "var(--text-secondary, #888)", marginBottom: 8 }}>
            Show code
          </summary>
          <CodeBlock code={code} language="js" />
        </details>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart configs — each entry produces one gallery card
// ---------------------------------------------------------------------------

function useGalleryCharts() {
  return useMemo(() => {
    const W = 460
    const H = 300

    const charts = []

    // Line — tufte theme
    charts.push({
      title: "Line Chart — tufte",
      svg: renderChart("LineChart", {
        data: timeSeriesData,
        xAccessor: "month",
        yAccessor: "revenue",
        theme: "tufte",
        title: "Monthly Revenue",
        width: W,
        height: H,
      }),
      code: `renderChart("LineChart", {
  data: timeSeriesData,
  xAccessor: "month",
  yAccessor: "revenue",
  theme: "tufte",
  title: "Monthly Revenue",
})`,
    })

    // Scatter — dark theme
    charts.push({
      title: "Scatterplot — dark",
      svg: renderChart("Scatterplot", {
        data: scatterData,
        xAccessor: "age",
        yAccessor: "income",
        theme: "dark",
        background: "#1a1a2e",
        title: "Age vs Income",
        width: W,
        height: H,
      }),
      code: `renderChart("Scatterplot", {
  data: scatterData,
  xAccessor: "age",
  yAccessor: "income",
  theme: "dark",
  title: "Age vs Income",
})`,
      dark: true,
    })

    // Bar — italian theme
    charts.push({
      title: "Bar Chart — italian (rounded)",
      svg: renderChart("BarChart", {
        data: categoryData,
        categoryAccessor: "department",
        valueAccessor: "headcount",
        roundedTop: 6,
        theme: "italian",
        title: "Headcount by Dept",
        width: W,
        height: H,
      }),
      code: `renderChart("BarChart", {
  data: categoryData,
  categoryAccessor: "department",
  valueAccessor: "headcount",
  roundedTop: 6,
  theme: "italian",
  title: "Headcount by Dept",
})`,
    })

    // Horizontal Bar — journalist theme
    charts.push({
      title: "Horizontal Bar — journalist",
      svg: renderChart("BarChart", {
        data: categoryData,
        categoryAccessor: "department",
        valueAccessor: "headcount",
        orientation: "horizontal",
        theme: "journalist",
        margin: { top: 20, right: 20, bottom: 30, left: 100 },
        width: W,
        height: H,
      }),
    })

    // Pie — pastels theme with rounded corners
    charts.push({
      title: "Pie Chart — pastels (rounded)",
      svg: renderChart("PieChart", {
        data: pieData,
        categoryAccessor: "category",
        valueAccessor: "value",
        colorBy: "category",
        cornerRadius: 8,
        theme: "pastels",
        width: 340,
        height: 340,
      }),
      code: `renderChart("PieChart", {
  data: pieData,
  categoryAccessor: "category",
  valueAccessor: "value",
  colorBy: "category",
  cornerRadius: 8,
  theme: "pastels",
})`,
    })

    // Donut — bi-tool-dark theme
    charts.push({
      title: "Donut Chart — bi-tool-dark",
      svg: renderChart("DonutChart", {
        data: pieData,
        categoryAccessor: "category",
        valueAccessor: "value",
        colorBy: "category",
        theme: "bi-tool-dark",
        background: "#1a1a2e",
        width: 340,
        height: 340,
      }),
      dark: true,
    })

    // Sankey — tufte-dark theme
    charts.push({
      title: "Sankey Diagram — tufte-dark",
      svg: renderChart("SankeyDiagram", {
        edges: sankeyEdges,
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
        theme: "tufte-dark",
        background: "#1a1a2e",
        width: W,
        height: H,
      }),
      code: `renderChart("SankeyDiagram", {
  edges: sankeyEdges,
  sourceAccessor: "source",
  targetAccessor: "target",
  valueAccessor: "value",
  theme: "tufte-dark",
})`,
      dark: true,
    })

    // Force — playful theme
    charts.push({
      title: "Force-Directed — playful",
      svg: renderChart("ForceDirectedGraph", {
        nodes: networkNodes,
        edges: networkEdges,
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        showLabels: true,
        theme: "playful",
        width: W,
        height: H,
      }),
      code: `renderChart("ForceDirectedGraph", {
  nodes: networkNodes,
  edges: networkEdges,
  nodeIDAccessor: "id",
  showLabels: true,
  theme: "playful",
})`,
    })

    // Tree — journalist-dark theme, depth coloring
    charts.push({
      title: "Tree Diagram — journalist-dark",
      svg: renderChart("TreeDiagram", {
        data: treeData,
        childrenAccessor: "children",
        colorByDepth: true,
        showLabels: true,
        theme: "journalist-dark",
        background: "#1a1a2e",
        width: W,
        height: H + 20,
        margin: { top: 20, right: 20, bottom: 40, left: 20 },
      }),
      code: `renderChart("TreeDiagram", {
  data: treeData,
  childrenAccessor: "children",
  colorByDepth: true,
  showLabels: true,
  theme: "journalist-dark",
})`,
      dark: true,
    })

    // Treemap — italian-dark theme, depth coloring
    charts.push({
      title: "Treemap — italian-dark",
      svg: renderChart("Treemap", {
        data: treemapData,
        childrenAccessor: "children",
        valueAccessor: "value",
        colorByDepth: true,
        showLabels: true,
        theme: "italian-dark",
        background: "#1a1a2e",
        width: W,
        height: H,
      }),
      code: `renderChart("Treemap", {
  data: treemapData,
  childrenAccessor: "children",
  valueAccessor: "value",
  colorByDepth: true,
  showLabels: true,
  theme: "italian-dark",
})`,
      dark: true,
    })

    // Vertical Funnel — pastels-dark theme
    charts.push({
      title: "Vertical Funnel — pastels-dark",
      svg: renderChart("FunnelChart", {
        data: [
          { step: "Leads", value: 1000, channel: "Web" },
          { step: "Leads", value: 600, channel: "Mobile" },
          { step: "Qualified", value: 500, channel: "Web" },
          { step: "Qualified", value: 250, channel: "Mobile" },
          { step: "Proposals", value: 200, channel: "Web" },
          { step: "Proposals", value: 100, channel: "Mobile" },
          { step: "Closed", value: 80, channel: "Web" },
          { step: "Closed", value: 40, channel: "Mobile" },
        ],
        stepAccessor: "step",
        valueAccessor: "value",
        categoryAccessor: "channel",
        colorBy: "channel",
        orientation: "vertical",
        theme: "pastels-dark",
        background: "#1a1a2e",
        width: W,
        height: H + 40,
      }),
      code: `renderChart("FunnelChart", {
  data: funnelData,
  stepAccessor: "step",
  valueAccessor: "value",
  categoryAccessor: "channel",
  colorBy: "channel",
  orientation: "vertical",
  theme: "pastels-dark",
})`,
      dark: true,
    })

    // Gauge — high-contrast theme
    charts.push({
      title: "Gauge Chart — high-contrast",
      svg: renderChart("GaugeChart", {
        value: 72,
        min: 0,
        max: 100,
        sweep: 240,
        arcWidth: 0.3,
        thresholds: [
          { value: 60, color: "#22c55e", label: "Normal" },
          { value: 80, color: "#f59e0b", label: "Warning" },
          { value: 100, color: "#ef4444", label: "Critical" },
        ],
        title: "CPU Usage",
        theme: "high-contrast",
        width: W,
        height: H,
      }),
      code: `renderChart("GaugeChart", {
  value: 72,
  thresholds: [
    { value: 60, color: "#22c55e", label: "Normal" },
    { value: 80, color: "#f59e0b", label: "Warning" },
    { value: 100, color: "#ef4444", label: "Critical" },
  ],
  theme: "high-contrast",
})`,
    })

    // Grouped Bar — bi-tool theme, bottom legend
    charts.push({
      title: "Grouped Bar — bi-tool (bottom legend)",
      svg: renderChart("GroupedBarChart", {
        data: [
          { quarter: "Q1", region: "Americas", revenue: 120 },
          { quarter: "Q1", region: "EMEA", revenue: 80 },
          { quarter: "Q1", region: "APAC", revenue: 45 },
          { quarter: "Q2", region: "Americas", revenue: 140 },
          { quarter: "Q2", region: "EMEA", revenue: 95 },
          { quarter: "Q2", region: "APAC", revenue: 60 },
          { quarter: "Q3", region: "Americas", revenue: 160 },
          { quarter: "Q3", region: "EMEA", revenue: 110 },
          { quarter: "Q3", region: "APAC", revenue: 70 },
          { quarter: "Q4", region: "Americas", revenue: 180 },
          { quarter: "Q4", region: "EMEA", revenue: 120 },
          { quarter: "Q4", region: "APAC", revenue: 85 },
        ],
        categoryAccessor: "quarter",
        groupBy: "region",
        valueAccessor: "revenue",
        colorBy: "region",
        showLegend: true,
        legendPosition: "bottom",
        title: "Revenue by Quarter",
        theme: "bi-tool",
        width: W,
        height: H + 60,
      }),
      code: `renderChart("GroupedBarChart", {
  data: quarterlyRevenue,
  categoryAccessor: "quarter",
  groupBy: "region",
  valueAccessor: "revenue",
  colorBy: "region",
  showLegend: true,
  legendPosition: "bottom",
  theme: "bi-tool",
})`,
    })

    // Line Chart — playful-dark theme, bottom legend
    charts.push({
      title: "Multi-line — playful-dark (bottom legend)",
      svg: renderChart("LineChart", {
        data: [
          { month: 1, value: 42, series: "Revenue" },
          { month: 2, value: 58, series: "Revenue" },
          { month: 3, value: 52, series: "Revenue" },
          { month: 4, value: 71, series: "Revenue" },
          { month: 5, value: 68, series: "Revenue" },
          { month: 6, value: 84, series: "Revenue" },
          { month: 1, value: 30, series: "Cost" },
          { month: 2, value: 35, series: "Cost" },
          { month: 3, value: 38, series: "Cost" },
          { month: 4, value: 42, series: "Cost" },
          { month: 5, value: 45, series: "Cost" },
          { month: 6, value: 50, series: "Cost" },
          { month: 1, value: 12, series: "Profit" },
          { month: 2, value: 23, series: "Profit" },
          { month: 3, value: 14, series: "Profit" },
          { month: 4, value: 29, series: "Profit" },
          { month: 5, value: 23, series: "Profit" },
          { month: 6, value: 34, series: "Profit" },
        ],
        xAccessor: "month",
        yAccessor: "value",
        lineBy: "series",
        colorBy: "series",
        showLegend: true,
        legendPosition: "bottom",
        title: "Revenue vs Cost vs Profit",
        theme: "playful-dark",
        background: "#1a1a2e",
        width: W,
        height: H + 60,
      }),
      code: `renderChart("LineChart", {
  data: financialData,
  lineBy: "series",
  colorBy: "series",
  showLegend: true,
  legendPosition: "bottom",
  theme: "playful-dark",
})`,
      dark: true,
    })

    return charts
  }, [])
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SSRGalleryPage() {
  const charts = useGalleryCharts()

  return (
    <PageLayout
      title="SSR Gallery"
      breadcrumbs={[
        { label: "Server-Side Rendering", path: "/using-ssr" },
        { label: "SSR Gallery", path: "/ssr-gallery" },
      ]}
      prevPage={{ title: "Server-Side Rendering", path: "/using-ssr" }}
      nextPage={{ title: "API Reference", path: "/api" }}
    >
      <p>
        Every chart below was rendered using{" "}
        <Link to="/using-ssr">Semiotic's server rendering API</Link> — the same
        functions you'd call from a Next.js Server Component, an API route, or a
        build script. No browser, no canvas, no client JavaScript. Pure SVG.
      </p>

      <p>
        Expand "Show code" on any chart to see the exact{" "}
        <code>renderToStaticSVG</code> call that produced it. The output is a
        self-contained SVG string you can embed in HTML, convert to PNG, or
        inline in an email.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
        gap: "20px",
        marginTop: "24px",
      }}>
        {charts.map((chart) => (
          <GalleryCard
            key={chart.title}
            title={chart.title}
            svgString={chart.svg}
            code={chart.code}
            darkCard={chart.dark}
          />
        ))}
      </div>

      <div style={{
        marginTop: "32px",
        padding: "16px",
        background: "var(--card-bg, #fff)",
        borderRadius: "8px",
        fontSize: "13px",
        color: "var(--text-secondary, #666)",
        border: "1px solid var(--border-color, #e0e0e0)",
      }}>
        <strong>{charts.length} charts</strong> rendered via{" "}
        <code>semiotic/server</code>. You can also generate a standalone HTML
        gallery from the command line:
        <CodeBlock
          code="npx tsx scripts/ssr-gallery.tsx > ssr-gallery.html"
          language="bash"
        />
      </div>
    </PageLayout>
  )
}
