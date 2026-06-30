import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ProcessSankey,
  RealtimeWaterfallChart,
  ScatterplotMatrix,
  useSyncedPushData,
} from "semiotic"
import { FlowMap } from "semiotic/geo"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PORT_AXIS_TICKS,
  PORT_COHORT_SUMMARIES,
  PORT_LOCATIONS,
  PORT_PROCESS_NODES,
  PORT_REPLAY_DOMAIN,
  PORT_REPLAY_EVENTS,
  PORT_ROUTES,
  aggregateBacklogEvents,
  backlogAtCursor,
  flowsAtTime,
  formatPortTime,
  processEdgesAtTime,
  replayTimeForCursor,
} from "./data/portCongestionData"
import "./PortCongestionReplayExamplePage.css"

const ROUTE_COLORS = PORT_ROUTES.map((route) => route.color)
const STAGE_COLORS = ["#ff7043", "#ffd166", "#36d6b3", "#68a7ff", "#c996ff"]
const FLOW_MAP_FRAME_PROPS = {
  lineStyle: (flow) => ({
    stroke: flow.color || "#ff7043",
    strokeWidth: Math.max(2, Math.min(5.5, 1.5 + (flow.value / 2500) * 4)),
    strokeLinecap: "round",
    opacity: 0.88,
    fillOpacity: 0,
  }),
  pointStyle: (point) => {
    const originRoute = PORT_ROUTES.find((route) => route.origin === point.id)
    if (originRoute) {
      return {
        fill: originRoute.color,
        stroke: "#07171d",
        strokeWidth: 1.2,
        r: 5.5,
      }
    }
    if (point.type === "destination") {
      return { fill: "#f5ecdc", stroke: "#ff7043", strokeWidth: 2, r: 6 }
    }
    if (point.type === "chokepoint") {
      return { fill: "#ffd166", stroke: "#07171d", strokeWidth: 1, r: 4.5 }
    }
    return { fill: "#80989d", stroke: "#07171d", strokeWidth: 1, r: 3 }
  },
}

const implementationCode = `const waterfallRef = useRef(null)
const [cursor, setCursor] = useState(events.length)
const currentTime = replayTimeForCursor(cursor)

// Static nodes + declaratively derived snapshots.
<FlowMap
  nodes={locations}
  flows={flowsAtTime(currentTime, selectedRoute)}
  areas="land-110m"
  flowStyle="basic"
  lineType="geo"
  showParticles
/>

<ProcessSankey
  nodes={processNodes}
  edges={processEdgesAtTime(currentTime, selectedRoute)}
  domain={replayDomain}
  pairing="temporal"
/>

// The backlog is mirrored through the imperative changeset API.
waterfallRef.current.push(event)
waterfallRef.current.remove(event.id)

<RealtimeWaterfallChart
  ref={waterfallRef}
  pointIdAccessor="id"
  timeAccessor="time"
  valueAccessor="value"
/>

<ScatterplotMatrix
  data={cohortSummaries}
  fields={["seaDays", "anchorageHours", "carbonTons", "teu"]}
  colorBy="route"
/>`

