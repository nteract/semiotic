import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import CandlestickChart from "../../examples/CandlestickChart"

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
        dimensions at once. This recipe demonstrates how to build a candlestick
        chart using XYFrame's multi-accessor support and custom point marks.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
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

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The key insight is that <code>yAccessor</code> in XYFrame can accept an
        array of accessor functions, allowing each data point to project multiple
        y-values. Here, each row contains open, high, low, and close prices, and
        we extract all four simultaneously:
      </p>
      <CodeBlock
        code={`yAccessor: d => [d.open, d.high, d.low, d.close]`}
        language="jsx"
      />
      <p>
        This gives XYFrame enough information to position each point, but the
        default rendering would draw four circles per data point. To get the
        classic candlestick shape, we use a <code>customPointMark</code> that
        reads the raw data and the y-scale to draw a vertical wick (high to low)
        and a filled rectangle (open to close), colored by whether the day was
        positive or negative:
      </p>
      <CodeBlock
        code={`customPointMark: ({ d, xy, yScale }) => {
  const middle = yScale(xy.yMiddle)
  const openY = yScale(d.open) - middle
  const closeY = yScale(d.close) - middle
  const minY = yScale(d.low) - middle
  const maxY = yScale(d.high) - middle
  return (
    <g>
      <line width={2} y1={minY} y2={maxY} stroke="black" />
      <rect
        width={4}
        x={-2}
        height={Math.abs(openY - closeY)}
        y={Math.min(openY, closeY)}
        fill={d.open > d.close ? theme[1] : theme[2]}
      />
    </g>
  )
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use an array-returning <code>yAccessor</code> to project multiple
          values per data point in XYFrame.
        </li>
        <li>
          The <code>customPointMark</code> property gives you full control over
          the rendered glyph, receiving the raw data, computed xy position, and
          the scale functions.
        </li>
        <li>
          Combine <code>scaleTime</code> on the x-axis with date parsing to
          produce a properly spaced time axis.
        </li>
        <li>
          Color-coding open vs. close direction is a convention that makes the
          chart immediately readable to financial analysts.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying frame
          used for all XY-based visualizations
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — simpler time-series
          line visualization
        </li>
        <li>
          <Link to="/features/custom-mark">Custom Marks</Link> — more on
          customPointMark and customLineMark
        </li>
      </ul>
    </PageLayout>
  )
}
