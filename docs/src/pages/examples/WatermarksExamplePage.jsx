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
const BALL_RADIUS = 7.5
const DEFAULT_WINDOW_SIZE = 12
const DEFAULT_WATERMARK_DELAY = 18
const DEFAULT_SPEED = 8
const WATERMARK_EPSILON = 1e-6

// Category keys chosen so the HOC's hashStringColor maps current to blue and
// late to purple. This color is event timeliness, not physical outcome.
const ONTIME_KEY = "in-window"
const LATE_KEY = "late"

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
      // times only choreograph the rain. The three "backfill"
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

// Current event time and the watermark strategy decide which windows are still
// open. Color marks event timeliness; the angled lid alone decides whether an
// event settles into its bin or rolls to the late gutter.
const classify = (event) => {
  return event.timeliness === "late" ? "late" : "in-window"
}

<EventDropChart
  ref={chartRef}
  data={arrivedEvents}
  timeAccessor="eventTime"
  arrivalAccessor="arrivalTime"
  windows={{ size: windowSize }}
  watermark={{ value: currentEventTime - allowedLateness }}
  timeExtent={eventTimeExtent}
  colorBy={classify}
  timeScale={8}                     // playback speed — higher is faster
  ballRadius={7.5}
  showProjection={false}
  frameProps={{ onTick, foregroundGraphics }}
