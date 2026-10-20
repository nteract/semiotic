import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { EventDropChart, buildEventDropPhysics } from "semiotic/physics"
import type {
  EventDropChartHandle,
  EventDropProjectionMetadata,
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult,
} from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  createEmitterPlayground,
  EMISSION_SECONDS,
  RUN_SECONDS,
  TRAVEL_SECONDS,
  WINDOW_SECONDS,
} from "./emitterPlaygroundModel"
import "./emitterPlayground.css"

const WINDOWS = { size: WINDOW_SECONDS }
// Reserve the window beginning at 25s; emission stops before it is needed.
const EXTENT: [number, number] = [0, 25]
const seconds = (value: number) => `${value.toFixed(1)}s`

function EmitterRun({
  rate,
  delay,
  path,
}: {
  rate: number
  delay: number
  path: "straight" | "connector"
}) {
  const model = useMemo(() => createEmitterPlayground(rate, delay), [rate, delay])
  const chart = useRef<EventDropChartHandle>(null)
  const lastPhysicsTime = useRef(0)
  const lastReadoutTime = useRef(-1)
  const [reading, setReading] = useState(() => model.read())
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [width, hostRef] = useResponsiveWidth(250, 1100) as [
    number,
    React.RefObject<HTMLDivElement | null>,
  ]
  const sources = useMemo(
    () => [
      {
        id: "p1",
        label: "Emitter",
        color: "#2563eb",
        active,
        description: "Toggle the single event source. Events already travelling continue.",
      },
    ],
    [active],
  )
  const arrival = useMemo(
    () => ({
      mode: "travel" as const,
      durationMs: TRAVEL_SECONDS * 1000,
      path,
    }),
    [path],
  )
  const rail = useMemo(
    () => ({
      side: width < 600 ? ("top" as const) : ("left" as const),
      tileSize: width < 600 ? 64 : 100,
    }),
    [width],
  )
  const watermark = useMemo(() => ({ value: reading.watermark }), [reading.watermark])
  const height = width < 600 ? 390 : 350
  const geometry = useMemo(
    () =>
      buildEventDropPhysics({
        data: [],
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        sources,
        sourceRail: rail,
        timeExtent: EXTENT,
        timeUnit: "s",
        windows: WINDOWS,
        watermark,
        size: [width, height],
        ballRadius: 6,
        seed: 42,
      }).metadata as unknown as EventDropProjectionMetadata,
    [sources, rail, watermark, width, height],
  )
  const { windowPlot, gutter, windowCount } = geometry
  const floor = windowPlot.y + windowPlot.height
  const laneWidth = windowPlot.width / windowCount
  const watermarkX =
    windowPlot.x +
    (Math.max(0, reading.watermark) / (windowCount * WINDOW_SECONDS)) * windowPlot.width
  const board = (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <path
        d={`M ${gutter.x} ${windowPlot.y + windowPlot.height * 0.48} V ${floor} H ${windowPlot.x + windowPlot.width}`}
        stroke="var(--text-secondary)"
        fill="none"
        strokeWidth={2}
      />
      {geometry.windowWalls?.map(({ id, ...wall }) => (
        <rect key={id} {...wall} fill="var(--text-secondary)" opacity={0.5} />
      ))}
      {Array.from({ length: windowCount }, (_, index) => (
        <g key={index}>
          <text
            x={windowPlot.x + (index + 0.5) * laneWidth}
            y={floor + 18}
            textAnchor="middle"
            fontSize={width < 600 ? 9 : 12}
            fill="var(--text-primary)"
          >
            {index * 5}–{(index + 1) * 5}s
          </text>
        </g>
      ))}
      {geometry.lidSegments.map((lid) => (
        <line
          key={lid.id}
          x1={lid.x1}
          y1={lid.y1}
          x2={lid.x2}
          y2={lid.y2}
          stroke="#ea580c"
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
      <text
        x={gutter.x + gutter.width / 2}
        y={floor + 18}
        textAnchor="middle"
        fontSize={11}
        fill="var(--text-primary)"
      >
        Late
      </text>
      <line
        x1={watermarkX}
        x2={watermarkX}
        y1={windowPlot.y + 5}
        y2={floor}
        stroke="#8b5cf6"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <text x={watermarkX + 5} y={windowPlot.y + 14} fontSize={10} fill="var(--text-primary)">
        Watermark {seconds(reading.watermark)}
      </text>
    </svg>
  )

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      setReducedMotion(media.matches)
      setPlaying(false)
    }
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const observe = useCallback(
    (result: PhysicsPipelineTickResult, controls: PhysicsPipelineControlSurface) => {
      const delta = Math.max(0, result.elapsedSeconds - lastPhysicsTime.current)
      lastPhysicsTime.current = result.elapsedSeconds
      const arrivalsChanged = model.observe(controls.readBodies())
      const incoming = reducedMotion ? [] : model.advance(delta, active)
      if (incoming.length) chart.current?.pushMany(incoming)
      const next = model.read()
      if (arrivalsChanged || incoming.length || next.time - lastReadoutTime.current >= 0.1) {
        lastReadoutTime.current = next.time
        setReading(next)
      }
      if (next.complete) {
        controls.pause()
        setPlaying(false)
      }
    },
    [model, active, reducedMotion],
  )

  const step = () => {
    const incoming = model.advance(1, active)
    if (incoming.length) chart.current?.pushMany(incoming)
    setReading(model.read())
  }
  const sendOlder = () => {
    const row = model.sendOlder()
    if (row) chart.current?.push(row)
    setReading(model.read())
  }
  const status = reading.complete
    ? "Run complete"
    : reducedMotion
      ? "Step through the stream"
      : playing
        ? reading.time >= EMISSION_SECONDS
          ? "Finishing arrivals"
          : "Running"
        : reading.time === 0
          ? "Ready to emit"
          : "Paused"

  return (
    <section
      className="emitter-demo"
      aria-label="Single emitter playground"
      data-testid="emitter-demo"
    >
      <div className="emitter-demo__toolbar">
        <div className="emitter-demo__buttons">
          {reducedMotion ? (
            <button className="emitter-demo__primary" onClick={step} disabled={reading.complete}>
              Advance 1 second
            </button>
          ) : (
            <button
              className="emitter-demo__primary"
              onClick={() => setPlaying(!playing)}
              disabled={reading.complete}
            >
              {playing ? "Pause" : reading.time === 0 ? "Start emitter" : "Resume"}
            </button>
          )}
          <button
            onClick={sendOlder}
            disabled={!reading.canSendOlder || (!playing && !reducedMotion)}
          >
            Send older event
          </button>
        </div>
        <span role="status">
          {status} · <span data-testid="emitter-clock">{seconds(reading.time)}</span> /{" "}
          {RUN_SECONDS}s
        </span>
      </div>
      <div className="emitter-demo__metrics">
        <div>
          <span>Producer time</span>
          <strong>{seconds(reading.time)}</strong>
        </div>
        <div>
          <span>Watermark</span>
          <strong data-testid="emitter-watermark">{seconds(reading.watermark)}</strong>
        </div>
        <div>
          <span>Travelling</span>
          <strong data-testid="emitter-travelling">{reading.travelling}</strong>
        </div>
        <div>
          <span>Accepted</span>
          <strong data-testid="emitter-accepted">{reading.accepted}</strong>
        </div>
        <div>
          <span>Late</span>
          <strong data-testid="emitter-late">{reading.late}</strong>
        </div>
      </div>
      <div ref={hostRef} className="emitter-demo__chart" data-testid="emitter-chart">
        <EventDropChart
          ref={chart}
          sources={sources}
          sourceRail={rail}
          onSourceClick={() => setActive((value) => !value)}
          arrival={arrival}
          timeUnit="s"
          timeExtent={EXTENT}
          windows={WINDOWS}
          watermark={watermark}
          watermarkAtArrivalAccessor="watermarkAtArrival"
          size={[width, height]}
          ballRadius={6}
          seed={42}
          paused={reducedMotion ? false : !playing}
          showProjection={false}
          accessibleTable={false}
          title="One emitter, six event-time windows"
          description="Blue events travel from the source into five-second windows. Older orange events roll off closed lids into the late bin. Click the emitter to turn it on or off."
          summary={`${reading.accepted} accepted, ${reading.late} late, ${reading.travelling} travelling. The table below counts events when they reach the board.`}
          tooltip={(datum) => (
            <div className="emitter-demo__tooltip">
              <strong>Event {String(datum.id)}</strong>
              <span>Event time: {seconds(Number(datum.eventTime))}</span>
              <span>Window: {String(datum.windowId)}s</span>
              <span>Phase: {String(datum.__phase)}</span>
              <span>
                {datum.late ? "Route: late bin · window already closed" : "Route: event-time window"}
              </span>
            </div>
          )}
          frameProps={{
            continuous: !reducedMotion && playing,
            onTick: observe,
            background: "var(--surface-1)",
            foregroundGraphics: board,
            bodyStyle: (body) => ({
              fill: (body.datum as { older?: boolean })?.older ? "#ea580c" : "#2563eb",
              opacity: 1,
              fillOpacity: 1,
            }),
          }}
        />
      </div>
      <div className="emitter-demo__caption">
        <span>
          <i className="emitter-demo__dot" /> Current events
        </span>
        <span>
          <i className="emitter-demo__dot emitter-demo__dot--older" /> Older event (time 1s)
        </span>
        <span>Click the emitter to turn it {active ? "off" : "on"}.</span>
      </div>
      <p className="emitter-demo__hint">
        {reducedMotion
          ? "Reduced motion: advance the clock one second at a time. Each batch appears settled."
          : "Pause to inspect a travelling event. The clock and every journey stop together."}{" "}
        Once the 0–5s window closes, send an older event and watch it take the late route.
      </p>
      <div className="emitter-demo__table-wrap">
        <table aria-label="Arrived event counts by window">
          <thead>
            <tr>
              <th scope="col">Window</th>
              <th scope="col">State</th>
              <th scope="col">Accepted</th>
              <th scope="col">Late</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, index) => {
              const start = index * WINDOW_SECONDS
              const end = start + WINDOW_SECONDS
              const row = reading.rows.find((item) => item.start === start)
              const closed = end <= reading.watermark
              return (
                <tr key={start} data-closed={closed}>
                  <th scope="row">
                    {start}–{end}s
                  </th>
                  <td>{closed ? "Closed" : "Open"}</td>
                  <td>{row?.accepted ?? 0}</td>
                  <td>{row?.late ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="emitter-demo__conservation" data-testid="emitter-conservation">
        {reading.emitted} emitted = {reading.travelling} travelling + {reading.accepted} accepted +{" "}
        {reading.late} late
      </p>
    </section>
  )
}

export default function EmitterPlaygroundPage() {
  const [rate, setRate] = useState(2)
  const [delay, setDelay] = useState(3)
  const [path, setPath] = useState<"straight" | "connector">("straight")
  const [run, setRun] = useState(0)
  return (
    <ExamplePageLayout
      title="One emitter, six windows"
      showContractPanels={false}
      prevPage={undefined}
      nextPage={undefined}
    >
      <p className="emitter-intro">
        An event leaves its source, travels to the board, and drops into the window for its event
        time. As newer events arrive, the watermark advances and closes older windows.
      </p>
      <div className="emitter-settings" aria-label="Stream settings">
        <label>
          Events per second
          <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {[1, 2, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Watermark delay
          <select value={delay} onChange={(event) => setDelay(Number(event.target.value))}>
            {[3, 6, 10].map((value) => (
              <option key={value} value={value}>
                {value} seconds
              </option>
            ))}
          </select>
        </label>
        <label>
          Travel path
          <select value={path} onChange={(event) => setPath(event.target.value as typeof path)}>
            <option value="straight">Straight</option>
            <option value="connector">Connector</option>
          </select>
        </label>
        <button onClick={() => setRun((value) => value + 1)}>New run</button>
        <small>Changing a setting starts a fresh run.</small>
      </div>
      <EmitterRun key={`${rate}-${delay}-${path}-${run}`} rate={rate} delay={delay} path={path} />
      <div className="emitter-notes">
        <div>
          <h2>What to try</h2>
          <p>
            Start the emitter, pause mid-flight, then resume. Turn the source off: existing events
            finish their journeys. Send an older event after a lid closes, then try a longer
            watermark delay in a new run.
          </p>
        </div>
        <div>
          <h2>How it works</h2>
          <p>
            The watermark is the newest event time to reach the board minus your chosen delay. A
            window closes when the watermark reaches its end. Counts come from the admission ledger,
            not from the pile's height.
          </p>
        </div>
      </div>
      <p className="emitter-footnote">
        A small, bounded study inspired by{" "}
        <a href="https://flink-watermarks.wtf/">Flink Watermarks…WTF?</a>. The emitter runs for{" "}
        {EMISSION_SECONDS} simulated seconds, then lets its last events finish. Window retirement
        and an unbounded following board are still in progress. See the{" "}
        <Link to="/charts/event-drop-chart#arrival-travel">arrival API</Link> or the{" "}
        <Link to="/examples/watermarks">full watermarks explainer</Link>.
      </p>
    </ExamplePageLayout>
  )
}
