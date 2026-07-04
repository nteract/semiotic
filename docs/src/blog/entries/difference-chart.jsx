import React, { useRef } from "react"
import { Link } from "react-router-dom"
import { DifferenceChart, ThemeProvider } from "semiotic"
import BlogPushDemo from "../components/BlogPushDemo.jsx"
import BlogFigure from "../components/BlogFigure.jsx"

// Blog images live under `docs/src/blog/images/`. The `new URL(path,
// import.meta.url)` pattern is served by the docs dev server in
// this project (the docs chart-index thumbnails go through the same
// path — see `docs/src/IndexPages.js`); Vite hashes the file and
// rewrites the URL into the bundle. Plain `import ... from "*.jpg"`
// does not get bundled by this project's docs config and produces
// a broken link in dev/build.
const playfairDifference = new URL("../images/playfair-difference.jpg", import.meta.url).href

// Playfair balance-of-trade data — England's imports from and exports
// to Denmark/Norway, 1700–1780. Imports lead through ~1754, then
// exports rocket past in the back half. Same shape Playfair shaded
// on his copperplate in 1786, transcribed onto a numeric x so the
// DifferenceChart's crossover-interpolation math runs cleanly.
const YOY = (() => {
  const a = [73, 88, 104, 96, 95, 90, 82, 79, 83, 92]
  const b = [34, 66, 81, 60, 66, 78, 82, 135, 165, 190]
  const years = [1700, 1710, 1720, 1730, 1740, 1750, 1754, 1760, 1770, 1780]

  return a.map((v, i) => ({ year: years[i], a: v, b: b[i] }))
})()
const yearFormat = (y) => y ?? ""

