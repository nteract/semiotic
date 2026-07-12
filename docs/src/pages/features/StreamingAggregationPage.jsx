/* eslint-disable react/no-unescaped-entities */
import React, { useRef, useEffect, useState } from "react"
import { RealtimeLineChart } from "semiotic"

import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

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

const panel = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
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

const readout = {
  fontFamily: "var(--font-code, ui-monospace, Menlo, monospace)",
  fontSize: 12,
  color: "var(--text-secondary)",
  marginTop: 10,
}

function Chip({ active, onClick, children, accent = "var(--accent, #6366f1)" }) {
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
      <span style={{ color: "var(--text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {options.map((o) => (
        <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)} accent={accent}>
          {o.label}
        </Chip>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// 1. Windowed aggregation — the firehose
// ---------------------------------------------------------------------------

const STATS = [
  { value: "mean", label: "mean" },
  { value: "sum", label: "sum" },
  { value: "min", label: "min" },
  { value: "max", label: "max" },
  { value: "count", label: "count" },
]
const BANDS = [
  { value: "none", label: "none" },
  { value: "stddev", label: "±σ" },
  { value: "minmax", label: "min–max" },
]
const WINDOWS = [
  { value: "tumbling", label: "tumbling" },
  { value: "hopping", label: "hopping" },
]

function AggregationDemo() {
  const chartRef = useRef()
  const clockRef = useRef(0)
  const pushedRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  const [stat, setStat] = useState("mean")
  const [band, setBand] = useState("stddev")
  const [windowType, setWindowType] = useState("tumbling")
  const [stats, setStats] = useState({ pushed: 0, windows: 0 })

  // Re-key the chart when the structural window config changes so the
  // accumulator rebuilds cleanly.
  const aggregate =
    windowType === "hopping"
      ? { window: "hopping", size: "4s", hop: "1s", stat, band, retain: 40 }
      : { window: "tumbling", size: "2s", stat, band, retain: 40 }

  useEffect(() => {
    const id = setInterval(() => {
      const ref = chartRef.current
      if (!ref) return
      // Firehose: many events per tick, each carrying its own event-time.
      const burst = 15
      for (let k = 0; k < burst; k++) {
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
    <div ref={containerRef} style={panel}>
      <div style={controlsRow}>
        <ChipGroup label="stat" options={STATS} value={stat} onChange={setStat} />
        <ChipGroup label="band" options={BANDS} value={band} onChange={setBand} accent="#0ea5e9" />
        <ChipGroup label="window" options={WINDOWS} value={windowType} onChange={setWindowType} accent="#d49a00" />
      </div>
      {containerWidth && (
        <RealtimeLineChart
          key={windowType}
          ref={chartRef}
          timeAccessor="t"
          valueAccessor="v"
          size={[containerWidth, 260]}
          stroke="#6366f1"
          strokeWidth={2}
          showPoints
          showAxes
          aggregate={aggregate}
        />
      )}
      <div style={readout}>
        {stats.pushed.toLocaleString()} events ingested → {stats.windows} windows drawn
        {"  "}· per-frame work is O(windows), not O(events)
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Event-time ingestion — out-of-order + lateness
// ---------------------------------------------------------------------------

function EventTimeDemo() {
  const chartRef = useRef()
  const clockRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  const [enabled, setEnabled] = useState(true)
  const [policy, setPolicy] = useState("drop")
  const [late, setLate] = useState(0)

  useEffect(() => {
    setLate(0)
  }, [enabled, policy])

  useEffect(() => {
    const id = setInterval(() => {
      const ref = chartRef.current
      if (!ref) return
      clockRef.current += 400
      const base = clockRef.current
      const mk = (t) => ({ t, v: 50 + Math.sin(t * 0.001) * 20 })
      const roll = Math.random()
      if (roll < 0.12) {
        // Very late: older than the 2s grace window → dropped/kept + counted.
        ref.push(mk(base - 4000))
      } else if (roll < 0.5) {
        // Mild jitter: two events arrive out of order but within grace.
        ref.push(mk(base + 200))
        ref.push(mk(base))
      } else {
        ref.push(mk(base))
      }
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={panel}>
      <div style={controlsRow}>
        <ChipGroup
          label="event-time"
          options={[{ value: "on", label: "on" }, { value: "off", label: "off" }]}
          value={enabled ? "on" : "off"}
          onChange={(v) => setEnabled(v === "on")}
        />
        <ChipGroup
          label="late policy"
          options={[{ value: "drop", label: "drop" }, { value: "keep", label: "keep" }]}
          value={policy}
          onChange={setPolicy}
          accent="#c43d3d"
        />
      </div>
      {containerWidth && (
        <RealtimeLineChart
          key={`${enabled}-${policy}`}
          ref={chartRef}
          timeAccessor="t"
          valueAccessor="v"
          size={[containerWidth, 240]}
          stroke="#10b981"
          strokeWidth={2}
          showPoints
          showAxes
          windowSize={60}
          eventTime={enabled ? { lateness: "2s", latePolicy: policy } : undefined}
          onObservation={(o) => {
            if (o.type === "late-data") setLate(o.lateCount)
          }}
        />
      )}
      <div style={readout}>
        {enabled
          ? `reordering within a 2s grace window · ${late} late record${late === 1 ? "" : "s"} ${policy === "drop" ? "dropped" : "kept"} & counted`
          : "raw arrival order — out-of-order arrivals zigzag the line"}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Banded staleness
// ---------------------------------------------------------------------------

const STALE_THRESHOLD = 2000
function bandLabel(idleMs) {
  if (idleMs < STALE_THRESHOLD) return "fresh"
  if (idleMs < STALE_THRESHOLD * 1.5) return "aging"
  if (idleMs < STALE_THRESHOLD * 3) return "stale"
  return "expired"
}
const BAND_COLOR = { fresh: "#2d8a4a", aging: "#d49a00", stale: "#e06c1f", expired: "#c43d3d" }

function StalenessDemo() {
  const chartRef = useRef()
  const clockRef = useRef(0)
  const lastPushRef = useRef(Date.now())
  const [containerRef, containerWidth] = useContainerWidth()
  const [running, setRunning] = useState(true)
  const [band, setBand] = useState("fresh")

  useEffect(() => {
    const push = setInterval(() => {
      if (!running) return
      const ref = chartRef.current
      if (!ref) return
      clockRef.current += 1
      const i = clockRef.current
      ref.push({ t: i, v: 50 + Math.sin(i * 0.1) * 20 + (Math.random() - 0.5) * 8 })
      lastPushRef.current = Date.now()
    }, 90)
    const tick = setInterval(() => {
      setBand(bandLabel(Date.now() - lastPushRef.current))
    }, 250)
    return () => {
      clearInterval(push)
      clearInterval(tick)
    }
  }, [running])

  return (
    <div ref={containerRef} style={panel}>
      <div style={controlsRow}>
        <Chip active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "Pause stream" : "Resume stream"}
        </Chip>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          current band:{" "}
          <strong style={{ color: BAND_COLOR[band] }}>{band}</strong>
        </span>
      </div>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          timeAccessor="t"
          valueAccessor="v"
          size={[containerWidth, 240]}
          stroke="#6366f1"
          strokeWidth={2}
          showAxes
          windowSize={120}
          staleness={{ graded: true, threshold: STALE_THRESHOLD }}
        />
      )}
      <div style={readout}>
        Pause the stream: the chart dims through fresh → aging → stale → expired as idle time crosses 1× / 1.5× / 3× the {STALE_THRESHOLD / 1000}s threshold.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StreamingAggregationPage() {
  return (
    <PageLayout
      title="Streaming Aggregation"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Streaming Aggregation", path: "/features/streaming-aggregation" },
      ]}
      prevPage={{ title: "Physics Encoding", path: "/features/physics-encoding" }}
      nextPage={{ title: "Chart Container", path: "/features/chart-container" }}
    >
      <p>
        Most front-end streaming charts buffer raw records and redraw them — so
        cost grows with the <em>volume</em> of the stream, and a high-rate source
        eventually swamps the main thread. Semiotic's streaming-aggregation layer
        inverts that: it <strong>aggregates on ingest</strong> into bounded,
        event-time windows, so per-frame work scales with the <em>resolution</em>{" "}
        of the view, not the arrival rate. It is, in effect, the Kafka Streams
        windowed-aggregation model running client-side.
      </p>

      <p>
        Three opt-in capabilities make up the layer — windowed aggregation,
        event-time ingestion, and banded staleness — each additive on top of the
        existing realtime charts. Everything below is live.
      </p>

      {/* ----------------------------------------------------------------- */}
      <h2 id="aggregation">Windowed aggregation</h2>

      <p>
        Set <code>aggregate</code> on a realtime chart and pushed events are
        reduced into <strong>tumbling</strong>, <strong>hopping</strong>, or{" "}
        <strong>session</strong> windows keyed on the datum's own time field. Each
        window holds a full online statistics object (count, mean, variance,
        min, max), so one configuration can draw the mean / sum / min / max /
        count line plus a ±σ or min–max band — without re-scanning a buffer.
        The demo below is a firehose: it pushes 15 events every 80&nbsp;ms, yet
        the chart only ever draws a handful of window marks.
      </p>

      <AggregationDemo />

      <p style={{ marginTop: 16 }}>
        Watch the readout. Tens of thousands of events collapse to a couple of
        dozen window marks — and because <code>retain</code> caps the live window
        count, memory stays flat for an unbounded stream. That single mechanism
        is the answer to four things people usually treat separately: bounded
        memory, level-of-detail downsampling, backpressure, and windowing
        semantics.
      </p>

      <CodeBlock
        language="jsx"
        code={`<RealtimeLineChart
  ref={chartRef}
  timeAccessor="t"
  valueAccessor="v"
  aggregate={{
    window: "hopping",   // "tumbling" | "hopping" | "session"
    size: "1m",          // ms or a duration string ("10s", "1m30s")
    hop: "10s",          // hopping only
    stat: "mean",        // mean | sum | min | max | count
    band: "stddev",      // "stddev" | "minmax" | "none"  →  ±σ envelope
    retain: 60,          // keep the 60 most-recent windows (bounded memory)
  }}
/>`}
      />

      <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px", margin: "16px 0", fontSize: 14 }}>
        <strong>Naming note.</strong> This is the <em>aggregation window</em> —
        the interval events are reduced over. It is unrelated to{" "}
        <code>windowMode</code> (<code>"sliding" | "growing"</code>), which is the
        ring-buffer's eviction policy. Different concept, deliberately different
        word.
      </div>

      {/* ----------------------------------------------------------------- */}
      <h2 id="event-time">Event-time ingestion</h2>

      <p>
        A jittery or merged multi-source stream arrives out of order, and a chart
        that appends in arrival order draws a zigzag. Turn on{" "}
        <code>eventTime</code> and Semiotic buffers pushed events for a bounded{" "}
        <strong>lateness / grace window</strong>, releasing them in event-time
        order. Records older than <code>watermark − lateness</code> are{" "}
        <em>late</em>: dropped or kept per policy, and always counted and surfaced
        through <code>onObservation</code> so lateness is observable rather than
        silent. Toggle it off to see the zigzag return.
      </p>

      <EventTimeDemo />

      <CodeBlock
        language="jsx"
        code={`<RealtimeLineChart
  ref={chartRef}
  timeAccessor="t"
  valueAccessor="v"
  eventTime={{ lateness: "2s", latePolicy: "drop" }}  // "drop" | "keep"
  onObservation={(o) => {
    if (o.type === "late-data") {
      console.warn("late record", o.eventTime, "watermark", o.watermark, "total", o.lateCount)
    }
  }}
/>`}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="banded-staleness">Banded staleness</h2>

      <p>
        Liveness usually flips binary — live, then suddenly stale. Banded
        staleness instead dims the chart <strong>progressively</strong> through
        fresh → aging → stale → expired as wall-clock idle time crosses multiples
        of a threshold, sharing one schedule with per-datum decay and annotation
        freshness. Pause the stream and watch it age.
      </p>

      <StalenessDemo />

      <CodeBlock
        language="jsx"
        code={`<RealtimeLineChart
  ref={chartRef}
  staleness={{ graded: true, threshold: 5000 }}
  // graded: true  →  fresh < 1×, aging < 1.5×, stale < 3×, expired ≥ 3× threshold
  // override band thresholds/opacities:
  // staleness={{ graded: { thresholds: { stale: 4 }, opacities: { aging: 0.8 } } }}
/>`}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="primitives">The primitives underneath</h2>

      <p>
        The chart props are sugar over pure, separately-importable modules from{" "}
        <code>semiotic/realtime</code>. Use them directly to roll your own
        streaming statistics:
      </p>

      <ul>
        <li>
          <code>RunningStats</code> — Welford online mean/variance/min/max with an
          O(1) parallel <code>merge</code> (the operation that rolls fine windows
          up into coarse ones).
        </li>
        <li>
          <code>WindowAccumulator</code> — tumbling/hopping/session windows over
          event-time, a <code>RunningStats</code> per window.
        </li>
        <li>
          <code>ReorderBuffer</code> — the bounded out-of-order / lateness buffer.
        </li>
        <li>
          <code>parseWindowDuration</code> — <code>"1m30s"</code> → ms.
        </li>
      </ul>

      <CodeBlock
        language="js"
        code={`import { RunningStats, WindowAccumulator } from "semiotic/realtime"

const acc = new WindowAccumulator({ window: "tumbling", size: 60_000 })
acc.push(eventTimeMs, value)        // O(1) amortized, any arrival order
const windows = acc.emit()          // [{ start, end, count, mean, stddev, min, max, partial }]`}
      />

      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> — decay,
          pulse, transitions, and (binary) staleness
        </li>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> — the
          chart these props attach to
        </li>
        <li>
          <Link to="/features/push-api">Push API</Link> — the ref-based ingestion
          model
        </li>
        <li>
          <Link to="/blog/streaming-that-aggregates-itself">
            Blog: Streaming that aggregates itself
          </Link>{" "}
          — the why, with the AGAMI lineage
        </li>
      </ul>
    </PageLayout>
  )
}
