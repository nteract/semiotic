import React, { useId } from "react"

const REGION_COLORS = {
  Americas: "#e8a85f",
  Europe: "#65a9a3",
  Asia: "#9f8ec4",
  Africa: "#d97864",
  Oceania: "#7f9fc8",
}

export default function JourneyFingerprint({
  title,
  selected = false,
  onSelect,
  reachExtent,
  spanExtent,
}) {
  const id = useId()
  const width = 560
  const height = 222
  const left = 108
  const right = 16
  const plotWidth = width - left - right
  const maxReach = reachExtent ?? Math.max(1, ...title.weeklyReach.map((week) => week.countryCount))
  const maxArrival = Math.max(1, ...title.arrivalByWeek.map((week) => week.countryCount))
  const maxPersistence = Math.max(1, ...title.persistenceBands.map((band) => band.count))
  const span = Math.max(1, (spanExtent ?? title.spanWeeks) - 1)
  const reachPath = title.weeklyReach
    .map((week, index) => {
      const x = left + (week.elapsedWeek / span) * plotWidth
      const y = 18 + (1 - week.countryCount / maxReach) * 40
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const regionTotal = Math.max(
    1,
    title.regionReach.reduce((sum, region) => sum + region.countryCount, 0),
  )
  let regionCursor = left

  const figure = (
    <figure
      className={`hat-fingerprint ${selected ? "is-selected" : ""}`}
      aria-labelledby={`${id}-title ${id}-description`}
    >
      <figcaption>
        <span>{title.archetype}</span>
        <strong id={`${id}-title`}>{title.label}</strong>
        <small>{title.note}</small>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-svg-title ${id}-description`}
      >
        <title id={`${id}-svg-title`}>{`${title.label} journey fingerprint`}</title>
        <desc id={`${id}-description`}>
          {title.label} appeared in {title.observedCountryCount} countries across{" "}
          {title.activeWeeks}
          active weeks. Its two-week simultaneity was {Math.round(title.simultaneity * 100)}{" "}
          percent, median country persistence was {title.medianPersistence} weeks, and it had{" "}
          {title.activeRuns.length}
          active runs.
        </desc>

        <BandLabel y={38} label="WEEKLY REACH" />
        <line className="hat-fingerprint-baseline" x1={left} x2={width - right} y1="58" y2="58" />
        <path className="hat-fingerprint-reach" d={reachPath} />
        <text className="hat-fingerprint-value" x={width - right} y="22" textAnchor="end">
          peak {title.peakWeeklyReach}
        </text>

        <BandLabel y={87} label="FIRST ARRIVALS" />
        <line className="hat-fingerprint-baseline" x1={left} x2={width - right} y1="101" y2="101" />
        {title.arrivalByWeek.map((arrival) => {
          const x = left + (arrival.elapsedWeek / span) * plotWidth
          const barHeight = 4 + (arrival.countryCount / maxArrival) * 24
          return (
            <rect
              key={arrival.elapsedWeek}
              className="hat-fingerprint-arrival"
              x={x - Math.max(1.5, plotWidth / title.spanWeeks / 2)}
              y={101 - barHeight}
              width={Math.max(3, Math.min(12, plotWidth / title.spanWeeks))}
              height={barHeight}
            />
          )
        })}

        <BandLabel y={127} label="REGIONAL REACH" />
        {title.regionReach.map((region) => {
          const regionWidth = (region.countryCount / regionTotal) * plotWidth
          const x = regionCursor
          regionCursor += regionWidth
          return regionWidth > 0 ? (
            <rect
              key={region.region}
              x={x}
              y="116"
              width={regionWidth}
              height="14"
              fill={REGION_COLORS[region.region]}
            />
          ) : null
        })}

        <BandLabel y={159} label="PERSISTENCE" />
        {title.persistenceBands.map((band, index) => {
          const slotWidth = plotWidth / title.persistenceBands.length
          const barWidth = Math.max(10, slotWidth - 8)
          const barHeight = 4 + (band.count / maxPersistence) * 18
          return (
            <g key={band.id}>
              <rect
                className="hat-fingerprint-persistence"
                x={left + index * slotWidth + 4}
                y={165 - barHeight}
                width={barWidth}
                height={barHeight}
              />
              <text
                className="hat-fingerprint-tick"
                x={left + index * slotWidth + slotWidth / 2}
                y="178"
                textAnchor="middle"
              >
                {band.label}
              </text>
            </g>
          )
        })}

        <BandLabel y={205} label="ACTIVE RUNS" />
        <line className="hat-fingerprint-baseline" x1={left} x2={width - right} y1="200" y2="200" />
        {title.activeRuns.map((run, index) => {
          const x1 = left + (run.start / span) * plotWidth
          const x2 = left + (run.end / span) * plotWidth
          return (
            <line
              key={`${run.start}-${run.end}`}
              className="hat-fingerprint-run"
              x1={x1}
              x2={Math.max(x1 + 3, x2)}
              y1={197 + (index % 2) * 6}
              y2={197 + (index % 2) * 6}
            />
          )
        })}
      </svg>
      <div className="hat-fingerprint-metrics">
        <span>
          <strong>{title.observedCountryCount}</strong> countries
        </span>
        <span>
          <strong>{Math.round(title.simultaneity * 100)}%</strong> in weeks 1–2
        </span>
        <span>
          <strong>{title.medianPersistence}</strong> median weeks
        </span>
        <span>
          <strong>{title.activeRuns.length}</strong> run{title.activeRuns.length === 1 ? "" : "s"}
        </span>
      </div>
      {onSelect ? (
        <button type="button" onClick={() => onSelect(title.id)}>
          Explore this title
        </button>
      ) : null}
    </figure>
  )

  return figure
}

function BandLabel({ y, label }) {
  return (
    <text className="hat-fingerprint-label" x="0" y={y}>
      {label}
    </text>
  )
}
