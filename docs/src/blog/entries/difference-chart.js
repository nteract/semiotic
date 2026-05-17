import React from "react"
import { Link } from "react-router-dom"
import { DifferenceChart, ThemeProvider } from "semiotic"

// Synthetic year-over-year metric. seriesA undershoots Q1 then
// overshoots Q3 — two clear crossover regions, which is exactly
// what DifferenceChart is built to make obvious.
const YOY = (() => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  // Last year ("b") drifts steadily. This year ("a") starts cold,
  // catches up by April, runs hot through August, slumps in fall.
  const a = [180, 196, 215, 240, 268, 295, 312, 305, 282, 258, 238, 222]
  const b = [220, 228, 232, 238, 244, 252, 260, 268, 276, 282, 285, 288]
  return months.map((m, i) => ({ month: m, a: a[i], b: b[i] }))
})()

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/difference-chart">DifferenceChart</Link> is
        the chart you reach for when the <em>story</em> is the gap
        between two series, not either series on its own. Plot A and
        B as overlay lines; fill the area between them with one
        color where A &gt; B and the other where B &gt; A; let the
        chart linearly interpolate the crossover points so the fills
        kiss at zero. The chart's whole job is to make the
        direction of the difference legible without making the
        reader do arithmetic.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        A two-line chart leaves the difference implicit: the reader
        has to mentally subtract one line from the other to know
        which is ahead and by how much. A bar chart of the
        difference loses the absolute levels. A DifferenceChart
        does both at once — the two lines for context, the colored
        band for direction-and-magnitude — and the eye gets the
        answer without any arithmetic.
      </p>
      <p>
        The classic uses are:
      </p>
      <ul>
        <li>
          <strong>Forecast vs actual.</strong> Where did we beat
          the forecast, where did we miss it?
        </li>
        <li>
          <strong>Year-over-year.</strong> Which months are
          tracking ahead of last year?
        </li>
        <li>
          <strong>Temperature anomaly.</strong> The classic
          climate-science use case (red where it's warmer than
          baseline, blue where it's cooler).
        </li>
        <li>
          <strong>Budget variance.</strong> Spent more, spent less,
          and by how much across the period.
        </li>
        <li>
          <strong>A/B experiments.</strong> Treatment vs control
          across time, with crossover regions highlighted.
        </li>
      </ul>

      <h2 id="demo">Live demo</h2>
      <p>
        Below: a synthetic year of monthly numbers. Last year is{" "}
        <code>b</code> (the reference); this year is{" "}
        <code>a</code>. The cold start in Q1, the catch-up around
        April, the strong Q3, and the slump in fall all read at a
        glance.
      </p>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <DifferenceChart
            data={YOY}
            xAccessor="month"
            seriesAAccessor="a"
            seriesBAccessor="b"
            seriesALabel="This year"
            seriesBLabel="Last year"
            xScaleType="band"
            width={680}
            height={300}
            showLegend
            tooltip
          />
        </ThemeProvider>
      </div>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Fill color</strong> shows which series is on top
          at each x: one color for A &gt; B, the other for B &gt; A.
        </li>
        <li>
          <strong>Crossovers</strong> sit at zero-width — the fill
          collapses to a point exactly where the lines cross, then
          flips color. The chart linearly interpolates the x of
          each crossover from adjacent rows, so adjacent segments
          meet cleanly without jagged seams.
        </li>
        <li>
          <strong>Overlay lines</strong> carry the absolute levels.
          Turn them off with <code>showLines={"{false}"}</code> if
          you only need the fill direction.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Use DifferenceChart when:</p>
      <ul>
        <li>You have exactly two series over the same x.</li>
        <li>
          The <em>direction</em> of the gap (who's ahead) is the
          point — not the absolute level of either series.
        </li>
        <li>
          Crossover moments are interesting in their own right
          (when did we tip over from missing the forecast to
          beating it?).
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          You have three or more series — DifferenceChart's
          two-color fill scheme doesn't generalize.{" "}
          <Link to="/charts/line-chart">LineChart</Link> with{" "}
          <code>lineBy</code> is the right tool there.
        </li>
        <li>
          You only need the difference (not the absolute levels).
          A bar chart of <code>a - b</code> is more compact.
        </li>
        <li>
          Each x has many observations and you want their spread —
          reach for{" "}
          <Link to="/charts/box-plot">BoxPlot</Link> or{" "}
          <Link to="/charts/violin-plot">ViolinPlot</Link>.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`import { DifferenceChart } from "semiotic"

<DifferenceChart
  data={rows}
  xAccessor="month"
  seriesAAccessor="actual"
  seriesBAccessor="forecast"
  seriesALabel="Actual"
  seriesBLabel="Forecast"
  showLegend
/>`}
      </pre>
      <p>
        Defaults: <code>seriesAColor</code> ={" "}
        <code>var(--semiotic-danger)</code>,{" "}
        <code>seriesBColor</code> ={" "}
        <code>var(--semiotic-info)</code>, both fills at 0.6
        opacity, overlay lines on at 1.5 px. All overridable.{" "}
        <code>xScaleType="time"</code> picks up <code>Date</code>{" "}
        x-values; <code>"band"</code> works for categorical x.
      </p>

      <h2 id="streaming">Streaming</h2>
      <p>
        DifferenceChart supports the push API: omit{" "}
        <code>data</code>, take a ref, call{" "}
        <code>ref.current.push({"{ x, a, b }"})</code>. The chart
        owns its raw-data buffer internally; push triggers
        segment recomputation. Use the new{" "}
        <code>windowSize</code> prop to cap the buffer with FIFO
        eviction for long-running streams.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/difference-chart">
            DifferenceChart — full prop reference
          </Link>
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — when you
          have 3+ series
        </li>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> — when one
          series is "the total" and you want it filled
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "difference-chart",
  title: "DifferenceChart, explained",
  subtitle:
    "Two series, one chart, two-color crossover fill. When the gap between A and B is the story, this is the diagram that makes it readable without arithmetic.",
  author: "Elijah Meeks",
  date: "2026-05-14",
  tags: ["chart-explainer", "xy"],
  excerpt:
    "A two-line chart leaves the difference implicit; DifferenceChart fills it in. Plot A and B as overlay lines, color the area between with one color where A leads and the other where B leads, and let the chart interpolate the crossovers so the fills kiss at zero. Forecast vs actual, YoY, temperature anomaly — the classic uses.",
  component: Body,
  ogChart: {
    component: "DifferenceChart",
    props: { compactPreview: true },
  },
}
