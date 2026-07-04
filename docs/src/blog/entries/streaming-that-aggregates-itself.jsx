/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { RealtimeLineChart, ThemeProvider } from "semiotic"

// Metadata first so the sync check reads the canonical title/author
// literals before any UI strings.
const META = {
  slug: "streaming-that-aggregates-itself",
  title: "Streaming that aggregates itself",
  subtitle:
    "Most front-end streaming charts get slower as the stream gets faster. Semiotic's new streaming-aggregation layer makes per-frame cost depend on how much you can see, not how much arrives, just like the Kafka Streams windowing model, except client-side.",
  author: "Elijah Meeks",
  date: "2026-06-19",
  tags: ["case-study", "realtime"],
  excerpt:
    "Buffering raw records and redrawing them is the default front-end streaming pattern, and it scales with stream volume. Aggregate on ingest into bounded event-time windows and the cost follows the resolution of the view instead. That collapses bounded memory, downsampling, backpressure, and windowing into one mechanism, with live charts.",
}

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

const code = {
  background: "var(--surface-2)",
  padding: 12,
  borderRadius: 6,
  fontSize: 13,
  overflowX: "auto",
}

const ic = {
  fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
  fontSize: "0.9em",
}

const readout = {
  fontFamily: "var(--font-code, ui-monospace, Menlo, monospace)",
  fontSize: 12,
  color: "var(--text-secondary)",
  marginTop: 10,
}

const controlsRow = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function Chip({ active, onClick, children, accent = "#6366f1" }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        border: `1px solid ${active ? accent : "var(--surface-3)"}`,
        background: active ? accent : "transparent",
        color: active ? "white" : "var(--text)",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  )
}

function ChipGroup({ label, options, value, onChange, accent }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          color: "var(--text-secondary)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {options.map((o) => (
        <Chip
          key={o.value}
          active={value === o.value}
          onClick={() => onChange(o.value)}
          accent={accent}
        >
          {o.label}
        </Chip>
      ))}
    </span>
  )
}

// ─── Demo 1: the firehose ──────────────────────────────────────────────────

const STATS = [
  { value: "mean", label: "mean" },
  { value: "max", label: "max" },
  { value: "count", label: "count" },
]
const BANDS = [
  { value: "stddev", label: "±σ" },
  { value: "minmax", label: "min–max" },
  { value: "none", label: "none" },
]

