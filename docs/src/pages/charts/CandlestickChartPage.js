import React, { useRef, useEffect, useState, useMemo } from "react"
import { CandlestickChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Synthetic OHLC over 20 sessions — drifts up then pulls back so both up and
// down bodies appear. Deterministic on purpose: `Math.random()` at module
// scope would make the page reflow on every reload and flake any visual
// snapshot that ever lands on it. Jitter is a cheap modulo pattern instead.
const ohlcData = Array.from({ length: 20 }, (_, i) => {
  const base = 100 + Math.sin(i * 0.4) * 8 + i * 0.3
  const o = base
  const c = base + (i % 3 === 0 ? -2.5 : 2)
  const highJitter = 1.5 + ((i * 7) % 6) * 0.25
  const lowJitter = 1.5 + ((i * 11 + 3) % 6) * 0.25
  const h = Math.max(o, c) + highJitter
  const l = Math.min(o, c) - lowJitter
  return { session: i, o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2) }
})

// Min/max daily temperatures — a natural "range only, no open/close" fixture.
// `day` is a numeric index because StreamXYFrame uses a continuous x-scale;
// categorical strings would be filtered as NaN. We format the tick back to a
// label via xFormat on the examples below.
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const temperatureRanges = [
  { day: 0, min: 58, max: 72 },
  { day: 1, min: 60, max: 75 },
  { day: 2, min: 62, max: 78 },
  { day: 3, min: 59, max: 74 },
  { day: 4, min: 55, max: 70 },
  { day: 5, min: 52, max: 68 },
  { day: 6, min: 54, max: 71 },
]
const formatDay = d => DAY_LABELS[d] ?? ""

// ---------------------------------------------------------------------------
// Streaming demo — random-walk OHLC pushed every 400ms
// ---------------------------------------------------------------------------

const streamingCode = `import { useRef, useEffect } from "react"
import { CandlestickChart } from "semiotic"

function StreamingCandlestick() {
  const chartRef = useRef()

  useEffect(() => {
    let t = 0
    let lastClose = 100
    const id = setInterval(() => {
      const o = lastClose
      const c = o + (Math.random() - 0.5) * 4
      const h = Math.max(o, c) + Math.random() * 2
      const l = Math.min(o, c) - Math.random() * 2
      chartRef.current?.push({ t: t++, o, h, l, c })
      lastClose = c
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <CandlestickChart
      ref={chartRef}
      xAccessor="t"
      openAccessor="o"
      highAccessor="h"
      lowAccessor="l"
      closeAccessor="c"
      xLabel="Tick"
      yLabel="Price"
      width={500} height={350}
    />
  )
}`

function StreamingCandlestickDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    let t = 0
    let lastClose = 100
    const id = setInterval(() => {
      const o = lastClose
      const c = o + (Math.random() - 0.5) * 4
      const h = Math.max(o, c) + Math.random() * 2
      const l = Math.min(o, c) - Math.random() * 2
      chartRef.current?.push({ t: t++, o, h, l, c })
      lastClose = c
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <CandlestickChart
      ref={chartRef}
      xAccessor="t"
      openAccessor="o"
      highAccessor="h"
      lowAccessor="l"
      closeAccessor="c"
      xLabel="Tick"
      yLabel="Price"
      title="Live OHLC"
      tooltip={true}
      width={width || 500}
      height={350}
    />
  )
}

// ---------------------------------------------------------------------------
// Animation demos
// ---------------------------------------------------------------------------

// Deterministic OHLC generator seeded by a number — regenerating with a new
// seed yields a totally different bar sequence. Used by the morph demo below.
function makeOhlcSequence(seed, count = 12) {
  let r = seed
  const rand = () => {
    r = (r * 9301 + 49297) % 233280
    return r / 233280
  }
  return Array.from({ length: count }, (_, i) => {
    const base = 50 + Math.sin(i * 0.5 + seed * 0.01) * 10 + rand() * 6
    const o = base
    const c = base + (rand() - 0.5) * 8
    const h = Math.max(o, c) + rand() * 3 + 1
    const l = Math.min(o, c) - rand() * 3 - 1
    return { t: i, o: +o.toFixed(2), c: +c.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2) }
  })
}

function MorphAnimationDemo({ width }) {
  const [seed, setSeed] = useState(1)
  const data = useMemo(() => makeOhlcSequence(seed), [seed])

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setSeed(s => s + 1)}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--surface-3, #ccc)",
            background: "var(--semiotic-primary, #6366f1)",
            color: "white",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Regenerate data
        </button>
      </div>
      <CandlestickChart
        data={data}
        xAccessor="t"
        openAccessor="o"
        highAccessor="h"
        lowAccessor="l"
        closeAccessor="c"
        animate={{ duration: 500 }}
        tooltip={false}
        width={width || 500}
        height={280}
      />
    </div>
  )
}