/>
`

function seconds(value) {
  if (!Number.isFinite(value)) return "0s"
  return `${Math.round(value)}s`
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function randomBetween(min, max) {
  if (max <= min) return min
  return min + Math.random() * (max - min)
}

function extentFor(events, accessor, fallback = [0, 1]) {
  const values = events
    .map((event) => Number(event?.[accessor]))
    .filter(Number.isFinite)
  if (!values.length) return fallback
  return [Math.min(...values), Math.max(...values)]
}

function timelineFor(events) {
  const [eventMin, eventMax] = extentFor(events, "eventTime", [0, DEFAULT_WINDOW_SIZE])
  const [arrivalMin, arrivalMax] = extentFor(events, "arrivalTime", [eventMin, eventMax])
  return {
    arrivalMin,
    arrivalMax,
    currentTime: arrivalMax,
    eventMin,
    eventMax,
  }
}

function chartArea(width, height) {
  return {
    x: 32,
    y: 24,
    width: Math.max(80, width - 64),
    height: Math.max(80, height - 58),
  }
}

function buildModel(events, arrivedEvents, windowSize, currentTime, watermarkStrategy, chartSize, seed) {
  const eventTimeExtent = extentFor(events, "eventTime", [0, windowSize])
  const closureFrontier = currentTime - watermarkStrategy
  const colliderWatermark = closureFrontier - WATERMARK_EPSILON
  const layout = buildEventDropPhysics({
    data: arrivedEvents,
    timeAccessor: "eventTime",
    arrivalAccessor: "arrivalTime",
    windows: { size: windowSize },
    watermark: { value: colliderWatermark },
    ballRadius: BALL_RADIUS,
    seed,
    size: chartSize,
    timeExtent: eventTimeExtent,
  })
  const metadata = layout.metadata ?? {}
  const windowStart = metadata.windowStart ?? Math.floor(eventTimeExtent[0] / windowSize) * windowSize
  const countsByWindow = arrivedEvents.reduce((counts, event) => {
    const eventTime = Number(event?.eventTime)
    if (!Number.isFinite(eventTime)) return counts
    const index = clamp(
      Math.floor((eventTime - windowStart) / windowSize),
      0,
      Math.max(0, layout.projectionRows.length - 1),
    )
    counts[index] = (counts[index] ?? 0) + 1
    return counts
  }, {})
  const rows = layout.projectionRows.map((row, index) => ({
    id: `window-${index}`,
    label: `${row.label}s`,
    start: windowStart + index * windowSize,
    end: windowStart + (index + 1) * windowSize,
    count: countsByWindow[index] ?? 0,
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
    eventTimeExtent,
    currentTime,
    watermark: colliderWatermark,
    watermarkFrontier: closureFrontier,
    watermarkStrategy,
    metadata,
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
  const metadata = model.metadata ?? {}
  const layoutPlot = metadata.plot ?? plot
  const gutter = metadata.gutter ?? { x: layoutPlot.x, y: layoutPlot.y, width: 0, height: layoutPlot.height }
  const windowPlot = metadata.windowPlot ?? layoutPlot
  const rowWidth = windowPlot.width / Math.max(1, model.windowCount)
  const bandTop = plot.y + plot.height * 0.14
  const floorY = layoutPlot.y + layoutPlot.height
  const gutterTop = (metadata.lidSegments ?? [])[0]?.y1 ?? bandTop
  const domainEnd = model.windowStart + model.windowCount * model.windowSize
  const frontierRatio =
    domainEnd === model.windowStart
      ? 0
      : (model.watermarkFrontier - model.windowStart) / (domainEnd - model.windowStart)
  const currentRatio =
    domainEnd === model.windowStart
      ? 0
      : (model.currentTime - model.windowStart) / (domainEnd - model.windowStart)
  const frontierX = clamp(
    windowPlot.x + frontierRatio * windowPlot.width,
    windowPlot.x,
    windowPlot.x + windowPlot.width,
  )
  const currentX = clamp(
    windowPlot.x + currentRatio * windowPlot.width,
    windowPlot.x,
    windowPlot.x + windowPlot.width,
  )
  const ruleLabel = `open if bin end + ${seconds(model.watermarkStrategy)} >= ${seconds(model.currentTime)}`
  return (
    <svg
      className="watermarks-example__overlay"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <rect
        x={layoutPlot.x}
        y={layoutPlot.y}
        width={layoutPlot.width}
        height={layoutPlot.height}
        rx="8"
        className="watermarks-example__plot"
      />
      {gutter.width > 0 ? (
        <g>
          <rect
            x={gutter.x}
            y={gutterTop}
            width={gutter.width}
            height={floorY - gutterTop}
            className="watermarks-example__gutter"
          />
          <text
            x={gutter.x + gutter.width / 2}
            y={gutterTop - 7}
            textAnchor="middle"
            className="watermarks-example__gutter-label"
          >
            late gutter
          </text>
        </g>
      ) : null}
      {model.rows.map((row, index) => {
        const x = windowPlot.x + index * rowWidth
        const closesAt = row.end + model.watermarkStrategy
        const closed = closesAt < model.currentTime
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
              (metadata.lidSegments ?? [])
                .filter((segment) => segment.windowIndex === index)
                .map((segment) => (
                  <line
                    key={segment.id}
                    x1={segment.x1}
                    x2={segment.x2}
                    y1={segment.y1}
                    y2={segment.y2}
                    className="watermarks-example__lid"
                  />
                ))
            ) : null}
            <text
              x={x + rowWidth / 2}
              y={bandTop + 18}
              textAnchor="middle"
              className="watermarks-example__bin-count"
            >
              {row.count}
            </text>
            <text
              x={x + rowWidth / 2}
              y={floorY + 16}
              textAnchor="middle"
              className="watermarks-example__axis-label"
            >
              {row.label}
            </text>
            <text
              x={x + rowWidth / 2}
              y={floorY + 30}
              textAnchor="middle"
              className={closed ? "watermarks-example__axis-label is-closed" : "watermarks-example__axis-label is-open"}
            >
              {closed ? "closed" : "open"}
            </text>
          </g>
        )
      })}
      {(metadata.lidSegments ?? [])
        .filter((segment) => segment.windowIndex == null)
        .map((segment) => (
          <line
            key={segment.id}
            x1={segment.x1}
            x2={segment.x2}
            y1={segment.y1}
            y2={segment.y2}
            className="watermarks-example__lid watermarks-example__lid--gutter"
          />
        ))}
      <line
        x1={frontierX}
        x2={frontierX}
        y1={layoutPlot.y + 6}
        y2={floorY - 4}
        className="watermarks-example__watermark"
      />
      <text
        x={clamp(frontierX + 8, layoutPlot.x, layoutPlot.x + layoutPlot.width - 134)}
        y={layoutPlot.y + 16}
        className="watermarks-example__watermark-label"
      >
        closes before {seconds(model.watermarkFrontier)}
      </text>
      <line
        x1={currentX}
        x2={currentX}
        y1={layoutPlot.y + 6}
        y2={floorY - 4}
        className="watermarks-example__current-time"
      />
      <text
        x={clamp(currentX + 8, layoutPlot.x, layoutPlot.x + layoutPlot.width - 118)}
        y={layoutPlot.y + 32}
        className="watermarks-example__current-time-label"
      >
        current {seconds(model.currentTime)}
      </text>
      <text
        x={windowPlot.x + 8}
        y={layoutPlot.y - 7}
        className="watermarks-example__rule-label"
      >
        {ruleLabel}
      </text>
    </svg>
  )
}

function ProjectionTable({ rows }) {
  return (
    <div className="watermarks-example__table" role="table" aria-label="Settled event-time windows">
      <div role="row" className="watermarks-example__table-row watermarks-example__table-row--head">
        <span role="columnheader">Window</span>
        <span role="columnheader">Count</span>
        <span role="columnheader">Binned</span>
        <span role="columnheader">Gutter</span>
        <span role="columnheader">Total</span>
      </div>
      {rows.map((row) => (
        <div role="row" className="watermarks-example__table-row" key={row.id}>
          <span role="cell">{row.label}</span>
          <span role="cell">{row.count}</span>
          <span role="cell">{row.onTime}</span>
          <span role="cell">{row.late}</span>
          <span role="cell">{row.total}</span>
        </div>
      ))}
    </div>
  )
}

function EventList({ events, currentTime }) {
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
            <span>{event.arrivalTime <= currentTime ? "arrived" : "queued"}</span>
          </div>
        ))}
    </div>
  )
}

export default function WatermarksExamplePage() {
  const initialTimeline = timelineFor(SCENARIOS[1].events)
  const [scenarioId, setScenarioId] = useState("backfill")
  const [currentTime, setCurrentTime] = useState(initialTimeline.currentTime)
  const [watermarkStrategy, setWatermarkStrategy] = useState(DEFAULT_WATERMARK_DELAY)
  const [pendingSpeed, setPendingSpeed] = useState(DEFAULT_SPEED)
  const [pendingWindow, setPendingWindow] = useState(DEFAULT_WINDOW_SIZE)
  // Speed and window size change the drop itself, so they commit on Replay
  // rather than re-positioning bodies mid-flight.
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
  const timeline = useMemo(() => timelineFor(events), [events])
  const arrivedEvents = useMemo(
    () => events.filter((event) => event.arrivalTime <= currentTime),
    [currentTime, events],
  )
  const model = useMemo(
    () =>
      buildModel(
        events,
        arrivedEvents,
        committed.window,
        currentTime,
        watermarkStrategy,
        chartSize,
        scenario.seed,
      ),
    [arrivedEvents, chartSize, committed.window, currentTime, events, scenario.seed, watermarkStrategy],
  )
  // The board rebuilds when the time controls change because lids are physical
  // colliders, not just a live color classification.
  const chartKey = [
    scenarioId,
    replayNonce,
    chartWidth,
    currentTime,
    model.watermarkFrontier,
    model.watermarkStrategy,
    committed.window,
    committed.speed,
  ].join(":")
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

  // Classify each body against the physical lid state. Closed-window bodies are
  // colored late; the angled colliders decide whether they roll to the gutter.
  const classify = useCallback(
    (datum) => {
      if (datum?.timeliness === "late") return LATE_KEY
      if (datum?.timeliness === "current") return ONTIME_KEY
      const eventTime = Number(datum?.eventTime)
      return Number.isFinite(eventTime) && eventTime < model.currentTime
        ? LATE_KEY
        : ONTIME_KEY
    },
    [model.currentTime],
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
      queued: arrivedEvents.length,
      state: "queued",
      elapsed: 0,
      sensors: 0,
    })
    setSelectedEvent(null)
    tickGateRef.current = 0
  }, [arrivedEvents.length, chartKey])

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
      const nextTimeline = timelineFor(scenario.events)
      const nextCurrentTime = clamp(currentTime, nextTimeline.arrivalMin, nextTimeline.arrivalMax)
      setCommitted({ speed: pendingSpeed, window: pendingWindow })
      setInjectedEvents([])
      setCurrentTime(nextCurrentTime)
      setSelectedEvent(null)
      setPaused(false)
      setReplayNonce((current) => current + 1)
  }, [currentTime, pendingSpeed, pendingWindow, recordArcEdit, scenario.events, scenarioId])

  const changeScenario = useCallback(
    (nextScenarioId) => {
      const nextScenario = SCENARIOS.find((item) => item.id === nextScenarioId)
      recordArcEdit(["data", "scenario"], {
        action: "scenario",
        scenarioId: nextScenarioId,
        label: nextScenario?.label,
      })
      const nextTimeline = timelineFor(nextScenario?.events ?? [])
      setScenarioId(nextScenarioId)
      setCommitted({ speed: pendingSpeed, window: pendingWindow })
      setInjectedEvents([])
      setCurrentTime(nextTimeline.currentTime)
      setSelectedEvent(null)
      setPaused(false)
      setReplayNonce((current) => current + 1)
    },
    [pendingSpeed, pendingWindow, recordArcEdit],
  )

  const injectLateBurst = useCallback(() => {
    const base = [...scenario.events, ...injectedEvents]
    const [minTime] = extentFor(base, "eventTime", [0, committed.window])
    const currentCeiling = Math.max(minTime, currentTime - 1)
    const acceptedMin = Math.max(minTime, model.watermarkFrontier)
    const acceptedMax = Math.max(acceptedMin, currentCeiling)
    const closedMax = Math.max(minTime, model.watermarkFrontier - 1)
    const candidates = [
      randomBetween(minTime, closedMax),
      randomBetween(acceptedMin, acceptedMax),
      randomBetween(minTime, currentCeiling),
    ]
    const burst = candidates.map((eventTime) => {
      const id = `inject-${injectCounterRef.current++}`
      return {
        id,
        eventTime: Math.round(clamp(eventTime, minTime, currentCeiling)),
        arrivalTime: currentTime,
        source: "late-replay",
        timeliness: "late",
        value: 1,
      }
    })
    chartRef.current?.pushMany(burst)
    setInjectedEvents((current) => [...current, ...burst])
    setPaused(false)
    recordArcEdit(["data", "watermark.strategy"], {
      action: "inject-late-burst",
      count: burst.length,
      scenarioId,
    })
  }, [committed.window, currentTime, injectedEvents, model.watermarkFrontier, recordArcEdit, scenario.events, scenarioId])

  const injectOnTimeArrival = useCallback(() => {
    const [minTime, maxTime] = model.eventTimeExtent
    const nearMin = Math.max(minTime, currentTime - committed.window * 0.2)
    const nearMax = Math.min(maxTime, currentTime + committed.window * 0.35)
    const id = `inject-${injectCounterRef.current++}`
    const event = {
      id,
      eventTime: Math.round(randomBetween(nearMin, Math.max(nearMin, nearMax))),
      arrivalTime: currentTime,
      source: "frontier",
      timeliness: "current",
      value: 1,
    }
    chartRef.current?.push(event)
    setInjectedEvents((current) => [...current, event])
    setPaused(false)
    recordArcEdit(["data"], { action: "inject-on-time", scenarioId })
  }, [committed.window, currentTime, model.eventTimeExtent, recordArcEdit, scenarioId])

  const clearInjected = useCallback(() => {
    const nextTimeline = timelineFor(scenario.events)
    setInjectedEvents([])
    setCurrentTime(nextTimeline.currentTime)
    setReplayNonce((current) => current + 1)
    recordArcEdit(["data"], { action: "clear-injected" })
  }, [recordArcEdit, scenario.events])

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
            const nextTimeline = timelineFor(scenario.events)
            setInjectedEvents([])
            setCurrentTime(nextTimeline.currentTime)
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
  }, [scenario.events])

  const selected = selectedEvent ?? arrivedEvents[arrivedEvents.length - 1]
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
            pipeline&rsquo;s promise that older event-time windows can close. Here, a window stays
            open while its end time plus the watermark strategy is still at or beyond the current
            event time. A late arrival drops over its own event time, hits an angled lid, and rolls
            into the left gutter.
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
              <span>Current event time</span>
              <input
                type="range"
                min={timeline.arrivalMin}
                max={timeline.arrivalMax}
                step="1"
                value={currentTime}
                onChange={(event) => {
                  const nextCurrentTime = Number(event.target.value)
                  recordArcEdit(["currentTime"], { currentTime: nextCurrentTime })
                  setCurrentTime(nextCurrentTime)
                  setPaused(false)
                }}
              />
              <strong>{seconds(currentTime)}</strong>
            </label>

            <label className="watermarks-example__control-group watermarks-example__control-group--live">
              <span>Watermark strategy</span>
              <input
                type="range"
                min="0"
                max={Math.max(DEFAULT_WATERMARK_DELAY * 2, committed.window * 3)}
                step="1"
                value={watermarkStrategy}
                onChange={(event) => {
                  const nextStrategy = Number(event.target.value)
                  recordArcEdit(["watermark.strategy"], { watermarkStrategy: nextStrategy })
                  setWatermarkStrategy(nextStrategy)
                  setPaused(false)
                }}
              />
              <strong>{seconds(watermarkStrategy)}</strong>
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
            <span className="watermarks-example__swatch watermarks-example__swatch--ontime" /> current event
            <span className="watermarks-example__swatch watermarks-example__swatch--late" /> late event
            &mdash; {scenario.label}: {scenario.description}.
          </p>

          <div className="watermarks-example__chart-shell" ref={shellRef}>
            <EventDropChart
              key={chartKey}
              ref={chartRef}
              data={arrivedEvents}
              timeAccessor="eventTime"
              arrivalAccessor="arrivalTime"
              colorBy={classify}
              windows={{ size: committed.window }}
              watermark={{ value: model.watermark }}
              timeExtent={model.eventTimeExtent}
              timeScale={committed.speed}
              ballRadius={BALL_RADIUS}
              seed={scenario.seed}
              size={chartSize}
              paused={paused}
              showProjection={false}
              title="Watermark replay"
              description={`Event-drop watermark replay: ${model.onTime} on time, ${model.late} late with a ${seconds(model.watermarkStrategy)} watermark strategy`}
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
            <strong>{arrivedEvents.length}/{events.length}</strong>
            <span>arrived / total</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{model.onTime}</strong>
            <span>binned by physics</span>
          </div>
          <div className="watermarks-example__metric watermarks-example__metric--late">
            <strong>{model.late}</strong>
            <span>sent to gutter</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{seconds(model.watermarkStrategy)}</strong>
            <span>watermark strategy</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{seconds(currentTime)}</strong>
            <span>current event time</span>
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
                <dt>timeliness</dt>
                <dd>{selectedClass === LATE_KEY ? "late event" : "current event"}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2>Arrival order</h2>
            <EventList events={events} currentTime={currentTime} />
          </div>
        </section>

        <section className="watermarks-example__implementation">
          <div>
            <h2>How it maps to Semiotic</h2>
            <p>
              Data rows carry an event time and an arrival time. Current event time and the
              watermark strategy decide which windows have lids; bodies drop over their event-time
              x-position, and closed windows add angled physics colliders. The runtime state comes from{" "}
              <code>frameProps.onTick</code> &mdash; the same numbers an agent or test would read.
            </p>
          </div>
          <CodeBlock language="jsx">{implementationCode}</CodeBlock>
        </section>
      </div>
    </ExamplePageLayout>
  )
}
