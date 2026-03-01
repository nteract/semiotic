import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import KpiCardSparkline from "../../examples/recipes/KpiCardSparkline"

const fullSourceCode = `import React from "react"
import { XYFrame } from "semiotic"

function formatValue(value, unit) {
  if (unit === "$") return \`$\${value.toLocaleString()}\`
  if (unit === "%") return \`\${value}%\`
  return value.toLocaleString()
}

function KpiCard({ label, value, previousValue, unit, trend }) {
  const change = ((value - previousValue) / previousValue) * 100
  const isPositive = change >= 0
  const sparkColor = isPositive ? "#22c55e" : "#ef4444"

  return (
    <div style={{
      background: "var(--surface-1, #12121a)",
      border: "1px solid var(--surface-3, #252530)",
      borderRadius: "12px",
      padding: "20px",
    }}>
      <div style={{
        fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.05em", color: "var(--text-secondary, #8888a0)",
        marginBottom: "4px",
      }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2, marginBottom: "8px" }}>
        {formatValue(value, unit)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{
          fontSize: "13px", fontWeight: 600,
          color: isPositive ? "#22c55e" : "#ef4444",
        }}>
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </span>
        <XYFrame
          size={[120, 40]}
          lines={[{ coordinates: trend }]}
          xAccessor="day"
          yAccessor="value"
          lineStyle={{ stroke: sparkColor, strokeWidth: 2, fill: "none" }}
          margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
        />
      </div>
    </div>
  )
}

export default function KpiCardSparkline({ data }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
    }}>
      {data.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}

// Usage:
// <KpiCardSparkline data={[
//   { label: "Revenue", value: 128400, previousValue: 112300, unit: "$",
//     trend: [{ day: 1, value: 112 }, { day: 2, value: 115 }, ...] },
// ]} />`

export default function KpiCardSparklinePage() {
  return (
    <RecipeLayout
      title="KPI Card + Sparkline"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "KPI Card + Sparkline", path: "/recipes/kpi-card-sparkline" },
      ]}
      nextPage={{ title: "Time Series with Brush", path: "/recipes/time-series-brush" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A dashboard KPI card that shows a metric's current value, percent change
        from the previous period, and an inline sparkline trend. Uses Semiotic's
        <code>XYFrame</code> at minimal size with no axes for the sparkline.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "var(--surface-0)",
        borderRadius: "8px",
        padding: "24px",
        border: "1px solid var(--surface-3)",
      }}>
        <KpiCardSparkline />
      </div>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Sparkline color</td>
            <td><code>sparkColor</code> variable</td>
            <td>Change the green/red hex values</td>
          </tr>
          <tr>
            <td>Sparkline size</td>
            <td><code>XYFrame size</code></td>
            <td>Adjust the <code>[width, height]</code> array</td>
          </tr>
          <tr>
            <td>Value formatting</td>
            <td><code>formatValue</code> function</td>
            <td>Add cases for new unit types</td>
          </tr>
          <tr>
            <td>Card layout</td>
            <td>Grid container</td>
            <td>Change <code>gridTemplateColumns</code> minmax values</td>
          </tr>
          <tr>
            <td>Trend data</td>
            <td><code>data</code> prop</td>
            <td>Pass your own array of KPI objects</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Each KPI card renders an <code>XYFrame</code> with <code>lines</code> containing
        a single series. The frame uses zero-margin axes and a tiny size to create an
        inline sparkline. The <code>xAccessor</code> and <code>yAccessor</code> props
        map to the <code>day</code> and <code>value</code> fields of each trend data point.
      </p>
      <p>
        The percent change is calculated from <code>value</code> vs <code>previousValue</code>,
        with the sparkline color matching the direction (green for positive, red for negative).
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/frames/xy-frame">XYFrame</Link> — underlying frame for sparklines</li>
        <li><Link to="/features/sparklines">Sparklines</Link> — more sparkline patterns</li>
        <li><Link to="/charts/line-chart">Line Chart</Link> — full-size line visualizations</li>
      </ul>
    </RecipeLayout>
  )
}
