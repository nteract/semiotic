import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  disableConversationArc,
  enableConversationArc,
  getConversationArcStore,
  withProvenance,
} from "semiotic/ai"
import { CategoryColorProvider, DotPlot, LineChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Live event log driven by the actual ConversationArcStore ─────────

const EVENT_PRESETS = [
  {
    type: "suggestion-shown",
    label: "Show suggestions",
    payload: () => ({
      type: "suggestion-shown",
      intent: "trend",
      components: ["LineChart", "AreaChart", "Scatterplot"],
      topScore: 4.6,
    }),
  },
  {
    type: "suggestion-chosen",
    label: "Pick LineChart",
    payload: () => ({
      type: "suggestion-chosen",
      component: "LineChart",
      rank: 1,
      source: "user",
    }),
  },
  {
    type: "audience-set",
    label: "Switch audience",
    payload: () => ({
      type: "audience-set",
      audience: "executive",
      previous: "analyst",
    }),
  },
  {
    type: "chart-rendered",
    label: "Render chart",
    payload: () => ({
      type: "chart-rendered",
      component: "LineChart",
      chartId: "demo-1",
    }),
  },
  {
    type: "chart-edited",
    label: "Edit props",
    payload: () => ({
      type: "chart-edited",
      component: "LineChart",
      chartId: "demo-1",
      changedProps: ["lineWidth", "colorScheme"],
    }),
  },
  {
    type: "chart-replaced",
    label: "Replace via repair",
    payload: () => ({
      type: "chart-replaced",
      from: "LineChart",
      to: "StackedAreaChart",
      reason: "repair",
    }),
  },
  {
    type: "chart-exported",
    label: "Export JSX",
    payload: () => ({
      type: "chart-exported",
      component: "StackedAreaChart",
      format: "jsx",
    }),
  },
  {
    type: "chart-abandoned",
    label: "Abandon",
    payload: () => ({
      type: "chart-abandoned",
      component: "StackedAreaChart",
      reason: "user-walked-away",
    }),
  },
]

const TYPE_COLORS = {
  "suggestion-shown": "var(--semiotic-info, #3a8eff)",
  "suggestion-chosen": "var(--semiotic-info, #3a8eff)",
  "audience-set": "var(--semiotic-warning, #d49a00)",
  "chart-rendered": "var(--semiotic-success, #2d8a4a)",
  "chart-edited": "var(--semiotic-success, #2d8a4a)",
  "chart-replaced": "var(--semiotic-warning, #d49a00)",
  "chart-exported": "var(--semiotic-secondary, #6a52d9)",
  "chart-abandoned": "var(--semiotic-danger, #c43d3d)",
}

// Same palette as the button borders, but using the hex fallbacks
// directly so the CategoryColorProvider hands canvas-renderable strings
// to the DotPlot instead of unresolved `var(...)` references.
const TYPE_COLORS_HEX = {
  "suggestion-shown": "#3a8eff",
  "suggestion-chosen": "#3a8eff",
  "audience-set": "#d49a00",
  "chart-rendered": "#2d8a4a",
  "chart-edited": "#2d8a4a",
  "chart-replaced": "#d49a00",
  "chart-exported": "#6a52d9",
  "chart-abandoned": "#c43d3d",
}

// Categories on the y-axis appear in the order the first event of
// each type arrives. That's `sort: "auto"`'s streaming behavior on
// DotPlot — honest with the "watch the arc unfold" framing.
const timeFormat = (ms) => {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function ArcDemo() {
  const store = useMemo(() => getConversationArcStore(), [])
  const chartRef = useRef(null)
  const dotIdRef = useRef(0)
  const [enabled, setEnabled] = useState(store.enabled)
  const [events, setEvents] = useState(() => store.getEvents())
  const [sessionId, setSessionId] = useState(store.sessionId)

  useEffect(() => {
    const unsubscribe = store.subscribe((event) => {
      setEvents(store.getEvents())
      setSessionId(store.sessionId)
      // Mirror the same event into the DotPlot via its push API.
      // Stable ID per dot so the chart can update/remove individuals
      // later if we ever want to.
      chartRef.current?.push({
        id: ++dotIdRef.current,
        type: event.type,
        time: event.timestamp,
      })
    })
    return unsubscribe
  }, [store])

  // Clean up on unmount so navigating away doesn't leave recording on
  // for other consumers. Intentionally not `reset()` — that would wipe
  // listeners other parts of the app sharing the same store may have
  // attached.
  useEffect(() => () => {
    disableConversationArc()
    store.clear()
  }, [store])

  const toggle = () => {
    if (enabled) {
      disableConversationArc()
    } else {
      enableConversationArc({ capacity: 50, sessionId: "docs-demo" })
    }
    setEnabled(getConversationArcStore().enabled)
    setSessionId(getConversationArcStore().sessionId)
  }

  const fire = (preset) => {
    store.record(preset.payload())
  }

  const clear = () => {
    store.clear()
    chartRef.current?.clear()
    dotIdRef.current = 0
    setEvents([])
  }

  return (
    <div style={{
      border: "1px solid var(--surface-3)",
      borderRadius: 12,
      padding: 20,
      background: "var(--surface-1)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={toggle}
          style={{
            padding: "6px 14px",
            borderRadius: 14,
            background: enabled ? "var(--semiotic-success, #2d8a4a)" : "var(--accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {enabled ? "Recording — disable" : "Enable recording"}
        </button>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          session: <code>{sessionId || "—"}</code>
        </span>
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={clear}
          disabled={!events.length}
          style={{
            padding: "4px 10px",
            borderRadius: 12,
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--surface-3)",
            cursor: events.length ? "pointer" : "default",
            fontSize: 12,
            opacity: events.length ? 1 : 0.5,
          }}
        >
          Clear
        </button>
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        paddingBottom: 8,
        borderBottom: "1px dashed var(--surface-3)",
      }}>
        {EVENT_PRESETS.map((preset) => (
          <button
            key={preset.type}
            onClick={() => fire(preset)}
            disabled={!enabled}
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              border: `1px solid ${TYPE_COLORS[preset.type]}`,
              background: "transparent",
              color: TYPE_COLORS[preset.type],
              fontSize: 12,
              cursor: enabled ? "pointer" : "default",
              opacity: enabled ? 1 : 0.4,
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <CategoryColorProvider colors={TYPE_COLORS_HEX}>
        <DotPlot
          ref={chartRef}
          categoryAccessor="type"
          valueAccessor="time"
          dataIdAccessor="id"
          colorBy="type"
          orientation="horizontal"
          dotRadius={6}
          valueFormat={timeFormat}
          height={260}
          margin={{ left: 130, right: 24, top: 12, bottom: 36 }}
          showLegend={false}
          title="Events over time"
          summary="Horizontal dot plot. Each dot is a recorded conversation-arc event placed at its timestamp on the x-axis and its event type on the y-axis. Colors match the event-type buttons above."
          emptyContent={
            <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
              {enabled
                ? "Click an event button above — dots will arrive via the DotPlot push API."
                : "Enable recording, then click an event button to drop dots onto the chart."}
            </div>
          }
        />
      </CategoryColorProvider>

      <div style={{
        maxHeight: 220,
        overflowY: "auto",
        background: "var(--surface-2)",
        padding: 10,
        borderRadius: 8,
        fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
        fontSize: 12,
      }}>
        {events.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            {enabled
              ? "No events yet. Click a button above to record one."
              : "Recording is off. Click ‘Enable recording’ to start a session."}
          </div>
        )}
        {events.slice().reverse().map((event, i) => (
          <div
            key={`${event.timestamp}-${i}`}
            style={{
              display: "flex",
              gap: 8,
              padding: "4px 0",
              borderBottom: "1px dotted var(--surface-3)",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span
              style={{
                color: TYPE_COLORS[event.type],
                fontWeight: 600,
                minWidth: 150,
              }}
            >
              {event.type}
            </span>
            <span style={{ color: "var(--text)" }}>
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(event).filter(
                    ([k]) => k !== "type" && k !== "timestamp" && k !== "sessionId"
                  )
                )
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Annotation provenance demo: simple freshness scrubber ────────────

const ANNOTATIONS = [
  withProvenance(
    {
      type: "callout",
      x: 3,
      y: 280,
      dx: 30,
      dy: -40,
      note: { label: "Spike from launch", title: "Q3" },
    },
    {
      provenance: {
        author: "alice",
        source: "user",
        createdAt: "2026-02-15T12:00:00Z",
      },
      lifecycle: { ttlHint: "P30D", anchor: "semantic" },
    }
  ),
  withProvenance(
    {
      type: "callout",
      x: 7,
      y: 410,
      dx: -30,
      dy: -50,
      note: { label: "AI tag (low conf.)", title: "Anomaly" },
    },
    {
      provenance: {
        author: "model-v3",
        source: "ai",
        confidence: 0.62,
        createdAt: "2026-03-10T09:00:00Z",
      },
      lifecycle: { ttlHint: "P14D", anchor: "fixed" },
    }
  ),
]

// Stand-in for the M2 `computeAnnotationFreshness` helper. The page-level
// scrubber re-runs this on each "now" change so readers see annotations
// drift through fresh → aging → stale → expired.
function computeFreshnessPreview(ann, nowMs) {
  const created = ann?.provenance?.createdAt ? Date.parse(ann.provenance.createdAt) : null
  const ttl = ann?.lifecycle?.ttlHint
  if (created == null || ttl == null) return "fresh"
  const ms = typeof ttl === "number" ? ttl : parseIsoDuration(ttl)
  const age = nowMs - created
  if (age < ms) return "fresh"
  if (age < ms * 1.5) return "aging"
  if (age < ms * 3) return "stale"
  return "expired"
}

function parseIsoDuration(s) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/.exec(s)
  if (!m) return 0
  const days = parseInt(m[1] || "0", 10)
  const hours = parseInt(m[2] || "0", 10)
  return ((days * 24 + hours) * 60 * 60 * 1000)
}

const STYLE_BY_FRESHNESS = {
  fresh: { opacity: 1, strokeDasharray: undefined },
  aging: { opacity: 0.6, strokeDasharray: undefined },
  stale: { opacity: 0.45, strokeDasharray: "4 4" },
  expired: { opacity: 0.2, strokeDasharray: "2 4" },
}

const SAMPLE_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  value: 250 + Math.sin(i * 0.7) * 80 + i * 12,
}))

function FreshnessDemo() {
  const [nowIso, setNowIso] = useState("2026-04-01T00:00:00Z")
  const nowMs = Date.parse(nowIso)
  const annotated = ANNOTATIONS.map((a) => {
    const freshness = computeFreshnessPreview(a, nowMs)
    return {
      ...a,
      lifecycle: { ...a.lifecycle, freshness },
      ...STYLE_BY_FRESHNESS[freshness],
    }
  })

  return (
    <div style={{
      border: "1px solid var(--surface-3)",
      borderRadius: 12,
      padding: 20,
      background: "var(--surface-1)",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <LineChart
        data={SAMPLE_DATA}
        xAccessor="month"
        yAccessor="value"
        title="Annotations as their lifecycle scrubs"
        height={260}
        showPoints
        annotations={annotated}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Pretend "now" is: <code>{nowIso.slice(0, 10)}</code>
        </label>
        <input
          type="range"
          min={Date.parse("2026-02-15T00:00:00Z")}
          max={Date.parse("2026-07-01T00:00:00Z")}
          step={86_400_000}
          value={nowMs}
          onChange={(e) => setNowIso(new Date(parseInt(e.target.value, 10)).toISOString())}
        />
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {annotated.map((a) => (
            <span key={a.note.title} style={{ marginRight: 14 }}>
              <strong>{a.note.title}</strong>: {a.lifecycle.freshness}
            </span>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
        The freshness calculation in this demo is a stand-in. The shipping
        helper, <code>computeAnnotationFreshness</code>, lands in M2. The
        annotation data itself uses the M1 provenance + lifecycle blocks
        verbatim.
      </p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────

export default function ConversationArcPage() {
  return (
    <PageLayout
      title="Conversation Arc"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence" },
        { label: "Conversation Arc", path: "/intelligence/conversation-arc" },
      ]}
      prevPage={{ title: "Interrogation", path: "/intelligence/interrogation" }}
      nextPage={{ title: "Serialization", path: "/intelligence/serialization" }}
    >
      <p>
        AI-assisted chart authoring is a session, not a one-shot call. Users
        see suggestions, pick one, refine the audience, render, edit, replace,
        export — or abandon. Semiotic gives that arc structure with three
        composable surfaces that ship together in 3.5.x:
      </p>
      <ul>
        <li><strong>Conversation-arc telemetry</strong> — an opt-in event store recording the arc itself.</li>
        <li><strong>Annotation provenance + lifecycle</strong> — every annotation can carry origin, confidence, and freshness.</li>
        <li><strong>Variant discovery</strong> — an interface for proposing chart variants outside the hand-curated capability registry.</li>
      </ul>
      <p>
        These are the talk-readiness M1 deliverables in the roadmap. M2–M4
        will fill in heuristic implementations and runtime helpers. The
        type surface lands today.
      </p>

      <h2>Conversation-arc telemetry</h2>
      <p>
        <code>enableConversationArc()</code> turns on a module-scoped ring
        buffer that records the arc of an AI-assisted session. Default
        surface is a no-op so the import is zero-cost when telemetry is off.
      </p>

      <h3>Interactive demo</h3>
      <p>
        Enable recording, fire some events, and watch the live store. Each
        click below calls <code>store.record(...)</code>. The event log is
        driven by a real subscriber on the real store — not a re-render of
        local state.
      </p>
      <ArcDemo />

      <h3>Wiring</h3>
      <CodeBlock language="jsx">
{`import {
  enableConversationArc,
  disableConversationArc,
  getConversationArcStore,
} from "semiotic/ai"

enableConversationArc({ capacity: 1000, sessionId: "session-abc" })

const store = getConversationArcStore()
const unsubscribe = store.subscribe((event) => {
  // Send to your sink — analytics, IndexedDB, replay file.
  console.log(event.type, event)
})

store.record({
  type: "suggestion-shown",
  components: ["LineChart", "AreaChart"],
  intent: "trend",
})
store.record({
  type: "suggestion-chosen",
  component: "LineChart",
  rank: 1,
  source: "user",
})

// Talk-time: flush the buffer to a recorded fixture for replay.
const allEvents = store.flush()`}
      </CodeBlock>

      <h3>Event vocabulary</h3>
      <p>
        Eight variants in a discriminated union: <code>suggestion-shown</code>,{" "}
        <code>suggestion-chosen</code>, <code>audience-set</code>,{" "}
        <code>chart-rendered</code>, <code>chart-edited</code>,{" "}
        <code>chart-replaced</code>, <code>chart-exported</code>,{" "}
        <code>chart-abandoned</code>. Each carries the fields a downstream
        analytics or replay system would actually consume (component name,
        rank, format, reason). The <code>arcId</code> field threads multiple
        events into a single named arc when you need it.
      </p>

      <h2>Annotation provenance + lifecycle</h2>
      <p>
        Anchored conversations stay defensible when every annotation knows
        where it came from and when it should be considered stale. The
        M1 surface attaches two optional blocks to any annotation:{" "}
        <code>provenance</code> ({" "}
        <code>author</code>, <code>source</code>, <code>confidence</code>,{" "}
        <code>createdAt</code>, <code>stableId</code>) and{" "}
        <code>lifecycle</code> (<code>freshness</code>, <code>ttlHint</code>,{" "}
        <code>anchor</code>).
      </p>

      <h3>Lifecycle scrubber</h3>
      <p>
        The chart below carries two annotations — one from a user with a
        30-day TTL, one from an AI with a 14-day TTL and lower confidence.
        Drag the slider to advance "now" and watch them drift through{" "}
        <code>fresh → aging → stale → expired</code>:
      </p>
      <FreshnessDemo />

      <h3>Attaching provenance</h3>
      <CodeBlock language="ts">
{`import { withProvenance } from "semiotic/ai"

const ann = withProvenance(
  { type: "y-threshold", value: 100, label: "SLA breach" },
  {
    provenance: {
      author: "alice",
      source: "user",
      createdAt: "2026-05-20T14:00:00Z",
      stableId: "annot-sla-2026q2",
    },
    lifecycle: { ttlHint: "P30D", anchor: "semantic" },
  },
)`}
      </CodeBlock>

      <p>
        The anchor mode matters when data refreshes. <code>"fixed"</code>{" "}
        keeps the recorded coordinate verbatim; <code>"latest"</code>{" "}
        re-pins to the most recent data point; <code>"sticky"</code>{" "}
        rides forward until removed (the existing streaming behavior);{" "}
        <code>"semantic"</code> re-resolves via <code>stableId</code> when
        new data arrives — that's the M3 anchor-resolution algorithm.
      </p>

      <h2>Variant discovery</h2>
      <p>
        Hand-curated <code>capability.variants</code> are bounded by what
        humans wrote. Variant discovery is the API surface for proposing
        configurations the registry doesn't include — from heuristic
        walkers, LLM agents, or future ML models — and scoring them with
        the same rubric the built-in suggester uses.
      </p>

      <CodeBlock language="ts">
{`import {
  proposeVariant,
  evaluateVariantProposal,
  registerVariantDiscovery,
  type VariantProposal,
} from "semiotic/ai"

// A bespoke discovery function: propose a streamgraph when the user
// chose a multi-series area but their audience profile rewards trend
// over part-to-whole.
registerVariantDiscovery((component, capability, context) => {
  if (component !== "StackedAreaChart") return []
  if (context.audience?.targets?.["trend"] === undefined) return []
  return [
    {
      id: "StackedAreaChart:streamgraph",
      baseComponent: "StackedAreaChart",
      intentDeltas: { trend: 1, "part-to-whole": -1 },
      buildProps: (profile) => ({
        baseline: "wiggle",
        stackOrder: "insideOut",
      }),
      rationale: "Streamgraph reveals the trend better for this audience.",
      source: "heuristic",
    },
  ]
})

const proposals = proposeVariant("StackedAreaChart", capability, ctx)
const scores = proposals.map((p) => evaluateVariantProposal(p, profile))`}
      </CodeBlock>

      <p>
        At M1, <code>proposeVariant</code> and{" "}
        <code>evaluateVariantProposal</code> are stubs — they return empty
        proposals and a neutral baseline score. The point is the contract:{" "}
        <code>VariantProposal</code> and <code>VariantScore</code> are
        stable shapes consumers can wire end-to-end today. Heuristic
        proposal lands in M2; scoring + the MCP{" "}
        <code>proposeChartVariants</code> tool land in M3.
      </p>

      <h2>Why these three together</h2>
      <p>
        The arc records what happened. The annotations preserve what the
        user said about it. Variant discovery keeps the system honest about
        what it doesn't yet know — and where the learning slots in.
      </p>
      <p>
        See <code>docs/strategy/roadmap.md</code> (Talk Readiness Track)
        for the full M1→M4 sequencing.
      </p>
    </PageLayout>
  )
}
