import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic"
import {
  applyAnnotationLifecycle,
  bandFromAge,
  withCurrentProvenance,
} from "semiotic/ai"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Live "now" scrubber demo using the shared bandFromAge primitive ──

const TTL_MS = 8000 // 8 seconds — small so the bands change in real time
const TIMELINE_END = TTL_MS * 3.5

const BAND_COLOR = {
  fresh: "#3a8eff",
  aging: "#d49a00",
  stale: "#9aa0a6",
  expired: "#c43d3d",
}

function BandScrubber() {
  const [ageMs, setAgeMs] = useState(0)
  const band = bandFromAge(ageMs, TTL_MS)

  return (
    <div style={{
      border: "1px solid var(--surface-3)",
      borderRadius: 12,
      padding: 20,
      background: "var(--surface-1)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{
        height: 60,
        position: "relative",
        background: "var(--surface-2)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        {/* Visual bands behind the slider */}
        {["fresh", "aging", "stale", "expired"].map((name, i, all) => {
          const left = i === 0 ? 0 : (i === 1 ? TTL_MS : i === 2 ? TTL_MS * 1.5 : TTL_MS * 3)
          const right = i === 0 ? TTL_MS : i === 1 ? TTL_MS * 1.5 : i === 2 ? TTL_MS * 3 : TIMELINE_END
          const widthPct = ((right - left) / TIMELINE_END) * 100
          const leftPct = (left / TIMELINE_END) * 100
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: 0,
                bottom: 0,
                background: BAND_COLOR[name],
                opacity: name === band ? 0.85 : 0.18,
                transition: "opacity 200ms",
              }}
            >
              <span style={{
                position: "absolute",
                top: 4,
                left: 6,
                color: name === band ? "white" : "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>{name}</span>
            </div>
          )
        })}
        {/* The pointer */}
        <div style={{
          position: "absolute",
          left: `${(ageMs / TIMELINE_END) * 100}%`,
          top: 0,
          bottom: 0,
          width: 2,
          background: "white",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
        }} />
      </div>
      <input
        type="range"
        min={0}
        max={TIMELINE_END}
        step={100}
        value={ageMs}
        onChange={(e) => setAgeMs(parseInt(e.target.value, 10))}
        style={{ width: "100%" }}
      />
      <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
        <span>age: <code>{(ageMs / 1000).toFixed(1)}s</code></span>
        <span>TTL: <code>{(TTL_MS / 1000).toFixed(0)}s</code></span>
        <span>band: <strong style={{ color: BAND_COLOR[band] }}>{band}</strong></span>
      </div>
    </div>
  )
}

// ── Live streaming demo: data-driven aging via dataExtent ────────────

const STREAM_TICK = 1500 // ms between data points
const STREAM_WINDOW = 12
const ANNOTATION_TTL_MS = 3000 // 3s TTL keeps the demo fast: aging at 3s, stale at 4.5s, expired at 9s

function StreamingAgingDemo() {
  const startTimeRef = useRef(Date.now())
  const [data, setData] = useState(() => [{ t: Date.now(), value: 50 }])
  const [annotation, setAnnotation] = useState(null)
  const playingRef = useRef(true)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!playingRef.current) return
      const t = Date.now()
      const tickIndex = (t - startTimeRef.current) / STREAM_TICK
      const value = 50 + Math.sin(tickIndex * 0.4) * 18 + (Math.random() - 0.5) * 10
      setData((prev) => {
        const next = [...prev, { t, value }]
        return next.length > STREAM_WINDOW ? next.slice(-STREAM_WINDOW) : next
      })
    }, STREAM_TICK)
    return () => clearInterval(interval)
  }, [])

  const togglePlay = () => {
    playingRef.current = !playingRef.current
    setPlaying(playingRef.current)
  }

  const markLatest = () => {
    const latest = data[data.length - 1]
    if (!latest) return
    // `withCurrentProvenance` stamps `provenance.createdAt = currentTimestamp()`.
    // Combined with the short ttlHint below, the annotation will age as
    // the chart's data extent advances past it.
    setAnnotation(
      withCurrentProvenance(
        {
          type: "callout",
          t: latest.t,
          value: latest.value,
          label: "Marked here",
          dx: -50,
          dy: -45,
          lifecycle: { ttlHint: ANNOTATION_TTL_MS },
        },
        { author: "you", source: "user" }
      )
    )
  }

  // The chart's data extent IS its clock. Passing dataExtent makes
  // the latest data point the "now" reference for the lifecycle pass,
  // so annotations age against chart-time. If the stream pauses, the
  // annotation stops aging — which is what you want for a live
  // dashboard where pause means "frozen in time."
  const annotated = annotation
    ? applyAnnotationLifecycle([annotation], {
        dataExtent: [data[0].t, data[data.length - 1].t],
      })
    : []

  const xFormat = (t) => `${((t - startTimeRef.current) / 1000).toFixed(1)}s`

  return (
    <div style={{
      border: "1px solid var(--surface-3)",
      borderRadius: 12,
      padding: 20,
      background: "var(--surface-1)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <LineChart
        data={data}
        xAccessor="t"
        yAccessor="value"
        title="Streaming chart with auto-aging annotation"
        height={260}
        showPoints
        annotations={annotated}
        xFormat={xFormat}
        margin={{ top: 24, right: 24, bottom: 36, left: 48 }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={togglePlay}
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            background: playing ? "#2d8a4a" : "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {playing ? "Pause stream" : "Resume stream"}
        </button>
        <button
          onClick={markLatest}
          style={{
            padding: "5px 12px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Mark latest point
        </button>
        {annotation && (
          <button
            onClick={() => setAnnotation(null)}
            style={{
              padding: "5px 12px",
              borderRadius: 14,
              background: "var(--surface-2)",
              color: "var(--text)",
              border: "1px solid var(--surface-3)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear annotation
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
        Stamp the latest point, then let the stream run. The annotation
        has a 3-second TTL — at 3s past the latest data point it goes{" "}
        <strong>aging</strong>, at 4.5s <strong>stale</strong> (dashed),
        at 9s it's filtered out. Pause the stream and the annotation
        stops aging too: chart-time is the data, not the wall.
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

export default function TemporalLifecyclePage() {
  return (
    <PageLayout
      title="Temporal Lifecycle"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Temporal Lifecycle", path: "/intelligence/temporal-lifecycle" },
      ]}
      prevPage={{ title: "Conversation Arc", path: "/intelligence/conversation-arc" }}
      nextPage={{ title: "Serialization", path: "/intelligence/serialization" }}
    >
      <p>
        Three Semiotic systems answer the same underlying question —{" "}
        <em>"how does this thing look as it ages?"</em> — with three
        different policies on three different time axes:
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        margin: "16px 0",
      }}>
        {[
          {
            name: "Decay",
            policy: "continuous",
            axis: "buffer position",
            scope: "per-datum",
            doc: "Realtime Encoding",
            href: "/features/realtime-encoding",
            descr: "A continuous opacity ramp keyed to position in the streaming buffer. Older points fade smoothly.",
          },
          {
            name: "Staleness",
            policy: "binary",
            axis: "wall-clock idle",
            scope: "chart-wide",
            doc: "Realtime Encoding",
            href: "/features/realtime-encoding",
            descr: "Live until the chart hasn't seen data for a configured threshold, then dimmed (plus optional LIVE/STALE badge).",
          },
          {
            name: "Annotation freshness",
            policy: "banded",
            axis: "createdAt + ttlHint",
            scope: "per-annotation",
            doc: "Conversation Arc",
            href: "/intelligence/conversation-arc",
            descr: "Four named bands — fresh, aging, stale, expired — with opacity + dashing defaults and an expired filter.",
          },
        ].map(({ name, policy, axis, scope, doc, href, descr }) => (
          <div key={name} style={{
            border: "1px solid var(--surface-3)",
            background: "var(--surface-1)",
            borderRadius: 10,
            padding: 14,
          }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 15 }}>{name}</h3>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
              <code>{policy}</code> · {scope} · {axis}
            </div>
            <p style={{ fontSize: 13, margin: 0 }}>{descr}</p>
            <p style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              <Link to={href}>→ {doc}</Link>
            </p>
          </div>
        ))}
      </div>

      <p>
        The shared primitive that ties them together is{" "}
        <code>bandFromAge(ageMs, ttlMs, thresholds?)</code> — a pure
        function that classifies an age into one of four named bands.
        Annotation freshness uses it today; the other two systems can
        opt into banded classification when a binary or continuous
        policy doesn't fit.
      </p>

      <h2>The classification primitive</h2>

      <p>
        Drag the slider to advance the simulated age. The active band
        is what <code>bandFromAge</code> returns for that age, given
        an 8-second TTL:
      </p>
      <BandScrubber />

      <CodeBlock language="ts">
{`import { bandFromAge } from "semiotic/ai" // or "semiotic/realtime"

bandFromAge(0,             8000) // "fresh"
bandFromAge(7_000,         8000) // "fresh"
bandFromAge(10_000,        8000) // "aging"  (age >= 1.0 × TTL)
bandFromAge(20_000,        8000) // "stale"  (age >= 1.5 × TTL)
bandFromAge(30_000,        8000) // "expired" (age >= 3.0 × TTL)

// Custom thresholds — multipliers of TTL, not raw ms:
bandFromAge(20_000, 8000, { fresh: 2, aging: 3, stale: 6 }) // "fresh"`}
      </CodeBlock>

      <h2>Streaming chart-time aging</h2>

      <p>
        For time-series charts, the chart's own data is its clock —
        the latest data point's timestamp is a more honest "now" than
        wall-clock, because it tracks chart-time even when the stream
        pauses or runs slow. <code>applyAnnotationLifecycle</code>{" "}
        accepts a <code>dataExtent</code> option that derives "now"
        from the latest value automatically.
      </p>

      <StreamingAgingDemo />

      <CodeBlock language="tsx">
{`import {
  applyAnnotationLifecycle,
  withCurrentProvenance,
} from "semiotic/ai"

// Stamp createdAt at the moment of creation; attach a ttlHint so the
// lifecycle pass has something to age against.
const ann = withCurrentProvenance(
  {
    type: "callout",
    t: latestTimestamp,
    value: latestValue,
    label: "Spike",
    lifecycle: { ttlHint: 3000 }, // 3 seconds
  },
  { author: "you", source: "user" }
)

// Pass the chart's data extent so "now" tracks chart-time. When the
// stream pauses, the latest data timestamp stops advancing, and the
// annotation stops aging too.
<LineChart
  data={streamingData}
  xAccessor="t"
  yAccessor="value"
  annotations={applyAnnotationLifecycle([ann], {
    dataExtent: [streamingData[0].t, streamingData.at(-1).t],
  })}
/>`}
      </CodeBlock>

      <h2>Picking a policy</h2>

      <p>The three policies aren't interchangeable — each fits a different question:</p>

      <ul>
        <li>
          <strong>Decay</strong> when older data should still be visible but
          progressively de-emphasized. Per-datum, continuous, drives line
          tails / trail effects.
        </li>
        <li>
          <strong>Staleness</strong> when there's a wall-clock cutoff after
          which the whole chart should look not-live. Chart-wide, binary,
          drives oncall dashboards and incident displays.
        </li>
        <li>
          <strong>Annotation freshness</strong> when a single mark on the
          chart has a TTL of its own that doesn't track the chart's data
          rhythm — a Q3 retrospective note, an SLA breach marker, an
          AI-suggested anomaly tag.
        </li>
      </ul>

      <p>
        All three can coexist on one chart. A streaming dashboard might
        decay older points, mark itself stale when the stream stops, and
        independently age a user-placed annotation against its TTL. The
        only piece they share today is the classifier — the rest of the
        plumbing is intentionally separate so the policies don't drag
        each other's edge cases around.
      </p>
    </PageLayout>
  )
}
