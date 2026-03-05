import * as React from "react"
import Annotation from "../../Annotation"
import { packEnclose } from "d3-hierarchy"
import type { AnnotationContext } from "../../realtime/types"

// ── Coordinate resolution helpers ──────────────────────────────────────

function resolveX(
  ann: Record<string, any>,
  context: AnnotationContext
): number | null {
  const scaleX = context.scales?.x ?? context.scales?.time
  if (!scaleX) return null

  if (ann.x != null) return scaleX(ann.x)
  if (context.xAccessor && ann[context.xAccessor] != null) {
    return scaleX(ann[context.xAccessor])
  }
  return null
}

function resolveY(
  ann: Record<string, any>,
  context: AnnotationContext
): number | null {
  const scaleY = context.scales?.y ?? context.scales?.value
  if (!scaleY) return null

  if (ann.y != null) return scaleY(ann.y)
  if (context.yAccessor && ann[context.yAccessor] != null) {
    return scaleY(ann[context.yAccessor])
  }
  return null
}

/**
 * Returns true if a point annotation is within the visible chart area.
 * Used to hide data-anchored annotations (labels, callouts) that have
 * scrolled off-screen in a streaming chart.
 */
function isInBounds(
  px: number,
  py: number,
  context: AnnotationContext,
  margin: number = 50
): boolean {
  const w = context.width || 0
  const h = context.height || 0
  return px >= -margin && px <= w + margin && py >= -margin && py <= h + margin
}

// ── Default annotation rules factory ──────────────────────────────────

