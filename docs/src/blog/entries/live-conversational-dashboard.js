/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { LineChart } from "semiotic"
import { useChartInterrogation } from "semiotic/ai"

// ─── Styling ──────────────────────────────────────────────────────────────
const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  overflow: "hidden",
  margin: "20px 0",
}

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 16,
}

const chatPanel = {
  background: "var(--surface-2)",
  borderRadius: 8,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  height: 360,
  fontSize: 12,
}

const transcriptBox = {
  flex: 1,
  overflowY: "auto",
  paddingRight: 4,
  marginBottom: 8,
}

const watcherBubble = {
  background: "rgba(251, 191, 36, 0.18)",
  border: "1px solid rgba(251, 191, 36, 0.45)",
  borderRadius: 8,
  padding: "6px 10px",
  marginBottom: 8,
  fontSize: 11,
  lineHeight: 1.45,
}

const userBubble = {
  background: "var(--accent)",
  color: "white",
  borderRadius: "10px 10px 2px 10px",
  padding: "6px 10px",
  marginBottom: 6,
  fontSize: 11,
  alignSelf: "flex-end",
  maxWidth: "85%",
  display: "inline-block",
}

const aiBubble = {
  background: "var(--surface-3)",
  color: "var(--text)",
  borderRadius: "10px 10px 10px 2px",
  padding: "6px 10px",
  marginBottom: 6,
  fontSize: 11,
  maxWidth: "85%",
  display: "inline-block",
  whiteSpace: "pre-wrap",
}

const inputRow = { display: "flex", gap: 4 }
const inputStyle = {
  flex: 1,
  padding: "5px 8px",
  borderRadius: 4,
  border: "1px solid var(--surface-3)",
  background: "var(--background)",
  color: "var(--text)",
  fontSize: 11,
}
const buttonStyle = {
  padding: "5px 10px",
  borderRadius: 4,
  border: "none",
  background: "var(--accent)",
  color: "white",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
}

const controlBar = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  fontSize: 12,
}

const statusDot = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "var(--accent)",
  animation: "pulse-dot 1.4s ease-in-out infinite",
  marginRight: 6,
  verticalAlign: "middle",
}

// ─── Streaming demo ───────────────────────────────────────────────────────
// Synthetic latency stream. Most values land in 80-180 ms; ~5% are spikes,
// ~2% are dips. The z-score watcher catches both.
function generateNext(tick) {
  const base = 130 + Math.sin(tick / 8) * 20 + (Math.random() - 0.5) * 30
  const roll = Math.random()
  if (roll > 0.95) return base + 350 + Math.random() * 300 // spike
  if (roll < 0.03) return Math.max(30, base - 80 - Math.random() * 40) // dip
  return base
}

