"use client"

import * as React from "react"
import type { Style } from "../../stream/types"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import type {
  CrucibleBodyDatum,
  CrucibleComponentState,
  CrucibleProductState,
  CrucibleRunState
} from "./crucibleTypes"

const PAPER = "var(--semiotic-background, #fffaf0)"

function canvasColor(
  ctx: CanvasRenderingContext2D,
  value: Style[keyof Style] | undefined,
  fallback: string
): string {
  if (typeof value !== "string") return fallback
  if (typeof getComputedStyle !== "function" || !ctx.canvas)
    return value || fallback
  const token = value.startsWith("var(")
    ? value.match(/var\((--[^,\s)]+)/)?.[1]
    : value.startsWith("--")
      ? value
      : null
  if (!token) return value || fallback
  return getComputedStyle(ctx.canvas).getPropertyValue(token).trim() || fallback
}

export function displayNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  if (Math.abs(value) >= 1000) return value.toLocaleString()
  if (Number.isInteger(value)) return String(value)
  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")
}

export function componentDescription(component: CrucibleComponentState): string {
  const destination = component.productIds.length
    ? ` Contributes to ${component.productIds.join(", ")}.`
    : component.outletId
      ? ` Routed to ${component.outletId}.`
      : ""
  const reason = component.reason ? ` ${component.reason}.` : ""
  return `${displayNumber(component.amount)} amount; ${component.status}.${destination}${reason}`
}

export function productDescription(product: CrucibleProductState): string {
  const destination = product.outletId ? ` Routed to ${product.outletId}.` : ""
  return `${product.status} product with ${product.sourceIds.length} source${product.sourceIds.length === 1 ? "" : "s"} and ${displayNumber(product.amount)} amount.${destination}`
}

/** Default accessible description for each live crucible body. */
export function crucibleBodySemanticItem<TDatum extends Datum>(
  body: PhysicsBodyState,
  state: CrucibleRunState<TDatum>
): false | Partial<PhysicsSemanticItem> {
  const wrapped = body.datum as CrucibleBodyDatum<TDatum> | undefined
  if (!wrapped?.__crucible) return false
  if (wrapped.kind === "component") {
    const component = state.components[wrapped.semanticId]
    if (!component) return false
    return {
      id: `crucible-component-${component.id}`,
      label: component.label,
      description: componentDescription(component),
      group: `source component · ${component.status}`,
      datum: component
    }
  }
  const product = state.products[wrapped.semanticId]
  if (!product) return false
  return {
    id: `crucible-product-${product.id}`,
    label: product.label,
    description: productDescription(product),
    group: `derived product · ${product.status}`,
    datum: product
  }
}

/** Canvas mark used when callers do not supply frameProps.renderBody. */
export function drawCrucibleBody(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBodyState,
  style: Style
): void {
  const wrapped = body.datum as CrucibleBodyDatum | undefined
  if (!wrapped?.__crucible) return
  const radius = body.shape.type === "circle" ? body.shape.radius : 8
  const fill = canvasColor(
    ctx,
    style.fill,
    wrapped.kind === "product" ? "#b8792d" : "#356b63"
  )
  const stroke = canvasColor(ctx, style.stroke, "#26323a")

  ctx.save()
  ctx.translate(body.x, body.y)
  ctx.globalAlpha = typeof style.opacity === "number" ? style.opacity : 0.96
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth =
    typeof style.strokeWidth === "number" ? style.strokeWidth : 1.25

  if (wrapped.kind === "product") {
    ctx.shadowColor = fill
    ctx.shadowBlur = 10
    ctx.beginPath()
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index / 6) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(2, radius * 0.36), 0, Math.PI * 2)
    ctx.strokeStyle = canvasColor(ctx, PAPER, "#fffaf0")
    ctx.globalAlpha *= 0.72
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(
      -radius * 0.25,
      -radius * 0.28,
      Math.max(1, radius * 0.18),
      0,
      Math.PI * 2
    )
    ctx.fillStyle = "rgba(255,255,255,0.34)"
    ctx.fill()
  }
  ctx.restore()
}

/**
 * SSR sibling of `drawCrucibleBody` — the same shadowed hexagon + inner ring
 * for settled products, and highlight dot for source components, as an SVG
 * fragment instead of canvas draw calls. Returns `undefined` for non-crucible
 * bodies so the SVG renderer falls back to its default circle mark.
 *
 * `idPrefix` is the sanitized prefix the owning `PhysicsSettledSVG` document
 * uses for its own ids — folded into this body's `<filter>` id so multiple
 * settled Crucible SVGs on one page (SVG ids are document-global) can't
 * collide and mis-apply each other's glow filter.
 */
