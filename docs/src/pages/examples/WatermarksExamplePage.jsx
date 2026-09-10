import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EventDropChart, buildEventDropPhysics } from "semiotic/physics"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { PhysicsArcStatus, usePhysicsExampleConversationArc } from "./PhysicsExampleConversationArc"
import {
  buildWatermarkTemporalRecord,
  describeWatermarkTemporalStage,
  replaySeconds,
} from "./watermarksTemporalRecord"
import { WATERMARK_SCENARIOS as SCENARIOS } from "./watermarksScenarios"
import { WatermarkExperiment } from "./WatermarkExperiment"
import { WatermarkClosureLesson } from "./WatermarkClosureLesson"
import { WatermarkPeriod, watermarkPeriodGeometry } from "./WatermarkPeriod"
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

const implementationCode = `import {
  adaptStreamTopicMetadata,
  auditTemporalContext,
  updateTemporalContext,
} from "semiotic/artifact"
import { EventDropChart } from "semiotic/physics"

// One portable time record drives the visible labels and inspectable JSON.
const liveTime = adaptStreamTopicMetadata({
  id: "orders",
  eventTime: { field: "eventTime", value: latestEventTime, timezone: "UTC" },
  ingestedAt: arrivalFrontier,
  watermark: { value: watermark, policy: "Arrival frontier minus an 18s lag", allowedLateness: "PT0S" },
  window: { start: windowStart, end: windowEnd, status: "open" },
  completeness: { status: "provisional" },
})

const correctedTime = updateTemporalContext(liveTime, {
  window: { start: windowStart, end: windowEnd, status: "corrected" },
  completeness: { status: "settled" },
  revision: {
    status: "backfilled",
    previousArtifactId: "orders-before-late-rows",
    reason: "Late rows changed the window",
  },
  sources: [{
    id: "orders",
    kind: "stream",
    freshness: "fresh",
    completeness: "settled",
  }],
})

const timeAudit = auditTemporalContext(correctedTime, {
  referenceTime: arrivalFrontier,
})

<EventDropChart
  ref={chartRef}
  data={arrivedEvents.map(event => ({
    ...event,
    watermarkAtArrival: event.arrivalTime - watermarkLag - 1e-6,
  }))}
  timeAccessor="eventTime"
  arrivalAccessor="arrivalTime"
  watermarkAtArrivalAccessor="watermarkAtArrival"
  windows={{ size: windowSize }}
  watermark={{ value: arrivalFrontier - watermarkLag - 1e-6 }}
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
  const values = events.map((event) => Number(event?.[accessor])).filter(Number.isFinite)
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

function buildModel(
  events,
  arrivedEvents,
  windowSize,
  currentTime,
  watermarkStrategy,
  chartSize,
  seed,
) {
  const eventTimeExtent = extentFor(events, "eventTime", [0, windowSize])
  const closureFrontier = currentTime - watermarkStrategy
  const colliderWatermark = closureFrontier - WATERMARK_EPSILON
  const layout = buildEventDropPhysics({
    data: arrivedEvents,
    timeAccessor: "eventTime",
    arrivalAccessor: "arrivalTime",
    watermarkAtArrivalAccessor: "watermarkAtArrival",
    windows: { size: windowSize },
    watermark: { value: colliderWatermark },
    ballRadius: BALL_RADIUS,
    seed,
    size: chartSize,
    timeExtent: eventTimeExtent,
  })
  const metadata = layout.metadata ?? {}
  const windowStart =
    metadata.windowStart ?? Math.floor(eventTimeExtent[0] / windowSize) * windowSize
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
function WatermarkOverlay({ width, height, model, time }) {
  const compact = width < 520
  const plot = chartArea(width, height)
  const metadata = model.metadata ?? {}
  const layoutPlot = metadata.plot ?? plot
  const gutter = metadata.gutter ?? {
    x: layoutPlot.x,
    y: layoutPlot.y,
    width: 0,
    height: layoutPlot.height,
  }
  const windowPlot = metadata.windowPlot ?? layoutPlot
  const rowWidth = windowPlot.width / Math.max(1, model.windowCount)
  const bandTop = plot.y + plot.height * 0.14
  const floorY = layoutPlot.y + layoutPlot.height
  const gutterTop = (metadata.lidSegments ?? [])[0]?.y1 ?? layoutPlot.y + layoutPlot.height * 0.48
  const arrivalFrontier = replaySeconds(time?.ingestedAt) ?? model.currentTime
  const watermarkFrontier = replaySeconds(time?.watermark?.value) ?? model.watermarkFrontier
  const { watermarkX: frontierX, nowX: currentX } = watermarkPeriodGeometry(
    metadata, watermarkFrontier, arrivalFrontier,
  )
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
      <rect
        data-testid="watermark-board-band"
        x={frontierX}
        y={layoutPlot.y}
        width={Math.max(0, currentX - frontierX)}
        height={layoutPlot.height}
        className="watermarks-example__waiting-region"
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
            {model.late} late
          </text>
        </g>
      ) : null}
      {model.rows.map((row, index) => {
        const x = windowPlot.x + index * rowWidth
        const closed = index < metadata.closedWindowCount
        return (
          <g key={row.id}>
            <rect
              x={x}
              y={bandTop}
              width={rowWidth}
              height={floorY - bandTop}
              className={
                closed ? "watermarks-example__window is-closed" : "watermarks-example__window"
              }
            />
            {closed
              ? (metadata.lidSegments ?? [])
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
              : null}
            <text
              x={x + rowWidth / 2}
              y={bandTop + 18}
              textAnchor="middle"
              className="watermarks-example__bin-count"
            >
              {row.onTime}
            </text>
            <text
              x={x + rowWidth / 2}
              y={floorY + 16}
              textAnchor="middle"
              className="watermarks-example__axis-label"
            >
              {compact ? seconds(row.start) : row.label}
            </text>
            <text
              x={x + rowWidth / 2}
              y={floorY + 30}
              textAnchor="middle"
              className={
                closed
                  ? "watermarks-example__axis-label is-closed"
                  : "watermarks-example__axis-label is-open"
              }
            >
              {compact ? "" : closed ? "closed" : "open"}
            </text>
          </g>
        )
      })}
      {metadata.windowWalls?.map(({ id, ...wall }) => (
        <rect key={id} {...wall} className="watermarks-example__wall" />
      ))}
      {compact && (
        <text
          x={windowPlot.x + windowPlot.width / 2}
          y={floorY + 30}
          textAnchor="middle"
          className="watermarks-example__axis-label"
        >
          {model.windowSize}s windows · event time
        </text>
      )}
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
        y1={layoutPlot.y}
        y2={floorY - 4}
        className="watermarks-example__watermark"
      />
      <line
        x1={currentX}
        x2={currentX}
        y1={layoutPlot.y}
        y2={floorY - 4}
        className="watermarks-example__current-time"
      />
    </svg>
  )
}

function TemporalStateLedger({ record }) {
  return (
    <section className="watermarks-example__time-ledger" aria-labelledby="watermark-time-heading">
      <div className="watermarks-example__time-intro">
        <h2 id="watermark-time-heading">One declared time model</h2>
        <p>
          The replay, these explanations, and the JSON payload use the same Artifact Contract time
          and claim records. Event time says when a row happened; the arrival frontier says what the
          pipeline has seen; the watermark determines which windows can settle.
        </p>
      </div>
      <div className="watermarks-example__time-states">
        {record.stages.map((stage) => {
          const correction = stage.contract.contestability?.corrections?.[0]
          return (
            <article
              className="watermarks-example__time-state"
              key={stage.id}
              data-state={stage.id}
            >
              <h3>{stage.label}</h3>
              <p>{describeWatermarkTemporalStage(stage)}</p>
              <dl>
                <div>
                  <dt>Window</dt>
                  <dd>{stage.time.window?.status ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>Completeness</dt>
                  <dd>{stage.time.completeness?.status ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>Time audit</dt>
                  <dd>
                    {stage.audit.summary.fail} failing · {stage.audit.summary.unknown} unknown
                  </dd>
                </div>
                <div>
                  <dt>Claim audit</dt>
                  <dd>
                    {stage.claimAudit.summary.fail} failing · {stage.claimAudit.summary.warn}{" "}
                    warning
                  </dd>
                </div>
              </dl>
              <h4>Claim state</h4>
              <ul className="watermarks-example__claims">
                {stage.contract.claims.map((claim) => (
                  <li key={claim.id}>
                    <strong>{claim.status}</strong>
                    <span>{claim.text}</span>
                  </li>
                ))}
              </ul>
              {correction ? (
                <p className="watermarks-example__correction">
                  Correction <code>{correction.id}</code> preserves{" "}
                  <code>{correction.affectedClaimIds.join(", ")}</code> and links it to{" "}
                  <code>{correction.replacementClaimIds?.join(", ")}</code>.
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
      <details className="watermarks-example__time-payload">
        <summary>Inspect the machine-readable time payload</summary>
        <pre data-testid="watermark-temporal-payload">
          {JSON.stringify(record.payload, null, 2)}
        </pre>
      </details>
    </section>
  )
}

function ProjectionTable({ rows }) {
  return (
    <div className="watermarks-example__table" role="table" aria-label="Event-time window counts">
      <div role="row" className="watermarks-example__table-row watermarks-example__table-row--head">
        <span role="columnheader">Window</span>
        <span role="columnheader">Accepted</span>
        <span role="columnheader">Late</span>
        <span role="columnheader">Received</span>
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
  const [hostWidth, hostRef] = useResponsiveWidth(240, 1120)
  const shellRef = useRef(null)
  const chartWidth = Math.max(240, Math.min(1060, hostWidth - 60))
  const chartSize = useMemo(() => [chartWidth, CHART_HEIGHT], [chartWidth])
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0]
  const events = useMemo(
    () =>
      [...scenario.events, ...injectedEvents].map((event) => ({
        ...event,
        // This example declares an arrival-frontier policy. An arrival exactly
        // at the closure instant is accepted, matching its temporal claim ledger.
        watermarkAtArrival: event.arrivalTime - watermarkStrategy - WATERMARK_EPSILON,
      })),
    [scenario, injectedEvents, watermarkStrategy],
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
    [
      arrivedEvents,
      chartSize,
      committed.window,
      currentTime,
      events,
      scenario.seed,
      watermarkStrategy,
    ],
  )
  const temporalRecord = useMemo(
    () =>
      buildWatermarkTemporalRecord({
        scenarioId,
        events,
        arrivedEvents,
        currentTime,
        windowSize: committed.window,
        watermarkLag: watermarkStrategy,
      }),
    [arrivedEvents, committed.window, currentTime, events, scenarioId, watermarkStrategy],
  )
  const declaredTime = temporalRecord.current?.time
  const declaredArrival = replaySeconds(temporalRecord.payload.referenceTime) ?? currentTime
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
  const pendingChanges = pendingSpeed !== committed.speed || pendingWindow !== committed.window
  const arc = usePhysicsExampleConversationArc({
    sessionId: "physics-watermarks-example",
    arcId: "physics-watermarks",
    component: "EventDropChart",
    chartId: "watermarks-event-drop",
  })
  const recordArcEdit = arc.recordEdit
  const recordArcRendered = arc.recordRendered
  const recordedChartKeyRef = useRef(null)

  // Color records by their admission decision, including records in windows
  // that have closed since they were accepted.
  const classify = useCallback(
    (datum) => {
      const eventTime = Number(datum?.eventTime)
      const watermarkAtArrival = Number(datum?.watermarkAtArrival)
      const windowEnd = (Math.floor(eventTime / committed.window) + 1) * committed.window
      return Number.isFinite(watermarkAtArrival) && windowEnd <= watermarkAtArrival
        ? LATE_KEY
        : ONTIME_KEY
    },
    [committed.window],
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
  }, [
    committed.window,
    currentTime,
    injectedEvents,
    model.watermarkFrontier,
    recordArcEdit,
    scenario.events,
    scenarioId,
  ])

  const injectOnTimeArrival = useCallback(() => {
    const [minTime, maxTime] = model.eventTimeExtent
    const nearMin = Math.max(minTime, currentTime - committed.window * 0.2)
    const nearMax = Math.min(maxTime, currentTime)
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

  const selected = selectedEvent ?? arrivedEvents[arrivedEvents.length - 1]
  const selectedClass = selected ? classify(selected) : ONTIME_KEY

  const watermarkForegroundGraphics = useMemo(
    () => (
      <WatermarkOverlay
        width={chartSize[0]}
        height={chartSize[1]}
        model={model}
        time={declaredTime}
      />
    ),
    [chartSize, declaredTime, model],
  )
  const eventDropFrameProps = useMemo(
    () => ({
      // The EventDropChart owns placement, colliders, settled rows, and
      // accessibility. This foreground layer only explains the window state
      // with SVG decoration anchored to the same physics geometry.
      foregroundGraphics: watermarkForegroundGraphics,
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
    }),
    [handleTick, recordArcEdit, watermarkForegroundGraphics],
  )

  const renderEventDropChart = ({ attachRefs = false } = {}) => (
    <div className="watermarks-example__chart-shell" ref={attachRefs ? shellRef : undefined}>
      <WatermarkPeriod
        width={chartSize[0]}
        metadata={model.metadata}
        watermark={model.watermarkFrontier}
        now={currentTime}
      />
      <EventDropChart
        key={chartKey}
        ref={attachRefs ? chartRef : undefined}
        data={arrivedEvents}
        timeAccessor="eventTime"
        arrivalAccessor="arrivalTime"
        watermarkAtArrivalAccessor="watermarkAtArrival"
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
        description={`Event-drop watermark replay: ${model.onTime} on time and ${model.late} late. The declared window is ${declaredTime?.window?.status ?? "unknown"} with ${declaredTime?.completeness?.status ?? "unknown"} completeness.`}
        frameProps={eventDropFrameProps}
      />
    </div>
  )

  return (
    <ExamplePageLayout title="Watermarks, Made Physical">
      <div className="watermarks-example">
        <section className="watermarks-example__intro">
          <p className="watermarks-example__lede">
            Events do not always arrive in the order they happened. A <strong>watermark</strong> is
            a progress estimate used to decide when to close older windows. Here, a late arrival
            drops at its own event time, hits an angled lid, and rolls into the left gutter. Events
            accepted earlier stay in their own windows when those windows close.
          </p>
          <div className="watermarks-example__credit">
            A remake of the mechanic from{" "}
            <a href="https://flink-watermarks.wtf/" target="_blank" rel="noopener noreferrer">
              flink-watermarks.wtf
            </a>
            , using Semiotic&apos;s <a href="/charts/event-drop-chart">EventDropChart</a> so you can
            inspect both the accepted count and the late-data correction. This example uses an
            simple clock-based estimate: watermark = arrival frontier − lag. The lag is how far behind the arrival clock we place the event-time completeness estimate.
          </div>
        </section>

        <WatermarkClosureLesson />

        <WatermarkExperiment
          events={events}
          windowSize={committed.window}
          allowance={watermarkStrategy}
          currentTime={currentTime}
          onPolicy={(delay) => {
            recordArcEdit(["watermark.strategy"], {
              action: "compare-policy",
              watermarkStrategy: delay,
            })
            setWatermarkStrategy(delay)
            setCurrentTime(timeline.arrivalMax)
            setPaused(false)
          }}
          onFrontier={(time) => {
            recordArcEdit(["currentTime"], { action: "inspect-batch", currentTime: time })
            setCurrentTime(time)
            setPaused(false)
          }}
        />

        <section className="watermarks-example__workbench" ref={hostRef}>
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
          </div>

          <p className="watermarks-example__scenario-note">
            <span className="watermarks-example__legend-item">
              <span className="watermarks-example__swatch watermarks-example__swatch--ontime" />
              accepted on arrival
            </span>
            <span className="watermarks-example__legend-item">
              <span className="watermarks-example__swatch watermarks-example__swatch--late" />
              late event
            </span>
            <span>
              {scenario.label}: {scenario.description}.
            </span>
          </p>

          {renderEventDropChart({ attachRefs: true })}
          <details className="physics-story__technical">
            <summary>Explore other streams and settings</summary>
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
                <span>Arrival frontier</span>
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
                <strong>{seconds(declaredArrival)}</strong>
              </label>

              <label className="watermarks-example__control-group watermarks-example__control-group--live">
                <span>Watermark lag</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(60, committed.window * 3)}
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

            <div className="watermarks-example__actions" aria-label="Inject extra events">
              <button type="button" className="is-current" onClick={injectOnTimeArrival}>
                Inject on-time arrival
              </button>
              <button type="button" className="is-late" onClick={injectLateBurst}>
                Inject mixed arrivals
              </button>
              <button type="button" onClick={clearInjected} disabled={injectedEvents.length === 0}>
                Clear injected
              </button>
            </div>
          </details>
          <details className="physics-story__technical">
            <summary>Developer diagnostics</summary>
            <PhysicsArcStatus arc={arc} />
            <p>
              {runtime.live} live bodies · {runtime.queued} queued · {seconds(runtime.elapsed)}{" "}
              simulation time · {runtime.state}
            </p>
          </details>
        </section>

        <section className="watermarks-example__readouts">
          <div className="watermarks-example__metric">
            <strong>
              {arrivedEvents.length}/{events.length}
            </strong>
            <span>arrived / total</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{model.onTime}</strong>
            <span>accepted by the policy</span>
          </div>
          <div className="watermarks-example__metric watermarks-example__metric--late">
            <strong>{model.late}</strong>
            <span>late arrivals to correct</span>
          </div>
          <div className="watermarks-example__metric">
            <strong>{seconds(watermarkStrategy)}</strong>
            <span>watermark lag</span>
          </div>
        </section>

        <section className="watermarks-example__details">
          <div>
            <h2>The count you can check</h2>
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
                <dd>{selectedClass === LATE_KEY ? "late event" : "accepted on arrival"}</dd>
              </div>
              <div>
                <dt>arrival watermark</dt>
                <dd>{seconds(selected?.watermarkAtArrival)}</dd>
              </div>
            </dl>
            <p className="watermarks-example__decision" data-testid="watermark-admission-decision">
              {selected
                ? `${selected.id} arrived at ${seconds(selected.arrivalTime)}. Its window ends at ${seconds((Math.floor(selected.eventTime / committed.window) + 1) * committed.window)}; the watermark at arrival was ${seconds(selected.watermarkAtArrival)}. ${selectedClass === LATE_KEY ? "The window was already closed, so this event was late." : "The window was still open, so this event was accepted."}`
                : "Select an event to inspect its admission decision."}
            </p>
          </div>
          <div>
            <h2>Arrival order</h2>
            <EventList events={events} currentTime={currentTime} />
          </div>
        </section>

        <details className="physics-story__technical">
          <summary>Inspect time states and correction records</summary>
          <TemporalStateLedger record={temporalRecord} />
        </details>

        <section className="watermarks-example__implementation">
          <div>
            <h2>How it maps to Semiotic</h2>
            <p>
              Data rows carry an event time and an arrival time. The Artifact Contract adapter turns
              the replay controls into one deterministic time record; its audited window, watermark,
              completeness, claim, and correction fields drive the labels and inspectable payload.
              Bodies still drop over their event-time x-position, and closed windows add angled
              physics colliders. The frame animates the replay; <code>onTick</code> observes its
              progress.
            </p>
          </div>
          <CodeBlock language="jsx">{implementationCode}</CodeBlock>
        </section>
      </div>
    </ExamplePageLayout>
  )
}