export function createDefaultAnnotationRules(
  frameType: "xy" | "ordinal" | "network"
): (
  annotation: Record<string, any>,
  index: number,
  context: AnnotationContext
) => React.ReactNode | null {
  return function defaultAnnotationRules(
    ann: Record<string, any>,
    index: number,
    context: AnnotationContext
  ): React.ReactNode | null {
    switch (ann.type) {
      // ── Label ─────────────────────────────────────────────────────────
      case "label": {
        let px: number | null = null
        let py: number | null = null

        if (ann.pointId != null && context.pointNodes) {
          const match = context.pointNodes.find(p => p.pointId === ann.pointId)
          if (!match) return null
          px = match.x
          py = match.y
        } else {
          px = resolveX(ann, context)
          py = resolveY(ann, context)
        }
        if (px == null || py == null) return null
        if (!isInBounds(px, py, context)) return null
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx || 30,
              dy: ann.dy || -30,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "label",
              connector: ann.connector || { end: "arrow" },
              color: ann.color
            }}
          />
        )
      }

      // ── Callout ───────────────────────────────────────────────────────
      case "callout": {
        let px: number | null = null
        let py: number | null = null

        if (ann.pointId != null && context.pointNodes) {
          const match = context.pointNodes.find(p => p.pointId === ann.pointId)
          if (!match) return null
          px = match.x
          py = match.y
        } else {
          px = resolveX(ann, context)
          py = resolveY(ann, context)
        }
        if (px == null || py == null) return null
        if (!isInBounds(px, py, context)) return null
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px,
              y: py,
              dx: ann.dx || 30,
              dy: ann.dy || -30,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "callout-circle",
              subject: { radius: ann.radius || 12 },
              connector: ann.connector || { end: "arrow" },
              color: ann.color
            }}
          />
        )
      }

      // ── X-threshold (vertical line) ───────────────────────────────────
      case "x-threshold": {
        const px = resolveX(ann, context)
        if (px == null) return null
        const color = ann.color || "#f97316"
        return (
          <g key={`ann-${index}`}>
            <line
              x1={px}
              y1={0}
              x2={px}
              y2={context.height || 0}
              stroke={color}
              strokeWidth={ann.strokeWidth || 1.5}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text x={px + 4} y={12} fill={color} fontSize={12} fontWeight="bold">
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Y-threshold (horizontal line) ─────────────────────────────────
      case "y-threshold": {
        const py = resolveY(ann, context)
        if (py == null) return null
        const color = ann.color || "#f97316"
        return (
          <g key={`ann-${index}`}>
            <line
              x1={0}
              y1={py}
              x2={context.width || 0}
              y2={py}
              stroke={color}
              strokeWidth={ann.strokeWidth || 1.5}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text
                x={(context.width || 0) - 4}
                y={py - 4}
                textAnchor="end"
                fill={color}
                fontSize={12}
                fontWeight="bold"
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Enclose (circle enclosure) ────────────────────────────────────
      case "enclose": {
        const coords = (ann.coordinates || [])
          .map((c: Record<string, any>) => ({
            x: resolveX({ ...c, type: "point" }, context),
            y: resolveY({ ...c, type: "point" }, context),
            r: 1
          }))
          .filter(
            (c: { x: number | null; y: number | null; r: number }) =>
              c.x != null && c.y != null
          ) as { x: number; y: number; r: number }[]
        if (coords.length < 2) return null
        const enclosure = packEnclose(coords)
        const padding = ann.padding || 10
        return (
          <g key={`ann-${index}`}>
            <circle
              cx={enclosure.x}
              cy={enclosure.y}
              r={enclosure.r + padding}
              fill={ann.fill || "none"}
              fillOpacity={ann.fillOpacity || 0.1}
              stroke={ann.color || "#666"}
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
            {ann.label && (
              <text
                x={enclosure.x}
                y={enclosure.y - enclosure.r - padding - 4}
                textAnchor="middle"
                fill={ann.color || "#666"}
                fontSize={12}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Rect-enclose (bounding rectangle) ─────────────────────────────
      case "rect-enclose": {
        const coords = (ann.coordinates || [])
          .map((c: Record<string, any>) => ({
            x: resolveX({ ...c, type: "point" }, context),
            y: resolveY({ ...c, type: "point" }, context)
          }))
          .filter(
            (c: { x: number | null; y: number | null }) =>
              c.x != null && c.y != null
          ) as { x: number; y: number }[]
        if (coords.length < 2) return null
        const padding = ann.padding || 10
        const xs = coords.map((c) => c.x)
        const ys = coords.map((c) => c.y)
        const minX = Math.min(...xs) - padding
        const maxX = Math.max(...xs) + padding
        const minY = Math.min(...ys) - padding
        const maxY = Math.max(...ys) + padding
        return (
          <g key={`ann-${index}`}>
            <rect
              x={minX}
              y={minY}
              width={maxX - minX}
              height={maxY - minY}
              fill={ann.fill || "none"}
              fillOpacity={ann.fillOpacity || 0.1}
              stroke={ann.color || "#666"}
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
            {ann.label && (
              <text
                x={(minX + maxX) / 2}
                y={minY - 4}
                textAnchor="middle"
                fill={ann.color || "#666"}
                fontSize={12}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Highlight ─────────────────────────────────────────────────────
      case "highlight": {
        const data = context.data || []
        const matches =
          typeof ann.filter === "function"
            ? data.filter(ann.filter)
            : ann.field && ann.value != null
              ? data.filter((d) => d[ann.field] === ann.value)
              : []
        const style = ann.style || {
          stroke: ann.color || "#f97316",
          strokeWidth: 2,
          fill: "none"
        }
        return (
          <g key={`ann-${index}`}>
            {matches.map((d, i) => {
              const px = resolveX(d, context)
              const py = resolveY(d, context)
              if (px == null || py == null) return null
              return (
                <circle key={i} cx={px} cy={py} r={ann.r || 6} {...style} />
              )
            })}
          </g>
        )
      }

      // ── Bracket ───────────────────────────────────────────────────────
      case "bracket": {
        const px = resolveX(ann, context)
        const py = resolveY(ann, context)
        return (
          <Annotation
            key={`ann-${index}`}
            noteData={{
              x: px ?? 0,
              y: py ?? 0,
              dx: ann.dx || 0,
              dy: ann.dy || 0,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120
              },
              type: "bracket",
              subject: {
                type: ann.bracketType || "curly",
                width: ann.width,
                height: ann.height,
                depth: ann.depth || 30
              },
              color: ann.color
            }}
          />
        )
      }

      // ── Trend (regression line) ───────────────────────────────────────
      case "trend": {
        const data = context.data || []
        if (data.length < 2) return null
        const xAcc = context.xAccessor || "x"
        const yAcc = context.yAccessor || "y"
        const points: [number, number][] = data
          .map((d) => [d[xAcc], d[yAcc]] as [number, number])
          .filter((p) => p[0] != null && p[1] != null)
        if (points.length < 2) return null

        const scaleX = context.scales?.x ?? context.scales?.time
        const scaleY = context.scales?.y ?? context.scales?.value
        if (!scaleX || !scaleY) return null

        // Lazy require to avoid loading regression unless needed
        let result: { points: [number, number][] }
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const regressionModule = require("regression")
          const method = ann.method || "linear"
          result =
            method === "polynomial"
              ? regressionModule.polynomial(points, {
                  order: ann.order || 2
                })
              : regressionModule.linear(points)
        } catch {
          return null
        }

        const linePoints = result.points
          .map(([x, y]) => `${scaleX(x)},${scaleY(y)}`)
          .join(" ")
        const color = ann.color || "#6366f1"
        return (
          <g key={`ann-${index}`}>
            <polyline
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth={ann.strokeWidth || 2}
              strokeDasharray={ann.strokeDasharray || "6,3"}
            />
            {ann.label && (
              <text
                x={scaleX(result.points[result.points.length - 1][0]) + 4}
                y={scaleY(result.points[result.points.length - 1][1]) - 4}
                fill={color}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Band (shaded region between y0 and y1) ────────────────────────
      case "band": {
        const scaleY = context.scales?.y ?? context.scales?.value
        const y0px = scaleY?.(ann.y0) ?? 0
        const y1px = scaleY?.(ann.y1) ?? (context.height || 0)
        return (
          <g key={`ann-${index}`}>
            <rect
              x={0}
              y={Math.min(y0px, y1px)}
              width={context.width || 0}
              height={Math.abs(y1px - y0px)}
              fill={ann.fill || "#6366f1"}
              fillOpacity={ann.fillOpacity || 0.1}
            />
            {ann.label && (
              <text
                x={(context.width || 0) - 4}
                y={Math.min(y0px, y1px) - 4}
                textAnchor="end"
                fill={ann.color || "#6366f1"}
                fontSize={11}
              >
                {ann.label}
              </text>
            )}
          </g>
        )
      }

      // ── Unrecognized type ─────────────────────────────────────────────
      default:
        return null
    }
  }
}
