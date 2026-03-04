import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import TimeSeriesBrush from "../../examples/recipes/TimeSeriesBrush"

const fullSourceCode = `import React from "react"
import { MinimapChart } from "semiotic"

function formatDate(d) {
  const date = new Date(d)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return \`\${months[date.getMonth()]} \${date.getDate()}\`
}

export default function TimeSeriesBrush({ data, width = 700, height = 350 }) {
  return (
    <MinimapChart
      data={data}
      width={width}
      height={height}
      xAccessor="date"
      yAccessor="value"
      lineBy="series"
      colorBy="series"
      colorScheme={["#6366f1", "#22c55e", "#f59e0b"]}
      curve="monotoneX"
      lineWidth={2}
      enableHover={true}
      xFormat={formatDate}
      margin={{ left: 60, top: 10, bottom: 40, right: 20 }}
      minimap={{
        height: 60,
        margin: { left: 60, top: 0, bottom: 20, right: 20 },
      }}
      tooltip={{
        title: "series",
        fields: [
          { field: "date", label: "Date", format: formatDate },
          { field: "value", label: "Value" }
        ]
      }}
    />
  )
}

// Usage with flat data:
// const data = [
//   { date: 1704067200000, value: 100, series: "A", color: "#6366f1" },
//   { date: 1704153600000, value: 102, series: "A", color: "#6366f1" },
//   ...
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
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A multi-series time series chart with a brush minimap for zooming into
        a date range. Uses Semiotic's <code>MinimapChart</code> which
        renders a main chart and an overview minimap with d3-brush for
        selecting a date range.
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
            <td><code>colorScheme</code></td>
            <td>Pass an array of color strings</td>
          </tr>
          <tr>
            <td>Curve interpolation</td>
            <td><code>curve</code></td>
            <td>Use "monotoneX", "step", "basis", etc.</td>
          </tr>
          <tr>
            <td>Date formatting</td>
            <td><code>xFormat</code></td>
            <td>Pass a formatter function for the x-axis</td>
          </tr>
          <tr>
            <td>Minimap height</td>
            <td><code>minimap.height</code></td>
            <td>Change the height value (default: 60)</td>
          </tr>
          <tr>
            <td>Initial zoom</td>
            <td><code>brushExtent</code></td>
            <td>Pass an initial <code>[startDate, endDate]</code> for controlled brushing</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        <code>MinimapChart</code> renders two coordinated StreamXYFrames: a main chart
        and a smaller overview below it. The overview has a d3-brush overlay that
        controls the <code>xExtent</code> of the main chart. Drag the brush to zoom
        into a date range, or drag the brush edges to resize the selection.
      </p>
      <p>
        The <code>minimap</code> prop configures the overview chart's height, margins,
        and styling. Use <code>brushExtent</code> and <code>onBrush</code> for
        controlled brush state.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/line-chart">Line Chart</Link> — simpler line chart</li>
        <li><Link to="/features/interaction">Interaction</Link> — brush and interaction patterns</li>
      </ul>
    </RecipeLayout>
  )
}