function FirehoseDemo() {
  const chartRef = useRef()
  const clockRef = useRef(0)
  const pushedRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [stat, setStat] = useState("mean")
  const [band, setBand] = useState("stddev")
  const [stats, setStats] = useState({ pushed: 0, windows: 0 })

  useEffect(() => {
    const id = setInterval(() => {
      const ref = chartRef.current
      if (!ref) return
      for (let k = 0; k < 15; k++) {
        clockRef.current += 130
        const t = clockRef.current
        const v = 50 + Math.sin(t * 0.0006) * 22 + (Math.random() - 0.5) * 18
        ref.push({ t, v })
        pushedRef.current++
      }
      setStats({ pushed: pushedRef.current, windows: ref.getData().length })
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={chartFrame}>
      <ThemeProvider theme="carbon-dark">
        <div ref={containerRef}>
          <div style={controlsRow}>
            <ChipGroup label="stat" options={STATS} value={stat} onChange={setStat} />
            <ChipGroup
              label="band"
              options={BANDS}
              value={band}
              onChange={setBand}
              accent="#0ea5e9"
            />
          </div>
          {containerWidth && (
            <RealtimeLineChart
              ref={chartRef}
              timeAccessor="t"
              valueAccessor="v"
              size={[containerWidth, 260]}
              stroke="#6366f1"
              strokeWidth={2}
              showPoints
              showAxes
              aggregate={{ window: "tumbling", size: "2s", stat, band, retain: 40 }}
            />
          )}
          <div style={readout}>
            {stats.pushed.toLocaleString()} events ingested → {stats.windows} window marks drawn
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}

// ─── Demo 2: event-time / out-of-order ─────────────────────────────────────

function EventTimeDemo() {
  const chartRef = useRef()
  const clockRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [enabled, setEnabled] = useState(true)
  const [late, setLate] = useState(0)

  useEffect(() => {
    setLate(0)
  }, [enabled])

  useEffect(() => {
    const id = setInterval(() => {
      const ref = chartRef.current
      if (!ref) return
      clockRef.current += 400
      const base = clockRef.current
      const mk = (t) => ({ t, v: 50 + Math.sin(t * 0.001) * 20 })
      const roll = Math.random()
      if (roll < 0.12) ref.push(mk(base - 4000))
      else if (roll < 0.5) {
        ref.push(mk(base + 200))
        ref.push(mk(base))
      } else ref.push(mk(base))
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={chartFrame}>
      <ThemeProvider theme="carbon-dark">
        <div ref={containerRef}>
          <div style={controlsRow}>
            <ChipGroup
              label="event-time"
              options={[
                { value: "on", label: "on" },
                { value: "off", label: "off" },
              ]}
              value={enabled ? "on" : "off"}
              onChange={(v) => setEnabled(v === "on")}
              accent="#10b981"
            />
          </div>
          {containerWidth && (
            <RealtimeLineChart
              key={enabled ? "on" : "off"}
              ref={chartRef}
              timeAccessor="t"
              valueAccessor="v"
              size={[containerWidth, 230]}
              stroke="#10b981"
              strokeWidth={2}
              showPoints
              showAxes
              windowSize={60}
              eventTime={enabled ? { lateness: "2s", latePolicy: "drop" } : undefined}
              onObservation={(o) => {
                if (o.type === "late-data") setLate(o.lateCount)
              }}
            />
          )}
          <div style={readout}>
            {enabled
              ? `reordered within a 2s grace window · ${late} late record${late === 1 ? "" : "s"} dropped & counted`
              : "raw arrival order (out-of-order arrivals zigzag the line)"}
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}

// ─── Body ──────────────────────────────────────────────────────────────────

function Body() {
  return (
    <article style={{ lineHeight: 1.65 }}>
      <p>
        Here is the uncomfortable property of almost every front-end streaming chart: it gets{" "}
        <em>slower</em> as the stream gets <em>faster</em>. The standard pattern is to buffer raw
        records and redraw them, so the work per frame is tied to how many records arrived. Point
        the chart at a 50,000-messages-per-second Kafka topic and it falls over. That's not because
        drawing 50,000 points is useful (you can't see them), but because the renderer never got the
        memo that volume and resolution are different things.
      </p>

      <p>
        Semiotic now ships a streaming-aggregation layer that fixes the axis. Instead of buffering
        raw points, it <strong>aggregates on ingest</strong> into bounded, event-time windows, so
        per-frame cost follows the <em>resolution of the view</em>—the number of windows you can
        actually see—not the arrival rate. It is, almost exactly, the Kafka Streams
        windowed-aggregation model expressed client-side. The whole thing is opt-in props on the
        realtime charts you already have.
      </p>

      <h2>Why this works</h2>

      <p>
        The insight isn't mine. It's the transferable core of{" "}
        <em>AGAMI: Scalable Visual Analytics over Multidimensional Data Streams</em> (Lu, Wong, …,
        Joshi, Malensek — University of San Francisco, IEEE/ACM BDCAT 2020), a distributed-backend
        system whose central data-structure idea drops cleanly onto a client renderer:
      </p>

      <blockquote
        style={{
          borderLeft: "3px solid var(--accent, #6366f1)",
          margin: "16px 0",
          padding: "4px 0 4px 16px",
          color: "var(--text-secondary)",
        }}
      >
        Don't buffer raw records and evict the oldest. Aggregate on ingest into a compact, bounded
        summary built from online running statistics. Memory and per-frame work then scale with the
        resolution of the view, not the volume of the stream.
      </blockquote>

      <p>
        That allows us to treat <strong>bounded memory</strong>,{" "}
        <strong>downsampling / level-of-detail</strong>, <strong>backpressure</strong>, and{" "}
        <strong>windowing semantics</strong> with a single mechanism. If your chart only ever holds
        a bounded number of window aggregates, memory is bounded by construction, the marks are an
        aggregate rather than dropped points, and a firehose renders the same as a trickle because
        the render work doesn't depend on the input rate. It's true in data analysis but especially
        in data visualization: we do not need to pretend that every datapoint needs to be seen to
        create effective visualization.
      </p>

      <h2>The firehose</h2>

      <p>
        The chart below pushes <strong>15 events every 80&nbsp;ms</strong> — a deliberate firehose.
        It never draws more than a couple of dozen marks. Each window carries a full online
        statistics object (count, mean, variance, min, max via Welford's method), so you can flip
        the rendered statistic and the band without touching the data path:
      </p>

      <FirehoseDemo />

      <p>
        Watch the readout: tens of thousands of events, a few dozen marks. The{" "}
        <code style={ic}>retain</code> option caps the live window count, so the chart's memory is
        flat no matter how long it runs. The ±σ band isn't a second pass over a buffer, it just
        falls straight out of the per-window variance the accumulator already maintains.
      </p>

      <pre style={code}>{`<RealtimeLineChart
  ref={chartRef}
  timeAccessor="t"
  valueAccessor="v"
  aggregate={{
    window: "tumbling",  // or "hopping" (overlapping) | "session" (gap-bounded)
    size: "2s",          // ms or a duration string ("10s", "1m30s")
    stat: "mean",        // mean | sum | min | max | count
    band: "stddev",      // "stddev" | "minmax" | "none"  →  envelope
    retain: 40,          // bounded memory: keep the 40 newest windows
  }}
/>`}</pre>

      <p>
        One naming caveat: this is referred to in Semiotic as the{" "}
        <strong>aggregation window</strong>. It is the interval events are reduced over. It is{" "}
        <em>not</em> the same as <code style={ic}>windowMode</code> (
        <code style={ic}>"sliding" | "growing"</code>), which is the ring buffer's eviction policy.
        Two different concepts that the streaming literature unhelpfully gives the same word;
        Semiotic keeps them distinct.
      </p>

      <h2>Event-time, not arrival-time</h2>

      <p>
        The other half of the Kafka model is that windows key on the timestamp{" "}
        <em>in the record</em>, not when it showed up. Real streams arrive jittery and merged from
        multiple sources, and a chart that appends in arrival order draws a zigzag that means
        nothing. Turn on <code style={ic}>eventTime</code> and Semiotic buffers events for a bounded{" "}
        <strong>lateness / grace window</strong> and releases them in event-time order. A record
        older than <code style={ic}>watermark − lateness</code> is <em>late</em>: dropped or kept
        per policy, and counted and surfaced through <code style={ic}>onObservation</code> so
        lateness is a signal and not a silent bug. Toggle it off below to bring the zigzag back:
      </p>

      <EventTimeDemo />

      <pre style={code}>{`<RealtimeLineChart
  eventTime={{ lateness: "2s", latePolicy: "drop" }}   // "drop" | "keep"
  onObservation={(o) => {
    if (o.type === "late-data")
      console.warn("late", o.eventTime, "watermark", o.watermark, "total", o.lateCount)
  }}
/>`}</pre>

      <p>
        The tradeoff is explicit: a lateness window delays display by that much in exchange for
        correct ordering. This is a fact of all watermark strategies. That's the same deal Kafka
        Streams offers with its grace period, because you can't both show data instantly and
        guarantee it's in order.
      </p>

      <h2>What sets it apart from the usual front-end streaming kit</h2>

      <p>
        Most charting libraries treat "realtime" as "call setData faster." That gives you three
        failure modes the aggregation model sidesteps:
      </p>

      <ul>
        <li>
          <strong>Cost tied to volume.</strong> Re-rendering the raw buffer means a faster stream is
          a slower chart. Aggregation makes render cost O(visible windows) independent of input
          rate.
        </li>
        <li>
          <strong>Unbounded memory.</strong> "Keep the last N points" is a band-aid that still
          scales N with rate to preserve a time span. A retained window set is bounded in the
          dimension you actually care about: time on screen.
        </li>
        <li>
          <strong>Arrival-order lies.</strong> Plotting points as they land conflates network jitter
          with signal. Event-time windowing and a grace buffer separate the two, and report the
          lateness instead of hiding it.
        </li>
      </ul>

      <p>
        The chart props are a helpful abstraction over pure modules, so you can drop to the
        primitives when you need them. <code style={ic}>RunningStats</code> (Welford online stats
        with an O(1) parallel <code style={ic}>merge</code>
        ), <code style={ic}>WindowAccumulator</code> (the windowing engine), and{" "}
        <code style={ic}>ReorderBuffer</code> (the lateness buffer) all import from{" "}
        <code style={ic}>semiotic/realtime</code> and run headless:
      </p>

      <pre style={code}>{`import { WindowAccumulator } from "semiotic/realtime"

const acc = new WindowAccumulator({ window: "tumbling", size: 60_000 })
acc.push(eventTimeMs, value)   // O(1) amortized, any arrival order
acc.emit()                     // [{ start, end, count, mean, stddev, min, max, partial }]`}</pre>

      <h2>When to use it</h2>

      <p>
        Aggregate when the stream is faster than the eye: metrics firehoses, high-frequency sensors,
        request traces, anything where the signal is the <em>distribution over an interval</em>, not
        the individual event. Use event-time mode whenever records can arrive out of order as in
        merged sources, mobile clients, replays.
      </p>

      <p>
        Don't use it when every individual event matters and the rate is low. A handful of discrete
        events a second belong on a plain{" "}
        <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> or{" "}
        <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> with the raw push API,
        where you keep per-point identity, hover, and <code style={ic}>update(id, …)</code>.
        Aggregation is a reduction; if you need the rows, don't reduce them.
      </p>

      <h2>Where this shows up</h2>

      <p>
        The example here is a synthetic metric, but the shape is everywhere a bounded screen meets
        an unbounded stream:
      </p>

      <ul>
        <li>
          <strong>Observability / APM</strong> — p50/p95 latency over rolling windows, request rate
          per service, error counts by minute.
        </li>
        <li>
          <strong>Kafka / event pipelines</strong> — throughput and lag per partition, exactly the
          windowed-aggregation model these charts mirror.
        </li>
        <li>
          <strong>IoT sensor fleets</strong> — thousands of devices reporting on their own clocks,
          arriving late and out of order over flaky links.
        </li>
        <li>
          <strong>Financial tick data</strong> — OHLC bars are tumbling windows; a ±σ band is a
          volatility envelope.
        </li>
        <li>
          <strong>Log analytics</strong> — events-per-interval by level, where the interesting thing
          is the rate, not the line.
        </li>
      </ul>

      <h2>Related</h2>

      <ul>
        <li>
          <Link to="/features/streaming-aggregation">Streaming Aggregation</Link> — the full
          interactive feature page (tumbling/hopping/session, banded staleness, the primitives)
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> — decay, pulse,
          transitions, staleness
        </li>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> — the chart these props
          attach to
        </li>
        <li>
          <Link to="/features/push-api">Push API</Link> — the ref-based ingestion model underneath
        </li>
      </ul>
    </article>
  )
}

export default {
  ...META,
  ogChart: { component: "LineChart" },
  component: Body,
}
