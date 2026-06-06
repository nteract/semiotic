import React, { useEffect, useRef, useState } from "react"
import {
  analystPersona,
  applyAnnotationLifecycle,
  annotationFreshnessFor,
  createLocalStorageConversationArcSink,
  dataScientistPersona,
  disableConversationArc,
  enableConversationArc,
  executivePersona,
  loadConversationArc,
  recordAudienceChange,
  registerConversationArcSink,
  summarizeArc,
  useChartSuggestions,
  useConversationArc,
  withProvenance,
} from "semiotic/ai"
import { CategoryColorProvider, DotPlot, LineChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"
import replayFixture from "../../../public/data/conversation-arc-replay.json"

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
  "interrogation-asked": "var(--semiotic-info, #3a8eff)",
  "interrogation-answered": "var(--semiotic-success, #2d8a4a)",
  "nav-node-focused": "var(--semiotic-secondary, #6a52d9)",
  "nav-branch-expanded": "var(--semiotic-secondary, #6a52d9)",
  "annotation-status-changed": "var(--semiotic-danger, #c43d3d)",
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
  "interrogation-asked": "#3a8eff",
  "interrogation-answered": "#2d8a4a",
  "nav-node-focused": "#6a52d9",
  "nav-branch-expanded": "#6a52d9",
  "annotation-status-changed": "#c43d3d",
}

const EVENT_ORDER = [
  ...EVENT_PRESETS.map((p) => p.type),
  "interrogation-asked",
  "interrogation-answered",
  "nav-node-focused",
  "nav-branch-expanded",
  "annotation-status-changed",
]

const PERSISTENCE_STORAGE_KEY = "semiotic-docs:conversation-arc"
const REPLAY_FIXTURE_PATH = "docs/public/data/conversation-arc-replay.json"

