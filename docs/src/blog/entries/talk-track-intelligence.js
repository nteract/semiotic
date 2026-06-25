/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { CategoryColorProvider, DotPlot, LineChart } from "semiotic"
import {
  annotationFreshnessFor,
  applyAnnotationLifecycle,
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
  withProvenance,
} from "semiotic/ai"

// Entry metadata defined up here (not inline on the default export) so
// `scripts/check-blog-entry-sync.mjs` — which reads files as raw source
// and matches the FIRST `title:`/`author:`/etc. literal — sees the
// canonical strings before any provenance.author or note.title that
// appears later in the demo data.
const META = {
  slug: "talk-track-intelligence",
  title: "The arc, the annotation, and the variant",
  subtitle:
    "Three composable AI surfaces: conversation-arc telemetry, annotation provenance + lifecycle, and a variant discovery plug point. Two are runnable inline.",
  author: "Elijah Meeks",
  date: "2026-06-25",
  tags: ["case-study", "ai", "roadmap"],
  excerpt:
    "AI-assisted chart authoring is a session, not a single call. The spine for treating that session as a first-class thing — an event vocabulary for the arc itself, provenance + lifecycle on every annotation, and an extension surface for variant proposers.",
}

// ─── Shared layout chrome (mirrors other blog entries) ────────────────────
const card = {
  background: "var(--surface-1)",
  borderRadius: 10,
  padding: 18,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

const inlineCode = {
  fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
  fontSize: "0.9em",
}

const tag = (color) => ({
  display: "inline-block",
  background: color,
  color: "white",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 999,
  marginRight: 6,
})

// ─── Conversation-arc live demo (driven by the actual store) ──────────────

const PRESET_EVENTS = [
  {
    label: "Show suggestions",
    payload: { type: "suggestion-shown", components: ["LineChart", "AreaChart"], intent: "trend" },
  },
  {
    label: "Pick LineChart",
    payload: { type: "suggestion-chosen", component: "LineChart", rank: 1, source: "user" },
  },
  {
    label: "Switch audience",
    payload: { type: "audience-set", audience: "executive", previous: "analyst" },
  },
  {
    label: "Render",
    payload: { type: "chart-rendered", component: "LineChart", chartId: "arc-demo" },
  },
  {
    label: "Edit props",
    payload: { type: "chart-edited", component: "LineChart", changedProps: ["lineWidth"] },
  },
  {
    label: "Replace via repair",
    payload: { type: "chart-replaced", from: "LineChart", to: "AreaChart", reason: "repair" },
  },
  {
    label: "Export JSX",
    payload: { type: "chart-exported", component: "AreaChart", format: "jsx" },
  },
  { label: "Abandon", payload: { type: "chart-abandoned", reason: "user-walked-away" } },
]

const TYPE_COLOR = {
  "suggestion-shown": "#3a8eff",
  "suggestion-chosen": "#3a8eff",
  "audience-set": "#d49a00",
  "chart-rendered": "#2d8a4a",
  "chart-edited": "#2d8a4a",
  "chart-replaced": "#d49a00",
  "chart-exported": "#6a52d9",
  "chart-abandoned": "#c43d3d",
}

const timeFormat = (ms) => {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function ConversationArcLiveDemo() {
  const store = useMemo(() => getConversationArcStore(), [])
  const chartRef = useRef(null)
  const dotIdRef = useRef(0)
  const [enabled, setEnabled] = useState(store.enabled)
  const [events, setEvents] = useState(() => store.getEvents())

  useEffect(() => {
    return store.subscribe((event) => {
      setEvents(store.getEvents())
      chartRef.current?.push({
        id: ++dotIdRef.current,
        type: event.type,
        time: event.timestamp,
      })
    })
  }, [store])

  useEffect(
    () => () => {
      // Don't `reset()` — that would wipe listeners other parts of the
      // app might have set up. Just stop recording and drop the buffer.
      disableConversationArc()
      store.clear()
    },
    [store],
  )

  const toggle = () => {
    if (enabled) {
      disableConversationArc()
    } else {
      enableConversationArc({ capacity: 50, sessionId: "blog-demo" })
    }
    setEnabled(getConversationArcStore().enabled)
  }

  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={toggle}
          style={{
            background: enabled ? "#2d8a4a" : "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: 14,
            padding: "5px 12px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {enabled ? "Recording — disable" : "Enable"}
        </button>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {events.length} events buffered
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {PRESET_EVENTS.map((p) => (
          <button
            key={p.label}
            onClick={() => store.record(p.payload)}
            disabled={!enabled}
            style={{
              padding: "3px 9px",
              borderRadius: 12,
              border: `1px solid ${TYPE_COLOR[p.payload.type]}`,
              color: TYPE_COLOR[p.payload.type],
              background: "transparent",
              fontSize: 12,
              cursor: enabled ? "pointer" : "default",
              opacity: enabled ? 1 : 0.45,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <CategoryColorProvider colors={TYPE_COLOR}>
        <DotPlot
          ref={chartRef}
          categoryAccessor="type"
          valueAccessor="time"
          dataIdAccessor="id"
          colorBy="type"
          orientation="horizontal"
          dotRadius={6}
          valueFormat={timeFormat}
          height={240}
          margin={{ left: 130, right: 24, top: 8, bottom: 32 }}
          showLegend={false}
          title="Events arriving via the DotPlot push API"
          summary="Horizontal dot plot. Each dot is one recorded arc event; x is the timestamp, y is the event type, color matches the button above."
          emptyContent={
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                padding: "30px 0",
                textAlign: "center",
              }}
            >
              {enabled
                ? "Click an event button — dots arrive via push API."
                : "Enable recording, then click buttons."}
            </div>
          }
        />
      </CategoryColorProvider>

      <div
        style={{
          background: "var(--surface-2)",
          borderRadius: 6,
          padding: 8,
          fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
          fontSize: 12,
          maxHeight: 180,
          overflowY: "auto",
          marginTop: 12,
        }}
      >
        {events.length === 0 ? (
          <em style={{ color: "var(--text-secondary)" }}>
            {enabled ? "Click an event button above." : "Recording is off."}
          </em>
        ) : (
          events
            .slice()
            .reverse()
            .map((e, i) => (
              <div
                key={i}
                style={{ padding: "2px 0", borderBottom: "1px dotted var(--surface-3)" }}
              >
                <span style={{ color: TYPE_COLOR[e.type], fontWeight: 600, marginRight: 8 }}>
                  {e.type}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(e).filter(
                        ([k]) => !["type", "timestamp", "sessionId"].includes(k),
                      ),
                    ),
                  )}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

// ─── Annotation provenance freshness scrubber ─────────────────────────────

// Hand-tuned spikes so annotations sit on visible peaks rather than
// getting lost in noise.
const STALE_DEMO_DATA = [
  { month: 1, value: 280 },
  { month: 2, value: 310 },
  { month: 3, value: 420 }, // alice's spike
  { month: 4, value: 350 },
  { month: 5, value: 360 },
  { month: 6, value: 370 },
  { month: 7, value: 510 }, // AI's anomaly
  { month: 8, value: 390 },
  { month: 9, value: 400 },
  { month: 10, value: 420 },
  { month: 11, value: 450 },
  { month: 12, value: 470 },
]

// Field names match the chart's accessors (`month`/`value`). That's how
// the annotation layer resolves data → screen coordinates.
const RAW_ANNOTATIONS = [
  withProvenance(
    {
      type: "callout",
      id: "alice-spike",
      month: 3,
      value: 420,
      label: "Hand-placed spike",
      note: "Marked when the product launched.",
      dx: 50,
      dy: -45,
    },
    {
      provenance: { author: "alice", source: "user", createdAt: "2026-02-15T12:00:00Z" },
      lifecycle: { ttlHint: "P30D", anchor: "semantic" },
    },
  ),
  withProvenance(
    {
      type: "callout",
      id: "ai-anomaly",
      month: 7,
      value: 510,
      label: "AI anomaly tag",
      note: "Flagged by model-v3 (confidence 0.62).",
      dx: -55,
      dy: -45,
    },
    {
      provenance: {
        author: "model-v3",
        source: "ai",
        confidence: 0.62,
        createdAt: "2026-03-10T09:00:00Z",
      },
      lifecycle: { ttlHint: "P14D", anchor: "fixed" },
    },
  ),
]

const FRESHNESS_BASE_COLOR = { user: "#3a8eff", ai: "#d49a00" }
const FRESHNESS_BADGE = {
  fresh: "#2d8a4a",
  aging: "#d49a00",
  stale: "#a0a0a0",
  expired: "#c43d3d",
}

function FreshnessLiveDemo() {
  const [nowIso, setNowIso] = useState("2026-03-10T00:00:00Z")
  const nowMs = Date.parse(nowIso)

  // Each annotation keeps its author's brand color via `color`. The
  // shipped applyAnnotationLifecycle treatment fills in opacity +
  // strokeDasharray per band and drops expired ones.
  const annotationsWithColor = RAW_ANNOTATIONS.map((a) => ({
    ...a,
    color: FRESHNESS_BASE_COLOR[a.provenance.source] ?? "#5a5a5a",
  }))
  const visible = applyAnnotationLifecycle(annotationsWithColor, {
    now: nowMs,
    labelSuffix: { aging: " · aging", stale: " · stale" },
  })
  const states = RAW_ANNOTATIONS.map((raw) => ({
    raw,
    freshness: annotationFreshnessFor(raw, nowMs),
  }))

  return (
    <div style={card}>
      <LineChart
        data={STALE_DEMO_DATA}
        xAccessor="month"
        yAccessor="value"
        showPoints
        height={300}
        margin={{ top: 28, right: 28, bottom: 36, left: 52 }}
        title='"Now" scrubber: watch annotations age'
        annotations={visible}
      />
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>
          Pretend "now" is <code>{nowIso.slice(0, 10)}</code>
        </label>
        <input
          type="range"
          min={Date.parse("2026-02-15T00:00:00Z")}
          max={Date.parse("2026-08-15T00:00:00Z")}
          step={86_400_000}
          value={nowMs}
          onChange={(e) => setNowIso(new Date(parseInt(e.target.value, 10)).toISOString())}
          style={{ width: "100%" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {states.map(({ raw, freshness }) => {
            const ageDays = Math.max(
              0,
              Math.floor((nowMs - Date.parse(raw.provenance.createdAt)) / (24 * 60 * 60 * 1000)),
            )
            return (
              <div
                key={raw.id}
                style={{
                  background: "var(--surface-3)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 12,
                  opacity: freshness === "expired" ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <strong>{raw.label}</strong>
                  <span
                    style={{
                      background: FRESHNESS_BADGE[freshness],
                      color: "white",
                      padding: "1px 7px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {freshness}
                  </span>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  by <code>{raw.provenance.author}</code>
                  {" · "}
                  {ageDays} day{ageDays === 1 ? "" : "s"} old
                  {" · "}TTL <code>{raw.lifecycle.ttlHint}</code>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Body ─────────────────────────────────────────────────────────────────

function Body() {
  return (
    <article style={{ lineHeight: 1.65 }}>
      <p>
        <span style={tag("#6a52d9")}>draft</span>
      </p>

      <p>
        AI-assisted chart authoring is a session. A user sees a ranked list, picks one, adjusts the
        audience, renders, edits, replaces, exports — or abandons. None of those moves are
        first-class in any visualization library we know of. They live in chat transcripts and
        analytics events, separated from the chart that occasioned them.
      </p>

      <p>
        The spine for treating that session as a thing the library knows about. Three composable
        surfaces, each shipping as a type contract today, with runtime helpers sequenced through the
        rest of the year. This post walks through what each one is, with two of them runnable inline
        below.
      </p>

      <h2>The arc itself</h2>

      <p>
        The first surface is a module-scoped event store with eight variants in a discriminated
        union:
      </p>

      <pre
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >{`type ConversationArcEvent =
  | { type: "suggestion-shown", components, intent?, topScore?, audience? }
  | { type: "suggestion-chosen", component, rank?, source? }
  | { type: "audience-set", audience, previous? }
  | { type: "chart-rendered", component, chartId? }
  | { type: "chart-edited", component, chartId?, changedProps? }
  | { type: "chart-replaced", from, to, reason? }
  | { type: "chart-exported", component, format }
  | { type: "chart-abandoned", component?, reason? }`}</pre>

      <p>
        Default surface is a no-op. <code style={inlineCode}>enableConversationArc()</code> flips
        the store on and starts buffering. The default capacity is 1000; new events evict oldest.
        Subscribers see every event as it lands. There are no network sinks yet — those plug in
        through <code style={inlineCode}>subscribe()</code> for now, with first-party{" "}
        <code style={inlineCode}>LocalStorageSink</code>,{" "}
        <code style={inlineCode}>IndexedDBSink</code>, and{" "}
        <code style={inlineCode}>WebhookSink</code> in the next milestone.
      </p>

      <p>
        Enable it below and click the event buttons. The log is wired to a real subscriber on the
        real store:
      </p>

      <ConversationArcLiveDemo />

      <p>
        Why bother? Because the data nobody else is collecting is the arc itself:{" "}
        <em>
          I saw five charts, picked the second, swapped the audience to "executive," edited two
          props, exported as JSX, and came back the next day to edit it again.
        </em>{" "}
        That's a sequence, not a single event. Capturing it is what makes a serious recommender
        feedback loop possible — not just "did the user click on the suggestion" but "did they keep
        it after using it."
      </p>

      <h2>Anchored notes that know how old they are</h2>

      <p>
        The second surface is two optional blocks on any annotation:{" "}
        <code style={inlineCode}>provenance</code> (author, source, confidence, createdAt, stableId)
        and <code style={inlineCode}>lifecycle</code> (freshness, ttlHint, anchor). Both are
        additive — existing <code style={inlineCode}>annotations</code> arrays keep working.
      </p>

      <p>
        The lifecycle answer is the Q&A backstop: when the data refreshes and the annotation's
        reference point shifts, what happens? The anchor modes spell out the four reasonable
        answers: <code style={inlineCode}>fixed</code> keeps the recorded coordinate,{" "}
        <code style={inlineCode}>latest</code> tracks the most recent point,{" "}
        <code style={inlineCode}>sticky</code> rides along until removed, and{" "}
        <code style={inlineCode}>semantic</code> re-resolves through{" "}
        <code style={inlineCode}>stableId</code> when new data arrives.
      </p>

      <p>
        Freshness handles the orthogonal problem: a stale note shouldn't look as authoritative as a
        fresh one. The chart below has two annotations with different TTLs. Drag "now" forward and
        watch them fade through <code style={inlineCode}>fresh → aging → stale → expired</code>:
      </p>

      <FreshnessLiveDemo />

      <p>
        The styling above is the shipped default: a single call to{" "}
        <code style={inlineCode}>applyAnnotationLifecycle(annotations, {"{ now }"})</code>{" "}
        classifies each annotation, dims aging, dashes stale, and drops expired from the array. The
        author's brand color survives the treatment — provenance stays visible while age signals
        layer on top.
      </p>

      <h2>Variants the library didn't think of</h2>

      <p>
        The third surface is a registration plug point for variant proposers. Today, every chart
        variant in Semiotic was hand-curated in a <code style={inlineCode}>Foo.capability.ts</code>{" "}
        file. That scales to a few dozen variants. It doesn't scale to "given this specific data
        shape and this specific audience, propose a configuration nobody wrote down."
      </p>

      <pre
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >{`import { registerVariantDiscovery } from "semiotic/ai"

registerVariantDiscovery((component, capability, context) => {
  if (component !== "BoxPlot") return []
  if (!context.profile.fields[context.profile.primary.y ?? ""]?.bimodal) return []
  return [
    {
      id: "RidgelinePlot:bimodal",
      baseComponent: "RidgelinePlot",
      intentDeltas: { distribution: 1 },
      buildProps: () => ({ bins: 40, amplitude: 1.8 }),
      rationale: "Distribution is bimodal — Ridgeline reveals the second mode.",
      source: "model",
    },
  ]
})`}</pre>

      <p>
        A proposal mixes into the same ranked list <code style={inlineCode}>suggestCharts</code>{" "}
        produces, scored against the same rubric. The discovery model can be a heuristic, an LLM
        call, a future research artifact — the API doesn't care. The scoring side (
        <code style={inlineCode}>fit</code>, <code style={inlineCode}>novelty</code>,{" "}
        <code style={inlineCode}>risk</code>) lands in M3.
      </p>

      <h2>Why these three together</h2>

      <p>
        The arc records what happened. The annotations preserve what the user said about it. Variant
        discovery keeps the system honest about what it doesn't yet know — and where the learning
        slots in. Together they make a complete AI-assisted authoring session something the library
        has a vocabulary for, not just something the chat transcript happens to mention.
      </p>

      <p>
        For the full type contract, see{" "}
        <Link to="/intelligence/conversation-arc">/intelligence/conversation-arc</Link> in the docs.
        For the milestone sequencing through October, the roadmap and the variant-discovery design
        doc track each surface's M1 → M4 path.
      </p>
    </article>
  )
}

export default {
  ...META,
  component: Body,
}