// Playfair palette — the original hand-coloured the "balance against
// England" area in a warm red and the "balance in favour" area in a
// mustard yellow. Map them onto seriesA/seriesB so the fill flips
// colour at the 1754 crossover the way Playfair's plate did.
const PLAYFAIR_RED = "#a85a4a"
const PLAYFAIR_YELLOW = "#d4a85a"

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function PushDemo() {
  const chartRef = useRef(null)
  return (
    <div style={chartFrame}>
      <ThemeProvider theme="carbon-dark">
        <BlogPushDemo
          chartRef={chartRef}
          frames={YOY}
          pushAt={(ref, row) => ref?.push?.(row)}
          resetAt={(ref) => ref?.clear?.()}
          intervalMs={800}
        >
          <DifferenceChart
            ref={chartRef}
            xAccessor="year"
            seriesAAccessor="a"
            seriesBAccessor="b"
            seriesALabel="Imports"
            seriesBLabel="Exports"
            seriesAColor={PLAYFAIR_RED}
            seriesBColor={PLAYFAIR_YELLOW}
            xFormat={yearFormat}
            xExtent={[1695, 1785]}
            yExtent={[0, 200]}
            frameProps={{
              axes: [
                { orient: "left" },
                { orient: "bottom", tickValues: [1700, 1720, 1740, 1760, 1780] },
              ],
            }}
            width={680}
            height={300}
            tooltip
          />
        </BlogPushDemo>
      </ThemeProvider>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        <Link to="/charts/difference-chart">DifferenceChart</Link> is the chart you reach for when
        the <em>story</em> is the gap between two series, not either series on its own. Plot A and B
        as overlay lines; fill the area between them with one color where A &gt; B and the other
        where B &gt; A; let the chart linearly interpolate the crossover points so the fills kiss at
        zero. The chart's whole job is to make the direction of the difference legible without
        making the reader do arithmetic.
      </p>

      <h2 id="why-care">Why this exists</h2>
      <p>
        A two-line chart leaves the difference implicit: the reader has to mentally subtract one
        line from the other to know which is ahead and by how much. A bar chart of the difference
        loses the absolute levels. A DifferenceChart does both at once.
      </p>
      <p>The classic uses are:</p>
      <ul>
        <li>
          <strong>Forecast vs actual.</strong> Where did we beat the forecast, where did we miss it?
        </li>
        <li>
          <strong>Year-over-year.</strong> Which months are tracking ahead of last year?
        </li>
        <li>
          <strong>Temperature anomaly.</strong> The classic climate-science use case (red where it's
          warmer than baseline, blue where it's cooler).
        </li>
        <li>
          <strong>Budget variance.</strong> Spent more, spent less, and by how much across the
          period.
        </li>
        <li>
          <strong>A/B experiments.</strong> Treatment vs control across time, with crossover regions
          highlighted.
        </li>
      </ul>

      <h2 id="demo">Live demo</h2>
      <p>
        Playfair's own 1786 plate is the natural reference: England's imports from and exports to
        Denmark and Norway over eighty years, with the area between the two lines shaded so the
        trade balance is the visual headline. Red where imports led; yellow where exports pulled
        ahead. The crossover sits around 1754.
      </p>
      <BlogFigure
        src={playfairDifference}
        alt="William Playfair's 1786 chart of England's imports from and exports to Denmark and Norway, with the area between the two lines shaded to show the trade balance."
        caption="The technique is older than the modern catalog. Playfair's plate of English imports and exports shades the area between the two lines so the trade balance is the visual headline."
        credit="William Playfair, The Commercial and Political Atlas, 1786 (public domain)."
      />
      <p>
        The DifferenceChart below is the same data transcribed onto a Semiotic chart with Playfair's
        palette maintained showing red when there is a deficit and yellow when exports start to
        bring money into Britain.
      </p>
      <div style={chartFrame}>
        <ThemeProvider theme="carbon-dark">
          <DifferenceChart
            data={YOY}
            xAccessor="year"
            seriesAAccessor="a"
            seriesBAccessor="b"
            seriesALabel="Imports"
            seriesBLabel="Exports"
            seriesAColor={PLAYFAIR_RED}
            seriesBColor={PLAYFAIR_YELLOW}
            xFormat={yearFormat}
            xExtent={[1695, 1785]}
            yExtent={[0, 200]}
            frameProps={{
              axes: [
                { orient: "left" },
                { orient: "bottom", tickValues: [1700, 1720, 1740, 1760, 1780] },
              ],
            }}
            width={680}
            height={400}
            showLegend
            tooltip="multi"
          />
        </ThemeProvider>
      </div>

      <h2 id="how-to-read">How to read it</h2>
      <ul>
        <li>
          <strong>Fill color</strong> shows which series is on top at each x: one color for A &gt;
          B, the other for B &gt; A.
        </li>
        <li>
          <strong>Crossovers</strong> sit at zero-width — the fill collapses to a point exactly
          where the lines cross, then flips color. The chart linearly interpolates the x of each
          crossover from adjacent rows, so adjacent segments meet cleanly without jagged seams.
        </li>
        <li>
          <strong>Overlay lines</strong> carry the absolute levels. Turn them off with{" "}
          <code>showLines={"{false}"}</code> if you only need the fill direction.
        </li>
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Use DifferenceChart when:</p>
      <ul>
        <li>You have exactly two series over the same x.</li>
        <li>
          The <em>direction</em> of the gap (who's ahead) is the point and not the absolute level of
          either series.
        </li>
        <li>
          Crossover moments are interesting in their own right (when did we tip over from missing
          the forecast to beating it?).
        </li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        <li>
          You have three or more series. DifferenceChart's two-color fill scheme doesn't generalize.{" "}
          <Link to="/charts/line-chart">LineChart</Link> with <code>lineBy</code> is the right tool
          there.
        </li>
        <li>
          You only need the difference (not the absolute levels). A bar chart of <code>a - b</code>{" "}
          is more compact.
        </li>
        <li>
          Each x has many observations and you want their spread. In those cases reach for{" "}
          <Link to="/charts/box-plot">BoxPlot</Link> or{" "}
          <Link to="/charts/violin-plot">ViolinPlot</Link> or even{" "}
          <Link to="/charts/candlestick-chart">CandlestickChart</Link>.
        </li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      <pre
        style={{
          background: "var(--surface-1)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >
        {`import { DifferenceChart } from "semiotic"

<DifferenceChart
  data={rows}
  xAccessor="year"
  seriesAAccessor="a"
  seriesBAccessor="b"
  seriesALabel="Imports"
  seriesBLabel="Exports"
  showLegend
/>`}
      </pre>
      <p>
        Defaults: <code>seriesAColor</code> = <code>var(--semiotic-danger)</code>,{" "}
        <code>seriesBColor</code> = <code>var(--semiotic-info)</code>, both fills at 0.6 opacity,
        overlay lines on at 1.5 px. All overridable. <code>xScaleType="time"</code> picks up{" "}
        <code>Date</code> x-values; <code>"band"</code> works for categorical x.
      </p>

      <h2 id="streaming">Streaming / push mode</h2>
      <p>
        Every Semiotic HOC can be driven by either a static <code>data</code> prop OR a forwarded
        ref that exposes <code>push()</code> / <code>pushMany()</code> / <code>clear()</code>. Push
        mode is the right reach when rows arrive over time — server-sent events, WebSocket ticks, a
        setInterval poll, an event stream — and you want the chart to fold them in without
        unmounting / remounting. DifferenceChart in particular has to recompute its crossover
        segments every push (it can't precompute them ahead of the data) but the ref-driven internal
        buffer absorbs that cost without bouncing React state.
      </p>
      <p>
        Step through the year one month at a time. Watch the chart pick up the new month and
        recompute the fill between the two series, including the crossover interpolation when the
        lines cross.
      </p>
      <PushDemo />
      <p>
        Wiring is identical to a static chart minus the <code>data</code> prop:
      </p>
      <pre
        style={{
          background: "var(--surface-1)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >
        {`const chartRef = useRef()

// somewhere a stream feeds the chart...
chartRef.current.push({ month: 12, a: 240, b: 295 })

<DifferenceChart
  ref={chartRef}
  xAccessor="month"
  seriesAAccessor="a"
  seriesBAccessor="b"
  windowSize={36}  // FIFO cap — keep the last 36 rows
/>`}
      </pre>
      <p>
        Why use push mode here vs setting <code>data={"{rows}"}</code> on each update? Two reasons:
      </p>
      <ul>
        <li>
          <strong>No remount cost.</strong> Setting <code>data</code>
          to a new array on every tick is a perfectly valid pattern, and Semiotic absorbs it. But
          push mode skips the React reconciliation for the data prop — the chart reads its internal
          buffer directly. On long-running streams (minutes of ticks) that's measurable.
        </li>
        <li>
          <strong>Bounded buffer.</strong> <code>windowSize</code> evicts the oldest rows on a FIFO
          basis so a multi-hour stream doesn't accumulate unbounded memory. Setting{" "}
          <code>data</code> would mean your code maintains the sliding window manually.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/difference-chart">DifferenceChart — full prop reference</Link>
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — when you have 3+ series
        </li>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> — when one series is "the total" and you
          want it filled
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