export default function PortCongestionReplayExamplePage() {
  const [cursor, setCursor] = useState(PORT_REPLAY_EVENTS.length)
  const [playing, setPlaying] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [hoveredRoute, setHoveredRoute] = useState(null)
  const waterfallRef = useRef(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(320, 1132)
  const [docsTheme] = useDocsTheme()

  const activeRouteId = selectedRoute || hoveredRoute
  const activeRoute = PORT_ROUTES.find((route) => route.id === activeRouteId)
  const currentTime = replayTimeForCursor(cursor)
  const processEdges = useMemo(
    () => processEdgesAtTime(currentTime, activeRouteId),
    [currentTime, activeRouteId]
  )
  const mapFlows = useMemo(
    () => flowsAtTime(currentTime, activeRouteId),
    [currentTime, activeRouteId]
  )
  const mapNodes = useMemo(() => {
    if (!activeRoute) return PORT_LOCATIONS
    const routeNodeIds = new Set(activeRoute.waypoints)
    return PORT_LOCATIONS.filter((location) => routeNodeIds.has(location.id))
  }, [activeRoute])
  const visibleEvents = useMemo(
    () =>
      PORT_REPLAY_EVENTS
        .slice(0, cursor)
        .filter((event) => !activeRouteId || event.routeId === activeRouteId),
    [cursor, activeRouteId]
  )
  const backlogSeries = useMemo(
    () => aggregateBacklogEvents(visibleEvents),
    [visibleEvents]
  )

  const backlog = backlogAtCursor(cursor, activeRouteId)
  const latestEvent = visibleEvents[visibleEvents.length - 1]
  const activeLaneCount = new Set(mapFlows.map((flow) => flow.routeId)).size
  const completedPercent = Math.round((cursor / PORT_REPLAY_EVENTS.length) * 100)
  const outerInset =
    chartWidth <= 560 ? 30 : Math.min(98, chartWidth * 0.08 + 2)
  const contentWidth = chartWidth - outerInset
  const processWidth = Math.max(280, contentWidth - (chartWidth <= 560 ? 26 : 42))
  const panelWidth = processWidth
  const matrixCellSize = Math.max(70, Math.min(128, Math.floor((contentWidth - 112) / 4)))
  const peakAnnotation = useMemo(() => {
    let running = 0
    let peak = null
    for (const event of backlogSeries) {
      running += event.value
      if (!peak || running > peak.value) peak = { event, value: running }
    }
    if (!peak?.event || peak.value <= 0) return []
    return [{
      type: "callout",
      time: peak.event.time,
      value: peak.value,
      label: `Peak queue · ${peak.value.toLocaleString()} TEU`,
      color: "#ffd166",
      dx: -46,
      dy: -40,
      connector: { end: "arrow" },
    }]
  }, [backlogSeries])

  useSyncedPushData(waterfallRef, backlogSeries, {
    id: "id",
    resetKey: `${docsTheme}:${activeRouteId || "all-routes"}`,
  })

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= PORT_REPLAY_EVENTS.length) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 320)
    return () => window.clearInterval(timer)
  }, [playing])

  const replay = useCallback(() => {
    setCursor(1)
    setPlaying(true)
  }, [])

  const toggleRoute = useCallback((routeId) => {
    setSelectedRoute((current) => (current === routeId ? null : routeId))
  }, [])

  const observeRoute = useCallback((observation) => {
    if (observation?.type === "hover") {
      const datum = unwrapDatum(observation.datum)
      if (datum?.routeId) setHoveredRoute(datum.routeId)
    } else if (observation?.type === "hover-end") {
      setHoveredRoute(null)
    }
  }, [])

  const clickDatum = useCallback((datum) => {
    const routeId = findRouteId(datum)
    if (routeId) toggleRoute(routeId)
  }, [toggleRoute])

  return (
    <ExamplePageLayout
      title="Where the Boxes Wait"
      prevPage={{
        title: "Your Local Government Explorer",
        path: "/examples/local-government-explorer",
      }}
      nextPage={{
        title: "The Scroll You're Telling",
        path: "/examples/scroll-youre-telling",
      }}
    >
      <div className="port-replay" ref={chartHostRef}>
        <header className="port-replay__masthead">
          <div className="port-replay__mast-copy">
            <div className="port-replay__kicker">Global cargo control / replay 09–10</div>
            <h2>
              Where the
              <br />
              boxes wait
            </h2>
            <p>
              Fifteen container cohorts leave five ports across Asia, Europe,
              and South America for Newark. Each follows a different maritime
              corridor. The queue at the other end is shared.
            </p>
          </div>
          <div className="port-replay__clock" aria-label={`Replay time ${formatPortTime(currentTime)}`}>
            <span>UTC replay clock</span>
            <strong>{formatPortTime(currentTime)}</strong>
            <i>{String(completedPercent).padStart(3, "0")}%</i>
          </div>
        </header>

        <div className="port-replay__sticky-controls">
          <section className="port-replay__controls" aria-label="Replay controls">
            <div className="port-replay__transport">
              <button type="button" onClick={playing ? () => setPlaying(false) : cursor >= PORT_REPLAY_EVENTS.length ? replay : () => setPlaying(true)}>
                {playing ? "Pause" : cursor >= PORT_REPLAY_EVENTS.length ? "Replay" : "Continue"}
              </button>
              <button type="button" className="port-replay__quiet-button" onClick={() => {
                setPlaying(false)
                setCursor(PORT_REPLAY_EVENTS.length)
              }}>
                End state
              </button>
            </div>
            <label className="port-replay__scrubber">
              <span>Event {cursor} / {PORT_REPLAY_EVENTS.length}</span>
              <input
                type="range"
                min="0"
                max={PORT_REPLAY_EVENTS.length}
                value={cursor}
                onChange={(event) => {
                  setPlaying(false)
                  setCursor(Number(event.target.value))
                }}
              />
            </label>
          </section>

          <nav className="port-replay__routes" aria-label="Filter shipping lane">
            <button
              type="button"
              className={!selectedRoute ? "is-active" : ""}
              onClick={() => setSelectedRoute(null)}
            >
              All lanes
            </button>
            {PORT_ROUTES.map((route) => (
              <button
                type="button"
                key={route.id}
                className={selectedRoute === route.id ? "is-active" : ""}
                style={{ "--route-color": route.color }}
                onMouseEnter={() => setHoveredRoute(route.id)}
                onMouseLeave={() => setHoveredRoute(null)}
                onFocus={() => setHoveredRoute(route.id)}
                onBlur={() => setHoveredRoute(null)}
                onClick={() => toggleRoute(route.id)}
              >
                <span />
                {route.shortLabel}
              </button>
            ))}
          </nav>
        </div>

        <div className="port-replay__readouts">
          <Readout number="01" label="Delayed now" value={`${backlog.toLocaleString()} TEU`} />
          <Readout number="02" label="Lanes in motion" value={String(activeLaneCount).padStart(2, "0")} />
          <Readout number="03" label="Latest signal" value={latestEvent?.kind || "Awaiting arrivals"} />
          <Readout number="04" label="Inspection" value={activeRoute?.shortLabel || "All ocean lanes"} />
        </div>

        <section className="port-replay__hero-panel">
          <PanelHeading
            number="A"
            eyebrow="Temporal process flow"
            title="Cargo accumulates where time stretches"
            note="Each ribbon is a container cohort. Hover or click a ribbon to isolate its shipping lane."
          />
          <div className="port-replay__chart port-replay__process-chart">
            <ProcessSankey
              nodes={PORT_PROCESS_NODES}
              edges={processEdges}
              domain={PORT_REPLAY_DOMAIN}
              axisTicks={PORT_AXIS_TICKS}
              width={processWidth}
              height={430}
              margin={
                chartWidth <= 560
                  ? { top: 22, right: 18, bottom: 44, left: 70 }
                  : { top: 22, right: 92, bottom: 44, left: 104 }
              }
              colorBy="category"
              colorScheme={STAGE_COLORS}
              pairing="temporal"
              packing="off"
              laneOrder="crossing-min"
              ribbonLane="both"
              lifetimeMode="half"
              showLaneRails
              showLabels
              showLegend={chartWidth > 560}
              edgeOpacity={0.72}
              showParticles={playing}
              tooltip
              timeFormat={formatPortTime}
              valueFormat={(value) => `${value.toLocaleString()} TEU`}
              linkedHover={{ name: "port-route", fields: ["routeId"] }}
              onClick={clickDatum}
              chartId="port-process"
              accessibleTable
              description="Container cohorts moving through seven logistics stages over time."
              summary="The largest accumulations occur at anchorage and the terminal before cargo clears customs."
            />
          </div>
        </section>

        <div className="port-replay__split">
          <section className="port-replay__panel">
            <PanelHeading
              number="B"
              eyebrow="Geographic movement"
              title="Five corridors, five different points of failure"
              note="Each colored route is broken into real maritime legs. Cumulative departed volume sets width; particles indicate direction."
            />
            <div className="port-replay__itineraries" aria-label="Maritime route itineraries">
              {PORT_ROUTES.map((route) => (
                <button
                  type="button"
                  key={route.id}
                  className={
                    selectedRoute === route.id
                      ? "port-replay__itinerary is-active"
                      : "port-replay__itinerary"
                  }
                  style={{ "--route-color": route.color }}
                  onMouseEnter={() => setHoveredRoute(route.id)}
                  onMouseLeave={() => setHoveredRoute(null)}
                  onFocus={() => setHoveredRoute(route.id)}
                  onBlur={() => setHoveredRoute(null)}
                  onClick={() => toggleRoute(route.id)}
                >
                  <span className="port-replay__itinerary-origin">{route.shortLabel}</span>
                  <span className="port-replay__itinerary-waypoints">
                    {route.itinerary.join(" → ")}
                  </span>
                </button>
              ))}
            </div>
            <div className="port-replay__chart">
              <FlowMap
                nodes={mapNodes}
                flows={mapFlows}
                width={panelWidth}
                height={500}
                areas="land-110m"
                areaStyle={{ fill: "#102a31", stroke: "#31515a", strokeWidth: 0.45 }}
                graticule={{ stroke: "#29474f", strokeOpacity: 0.48 }}
                projection="equalEarth"
                fitPadding={0.05}
                flowStyle="basic"
                lineType="geo"
                valueAccessor="value"
                frameProps={FLOW_MAP_FRAME_PROPS}
                showParticles={playing}
                particleStyle={{
                  radius: 2.2,
                  opacity: 0.9,
                  speedMultiplier: 0.75,
                  spawnRate: 0.12,
                  maxPerLine: 28,
                  color: "source",
                }}
                tooltip={(hover) => {
                  const flow = unwrapDatum(hover)
                  if (!flow?.sourceName) return null
                  return (
                    <div className="semiotic-tooltip port-replay__route-tooltip">
                      <strong style={{ color: flow.color }}>{flow.route}</strong>
                      <span>{flow.sourceName} → {flow.targetName}</span>
                      <small>Corridor: {flow.bottleneck}</small>
                      <b>{flow.value.toLocaleString()} TEU departed</b>
                    </div>
                  )
                }}
                linkedHover={{ name: "port-route", fields: ["routeId"] }}
                onObservation={observeRoute}
                onClick={clickDatum}
                chartId="port-map"
                accessibleTable
                description="Five global shipping corridors to Newark, segmented through named maritime waypoints and chokepoints."
              />
            </div>
          </section>

          <section className="port-replay__panel">
            <PanelHeading
              number="C"
              eyebrow="Imperative event stream"
              title="Every arrival adds pressure; every release removes it"
              note="Daily net changes keep the cumulative queue readable. They arrive through push, update, and remove rather than a data prop."
            />
            <div className="port-replay__chart">
              <RealtimeWaterfallChart
                key={`port-backlog-${docsTheme}`}
                ref={waterfallRef}
                width={panelWidth}
                height={420}
                timeAccessor="time"
                valueAccessor="value"
                timeExtent={PORT_REPLAY_DOMAIN}
                pointIdAccessor="id"
                windowSize={40}
                positiveColor="#ff7043"
                negativeColor="#36d6b3"
                connectorStroke="#ffd166"
                connectorWidth={1.8}
                gap={3}
                stroke="#d7cbae"
                strokeWidth={0.5}
                opacity={0.96}
                background="#0a1d23"
                showAxes
                enableHover
                annotations={peakAnnotation}
                tooltipContent={(hover) => {
                  const event = unwrapDatum(hover)
                  if (!event?.time) return null
                  return (
                    <div className="semiotic-tooltip port-replay__event-tooltip">
                      <strong>{formatPortTime(event.time)}</strong>
                      <span>
                        {event.value >= 0 ? "+" : ""}
                        {event.value.toLocaleString()} TEU
                      </span>
                      <small>
                        Net of {event.signalCount} operational {event.signalCount === 1 ? "signal" : "signals"}
                      </small>
                    </div>
                  )
                }}
                tickFormatTime={(value) =>
                  new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(value)
                }
                tickFormatValue={(value) => `${Math.round(value)} TEU`}
                linkedHover={{ name: "port-route", fields: ["routeId"] }}
                onObservation={observeRoute}
                chartId="port-backlog"
              />
            </div>
          </section>
        </div>

        <section className="port-replay__manifest">
          <div className="port-replay__manifest-copy">
            <span>Manifest analysis / Form 04</span>
            <h3>The longest hauls wait the least</h3>
            <p>
              Fifteen cohorts, frozen and measured four ways — the one panel
              here with no clock. Read down the sea-days column: CO₂ climbs
              with every extra day at sea, as the fuel burn demands. The wait
              runs the other way. The month-long haulers from Singapore and
              Mumbai meter in and berth almost on arrival, while the quick
              Atlantic hops from Rotterdam and Santos pile into the anchorage.
              One lane refuses the pattern — Shanghai sits mid-ocean yet waits
              the longest of all. The queue at Newark doesn&rsquo;t care how
              far a box came. Hover any dot to trace one cohort through all six
              pairings.
            </p>
            <dl>
              <div><dt>Sea days</dt><dd>11 – 33</dd></div>
              <div><dt>Anchorage wait</dt><dd>25 – 82 hrs</dd></div>
              <div><dt>CO₂</dt><dd>34 – 81 t</dd></div>
              <div><dt>Cohort size</dt><dd>374 – 720 TEU</dd></div>
            </dl>
          </div>
          <div className="port-replay__matrix">
            <ScatterplotMatrix
              data={PORT_COHORT_SUMMARIES}
              fields={["seaDays", "anchorageHours", "carbonTons", "teu"]}
              fieldLabels={{
                seaDays: "Sea days",
                anchorageHours: "Anchorage wait",
                carbonTons: "CO₂ tonnes",
                teu: "Cohort TEU",
              }}
              colorBy="route"
              colorScheme={ROUTE_COLORS}
              cellSize={matrixCellSize}
              cellGap={3}
              pointRadius={4}
              pointOpacity={0.82}
              diagonal="histogram"
              histogramBins={6}
              brushMode="crossfilter"
              hoverMode
              unselectedOpacity={0.12}
              showGrid
              tooltip
              showLegend
              idAccessor="label"
              onObservation={observeRoute}
              chartId="port-matrix"
              className="port-replay__matrix-chart"
            />
          </div>
        </section>

        <footer className="port-replay__footer">
          <span>Seeded documentary simulation</span>
          <p>
            The cohorts are synthetic and deterministic. They are designed to
            expose the relationship between transit, dwell, backlog, cost, and
            carbon without depending on a live commercial feed.
          </p>
        </footer>
      </div>

      <section className="port-replay__implementation">
        <h2>One event model, four frame families</h2>
        <p>
          ProcessSankey and FlowMap receive declaratively derived snapshots.
          RealtimeWaterfallChart is synchronized through its imperative
          changeset API, while ScatterplotMatrix holds all fifteen cohorts
          still for a clock-free, four-measure comparison. The shared route
          identifier coordinates observation and selection across all four.
        </p>
        <CodeBlock code={implementationCode} language="jsx" />
      </section>
    </ExamplePageLayout>
  )
}

function Readout({ number, label, value }) {
  return (
    <div className="port-replay__readout">
      <span>{number}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

function PanelHeading({ number, eyebrow, title, note }) {
  return (
    <header className="port-replay__panel-heading">
      <span>{number}</span>
      <div>
        <small>{eyebrow}</small>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
    </header>
  )
}

function unwrapDatum(datum) {
  return datum?.data || datum?.datum || datum
}

function findRouteId(datum) {
  const value = unwrapDatum(datum)
  return (
    value?.routeId ||
    value?.edge?.routeId ||
    value?.source?.routeId ||
    value?.target?.routeId ||
    null
  )
}
