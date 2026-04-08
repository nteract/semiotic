import React, { useMemo } from "react"
import {
  renderXYToStaticSVG,
  renderOrdinalToStaticSVG,
  renderNetworkToStaticSVG,
  renderChart,
} from "../../../src/components/server/renderToStaticSVG"
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

function GalleryCard({ title, svgString, code }) {
  return (
    <div style={{
      background: "var(--card-bg, #fff)",
      borderRadius: "8px",
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      border: "1px solid var(--border-color, #e0e0e0)",
    }}>
      <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-secondary, #666)", fontWeight: 500 }}>
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

    // Line
    charts.push({
      title: "Line Chart",
      svg: renderXYToStaticSVG({
        chartType: "line",
        data: timeSeriesData,
        xAccessor: "month",
        yAccessor: "revenue",
        size: [W, H],
        showAxes: true,
      }),
      code: `renderXYToStaticSVG({
  chartType: "line",
  data: timeSeriesData,
  xAccessor: "month",
  yAccessor: "revenue",
  size: [460, 300],
  showAxes: true,
})`,
    })

    // Scatter
    charts.push({
      title: "Scatterplot",
      svg: renderXYToStaticSVG({
        chartType: "scatter",
        data: scatterData,
        xAccessor: "age",
        yAccessor: "income",
        size: [W, H],
        showAxes: true,
      }),
      code: `renderXYToStaticSVG({
  chartType: "scatter",
  data: scatterData,
  xAccessor: "age",
  yAccessor: "income",
  size: [460, 300],
  showAxes: true,
})`,
    })

    // Bar
    charts.push({
      title: "Bar Chart",
      svg: renderOrdinalToStaticSVG({
        chartType: "bar",
        data: categoryData,
        oAccessor: "department",
        rAccessor: "headcount",
        size: [W, H],
        showAxes: true,
      }),
      code: `renderOrdinalToStaticSVG({
  chartType: "bar",
  data: categoryData,
  oAccessor: "department",
  rAccessor: "headcount",
  size: [460, 300],
  showAxes: true,
})`,
    })

    // Horizontal Bar
    charts.push({
      title: "Bar Chart (horizontal)",
      svg: renderOrdinalToStaticSVG({
        chartType: "bar",
        data: categoryData,
        oAccessor: "department",
        rAccessor: "headcount",
        projection: "horizontal",
        size: [W, H],
        showAxes: true,
      }),
    })

    // Pie
    charts.push({
      title: "Pie Chart",
      svg: renderOrdinalToStaticSVG({
        chartType: "pie",
        data: pieData,
        oAccessor: "category",
        rAccessor: "value",
        projection: "radial",
        size: [340, 340],
      }),
      code: `renderOrdinalToStaticSVG({
  chartType: "pie",
  data: pieData,
  oAccessor: "category",
  rAccessor: "value",
  projection: "radial",
  size: [340, 340],
})`,
    })

    // Donut
    charts.push({
      title: "Donut Chart",
      svg: renderOrdinalToStaticSVG({
        chartType: "donut",
        data: pieData,
        oAccessor: "category",
        rAccessor: "value",
        projection: "radial",
        innerRadius: 50,
        size: [340, 340],
      }),
    })

    // Sankey
    charts.push({
      title: "Sankey Diagram",
      svg: renderNetworkToStaticSVG({
        chartType: "sankey",
        edges: sankeyEdges,
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
        size: [W, H],
      }),
      code: `renderNetworkToStaticSVG({
  chartType: "sankey",
  edges: sankeyEdges,
  sourceAccessor: "source",
  targetAccessor: "target",
  valueAccessor: "value",
  size: [460, 300],
})`,
    })

    // Force
    charts.push({
      title: "Force-Directed Graph",
      svg: renderNetworkToStaticSVG({
        chartType: "force",
        nodes: networkNodes,
        edges: networkEdges,
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        size: [W, H],
      }),
      code: `renderNetworkToStaticSVG({
  chartType: "force",
  nodes: networkNodes,
  edges: networkEdges,
  nodeIDAccessor: "id",
  size: [460, 300],
})`,
    })

    // Tree
    charts.push({
      title: "Tree Diagram",
      svg: renderNetworkToStaticSVG({
        chartType: "tree",
        data: treeData,
        childrenAccessor: "children",
        nodeIDAccessor: "name",
        size: [W, H],
      }),
    })

    // Treemap
    charts.push({
      title: "Treemap",
      svg: renderNetworkToStaticSVG({
        chartType: "treemap",
        data: treemapData,
        childrenAccessor: "children",
        valueAccessor: "value",
        nodeIDAccessor: "name",
        size: [W, H],
      }),
    })

    // Vertical Funnel (bar-funnel with hatch dropoff bars)
    charts.push({
      title: "Vertical Funnel (2 categories)",
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
        colorScheme: ["#6366f1", "#f59e0b"],
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
  colorScheme: ["#6366f1", "#f59e0b"],
})`,
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