// Categories on the y-axis appear in the order the first event of
// each type arrives. That's `sort: "auto"`'s streaming behavior on
// DotPlot — honest with the "watch the arc unfold" framing.
const timeFormat = (ms) => {
  const d = new Date(ms)
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

// ── Live summary panel — same hook, same buffer ──────────────────────

function ArcSummaryPanel({ summary, enabled, label = "Live summary · summarizeArc(history)" }) {
  // Per-type counts in the same color the buttons + dotplot use, so
  // it's obvious which counters correspond to which actions.
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        padding: 10,
        borderRadius: 8,
        background: "var(--surface-2)",
        fontSize: 12,
      }}
    >
      <div>
        <div
          style={{
            color: "var(--text-secondary)",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: 10,
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EVENT_ORDER.map((type) => {
            const count = summary.byType[type] ?? 0
            return (
              <span
                key={type}
                style={{
                  background: count > 0 ? TYPE_COLORS[type] : "transparent",
                  color: count > 0 ? "white" : "var(--text-secondary)",
                  border: count > 0 ? "none" : "1px solid var(--surface-3)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  opacity: enabled || count > 0 ? 1 : 0.4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {type} · <strong>{count}</strong>
              </span>
            )
          })}
        </div>
        {summary.componentsSeen.length > 0 && (
          <div style={{ marginTop: 8, color: "var(--text-secondary)" }}>
            components seen:{" "}
            {summary.componentsSeen.map((c) => (
              <code key={c} style={{ marginRight: 6 }}>
                {c}
              </code>
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", color: "var(--text-secondary)" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{summary.total}</div>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          events
        </div>
        {summary.durationMs > 0 && (
          <div style={{ marginTop: 4 }}>{(summary.durationMs / 1000).toFixed(1)}s span</div>
        )}
      </div>
    </div>
  )
}

function ArcDemo() {
  // The hook owns subscription, re-render coordination, and snapshot
  // stability via useSyncExternalStore. `enableOnMount: false` means
  // this demo's toggle button is what flips THIS hook's intent to
  // record. The underlying store is module-scoped, so AutoInstrumentDemo
  // below also touches it; readers may see `enabled` true on first
  // render if that demo mounted first and called `enableConversationArc()`.
  // That's intentional — the demos share one buffer to demonstrate the
  // module-scope contract.
  const {
    history: events,
    summary,
    enabled,
    sessionId,
    record,
    clear: clearArc,
  } = useConversationArc({ enableOnMount: false })
  const chartRef = useRef(null)
  const dotIdRef = useRef(0)

  // Mirror each new event onto the DotPlot via its push API. The
  // `events` array reference changes on every record, so a length
  // diff is the right gate.
  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (events.length < prevLengthRef.current) {
      // Cleared — reset the chart too.
      chartRef.current?.clear()
      dotIdRef.current = 0
    } else {
      for (let i = prevLengthRef.current; i < events.length; i++) {
        const e = events[i]
        chartRef.current?.push({
          id: ++dotIdRef.current,
          type: e.type,
          time: e.timestamp,
        })
      }
    }
    prevLengthRef.current = events.length
  }, [events])

  // Don't reset() on unmount — that would wipe listeners other parts
  // of the app may have attached. Just stop recording.
  useEffect(
    () => () => {
      disableConversationArc()
    },
    [],
  )

  const toggle = () => {
    if (enabled) {
      disableConversationArc()
    } else {
      enableConversationArc({ capacity: 50, sessionId: "docs-demo" })
    }
  }

  const fire = (preset) => {
    record(preset.payload())
  }

  const clear = () => {
    clearArc()
  }

  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 12,
        padding: 20,
        background: "var(--surface-1)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          paddingBottom: 8,
          borderBottom: "1px dashed var(--surface-3)",
        }}
      >
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
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                padding: "40px 0",
                textAlign: "center",
              }}
            >
              {enabled
                ? "Click an event button above — dots will arrive via the DotPlot push API."
                : "Enable recording, then click an event button to drop dots onto the chart."}
            </div>
          }
        />
      </CategoryColorProvider>

      <ArcSummaryPanel summary={summary} enabled={enabled} />

      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          background: "var(--surface-2)",
          padding: 10,
          borderRadius: 8,
          fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
          fontSize: 12,
        }}
      >
        {events.length === 0 && (
          <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            {enabled
              ? "No events yet. Click a button above to record one."
              : "Recording is off. Click ‘Enable recording’ to start a session."}
          </div>
        )}
        {events
          .slice()
          .reverse()
          .map((event, i) => (
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
                      ([k]) => k !== "type" && k !== "timestamp" && k !== "sessionId",
                    ),
                  ),
                )}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ── Persistence + replay demo ────────────────────────────────────────

