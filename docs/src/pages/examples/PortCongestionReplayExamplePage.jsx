import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ProcessSankey,
  RealtimeWaterfallChart,
  ScatterplotMatrix,
  useSyncedPushData,
} from "semiotic"
import { FlowMap } from "semiotic/geo"
import { unwrapDatum } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  PORT_CORRIDORS,
  PORT_LOCATIONS,
  PORT_MATRIX_FIELDS,
  PORT_MATRIX_FIELD_LABELS,
  PORT_MATRIX_ROWS,
  PORT_PROCESS_NODES,
  PORT_SCENARIOS,
  PORT_STAGE_COLOR_MAP,
  PORTWATCH_ATTRIBUTION,
  PORTWATCH_FETCHED_AT,
  axisTicksFor,
  cumulativeDeviation,
  domainFor,
  eventAnnotationsFor,
  flowsAtTime,
  formatPortDay,
  formatPortTime,
  gateForSelection,
  gateName,
  processEdgesAtTime,
  replayTimeForCursor,
  scenarioById,
  scenarioDays,
  transitsAt,
  waterfallSeriesFor,
} from "./data/portCongestionData"
import "./PortCongestionReplayExamplePage.css"

const SCENARIO_PAPER_COLORS = PORT_SCENARIOS.map((scenario) => scenario.paperColor)
const FLOW_MAP_FRAME_PROPS = {
  lineStyle: (flow) => ({
    stroke: flow.color || "#ff7043",
    strokeWidth: Math.max(1.6, Math.min(9.5, 1 + Math.sqrt(flow.value || 0) * 0.85)),
    strokeLinecap: "round",
    opacity: 0.85,
    fillOpacity: 0,
  }),
  pointStyle: (point) => {
    if (point.type === "origin") {
      return { fill: "#f5ecdc", stroke: "#07171d", strokeWidth: 1.2, r: 5 }
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

const implementationCode = `// Three real IMF PortWatch windows, one replay shell.
const [scenarioId, setScenarioId] = useState("everGiven")
const [cursor, setCursor] = useState(scenarioDays(scenarioId))
const currentTime = replayTimeForCursor(scenarioId, cursor)

// Declaratively derived snapshots of the selected scenario.
<FlowMap
  nodes={locations}
  flows={flowsAtTime(scenarioId, currentTime, selectedCorridor)}
  areas="land-110m"
/>

<ProcessSankey
  nodes={gates}
  edges={processEdgesAtTime(scenarioId, currentTime, selectedCorridor)}
  domain={domainFor(scenarioId)}
  pairing="temporal"
/>

// Deviation-from-pace bars mirrored through the imperative changeset API.
useSyncedPushData(waterfallRef, visibleDeviationRows, {
  id: "id",
  resetKey: \`\${scenarioId}:\${watchedGate}\`,
})

// The matrix holds every day of all three scenarios at once —
// clicking any point jumps the replay to that scenario and date.
<ScatterplotMatrix
  data={PORT_MATRIX_ROWS}
  fields={["suez", "babElMandeb", "capeOfGoodHope", "panama"]}
  colorBy="scenario"
  onClick={(row) => {
    setScenarioId(row.scenarioId)
    setCursor(row.dayIndex + 1)
  }}
/>`

export default function PortCongestionReplayExamplePage() {
  const [scenarioId, setScenarioId] = useState("everGiven")
  const [cursor, setCursor] = useState(() => scenarioDays("everGiven"))
  const [playing, setPlaying] = useState(false)
  const [selectedCorridor, setSelectedCorridor] = useState(null)
  const [hoveredCorridor, setHoveredCorridor] = useState(null)
  const waterfallRef = useRef(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(320, 1132)
  const [docsTheme] = useDocsTheme()

  const scenario = scenarioById(scenarioId)
  const days = scenarioDays(scenarioId)
  const activeCorridorId = selectedCorridor || hoveredCorridor
  const activeCorridor = PORT_CORRIDORS.find((corridor) => corridor.id === activeCorridorId)
  const currentTime = replayTimeForCursor(scenarioId, cursor)
  const cursorDay = Math.max(0, cursor - 1)
  const watchedGate = gateForSelection(scenarioId, activeCorridorId)

  const processEdges = useMemo(
    () => processEdgesAtTime(scenarioId, currentTime, activeCorridorId),
    [scenarioId, currentTime, activeCorridorId],
  )
  const mapFlows = useMemo(
    () => flowsAtTime(scenarioId, currentTime, activeCorridorId),
    [scenarioId, currentTime, activeCorridorId],
  )
  const mapNodes = useMemo(() => {
    if (!activeCorridor) return PORT_LOCATIONS
    const corridorNodeIds = new Set(activeCorridor.legs.flatMap((leg) => [leg.source, leg.target]))
    return PORT_LOCATIONS.filter((location) => corridorNodeIds.has(location.id))
  }, [activeCorridor])
  const deviationRows = useMemo(
    () => waterfallSeriesFor(scenarioId, watchedGate).slice(0, cursor),
    [scenarioId, watchedGate, cursor],
  )

  const transitsToday = transitsAt(scenarioId, watchedGate, cursorDay)
  const counterGate = scenario.counterGate === watchedGate ? scenario.focal : scenario.counterGate
  const counterToday = transitsAt(scenarioId, counterGate, cursorDay)
  const paceDeviation = cumulativeDeviation(scenarioId, watchedGate, cursorDay)
  const completedPercent = Math.round((cursor / days) * 100)
  const outerInset = chartWidth <= 560 ? 30 : Math.min(98, chartWidth * 0.08 + 2)
  const contentWidth = chartWidth - outerInset
  const processWidth = Math.max(280, contentWidth - (chartWidth <= 560 ? 26 : 42))
  const panelWidth = processWidth
  const matrixCellSize = Math.max(70, Math.min(128, Math.floor((contentWidth - 112) / 4)))

  const waterfallAnnotations = useMemo(() => {
    const annotations = eventAnnotationsFor(scenarioId)
    let running = 0
    let trough = null
    for (const row of deviationRows) {
      running += row.value
      if (!trough || running < trough.level) trough = { row, level: running }
    }
    if (trough && trough.level < -5) {
      annotations.push({
        type: "callout",
        time: trough.row.time,
        value: trough.level,
        label: `${Math.abs(Math.round(trough.level))} transits behind pace`,
        color: "#ffd166",
        dx: -46,
        dy: -36,
        connector: { end: "arrow" },
      })
    }
    return annotations
  }, [scenarioId, deviationRows])

  const matrixRanges = useMemo(
    () =>
      PORT_MATRIX_FIELDS.map((field) => {
        const values = PORT_MATRIX_ROWS.map((row) => row[field])
        return {
          field,
          label: PORT_MATRIX_FIELD_LABELS[field],
          min: Math.min(...values),
          max: Math.max(...values),
        }
      }),
    [],
  )

  useSyncedPushData(waterfallRef, deviationRows, {
    id: "id",
    resetKey: `${docsTheme}:${scenarioId}:${watchedGate}`,
  })

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= days) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 300)
    return () => window.clearInterval(timer)
  }, [playing, days])

  const replay = useCallback(() => {
    setCursor(1)
    setPlaying(true)
  }, [])

  const selectScenario = useCallback((nextScenarioId) => {
    setScenarioId(nextScenarioId)
    setCursor(scenarioDays(nextScenarioId))
    setPlaying(false)
  }, [])

  const toggleCorridor = useCallback((corridorId) => {
    setSelectedCorridor((current) => (current === corridorId ? null : corridorId))
  }, [])

  const observeCorridor = useCallback((observation) => {
    if (observation?.type === "hover") {
      const datum = unwrapDatum(observation.datum)
      if (datum?.corridorId) setHoveredCorridor(datum.corridorId)
    } else if (observation?.type === "hover-end") {
      setHoveredCorridor(null)
    }
  }, [])

  const clickDatum = useCallback(
    (datum) => {
      const corridorId = findCorridorId(datum)
      if (corridorId) toggleCorridor(corridorId)
    },
    [toggleCorridor],
  )

  // Click any point in the matrix to jump the replay to that scenario and date.
  const jumpToMatrixDay = useCallback((datum) => {
    const row = unwrapDatum(datum)
    if (!row?.scenarioId) return
    setScenarioId(row.scenarioId)
    setCursor(row.dayIndex + 1)
    setPlaying(false)
  }, [])

  return (
    <ExamplePageLayout title="The Long Way Around">
      <div className="port-replay" ref={chartHostRef}>
        <header className="port-replay__masthead">
          <div className="port-replay__mast-copy">
            <div className="port-replay__kicker">
              Global chokepoint monitor / IMF PortWatch replay
            </div>
            <h2>
              The long
              <br />
              way around
            </h2>
            <p>
              A quiet spring, a canal sealed shut by a single ship, and a crisis that pushed a trade
              lane around a continent. Every count below is an AIS-observed container-ship transit.
            </p>
          </div>
          <div
            className="port-replay__clock"
            aria-label={`Replay date ${formatPortTime(currentTime)}`}
          >
            <span>Replay date</span>
            <strong>{formatPortTime(currentTime)}</strong>
            <i>{String(completedPercent).padStart(3, "0")}%</i>
          </div>
        </header>

        <nav className="port-replay__scenarios" aria-label="Select scenario">
          {PORT_SCENARIOS.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              className={scenarioId === candidate.id ? "is-active" : ""}
              style={{ "--scenario-color": candidate.color }}
              onClick={() => selectScenario(candidate.id)}
            >
              <span className="port-replay__scenario-name">{candidate.label}</span>
              <span className="port-replay__scenario-dates">{candidate.dateline}</span>
            </button>
          ))}
        </nav>
        <p className="port-replay__scenario-blurb">{scenario.blurb}</p>

        <div className="port-replay__sticky-controls">
          <section className="port-replay__controls" aria-label="Replay controls">
            <div className="port-replay__transport">
              <button
                type="button"
                onClick={
                  playing
                    ? () => setPlaying(false)
                    : cursor >= days
                      ? replay
                      : () => setPlaying(true)
                }
              >
                {playing ? "Pause" : cursor >= days ? "Replay" : "Continue"}
              </button>
              <button
                type="button"
                className="port-replay__quiet-button"
                onClick={() => {
                  setPlaying(false)
                  setCursor(days)
                }}
              >
                End state
              </button>
            </div>
            <label className="port-replay__scrubber">
              <span>
                Day {cursor} / {days}
              </span>
              <input
                type="range"
                min="1"
                max={days}
                value={cursor}
                onChange={(event) => {
                  setPlaying(false)
                  setCursor(Number(event.target.value))
                }}
              />
            </label>
          </section>

          <nav className="port-replay__routes" aria-label="Filter corridor">
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
              <div>
                <button
                  type="button"
                  className={!selectedCorridor ? "is-active" : ""}
                  onClick={() => setSelectedCorridor(null)}
                >
                  All corridors
                </button>
                {PORT_CORRIDORS.map((corridor) => (
                  <button
                    type="button"
                    key={corridor.id}
                    className={selectedCorridor === corridor.id ? "is-active" : ""}
                    style={{ "--route-color": corridor.color }}
                    onMouseEnter={() => setHoveredCorridor(corridor.id)}
                    onMouseLeave={() => setHoveredCorridor(null)}
                    onFocus={() => setHoveredCorridor(corridor.id)}
                    onBlur={() => setHoveredCorridor(null)}
                    onClick={() => toggleCorridor(corridor.id)}
                  >
                    <span />
                    {corridor.shortLabel}
                  </button>
                ))}
              </div>
              <div>
                {PORT_SCENARIOS.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={scenarioId === candidate.id ? "is-active" : ""}
                    style={{ "--scenario-color": candidate.color, width: 200 }}
                    onClick={() => selectScenario(candidate.id)}
                  >
                    <span
                      style={{ fontSize: "10px", width: 200, background: "none", height: "auto" }}
                      className="port-replay__scenario-name"
                    >
                      {candidate.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="port-replay__readouts">
          <Readout
            number="01"
            label={`${gateName(watchedGate)} today`}
            value={`${transitsToday} ships`}
          />
          <Readout
            number="02"
            label="Vs pre-event pace"
            value={`${paceDeviation > 0 ? "+" : ""}${Math.round(paceDeviation).toLocaleString()} transits`}
          />
          <Readout
            number="03"
            label={`${gateName(counterGate)} today`}
            value={`${counterToday} ships`}
          />
          <Readout
            number="04"
            label="Inspection"
            value={activeCorridor?.label || "All corridors"}
          />
        </div>

        <section className="port-replay__hero-panel">
          <PanelHeading
            number="A"
            eyebrow="Temporal process flow"
            title="Traffic picks a lane, and the lanes trade places"
            note="Each ribbon is three days of real container-ship transits recorded at the downstream gate. Hover or click a ribbon to isolate its corridor."
          />
          <div className="port-replay__chart port-replay__process-chart">
            <ProcessSankey
              nodes={PORT_PROCESS_NODES}
              edges={processEdges}
              domain={domainFor(scenarioId)}
              axisTicks={axisTicksFor(scenarioId)}
              width={processWidth}
              height={430}
              margin={
                chartWidth <= 560
                  ? { top: 22, right: 18, bottom: 44, left: 70 }
                  : { top: 22, right: 132, bottom: 44, left: 104 }
              }
              colorBy="category"
              colorScheme={PORT_STAGE_COLOR_MAP}
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
              timeFormat={formatPortDay}
              valueFormat={(value) => `${value.toLocaleString()} ships`}
              linkedHover={{ name: "port-corridor", fields: ["corridorId"] }}
              onClick={clickDatum}
              chartId="port-process"
              accessibleTable
              description="Container-ship transits flowing through the Suez, Cape of Good Hope, and Panama lanes over time."
              summary={scenario.blurb}
            />
          </div>
        </section>

        <div className="port-replay__split">
          <section className="port-replay__panel">
            <PanelHeading
              number="B"
              eyebrow="Geographic movement"
              title="Three corridors, nine measured gates"
              note="Leg width is the trailing 7-day average of real daily container transits at the gate each leg crosses; particles indicate direction."
            />
            <div className="port-replay__itineraries" aria-label="Corridor itineraries">
              {PORT_CORRIDORS.map((corridor) => (
                <button
                  type="button"
                  key={corridor.id}
                  className={
                    selectedCorridor === corridor.id
                      ? "port-replay__itinerary is-active"
                      : "port-replay__itinerary"
                  }
                  style={{ "--route-color": corridor.color }}
                  onMouseEnter={() => setHoveredCorridor(corridor.id)}
                  onMouseLeave={() => setHoveredCorridor(null)}
                  onFocus={() => setHoveredCorridor(corridor.id)}
                  onBlur={() => setHoveredCorridor(null)}
                  onClick={() => toggleCorridor(corridor.id)}
                >
                  <span className="port-replay__itinerary-origin">{corridor.shortLabel}</span>
                  <span className="port-replay__itinerary-waypoints">
                    {corridor.itinerary.join(" → ")}
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
                      <strong style={{ color: flow.color }}>{flow.corridor}</strong>
                      <span>
                        {flow.sourceName} → {flow.targetName}
                      </span>
                      <small>Gate: {flow.gateName}</small>
                      <b>
                        {flow.today} today · {flow.value}/day past week
                      </b>
                    </div>
                  )
                }}
                linkedHover={{ name: "port-corridor", fields: ["corridorId"] }}
                onObservation={observeCorridor}
                onClick={clickDatum}
                chartId="port-map"
                accessibleTable
                description="Three global container corridors drawn through nine measured maritime chokepoints, with leg width showing real transit counts."
              />
            </div>
          </section>

          <section className="port-replay__panel">
            <PanelHeading
              number="C"
              eyebrow="Imperative event stream"
              title="Every lost transit is a ship waiting somewhere"
              note="Daily bars are real transits minus this scenario's own pre-event pace at the watched gate, so the running level reads as accumulated shortfall. Selecting a corridor moves the gauge to its gate."
            />
            <div className="port-replay__chart">
              <RealtimeWaterfallChart
                key={`port-backlog-${docsTheme}`}
                ref={waterfallRef}
                width={panelWidth}
                height={420}
                timeAccessor="time"
                valueAccessor="value"
                timeExtent={domainFor(scenarioId)}
                pointIdAccessor="id"
                windowSize={80}
                positiveColor="#36d6b3"
                negativeColor="#ff7043"
                connectorStroke="#ffd166"
                connectorWidth={1.8}
                gap={2}
                stroke="#d7cbae"
                strokeWidth={0.5}
                opacity={0.96}
                background="#0a1d23"
                showAxes
                enableHover
                annotations={waterfallAnnotations}
                tooltipContent={(hover) => {
                  const row = unwrapDatum(hover)
                  if (!row?.time) return null
                  return (
                    <div className="semiotic-tooltip port-replay__event-tooltip">
                      <strong>{formatPortTime(row.time)}</strong>
                      <span>
                        {row.value >= 0 ? "+" : ""}
                        {row.value.toLocaleString()} vs pace
                      </span>
                      <small>
                        {row.actual} transits at {row.gateName} · typical {row.baseline}/day
                      </small>
                    </div>
                  )
                }}
                tickFormatTime={(value) => formatPortDay(value)}
                tickFormatValue={(value) => `${Math.round(value)}`}
                chartId="port-backlog"
                description={`Waterfall of daily container transits at ${gateName(watchedGate)} relative to its pre-event pace: shortfall bars pull the running level down, recovery pushes it back.`}
              />
            </div>
          </section>
        </div>

        <section className="port-replay__manifest">
          <div className="port-replay__manifest-copy">
            <span>Cross-scenario analysis / Form 04</span>
            <h3>Three seasons in one square of days</h3>
            <p>
              Every dot is a real day — {PORT_MATRIX_ROWS.length} of them across all three
              scenarios, measured at four gates at once. The quiet spring is the tight cloud
              everything else is judged against. The Ever Given stretches only the Suez axis: six
              days slide toward zero and snap back, while the other three gates never notice — a
              one-gate accident. The Red Sea winter is a system event: Bab el-Mandeb and the Cape
              trade places along an anti-diagonal, the whole cloud walks away from normal and stays
              there, and Panama drifts low under drought at the same time. Click any dot to jump the
              replay to that scenario and day.
            </p>
            <dl>
              {matrixRanges.map((range) => (
                <div key={range.field}>
                  <dt>{range.label}</dt>
                  <dd>
                    {range.min} – {range.max}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="port-replay__matrix">
            <ScatterplotMatrix
              data={PORT_MATRIX_ROWS}
              fields={PORT_MATRIX_FIELDS}
              fieldLabels={PORT_MATRIX_FIELD_LABELS}
              colorBy="scenario"
              colorScheme={SCENARIO_PAPER_COLORS}
              cellSize={matrixCellSize}
              cellGap={3}
              pointRadius={3.4}
              pointOpacity={0.72}
              diagonal="histogram"
              histogramBins={8}
              brushMode="crossfilter"
              hoverMode
              unselectedOpacity={0.12}
              showGrid
              tooltip
              showLegend
              idAccessor="label"
              onClick={jumpToMatrixDay}
              chartId="port-matrix"
              className="port-replay__matrix-chart"
              description="Scatterplot matrix of every replayed day across all three scenarios, comparing daily container transits at Suez, Bab el-Mandeb, the Cape of Good Hope, and Panama, colored by scenario."
            />
          </div>
        </section>

        <footer className="port-replay__footer">
          <span>Real AIS-derived data</span>
          <p>
            {PORTWATCH_ATTRIBUTION} Extract dated {PORTWATCH_FETCHED_AT}. Transit counts, dates, and
            events are real; corridor geometry is an illustrative reduction of each lane to its
            measured gates.
          </p>
        </footer>
      </div>

      <section className="port-replay__implementation">
        <h2>Four frame families</h2>
        <p>
          ProcessSankey and FlowMap receive declaratively derived snapshots of the selected
          scenario. RealtimeWaterfallChart is synchronized through its imperative changeset API,
          while ScatterplotMatrix holds every day of all three scenarios at once for a clock-free
          comparison and doubles as a navigation surface. A shared corridor identifier coordinates
          observation and selection across the time-bound views.
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

function findCorridorId(datum) {
  const value = unwrapDatum(datum)
  return (
    value?.corridorId ||
    value?.edge?.corridorId ||
    value?.source?.corridorId ||
    value?.target?.corridorId ||
    null
  )
}
