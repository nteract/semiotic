import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EventDropChart, buildEventDropPhysics } from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PhysicsArcStatus,
  usePhysicsExampleConversationArc,
} from "./PhysicsExampleConversationArc"
import "./WatermarksExamplePage.css"

const CHART_HEIGHT = 400
const BALL_RADIUS = 10
const DEFAULT_WINDOW_SIZE = 12
const DEFAULT_WATERMARK_DELAY = 18
const DEFAULT_SPEED = 8

// Category keys chosen so the HOC's hashStringColor maps on-time to blue and
// late to red. Coloring by the LIVE classification (not a baked field) is what
// lets the watermark slider recolor every body without re-dropping.
const ONTIME_KEY = "in-window"
const LATE_KEY = "behind"

// timeScale is playback speed: higher = faster (1 = real event-time).
const SPEED_OPTIONS = [
  { value: 12, label: "Brisk" },
  { value: 8, label: "Steady" },
  { value: 5, label: "Slow" },
]
const WINDOW_OPTIONS = [10, 12, 16]

const SCENARIOS = [
  {
    id: "calm",
    label: "Calm stream",
    seed: 31,
    description: "mostly ordered arrivals with a few old events still visible as the watermark advances",
    events: [
      { id: "calm-01", eventTime: 3, arrivalTime: 2, source: "frontend", value: 1 },
      { id: "calm-02", eventTime: 8, arrivalTime: 7, source: "api", value: 1 },
      { id: "calm-03", eventTime: 15, arrivalTime: 13, source: "api", value: 1 },
      { id: "calm-04", eventTime: 19, arrivalTime: 20, source: "billing", value: 1 },
      { id: "calm-05", eventTime: 28, arrivalTime: 26, source: "frontend", value: 1 },
      { id: "calm-06", eventTime: 36, arrivalTime: 34, source: "api", value: 1 },
      { id: "calm-07", eventTime: 42, arrivalTime: 39, source: "billing", value: 1 },
      { id: "calm-08", eventTime: 50, arrivalTime: 52, source: "frontend", value: 1 },
    ],
  },
  {
    id: "backfill",
    label: "Backfill burst",
    seed: 47,
    description: "a batch replay injects old event times after newer windows have already moved on",
    events: [
      // Event times fix each event's window (and so its lateness); arrival
      // times only choreograph the rain, interleaved here so on-time (blue) and
      // late (red) bodies fall together from the start. The three "backfill"
      // rows carry old event times but arrive last — the burst that lands
      // behind an already-advanced watermark.
      { id: "backfill-01", eventTime: 6, arrivalTime: 4, source: "api", value: 1 },
      { id: "backfill-04", eventTime: 39, arrivalTime: 8, source: "sensor", value: 1 },
      { id: "backfill-02", eventTime: 12, arrivalTime: 13, source: "api", value: 1 },
      { id: "backfill-05", eventTime: 45, arrivalTime: 18, source: "sensor", value: 1 },
      { id: "backfill-03", eventTime: 24, arrivalTime: 24, source: "frontend", value: 1 },
      { id: "backfill-06", eventTime: 58, arrivalTime: 30, source: "api", value: 1 },
      { id: "backfill-07", eventTime: 63, arrivalTime: 36, source: "frontend", value: 1 },
      { id: "backfill-08", eventTime: 11, arrivalTime: 62, source: "backfill", value: 1 },
      { id: "backfill-09", eventTime: 17, arrivalTime: 66, source: "backfill", value: 1 },
      { id: "backfill-10", eventTime: 28, arrivalTime: 70, source: "backfill", value: 1 },
    ],
  },
  {
    id: "skew",
    label: "Sensor skew",
    seed: 59,
    description: "one source reports old event times while the rest of the stream keeps progressing",
    events: [
      { id: "skew-01", eventTime: 4, arrivalTime: 4, source: "edge-a", value: 1 },
      { id: "skew-02", eventTime: 18, arrivalTime: 17, source: "edge-b", value: 1 },
      { id: "skew-03", eventTime: 31, arrivalTime: 30, source: "edge-a", value: 1 },
      { id: "skew-04", eventTime: 47, arrivalTime: 46, source: "edge-b", value: 1 },
      { id: "skew-05", eventTime: 54, arrivalTime: 53, source: "edge-a", value: 1 },
      { id: "skew-06", eventTime: 66, arrivalTime: 64, source: "edge-b", value: 1 },
      { id: "skew-07", eventTime: 16, arrivalTime: 69, source: "skewed", value: 1 },
      { id: "skew-08", eventTime: 22, arrivalTime: 72, source: "skewed", value: 1 },
      { id: "skew-09", eventTime: 33, arrivalTime: 75, source: "skewed", value: 1 },
      { id: "skew-10", eventTime: 78, arrivalTime: 79, source: "edge-a", value: 1 },
    ],
  },
]

