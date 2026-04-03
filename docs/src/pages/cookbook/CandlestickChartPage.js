import React, { useRef, useEffect } from "react"
import { StreamXYFrame } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

import CandlestickChart from "../../examples/CandlestickChart"

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingCandlestickCode = `import { useRef, useEffect } from "react"
import { StreamXYFrame } from "semiotic"

function StreamingCandlestick() {
  const chartRef = useRef()
  const priceRef = useRef(350)
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const open = priceRef.current
        const change = (Math.random() - 0.48) * 10
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 5
        const low = Math.min(open, close) - Math.random() * 5
        priceRef.current = close

        chartRef.current.push({
          time: i, open, high, low, close,
        })
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="candlestick"
      runtimeMode="streaming"
      size={[600, 300]}
      openAccessor="open"
      highAccessor="high"
      lowAccessor="low"
      closeAccessor="close"
      candlestickStyle={{
        upColor: "#4daf4a",
        downColor: "#e41a1c",
        wickColor: "#999",
      }}
      windowSize={40}
      showAxes
    />
  )
}`

function StreamingCandlestickDemo({ width }) {
  const chartRef = useRef()
  const priceRef = useRef(350)
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const open = priceRef.current
        const change = (Math.random() - 0.48) * 10
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 5
        const low = Math.min(open, close) - Math.random() * 5
        priceRef.current = close

        chartRef.current.push({
          time: i, open, high, low, close,
        })
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="candlestick"
      runtimeMode="streaming"
      size={[width, 300]}
      openAccessor="open"
      highAccessor="high"
      lowAccessor="low"
      closeAccessor="close"
      candlestickStyle={{
        upColor: "#4daf4a",
        downColor: "#e41a1c",
        wickColor: "#999",
      }}
      windowSize={40}
      showAxes={true}
    />
  )
}

