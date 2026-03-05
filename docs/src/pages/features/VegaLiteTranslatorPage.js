import React, { useState, useMemo } from "react"
import { BarChart, LineChart, Scatterplot, configToJSX, fromVegaLite } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

// ---------------------------------------------------------------------------
// Sample Vega-Lite specs
// ---------------------------------------------------------------------------

const SAMPLES = {
  "Bar Chart": JSON.stringify(
    {
      mark: "bar",
      data: {
        values: [
          { region: "North", sales: 420 },
          { region: "South", sales: 380 },
          { region: "East", sales: 510 },
          { region: "West", sales: 290 },
        ],
      },
      encoding: {
        x: { field: "region", type: "nominal" },
        y: { field: "sales", type: "quantitative" },
      },
    },
    null,
    2,
  ),
  "Line Chart": JSON.stringify(
    {
      mark: { type: "line", interpolate: "monotone-x", point: true },
      data: {
        values: [
          { month: 1, revenue: 12000 },
          { month: 2, revenue: 18000 },
          { month: 3, revenue: 14000 },
          { month: 4, revenue: 22000 },
          { month: 5, revenue: 19000 },
          { month: 6, revenue: 27000 },
        ],
      },
      encoding: {
        x: { field: "month", type: "quantitative", axis: { title: "Month" } },
        y: {
          field: "revenue",
          type: "quantitative",
          axis: { title: "Revenue ($)" },
        },
      },
    },
    null,
    2,
  ),
  Scatterplot: JSON.stringify(
    {
      mark: "point",
      data: {
        values: [
          { x: 10, y: 20, species: "A" },
          { x: 25, y: 35, species: "B" },
          { x: 40, y: 15, species: "A" },
          { x: 55, y: 45, species: "C" },
          { x: 70, y: 30, species: "B" },
          { x: 85, y: 50, species: "C" },
        ],
      },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        color: { field: "species", type: "nominal" },
      },
    },
    null,
    2,
  ),
  "Pie Chart": JSON.stringify(
    {
      mark: "arc",
      data: {
        values: [
          { category: "Desktop", share: 55 },
          { category: "Mobile", share: 35 },
          { category: "Tablet", share: 10 },
        ],
      },
      encoding: {
        theta: { field: "share", type: "quantitative" },
        color: { field: "category", type: "nominal" },
      },
    },
    null,
    2,
  ),
  Heatmap: JSON.stringify(
    {
      mark: "rect",
      data: {
        values: [
          { day: "Mon", hour: "9am", temp: 20 },
          { day: "Mon", hour: "12pm", temp: 28 },
          { day: "Mon", hour: "3pm", temp: 32 },
          { day: "Tue", hour: "9am", temp: 18 },
          { day: "Tue", hour: "12pm", temp: 25 },
          { day: "Tue", hour: "3pm", temp: 30 },
          { day: "Wed", hour: "9am", temp: 22 },
          { day: "Wed", hour: "12pm", temp: 27 },
          { day: "Wed", hour: "3pm", temp: 34 },
        ],
      },
      encoding: {
        x: { field: "day", type: "nominal" },
        y: { field: "hour", type: "nominal" },
        color: { field: "temp", type: "quantitative" },
      },
    },
    null,
    2,
  ),
  "Stacked Area": JSON.stringify(
    {
      mark: "area",
      data: {
        values: [
          { x: 1, y: 10, series: "A" },
          { x: 2, y: 15, series: "A" },
          { x: 3, y: 12, series: "A" },
          { x: 1, y: 8, series: "B" },
          { x: 2, y: 12, series: "B" },
          { x: 3, y: 18, series: "B" },
        ],
      },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        color: { field: "series", type: "nominal" },
      },
    },
    null,
    2,
  ),
}

// ---------------------------------------------------------------------------
// Chart renderer — maps component name to Semiotic component
// ---------------------------------------------------------------------------

const COMPONENT_MAP = {
  BarChart: (props) => <BarChart {...props} />,
  LineChart: (props) => <LineChart {...props} />,
  Scatterplot: (props) => <Scatterplot {...props} />,
}

