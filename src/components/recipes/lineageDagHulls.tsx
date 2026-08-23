import * as React from "react"
import type { ReactNode } from "react"

interface HullPoint {
  x: number
  y: number
}

export interface LineageHullRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface LineageHullOptions {
  colors?: Partial<Record<string, string>>
  padding: number
  radius: number
  fillOpacity: number
  strokeOpacity: number
  label?: (groupValue: string) => string
  resolveColor: (key: string) => string
  reachSet: Set<string> | null
  selectedId: string | null
  dimOpacity: number
}

function cross(origin: HullPoint, a: HullPoint, b: HullPoint): number {
  return (a.x - origin.x) * (b.y - origin.y) -
    (a.y - origin.y) * (b.x - origin.x)
}

/** Andrew's monotone chain with a stable lower-left start. */
function convexHull(points: HullPoint[]): HullPoint[] {
  const sorted = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((point, index, all) =>
      index === 0 || point.x !== all[index - 1].x || point.y !== all[index - 1].y
    )
  if (sorted.length <= 2) return sorted

  const lower: HullPoint[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper: HullPoint[] = []
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Offset each edge of a convex polygon outwards and intersect adjacent offsets. */
function expandConvexHull(points: HullPoint[], padding: number): HullPoint[] {
  if (padding === 0 || points.length < 3) return points
  const areaTwice = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0)
  const orientation = areaTwice >= 0 ? 1 : -1

  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousLength = Math.hypot(point.x - previous.x, point.y - previous.y) || 1
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const previousNormal = orientation > 0
      ? { x: (point.y - previous.y) / previousLength, y: -(point.x - previous.x) / previousLength }
      : { x: -(point.y - previous.y) / previousLength, y: (point.x - previous.x) / previousLength }
    const nextNormal = orientation > 0
      ? { x: (next.y - point.y) / nextLength, y: -(next.x - point.x) / nextLength }
      : { x: -(next.y - point.y) / nextLength, y: (next.x - point.x) / nextLength }
    const bisector = {
      x: previousNormal.x + nextNormal.x,
      y: previousNormal.y + nextNormal.y,
    }
    const bisectorLength = Math.hypot(bisector.x, bisector.y)
    if (bisectorLength < 1e-9) {
      return {
        x: point.x + nextNormal.x * padding,
        y: point.y + nextNormal.y * padding,
      }
    }
    const unit = { x: bisector.x / bisectorLength, y: bisector.y / bisectorLength }
    const projection = Math.max(1e-6, unit.x * nextNormal.x + unit.y * nextNormal.y)
    const distance = padding / projection
    return { x: point.x + unit.x * distance, y: point.y + unit.y * distance }
  })
}

function pathNumber(value: number): string {
  return String(Math.abs(value) < 1e-12 ? 0 : value)
}

function roundedHullPath(points: HullPoint[], radius: number): string {
  if (points.length === 0) return ""
  if (points.length < 3 || radius === 0) {
    return `${points.map((point, index) =>
      `${index === 0 ? "M" : "L"}${pathNumber(point.x)},${pathNumber(point.y)}`
    ).join(" ")} Z`
  }

  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousLength = Math.hypot(previous.x - point.x, previous.y - point.y) || 1
    const nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const cornerRadius = Math.min(radius, previousLength / 2, nextLength / 2)
    return {
      point,
      incoming: {
        x: point.x + ((previous.x - point.x) / previousLength) * cornerRadius,
        y: point.y + ((previous.y - point.y) / previousLength) * cornerRadius,
      },
      outgoing: {
        x: point.x + ((next.x - point.x) / nextLength) * cornerRadius,
        y: point.y + ((next.y - point.y) / nextLength) * cornerRadius,
      },
    }
  })

  const start = corners[0].outgoing
  let path = `M${pathNumber(start.x)},${pathNumber(start.y)}`
  for (let index = 1; index < corners.length; index++) {
    const corner = corners[index]
    path += ` L${pathNumber(corner.incoming.x)},${pathNumber(corner.incoming.y)}`
    path += ` Q${pathNumber(corner.point.x)},${pathNumber(corner.point.y)} ${pathNumber(corner.outgoing.x)},${pathNumber(corner.outgoing.y)}`
  }
  const first = corners[0]
  path += ` L${pathNumber(first.incoming.x)},${pathNumber(first.incoming.y)}`
  path += ` Q${pathNumber(first.point.x)},${pathNumber(first.point.y)} ${pathNumber(first.outgoing.x)},${pathNumber(first.outgoing.y)} Z`
  return path
}

/** Deterministic plot-space hull layer for lineageDagLayout. */
export function renderLineageHullBackgrounds(
  groups: Map<string, LineageHullRect[]>,
  options: LineageHullOptions
): ReactNode {
  const orderedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  )
  const reachSet = options.reachSet
  return (
    <g className="lineage-dag-hulls" aria-hidden="true" style={{ pointerEvents: "none" }}>
      {orderedGroups.map(([groupValue, rects]) => {
        const points = rects.flatMap((rect) => [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.w, y: rect.y },
          { x: rect.x + rect.w, y: rect.y + rect.h },
          { x: rect.x, y: rect.y + rect.h },
        ])
        const hull = expandConvexHull(convexHull(points), options.padding)
        const path = roundedHullPath(hull, options.radius)
        const color = Object.prototype.hasOwnProperty.call(options.colors ?? {}, groupValue)
          ? options.colors?.[groupValue] ?? options.resolveColor(groupValue)
          : options.resolveColor(groupValue)
        const fullyOutsideReach = reachSet != null && rects.every((rect) =>
          !reachSet.has(rect.id) && rect.id !== options.selectedId
        )
        const minX = Math.min(...hull.map((point) => point.x))
        const minY = Math.min(...hull.map((point) => point.y))
        const label = options.label?.(groupValue)

        return (
          <g
            key={groupValue}
            data-lineage-hull={groupValue}
            opacity={fullyOutsideReach ? options.dimOpacity : undefined}
          >
            <path
              className="lineage-dag-hull"
              d={path}
              fill={color}
              fillOpacity={options.fillOpacity}
              stroke={color}
              strokeOpacity={options.strokeOpacity}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: "none" }}
            />
            {label ? (
              <text
                className="lineage-dag-hull-label"
                x={minX + 8}
                y={minY + 14}
                fill={color}
                fillOpacity={Math.max(options.strokeOpacity, 0.7)}
                fontSize={11}
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