const morphCode = `const [seed, setSeed] = useState(1)
const data = useMemo(() => makeOhlcSequence(seed), [seed])

return (
  <>
    <button onClick={() => setSeed(s => s + 1)}>Regenerate data</button>
    <CandlestickChart
      data={data}
      xAccessor="t"
      openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c"
      animate={{ duration: 500 }}
    />
  </>
)`

// Enter/exit demo — sliding window: push every second, drop the oldest once
// we hit the cap. Bars fade in on the right and fade out on the left.
function SlidingWindowDemo({ width }) {
  const chartRef = useRef()
  const [running, setRunning] = useState(true)
  // Counters persist across pause/resume so resuming continues the series
  // instead of restarting at t=0 and colliding with the existing bars.
  const stateRef = useRef({ t: 0, lastClose: 100, seen: [] })

  useEffect(() => {
    if (!running) return
    const CAP = 10
    const id = setInterval(() => {
      const s = stateRef.current
      const o = s.lastClose
      const c = o + (Math.random() - 0.5) * 4
      const h = Math.max(o, c) + Math.random() * 2
      const l = Math.min(o, c) - Math.random() * 2
      const datum = { t: s.t++, o, h, l, c }
      chartRef.current?.push(datum)
      s.seen.push(datum)
      if (s.seen.length > CAP) {
        const dropped = s.seen.shift()
        // pointIdAccessor resolves to String(d.t) inside the frame, so the id
        // passed to remove() must be a string for Set.has to match.
        chartRef.current?.remove?.(String(dropped.t))
      }
      s.lastClose = c
    }, 700)
    return () => clearInterval(id)
  }, [running])

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--surface-3, #ccc)",
            background: running ? "var(--semiotic-danger, #dc3545)" : "var(--semiotic-success, #28a745)",
            color: "white",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {running ? "Pause" : "Resume"}
        </button>
      </div>
      <CandlestickChart
        ref={chartRef}
        xAccessor="t"
        openAccessor="o"
        highAccessor="h"
        lowAccessor="l"
        closeAccessor="c"
        pointIdAccessor="t"
        animate={{ duration: 400 }}
        tooltip={false}
        width={width || 500}
        height={280}
      />
    </div>
  )
}

const slidingCode = `// Sliding window: push every 700ms, remove the oldest once we hit the cap.
// pointIdAccessor lets the HOC identify which datum to remove by key.
// Counters live in a ref so pause/resume doesn't restart the series.
const chartRef = useRef()
const stateRef = useRef({ t: 0, lastClose: 100, seen: [] })
useEffect(() => {
  const id = setInterval(() => {
    const s = stateRef.current
    const o = s.lastClose
    const c = o + (Math.random() - 0.5) * 4
    const datum = { t: s.t++, o, h: Math.max(o,c) + 2, l: Math.min(o,c) - 2, c }
    chartRef.current?.push(datum)
    s.seen.push(datum)
    if (s.seen.length > 10) chartRef.current?.remove(String(s.seen.shift().t))
    s.lastClose = c
  }, 700)
  return () => clearInterval(id)
}, [])

return (
  <CandlestickChart
    ref={chartRef}
    xAccessor="t"
    openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c"
    pointIdAccessor="t"
    animate={{ duration: 400 }}
  />
)`

// ---------------------------------------------------------------------------
// Props for the PropTable
// ---------------------------------------------------------------------------