function PersistenceReplayDemo() {
  const { history, summary, enabled, sessionId, record } = useConversationArc({
    enableOnMount: false,
  })
  const sinkRef = useRef(null)
  const unregisterRef = useRef(null)
  const [savedEvents, setSavedEvents] = useState([])
  const [fixtureEvents, setFixtureEvents] = useState([])
  const [status, setStatus] = useState("No persistence sink registered yet.")

  useEffect(
    () => () => {
      unregisterRef.current?.()
      unregisterRef.current = null
      sinkRef.current = null
    },
    [],
  )

  const ensureSink = () => {
    if (!sinkRef.current) {
      const sink = createLocalStorageConversationArcSink({
        key: PERSISTENCE_STORAGE_KEY,
        maxEvents: 100,
      })
      sinkRef.current = sink
      unregisterRef.current = registerConversationArcSink(sink)
    }
    return sinkRef.current
  }

  const refreshSaved = () => {
    const sink = ensureSink()
    const loaded = sink.load()
    setSavedEvents(loaded)
    return loaded
  }

  const startPersistence = () => {
    ensureSink()
    enableConversationArc({ capacity: 100, sessionId: "docs-persisted" })
    refreshSaved()
    setStatus("LocalStorageSink registered; new accepted events will persist.")
  }

  const recordSampleArc = () => {
    ensureSink()
    enableConversationArc({ capacity: 100, sessionId: "docs-persisted" })

    const now = Date.now()
    const arcId = `docs-local-${now}`
    const events = [
      {
        type: "suggestion-shown",
        timestamp: now,
        sessionId: "docs-persisted",
        arcId,
        intent: "compare-categories",
        components: ["GroupedBarChart", "BarChart", "DotPlot"],
        topScore: 4.4,
        audience: "analyst",
      },
      {
        type: "suggestion-chosen",
        timestamp: now + 1800,
        sessionId: "docs-persisted",
        arcId,
        component: "GroupedBarChart",
        rank: 1,
        source: "user",
      },
      {
        type: "chart-rendered",
        timestamp: now + 3200,
        sessionId: "docs-persisted",
        arcId,
        component: "GroupedBarChart",
        chartId: "regional-revenue",
      },
      {
        type: "chart-edited",
        timestamp: now + 5400,
        sessionId: "docs-persisted",
        arcId,
        component: "GroupedBarChart",
        chartId: "regional-revenue",
        changedProps: ["annotations", "legend", "summary"],
      },
      {
        type: "chart-exported",
        timestamp: now + 8100,
        sessionId: "docs-persisted",
        arcId,
        component: "GroupedBarChart",
        format: "jsx",
      },
    ]

    events.forEach((event) => record(event))
    const loaded = refreshSaved()
    setStatus(`Recorded ${events.length} events; ${loaded.length} total events persisted locally.`)
  }

  const clearLiveBuffer = () => {
    loadConversationArc([], {
      capacity: 100,
      enabled: false,
      sessionId: sessionId || "docs-persisted",
    })
    setStatus("Live buffer cleared without clearing the localStorage artifact.")
  }

  const replaySaved = () => {
    const loaded = refreshSaved()
    loadConversationArc(loaded, {
      capacity: Math.max(loaded.length, 1),
      enabled: false,
      sessionId: loaded[0]?.sessionId || "docs-replay-local",
    })
    setStatus(`Replayed ${loaded.length} locally persisted events into the live inspector.`)
  }

  const loadFixture = () => {
    const events = replayFixture.map((event) => ({ ...event }))
    setFixtureEvents(events)
    loadConversationArc(events, {
      capacity: Math.max(events.length, 1),
      enabled: false,
      sessionId: events[0]?.sessionId || "docs-replay-fixture",
    })
    setStatus(`Loaded ${events.length} events from ${REPLAY_FIXTURE_PATH}.`)
  }

  const clearPersisted = () => {
    const sink = ensureSink()
    sink.clear()
    setSavedEvents([])
    setFixtureEvents([])
    loadConversationArc([], {
      capacity: 100,
      enabled: false,
      sessionId: sessionId || "docs-persisted",
    })
    setStatus("Persisted localStorage artifact and live buffer cleared.")
  }

  const persistedSummary = summarizeArc(savedEvents)
  const fixtureSummary = summarizeArc(fixtureEvents)
  const previewEvents = history.slice(-7).reverse()

  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 12,
        padding: 20,
        background: "var(--surface-1)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={startPersistence}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "none",
            background: "var(--accent)",
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Register local sink
        </button>
        <button
          onClick={recordSampleArc}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "1px solid var(--semiotic-success, #2d8a4a)",
            background: "transparent",
            color: "var(--semiotic-success, #2d8a4a)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Record persisted arc
        </button>
        <button
          onClick={clearLiveBuffer}
          disabled={!history.length}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "1px solid var(--surface-3)",
            background: "var(--surface-2)",
            color: "var(--text)",
            cursor: history.length ? "pointer" : "default",
            opacity: history.length ? 1 : 0.5,
          }}
        >
          Clear live
        </button>
        <button
          onClick={replaySaved}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "1px solid var(--semiotic-secondary, #6a52d9)",
            background: "transparent",
            color: "var(--semiotic-secondary, #6a52d9)",
            cursor: "pointer",
          }}
        >
          Replay local
        </button>
        <button
          onClick={loadFixture}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "1px solid var(--semiotic-info, #3a8eff)",
            background: "transparent",
            color: "var(--semiotic-info, #3a8eff)",
            cursor: "pointer",
          }}
        >
          Replay fixture
        </button>
        <button
          onClick={clearPersisted}
          style={{
            padding: "6px 12px",
            borderRadius: 14,
            border: "1px solid var(--semiotic-danger, #c43d3d)",
            background: "transparent",
            color: "var(--semiotic-danger, #c43d3d)",
            cursor: "pointer",
          }}
        >
          Clear persisted
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {[
          { label: "live buffer", value: history.length, detail: enabled ? "recording" : "replay" },
          { label: "session", value: sessionId || "none", detail: "active store id" },
          { label: "localStorage", value: savedEvents.length, detail: PERSISTENCE_STORAGE_KEY },
          { label: "fixture", value: fixtureEvents.length, detail: REPLAY_FIXTURE_PATH },
        ].map((metric) => (
          <div
            key={metric.label}
            style={{
              border: "1px solid var(--surface-3)",
              background: "var(--surface-2)",
              borderRadius: 8,
              padding: "10px 12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: 10,
                marginBottom: 4,
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: typeof metric.value === "number" ? 22 : 14,
                color: "var(--text)",
                overflowWrap: "anywhere",
              }}
            >
              {metric.value}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
              {metric.detail}
            </div>
          </div>
        ))}
      </div>

      <ArcSummaryPanel summary={summary} enabled={enabled} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <ArcSummaryPanel
          summary={persistedSummary}
          enabled={savedEvents.length > 0}
          label="Persisted summary · summarizeArc(localStorage)"
        />
        <ArcSummaryPanel
          summary={fixtureSummary}
          enabled={fixtureEvents.length > 0}
          label="Fixture summary · summarizeArc(JSON artifact)"
        />
      </div>

      <div
        style={{
          background: "var(--surface-2)",
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        {status}
      </div>

      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          background: "var(--surface-2)",
          padding: 10,
          borderRadius: 8,
          fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
          fontSize: 12,
        }}
      >
        {previewEvents.length === 0 ? (
          <em style={{ color: "var(--text-secondary)" }}>
            The replayed or recorded arc will appear here.
          </em>
        ) : (
          previewEvents.map((event, i) => (
            <div
              key={`${event.timestamp}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 170px minmax(0, 1fr)",
                gap: 8,
                padding: "4px 0",
                borderBottom: "1px dotted var(--surface-3)",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ color: TYPE_COLORS[event.type] ?? "var(--text)", fontWeight: 600 }}>
                {event.type}
              </span>
              <span style={{ color: "var(--text)", overflowWrap: "anywhere" }}>
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(event).filter(
                      ([k]) => k !== "type" && k !== "timestamp" && k !== "sessionId",
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

// ── Auto-instrumentation demo ────────────────────────────────────────

// Dataset with mixed types — time-series via `quarter`, categorical
// via `region`, numeric via `revenue` — so the suggester returns
// different rankings for different intents and audiences.
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

const INTENT_OPTIONS = [
  { id: "trend", label: "Trend over time" },
  { id: "compare-categories", label: "Compare categories" },
  { id: "distribution", label: "Distribution" },
  { id: "rank", label: "Rank" },
]

const AUDIENCE_OPTIONS = [
  { id: "none", label: "No audience", profile: undefined },
  { id: "executive", label: "Executive", profile: executivePersona },
  { id: "analyst", label: "Analyst", profile: analystPersona },
  { id: "data-scientist", label: "Data scientist", profile: dataScientistPersona },
]

function AutoInstrumentDemo() {
  const [intentId, setIntentId] = useState("trend")
  const [audienceId, setAudienceId] = useState("none")
  const audience = AUDIENCE_OPTIONS.find((a) => a.id === audienceId)?.profile

  // The hook reactively re-runs the suggester whenever intent or
  // audience changes. Each new ranked list emits `suggestion-shown`
  // into the arc store automatically — no record() call in this
  // component.
  const { suggestions } = useChartSuggestions(QUARTERLY_REVENUE, {
    intent: intentId,
    audience,
    maxResults: 4,
  })

  // Auto-enable a session so the demo "just works" out of the box.
  // The same store backs the ArcDemo above — toggling Disable up
  // there will pause this demo's events too.
  const { history } = useConversationArc({ sessionId: "auto-instrument" })

  // Show only the most recent events (any of them — this demo only
  // generates suggestion-shown and audience-set, but other demos
  // sharing the store may add their own).
  const recent = history.slice(-6).reverse()

  const setAudience = (next) => {
    if (next === audienceId) return
    const nextProfile = AUDIENCE_OPTIONS.find((a) => a.id === next)
    const prevProfile = AUDIENCE_OPTIONS.find((a) => a.id === audienceId)
    recordAudienceChange(
      nextProfile?.label ?? next,
      prevProfile?.label === "No audience" ? null : (prevProfile?.label ?? null),
    )
    setAudienceId(next)
  }

  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 12,
        padding: 20,
        background: "var(--surface-1)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Intent
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {INTENT_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setIntentId(id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: `1px solid ${id === intentId ? "var(--accent)" : "var(--surface-3)"}`,
                  background: id === intentId ? "var(--accent)" : "transparent",
                  color: id === intentId ? "white" : "var(--text)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Audience picker (recordAudienceChange)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AUDIENCE_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setAudience(id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: `1px solid ${id === audienceId ? "#d49a00" : "var(--surface-3)"}`,
                  background: id === audienceId ? "#d49a00" : "transparent",
                  color: id === audienceId ? "white" : "var(--text)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: 10,
            background: "var(--surface-2)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: 11,
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
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Latest arc events (auto-fired)
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            padding: 10,
            borderRadius: 8,
            fontFamily: "var(--semiotic-font-family-mono, ui-monospace, monospace)",
            fontSize: 11,
            minHeight: 200,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {recent.length === 0 ? (
            <em style={{ color: "var(--text-secondary)" }}>
              Events will appear here as you change intent or audience.
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
                <div style={{ color: TYPE_COLORS[event.type], fontWeight: 600 }}>{event.type}</div>
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
  )
}

// ── Annotation provenance demo: freshness scrubber ───────────────────

// Two callouts pointing at real data spikes. Annotation fields use the
// chart's accessor names (`month`, `value`) — that's how the annotation
// system resolves screen coordinates from data.
const ANNOTATIONS_RAW = [
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
      provenance: {
        author: "alice",
        source: "user",
        createdAt: "2026-02-15T12:00:00Z",
      },
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

// Per-source brand color flows through `color` on each annotation.
// applyAnnotationLifecycle handles the opacity + dashing per band, so
// freshness fades the annotations toward the page background while
// the author's brand color stays as the identity cue.
const SOURCE_BASE_COLOR = {
  user: "#3a8eff",
  ai: "#d49a00",
}

const FRESHNESS_BADGE_COLOR = {
  fresh: "#2d8a4a",
  aging: "#d49a00",
  stale: "#a0a0a0",
  expired: "#c43d3d",
}

// Hand-tuned data so the spikes the annotations point at are clearly
// visible peaks rather than getting lost in a noisy sine wave.
const SAMPLE_DATA = [
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

const SLIDER_MIN = Date.parse("2026-02-15T00:00:00Z")
const SLIDER_MAX = Date.parse("2026-08-15T00:00:00Z")

function FreshnessDemo() {
  const [nowIso, setNowIso] = useState("2026-03-10T00:00:00Z")
  const nowMs = Date.parse(nowIso)

  // Each annotation keeps its author's brand color via `color`. The
  // freshness treatment fills in opacity + strokeDasharray per band
  // and drops expired ones — same algorithm the library ships.
  const annotationsWithColor = ANNOTATIONS_RAW.map((a) => ({
    ...a,
    color: SOURCE_BASE_COLOR[a.provenance.source] ?? "#5a5a5a",
  }))

  const visibleAnnotations = applyAnnotationLifecycle(annotationsWithColor, {
    now: nowMs,
    labelSuffix: { aging: " · aging", stale: " · stale" },
  })

  // Per-annotation status for the panel below the chart — uses the
  // same classifier the chart is using.
  const states = ANNOTATIONS_RAW.map((raw) => ({
    raw,
    freshness: annotationFreshnessFor(raw, nowMs),
  }))

  return (
    <div
      style={{
        border: "1px solid var(--surface-3)",
        borderRadius: 12,
        padding: 20,
        background: "var(--surface-1)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <LineChart
        data={SAMPLE_DATA}
        xAccessor="month"
        yAccessor="value"
        title="Annotations as their lifecycle scrubs"
        height={340}
        margin={{ top: 32, right: 36, bottom: 40, left: 56 }}
        showPoints
        annotations={visibleAnnotations}
      />

      <div>
        <label
          style={{
            display: "block",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 4,
          }}
        >
          Pretend &quot;now&quot; is <code style={{ fontSize: 13 }}>{nowIso.slice(0, 10)}</code>
        </label>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={86400000}
          value={nowMs}
          onChange={(e) => setNowIso(new Date(parseInt(e.target.value, 10)).toISOString())}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {states.map(({ raw, freshness }) => {
          const created = Date.parse(raw.provenance.createdAt)
          const ageDays = Math.max(0, Math.floor((nowMs - created) / (24 * 60 * 60 * 1000)))
          return (
            <div
              key={raw.id}
              style={{
                border: "1px solid var(--surface-3)",
                background: "var(--surface-2)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12,
                opacity: freshness === "expired" ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>{raw.label}</strong>
                <span
                  style={{
                    background: FRESHNESS_BADGE_COLOR[freshness],
                    color: "white",
                    padding: "1px 8px",
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
              {freshness === "expired" && (
                <div style={{ marginTop: 4, color: "var(--semiotic-danger, #c43d3d)" }}>
                  hidden from chart — past 3× TTL
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
        Drag the slider forward in time. Annotations dim through <code>fresh → aging → stale</code>,
        take on a dashed border at <code>stale</code>, then disappear once they hit{" "}
        <code>expired</code>. The chart is calling{" "}
        <code>applyAnnotationLifecycle(annotations, {"{ now }"})</code> directly — the shipping
        helper handles freshness, opacity, dashing, and the expired filter; pass{" "}
        <code>showExpiredAnnotations: true</code> to keep expired annotations visible.
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
      prevPage={{ title: "Agent-Reader Grounding", path: "/intelligence/reader-grounding" }}
      nextPage={{ title: "Temporal Lifecycle", path: "/intelligence/temporal-lifecycle" }}
    >
      <p>
        AI-assisted chart authoring is a session, not a one-shot call. Users see suggestions, pick
        one, refine the audience, render, edit, replace, export — or abandon. Semiotic gives that
        arc structure with three composable surfaces:
      </p>
      <ul>
        <li>
          <strong>Conversation-arc telemetry</strong> — an opt-in event store recording the arc
          itself.
        </li>
        <li>
          <strong>Annotation provenance + lifecycle</strong> — every annotation can carry origin,
          confidence, and freshness.
        </li>
        <li>
          <strong>Variant discovery</strong> — an interface for proposing chart variants outside the
          hand-curated capability registry.
        </li>
      </ul>
      <p>
        These ship together. Annotation freshness and the default visual treatment are live (the
        demo below uses them directly). The conversation-arc store, React hook, persistence sinks,
        and replay hydration helpers are functional. Variant discovery&apos;s plug point is callable
        today; the built-in heuristic proposer and scorer arrive in subsequent passes.
      </p>

      <h2>Conversation-arc telemetry</h2>
      <p>
        <code>enableConversationArc()</code> turns on a module-scoped ring buffer that records the
        arc of an AI-assisted session. Default surface is a no-op so the import is zero-cost when
        telemetry is off.
      </p>

      <h3>Interactive demo</h3>
      <p>
        Enable recording, fire some events, and watch the live store. Each click below calls{" "}
        <code>store.record(...)</code>. The event log is driven by a real subscriber on the real
        store — not a re-render of local state.
      </p>
      <ArcDemo />

      <h3>Persistence + replay</h3>
      <p>
        Registering a sink makes accepted events durable without changing the recording API. The
        demo below writes a sample arc to <code>localStorage</code>, clears only the live buffer,
        replays the local artifact, and can hydrate the same inspector from a static JSON fixture at{" "}
        <code>{REPLAY_FIXTURE_PATH}</code>. Replay uses <code>loadConversationArc()</code>, so it
        updates the visible store snapshot without re-firing sinks or analytics subscribers.
      </p>
      <PersistenceReplayDemo />

      <h3>Wiring — React</h3>
      <p>
        The <code>useConversationArc</code> hook is the React entry point. It auto-enables the
        module-scoped store on mount, subscribes via <code>useSyncExternalStore</code> for tear-free
        re-renders, and returns a stable <code>record</code> callback plus a live{" "}
        <code>summary</code> reduction:
      </p>
      <CodeBlock language="jsx">
        {`import { useConversationArc } from "semiotic/ai"

function ArcInspector() {
  const { history, summary, enabled, sessionId, record, clear } = useConversationArc()

  return (
    <>
      <header>
        Session {sessionId} · {summary.total} events · {summary.byType["chart-exported"] ?? 0} exports
      </header>
      <button onClick={() =>
        record({ type: "chart-exported", component: "LineChart", format: "jsx" })
      }>Mark export</button>
      <EventList events={history} />
    </>
  )
}`}
      </CodeBlock>

      <h3>Wiring — non-React sinks</h3>
      <p>
        For analytics sinks, replay fixtures, or anything outside the React tree, use the
        module-scoped store directly. The hook is just sugar over the same store.
      </p>
      <CodeBlock language="jsx">
        {`import {
  createLocalStorageConversationArcSink,
  createWebhookConversationArcSink,
  enableConversationArc,
  getConversationArcStore,
  loadConversationArc,
  registerConversationArcSink,
} from "semiotic/ai"

enableConversationArc({ capacity: 1000, sessionId: "session-abc" })

const localSink = createLocalStorageConversationArcSink({
  key: "my-app:conversation-arc",
})
const unregisterLocal = registerConversationArcSink(localSink)

registerConversationArcSink(createWebhookConversationArcSink({
  url: "/analytics/conversation-arc",
  headers: { "X-App": "viz-builder" },
}))

const store = getConversationArcStore()
const unsubscribe = store.subscribe((event) => {
  // In-process observer: update an inspector, console, or live dashboard.
  console.log(event.type, event)
})

// Later: hydrate an inspector from the durable local artifact.
const savedEvents = localSink.load()
loadConversationArc(savedEvents, { enabled: false })

// Teardown when the app owns this lifecycle.
unsubscribe()
unregisterLocal()`}
      </CodeBlock>

      <h3>Auto-instrumentation</h3>
      <p>Two surfaces wire themselves to the arc store automatically:</p>
      <ul>
        <li>
          <code>useChartSuggestions</code> emits <code>suggestion-shown</code> whenever the
          suggestion list changes (deduplicated by component-list signature).
        </li>
        <li>
          <code>useChartInterrogation</code> emits <code>interrogation-asked</code> on{" "}
          <code>ask()</code> and <code>interrogation-answered</code> when the response (or error)
          returns — with measured <code>latencyMs</code>.
        </li>
        <li>
          <code>AccessibleNavTree</code> emits <code>nav-node-focused</code> and{" "}
          <code>nav-branch-expanded</code> as a reader traverses the{" "}
          <Link to="/accessibility/navigation">navigation tree</Link> — the arc&apos;s first{" "}
          <em>reception</em>-side signal, correlated by the tree&apos;s <code>chartId</code>.
        </li>
      </ul>
      <p>
        All are zero-overhead when the arc store is disabled (the default). For audience-picker
        UIs, call <code>recordAudienceChange(next, previous)</code> in the picker&apos;s{" "}
        <code>onChange</code> handler.
      </p>

      <p>
        Try it: change the intent or audience below. No <code>record()</code> calls in the demo&apos;s
        own component code — only <code>useChartSuggestions</code> running and{" "}
        <code>recordAudienceChange</code> on the picker. Watch the event log fill in.
      </p>
      <AutoInstrumentDemo />

      <h3>Event vocabulary</h3>
      <p>
        Thirteen variants in a discriminated union: <code>suggestion-shown</code>,{" "}
        <code>suggestion-chosen</code>, <code>audience-set</code>, <code>chart-rendered</code>,{" "}
        <code>chart-edited</code>, <code>chart-replaced</code>, <code>chart-exported</code>,{" "}
        <code>chart-abandoned</code>, <code>interrogation-asked</code>,{" "}
        <code>interrogation-answered</code>, and the reception pair{" "}
        <code>nav-node-focused</code> / <code>nav-branch-expanded</code>, plus{" "}
        <code>annotation-status-changed</code>. Each carries the fields a downstream analytics or
        replay system would actually consume (component name, rank, format, reason; node id, role,
        and level for the nav events; annotation id and status transition for contested notes). The{" "}
        <code>arcId</code> field threads multiple events into a single named arc when you need it.
      </p>

      <h2>Annotation provenance + lifecycle</h2>
      <p>
        Anchored conversations stay defensible when every annotation knows where it came from and
        when it should be considered stale. Two optional blocks attach to any annotation:{" "}
        <code>provenance</code> ( <code>author</code>, <code>source</code>, <code>confidence</code>,{" "}
        <code>createdAt</code>, <code>stableId</code>) and <code>lifecycle</code> (
        <code>freshness</code>, <code>ttlHint</code>, <code>anchor</code>).
        <code>computeAnnotationFreshness</code> classifies each annotation into a band;{" "}
        <code>applyAnnotationLifecycle</code> additionally applies a default visual treatment
        (opacity for aging, dashing for stale, hiding for expired).
      </p>

      <h3>Lifecycle scrubber</h3>
      <p>
        The chart below carries two annotations — one from a user with a 30-day TTL, one from an AI
        with a 14-day TTL and lower confidence. Drag the slider to advance &quot;now&quot; and watch them
        drift through <code>fresh → aging → stale → expired</code>:
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
        The anchor mode matters when data refreshes. <code>&quot;fixed&quot;</code> keeps the recorded
        coordinate verbatim; <code>&quot;latest&quot;</code> re-pins to the most recent data point;{" "}
        <code>&quot;sticky&quot;</code> rides forward until removed (the existing streaming behavior);{" "}
        <code>&quot;semantic&quot;</code> re-resolves via <code>stableId</code> when new data arrives,
        falling back to the recorded coordinate when the target is gone.
      </p>

      <h2>Variant discovery</h2>
      <p>
        Hand-curated <code>capability.variants</code> are bounded by what humans wrote. Variant
        discovery is the API surface for proposing configurations the registry doesn&apos;t include —
        from heuristic walkers, LLM agents, or future ML models — and scoring them with the same
        rubric the built-in suggester uses.
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
        At M1, <code>proposeVariant</code> and <code>evaluateVariantProposal</code> are stubs — they
        return empty proposals and a neutral baseline score. The point is the contract:{" "}
        <code>VariantProposal</code> and <code>VariantScore</code> are stable shapes consumers can
        wire end-to-end today. Heuristic proposal lands in M2; scoring + the MCP{" "}
        <code>proposeChartVariants</code> tool land in M3.
      </p>

      <h2>Why these three together</h2>
      <p>
        The arc records what happened. The annotations preserve what the user said about it. Variant
        discovery keeps the system honest about what it doesn&apos;t yet know — and where the learning
        slots in.
      </p>
    </PageLayout>
  )
}
