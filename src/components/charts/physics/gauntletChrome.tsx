"use client"

/**
 * Gauntlet canvas paint + SVG chrome / projection overlay.
 */
import * as React from "react"
import type { Datum } from "../shared/datumTypes"
import type { Style } from "../../stream/types"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsTypes"
import {
  CORE_KIND,
  NEGATIVE_KIND,
  POSITIVE_KIND,
  propertyLabel,
  type GauntletBodyDatum,
  type GauntletLayout,
  type GauntletProjectState
} from "./gauntletPhysics"

export function drawGauntletBody(ctx: CanvasRenderingContext2D, body: PhysicsBodyState, style: Style): void {
  const datum = body.datum as GauntletBodyDatum | undefined
  if (!datum?.__gauntlet) return
  const radius = body.shape.type === "circle" ? body.shape.radius : 8
  ctx.save()
  ctx.translate(body.x, body.y)
  if (datum.kind === CORE_KIND) {
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill, "#0f766e")
    ctx.strokeStyle = resolveCanvasColor(ctx, style.stroke, "#f8fafc")
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else {
    const property = datum.property
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill ?? property?.color, "#38bdf8")
    ctx.strokeStyle = resolveCanvasColor(ctx, style.stroke, "#0f172a")
    ctx.lineWidth = 1.1
    ctx.beginPath()
    if (datum.kind === NEGATIVE_KIND) {
      ctx.rect(-radius, -radius, radius * 2, radius * 2)
    } else {
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = resolveCanvasColor(ctx, "var(--semiotic-background, #07111f)", "#07111f")
    ctx.font = `900 ${datum.kind === NEGATIVE_KIND ? 9 : 8}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(property?.short ?? property?.id?.slice(0, 1).toUpperCase() ?? "?", 0, 0.5)
  }
  ctx.restore()
}

export function resolveCanvasColor(
  ctx: CanvasRenderingContext2D,
  value: Style[keyof Style] | undefined,
  fallback: string
): string {
  if (typeof value !== "string") return fallback
  if (typeof getComputedStyle !== "function" || !ctx.canvas) return value || fallback
  const token = value.startsWith("var(")
    ? value.match(/var\((--[^,\s)]+)/)?.[1]
    : value.startsWith("--")
      ? value
      : null
  if (!token) return value || fallback
  return getComputedStyle(ctx.canvas).getPropertyValue(token).trim() || fallback
}

export function drawTethers(ctx: CanvasRenderingContext2D, bodies: PhysicsBodyState[]): void {
  const cores = new Map(bodies.filter((body) => (body.datum as GauntletBodyDatum | undefined)?.kind === CORE_KIND).map((body) => [(body.datum as GauntletBodyDatum).projectId, body]))
  ctx.save()
  ctx.lineWidth = 1.1
  ctx.setLineDash([3, 4])
  for (const body of bodies) {
    const datum = body.datum as GauntletBodyDatum | undefined
    if (!datum?.__gauntlet || datum.kind === CORE_KIND) continue
    const core = cores.get(datum.projectId)
    if (!core) continue
    ctx.globalAlpha = datum.kind === NEGATIVE_KIND ? 0.24 : 0.36
    ctx.strokeStyle = datum.kind === NEGATIVE_KIND ? "#d94a45" : "#7a8794"
    ctx.beginPath()
    ctx.moveTo(core.x, core.y)
    ctx.lineTo(body.x, body.y)
    ctx.stroke()
  }
  ctx.restore()
}

export function GauntletChrome({ layout, states }: { layout: GauntletLayout; states: readonly GauntletProjectState[] }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <path
        d={`M ${layout.startX - 42} ${layout.routeY} C ${layout.width * 0.24} ${layout.routeY - 70}, ${layout.width * 0.42} ${layout.routeY + 78}, ${layout.width * 0.58} ${layout.routeY} S ${layout.width * 0.78} ${layout.routeY - 82}, ${layout.socketX + 36} ${layout.routeY}`}
        fill="none"
        stroke="var(--semiotic-accent, #38bdf8)"
        strokeDasharray="18 12"
        strokeLinecap="round"
        strokeOpacity={0.45}
        strokeWidth={7}
      />
      <line
        x1={Math.round(layout.width * 0.06)}
        x2={Math.round(layout.width * 0.94)}
        y1={layout.crashY}
        y2={layout.crashY}
        stroke="var(--semiotic-negative, #ef4444)"
        strokeDasharray="3 7"
        strokeOpacity={0.64}
      />
      <text x={Math.round(layout.width * 0.07)} y={layout.crashY - 8} fill="var(--semiotic-negative, #ef4444)" fontSize={9} fontWeight={800}>CRASH LINE</text>
      {layout.gates.map((gate) => (
        <g key={gate.id}>
          <rect
            x={gate.x - gate.width / 2}
            y={Math.max(80, layout.routeY - 180)}
            width={gate.width}
            height={Math.min(360, layout.height - 170)}
            rx={12}
            fill={gate.color ?? "var(--semiotic-accent, #38bdf8)"}
            fillOpacity={0.1}
            stroke={gate.color ?? "var(--semiotic-accent, #38bdf8)"}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
          />
          <text x={gate.x} y={Math.max(64, layout.routeY - 196)} fill="var(--semiotic-text-secondary, #64748b)" fontSize={10} fontWeight={800} textAnchor="middle">{gate.label ?? gate.id}</text>
        </g>
      ))}
      <g>
        <rect x={layout.socketX - 52} y={layout.routeY - 56} width={104} height={112} rx={13} fill="var(--semiotic-positive, #22c55e)" fillOpacity={0.12} stroke="var(--semiotic-positive, #22c55e)" strokeWidth={1.5} />
        <text x={layout.socketX} y={layout.routeY - 72} fill="var(--semiotic-text-secondary, #64748b)" fontSize={10} fontWeight={800} textAnchor="middle">SOCKET</text>
      </g>
      <g>
        <rect x={layout.graveyardX - 82} y={layout.graveyardY - 34} width={164} height={58} rx={11} fill="var(--semiotic-negative, #ef4444)" fillOpacity={0.16} stroke="var(--semiotic-negative, #ef4444)" strokeOpacity={0.7} />
        <text x={layout.graveyardX} y={layout.graveyardY - 8} fill="var(--semiotic-negative, #ef4444)" fontSize={10} fontWeight={800} textAnchor="middle">GRAVEYARD</text>
        <text x={layout.graveyardX} y={layout.graveyardY + 12} fill="var(--semiotic-text-secondary, #64748b)" fontSize={9} fontWeight={700} textAnchor="middle">{states.some((state) => state.killed) ? "lift shut off" : "too heavy or too small"}</text>
      </g>
    </svg>
  )
}

export function gauntletSemanticItem(body: PhysicsBodyState) {
  const datum = body.datum as GauntletBodyDatum | undefined
  if (!datum?.__gauntlet) return false
  if (datum.kind === CORE_KIND) {
    return {
      label: `${datum.projectId} project core`,
      group: "project",
      description: "Project core carrying positive and negative properties."
    }
  }
  return {
    label: `${propertyLabel(datum.property)} ${datum.kind === POSITIVE_KIND ? "positive" : "negative"} property`,
    group: datum.kind === POSITIVE_KIND ? "positive property" : "negative property",
    description: `${propertyLabel(datum.property)} attached to ${datum.projectId}.`
  }
}

export function gauntletProjectionRows<TDatum extends Datum>(
  states: readonly GauntletProjectState<TDatum>[]
): Array<{ label: string; value: number; outcome: string }> {
  return states.map((project) => ({
    label: project.id,
    value: Math.max(0, Number(project.viability) || 0),
    outcome: project.outcome || project.stage || "in-process"
  }))
}

export function gauntletProjectionSemanticItems<TDatum extends Datum>(
  states: readonly GauntletProjectState<TDatum>[],
  layout: GauntletLayout
): PhysicsSemanticItem[] {
  if (!states.length) return []
  const stripY = 28
  const laneWidth = Math.max(40, (layout.width - 80) / states.length)
  return states.map((project, index) => {
    const label = `${project.id}: viability ${Math.round(project.viability)}, ${project.outcome || project.stage}`
    return {
      id: `gauntlet-projection-${project.id}`,
      label,
      description: label,
      datum: project,
      x: 40 + (index + 0.5) * laneWidth,
      y: stripY,
      shape: "rect" as const,
      width: Math.max(16, laneWidth * 0.55),
      height: 22,
      group: "settled projection"
    }
  })
}

export function GauntletProjectionOverlay<TDatum extends Datum>({
  states,
  layout
}: {
  states: readonly GauntletProjectState<TDatum>[]
  layout: GauntletLayout
}) {
  const rows = gauntletProjectionRows(states)
  if (!rows.length) return null
  const maxValue = Math.max(1, ...rows.map((row) => row.value))
  const stripTop = 10
  const barMaxH = 28
  const laneWidth = Math.max(40, (layout.width - 80) / rows.length)

  return (
    <svg
      aria-hidden="true"
      data-testid="gauntlet-projection-overlay"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <text
        x={36}
        y={stripTop + 8}
        fill="var(--semiotic-text-secondary, #64748b)"
        fontSize={9}
        fontWeight={800}
      >
        SETTLED · viability / outcome
      </text>
      {rows.map((row, index) => {
        const x = 40 + index * laneWidth
        const h = Math.max(2, (row.value / maxValue) * barMaxH)
        const killed = /kill|crash|block|grave/i.test(row.outcome)
        return (
          <g key={row.label}>
            <rect
              x={x + laneWidth * 0.18}
              y={stripTop + 12 + (barMaxH - h)}
              width={Math.max(10, laneWidth * 0.45)}
              height={h}
              rx={2}
              fill={
                killed
                  ? "var(--semiotic-danger, #ef4444)"
                  : "var(--semiotic-success, #16a34a)"
              }
              fillOpacity={0.35}
              stroke={
                killed
                  ? "var(--semiotic-danger, #ef4444)"
                  : "var(--semiotic-success, #16a34a)"
              }
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={x + laneWidth * 0.4}
              y={stripTop + 12 + barMaxH + 12}
              textAnchor="middle"
              fill="var(--semiotic-text-secondary, #64748b)"
              fontSize={9}
              fontWeight={700}
            >
              {row.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
