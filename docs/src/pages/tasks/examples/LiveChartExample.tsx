import React, { useEffect, useRef, useState } from "react"
import { LineChart } from "semiotic/line"
import {
  connectLiveChart,
  createLiveSource,
  LIVE_EVENTS,
  liveChartProps,
  type LiveSource,
  type Observation,
} from "./live-chart"
import "./live-chart.css"

/** The optional source lets lifecycle tests inspect subscriptions directly. */
export function LiveChartSession({ source }: { source: LiveSource }) {
  const chartRef = useRef<React.ComponentRef<typeof LineChart>>(null)
  const [connected, setConnected] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [sourceCursor, setSourceCursor] = useState(source.cursor)
  const [display, setDisplay] = useState<{ rows: Observation[]; cursor: number }>({
    rows: [],
    cursor: 0,
  })

  useEffect(() => {
    if (!connected || !chartRef.current) return
    // Effects run after the child ref is available. Cleanup also handles
    // React StrictMode's setup/cleanup/setup cycle without duplicate listeners.
    return connectLiveChart(source, chartRef.current, (rows, cursor) => {
      setDisplay({ rows, cursor })
    })
  }, [source, connected])

  useEffect(() => {
    if (!playing || !connected) return
    const timer = window.setInterval(() => {
      const advanced = source.advance()
      setSourceCursor(source.cursor)
      if (!advanced || source.cursor === LIVE_EVENTS.length) setPlaying(false)
    }, 1_000)
    return () => window.clearInterval(timer)
  }, [source, playing, connected])

  function advance() {
    source.advance()
    setSourceCursor(source.cursor)
  }

  const finished = sourceCursor === LIVE_EVENTS.length
  const lag = sourceCursor - display.cursor
  return (
    <section className="task-live" aria-label="Live chart demonstration">
      <p>
        <strong>Synthetic fixture.</strong> Three readings start at 09:00–09:02. Five events include
        two corrections and three new observations. The line uses observation time; the event
        counter records processing order.
      </p>
      <div className="task-live__controls">
        <button type="button" onClick={advance} disabled={finished || playing}>
          Advance source
        </button>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          disabled={!connected || finished}
        >
          {playing ? "Pause replay" : "Play replay"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false)
            setConnected((value) => !value)
          }}
        >
          {connected ? "Disconnect" : "Reconnect"}
        </button>
      </div>
      <p role="status" aria-live="polite" data-testid="live-chart-status">
        {connected ? "Connected" : "Disconnected"}. Source event {sourceCursor} of{" "}
        {LIVE_EVENTS.length}; display through event {display.cursor}.{" "}
        {lag ? `${lag} unapplied event${lag === 1 ? "" : "s"}.` : "Display is current."}
      </p>
      <p>
        {finished ? "Replay complete." : `Next event: ${LIVE_EVENTS[sourceCursor].label}.`}
        {!connected &&
          " Advance the source while disconnected, then reconnect to replace the frozen display with the source’s current window."}
      </p>
      <div data-testid="live-chart-rendering">
        {/* No data prop: push mode remains active across control re-renders. */}
        <LineChart ref={chartRef} {...liveChartProps} height={320} responsiveWidth />
      </div>
      <div className="task-live__table">
        <table>
          <caption>Records currently retained by the chart</caption>
          <thead>
            <tr>
              <th scope="col">Record ID</th>
              <th scope="col">Observation time</th>
              <th scope="col">Reading (units)</th>
            </tr>
          </thead>
          <tbody>
            {display.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.id}</th>
                <td>09:{String(row.minute).padStart(2, "0")}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Retention: the four latest observations by event time. Corrections replace a retained record
        by ID; older observations are removed. A reconnect takes the current source window, so it
        can recover a missed correction without retaining a complete event history. At completion,
        expect obs-03 = 17, obs-04 = 20, obs-05 = 16 and obs-06 = 19.
      </p>
    </section>
  )
}

export default function LiveChartExample() {
  const [source, setSource] = useState(createLiveSource)
  const [session, setSession] = useState(0)
  function restart() {
    setSource(createLiveSource())
    setSession((value) => value + 1)
  }
  return (
    <>
      <LiveChartSession key={session} source={source} />
      <button type="button" onClick={restart}>
        Restart fixture
      </button>
    </>
  )
}
