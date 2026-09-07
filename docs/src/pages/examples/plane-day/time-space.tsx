import React from "react"
import type { CustomLayout } from "semiotic/xy"
import { daySummary, flightName } from "./format"
import { ribbonGeometry, scheduledFill } from "./layouts"
import type { AircraftDay } from "./types"

export function airportLanes(day: AircraftDay) {
  return [...new Set(day.flights.flatMap((f) => [f.raw.Origin, f.raw.Dest]))]
}

export const timeSpaceLayout: CustomLayout<{ day: AircraftDay; selected: string }> = ({
  dimensions,
  config: { day, selected },
  resolveColor,
  theme,
}) => {
  const { start, end, x } = ribbonGeometry(day, dimensions.width)
  const airports = airportLanes(day)
  const y = (airport: string) =>
    35 + (airports.indexOf(airport) * (dimensions.height - 70)) / Math.max(1, airports.length - 1)
  const nodes: ReturnType<CustomLayout>["nodes"] = []
  // Draw all schedules first so identical actual paths leave hatched edges visible.
  for (const kind of ["scheduled", "actual"] as const) {
    const halfWidth = kind === "scheduled" ? 7 : 3
    for (const [index, flight] of day.flights.entries()) {
      const departure = flight[kind === "scheduled" ? "scheduledDeparture" : "actualDeparture"]
      const arrival = flight[kind === "scheduled" ? "scheduledArrival" : "actualArrival"]
      if (departure === null || arrival === null || flight.issues.length) continue
      const previous = day.flights[index - 1]
      const previousArrival =
        previous?.[kind === "scheduled" ? "scheduledArrival" : "actualArrival"]
      if (
        previous &&
        !previous.issues.length &&
        previousArrival != null &&
        previousArrival <= departure &&
        previous.raw.Dest === flight.raw.Origin &&
        !day.breaks.some((b) => b.before === flight.id)
      ) {
        nodes.push({
          type: "rect",
          x: x(previousArrival),
          y: y(flight.raw.Origin) - halfWidth,
          w: x(departure) - x(previousArrival),
          h: halfWidth * 2,
          style: { fill: kind === "scheduled" ? scheduledFill : resolveColor(kind) },
          datum: { eventId: flight.id, kind, phase: "Ground interval before this flight" },
          _transitionKey: `${flight.id}:${kind}:ground`,
        })
      }
      nodes.push({
        type: "area",
        topPath: [
          [x(departure), y(flight.raw.Origin) - halfWidth],
          [x(arrival), y(flight.raw.Dest) - halfWidth],
        ],
        bottomPath: [
          [x(departure), y(flight.raw.Origin) + halfWidth],
          [x(arrival), y(flight.raw.Dest) + halfWidth],
        ],
        style: {
          fill: kind === "scheduled" ? scheduledFill : resolveColor(kind),
          stroke: flight.id === selected ? theme.semantic.text : "none",
          strokeWidth: flight.id === selected ? 1.8 : 0,
        },
        datum: [
          {
            eventId: flight.id,
            flight: flightName(flight),
            kind,
            departureUTC: new Date(departure).toISOString(),
            arrivalUTC: new Date(arrival).toISOString(),
          },
        ],
        _transitionKey: `${flight.id}:${kind}:flight`,
      })
    }
  }
  const ticks = Array.from({ length: 5 }, (_, i) => start + ((end - start) * i) / 4)
  return {
    nodes,
    overlays: (
      <g fontFamily="system-ui" fontSize={11} fill="#1e3346">
        {airports.map((airport) => (
          <g key={airport}>
            <line
              x1={0}
              x2={dimensions.width}
              y1={y(airport)}
              y2={y(airport)}
              stroke="#1e3346"
              opacity={0.15}
            />
            <text x={-10} y={y(airport) + 4} textAnchor="end">
              {airport}
            </text>
          </g>
        ))}
        {ticks.map((tick, index) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={0}
              y2={dimensions.height}
              stroke="#1e3346"
              opacity={0.1}
            />
            <text
              x={x(tick)}
              y={dimensions.height + 20}
              textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}
            >
              {new Date(tick).toISOString().slice(11, 16)}
            </text>
            <text
              x={x(tick)}
              y={dimensions.height + 35}
              textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}
            >
              {new Date(tick).toISOString().slice(5, 10)}
            </text>
          </g>
        ))}
      </g>
    ),
  }
}

export function timeSpaceProps(day: AircraftDay, selected: string) {
  return {
    data: day.flights.flatMap((f) =>
      ["scheduled", "actual"].map((kind) => ({ eventId: f.id, kind })),
    ),
    colorBy: "kind" as const,
    colorScheme: { scheduled: "#596674", actual: "#287a79" },
    showLegend: false,
    layout: timeSpaceLayout,
    layoutConfig: { day, selected },
    width: 850,
    height: Math.max(340, airportLanes(day).length * 85 + 85),
    margin: { left: 52, right: 20, top: 24, bottom: 65 },
    title: "One aircraft’s day",
    description:
      "Time runs left to right in UTC. Airport lanes are categorical, not geographic distance. Hatched bands trace scheduled gate-to-gate intervals; solid bands trace actual intervals. Horizontal stretches are ground intervals. The pinned flight is outlined. Unresolved continuity is never joined.",
    summary: daySummary(day),
    accessibleTable: true,
    enableHover: true,
  }
}
