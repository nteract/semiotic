import * as React from "react"
import type { GlyphDef } from "../../stream/glyphDef"
import type { PhysicsBodyMark } from "../../stream/physics/physicsBodyCanvas"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { Style } from "../../stream/types"
import { physicsBodySVG } from "../../stream/physics/physicsBodySVG"
import { physicsCanvasThemeCSSValue as color } from "../../stream/physics/PhysicsCanvasTheme"
import type { EventDropLedgerRow } from "./eventDropLedger"

export interface EventDropSource {
  id: string
  label: string
  color?: string
  mark?: PhysicsBodyMark
  glyph?: GlyphDef
  active?: boolean
  visible?: boolean
  description?: string
}

export interface EventDropSourceRail {
  side?: "left" | "right" | "top" | "none"
  tileSize?: number
}

export function eventDropSourceStyle(
  sources: readonly EventDropSource[] | undefined,
  source: unknown
): Style {
  const definition = sources?.find((item) => item.id === String(source))
  if (!definition) return {}
  return {
    ...(definition.color ? { fill: definition.color } : {}),
    ...(definition.mark ? { mark: definition.mark } : {}),
    ...(definition.glyph ? { glyph: definition.glyph } : {})
  }
}

export function eventDropSourcePositions(
  sources: readonly EventDropSource[] = [],
  rail: EventDropSourceRail = {},
  size: [number, number]
) {
  if (rail.side === "none") return []
  const visible = sources.filter((source) => source.visible !== false)
  const tileSize = Math.max(48, rail.tileSize ?? 80)
  const count = Math.max(1, visible.length)
  return visible.map((source, index) => ({
    source,
    x:
      rail.side === "top"
        ? ((index + 0.5) * size[0]) / count
        : rail.side === "right"
          ? size[0] - tileSize / 2
          : tileSize / 2,
    y:
      rail.side === "top"
        ? tileSize / 2 + 24
        : ((index + 0.5) * size[1]) / count
  }))
}

export function eventDropSourceRail(
  sources: readonly EventDropSource[] | undefined,
  rail: EventDropSourceRail | undefined,
  size: [number, number],
  onClick?: (source: EventDropSource) => void
) {
  const positions = eventDropSourcePositions(sources, rail, size)
  if (!positions.length) return null
  return (
    <svg
      width={size[0]}
      height={size[1]}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      data-testid="event-drop-source-rail"
    >
      {positions.map(({ source, x, y }, index) => {
        const body: PhysicsBodyState = {
          id: source.id,
          x,
          y: y - 6,
          prevX: x,
          prevY: y - 6,
          vx: 0,
          vy: 0,
          angle: 0,
          mass: 1,
          shape: { type: "circle", radius: 12 },
          sleeping: true
        }
        const style: Style = {
          fill: source.color ?? color("primary"),
          mark: source.mark,
          glyph: source.glyph,
          r: 12
        }
        const label = `${source.label} ${source.active === false ? "off" : "on"}`
        return (
          <g
            key={source.id}
            role={onClick ? "button" : "img"}
            tabIndex={onClick ? 0 : undefined}
            aria-label={label}
            aria-pressed={onClick ? source.active !== false : undefined}
            style={{
              pointerEvents: "auto",
              cursor: onClick ? "pointer" : undefined
            }}
            onClick={() => onClick?.(source)}
            onKeyDown={(event) => {
              if (onClick && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault()
                onClick(source)
              }
            }}
          >
            <title>{source.description ?? label}</title>
            <rect
              x={x - 24}
              y={y - 30}
              width={48}
              height={54}
              rx={6}
              fill={color("background")}
              stroke={color("border")}
            />
            <g opacity={source.active === false ? 0.35 : 1}>
              {physicsBodySVG(body, style, index)}
            </g>
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={color("text")}
              fontSize={10}
            >
              {source.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function eventDropSourceStats(
  ledger: readonly EventDropLedgerRow[],
  sourceId: string
) {
  let accepted = 0
  let late = 0
  for (const row of ledger) {
    accepted += row.bySource[sourceId]?.accepted ?? 0
    late += row.bySource[sourceId]?.late ?? 0
  }
  return { emitted: accepted + late, accepted, late }
}
