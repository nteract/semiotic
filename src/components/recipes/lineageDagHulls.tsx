import { getMin, getMinMax } from "../charts/shared/minMax"
import * as React from "react"
import type { ReactNode } from "react"
import {
  NetworkPerspectiveBillboard,
  NetworkPerspectiveGround
} from "../stream/networkPerspectivePlacement"
import type { NetworkPerspectiveBound } from "../stream/networkPerspective"

import { convexHull, expandConvexHull, roundedHullPath } from "../stream/networkHullGeometry"

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
  dimById: ReadonlyMap<string, boolean>
  selectedId: string | null
  dimOpacity: number
}

/**
 * Ground boxes of the hulls and upright boxes of their labels, so an active
 * `perspective` fits them in the plot with the nodes.
 */
export function lineageHullBounds(
  groups: Map<string, LineageHullRect[]>,
  options: Pick<LineageHullOptions, "padding" | "label">
): NetworkPerspectiveBound[] {
  const bounds: NetworkPerspectiveBound[] = []
  for (const [groupValue, rects] of groups) {
    const corners = rects.flatMap((rect) => [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h }
    ])
    const hull = expandConvexHull(convexHull(corners), options.padding)
    if (!hull.length) continue
    const [minX, maxX] = getMinMax(hull, (point) => point.x)
    const [minY, maxY] = getMinMax(hull, (point) => point.y)
    bounds.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY })
    const label = options.label?.(groupValue)
    if (label) bounds.push({ x: minX + 8, y: minY + 14, z: 0, extent: [0, label.length * 6.6, 12, 3] })
  }
  return bounds
}

/** Deterministic plot-space hull layer for lineageDagLayout. */
export function renderLineageHullBackgrounds(
  groups: Map<string, LineageHullRect[]>,
  options: LineageHullOptions
): ReactNode {
  const orderedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  )
  return (
    <g
      className="lineage-dag-hulls"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {orderedGroups.map(([groupValue, rects]) => {
        const points = rects.flatMap((rect) => [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.w, y: rect.y },
          { x: rect.x + rect.w, y: rect.y + rect.h },
          { x: rect.x, y: rect.y + rect.h }
        ])
        const hull = expandConvexHull(convexHull(points), options.padding)
        const path = roundedHullPath(hull, options.radius)
        const color = Object.prototype.hasOwnProperty.call(
          options.colors ?? {},
          groupValue
        )
          ? (options.colors?.[groupValue] ?? options.resolveColor(groupValue))
          : options.resolveColor(groupValue)
        const fullyDimmed = rects.every(
          (rect) =>
            options.dimById.get(rect.id) === true &&
            rect.id !== options.selectedId
        )
        const minX = getMin(hull.map((point) => point.x))
        const minY = getMin(hull.map((point) => point.y))
        const label = options.label?.(groupValue)

        return (
          <g
            key={groupValue}
            data-lineage-hull={groupValue}
            opacity={fullyDimmed ? options.dimOpacity : undefined}
          >
            {/* Under a `perspective` the hull lies on the ground and its
                label stands at the hull's projected corner. */}
            <NetworkPerspectiveGround>
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
            </NetworkPerspectiveGround>
            {label ? (
              <NetworkPerspectiveBillboard x={minX + 8} y={minY + 14} z={0}>
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
              </NetworkPerspectiveBillboard>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
