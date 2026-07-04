import React, { useState, useMemo, useEffect, useRef } from "react"
import { renderChart } from "../../../../src/components/server/renderToStaticSVG"
import { generateFrameSVGs } from "../../../../src/components/server/animatedGif"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

function escapeForSVG(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ── Sample datasets ──────────────────────────────────────────────────

const DATASETS = {
  sales: {
    label: "Sales by Region",
    data: [
      { category: "North", value: 42000, group: "Q1" },
      { category: "South", value: 28000, group: "Q1" },
      { category: "East", value: 35000, group: "Q1" },
      { category: "West", value: 51000, group: "Q1" },
      { category: "North", value: 58000, group: "Q2" },
      { category: "South", value: 35000, group: "Q2" },
      { category: "East", value: 41000, group: "Q2" },
      { category: "West", value: 62000, group: "Q2" },
    ],
  },
  timeseries: {
    label: "Monthly Revenue",
    data: [
      { x: 1, y: 42, series: "Product" }, { x: 2, y: 58, series: "Product" },
      { x: 3, y: 52, series: "Product" }, { x: 4, y: 71, series: "Product" },
      { x: 5, y: 68, series: "Product" }, { x: 6, y: 84, series: "Product" },
      { x: 7, y: 79, series: "Product" }, { x: 8, y: 91, series: "Product" },
      { x: 1, y: 28, series: "Services" }, { x: 2, y: 35, series: "Services" },
      { x: 3, y: 41, series: "Services" }, { x: 4, y: 48, series: "Services" },
      { x: 5, y: 52, series: "Services" }, { x: 6, y: 61, series: "Services" },
      { x: 7, y: 58, series: "Services" }, { x: 8, y: 72, series: "Services" },
    ],
  },
  scatter: {
    label: "Employee Survey",
    data: [
      { x: 25, y: 35, color: "Engineering" }, { x: 32, y: 72, color: "Engineering" },
      { x: 28, y: 48, color: "Sales" }, { x: 45, y: 95, color: "Sales" },
      { x: 38, y: 68, color: "Marketing" }, { x: 29, y: 55, color: "Marketing" },
      { x: 52, y: 110, color: "Engineering" }, { x: 35, y: 62, color: "Sales" },
    ],
  },
  pie: {
    label: "Market Share",
    data: [
      { category: "Desktop", value: 58 }, { category: "Mobile", value: 28 },
      { category: "Tablet", value: 10 }, { category: "Other", value: 4 },
    ],
  },
  sankey: {
    label: "Revenue Flow",
    edges: [
      { source: "Revenue", target: "Product", value: 500 },
      { source: "Revenue", target: "Services", value: 300 },
      { source: "Product", target: "Profit", value: 350 },
      { source: "Services", target: "Profit", value: 200 },
      { source: "Product", target: "COGS", value: 150 },
      { source: "Services", target: "COGS", value: 100 },
    ],
  },
}

// ── Chart type configs ───────────────────────────────────────────────

const CHART_TYPES = {
  BarChart: { label: "Bar Chart", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  StackedBarChart: { label: "Stacked Bar", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value", stackBy: "group", colorBy: "group" }) },
  GroupedBarChart: { label: "Grouped Bar", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value", groupBy: "group", colorBy: "group" }) },
  LineChart: { label: "Line Chart", dataset: "timeseries", propsTemplate: (ds) => ({ data: ds.data, xAccessor: "x", yAccessor: "y", lineBy: "series", colorBy: "series" }) },
  Scatterplot: { label: "Scatterplot", dataset: "scatter", propsTemplate: (ds) => ({ data: ds.data, xAccessor: "x", yAccessor: "y", colorBy: "color" }) },
  PieChart: { label: "Pie Chart", dataset: "pie", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  DonutChart: { label: "Donut Chart", dataset: "pie", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  SankeyDiagram: { label: "Sankey Diagram", dataset: "sankey", propsTemplate: (ds) => ({ edges: ds.edges }) },
  Histogram: { label: "Histogram", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value", bins: 8 }) },
  BoxPlot: { label: "Box Plot", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  SwarmPlot: { label: "Swarm Plot", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  DotPlot: { label: "Dot Plot", dataset: "sales", propsTemplate: (ds) => ({ data: ds.data, categoryAccessor: "category", valueAccessor: "value" }) },
  ForceDirectedGraph: { label: "Force Graph", dataset: "sankey", propsTemplate: (ds) => ({ edges: ds.edges }) },
}

const THEMES = [
  "light", "dark", "tufte", "tufte-dark", "journalist", "journalist-dark",
  "bi-tool", "bi-tool-dark", "carbon", "carbon-dark", "pastels", "pastels-dark",
  "italian", "italian-dark", "playful", "playful-dark", "high-contrast",
]

const LEGEND_POSITIONS = ["right", "left", "top", "bottom"]

// ── Styles ───────────────────────────────────────────────────────────

const selectStyle = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border-color, #ccc)",
  background: "var(--surface-2, #f8f8f8)",
  color: "var(--text-primary, #333)",
  fontSize: "13px",
  width: "100%",
}

const checkboxRowStyle = {
  display: "flex", alignItems: "center", gap: "8px", fontSize: "13px",
}

const labelStyle = {
  fontSize: "11px", fontWeight: 600, color: "var(--text-secondary, #888)",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px",
}

// ── Component ────────────────────────────────────────────────────────

export default function RenderStudioPage() {
  const [chartType, setChartType] = useState("BarChart")
  const [theme, setTheme] = useState("light")
  const [showLegend, setShowLegend] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [legendPosition, setLegendPosition] = useState("right")
  const [width, setWidth] = useState(560)
  const [height, setHeight] = useState(380)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [thresholdValue, setThresholdValue] = useState("")
  const [thresholdLabel, setThresholdLabel] = useState("")
  const [orientation, setOrientation] = useState("vertical")

  const config = CHART_TYPES[chartType]
  const dataset = DATASETS[config.dataset]

  const { svg, code, elapsed } = useMemo(() => {
    const baseProps = config.propsTemplate(dataset)
    const props = {
      ...baseProps,
      width, height, theme, showLegend, showGrid,
      legendPosition,
      ...(title && { title }),
      ...(description && { description }),
      ...(orientation !== "vertical" && chartType !== "LineChart" && chartType !== "Scatterplot" && chartType !== "SankeyDiagram" && chartType !== "ForceDirectedGraph" && { orientation }),
    }

    const annotations = []
    if (thresholdValue && !isNaN(Number(thresholdValue))) {
      annotations.push({
        type: "y-threshold",
        value: Number(thresholdValue),
        label: thresholdLabel || undefined,
        color: "#e45050",
      })
    }
    if (annotations.length > 0) props.annotations = annotations

    const t0 = performance.now()
    let result
    try {
      result = renderChart(chartType, props)
    } catch (e) {
      const msg = escapeForSVG(e && e.message ? e.message : String(e))
      result = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="20" y="40" fill="red">${msg}</text></svg>`
    }
    const t1 = performance.now()

    const codeProps = { ...props }
    delete codeProps.width
    delete codeProps.height
    const codeStr = `import { renderChart } from "semiotic/server"\n\nconst svg = renderChart("${chartType}", ${JSON.stringify(codeProps, null, 2).replace(/"(\w+)":/g, "$1:")
    })`

    return { svg: result, code: codeStr, elapsed: (t1 - t0).toFixed(1) }
  }, [chartType, theme, showLegend, showGrid, legendPosition, width, height, title, description, thresholdValue, thresholdLabel, orientation, config, dataset])

  // ── Animated preview ─────────────────────────────────────────────
  const [showAnimation, setShowAnimation] = useState(false)
  const [animFrameIdx, setAnimFrameIdx] = useState(0)
  const [animPlaying, setAnimPlaying] = useState(false)
  const animRef = useRef(null)

  // Chart type → frame-level chartType mapping
  const frameChartType = {
    BarChart: "bar", StackedBarChart: "bar", GroupedBarChart: "clusterbar",
    LineChart: "line", Scatterplot: "scatter", PieChart: "pie",
    DonutChart: "donut", Histogram: "histogram", BoxPlot: "boxplot",
    SwarmPlot: "swarm", DotPlot: "point", SankeyDiagram: "sankey",
    ForceDirectedGraph: "force",
  }[chartType] || "bar"

  const animFrames = useMemo(() => {
    if (!showAnimation) return []
    try {
      const baseProps = config.propsTemplate(dataset)
      return generateFrameSVGs(frameChartType, baseProps.data || dataset.data, {
        ...baseProps, width, height, theme, title,
        ...(orientation !== "vertical" && { projection: orientation === "horizontal" ? "horizontal" : "vertical" }),
      }, { stepSize: Math.max(1, Math.ceil((baseProps.data || dataset.data || []).length / 20)), transitionFrames: 0 })
    } catch { return [] }
  }, [showAnimation, chartType, theme, width, height, title, orientation, config, dataset, frameChartType])

  useEffect(() => {
    if (!animPlaying || animFrames.length === 0) return
    const id = setInterval(() => {
      setAnimFrameIdx(prev => (prev + 1) % animFrames.length)
    }, 120)
    animRef.current = id
    return () => clearInterval(id)
  }, [animPlaying, animFrames.length])

  // ── Export helpers ──────────────────────────────────────────────
  const copySVG = () => {
    navigator.clipboard?.writeText(svg)
  }

  const downloadSVG = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${chartType.toLowerCase()}-${theme}.svg`
    a.click(); URL.revokeObjectURL(url)
  }

  const downloadPNG = () => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width * 2; canvas.height = height * 2
      const ctx = canvas.getContext("2d")
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const link = document.createElement("a")
      link.download = `${chartType.toLowerCase()}-${theme}@2x.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = url
  }

  const copyEmbedCode = () => {
    const embedCode = `<!-- Server-rendered chart via semiotic/server -->\n${svg}`
    navigator.clipboard?.writeText(embedCode)
  }

  return (
    <PageLayout
      title="Render Studio"
      breadcrumbs={[
        { label: "Server Rendering", path: "/server" },
        { label: "Render Studio", path: "/server/studio" },
      ]}
      prevPage={{ title: "SSR Gallery", path: "/ssr-gallery" }}
      nextPage={{ title: "Theme Showcase", path: "/server/themes" }}
    >
      <p>
        Build server-rendered charts interactively. Every preview below is generated
        by <code>renderChart()</code> from <code>semiotic/server</code> — the same
        function you'd call from Node.js, a serverless function, or a build script.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: "20px",
        marginTop: "24px",
      }}>
        {/* ── Controls panel ───────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "14px",
          padding: "16px",
          background: "var(--surface-2, #f8f8f8)",
          borderRadius: "8px",
          border: "1px solid var(--border-color, #e0e0e0)",
          alignSelf: "start",
          position: "sticky",
          top: "80px",
        }}>
          <div>
            <div style={labelStyle}>Chart Type</div>
            <select value={chartType} onChange={e => setChartType(e.target.value)} style={selectStyle}>
              {Object.entries(CHART_TYPES).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>Theme</div>
            <select value={theme} onChange={e => setTheme(e.target.value)} style={selectStyle}>
              {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <div style={labelStyle}>Width</div>
              <input type="number" value={width} onChange={e => setWidth(+e.target.value)} style={{ ...selectStyle, width: "100%" }} />
            </div>
            <div>
              <div style={labelStyle}>Height</div>
              <input type="number" value={height} onChange={e => setHeight(+e.target.value)} style={{ ...selectStyle, width: "100%" }} />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Orientation</div>
            <select value={orientation} onChange={e => setOrientation(e.target.value)} style={selectStyle}>
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>

          <div style={checkboxRowStyle}>
            <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)} id="legend" />
            <label htmlFor="legend">Show Legend</label>
          </div>

          {showLegend && (
            <div>
              <div style={labelStyle}>Legend Position</div>
              <select value={legendPosition} onChange={e => setLegendPosition(e.target.value)} style={selectStyle}>
                {LEGEND_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div style={checkboxRowStyle}>
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} id="grid" />
            <label htmlFor="grid">Show Grid</label>
          </div>

          <div>
            <div style={labelStyle}>Title</div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Chart title" style={selectStyle} />
          </div>

          <div>
            <div style={labelStyle}>Description (a11y)</div>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Accessible description" style={selectStyle} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-color, #ddd)", paddingTop: "12px" }}>
            <div style={labelStyle}>Y-Threshold Annotation</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <input type="number" value={thresholdValue} onChange={e => setThresholdValue(e.target.value)} placeholder="Value" style={selectStyle} />
              <input type="text" value={thresholdLabel} onChange={e => setThresholdLabel(e.target.value)} placeholder="Label" style={selectStyle} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color, #ddd)", paddingTop: "12px" }}>
            <div style={labelStyle}>Export</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button onClick={copySVG} style={{ ...selectStyle, cursor: "pointer", textAlign: "center" }}>
                Copy SVG
              </button>
              <button onClick={downloadSVG} style={{ ...selectStyle, cursor: "pointer", textAlign: "center" }}>
                Download SVG
              </button>
              <button onClick={downloadPNG} style={{ ...selectStyle, cursor: "pointer", textAlign: "center" }}>
                Download PNG @2x
              </button>
              <button onClick={copyEmbedCode} style={{ ...selectStyle, cursor: "pointer", textAlign: "center" }}>
                Copy Embed Code
              </button>
            </div>
          </div>
        </div>

        {/* ── Preview panel ────────────────────────────────────── */}
        <div>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: "0", marginBottom: "0", borderBottom: "2px solid var(--border-color, #e0e0e0)" }}>
            <button
              onClick={() => { setShowAnimation(false); setAnimPlaying(false) }}
              style={{
                padding: "8px 16px", border: "none", cursor: "pointer",
                borderBottom: !showAnimation ? "2px solid var(--accent, #007bff)" : "2px solid transparent",
                background: "none", color: !showAnimation ? "var(--accent, #007bff)" : "var(--text-secondary, #888)",
                fontWeight: !showAnimation ? 600 : 400, fontSize: "13px", marginBottom: "-2px",
              }}
            >
              Static
            </button>
            <button
              onClick={() => { setShowAnimation(true); setAnimFrameIdx(0); setAnimPlaying(true) }}
              style={{
                padding: "8px 16px", border: "none", cursor: "pointer",
                borderBottom: showAnimation ? "2px solid var(--accent, #007bff)" : "2px solid transparent",
                background: "none", color: showAnimation ? "var(--accent, #007bff)" : "var(--text-secondary, #888)",
                fontWeight: showAnimation ? 600 : 400, fontSize: "13px", marginBottom: "-2px",
              }}
            >
              Animated Preview
            </button>
          </div>

          {/* Chart display */}
          <div style={{
            background: "var(--card-bg, #fff)",
            borderRadius: "0 0 8px 8px",
            padding: "16px",
            border: "1px solid var(--border-color, #e0e0e0)",
            borderTop: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: height + 40,
          }}>
            {showAnimation && animFrames.length > 0 ? (
              <div dangerouslySetInnerHTML={{ __html: animFrames[animFrameIdx] || "" }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            )}
          </div>

          {/* Status bar */}
          <div style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "var(--text-secondary, #888)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            {showAnimation ? (
              <>
                <span>
                  Frame {animFrameIdx + 1} / {animFrames.length}
                  {" "}
                  <button
                    onClick={() => setAnimPlaying(!animPlaying)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent, #007bff)", fontSize: "12px" }}
                  >
                    {animPlaying ? "Pause" : "Play"}
                  </button>
                </span>
                <span>{animFrames.length} frames generated via generateFrameSVGs()</span>
              </>
            ) : (
              <>
                <span>renderChart() returned {(svg.length / 1024).toFixed(1)}KB SVG in {elapsed}ms</span>
              </>
            )}
          </div>

          <details style={{ marginTop: "16px" }} open>
            <summary style={{ cursor: "pointer", fontSize: "13px", color: "var(--text-secondary, #888)", marginBottom: "8px" }}>
              {showAnimation ? "Animated GIF code (Node.js)" : "Generated code"}
            </summary>
            {showAnimation ? (
              <CodeBlock code={`import { renderToAnimatedGif } from "semiotic/server"

const gif = await renderToAnimatedGif("${frameChartType}", data, {
  width: ${width}, height: ${height}, theme: "${theme}",${title ? `\n  title: "${title}",` : ""}
}, {
  fps: 12,
  transitionFrames: 4,
  decay: { type: "linear", minOpacity: 0.2 },
})

// gif is a Buffer — write to file, send in email, return from API
fs.writeFileSync("chart.gif", gif)`} language="js" />
            ) : (
              <CodeBlock code={code} language="js" />
            )}
          </details>
        </div>
      </div>
    </PageLayout>
  )
}
