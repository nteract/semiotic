import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import KpiCardSparkline from "../../examples/recipes/KpiCardSparkline"

const fullSourceCode = `import React from "react"
import { StreamXYFrame } from "semiotic"

function formatValue(value, unit) {
  if (unit === "$") return \`$\${value.toLocaleString()}\`
  if (unit === "%") return \`\${value}%\`
  return value.toLocaleString()
}

// Standard sparkline KPI card
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
        <StreamXYFrame
          chartType="line"
          size={[120, 40]}
          data={trend}
          xAccessor="day"
          yAccessor="value"
          lineStyle={{ stroke: sparkColor, strokeWidth: 2 }}
          showAxes={false}
          margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
        />
      </div>
    </div>
  )
}

// Forecast sparkline KPI card with confidence interval
function ForecastKpiCard({ label, value, previousValue, unit, actual, forecast }) {
  const change = ((value - previousValue) / previousValue) * 100
  const isPositive = change >= 0
  const sparkColor = isPositive ? "#22c55e" : "#ef4444"

  const flatData = [
    ...actual.map(d => ({ ...d, lineGroup: "actual", forecast: false })),
    ...forecast.map(d => ({ ...d, lineGroup: "forecast", forecast: true })),
  ]

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
        <StreamXYFrame
          chartType="line"
          size={[160, 50]}
          data={flatData}
          groupAccessor="lineGroup"
          xAccessor="day"
          yAccessor="value"
          lineStyle={(d) => d.forecast
            ? { stroke: sparkColor, strokeWidth: 2, strokeDasharray: "3 2" }
            : { stroke: sparkColor, strokeWidth: 2 }
          }
          boundsAccessor={d => d.uncertainty || 0}
          boundsStyle={{ fill: sparkColor, fillOpacity: 0.15, stroke: "none" }}
          showAxes={false}
          margin={{ top: 6, bottom: 6, left: 0, right: 0 }}
        />
      </div>
      <div style={{
        fontSize: "10px", color: "var(--text-secondary, #8888a0)",
        marginTop: "4px", fontStyle: "italic",
      }}>
        forecast with confidence interval
      </div>
    </div>
  )
}

// Usage:
// <KpiCard label="Revenue" value={128400} previousValue={112300}
//   unit="$" trend={[{ day: 1, value: 112 }, ...]} />
//
// <ForecastKpiCard label="Projected Revenue" value={142000}
//   previousValue={128400} unit="$"
//   actual={[{ day: 1, value: 112 }, ...]}
//   forecast={[{ day: 9, value: 128, uncertainty: 0 },
//     { day: 10, value: 131, uncertainty: 4 }, ...]} />`

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
        <code>StreamXYFrame</code> at minimal size with no axes for the sparkline.
      </p>
      <p>
        The fourth card demonstrates a <strong>forecast sparkline</strong> with a
        confidence interval cone, combining actual data with projected values.
        The forecast segment uses a dashed line and the <code>boundsAccessor</code> prop
        to render a growing uncertainty band, similar to the{" "}
        <Link to="/cookbook/uncertainty-visualization">Uncertainty Visualization</Link> cookbook
        recipe but at sparkline scale.
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
            <td><code>StreamXYFrame size</code></td>
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
          <tr>
            <td>Forecast confidence</td>
            <td><code>boundsAccessor</code></td>
            <td>Each forecast point's <code>uncertainty</code> value controls the band width</td>
          </tr>
          <tr>
            <td>Forecast line style</td>
            <td><code>lineStyle</code> function</td>
            <td>Check <code>d.forecast</code> to switch between solid and dashed strokes</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Each KPI card renders a <code>StreamXYFrame</code> with a single line series.
        The frame uses zero-margin axes and a tiny size to create an inline sparkline.
        The <code>xAccessor</code> and <code>yAccessor</code> props map to the{" "}
        <code>day</code> and <code>value</code> fields of each trend data point.
      </p>
      <p>
        The percent change is calculated from <code>value</code> vs <code>previousValue</code>,
        with the sparkline color matching the direction (green for positive, red for negative).
      </p>
      <p>
        The forecast card uses <code>groupAccessor</code> to split data into "actual" and
        "forecast" line groups. The <code>lineStyle</code> function checks a <code>forecast</code> flag
        to render the projected segment with a dashed stroke. The <code>boundsAccessor</code> reads
        each point's <code>uncertainty</code> value to draw the confidence interval cone, matching
        the pattern from the <Link to="/cookbook/uncertainty-visualization">Uncertainty Visualization</Link> recipe.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/frames/xy-frame">StreamXYFrame</Link> — underlying frame for sparklines</li>
        <li><Link to="/cookbook/uncertainty-visualization">Uncertainty Visualization</Link> — full-size forecast with confidence interval</li>
        <li><Link to="/charts/line-chart">Line Chart</Link> — full-size line visualizations</li>
      </ul>
    </RecipeLayout>
  )
}
