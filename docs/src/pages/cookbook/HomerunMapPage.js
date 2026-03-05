import React, { useRef, useEffect, useState } from "react"
import { StreamXYFrame } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

import HomerunMap from "../../examples/HomerunMap"
import { data as stantonData, fieldGraphic } from "../../examples/stanton"
import { extent } from "d3-array"
import { scaleLinear } from "d3-scale"
import theme from "../../theme"

// ---------------------------------------------------------------------------
// Streaming demo — replay the season chronologically
// ---------------------------------------------------------------------------

// Sort by date so the season replays in order
const sortedData = [...stantonData].sort(
  (a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
)

const velocityExtent = extent(stantonData.map((d) => d.exit_velocity))
// Pre-compute spatial extents from the full dataset so the streaming
// version uses identical scales to the static version
const bxExtent = extent(stantonData.map((d) => d.bx))
const byExtent = extent(stantonData.map((d) => d.by))
const velocityScale = scaleLinear()
  .domain(velocityExtent)
  .range([theme[2], theme[1]])

const streamingHomerunCode = `import { useRef, useEffect, useState } from "react"
import { StreamXYFrame } from "semiotic"
import { scaleLinear } from "d3-scale"

// Sort home runs chronologically
const sortedData = [...data].sort(
  (a, b) => new Date(a.game_date) - new Date(b.game_date)
)

function StreamingHomerunMap() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [latest, setLatest] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current && indexRef.current < sortedData.length) {
        const d = sortedData[indexRef.current++]
        chartRef.current.push(d)
        setLatest(d)
      }
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      {latest ? (
        <div style={{ fontSize: 13, marginBottom: 4, opacity: 0.7 }}>
          HR #{indexRef.current} — {latest.game_date}
          {" · "}{latest.distance}ft at {latest.exit_velocity}mph
        </div>
      ) : <div>Starting the season...</div>}
      <StreamXYFrame
        ref={chartRef}
        chartType="scatter"
        runtimeMode="streaming"
        size={[500, 500]}
        xAccessor="bx"
        yAccessor="by"
        // Alias x/y to time/value for streaming mode
        timeAccessor="bx"
        valueAccessor="by"
        // Pre-compute extents from full dataset so scale
        // matches the static version exactly
        yExtent={[-50, byExtent[1]]}
        xExtent={bxExtent}
        windowSize={200}
        pointStyle={d => ({
          fill: velocityScale(d.exit_velocity),
          r: 6
        })}
        enableHover
        showAxes={false}
        backgroundGraphics={fieldGraphic}
        pulse={{ duration: 600, color: "rgba(255,255,0,0.8)", glowRadius: 6 }}
        margin={{ left: 25, right: 25, top: 25, bottom: 25 }}
      />
    </div>
  )
}`

function StreamingHomerunDemo({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [latest, setLatest] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current && indexRef.current < sortedData.length) {
        const d = sortedData[indexRef.current++]
        chartRef.current.push(d)
        setLatest(d)
      }
    }, 400)
    return () => clearInterval(id)
  }, [])

  const chartSize = Math.min(width, 500)

  return (
    <div>
      {latest ? (
        <div style={{ fontSize: 13, marginBottom: 4, opacity: 0.7 }}>
          HR #{indexRef.current} — {latest.game_date}
          {" · "}{latest.distance}ft at {latest.exit_velocity}mph
        </div>
      ) : <div>Starting the season...</div>}
      <StreamXYFrame
        ref={chartRef}
        chartType="scatter"
        runtimeMode="streaming"
        size={[chartSize, chartSize]}
        xAccessor="bx"
        yAccessor="by"
        timeAccessor="bx"
        valueAccessor="by"
        yExtent={[-50, byExtent[1]]}
        xExtent={bxExtent}
        windowSize={200}
        pointStyle={(d) => ({
          fill: velocityScale(d.exit_velocity),
          r: 6
        })}
        enableHover
        showAxes={false}
        backgroundGraphics={fieldGraphic}
        pulse={{ duration: 600, color: "rgba(255,255,0,0.8)", glowRadius: 6 }}
        margin={{ left: 25, right: 25, top: 25, bottom: 25 }}
      />
    </div>
  )
}

