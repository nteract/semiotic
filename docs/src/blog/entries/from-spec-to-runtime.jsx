/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  analystPersona,
  dataScientistPersona,
  enableConversationArc,
  executivePersona,
  recordAudienceChange,
  useChartSuggestions,
  useConversationArc,
} from "semiotic/ai"

// Entry metadata defined at top so the sync check (which scans the
// file as raw source for the first `title:` / `author:` literals)
// reads the canonical strings before any UI-string literals that
// happen to use the same keys.
const META = {
  slug: "from-spec-to-runtime",
  title: "From spec to runtime",
  subtitle:
    "Annotations that actually age, a conversation-arc hook with auto-instrumentation, and a shared classifier that ties the three age-as-encoding systems together.",
  author: "Elijah Meeks",
  date: "2026-06-26",
  tags: ["case-study", "ai", "roadmap"],
  excerpt:
    "applyAnnotationLifecycle as a one-line opacity-and-dashing pass, useConversationArc as the React entry point, auto-instrumentation on the existing AI hooks so an arc captures itself, and the shared bandFromAge primitive that lets decay, staleness, and freshness compose instead of competing.",
}

// ─── Shared chrome ─────────────────────────────────────────────────────────

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

// ─── Auto-instrument demo ─────────────────────────────────────────────────

const TYPE_COLOR = {
  "suggestion-shown": "#3a8eff",
  "suggestion-chosen": "#3a8eff",
  "audience-set": "#d49a00",
  "chart-rendered": "#2d8a4a",
  "chart-edited": "#2d8a4a",
  "chart-replaced": "#d49a00",
  "chart-exported": "#6a52d9",
  "chart-abandoned": "#c43d3d",
  "interrogation-asked": "#7a52d9",
  "interrogation-answered": "#7a52d9",
}

const QUARTERLY_REVENUE = [
  { region: "North", quarter: "Q1 2025", revenue: 1200 },
  { region: "North", quarter: "Q2 2025", revenue: 1450 },
  { region: "North", quarter: "Q3 2025", revenue: 1820 },
  { region: "North", quarter: "Q4 2025", revenue: 2010 },
  { region: "South", quarter: "Q1 2025", revenue: 980 },
  { region: "South", quarter: "Q2 2025", revenue: 1100 },
  { region: "South", quarter: "Q3 2025", revenue: 1330 },
  { region: "South", quarter: "Q4 2025", revenue: 1520 },
  { region: "East", quarter: "Q1 2025", revenue: 720 },
  { region: "East", quarter: "Q2 2025", revenue: 880 },
  { region: "East", quarter: "Q3 2025", revenue: 1050 },
  { region: "East", quarter: "Q4 2025", revenue: 1240 },
]

const INTENTS = [
  { id: "trend", label: "Trend" },
  { id: "compare-categories", label: "Compare" },
  { id: "distribution", label: "Distribution" },
  { id: "rank", label: "Rank" },
]

const AUDIENCES = [
  { id: "none", label: "(no audience)", profile: undefined },
  { id: "exec", label: "Executive", profile: executivePersona },
  { id: "analyst", label: "Analyst", profile: analystPersona },
  { id: "ds", label: "Data scientist", profile: dataScientistPersona },
]