export default function CandlestickChartPage() {
  return (
    <PageLayout
      title="Candlestick Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Candlestick Chart", path: "/cookbook/candlestick-chart" },
      ]}
      nextPage={{ title: "Homerun Map", path: "/cookbook/homerun-map" }}
    >
      <p>
        Financial data often requires showing open, high, low, and close values
        for each time period. A standard line chart cannot capture all four
        dimensions at once. StreamXYFrame supports candlestick charts as a
        first-class chart type with dedicated accessors for each price
        dimension.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <StreamingToggle
        staticContent={
          <div
            style={{
              background: "var(--surface-1)",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid var(--surface-3)",
            }}
          >
            <CandlestickChart />
          </div>
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingCandlestickDemo width={w} />}
            code={streamingCandlestickCode}
          />
        }
      />

      <h2 id="how-it-works">How It Works</h2>
      <p>
        Set <code>chartType="candlestick"</code> and provide four accessors for
        the OHLC values. StreamXYFrame automatically computes the y-extent from
        the high/low range and sizes the candle bodies based on data spacing:
      </p>
      <CodeBlock
        code={`<StreamXYFrame
  chartType="candlestick"
  data={data}
  xAccessor={d => new Date(d.date).getTime()}
  openAccessor="open"
  highAccessor="high"
  lowAccessor="low"
  closeAccessor="close"
  candlestickStyle={{
    upColor: "#4daf4a",   // close >= open
    downColor: "#e41a1c", // close < open
    wickColor: "#999",
  }}
/>`}
        language="jsx"
      />
      <p>
        The <code>candlestickStyle</code> prop controls colors for up days
        (close &ge; open), down days (close &lt; open), and the wick line.
        You can also set <code>bodyWidth</code> and <code>wickWidth</code> for
        fine-grained control.
      </p>

      <h2 id="customization">Customization</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>openAccessor</code></td>
            <td>string | function</td>
            <td>Accessor for the opening price</td>
          </tr>
          <tr>
            <td><code>highAccessor</code></td>
            <td>string | function</td>
            <td>Accessor for the high price</td>
          </tr>
          <tr>
            <td><code>lowAccessor</code></td>
            <td>string | function</td>
            <td>Accessor for the low price</td>
          </tr>
          <tr>
            <td><code>closeAccessor</code></td>
            <td>string | function</td>
            <td>Accessor for the closing price</td>
          </tr>
          <tr>
            <td><code>candlestickStyle.upColor</code></td>
            <td>string</td>
            <td>Fill color for up days (default: "#4daf4a")</td>
          </tr>
          <tr>
            <td><code>candlestickStyle.downColor</code></td>
            <td>string</td>
            <td>Fill color for down days (default: "#e41a1c")</td>
          </tr>
          <tr>
            <td><code>candlestickStyle.wickColor</code></td>
            <td>string</td>
            <td>Wick stroke color (default: "#333")</td>
          </tr>
          <tr>
            <td><code>candlestickStyle.bodyWidth</code></td>
            <td>number</td>
            <td>Override auto-computed candle body width in pixels</td>
          </tr>
          <tr>
            <td><code>candlestickStyle.wickWidth</code></td>
            <td>number</td>
            <td>Wick line width in pixels (default: 1)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use <code>chartType="candlestick"</code> with <code>openAccessor</code>,{" "}
          <code>highAccessor</code>, <code>lowAccessor</code>, and{" "}
          <code>closeAccessor</code> for a complete OHLC chart.
        </li>
        <li>
          Body width is automatically computed from data spacing — no manual
          sizing needed.
        </li>
        <li>
          Hover interaction works out of the box with <code>enableHover</code>{" "}
          and <code>tooltipContent</code>.
        </li>
        <li>
          Color-coding open vs. close direction is a convention that makes the
          chart immediately readable to financial analysts.
        </li>
      </ul>

      <h2 id="range-plot">Range Plot / Temporal Dumbbell</h2>
      <p>
        Provide only <code>highAccessor</code> and <code>lowAccessor</code>{" "}
        (omit <code>openAccessor</code> and <code>closeAccessor</code>) to get
        a range/dumbbell plot. The candlestick renderer automatically detects
        range mode: no body rect, endpoint dots, and a single{" "}
        <code>rangeColor</code> instead of up/down coloring.
      </p>

      <div style={{ marginBottom: 24 }}>
        <StreamXYFrame
          chartType="candlestick"
          data={[
            { day: 1, high: 85, low: 42 },
            { day: 2, high: 78, low: 55 },
            { day: 3, high: 92, low: 38 },
            { day: 4, high: 68, low: 45 },
            { day: 5, high: 95, low: 60 },
            { day: 6, high: 72, low: 30 },
            { day: 7, high: 88, low: 50 },
            { day: 8, high: 65, low: 40 },
            { day: 9, high: 90, low: 55 },
            { day: 10, high: 82, low: 35 },
          ]}
          xAccessor="day"
          highAccessor="high"
          lowAccessor="low"
          candlestickStyle={{ rangeColor: "#6366f1", wickWidth: 2 }}
          showAxes={true}
          enableHover={true}
          tooltipContent={(d) => {
            const datum = d.data || d
            return React.createElement("div", { style: { padding: "6px 10px" } },
              React.createElement("div", { style: { fontWeight: 600 } }, "Day " + datum.day),
              React.createElement("div", null, "Range: " + datum.low + " – " + datum.high)
            )
          }}
          size={[500, 300]}
          margin={{ top: 20, bottom: 40, left: 50, right: 20 }}
        />
      </div>

      <CodeBlock
        code={`// Range plot — omit openAccessor/closeAccessor for dumbbell mode
<StreamXYFrame
  chartType="candlestick"
  data={rangeData}
  xAccessor="day"
  highAccessor="high"
  lowAccessor="low"
  candlestickStyle={{ rangeColor: "#6366f1", wickWidth: 2 }}
  showAxes enableHover
  tooltipContent={d => (
    <div>Day {d.data.day}: {d.data.low}–{d.data.high}</div>
  )}
/>`}
        language="jsx"
      />

      <p>
        This is <strong>not</strong> a separate HOC — it demonstrates the
        flexibility of <code>StreamXYFrame</code>'s candlestick chart type.
        The same renderer handles both OHLC candlesticks and range/dumbbell
        plots based on which accessors are provided.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — simpler time-series
          line visualization
        </li>
      </ul>
    </PageLayout>
  )
}
