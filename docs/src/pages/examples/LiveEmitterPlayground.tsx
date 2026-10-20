import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EventDropChart, PhysicsPipelineStore } from "semiotic/physics"
import type {
  EventDropChartHandle,
  EventDropClock,
  PhysicsPipelineSnapshot,
  SyntheticSourceSpec,
} from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"

const patterns: SyntheticSourceSpec[] = [
  { id: "live-regular", ratePerSec: 3 },
  { id: "live-jitter", ratePerSec: 3, jitter: "watermarks" },
  { id: "live-burst", interval: 1500, burst: { min: 3, max: 6, gapMs: [1000, 2000], intraMs: 80 } },
]
const names = ["Regular", "Jittered", "Bursty"]
const colors = ["#2563eb", "#d97706", "#0f766e"]

function LiveRun({ three }: { three: boolean }) {
  const chart = useRef<EventDropChartHandle>(null)
  const saved = useRef<PhysicsPipelineSnapshot | null>(null)
  const [hasSaved, setHasSaved] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [rate, setRate] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [execution, setExecution] = useState<"sync" | "worker">("sync")
  const [actualExecution, setActualExecution] = useState("sync")
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [reading, setReading] = useState({
    time: 0,
    accepted: 0,
    late: 0,
    retained: 0,
    windows: 0,
    watermark: -Infinity,
  })
  const [width, hostRef] = useResponsiveWidth(250, 1100) as [
    number,
    React.RefObject<HTMLDivElement | null>,
  ]
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      setReduced(media.matches)
      if (media.matches) setPlaying(false)
    }
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  const specs = useMemo(() => (three ? patterns : patterns.slice(0, 1)), [three])
  const sources = useMemo(
    () =>
      specs.map((source, i) => ({
        id: source.id,
        label: names[i],
        color: colors[i],
        active: active[source.id] !== false,
      })),
    [specs, active],
  )
  const emitters = useMemo(() => ({ sources: specs, seed: 42, rate }), [specs, rate])
  const config = useMemo(() => ({ bodyLimit: 160, timeScale: speed }), [speed])
  const read = useCallback((clock?: EventDropClock) => {
    const handle = chart.current
    if (!handle) return
    const ledger = handle.getLedger()
    setReading({
      time: clock?.simTime ?? handle.getClock().simTime,
      accepted: ledger.reduce((n, row) => n + row.accepted, 0),
      late: ledger.reduce((n, row) => n + row.late, 0),
      windows: ledger.length,
      retained: handle.getData().length,
      watermark: handle.getWatermark(),
    })
  }, [])
  const advance = () => {
    const snapshot = chart.current?.snapshot()
    if (!snapshot) return
    const model = new PhysicsPipelineStore()
    model.restore(snapshot)
    model.setPaused(false)
    model.settleWithObservations(Math.round(1 / snapshot.config.fixedDt))
    model.setPaused(true)
    chart.current?.restore(model.snapshot())
    read()
  }
  return (
    <div className="emitter-demo" data-testid="live-emitter-demo">
      <div
        className="emitter-settings emitter-demo__live-controls"
        role="group"
        aria-label="Live stream settings"
      >
        {reduced ? (
          <button onClick={advance}>Advance live stream by one second</button>
        ) : (
          <button onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause live stream" : "Start live stream"}
          </button>
        )}
        <label>
          Live emission rate
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[0.5, 1, 2].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
        <label>
          Live simulation speed
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {[1, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
        <label>
          Simulation engine
          <select
            value={execution}
            onChange={(e) => setExecution(e.target.value as typeof execution)}
          >
            <option value="sync">Main thread</option>
            <option value="worker">Worker</option>
          </select>
        </label>
        <button
          onClick={() => {
            setPlaying(false)
            const snapshot = chart.current?.snapshot()
            if (snapshot) {
              saved.current = { ...snapshot, paused: true }
              chart.current?.restore(saved.current)
              setHasSaved(true)
              read()
            }
          }}
        >
          Save live snapshot
        </button>
        <button
          disabled={!hasSaved}
          onClick={() => {
            setPlaying(false)
            if (saved.current) chart.current?.restore(saved.current)
            read()
          }}
        >
          Restore live snapshot
        </button>
        <button
          onClick={() => {
            chart.current?.clear()
            read()
          }}
        >
          Reset live stream
        </button>
      </div>
      <div className="emitter-demo__metrics emitter-demo__live-metrics" aria-live="off">
        <span>
          Clock <strong data-testid="live-clock">{reading.time.toFixed(1)}s</strong>
        </span>
        <span>
          Accepted <strong data-testid="live-accepted">{reading.accepted}</strong>
        </span>
        <span>
          Late <strong data-testid="live-late">{reading.late}</strong>
        </span>
        <span>
          Retained bodies <strong data-testid="live-retained">{reading.retained}</strong> / 160
        </span>
        <span>
          Historical windows <strong data-testid="live-windows">{reading.windows}</strong>
        </span>
        <span>
          Execution <strong data-testid="live-execution">{actualExecution}</strong>
        </span>
      </div>
      <div ref={hostRef} data-testid="live-emitter-chart">
        <EventDropChart
          ref={chart}
          live={{ follow: "now", horizon: 5, retain: 15 }}
          emitters={emitters}
          sources={sources}
          sourceRail={{ side: width < 600 ? "top" : "left", tileSize: 70 }}
          onSourceClick={(source) =>
            setActive((old) => ({ ...old, [source.id]: old[source.id] === false }))
          }
          arrival={{ mode: "travel", durationMs: 700, path: "connector" }}
          windows={{ size: 2.5 }}
          watermark={{ delay: 1 }}
          timeUnit="s"
          size={[width, 400]}
          ballRadius={5}
          paused={!playing || reduced}
          onClockTick={read}
          onLedgerChange={() => read()}
          title="A continuous event-time stream"
          description="Events travel from the sources onto a moving board. Click a source to toggle it. Old bodies retire while the historical counts remain."
          summary={`${reading.accepted} accepted and ${reading.late} late events across ${reading.windows} historical windows; ${reading.retained} bodies retained.`}
          accessibleTable
          tooltip={(datum) => (
            <div className="emitter-demo__tooltip">
              <strong>Event {String(datum.id)}</strong>
              <span>Event time: {Number(datum.eventTime).toFixed(2)}s</span>
              <span>Window: {String(datum.windowId)}</span>
              <span>Phase: {String(datum.__phase)}</span>
              <span>{datum.late ? "Route: late bin" : "Route: event-time window"}</span>
            </div>
          )}
          frameProps={{
            config,
            simulationExecution: execution,
            background: "var(--surface-1)",
            onSimulationExecutionChange: (state) => setActualExecution(state.execution),
            bodyStyle: { opacity: 1, fillOpacity: 1 },
          }}
        />
      </div>
      <p className="emitter-demo__hint">
        The board follows simulation time and keeps 15 seconds of history visible. Retired windows
        remain in the accessible table. Save a snapshot, run ahead, and restore it to replay the
        same events and random sequence.
        {reduced && " Reduced motion advances in one-second batches."}
      </p>
    </div>
  )
}

export default function LiveEmitterPlayground() {
  const [three, setThree] = useState(false)
  return (
    <section aria-labelledby="live-stream-heading">
      <h2 id="live-stream-heading">Keep the stream running</h2>
      <p>
        This version runs without a time limit. Travel, admission, the camera and sources share the
        simulation clock.
      </p>
      <label>
        <input type="checkbox" checked={three} onChange={(e) => setThree(e.target.checked)} />{" "}
        Compare three producers (starts a new run)
      </label>
      <LiveRun key={String(three)} three={three} />
    </section>
  )
}