export function drawCrucibleBodySVG(
  body: PhysicsBodyState,
  style: Style,
  index: number,
  idPrefix?: string
): React.ReactNode | undefined {
  const wrapped = body.datum as CrucibleBodyDatum | undefined
  if (!wrapped?.__crucible) return undefined
  const radius = body.shape.type === "circle" ? body.shape.radius : 8
  const fill =
    typeof style.fill === "string"
      ? style.fill
      : wrapped.kind === "product"
        ? "#b8792d"
        : "#356b63"
  const stroke = typeof style.stroke === "string" ? style.stroke : "#26323a"
  const strokeWidth =
    typeof style.strokeWidth === "number" ? style.strokeWidth : 1.25
  const opacity = typeof style.opacity === "number" ? style.opacity : 0.96
  const key = idPrefix ? `${idPrefix}-crucible-body-${index}` : `crucible-body-${index}`

  if (wrapped.kind === "product") {
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = -Math.PI / 2 + (i / 6) * Math.PI * 2
      return `${body.x + Math.cos(angle) * radius},${body.y + Math.sin(angle) * radius}`
    }).join(" ")
    const filterId = `${key}-glow`
    return (
      <React.Fragment key={key}>
        <defs>
          <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={fill}
              floodOpacity="0.8"
            />
          </filter>
        </defs>
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          filter={`url(#${filterId})`}
        />
        <circle
          cx={body.x}
          cy={body.y}
          r={Math.max(2, radius * 0.36)}
          fill="none"
          stroke={PAPER}
          strokeWidth={strokeWidth}
          opacity={opacity * 0.72}
        />
      </React.Fragment>
    )
  }

  return (
    <React.Fragment key={key}>
      <circle
        cx={body.x}
        cy={body.y}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
      <circle
        cx={body.x - radius * 0.25}
        cy={body.y - radius * 0.28}
        r={Math.max(1, radius * 0.18)}
        fill="rgba(255,255,255,0.34)"
      />
    </React.Fragment>
  )
}

/** Draw supplied relations and committed source-to-product lineage. */
export function drawCrucibleBonds<TDatum extends Datum>(
  ctx: CanvasRenderingContext2D,
  bodies: readonly PhysicsBodyState[],
  state: CrucibleRunState<TDatum>
): void {
  const bySemanticId = new Map<string, PhysicsBodyState>()
  for (const body of bodies) {
    const wrapped = body.datum as CrucibleBodyDatum<TDatum> | undefined
    if (wrapped?.__crucible)
      bySemanticId.set(`${wrapped.kind}:${wrapped.semanticId}`, body)
  }

  ctx.save()
  ctx.lineCap = "round"
  for (const relation of Object.values(state.relations)) {
    if (relation.status !== "active") continue
    const sourceBodies = relation.sourceIds
      .map((id) => bySemanticId.get(`component:${id}`))
      .filter((body): body is PhysicsBodyState => Boolean(body))
    if (sourceBodies.length < 2) continue
    ctx.strokeStyle = relation.category === "rejected" ? "#9f3d35" : "#b8792d"
    ctx.globalAlpha = 0.4
    ctx.lineWidth = Math.max(0.8, Number(relation.strength ?? 1) * 1.3)
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    sourceBodies.forEach((body, index) => {
      if (index === 0) ctx.moveTo(body.x, body.y)
      else ctx.lineTo(body.x, body.y)
    })
    ctx.stroke()
  }

  ctx.setLineDash([])
  for (const product of Object.values(state.products)) {
    const productBody = bySemanticId.get(`product:${product.id}`)
    if (!productBody) continue
    for (const sourceId of product.sourceIds) {
      const sourceBody = bySemanticId.get(`component:${sourceId}`)
      if (!sourceBody) continue
      ctx.strokeStyle = product.color ?? "#b8792d"
      ctx.globalAlpha = product.status === "complete" ? 0.5 : 0.28
      ctx.lineWidth = product.status === "complete" ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(sourceBody.x, sourceBody.y)
      ctx.lineTo(productBody.x, productBody.y)
      ctx.stroke()
    }
  }
  ctx.restore()
}