const candlestickProps = [
  { name: "data", type: "array", required: false, default: null, description: "Array of data points. Omit when using the push API." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function returning the x value (category/time) for each bar." },
  { name: "highAccessor", type: "string | function", required: true, default: '"high"', description: "Upper bound. Required in both OHLC and range mode." },
  { name: "lowAccessor", type: "string | function", required: true, default: '"low"', description: "Lower bound. Required in both OHLC and range mode." },
  { name: "openAccessor", type: "string | function", required: false, default: null, description: "Opening value. Must be provided together with closeAccessor for OHLC mode." },
  { name: "closeAccessor", type: "string | function", required: false, default: null, description: "Closing value. Must be provided together with openAccessor for OHLC mode." },
  { name: "candlestickStyle", type: "object", required: false, default: null, description: "Style overrides: { upColor, downColor, wickColor, wickWidth, bodyWidth, rangeColor }." },
  { name: "mode", type: '"primary" | "context" | "sparkline"', required: false, default: '"primary"', description: 'Compact-layout preset. Sparkline (120\u00D724) and context (400\u00D7250) strip axes; primary is the default 600\u00D7400.' },
  { name: "tooltip", type: "boolean | object | function", required: false, default: null, description: "Default tooltip shows O/H/L/C in OHLC mode and H/L in range mode. Pass `false` to disable." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width (px). Overrides the mode default." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height (px). Overrides the mode default." },
  { name: "margin", type: "number | object", required: false, default: "mode-driven", description: "Margin around the chart area, merged with the mode defaults." },
  { name: "xLabel", type: "string", required: false, default: null, description: "X-axis label (suppressed in compact modes)." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Y-axis label (suppressed in compact modes)." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title (suppressed in compact modes)." },
  { name: "annotations", type: "array", required: false, default: null, description: "Annotation configs forwarded to StreamXYFrame." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Escape hatch for passing additional props to the underlying StreamXYFrame." },
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CandlestickChartPage() {
  return (
    <PageLayout
      title="Candlestick Chart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Candlestick Chart", path: "/charts/candlestick-chart" },
      ]}
      prevPage={{ title: "Realtime Histogram", path: "/charts/realtime-histogram" }}
    >
      <ComponentMeta
        componentName="CandlestickChart"
        importStatement='import { CandlestickChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Line Chart", path: "/charts/line-chart" },
          { name: "Area Chart", path: "/charts/area-chart" },
          { name: "Box Plot", path: "/charts/box-plot" },
        ]}
      />

      <p>
        Candlestick bars for OHLC (open/high/low/close) data. When only{" "}
        <code>highAccessor</code> and <code>lowAccessor</code> are provided the
        chart degrades into a range chart — same rendering path, same scene
        builder — so you can reuse the component for things like daily high/low
        temperatures, p5/p95 bands, or any "two endpoints per x" series.
      </p>

      <h2 id="quick-start">Quick Start</h2>
      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: ohlcData,
              xAccessor: "session",
              openAccessor: "o",
              highAccessor: "h",
              lowAccessor: "l",
              closeAccessor: "c",
              xLabel: "Session",
              yLabel: "Price",
              title: "Simulated OHLC",
              tooltip: true,
            }}
            type={CandlestickChart}
            overrideProps={{
              data: `[
  { session: 0, o: 100.00, h: 102.10, l: 98.40, c: 101.80 },
  { session: 1, o: 101.80, h: 104.20, l: 100.90, c: 103.50 },
  { session: 2, o: 103.50, h: 105.00, l: 101.20, c: 101.70 },
  // ... 20 sessions
]`,
            }}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={({ width }) => <StreamingCandlestickDemo width={width} />}
            code={streamingCode}
          />
        }
      />

      <h2 id="range-chart">Range Chart (no open/close)</h2>

      <p>
        Omit <code>openAccessor</code> and <code>closeAccessor</code> and the
        component switches to range rendering: a single-color bar from low to
        high with endpoint caps, no up/down distinction. Use{" "}
        <code>candlestickStyle.rangeColor</code> to override the color.
      </p>

      <LiveExample
        frameProps={{
          data: temperatureRanges,
          xAccessor: "day",
          highAccessor: "max",
          lowAccessor: "min",
          xFormat: formatDay,
          xLabel: "Day",
          yLabel: "\u00B0F",
          title: "Daily temperature ranges",
          candlestickStyle: { rangeColor: "var(--semiotic-primary, #6366f1)" },
          tooltip: true,
        }}
        type={CandlestickChart}
        overrideProps={{
          data: `[
  { day: 0, min: 58, max: 72 },  // Mon
  { day: 1, min: 60, max: 75 },  // Tue
  { day: 2, min: 62, max: 78 },  // Wed
  // ...
]`,
          xFormat: `d => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d]`,
          candlestickStyle: `{ rangeColor: "var(--semiotic-primary, #6366f1)" }`,
        }}
      />

      <h2 id="modes">Compact Modes</h2>

      <p>
        CandlestickChart honors the <code>mode</code> prop shared across the
        HOCs: <code>primary</code> (default 600×400), <code>context</code>
        {" "}(400×250, no axes), and <code>sparkline</code> (120×24,
        no axes, no title). Explicit <code>width</code>/<code>height</code>{" "}
        override the mode default.
      </p>

      <h3>OHLC</h3>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>mode=&quot;context&quot;</div>
          <CandlestickChart
            data={ohlcData}
            xAccessor="session"
            openAccessor="o"
            highAccessor="h"
            lowAccessor="l"
            closeAccessor="c"
            mode="context"
            tooltip={false}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>mode=&quot;sparkline&quot;</div>
          <CandlestickChart
            data={ohlcData}
            xAccessor="session"
            openAccessor="o"
            highAccessor="h"
            lowAccessor="l"
            closeAccessor="c"
            mode="sparkline"
            tooltip={false}
          />
        </div>
      </div>

      <h3>Range</h3>
      <p>
        The range variant (no <code>openAccessor</code>/<code>closeAccessor</code>)
        degrades cleanly at every mode — the same endpoint-cap rendering, just
        scaled to the canvas the mode assigns.
      </p>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>mode=&quot;context&quot;</div>
          <CandlestickChart
            data={temperatureRanges}
            xAccessor="day"
            highAccessor="max"
            lowAccessor="min"
            xFormat={formatDay}
            candlestickStyle={{ rangeColor: "var(--semiotic-primary, #6366f1)" }}
            mode="context"
            tooltip={false}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>mode=&quot;sparkline&quot;</div>
          <CandlestickChart
            data={temperatureRanges}
            xAccessor="day"
            highAccessor="max"
            lowAccessor="min"
            xFormat={formatDay}
            candlestickStyle={{ rangeColor: "var(--semiotic-primary, #6366f1)" }}
            mode="sparkline"
            tooltip={false}
          />
        </div>
      </div>

      <h2 id="animation">Animation</h2>

      <p>
        Pass <code>animate</code> as <code>true</code> or{" "}
        <code>{`{ duration, easing }`}</code> and the frame's transition
        pipeline will:
      </p>
      <ul>
        <li>
          <strong>Morph</strong> open/high/low/close y-coords when a matched
          bar (same x-identity) gets new values on the next render.
        </li>
        <li>
          <strong>Fade in</strong> bars that appear in a scene rebuild (new
          x-identity).
        </li>
        <li>
          <strong>Fade out</strong> bars that disappear — either because they
          scrolled off a sliding window, got removed via the push API, or the
          data array dropped them.
        </li>
      </ul>

      <h3>Morph on data change</h3>
      <p>
        Click the button to swap in a new random OHLC sequence. Each bar at a
        given x-index smoothly interpolates its wick top/bottom and body
        top/bottom toward the new values.
      </p>
      <MorphAnimationDemo />
      <CodeBlock language="jsx" code={morphCode} />

      <h3>Enter / exit in a sliding window</h3>
      <p>
        Pushing a bar every 700ms while capping the window at 10 bars —
        new bars fade in on the right, old bars fade out on the left as they
        get dropped. <code>pointIdAccessor</code> tells the HOC which field
        identifies each datum so <code>remove()</code> can target it.
      </p>
      <SlidingWindowDemo />
      <CodeBlock language="jsx" code={slidingCode} />

      <h2 id="styling">Styling</h2>

      <p>
        The <code>candlestickStyle</code> object covers the body/wick colors
        and widths. In OHLC mode, <code>upColor</code> fills bars where close
        &ge; open, <code>downColor</code> fills the rest. In range mode,{" "}
        <code>rangeColor</code> supersedes both.
      </p>

      <CodeBlock
        language="jsx"
        code={`<CandlestickChart
  data={data}
  xAccessor="session"
  openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c"
  candlestickStyle={{
    upColor: "var(--semiotic-success)",
    downColor: "var(--semiotic-danger)",
    wickColor: "var(--semiotic-text)",
    wickWidth: 1,
    // bodyWidth is auto-computed from data spacing if omitted
  }}
/>`}
      />

      <h2 id="props">Props</h2>
      <PropTable props={candlestickProps} />

      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        CandlestickChart is a thin wrapper over{" "}
        <Link to="/frames/xy-frame">StreamXYFrame</Link> with{" "}
        <code>chartType=&quot;candlestick&quot;</code>. Drop to the frame when
        you need axis customization beyond what the HOC surfaces — everything
        under the hood is the same accessor/scene pipeline.
      </p>

      <CodeBlock
        language="jsx"
        code={`// HOC
<CandlestickChart data={data} xAccessor="session"
  openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c" />

// Frame equivalent
<StreamXYFrame
  chartType="candlestick"
  data={data}
  xAccessor="session"
  yAccessor="h"
  openAccessor="o" highAccessor="h" lowAccessor="l" closeAccessor="c"
  size={[600, 400]}
/>`}
      />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/box-plot">Box Plot</Link> — distribution summary with quartiles</li>
        <li><Link to="/charts/area-chart">Area Chart</Link> — band charts via <code>y0Accessor</code></li>
        <li><Link to="/frames/xy-frame">StreamXYFrame</Link> — the underlying frame</li>
      </ul>
    </PageLayout>
  )
}
