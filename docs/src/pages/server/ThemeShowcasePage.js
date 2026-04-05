import React, { useState, useMemo } from "react"
import { renderChart } from "../../../../src/components/server/renderToStaticSVG"
import { resolveTheme } from "../../../../src/components/server/themeResolver"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

const THEMES = [
  "light", "dark", "tufte", "tufte-dark",
  "journalist", "journalist-dark", "bi-tool", "bi-tool-dark",
  "carbon", "carbon-dark", "pastels", "pastels-dark",
  "italian", "italian-dark", "playful", "playful-dark",
  "high-contrast",
]

const CHART_CONFIGS = {
  bar: {
    label: "Bar Chart",
    render: (theme, w, h) => renderChart("BarChart", {
      data: [
        { category: "North", value: 42 }, { category: "South", value: 28 },
        { category: "East", value: 35 }, { category: "West", value: 51 },
      ],
      categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category",
      width: w, height: h, theme, showGrid: true,
    }),
  },
  stacked: {
    label: "Stacked Bar",
    render: (theme, w, h) => renderChart("StackedBarChart", {
      data: [
        { category: "Q1", value: 30, group: "Product" }, { category: "Q1", value: 20, group: "Services" },
        { category: "Q2", value: 45, group: "Product" }, { category: "Q2", value: 25, group: "Services" },
        { category: "Q3", value: 38, group: "Product" }, { category: "Q3", value: 32, group: "Services" },
        { category: "Q4", value: 52, group: "Product" }, { category: "Q4", value: 28, group: "Services" },
      ],
      categoryAccessor: "category", valueAccessor: "value",
      stackBy: "group", colorBy: "group",
      width: w, height: h, theme, showGrid: true,
    }),
  },
  scatter: {
    label: "Scatterplot",
    render: (theme, w, h) => renderChart("Scatterplot", {
      data: [
        { x: 10, y: 20, g: "A" }, { x: 25, y: 55, g: "B" }, { x: 35, y: 40, g: "A" },
        { x: 50, y: 70, g: "C" }, { x: 15, y: 35, g: "B" }, { x: 60, y: 85, g: "A" },
        { x: 40, y: 50, g: "C" }, { x: 30, y: 65, g: "B" }, { x: 55, y: 45, g: "C" },
        { x: 20, y: 30, g: "A" }, { x: 45, y: 60, g: "B" }, { x: 65, y: 75, g: "C" },
      ],
      xAccessor: "x", yAccessor: "y", colorBy: "g",
      width: w, height: h, theme, showGrid: true,
    }),
  },
  pie: {
    label: "Pie Chart",
    render: (theme, w, h) => renderChart("PieChart", {
      data: [
        { category: "Desktop", value: 40 }, { category: "Mobile", value: 30 },
        { category: "Tablet", value: 20 }, { category: "Other", value: 10 },
      ],
      categoryAccessor: "category", valueAccessor: "value",
      colorBy: "category",
      width: w, height: h, theme,
    }),
  },
  sankey: {
    label: "Sankey Diagram",
    render: (theme, w, h) => renderChart("SankeyDiagram", {
      edges: [
        { source: "Web", target: "API", value: 50 },
        { source: "Mobile", target: "API", value: 30 },
        { source: "API", target: "DB", value: 40 },
        { source: "API", target: "Cache", value: 35 },
      ],
      width: w, height: h, theme,
    }),
  },
}

function ThemeCard({ themeName, svgString }) {
  const resolved = resolveTheme(themeName)
  const bg = resolved.colors.background === "transparent" ? "#fff" : resolved.colors.background
  const textColor = resolved.colors.textSecondary
  const borderColor = resolved.colors.border
  return (
    <div style={{
      background: bg,
      borderRadius: "8px",
      padding: "12px",
      border: `1px solid ${borderColor}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        fontSize: "12px", fontWeight: 600,
        color: textColor,
        marginBottom: "8px",
        fontFamily: resolved.typography.fontFamily,
      }}>
        {themeName}
      </div>
      <div
        style={{ display: "flex", justifyContent: "center" }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    </div>
  )
}

export default function ThemeShowcasePage() {
  const [chartKey, setChartKey] = useState("bar")
  const config = CHART_CONFIGS[chartKey]

  const cards = useMemo(() => {
    return THEMES.map(themeName => {
      let svg
      try {
        svg = config.render(themeName, 280, 200)
      } catch {
        svg = `<svg width="280" height="200"><text x="10" y="30" fill="red">Error</text></svg>`
      }
      return { themeName, svg }
    })
  }, [chartKey, config])

  return (
    <PageLayout
      title="Theme Showcase"
      breadcrumbs={[
        { label: "Server Rendering", path: "/server" },
        { label: "Theme Showcase", path: "/server/themes" },
      ]}
      prevPage={{ title: "Render Studio", path: "/server/studio" }}
      nextPage={{ title: "Dashboard Gallery", path: "/server/dashboards" }}
    >
      <p>
        The same chart rendered with every built-in theme. All styling is inlined —
        no CSS custom properties, no browser needed. Each card shows the exact output
        of <code>renderChart()</code> with a different <code>theme</code> string.
      </p>

      <p>
        Click any theme name to open it in the{" "}
        <Link to="/server/studio">Render Studio</Link>.
      </p>

      <div style={{
        display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap",
      }}>
        {Object.entries(CHART_CONFIGS).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setChartKey(key)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: key === chartKey ? "2px solid var(--accent, #007bff)" : "1px solid var(--border-color, #ccc)",
              background: key === chartKey ? "var(--accent, #007bff)" : "var(--surface-2, #f8f8f8)",
              color: key === chartKey ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: key === chartKey ? 600 : 400,
            }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "16px",
      }}>
        {cards.map(({ themeName, svg }) => (
          <ThemeCard key={themeName} themeName={themeName} svgString={svg} />
        ))}
      </div>

      <h2>Using themes in server rendering</h2>
      <p>
        Pass any theme preset name as a string, or a partial <code>SemioticTheme</code> object
        for custom overrides. The <code>resolveTheme()</code> function handles merging.
      </p>
      <CodeBlock code={`import { renderChart, resolveTheme } from "semiotic/server"

// Named preset
const svg = renderChart("BarChart", { data, theme: "tufte" })

// Custom override (merges onto dark base)
const svg2 = renderChart("LineChart", {
  data,
  theme: { mode: "dark", colors: { primary: "#ff6b6b" } },
})`} language="js" />
    </PageLayout>
  )
}