const implementationCode = `import { EventDropChart } from "semiotic/physics"

// Color by the LIVE watermark, not a baked field, so dragging the delay
// re-classifies every body on the spot — no re-drop.
const classify = (event) => {
  const windowIndex = Math.floor((event.eventTime - windowStart) / windowSize)
  const windowEnd = windowStart + (windowIndex + 1) * windowSize
  return windowEnd < watermark ? "behind" : "in-window"
}

<EventDropChart
  ref={chartRef}
  data={scenario.events}            // initial rain; injects arrive via ref.push
  timeAccessor="eventTime"
  arrivalAccessor="arrivalTime"
  windows={{ size: windowSize }}
  watermark={{ delay }}             // live prop — never in the React key
  colorBy={classify}
  timeScale={8}                     // playback speed — higher is faster
  ballRadius={10}
  showProjection={false}
  frameProps={{ onTick, foregroundGraphics }}
/>

// A new arrival drops in without rebuilding the board:
chartRef.current.push({ id, eventTime, arrivalTime, source, value: 1 })`

function seconds(value) {
  if (!Number.isFinite(value)) return "0s"
  return `${Math.round(value)}s`
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function chartArea(width, height) {
  return {
    x: 32,
    y: 24,
    width: Math.max(80, width - 64),
    height: Math.max(80, height - 58),
  }
}

function buildModel(events, windowSize, watermarkDelay, chartSize, seed) {
  const layout = buildEventDropPhysics({
    data: events,
    timeAccessor: "eventTime",
    arrivalAccessor: "arrivalTime",
    windows: { size: windowSize },
    watermark: { delay: watermarkDelay },
    ballRadius: BALL_RADIUS,
    seed,
    size: chartSize,
  })
  const times = events.map((event) => event.eventTime).filter(Number.isFinite)
  const minTime = times.length ? Math.min(...times) : 0
  const maxTime = times.length ? Math.max(...times) : windowSize
  const windowStart = Math.floor(minTime / windowSize) * windowSize
  const watermark = maxTime - watermarkDelay
  const rows = layout.projectionRows.map((row, index) => ({
    id: `window-${index}`,
    label: `${row.label}s`,
    start: windowStart + index * windowSize,
    end: windowStart + (index + 1) * windowSize,
    onTime: row.value,
    late: row.secondary ?? 0,
    total: row.value + (row.secondary ?? 0),
  }))
  return {
    layout,
    rows,
    windowStart,
    windowSize,
    windowCount: rows.length,
    minTime,
    maxTime,
    watermark,
    late: rows.reduce((sum, row) => sum + row.late, 0),
    onTime: rows.reduce((sum, row) => sum + row.onTime, 0),
  }
}

// One overlay painted OVER the bodies (a physics canvas always repaints its own
// opaque background, so a true backdrop can't show through). Marks are kept thin
// and washes faint so the big, bright bodies stay legible underneath: window
// bands, per-window ledger, closed-window lids, and the sweeping watermark.
function WatermarkOverlay({ width, height, model }) {
  const plot = chartArea(width, height)
  const rowWidth = plot.width / Math.max(1, model.windowCount)
  const bandTop = plot.y + plot.height * 0.14
  const floorY = plot.y + plot.height
  const watermarkIndex = (model.watermark - model.windowStart) / model.windowSize
  const watermarkX = clamp(plot.x + watermarkIndex * rowWidth, plot.x, plot.x + plot.width)
  return (
    <svg
      className="watermarks-example__overlay"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <rect
        x={plot.x}
        y={plot.y}
        width={plot.width}
        height={plot.height}
        rx="8"
        className="watermarks-example__plot"
      />
      {model.rows.map((row, index) => {
        const x = plot.x + index * rowWidth
        const closed = row.end < model.watermark
        return (
          <g key={row.id}>
            <rect
              x={x}
              y={bandTop}
              width={rowWidth}
              height={floorY - bandTop}
              className={closed ? "watermarks-example__window is-closed" : "watermarks-example__window"}
            />
            <line
              x1={x}
              x2={x}
              y1={bandTop}
              y2={floorY}
              className="watermarks-example__divider"
            />
            {closed ? (
              <line
                x1={x + 4}
                x2={x + rowWidth - 4}
                y1={bandTop}
                y2={bandTop}
                className="watermarks-example__lid"
              />
            ) : null}
            <text
              x={x + rowWidth / 2}
              y={floorY + 18}
              textAnchor="middle"
              className="watermarks-example__axis-label"
            >
              {row.label}
            </text>
          </g>
        )
      })}
      <line
        x1={watermarkX}
        x2={watermarkX}
        y1={plot.y + 6}
        y2={floorY - 4}
        className="watermarks-example__watermark"
      />
      <text
        x={clamp(watermarkX + 8, plot.x, plot.x + plot.width - 96)}
        y={plot.y + 16}
        className="watermarks-example__watermark-label"
      >
        watermark {seconds(model.watermark)}
      </text>
      {model.late > 0 ? (
        <text
          x={plot.x + plot.width - 8}
          y={bandTop - 7}
          textAnchor="end"
          className="watermarks-example__gutter-label"
        >
          {model.late} late &rarr; gutter
        </text>
      ) : null}
    </svg>
  )
}

function ProjectionTable({ rows }) {
  return (
    <div className="watermarks-example__table" role="table" aria-label="Settled event-time windows">
      <div role="row" className="watermarks-example__table-row watermarks-example__table-row--head">
        <span role="columnheader">Window</span>
        <span role="columnheader">On time</span>
        <span role="columnheader">Late</span>
        <span role="columnheader">Total</span>
      </div>
      {rows.map((row) => (
        <div role="row" className="watermarks-example__table-row" key={row.id}>
          <span role="cell">{row.label}</span>
          <span role="cell">{row.onTime}</span>
          <span role="cell">{row.late}</span>
          <span role="cell">{row.total}</span>
        </div>
      ))}
    </div>
  )
}

function EventList({ events }) {
  return (
    <div className="watermarks-example__event-list" aria-label="Replay events">
      {events
        .slice()
        .sort((a, b) => a.arrivalTime - b.arrivalTime)
        .map((event) => (
          <div className="watermarks-example__event-row" key={event.id}>
            <span>{event.id}</span>
            <span>{seconds(event.eventTime)}</span>
            <span>{seconds(event.arrivalTime)}</span>
            <span>{event.source}</span>
          </div>
        ))}
    </div>
  )
}

export default function WatermarksExamplePage() {
  const [scenarioId, setScenarioId] = useState("backfill")
  const [watermarkDelay, setWatermarkDelay] = useState(DEFAULT_WATERMARK_DELAY)
  const [pendingSpeed, setPendingSpeed] = useState(DEFAULT_SPEED)
  const [pendingWindow, setPendingWindow] = useState(DEFAULT_WINDOW_SIZE)
  // Speed and window size change the drop itself, so they commit on Replay
  // rather than re-positioning bodies mid-flight. Delay stays fully live.
  const [committed, setCommitted] = useState({
    speed: DEFAULT_SPEED,
    window: DEFAULT_WINDOW_SIZE,
  })
  const [paused, setPaused] = useState(false)
  const [replayNonce, setReplayNonce] = useState(0)
  const [injectedEvents, setInjectedEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [runtime, setRuntime] = useState({
    live: 0,
    queued: 0,
    state: "queued",
    elapsed: 0,
    sensors: 0,
  })
  const chartRef = useRef(null)
  const tickGateRef = useRef(0)
  const injectCounterRef = useRef(0)
  const wasOutOfViewRef = useRef(false)
  const [hostWidth, hostRef] = useResponsiveWidth(360, 1120)
  const shellRef = useRef(null)
  const chartWidth = Math.max(360, Math.min(1060, hostWidth))
  const chartSize = useMemo(() => [chartWidth, CHART_HEIGHT], [chartWidth])
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0]
  const events = useMemo(
    () => [...scenario.events, ...injectedEvents],
    [scenario, injectedEvents],
  )
  const model = useMemo(
    () => buildModel(events, committed.window, watermarkDelay, chartSize, scenario.seed),
    [events, committed.window, watermarkDelay, chartSize, scenario.seed],
  )
  // The board only rebuilds on scenario / replay / width — never on delay.
  const chartKey = `${scenarioId}:${replayNonce}:${chartWidth}`
  const pendingChanges =
    pendingSpeed !== committed.speed || pendingWindow !== committed.window
  const arc = usePhysicsExampleConversationArc({
    sessionId: "physics-watermarks-example",
    arcId: "physics-watermarks",
    component: "EventDropChart",
    chartId: "watermarks-event-drop",
  })
  const recordArcEdit = arc.recordEdit
  const recordArcRendered = arc.recordRendered
  const recordedChartKeyRef = useRef(null)

  // Classify each body against the LIVE watermark from its (baked) event time.
  // A new function identity on every delay change forces the frame to repaint
  // the existing bodies with fresh colors — the "motion is the measurement".
  const classify = useCallback(
    (datum) => {
      const eventTime = Number(datum?.eventTime)
      if (!Number.isFinite(eventTime)) return ONTIME_KEY
      const windowIndex = Math.floor((eventTime - model.windowStart) / model.windowSize)
      const windowEnd = model.windowStart + (windowIndex + 1) * model.windowSize
      return windowEnd < model.watermark ? LATE_KEY : ONTIME_KEY
    },
    [model.windowStart, model.windowSize, model.watermark],
  )

  useEffect(() => {
    if (recordedChartKeyRef.current === chartKey) return
    recordedChartKeyRef.current = chartKey
    recordArcRendered({
      scenarioId,
      eventCount: events.length,
      windowSize: committed.window,
      speed: committed.speed,
    })
  }, [chartKey, committed.speed, committed.window, events.length, recordArcRendered, scenarioId])

  useEffect(() => {
    setRuntime({
      live: 0,
      queued: scenario.events.length,
      state: "queued",
      elapsed: 0,
      sensors: 0,
    })
    setSelectedEvent(null)
    tickGateRef.current = 0
  }, [chartKey, scenario.events.length])

  const handleTick = useCallback((result, controls) => {
    if (
      result.elapsedSeconds - tickGateRef.current < 0.2 &&
      result.spawned.length === 0 &&
      result.observations.length === 0
    ) {
      return
    }
    tickGateRef.current = result.elapsedSeconds
    const snapshot = controls.snapshot()
    setRuntime({
      live: snapshot.liveBodyOrder.length,
      queued: result.queueSize,
      state: snapshot.simulationState,
      elapsed: result.elapsedSeconds,
      sensors: snapshot.activeSensorPairs.length,
    })
  }, [])

  const replay = useCallback(() => {
    recordArcEdit(["simulation"], { action: "replay", scenarioId })
    setCommitted({ speed: pendingSpeed, window: pendingWindow })
    setInjectedEvents([])
    setSelectedEvent(null)
    setPaused(false)
    setReplayNonce((current) => current + 1)
  }, [pendingSpeed, pendingWindow, recordArcEdit, scenarioId])

  const changeScenario = useCallback(
    (nextScenarioId) => {
      const nextScenario = SCENARIOS.find((item) => item.id === nextScenarioId)
      recordArcEdit(["data", "scenario"], {
        action: "scenario",
        scenarioId: nextScenarioId,
        label: nextScenario?.label,
      })
      setScenarioId(nextScenarioId)
      setCommitted({ speed: pendingSpeed, window: pendingWindow })
      setInjectedEvents([])
      setSelectedEvent(null)
      setPaused(false)
      setReplayNonce((current) => current + 1)
    },
    [pendingSpeed, pendingWindow, recordArcEdit],
  )

  const injectLateBurst = useCallback(() => {
    const base = [...scenario.events, ...injectedEvents]
    const times = base.map((event) => event.eventTime)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const watermark = maxTime - watermarkDelay
    const ceiling = Math.max(minTime + 1, watermark - 1)
    const burst = [0, 1, 2].map((offset) => {
      const id = `inject-${injectCounterRef.current++}`
      const eventTime = Math.round(
        clamp(minTime + (ceiling - minTime) * (0.2 + offset * 0.28), minTime, ceiling),
      )
      return {
        id,
        eventTime,
        arrivalTime: maxTime + 4 + offset * 2,
        source: "late-replay",
        value: 1,
      }
    })
    chartRef.current?.pushMany(burst)
    setInjectedEvents((current) => [...current, ...burst])
    recordArcEdit(["data", "watermark.delay"], {
      action: "inject-late-burst",
      count: burst.length,
      scenarioId,
    })
  }, [injectedEvents, recordArcEdit, scenario.events, scenarioId, watermarkDelay])

  const injectOnTimeArrival = useCallback(() => {
    const base = [...scenario.events, ...injectedEvents]
    const times = base.map((event) => event.eventTime)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const id = `inject-${injectCounterRef.current++}`
    const event = {
      id,
      eventTime: Math.round(clamp(maxTime - 1, minTime, maxTime)),
      arrivalTime: maxTime + 1,
      source: "frontier",
      value: 1,
    }
    chartRef.current?.push(event)
    setInjectedEvents((current) => [...current, event])
    recordArcEdit(["data"], { action: "inject-on-time", scenarioId })
  }, [injectedEvents, recordArcEdit, scenario.events, scenarioId])

  const clearInjected = useCallback(() => {
    if (injectedEvents.length) {
      chartRef.current?.remove(injectedEvents.map((event) => event.id))
    }
    setInjectedEvents([])
    recordArcEdit(["data"], { action: "clear-injected" })
  }, [injectedEvents, recordArcEdit])

  // Restart the drop when the board scrolls into view after having been off
  // screen, so a reader arriving mid-page meets motion, not a settled corpse.
  useEffect(() => {
    const host = shellRef.current
    if (!host || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            wasOutOfViewRef.current = true
          } else if (wasOutOfViewRef.current) {
            wasOutOfViewRef.current = false
            setInjectedEvents([])
            setSelectedEvent(null)
            setPaused(false)
            setReplayNonce((current) => current + 1)
          }
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const selected = selectedEvent ?? events[events.length - 1]
  const selectedClass = selected ? classify(selected) : ONTIME_KEY

  const foregroundGraphics = useMemo(
    () => <WatermarkOverlay width={chartSize[0]} height={chartSize[1]} model={model} />,
    [chartSize, model],
  )

  return (
    <ExamplePageLayout title="Watermarks, Made Physical">
      <div className="watermarks-example">
        <section className="watermarks-example__intro">
          <p className="watermarks-example__lede">
            Event-time streams arrive out of order. A <strong>watermark</strong> is the
            pipeline&rsquo;s promise that no earlier event is still coming &mdash; once it passes a
            window, that window closes and anything older counts as <strong>late</strong>. Drag the
            watermark delay below and watch every event re-classify in place.
          </p>
          <div className="watermarks-example__credit">
            A Semiotic remake of the mechanic from{" "}
            <a href="https://flink-watermarks.wtf/" target="_blank" rel="noopener noreferrer">
              flink-watermarks.wtf
            </a>
            , built on <a href="/charts/event-drop-chart">EventDropChart</a> so the settled
            projection and runtime state stay inspectable.
          </div>
        </section>

        <section className="watermarks-example__workbench" ref={hostRef}>
          <div className="watermarks-example__controls" aria-label="Watermark replay controls">
            <div className="watermarks-example__control-group">
              <span>Scenario</span>
              <div className="watermarks-example__segments">
                {SCENARIOS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={scenarioId === item.id ? "is-active" : ""}
                    aria-pressed={scenarioId === item.id}
                    onClick={() => changeScenario(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="watermarks-example__control-group watermarks-example__control-group--live">
              <span>Watermark delay · live</span>
              <input
                type="range"
                min="8"
                max="30"
                step="1"
                value={watermarkDelay}
                onChange={(event) => {
                  const nextDelay = Number(event.target.value)
                  recordArcEdit(["watermark.delay"], { watermarkDelay: nextDelay })
                  setWatermarkDelay(nextDelay)
                }}
              />
              <strong>{seconds(watermarkDelay)}</strong>
            </label>

            <label className="watermarks-example__control-group">
              <span>Replay speed{pendingSpeed !== committed.speed ? " · on replay" : ""}</span>
              <select
                value={pendingSpeed}
                onChange={(event) => {
                  const nextSpeed = Number(event.target.value)
                  recordArcEdit(["timeScale"], { timeScale: nextSpeed })
                  setPendingSpeed(nextSpeed)
                }}
              >
                {SPEED_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="watermarks-example__control-group">
              <span>Window size{pendingWindow !== committed.window ? " · on replay" : ""}</span>
              <select
                value={pendingWindow}
                onChange={(event) => {
                  const nextWindowSize = Number(event.target.value)
                  recordArcEdit(["windows.size"], { windowSize: nextWindowSize })
                  setPendingWindow(nextWindowSize)
                }}
              >
                {WINDOW_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}s
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="watermarks-example__actions" aria-label="Replay actions">
            <button
              type="button"
              onClick={() => {
                const nextPaused = !paused
                recordArcEdit(["paused"], { paused: nextPaused })
                setPaused(nextPaused)
              }}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={replay}>
              {pendingChanges ? "Replay (apply settings)" : "Replay"}
            </button>
            <button type="button" onClick={injectOnTimeArrival}>Inject on-time arrival</button>
            <button type="button" onClick={injectLateBurst}>Inject late burst</button>
            <button type="button" onClick={clearInjected} disabled={injectedEvents.length === 0}>
              Clear injected
            </button>
          </div>

          <PhysicsArcStatus arc={arc} />

          <p className="watermarks-example__scenario-note">
            <span className="watermarks-example__swatch watermarks-example__swatch--ontime" /> in-window
            <span className="watermarks-example__swatch watermarks-example__swatch--late" /> behind the watermark
            &mdash; {scenario.label}: {scenario.description}.
          </p>

          <div className="watermarks-example__chart-shell" ref={shellRef}>
            <EventDropChart
              key={chartKey}
              ref={chartRef}
              data={scenario.events}
              timeAccessor="eventTime"
              arrivalAccessor="arrivalTime"
              colorBy={classify}
              windows={{ size: committed.window }}
              watermark={{ delay: watermarkDelay }}
              timeScale={committed.speed}
              ballRadius={BALL_RADIUS}
              seed={scenario.seed}
              size={chartSize}
              paused={paused}
              showProjection={false}
              title="Watermark replay"
              description={`Event-drop watermark replay: ${model.onTime} on time, ${model.late} late at a ${seconds(model.watermark)} watermark`}
              frameProps={{
                foregroundGraphics,
                onTick: handleTick,
                onBodyPointerDown: (body) => {
                  const datum = body?.datum ?? null
                  recordArcEdit(["selectedEvent"], {
                    eventId: datum?.id ?? null,
                    source: datum?.source,
                  })
                  setSelectedEvent(datum)
                },
                suspendWhenHidden: false,
              }}
            />
          </div>
        </section>

        <section className="watermarks-example__readouts">
          <div className="watermarks-example__metric">
            <strong>{events.length}</strong>
            <span>events</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{model.onTime}</strong>
            <span>on-time at watermark</span>
          </div>
          <div className="watermarks-example__metric watermarks-example__metric--late">
            <strong>{model.late}</strong>
            <span>late at watermark</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{seconds(model.watermark)}</strong>
            <span>current watermark</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{runtime.live}/{runtime.queued}</strong>
            <span>live / queued</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{runtime.state}</strong>
            <span>{seconds(runtime.elapsed)} sim time</span>
          </div>
        </section>

        <section className="watermarks-example__details">
          <div>
            <h2>Settled projection</h2>
            <ProjectionTable rows={model.rows} />
          </div>
          <div>
            <h2>Selected event</h2>
            <dl className="watermarks-example__selected">
              <div>
                <dt>id</dt>
                <dd>{selected?.id ?? "none"}</dd>
              </div>
              <div>
                <dt>event time</dt>
                <dd>{seconds(selected?.eventTime)}</dd>
              </div>
              <div>
                <dt>arrival</dt>
                <dd>{seconds(selected?.arrivalTime)}</dd>
              </div>
              <div>
                <dt>source</dt>
                <dd>{selected?.source ?? "n/a"}</dd>
              </div>
              <div>
                <dt>classified</dt>
                <dd>{selectedClass === LATE_KEY ? "late (behind watermark)" : "in-window"}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2>Arrival order</h2>
            <EventList events={events} />
          </div>
        </section>

        <section className="watermarks-example__implementation">
          <div>
            <h2>How it maps to Semiotic</h2>
            <p>
              Data rows carry an event time and an arrival time. Bodies fall by arrival; the
              watermark is a live prop, so dragging the delay recolors every settled body and moves
              the readouts without re-running the drop. Injected arrivals enter through the chart
              ref, and the runtime state comes from <code>frameProps.onTick</code> &mdash; the same
              numbers an agent or test would read.
            </p>
          </div>
          <CodeBlock language="jsx">{implementationCode}</CodeBlock>
        </section>
      </div>
    </ExamplePageLayout>
  )
}