export default function HomerunMapPage() {
  return (
    <PageLayout
      title="Homerun Map"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Homerun Map", path: "/cookbook/homerun-map" }
      ]}
      prevPage={{
        title: "Candlestick Chart",
        path: "/cookbook/candlestick-chart"
      }}
      nextPage={{
        title: "Canvas Interaction",
        path: "/cookbook/canvas-interaction"
      }}
    >
      <p>
        Sometimes your scatter plot data lives in a spatial context — a
        baseball field, a floor plan, or a geographic region. This recipe shows
        how to overlay point data on a custom background graphic,
        creating a spatial data visualization of Giancarlo Stanton's home runs
        plotted on a baseball diamond.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <StreamingToggle
        staticContent={
          <div
            style={{
              background: "var(--surface-1)",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid var(--surface-3)"
            }}
          >
            <HomerunMap />
          </div>
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingHomerunDemo width={w} />}
            code={streamingHomerunCode}
          />
        }
      />

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>backgroundGraphics</code> prop accepts any React
        node and renders it behind the data layer. Here it is an SVG group
        containing the baseball field outline. Points are then positioned using
        their spatial coordinates (<code>bx</code> and <code>by</code>):
      </p>
      <CodeBlock
        code={`<StreamXYFrame
  chartType="scatter"
  data={data}
  xAccessor="bx"
  yAccessor="by"
  yExtent={[-50]}
  backgroundGraphics={fieldGraphic}
  enableHover
  pointStyle={d => ({
    fill: velocityScale(d.exit_velocity),
    r: 6
  })}
/>`}
        language="jsx"
      />

      <h2 id="streaming-replay">Streaming: Replaying Events Over Time</h2>
      <p>
        Not all streaming data comes from a live feed. Sometimes you have a
        small, bounded dataset — like 51 home runs over a season — but want to
        <strong> replay it chronologically</strong> to reveal patterns that a
        static scatter plot hides: when the hot streaks happened, how exit
        velocity changed through the season, or whether late-season homers
        clustered to a particular field zone.
      </p>
      <p>
        The push API makes this trivial. Sort your data by date, then feed it to
        the chart with <code>setInterval</code>. Each <code>push()</code> adds
        one point to the canvas and the chart updates instantly. Because{" "}
        <code>windowSize</code> is set larger than the dataset, nothing gets
        evicted — every home run accumulates on the field.
      </p>
      <CodeBlock
        code={`// Sort chronologically, then push one at a time
const sorted = [...data].sort((a, b) =>
  new Date(a.game_date) - new Date(b.game_date)
)

useEffect(() => {
  const id = setInterval(() => {
    if (chartRef.current && i < sorted.length) {
      chartRef.current.push(sorted[i++])
    }
  }, 400)
  return () => clearInterval(id)
}, [])`}
        language="jsx"
      />
      <p>
        This pattern works for any event dataset: pitch locations over a game,
        customer orders over a day, sensor alerts on a floor plan. The key
        ingredients are:
      </p>
      <ul>
        <li>
          <strong>Fixed extents</strong> — set <code>xExtent</code> and{" "}
          <code>yExtent</code> to the full spatial range so the scale doesn't
          jump as points arrive.
        </li>
        <li>
          <strong><code>windowSize</code> ≥ dataset length</strong> — ensures no
          points are evicted from the ring buffer.
        </li>
        <li>
          <strong><code>runtimeMode="streaming"</code></strong> — tells
          StreamXYFrame to use the push API path.
        </li>
        <li>
          <strong>A status line</strong> — show which event just arrived (date,
          details) so the viewer understands the timeline.
        </li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use <code>backgroundGraphics</code> to place any SVG or HTML content
          behind your data layer, enabling spatial visualizations.
        </li>
        <li>
          Continuous color scales (via d3-scale) can encode a quantitative
          dimension on each point beyond x and y position.
        </li>
        <li>
          The push API isn't only for live data — replaying a small dataset
          chronologically can reveal temporal patterns that a static chart
          obscures.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — simpler point-based
          XY visualization
        </li>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> —
          streaming time-series data
        </li>
        <li>
          <Link to="/cookbook/canvas-interaction">Canvas Interaction</Link> —
          large dataset scatter plot with progressive rendering
        </li>
      </ul>
    </PageLayout>
  )
}