function rollingStats(values) {
  if (values.length < 2) return { mean: 0, std: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return { mean, std: Math.sqrt(variance) }
}

// Canned follow-up responder. In production this calls an LLM with the
// recent transcript + the focused event + the current rolling stats.
async function cannedFollowup(query, context) {
  await new Promise((r) => setTimeout(r, 250))
  const q = query.toLowerCase()
  const focus = context.focus
  if (q.includes("baseline") || q.includes("normal")) {
    return {
      answer: `Current rolling baseline: ~130ms ±30ms. Watcher flags anything beyond 2.5σ. That's roughly under 50ms or over 220ms.`,
    }
  }
  if (q.includes("why") && focus) {
    return {
      answer: `Most ${focus.datum.value > 300 ? "spikes" : "dips"} of this magnitude correlate with one of: a slow downstream call, a GC pause on the app server, or transient network congestion. Without trace IDs I can't be more specific. Recommend cross-referencing the app log at that timestamp.`,
    }
  }
  if (q.includes("trend") || q.includes("worsen") || q.includes("getting")) {
    return {
      answer: `Looking at the last ~30 seconds, latency is ${Math.random() > 0.5 ? "stable" : "drifting up slightly"} but a streaming window this short makes trend claims unreliable. Recommend a longer history before declaring a trend.`,
    }
  }
  if (q.includes("how many") || q.includes("count")) {
    return {
      answer: `Since you started watching, I've flagged ${context.summary.rowCount > 0 ? "several" : "no"} anomalies. The transcript above is your audit trail.`,
    }
  }
  return {
    answer: `I can riff on anomalies the watcher already flagged, compare to baseline, or describe recent trend. Ask "why" about a specific event, "what's the baseline?", or "is it getting worse?"`,
  }
}

function LiveDashboardDemo() {
  const [points, setPoints] = useState([])
  const [paused, setPaused] = useState(false)
  const [input, setInput] = useState("")
  const tickRef = useRef(0)
  const recentRef = useRef([])
  const lastFlagRef = useRef(-Infinity)

  const { ask, announce, history, annotations, reset } = useChartInterrogation({
    data: points,
    onQuery: cannedFollowup,
  })

  // Auto-scroll the transcript as new messages arrive
  const transcriptRef = useRef(null)
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [history])

  // The streaming loop. Generates one point per tick, runs the rolling
  // z-score detector, and fires announce() when something deviates.
  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => {
      const tick = (tickRef.current += 1)
      const value = generateNext(tick)
      const next = { ts: tick, value }

      setPoints((prev) => {
        const updated = [...prev, next]
        // Keep at most 120 points visible about 50 seconds at 400ms cadence
        return updated.length > 120 ? updated.slice(-120) : updated
      })

      // Z-score detector on the trailing 30 points
      const buf = recentRef.current
      buf.push(value)
      if (buf.length > 30) buf.shift()
      if (buf.length >= 15) {
        const { mean, std } = rollingStats(buf.slice(0, -1)) // exclude the new point itself
        if (std > 0) {
          const z = (value - mean) / std
          // Debounce: don't flag again within 5 ticks of the last flag
          if (Math.abs(z) > 2.4 && tick - lastFlagRef.current > 5) {
            lastFlagRef.current = tick
            const direction = z > 0 ? "spike" : "dip"
            const text =
              `${direction === "spike" ? "⚠" : "⚡"} ${direction} at t=${tick}: ` +
              `${Math.round(value)}ms (${z > 0 ? "+" : ""}${z.toFixed(1)}σ vs ${Math.round(mean)}ms baseline)`
            const note =
              z > 2.4
                ? "Sharp upward deviation. Likely candidates: a slow downstream call, GC pause, or congested network. Worth investigating if it recurs in this window."
                : "Downward deviation. Often spurious because of caching effects, fewer concurrent requests, or under-counted samples. Less actionable than spikes."
            announce({
              text,
              annotations: [
                {
                  type: "callout",
                  ts: tick,
                  value,
                  label: `${direction === "spike" ? "↑" : "↓"} ${Math.round(value)}ms`,
                  note,
                  source: "ai-watcher",
                  dx: direction === "spike" ? 20 : -20,
                  dy: direction === "spike" ? -30 : 30,
                },
              ],
            })
          }
        }
      }
    }, 400)
    return () => clearInterval(id)
  }, [paused, announce])

  // Visible window only points already in state. We compute the visible
  // chart domain from the buffer so the chart doesn't try to render an
  // x-axis from 0 to infinity.
  const xExtent = useMemo(() => {
    if (points.length === 0) return [0, 1]
    return [points[0].ts, points[points.length - 1].ts]
  }, [points])

  const submit = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setInput("")
    void ask(trimmed)
  }

  const handleReset = () => {
    setPaused(true)
    setPoints([])
    recentRef.current = []
    lastFlagRef.current = -Infinity
    tickRef.current = 0
    reset()
  }

  return (
    <div style={chartFrame}>
      <div style={controlBar}>
        <span>
          <span style={statusDot} />
          <strong>{paused ? "Paused" : "Watching"}</strong> — stream + z-score detector live
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          style={{
            ...buttonStyle,
            background: paused ? "var(--accent)" : "var(--surface-3)",
            color: paused ? "white" : "var(--text)",
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{ ...buttonStyle, background: "var(--surface-3)", color: "var(--text)" }}
        >
          Reset
        </button>
        <span style={{ color: "var(--text-secondary)" }}>
          {points.length} points · {history.filter((m) => m.role === "assistant").length}{" "}
          announcements
        </span>
      </div>
      <h3>Request latency (ms) — synthetic stream</h3>

      <div style={dashboardGrid}>
        <div style={{ background: "var(--background)", borderRadius: 8, padding: 8 }}>
          <LineChart
            data={points}
            xAccessor="ts"
            yAccessor="value"
            xExtent={xExtent}
            yExtent={[0, 800]}
            title=""
            showPoints={false}
            lineWidth={1.5}
            annotations={annotations}
            width={600}
            height={300}
            responsiveWidth
            margin={{ top: 30, right: 24, bottom: 30, left: 50 }}
          />
        </div>

        <div style={chatPanel}>
          <div ref={transcriptRef} style={transcriptBox}>
            {history.length === 0 && (
              <div
                style={{ color: "var(--text-secondary)", fontStyle: "italic", padding: "8px 4px" }}
              >
                Watcher will announce anomalies here in real-time. You can also ask follow-ups
                ("why?", "what's baseline?", "trend?").
              </div>
            )}
            {history.map((m, i) => {
              // Distinguish AI-watcher proactive announcements from
              // user-question responses. Convention: watcher messages start
              // with the ⚠ or ⚡ glyph emitted above.
              const isWatcher =
                m.role === "assistant" && (m.text.startsWith("⚠") || m.text.startsWith("⚡"))
              if (isWatcher)
                return (
                  <div key={i} style={watcherBubble}>
                    {m.text}
                  </div>
                )
              if (m.role === "user") {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={userBubble}>{m.text}</div>
                  </div>
                )
              }
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={aiBubble}>{m.text}</div>
                </div>
              )
            })}
          </div>
          <div style={inputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ask a follow-up…"
              style={inputStyle}
            />
            <button type="button" onClick={submit} style={buttonStyle}>
              Ask
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

function Body() {
  return (
    <>
      <p>
        Static dashboards show you the past. Conversational dashboards (the chat-with-a-chart
        pattern) make the past interrogable. <em>Live</em> conversational dashboards add the missing
        piece: an AI watching the stream alongside you, proactively narrating events as they happen
        and anchoring its narration back onto the chart. The chart accumulates context the moment
        something interesting occurs. There's no waiting for someone to ask the question, no losing
        the moment to scroll.
      </p>
      <h2 id="three-pieces">Three pieces composed into one product</h2>
      <p>
        This pattern is buildable only because Semiotic ships the three primitives it needs as
        separate, composable things:
      </p>
      <ul>
        <li>
          <strong>A streaming runtime.</strong> Push API, observation hooks, decay encoding — the
          chart is designed for data that arrives over time.
        </li>
        <li>
          <strong>An interrogation hook with proactive announcements.</strong> The new{" "}
          <code>announce()</code> method appends AI-initiated messages to the transcript and adds
          annotations to the chart without going through a user question. A watcher can call it as
          freely as a user can call <code>ask()</code>.
        </li>
        <li>
          <strong>Anchored annotations.</strong> Every announcement can carry a callout, a
          threshold, or a band — visual provenance for the AI's claims, attached to the coordinates
          the claim is about.
        </li>
      </ul>
      <p>
        Compose them and you get a dashboard where the AI's "I saw that" is structurally identical
        to the human's "ask about that" — both write to the same transcript, both leave traces on
        the same chart, both feed the same conversation.
      </p>

      <h2 id="demo">Try it</h2>
      <p>
        Synthetic request-latency stream — a value arrives every 400ms. A rolling z-score detector
        watches the last 30 points; anything beyond ±2.4σ gets announced. Each announcement carries
        a callout on the chart (with a note explaining the deviation category) and an entry in the
        transcript. Ask a follow-up like <em>"why?"</em>, <em>"what's baseline?"</em>, or{" "}
        <em>"is it getting worse?"</em> and you'll get the AI's response in the same transcript.
        Pause to inspect; reset to start over.
      </p>
      <LiveDashboardDemo />
      <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
        The demo uses canned responders for the LLM side. In production you'd wire{" "}
        <code>onQuery</code> to a real model and the announcement <code>note</code> field would be
        the model's actual narrative — generated when the watcher fires, cached on the annotation,
        displayed on hover.
      </p>

      <h2 id="watcher-pattern">The watcher pattern</h2>
      <p>
        The detector here is intentionally simple: a rolling-window z-score with a debounce. That's
        the right starting point for most monitoring workflows because it has zero configuration,
        runs in O(window) per tick, and catches both spikes and dips. Stronger detectors layer on
        top:
      </p>
      <ul>
        <li>
          <strong>Median absolute deviation (MAD)</strong> instead of stddev for non-Gaussian
          streams — heavy-tailed metrics (request latency, error counts) often have outliers that
          pull stddev around. MAD is robust.
        </li>
        <li>
          <strong>Multi-window comparison.</strong> Compare the trailing 30 seconds to the trailing
          5 minutes. Flag when they diverge. Catches drift the rolling-window detector misses.
        </li>
        <li>
          <strong>Domain-aware thresholds.</strong> Latency over 1000ms is interesting at any time,
          even if the rolling mean was 950ms. Add absolute thresholds on top of the statistical
          ones.
        </li>
        <li>
          <strong>Capability-layer-driven detection.</strong> The same chart that's currently
          showing latency could be rendered as a Histogram instead — and the histogram-based watcher
          would flag distribution-shape changes (bimodal becoming unimodal, tail fattening). Pair{" "}
          <Link to="/intelligence/suggestions">
            <code>suggestStreamCharts</code>
          </Link>{" "}
          with watcher logic specific to each chart family.
        </li>
      </ul>
      <p>
        Whatever the detector, the pattern is the same: when it fires, call <code>announce()</code>{" "}
        with text and annotations. The interrogation hook handles the rest.
      </p>

      <h2 id="conversational-side">The conversational side</h2>
      <p>
        Half of the dashboard is autonomous (watcher → announce). The other half is reactive: the
        user reads an announcement, has a follow-up question, and asks. That question lands in the
        same transcript with full context — recent announcements, the statistical summary of the
        visible window, the user's currently-focused point if any.
      </p>
      <p>
        The asymmetry is the feature. The watcher narrates broadly ("⚠ spike at t=42, 3.1σ above
        baseline"); the user drills in ("which downstream call?"). The LLM gets both signals on
        every turn — it knows what the watcher already said and what the user wants to know now.
      </p>

      <h2 id="when-to-deploy">When to deploy this</h2>
      <ul>
        <li>
          <strong>Production monitoring with on-call rotation.</strong> The AI is essentially
          writing real-time handoff notes. When the next oncall takes over, the transcript plus the
          chart's anchored notes are a complete record of "what happened during my shift."
        </li>
        <li>
          <strong>Financial trading desks.</strong> A watcher monitors instrument moves; the AI
          annotates breakouts and breakdowns the moment they happen. Traders ask follow-ups without
          leaving the chart.
        </li>
        <li>
          <strong>IoT / industrial telemetry.</strong> Sensor streams from a factory floor. The
          watcher flags pressure drops, vibration anomalies, temperature drift. Each gets a
          timestamped anchored note that becomes the maintenance log.
        </li>
        <li>
          <strong>Live experiments / lab readings.</strong> Researcher running an experiment; the
          watcher flags when readings deviate from expected. The AI's anchored notes become a
          real-time lab notebook.
        </li>
        <li>
          <strong>Live data exploration sessions.</strong> Analyst exploring a new dataset with
          streaming updates (a query that produces results progressively). The AI narrates what it
          sees as the data arrives.
        </li>
      </ul>

      <h2 id="production">Production considerations</h2>
      <p>The demo cuts corners for clarity. Real deployment needs to handle:</p>
      <ul>
        <li>
          <strong>
            Use <code>RealtimeLineChart</code>.
          </strong>{" "}
          The demo uses plain LineChart with state-managed buffer because it's easier to read. In
          production, swap in Semiotic's RealtimeLineChart — it has an imperative push API that
          bypasses React re-renders, supports decay encoding, and handles particles. 30+ Hz streams
          are comfortable.
        </li>
        <li>
          <strong>Debounce the LLM call.</strong> The demo's <code>announce()</code> happens
          synchronously when the detector fires — the "note" is canned. In production, calling the
          LLM inside the detector loop will blow your budget. The right pattern: announce
          immediately with a placeholder note ("detected, analyzing…"), then call the LLM
          asynchronously, then update the annotation's note when the response lands.
        </li>
        <li>
          <strong>Rate-limit announcements.</strong> A cascading-failure incident can fire the
          detector dozens of times in seconds. The demo debounces by 5 ticks; production needs
          adaptive backoff (collapse repeat announcements into "10 spikes in 30s").
        </li>
        <li>
          <strong>Sliding-window annotation lifecycle.</strong> When the chart's data window slides,
          annotations referencing data that's been evicted should either age out or migrate to a
          separate "recent events" panel. The demo lets them slide off — fine for monitoring, wrong
          for a forensic timeline.
        </li>
        <li>
          <strong>Persist the conversation.</strong> The transcript is in-memory. If the oncall
          handoff is the use case, write it to durable storage. Semiotic doesn't ship that path;
          bring your own.
        </li>
      </ul>

      <h2 id="failure-modes">Failure modes worth thinking about</h2>
      <ul>
        <li>
          <strong>The watcher cries wolf.</strong> A misconfigured detector floods the transcript
          with non-events. Users learn to ignore announcements. The fix is upstream — tighter
          detectors, multi-signal confirmation — not "make the AI better at phrasing the false
          alarms."
        </li>
        <li>
          <strong>The watcher misses real events.</strong> A z-score detector misses gradual drift.
          The transcript looks calm while the underlying system is slowly burning down. Pair it with
          longer-window detectors and absolute thresholds.
        </li>
        <li>
          <strong>The AI hallucinates causes.</strong> The watcher detected the spike; the LLM is
          guessing what caused it. Make the AI's note explicitly tentative ("likely candidates: …")
          and surface links to actual evidence (logs, traces) when available. Never let the AI claim
          certainty it doesn't have.
        </li>
        <li>
          <strong>Operator desensitization.</strong> Anything blinking and announcing constantly
          gets tuned out. The watcher should be quiet most of the time. Better to flag fewer real
          events than many maybe-events.
        </li>
      </ul>

      <h2 id="why-semiotic">Why this is hard to build outside Semiotic</h2>
      <p>The pattern requires three things that other chart libraries don't put together:</p>
      <ol>
        <li>
          <strong>A streaming chart runtime</strong> that handles incremental data without
          re-mounting (Semiotic's push API + decay).
        </li>
        <li>
          <strong>An interrogation surface</strong> that accepts proactive AI input, not just user
          queries (the <code>announce()</code> method).
        </li>
        <li>
          <strong>An annotation model</strong> where AI-generated annotations are first-class
          (callouts, thresholds, bands all work the same whether the human or the AI added them).
        </li>
      </ol>
      <p>
        Other libraries can be made to do this with enough custom plumbing — but only because they
        treat each of the three concerns as out-of-scope. With Semiotic, all three are in-scope,
        individually testable, and composable. The streaming-first runtime is the load-bearing
        piece; everything else assembles around it.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/intelligence/interrogation">Interrogation</Link> — the{" "}
          <code>useChartInterrogation</code> hook, with the <code>announce()</code> method added in
          this release.
        </li>
        <li>
          <Link to="/blog/anchored-conversations">Anchored conversations</Link> — the user-side
          counterpart: point-of-focus + annotation-as-response.
        </li>
        <li>
          <Link to="/blog/multimodal-response">Multimodal response: chart as output channel</Link> —
          the broader frame this fits into.
        </li>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> — the production chart for
          streaming. Drop-in replacement for the demo's static buffer.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "live-conversational-dashboard",
  title: "Live conversational dashboards",
  subtitle:
    "Streaming data + an AI watching alongside you + anchored annotations + a conversational follow-up surface. The class of product Semiotic's streaming-first runtime makes possible.",
  author: "Elijah Meeks",
  date: "2026-07-02",
  tags: ["case-study", "realtime"],
  excerpt:
    "Static dashboards show the past; chat-with-chart makes the past interrogable. Live conversational dashboards add what's missing: an AI watching the stream as it arrives, narrating events anchored to the chart, with a chat surface for human follow-ups. A case study on composing Semiotic's streaming runtime, interrogation hook, and annotation model into a single product.",
  component: Body,
}
