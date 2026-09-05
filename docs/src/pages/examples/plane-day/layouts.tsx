import React from "react"
import type { CustomLayout } from "semiotic/xy"
import type { NetworkCustomLayout, NetworkSceneEdge } from "semiotic/network"
import { daySummary, flightName } from "./format"
import type { AircraftDay } from "./types"

export function ribbonGeometry(day: AircraftDay, width: number) {
  const values = day.flights
    .flatMap((f) => [
      f.scheduledDeparture,
      f.scheduledArrival,
      ...(!f.issues.length ? [f.actualDeparture, f.actualArrival] : []),
    ])
    .filter((v): v is number => v !== null)
  const fallback = Date.parse(`${day.date}T00:00:00Z`)
  const start = values.length ? Math.floor(Math.min(...values) / 3_600_000) * 3_600_000 : fallback
  const end = values.length
    ? Math.ceil(Math.max(...values) / 3_600_000) * 3_600_000
    : fallback + 86_400_000
  const x = (instant: number) => ((instant - start) / (end - start || 1)) * width
  return {
    start,
    end,
    x,
    rows: day.flights.map((flight, index) => ({ flight, y: index * 68 + 30 })),
  }
}

export const ribbonLayout: CustomLayout<{ day: AircraftDay; selected: string }> = ({
  dimensions,
  config,
  resolveColor,
  theme,
}) => {
  const geometry = ribbonGeometry(config.day, dimensions.width)
  const nodes = geometry.rows.flatMap(({ flight, y }) =>
    (["scheduled", "actual"] as const).flatMap((kind, index) => {
      const start = flight[kind === "scheduled" ? "scheduledDeparture" : "actualDeparture"]
      const end = flight[kind === "scheduled" ? "scheduledArrival" : "actualArrival"]
      if (start === null || end === null || (kind === "actual" && flight.issues.length)) return []
      const color = resolveColor(kind)
      return [
        {
          type: "rect" as const,
          x: geometry.x(start),
          y: y + index * 16,
          w: Math.max(1, geometry.x(end) - geometry.x(start)),
          h: 10,
          style: {
            fill: kind === "scheduled" ? "none" : color,
            stroke: flight.id === config.selected ? theme.semantic.text : color,
            strokeWidth: flight.id === config.selected ? 2.5 : 1,
          },
          datum: {
            eventId: flight.id,
            flight: flightName(flight),
            kind,
            startUTC: new Date(start).toISOString(),
            endUTC: new Date(end).toISOString(),
          },
          _transitionKey: `${flight.id}:${kind}`,
        },
      ]
    }),
  )
  const ticks: number[] = []
  for (let instant = geometry.start; instant <= geometry.end; instant += 4 * 3_600_000)
    ticks.push(instant)
  return {
    nodes,
    overlays: (
      <g fill={theme.semantic.text} fontFamily="monospace" fontSize={11}>
        {geometry.rows.map(({ flight, y }, index) => (
          <text key={flight.id} x={-12} y={y + 14} textAnchor="end">
            {index + 1}. {flight.raw.Origin} → {flight.raw.Dest}
          </text>
        ))}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={geometry.x(tick)}
              x2={geometry.x(tick)}
              y1={0}
              y2={dimensions.height - 12}
              stroke="currentColor"
              opacity={0.12}
            />
            <text x={geometry.x(tick)} y={dimensions.height + 10} textAnchor="middle">
              {new Date(tick).toISOString().slice(5, 16).replace("T", " ")}
            </text>
          </g>
        ))}
      </g>
    ),
  }
}

export function ribbonProps(day: AircraftDay, selected: string) {
  return {
    data: day.flights.map((f) => ({ eventId: f.id })),
    layout: ribbonLayout,
    layoutConfig: { day, selected },
    width: 850,
    height: day.flights.length * 68 + 100,
    margin: { left: 150, right: 35, top: 20, bottom: 50 },
    title: "Scheduled and actual flight intervals",
    description:
      "Outline: scheduled gate-to-gate interval. Solid: actual interval. Gaps between flights are ground time. Horizontal axis is UTC.",
    summary: daySummary(day),
    accessibleTable: true,
    colorScheme: { scheduled: "#8d939c", actual: "#287a79" },
    enableHover: true,
  }
}

export const airportLayout: NetworkCustomLayout<{ selected: string }> = ({
  nodes,
  edges,
  dimensions,
  config,
  theme,
  resolveColor,
}) => {
  const airports = nodes.map((node) => node.data ?? { id: node.id, code: node.id })
  const positions = new Map(
    airports.map((node, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / airports.length
      return [
        String(node.id),
        {
          x: dimensions.width / 2 + Math.cos(angle) * dimensions.width * 0.34,
          y: dimensions.height / 2 + Math.sin(angle) * dimensions.height * 0.3,
        },
      ]
    }),
  )
  const sceneEdges: NetworkSceneEdge[] = edges.map((edge, index) => {
    const datum = edge.data ?? { source: edge.source, target: edge.target, eventId: edge._edgeKey }
    const source = positions.get(String(datum.source))!,
      target = positions.get(String(datum.target))!
    const dx = target.x - source.x,
      dy = target.y - source.y,
      length = Math.hypot(dx, dy) || 1
    const bend =
      18 +
      (index / Math.max(1, edges.length - 1)) * Math.min(dimensions.width, dimensions.height) * 0.3
    const cx = (source.x + target.x) / 2 - (dy / length) * bend,
      cy = (source.y + target.y) / 2 + (dx / length) * bend
    return {
      type: "curved",
      id: String(datum.eventId),
      pathD: `M${source.x},${source.y} Q${cx},${cy} ${target.x},${target.y}`,
      datum,
      style: {
        fill: "none",
        stroke: datum.eventId === config.selected ? resolveColor("selected") : resolveColor("leg"),
        strokeWidth: datum.eventId === config.selected ? 5 : 2.5,
      },
    }
  })
  return {
    sceneNodes: airports.map((node) => ({
      type: "circle" as const,
      id: String(node.id),
      cx: positions.get(String(node.id))!.x,
      cy: positions.get(String(node.id))!.y,
      r: 8,
      style: { fill: theme.semantic.text },
      datum: node,
    })),
    sceneEdges,
    labels: airports.map((node) => ({
      x: positions.get(String(node.id))!.x,
      y: positions.get(String(node.id))!.y - 17,
      text: String(node.code),
      anchor: "middle" as const,
      fontSize: 15,
      fontWeight: 700,
      fill: theme.semantic.text,
    })),
  }
}

export function networkProps(day: AircraftDay, selected: string) {
  const nodes = [
    ...new Map(
      day.flights
        .flatMap((f) => [
          { id: f.raw.OriginAirportID, code: f.raw.Origin },
          { id: f.raw.DestAirportID, code: f.raw.Dest },
        ])
        .map((node) => [node.id, node]),
    ).values(),
  ]
  return {
    nodes,
    edges: day.flights
      .filter((f) => !f.issues.length)
      .map((f) => ({
        id: f.id,
        eventId: f.id,
        source: f.raw.OriginAirportID,
        target: f.raw.DestAirportID,
        flight: flightName(f),
      })),
    layout: airportLayout,
    layoutConfig: { selected },
    width: 700,
    height: 350,
    title: "Airports visited by this aircraft",
    description:
      "Each curve is one reported flight; the selected flight has a thicker stroke. Read direction and sequence in the numbered flight buttons.",
    summary: daySummary(day),
    accessibleTable: true,
    enableHover: true,
    colorScheme: { selected: "#a6472c", leg: "#287a79" },
  }
}
