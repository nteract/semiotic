import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import TimeSeriesBrush from "../../examples/recipes/TimeSeriesBrush"

const fullSourceCode = `import React, { useState } from "react"
import { MinimapXYFrame } from "semiotic"
import { curveMonotoneX } from "d3-shape"

function formatDate(d) {
  const date = new Date(d)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return \`\${months[date.getMonth()]} \${date.getDate()}\`
}

export default function TimeSeriesBrush({ data, width = 700, height = 350 }) {
  const [selectedExtent, setSelectedExtent] = useState(undefined)

  const handleBrushEnd = (e) => {
    if (e) {
      setSelectedExtent(e)
    }
  }

  return (
    <MinimapXYFrame
      size={[width, height]}
      lines={data}
      lineType={{ type: "line", interpolator: curveMonotoneX }}
      xAccessor="date"
      yAccessor="value"
      lineStyle={(d) => ({ stroke: d.color, strokeWidth: 2, fill: "none" })}
      xExtent={selectedExtent}
      matte={true}
      axes={[
        { orient: "left", ticks: 5 },
        { orient: "bottom", ticks: 6, tickFormat: formatDate },
      ]}
      margin={{ left: 60, top: 10, bottom: 40, right: 20 }}
      minimap={{
        brushEnd: handleBrushEnd,
        yBrushable: false,
        xBrushExtent: selectedExtent,
        margin: { left: 60, top: 0, bottom: 20, right: 20 },
        axes: [{ orient: "left", ticks: 2 }],
        size: [width, 60],
        lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1, fill: "none" }),
      }}
      hoverAnnotation={true}
      tooltipContent={(d) => (
        <div style={{
          background: "#1a1a25", border: "1px solid #252530",
          borderRadius: "6px", padding: "8px 12px", fontSize: "13px", color: "#f0f0f5",
        }}>
          <div style={{ fontWeight: 600 }}>{d.parentLine.label}</div>
          <div>{formatDate(d.date)}: {d.value}</div>
        </div>
      )}
    />
  )
}

// Usage:
// const data = [
//   { label: "Series A", color: "#6366f1",
//     coordinates: [{ date: 1704067200000, value: 100 }, ...] },
// ]
// <TimeSeriesBrush data={data} width={700} height={350} />`

export default function TimeSeriesBrushPage() {
  return (
    <RecipeLayout
      title="Time Series with Brush"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Time Series with Brush", path: "/recipes/time-series-brush" },
      ]}
      prevPage={{ title: "KPI Card + Sparkline", path: "/recipes/kpi-card-sparkline" }}
      nextPage={{ title: "Network Explorer", path: "/recipes/network-explorer" }}
      dependencies={["semiotic", "react", "d3-shape"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A multi-series time series chart with a brush minimap for zooming into
        a date range. Uses Semiotic's <code>MinimapXYFrame</code> which
        automatically manages the main chart and brush minimap together.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "var(--surface-1)",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--surface-3)",
      }}>
        <TimeSeriesBrush />
      </div>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Line colors</td>
            <td><code>data[].color</code></td>
            <td>Set the <code>color</code> field on each series object</td>
          </tr>
          <tr>
            <td>Curve interpolation</td>
            <td><code>lineType.interpolator</code></td>
            <td>Swap <code>curveMonotoneX</code> for any d3-shape curve</td>
          </tr>
          <tr>
            <td>Date formatting</td>
            <td><code>formatDate</code> function</td>
            <td>Adjust the format string for your locale</td>
          </tr>
          <tr>
            <td>Minimap height</td>
            <td><code>minimap.size</code></td>
            <td>Change the second value in <code>[width, 60]</code></td>
          </tr>
          <tr>
            <td>Initial zoom</td>
            <td><code>useState</code> default</td>
            <td>Pass an initial <code>[startDate, endDate]</code> extent</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        <code>MinimapXYFrame</code> renders two coordinated XYFrames: a main chart
        and a smaller minimap below it. The minimap's <code>brushEnd</code> callback
        updates the <code>selectedExtent</code> state, which is passed to both
        <code>xExtent</code> (to zoom the main chart) and <code>xBrushExtent</code>
        (to reflect the selection in the minimap).
      </p>
      <p>
        The <code>matte</code> prop adds a semi-transparent overlay to areas outside
        the selected range in the main chart. Line data uses timestamp numbers for the
        x-axis, formatted by the <code>tickFormat</code> function on the bottom axis.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/frames/xy-frame">XYFrame</Link> — the base frame for line charts</li>
        <li><Link to="/features/interaction">Interaction</Link> — brush and interaction patterns</li>
        <li><Link to="/charts/line-chart">Line Chart</Link> — simpler line chart recipe</li>
      </ul>
    </RecipeLayout>
  )
}
