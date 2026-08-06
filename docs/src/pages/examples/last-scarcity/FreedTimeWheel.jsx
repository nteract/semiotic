import React, { useCallback, useMemo, useState } from "react"
import { OrdinalCustomChart } from "semiotic/ordinal"
import {
  angleScale,
  hitTargetPoint,
  polarToXY,
  ringArcPath,
  unwrapDatum,
} from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import { TIME_CATEGORIES } from "./lastScarcityData"
import {
  ATUS_COMPARISON_PROFILES,
  ATUS_PROFILE_CATEGORIES,
} from "./atusProfiles"

const HOUR_ANGLE = angleScale([0, 24])
const FIXED_COLORS = {
  travel: "#bdc7b8",
  household: "#a8b699",
  meals: "#d5bd8d",
  media: "#b6aea4",
}

export default function FreedTimeWheel({ freedHours, allocation, onAllocationChange }) {
  const [width, hostRef] = useResponsiveWidth(300, 660)
  const [inspected, setInspected] = useState(null)
  const compact = width < 500
  const chartSize = Math.max(300, Math.min(compact ? 420 : 520, width))
  const rows = useMemo(
    () => buildDayRows(freedHours, allocation),
    [allocation, freedHours],
  )
  const flexible = rows.filter((row) => row.source === "reader")

  const nudge = useCallback((id, direction) => {
    const step = 0.5
    const current = allocation[id] ?? 0
    if (direction < 0 && current < step) return
    const next = { ...allocation }
    if (direction > 0) {
      const donor = Object.entries(next)
        .filter(([otherId, value]) => otherId !== id && value >= step)
        .sort((a, b) => b[1] - a[1])[0]
      if (!donor) return
      next[donor[0]] = roundHalf(donor[1] - step)
      next[id] = roundHalf(current + step)
    } else {
      const recipient = Object.entries(next)
        .filter(([otherId]) => otherId !== id)
        .sort((a, b) => b[1] - a[1])[0]
      if (!recipient) return
      next[recipient[0]] = roundHalf(recipient[1] + step)
      next[id] = roundHalf(current - step)
    }
    onAllocationChange(next)
  }, [allocation, onAllocationChange])

  const handleObservation = useCallback((event) => {
    if (event.type === "hover" && event.datum) setInspected(unwrapDatum(event.datum))
    if (event.type === "hover-end") setInspected(null)
  }, [])

  return (
    <div className="ls-time-wheel" ref={hostRef}>
      <div className="ls-time-wheel__stage">
        <OrdinalCustomChart
          data={rows}
          layout={freedTimeWheelLayout}
          layoutConfig={{ comparisonProfiles: ATUS_COMPARISON_PROFILES }}
          projection="radial"
          categoryAccessor="id"
          valueAccessor="hours"
          oExtent={rows.map((row) => row.id)}
          width={chartSize}
          height={chartSize}
          margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
          chartId="last-scarcity-freed-time-wheel"
          enableHover
          onObservation={handleObservation}
          accessibleTable
          description={`A circular 24-hour counterfactual day after ${freedHours} paid-work hours are removed. The reader’s freed-time allocation fills the released interval. Four faint outer rings show published 2025 ATUS duration compositions; their radial position does not encode time of day, and they are comparisons rather than predictions.`}
          summary={`${freedHours} released hours are currently distributed across ${flexible.filter((row) => row.hours > 0).length} reader-chosen activities. Sleep remains 8.5 hours and paid work is ${8 - freedHours} hours.`}
          tooltip={(datum) => {
            const row = unwrapDatum(datum)
            return row ? `${row.label}: ${formatHours(row.hours)} · ${row.start.toFixed(1)}–${row.end.toFixed(1)}` : null
          }}
          frameProps={{ background: "transparent" }}
        />
        <div className="ls-time-wheel__center" aria-hidden="true">
          <strong>{freedHours}h</strong>
          <span>released</span>
        </div>
      </div>

      <aside className="ls-time-wheel__inspector" aria-live="polite">
        <span>{inspected ? `${inspected.start.toFixed(1)}–${inspected.end.toFixed(1)}` : "Your counterfactual day"}</span>
        <strong>{inspected?.label ?? `${freedHours} hours no longer assigned by employment`}</strong>
        <p>{inspected ? `${formatHours(inspected.hours)} · ${inspected.source === "reader" ? "reader-created scenario" : "fixed day scaffold"}` : "Move half-hour intervals among the activities below. The total remains exactly one day."}</p>
      </aside>

      <div className="ls-time-allocation" aria-label="Freed time allocation controls">
        {flexible.map((row) => (
          <div key={row.id} className="ls-time-allocation__row">
            <span className="ls-time-allocation__swatch" style={{ background: row.color }} aria-hidden="true" />
            <span className="ls-time-allocation__label">{row.label}</span>
            <button type="button" onClick={() => nudge(row.id, -1)} disabled={row.hours < 0.5} aria-label={`Move 30 minutes away from ${row.label}`}>−</button>
            <output aria-label={`${row.label} hours`}>{formatHours(row.hours)}</output>
            <button type="button" onClick={() => nudge(row.id, 1)} aria-label={`Move 30 minutes to ${row.label}`}>+</button>
          </div>
        ))}
      </div>

      <div className="ls-observed-neighbors">
        <strong>Published ATUS comparison compositions</strong>
        <div>{ATUS_COMPARISON_PROFILES.map((profile, index) => <span key={profile.id}><i style={{ opacity: 0.2 + index * 0.12 }} />{profile.label}</span>)}</div>
        <p>These rings reproduce published average durations, not chronological diary sequences or predictions. Radial position does not encode time of day. Weekday and weekend profiles cover people age 15+; the other profiles cover adults age 18+ living with a household child. “Not employed” includes unemployed people and people outside the labor force.</p>
      </div>

      <details className="ls-data-fallback">
        <summary>Open the published ATUS comparison table</summary>
        <div className="ls-data-fallback__scroll">
          <table>
            <caption>Average hours per day by mutually exclusive parent activity category. Values are published BLS estimates.</caption>
            <thead>
              <tr>
                <th scope="col">Activity</th>
                {ATUS_COMPARISON_PROFILES.map((profile) => <th scope="col" key={profile.id}>{profile.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {ATUS_PROFILE_CATEGORIES.map((category, categoryIndex) => (
                <tr key={category.id}>
                  <th scope="row">{category.label}</th>
                  {ATUS_COMPARISON_PROFILES.map((profile) => <td key={profile.id}>{profile.publishedValues[categoryIndex].toFixed(2)}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Published total</th>
                {ATUS_COMPARISON_PROFILES.map((profile) => <td key={profile.id}>{profile.publishedSum.toFixed(2)}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
        <p>Rounding makes published columns total 23.99, 24.00, or 24.01 hours. For ring geometry only, the residual to 24 hours is applied to “Other”; the table preserves every published value. Sources: <a href="https://www.bls.gov/news.release/atus.t02.htm">BLS Table 2</a>, <a href="https://www.bls.gov/news.release/atus.t08B.htm">Table 8B</a>, and <a href="https://www.bls.gov/news.release/atus.t08C.htm">Table 8C</a>. ATUS records primary activities; major categories include related travel.</p>
      </details>
    </div>
  )
}

function buildDayRows(freedHours, allocation) {
  const flexibleMeta = TIME_CATEGORIES.filter((category) => !category.fixed)
  const rows = [
    { id: "sleep", label: "Sleep", hours: 8.5, color: "#aeb9ae", source: "scaffold" },
    { id: "travel", label: "Travel", hours: 0.75, color: FIXED_COLORS.travel, source: "scaffold" },
    {
      id: "work",
      label: "Paid work",
      hours: 8 - freedHours,
      color: "var(--ls-wheel-work, #213e34)",
      source: "scaffold",
    },
    { id: "household", label: "Household care", hours: 1.75, color: FIXED_COLORS.household, source: "scaffold" },
    { id: "meals", label: "Meals", hours: 1.25, color: FIXED_COLORS.meals, source: "scaffold" },
    ...flexibleMeta.map((category) => ({
      ...category,
      hours: roundHalf(allocation[category.id] ?? 0),
      source: "reader",
    })),
    { id: "media", label: "Passive media & other", hours: 3.75, color: FIXED_COLORS.media, source: "scaffold" },
  ]
  let cursor = 0
  return rows.map((row) => {
    const start = cursor
    cursor += row.hours
    return { ...row, start, end: cursor }
  })
}

function freedTimeWheelLayout(ctx) {
  if (!ctx.data.length) return { nodes: [] }

  const plot = ctx.dimensions.plot
  const radius = Math.min(plot.width, plot.height) * 0.31
  const inner = radius * 0.58
  const outer = radius
  const nodes = ctx.data
    .filter((row) => row.hours > 0)
    .map((row) => {
      const angle = HOUR_ANGLE((row.start + row.end) / 2)
      const point = polarToXY(angle, (inner + outer) / 2)
      return hitTargetPoint({
        x: point.x,
        y: point.y,
        r: Math.max(5, Math.min(14, (row.hours / 24) * radius * 2.4)),
        datum: row,
        id: `freed-time-${row.id}`,
      })
    })

  return {
    nodes,
    overlays: (
      <g transform={`translate(${plot.width / 2},${plot.height / 2})`} pointerEvents="none">
        <FreedTimeWheelOverlay
          rows={ctx.data}
          comparisonProfiles={ctx.config?.comparisonProfiles ?? []}
          inner={inner}
          outer={outer}
          radius={radius}
        />
      </g>
    ),
  }
}

function FreedTimeWheelOverlay({ rows, comparisonProfiles, inner, outer, radius }) {
  return (
    <g>
      <circle
        r={outer + 4}
        fill="var(--ls-chart-paper, #fffefa)"
        stroke="var(--ls-chart-rule, #d8ddd4)"
      />
      {comparisonProfiles.map((profile, profileIndex) => {
        let cursor = 0
        const ringInner = outer + 10 + profileIndex * 6
        return profile.segments.map((segment) => {
          const start = cursor
          cursor += segment.hours
          return (
            <path
              key={`${profile.id}-${segment.id}`}
              d={ringArcPath(HOUR_ANGLE(start), HOUR_ANGLE(Math.min(24, cursor)), ringInner, ringInner + 3.2)}
              fill={segment.color}
              opacity={0.18 + profileIndex * 0.06}
            />
          )
        })
      })}

      {[0, 6, 12, 18].map((hour) => {
        const innerPoint = polarToXY(HOUR_ANGLE(hour), inner - 8)
        const outerPoint = polarToXY(HOUR_ANGLE(hour), outer + 3)
        const labelPoint = polarToXY(HOUR_ANGLE(hour), outer + 34)
        return (
          <g key={hour}>
            <line
              x1={innerPoint.x}
              y1={innerPoint.y}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="var(--ls-chart-ink-soft, #697c70)"
              strokeWidth="0.8"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y + 3}
              textAnchor="middle"
              fill="var(--ls-chart-ink-soft, #657068)"
              fontSize="8"
              letterSpacing="0.6"
            >
              {String(hour).padStart(2, "0")}:00
            </text>
          </g>
        )
      })}

      {rows.filter((row) => row.hours > 0).map((row) => {
        const pad = Math.min(0.018, (row.hours / 24) * Math.PI)
        return (
          <path
            key={row.id}
            d={ringArcPath(HOUR_ANGLE(row.start) + pad, HOUR_ANGLE(row.end) - pad, inner, outer)}
            fill={row.color}
            stroke="var(--ls-chart-paper, #fffefa)"
            strokeWidth="1"
            opacity={row.source === "reader" ? 0.94 : 0.72}
          />
        )
      })}

      <circle
        r={inner - 2}
        fill="var(--ls-chart-paper, #fffefa)"
        stroke="var(--ls-chart-rule, #d9ddd4)"
        strokeWidth="0.8"
      />
      <path d={ringArcPath(0, Math.PI * 2, radius + 4, radius + 6)} fill="#557569" opacity="0.22" />
    </g>
  )
}

function roundHalf(value) {
  return Math.round(value * 2) / 2
}

function formatHours(value) {
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function allocationFromShares(shares, freedHours) {
  const ids = TIME_CATEGORIES.filter((category) => !category.fixed).map((category) => category.id)
  const raw = ids.map((id) => ({ id, exact: ((shares[id] ?? 0) / 100) * freedHours }))
  const rounded = Object.fromEntries(raw.map((row) => [row.id, Math.floor(row.exact * 2) / 2]))
  let remaining = Math.round((freedHours - Object.values(rounded).reduce((sum, value) => sum + value, 0)) * 2)
  const order = [...raw].sort((a, b) => (b.exact * 2 % 1) - (a.exact * 2 % 1))
  let cursor = 0
  while (remaining > 0 && order.length) {
    rounded[order[cursor % order.length].id] += 0.5
    remaining -= 1
    cursor += 1
  }
  return rounded
}