function renderChart(config) {
  // Lazy-import approach — we render the few most common chart types inline.
  // For other types we just show the JSX output.
  const Component = COMPONENT_MAP[config.component]
  if (Component) {
    return Component({ ...config.props, width: 480, height: 320 })
  }
  return (
    <div
      style={{
        padding: "32px",
        textAlign: "center",
        color: "var(--text-secondary)",
        border: "1px dashed var(--surface-3)",
        borderRadius: "8px",
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>{config.component}</strong> preview not available in the docs
        demo.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: "0.9em" }}>
        Copy the generated JSX below to use it in your app.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function VegaLiteTranslatorPage() {
  const [specText, setSpecText] = useState(SAMPLES["Bar Chart"])
  const [error, setError] = useState(null)

  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(specText)
      const config = fromVegaLite(parsed)
      setError(null)
      return config
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [specText])

  const jsxOutput = useMemo(() => {
    if (!result) return ""
    return configToJSX(result)
  }, [result])

  return (
    <PageLayout
      title="Vega-Lite Translator"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Vega-Lite Translator", path: "/features/vega-lite" },
      ]}
      prevPage={{ title: "Serialization", path: "/features/serialization" }}
    >
      {/* ── Why ────────────────────────────────────────────────────────── */}
      <section>
        <h2>Why</h2>
        <p>
          Vega-Lite is the most popular declarative grammar for visualization.
          Many users have existing Vega-Lite specs from notebooks, dashboards,
          or AI-generated output. The <code>fromVegaLite()</code> function lets
          you paste a spec and get a working Semiotic chart instantly.
        </p>
        <p>
          The function returns a <code>ChartConfig</code>, so it composes with{" "}
          <code>configToJSX()</code>, <code>copyConfig()</code>,{" "}
          <code>toURL()</code>, and the rest of the serialization API.
        </p>

        <CodeBlock language="jsx" code={`import { fromVegaLite } from "semiotic/data"
import { configToJSX, fromConfig } from "semiotic"

const config = fromVegaLite(vegaLiteSpec)

// Get JSX code
const jsx = configToJSX(config)

// Or reconstruct props for rendering
const { componentName, props } = fromConfig(config)`} />
      </section>

      {/* ── Live Translator ────────────────────────────────────────────── */}
      <section>
        <h2>Live Translator</h2>
        <p>
          Edit the Vega-Lite JSON spec below or load a sample. The translated
          Semiotic chart and generated JSX update automatically.
        </p>

        {/* Vega-Lite JSON input */}
        <div style={{ marginBottom: "16px" }}>
          <textarea
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: "300px",
              fontFamily: "monospace",
              fontSize: "0.85em",
              padding: "12px",
              border: error
                ? "2px solid #e41a1c"
                : "1px solid var(--surface-3)",
              borderRadius: "8px",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#e41a1c", fontSize: "0.85em", marginTop: "4px" }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {Object.keys(SAMPLES).map((name) => (
            <button
              key={name}
              onClick={() => setSpecText(SAMPLES[name])}
              style={{
                padding: "6px 12px",
                border: "1px solid var(--surface-3)",
                borderRadius: "6px",
                background: specText === SAMPLES[name] ? "var(--accent)" : "var(--surface-1)",
                color: specText === SAMPLES[name] ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
                fontSize: "0.85em",
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Semiotic output */}
        {result && (
          <div style={{ marginBottom: "24px" }}>
            <h3>
              Semiotic Output
              <span
                style={{
                  fontWeight: "normal",
                  fontSize: "0.8em",
                  color: "var(--text-secondary)",
                  marginLeft: "8px",
                }}
              >
                → {result.component}
              </span>
            </h3>

            {result.warnings && result.warnings.length > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fff3cd",
                  borderRadius: "6px",
                  fontSize: "0.85em",
                  color: "#856404",
                  marginBottom: "12px",
                }}
              >
                {result.warnings.map((w, i) => (
                  <p key={i} style={{ margin: i > 0 ? "4px 0 0" : 0 }}>
                    {w}
                  </p>
                ))}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>{renderChart(result)}</div>

            <CodeBlock language="jsx" code={jsxOutput} />
          </div>
        )}

      </section>

      {/* ── Mapping Reference ──────────────────────────────────────────── */}
      <section>
        <h2>Mark → Component Mapping</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Vega-Lite Mark</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Semiotic Component</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Condition</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["bar", "BarChart", "default"],
              ["bar + color", "StackedBarChart", "color encoding present"],
              ["line", "LineChart", "default"],
              ["area", "AreaChart", "default"],
              ["area + color", "StackedAreaChart", "color encoding present"],
              ["point / circle / square", "Scatterplot", "default"],
              ["point + size", "BubbleChart", "size encoding present"],
              ["rect", "Heatmap", "default"],
              ["arc", "PieChart", "default"],
              ["arc + innerRadius", "DonutChart", "innerRadius > 0"],
              ["tick", "DotPlot", "default"],
              ["any + bin", "Histogram", "bin encoding present"],
            ].map(([mark, comp, cond], i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--surface-3)" }}>
                <td style={{ padding: "8px" }}><code>{mark}</code></td>
                <td style={{ padding: "8px" }}><code>{comp}</code></td>
                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{cond}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Encoding → Props Mapping</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Vega-Lite Encoding</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Semiotic Prop</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["encoding.x.field", "xAccessor / categoryAccessor"],
              ["encoding.y.field", "yAccessor / valueAccessor"],
              ["encoding.color.field", "colorBy"],
              ["encoding.color.scale.scheme", "colorScheme"],
              ["encoding.size.field", "sizeBy"],
              ["encoding.size.scale.range", "sizeRange"],
              ["encoding.theta.field", "valueAccessor (arc)"],
              ["encoding.x.axis.title", "xLabel / categoryLabel"],
              ["encoding.y.axis.title", "yLabel / valueLabel"],
              ["mark.interpolate", "curve"],
              ["mark.point", "showPoints"],
              ["mark.innerRadius", "innerRadius"],
              ["spec.width", "width"],
              ["spec.height", "height"],
              ["spec.title", "title"],
            ].map(([vl, sem], i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--surface-3)" }}>
                <td style={{ padding: "8px" }}><code>{vl}</code></td>
                <td style={{ padding: "8px" }}><code>{sem}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Limitations ────────────────────────────────────────────────── */}
      <section>
        <h2>Limitations</h2>
        <ul>
          <li>
            <strong>Inline data only</strong> — <code>data.url</code> is not
            supported. Load your data first, then pass it in the spec as{" "}
            <code>data.values</code>.
          </li>
          <li>
            <strong>No layers or facets</strong> — only single-mark specs are
            translated. Multi-layer or faceted views are not supported.
          </li>
          <li>
            <strong>No selections</strong> — Vega-Lite selections (
            <code>params</code>) are not translated.
          </li>
          <li>
            <strong>Limited transforms</strong> — only <code>aggregate</code>{" "}
            and <code>bin</code> are handled. Other transforms (filter, fold,
            calculate) should be applied to your data before calling{" "}
            <code>fromVegaLite()</code>.
          </li>
          <li>
            <strong>Core marks only</strong> — <code>geoshape</code>,{" "}
            <code>text</code>, <code>rule</code>, and <code>image</code> marks
            are not supported.
          </li>
        </ul>
      </section>
    </PageLayout>
  )
}