function AutoInstrumentDemo() {
  // Force-enable the arc store with a stable session id so a reader
  // arriving at this post sees events from the moment the component
  // mounts. The hook handles subscription teardown on unmount.
  useEffect(() => {
    enableConversationArc({ sessionId: "blog-runtime", capacity: 40 })
  }, [])

  const [intentId, setIntentId] = useState("trend")
  const [audienceId, setAudienceId] = useState("none")
  const audience = AUDIENCES.find((a) => a.id === audienceId)?.profile

  const { suggestions } = useChartSuggestions(QUARTERLY_REVENUE, {
    intent: intentId,
    audience,
    maxResults: 4,
  })

  const { history, summary } = useConversationArc({ enableOnMount: false })

  const recent = history.slice(-7).reverse()

  const setAudience = (next) => {
    if (next === audienceId) return
    const nextProfile = AUDIENCES.find((a) => a.id === next)
    const prevProfile = AUDIENCES.find((a) => a.id === audienceId)
    recordAudienceChange(
      nextProfile?.label ?? next,
      prevProfile?.id === "none" ? null : (prevProfile?.label ?? null),
    )
    setAudienceId(next)
  }

  return (
    <div style={card}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ButtonRow
            label="Intent"
            options={INTENTS}
            valueId={intentId}
            onChange={setIntentId}
            accent="var(--accent)"
          />
          <ButtonRow
            label="Audience picker (recordAudienceChange)"
            options={AUDIENCES}
            valueId={audienceId}
            onChange={setAudience}
            accent="#d49a00"
          />
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: "var(--surface-2)",
              fontSize: 13,
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}
            >
              Top suggestion
            </div>
            {suggestions[0] ? (
              <>
                <code style={{ fontSize: 14, fontWeight: 600 }}>{suggestions[0].component}</code>
                <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>
                  score {suggestions[0].score.toFixed(1)}
                </span>
                {suggestions.length > 1 && (
                  <div style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 12 }}>
                    also:{" "}
                    {suggestions
                      .slice(1, 4)
                      .map((s) => s.component)
                      .join(", ")}
                  </div>
                )}
              </>
            ) : (
              <em style={{ color: "var(--text-secondary)" }}>No fits for this intent.</em>
            )}
          </div>
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 11,
              background: "var(--surface-3)",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            {summary.total} events buffered · {summary.byType["suggestion-shown"] ?? 0} suggestions
            · {summary.byType["audience-set"] ?? 0} audience changes
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Latest arc events (no record() calls in this component)
          </div>
          <div
            style={{
              background: "var(--surface-2)",
              padding: 10,
              borderRadius: 8,
              fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
              fontSize: 11,
              minHeight: 220,
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {recent.length === 0 ? (
              <em style={{ color: "var(--text-secondary)" }}>
                Change intent or audience to fire events.
              </em>
            ) : (
              recent.map((event, i) => (
                <div
                  key={`${event.timestamp}-${i}`}
                  style={{
                    padding: "3px 0",
                    borderBottom: "1px dotted var(--surface-3)",
                  }}
                >
                  <div style={{ color: TYPE_COLOR[event.type], fontWeight: 600 }}>{event.type}</div>
                  <div style={{ color: "var(--text-secondary)", paddingLeft: 8 }}>
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(event).filter(
                          ([k]) => !["type", "timestamp", "sessionId"].includes(k),
                        ),
                      ),
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ButtonRow({ label, options, valueId, onChange, accent }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              border: `1px solid ${id === valueId ? accent : "var(--surface-3)"}`,
              background: id === valueId ? accent : "transparent",
              color: id === valueId ? "white" : "var(--text)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Body ─────────────────────────────────────────────────────────────────

function Body() {
  return (
    <article style={{ lineHeight: 1.65 }}>
      <p>
        <Link to="/blog/talk-track-intelligence">The previous post</Link> introduced three AI-facing
        surfaces — conversation-arc telemetry, annotation provenance + lifecycle, variant discovery
        — as M1 deliverables. M1 was the spec: types, contracts, stub implementations you could wire
        end-to-end but whose behavior was still mostly text.
      </p>

      <p>
        This post is what shipped between then and now to make them real. The headline change isn't
        one feature; it's that the three surfaces now feel like one system instead of three
        scaffolds that happen to live in the same subpath.
      </p>

      <h2>The annotations age</h2>

      <p>
        The lifecycle surface ships <code style={inlineCode}>computeAnnotationFreshness</code> and{" "}
        <code style={inlineCode}>applyAnnotationLifecycle</code> as runnable code. Pass an array of
        annotations plus a "now" reference (or a chart's data extent, for streaming) and the helper
        classifies each into a band, applies a default visual treatment, and filters expired
        entries:
      </p>

      <pre
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >{`import { applyAnnotationLifecycle, withCurrentProvenance } from "semiotic/ai"

const ann = withCurrentProvenance(
  { type: "callout", t: latest.t, value: latest.value, label: "Spike", lifecycle: { ttlHint: 3000 } },
  { author: "alice", source: "user" }
)

<LineChart
  data={streaming}
  xAccessor="t"
  yAccessor="value"
  annotations={applyAnnotationLifecycle([ann], {
    dataExtent: [streaming[0].t, streaming.at(-1).t],
  })}
/>`}</pre>

      <p>
        The default treatment is opinionated: <code style={inlineCode}>aging</code> dims to 0.55
        opacity, <code style={inlineCode}>stale</code> drops to 0.35 and adds a dashed border via{" "}
        <code style={inlineCode}>strokeDasharray="4 4"</code> (the renderer now honors the attribute
        and cascades it through the annotation's stroked children), and{" "}
        <code style={inlineCode}>expired</code> is filtered from the array unless{" "}
        <code style={inlineCode}>showExpiredAnnotations: true</code>. Each band's treatment is
        overridable via the options object, with explicit fields on the annotation winning over the
        treatment.
      </p>

      <p>
        See it in action on the{" "}
        <Link to="/intelligence/conversation-arc">/intelligence/conversation-arc</Link> lifecycle
        scrubber, or the streaming variant on{" "}
        <Link to="/intelligence/temporal-lifecycle">/intelligence/temporal-lifecycle</Link> — the
        second one shows a streaming chart where the annotation ages against chart-time (the latest
        data point's timestamp), not wall-clock. Pause the stream and the annotation stops aging.
      </p>

      <h2>The arc reacts</h2>

      <p>
        The conversation-arc store kept its module-scope shape — same record/subscribe/flush API —
        but grew a React hook, <code style={inlineCode}>useConversationArc</code>, that owns
        subscription, snapshot stability, and re-render coordination. The hook returns a live{" "}
        <code style={inlineCode}>history</code> array, a reduced{" "}
        <code style={inlineCode}>summary</code> object (per-type counts, components seen, audiences
        seen, duration), and a stable <code style={inlineCode}>record</code> callback. Two hook
        instances on the same page see the same buffer.
      </p>

      <pre
        style={{
          background: "var(--surface-2)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          overflowX: "auto",
        }}
      >{`function ArcInspector() {
  const { history, summary, record } = useConversationArc()

  return (
    <>
      <header>
        {summary.total} events · {summary.byType["chart-exported"] ?? 0} exports ·
        components: {summary.componentsSeen.join(", ")}
      </header>
      <EventList events={history} />
    </>
  )
}`}</pre>

      <p>
        The more interesting move is one layer up: two of the existing AI hooks now auto-emit arc
        events. <code style={inlineCode}>useChartSuggestions</code> emits{" "}
        <code style={inlineCode}>suggestion-shown</code> whenever the ranked list changes
        (deduplicated by component-list signature so React's strict-mode double-render doesn't
        double-stamp). <code style={inlineCode}>useChartInterrogation</code> emits{" "}
        <code style={inlineCode}>interrogation-asked</code> on <code style={inlineCode}>ask()</code>{" "}
        and <code style={inlineCode}>interrogation-answered</code> on response — with measured{" "}
        <code style={inlineCode}>latencyMs</code> from{" "}
        <code style={inlineCode}>performance.now()</code>.
      </p>

      <p>
        Try it. The demo below renders intent buttons and an audience picker. The component code
        makes <em>no</em> <code style={inlineCode}>record()</code> calls of its own — only{" "}
        <code style={inlineCode}>useChartSuggestions</code> running and{" "}
        <code style={inlineCode}>recordAudienceChange</code> on the picker. Every event in the panel
        on the right came from framework-level instrumentation:
      </p>

      <AutoInstrumentDemo />

      <p>
        The point isn't that auto-instrumentation is novel. The point is that the arc captures
        itself. A consumer who never reads the conversation-arc docs at all still produces a
        recoverable session as soon as they call{" "}
        <code style={inlineCode}>enableConversationArc()</code> — even if their app is just{" "}
        <code style={inlineCode}>useChartSuggestions</code> and a chart. That's the talk's claim
        about "data nobody else is collecting" becoming actually true rather than aspirational.
      </p>

      <h2>Three policies, one classifier</h2>

      <p>
        Semiotic had three "how does this thing look as it ages?" systems already:{" "}
        <code style={inlineCode}>DecayConfig</code> (continuous opacity ramp by buffer position),{" "}
        <code style={inlineCode}>StalenessConfig</code> (binary live/stale by wall-clock idle), and
        now annotation freshness (four named bands by TTL). Three policies on three different time
        axes, all answering the same shape of question.
      </p>

      <p>
        They now share one classifier:{" "}
        <code style={inlineCode}>bandFromAge(ageMs, ttlMs, thresholds?)</code> — a pure function
        exported from both <code style={inlineCode}>semiotic/realtime</code> and{" "}
        <code style={inlineCode}>semiotic/ai</code>. Annotation freshness uses it today; the other
        two systems can opt in when a binary or continuous policy doesn't fit. The shipped default
        thresholds (1× / 1.5× / 3× TTL) live next to the function as{" "}
        <code style={inlineCode}>DEFAULT_LIFECYCLE_THRESHOLDS</code>, so downstream code that needs
        to introspect or override them has one place to read.
      </p>

      <p>
        The same unification round also de-duped <code style={inlineCode}>AnnotationAnchor</code>.
        It used to be defined twice — once in <code style={inlineCode}>realtime/types.ts</code> as{" "}
        <code style={inlineCode}>AnnotationAnchorMode</code>, once in{" "}
        <code style={inlineCode}>ai/annotationProvenance.ts</code> as{" "}
        <code style={inlineCode}>AnnotationAnchor</code>. Same three modes (fixed / latest /
        sticky); the AI side had added a fourth (<code style={inlineCode}>semantic</code>) on top.
        The canonical type now lives in the realtime runtime (next to its{" "}
        <code style={inlineCode}>stickyPositionCache</code> implementation) with the AI surface
        re-exporting and the new <code style={inlineCode}>semantic</code> mode folded in.{" "}
        <code style={inlineCode}>AnnotationAnchorMode</code> is a{" "}
        <code style={inlineCode}>@deprecated</code> alias for the old name.
      </p>

      <p>
        Full survey at{" "}
        <Link to="/intelligence/temporal-lifecycle">/intelligence/temporal-lifecycle</Link> — that
        page also has the interactive band-from-age scrubber and a streaming chart whose annotation
        ages live.
      </p>

      <h2>What's still in the queue</h2>

      <p>
        Variant discovery's M1 ships the type contract and a working registration plug point —{" "}
        <code style={inlineCode}>proposeVariant</code> now dispatches through every registered
        proposer and deduplicates by proposal id. The heuristic reference proposer that walks
        existing variants and flips orientation / toggles <code style={inlineCode}>normalize</code>{" "}
        is still M2 work. Same goes for the variant scorer and the MCP{" "}
        <code style={inlineCode}>proposeChartVariants</code> tool.
      </p>

      <p>
        On the conversation-arc side, the store now has first-party persistence hooks:{" "}
        <code style={inlineCode}>registerConversationArcSink</code>,{" "}
        <code style={inlineCode}>createLocalStorageConversationArcSink</code>,{" "}
        <code style={inlineCode}>createIndexedDBConversationArcSink</code>, and{" "}
        <code style={inlineCode}>createWebhookConversationArcSink</code>. Replay stays separate from
        recording through <code style={inlineCode}>loadConversationArc</code>, so a fixture can
        hydrate the inspector without duplicating analytics events.
      </p>

      <p>
        The annotation side now gives the <code style={inlineCode}>semantic</code> anchor an actual
        resolution algorithm — finding "the Q3 spike" by <code style={inlineCode}>stableId</code>{" "}
        after the data refreshes, then falling back to the recorded coordinate when the target is
        gone. That's the M3 hook into the existing{" "}
        <code style={inlineCode}>annotationResolvers.ts</code> pathway, which is why anchor mode
        dedup mattered for unblocking it.
      </p>

      <h2>What this looks like from the outside</h2>

      <p>
        A consumer that adopts a single line —{" "}
        <code style={inlineCode}>enableConversationArc()</code> at app startup — now gets, for free:
      </p>

      <ul>
        <li>Every chart-suggestion ranking that the library showed.</li>
        <li>Every interrogation round-trip the user did, with measured latency.</li>
        <li>
          Every audience change, if they call <code style={inlineCode}>recordAudienceChange</code>{" "}
          in their picker.
        </li>
        <li>A flushable buffer they can send anywhere.</li>
        <li>
          Annotations on their charts that visibly age over time, with a treatment they didn't have
          to design.
        </li>
      </ul>

      <p>
        That's the surface that wasn't there a month ago. The talk's claim about "library-collected
        session data" stops being a promise and starts being a thing pointed at on the screen.
      </p>
    </article>
  )
}

export default {
  ...META,
  component: Body,
}
