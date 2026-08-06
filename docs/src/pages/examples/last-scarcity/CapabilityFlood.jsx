import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  RealtimeLineChart,
  RealtimeSwarmChart,
  TooltipRoot,
  useSyncedPushData,
} from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import { FLOOD_LENSES, FLOOD_SERIES } from "./lastScarcityData"

const KIND_COLORS = {
  capability: "var(--ls-series-capability, #315f55)",
  reach: "var(--ls-series-reach, #78906d)",
  ownership: "var(--ls-series-ownership, #9a5e67)",
  governance: "var(--ls-series-governance, #b08a52)",
}

const TIME_EXTENT = [new Date(Date.UTC(2019, 8, 1)), new Date(Date.UTC(2026, 2, 1))]

export default function CapabilityFlood({ active, reducedMotion }) {
  const [width, hostRef] = useResponsiveWidth(300, 720)
  const [lens, setLens] = useState("capability")
  // Show the finished series by default. Replay is opt-in so the section is
  // never empty while IntersectionObserver / autoplay timing lags.
  const [cursor, setCursor] = useState(FLOOD_SERIES.length)
  const [playing, setPlaying] = useState(false)
  const lineRef = useRef(null)
  const swarmRef = useRef(null)

  const prepared = useMemo(
    () => FLOOD_SERIES.map((row) => ({
      ...row,
      time: decimalYearToDate(row.year),
      score: row.kind === "governance" ? row.value - 50 : row.value - 15,
    })),
    [],
  )
  const displayed = useMemo(() => prepared.slice(0, cursor), [cursor, prepared])
  const lineData = useMemo(
    () => displayed.filter((row) => row.kind === "capability"),
    [displayed],
  )

  useSyncedPushData(lineRef, lineData, { id: "id", resetKey: "flood-line" })
  useSyncedPushData(swarmRef, displayed, { id: "id", resetKey: `flood-swarm-${lens}` })

  useEffect(() => {
    if (reducedMotion) {
      setCursor(prepared.length)
      setPlaying(false)
      return undefined
    }
    if (!playing) return undefined
    // Pause the clock if the section scrolls away mid-replay; resume when active.
    if (!active) return undefined
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= prepared.length) {
          setPlaying(false)
          return prepared.length
        }
        return current + 1
      })
    }, 420)
    return () => window.clearInterval(timer)
  }, [active, playing, prepared.length, reducedMotion])

  const replay = useCallback(() => {
    if (reducedMotion) {
      setCursor(prepared.length)
      setPlaying(false)
      return
    }
    setCursor(1)
    setPlaying(true)
  }, [prepared.length, reducedMotion])

  const pointStyle = useCallback((datum) => {
    const selected = datum.kind === lens
    return {
      fill: KIND_COLORS[datum.kind] ?? "var(--ls-chart-ink-soft, #6d756e)",
      stroke: selected
        ? "var(--ls-chart-ink, #1f3d35)"
        : "var(--ls-chart-paper, #fffefa)",
      strokeWidth: selected ? 2 : 0.8,
      opacity: selected ? 1 : 0.2,
      r: selected ? 5.5 : 3.4,
    }
  }, [lens])

  const selectedMeta = FLOOD_LENSES.find((item) => item.id === lens)
  const latest = displayed.at(-1)
  const chartWidth = Math.max(280, width)
  const isReplaying = playing && cursor < prepared.length

  return (
    <div ref={hostRef} className="ls-flood">
      <div className="ls-segmented" role="group" aria-label="Highlight events by question">
        {FLOOD_LENSES.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={lens === item.id}
            onClick={() => setLens(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ls-flood__status" aria-live="polite">
        <div>
          <span>{selectedMeta?.label ?? "Capability"}</span>
          <strong>{selectedMeta?.note}</strong>
        </div>
        <button type="button" onClick={replay} disabled={isReplaying}>
          {isReplaying ? "Playing…" : reducedMotion ? "Show full series" : "Play years in sequence"}
        </button>
      </div>

      <div className="ls-flood__charts">
        <figure>
          <figcaption>
            <span>Capability over time</span>
            <small>A storytelling index, not a single benchmark</small>
          </figcaption>
          <RealtimeLineChart
            ref={lineRef}
            size={[chartWidth, 205]}
            margin={{ top: 14, right: 16, bottom: 30, left: 42 }}
            timeAccessor="time"
            valueAccessor="value"
            pointIdAccessor="id"
            windowSize={40}
            timeExtent={TIME_EXTENT}
            valueExtent={[0, 100]}
            stroke={KIND_COLORS.capability}
            strokeWidth={2.6}
            enableHover
            tickFormatTime={(value) => String(new Date(value).getUTCFullYear())}
            tickFormatValue={(value) => String(Math.round(value))}
            tooltipContent={eventTooltip}
            emptyContent={false}
            background="transparent"
          />
        </figure>

        <figure>
          <figcaption>
            <span>Events under four questions</span>
            <small>Height is for spacing, not a shared scale</small>
          </figcaption>
          <RealtimeSwarmChart
            ref={swarmRef}
            size={[chartWidth, 196]}
            margin={{ top: 14, right: 16, bottom: 30, left: 42 }}
            timeAccessor="time"
            valueAccessor="score"
            pointIdAccessor="id"
            categoryAccessor="kind"
            colors={KIND_COLORS}
            pointStyle={pointStyle}
            windowSize={40}
            timeExtent={TIME_EXTENT}
            valueExtent={[-20, 85]}
            enableHover
            tickFormatTime={(value) => String(new Date(value).getUTCFullYear())}
            tickFormatValue={(value) => String(Math.round(value))}
            tooltipContent={eventTooltip}
            emptyContent={false}
            background="transparent"
          />
        </figure>
      </div>

      <div className="ls-flood__event" aria-live="polite">
        <span>{latest ? latest.time.getUTCFullYear() : "—"}</span>
        <strong>{latest?.event ?? "Series ready"}</strong>
        <small>{latest ? `${latest.kind} · ${cursor}/${prepared.length}` : ""}</small>
      </div>

      <div className="ls-jagged-frontier">
        <div>
          <span>CLOCKS · TWO MOVING LINES</span>
          <strong>50.6%</strong>
          <small>top model on analog clock reading</small>
        </div>
        <div className="ls-jagged-frontier__gap" aria-hidden="true">
          <i style={{ width: "50.6%" }} />
          <b style={{ left: "90.1%" }} />
        </div>
        <p>
          People still score about 90.1% on the same task. That gap is real, and it is not the whole
          story. The two numbers are not one race with a fixed human finish line. Models are
          climbing skills many people practice less: reading clock faces, sustained literacy,
          aesthetic judgment that is not outsourced to a feed. AI can get better at a craft while
          people get worse at it. The lines move independently.
        </p>
      </div>

      <details className="ls-data-fallback">
        <summary>Open these events as a table</summary>
        <table>
          <caption>Curated AI Index events used in this chapter</caption>
          <thead><tr><th>Year</th><th>Question</th><th>Display value</th><th>Event</th></tr></thead>
          <tbody>{prepared.map((row) => <tr key={row.id}><td>{row.time.getUTCFullYear()}</td><td>{row.kind}</td><td>{row.value}</td><td>{row.event}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}

function decimalYearToDate(year) {
  const whole = Math.floor(year)
  const month = Math.min(11, Math.round((year - whole) * 12))
  return new Date(Date.UTC(whole, month, 1))
}

function eventTooltip(hover) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  return (
    <TooltipRoot chrome="css" className="ls-chart-tooltip">
      <span>{datum.time?.getUTCFullYear?.()} · {datum.kind}</span>
      <strong>{datum.event}</strong>
    </TooltipRoot>
  )
}
