"use client"
/**
 * Placement helpers for custom-layout decorations under a network
 * `perspective`. Kept out of `networkPerspectiveContext` so frames that never
 * render recipes (realtime, plain HOCs) do not carry them.
 */
import * as React from "react"
import type { NetworkPerspectiveFrame } from "./networkPerspective"
import { useNetworkPerspective } from "./networkPerspectiveContext"

/** Height in layout px; `"top"` is the scene's piece tops, where edges ride. */
export type NetworkPerspectiveHeight = number | "top"

function heightOf(frame: NetworkPerspectiveFrame, z: NetworkPerspectiveHeight): number {
  return z === "top" ? frame.thickness ?? 0 : Number.isFinite(z) ? z : 0
}

/** True for the identity projection (a flat chart, or a finished tween to flat). */
function isIdentity(frame: NetworkPerspectiveFrame): boolean {
  const [a, b, c, d, e, f] = frame.matrix
  return a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0
}

const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * Lay SVG children, authored in flat plot coordinates, on the projected
 * ground plane `z` above the ground. Use it inside custom-layout
 * `backgrounds` or `overlays` for ground geometry such as hulls, lanes,
 * arrowheads (`z="top"`, where edges ride) and zone outlines, while legends
 * and titles stay flat. Renders children untouched when the chart is flat.
 */
export function NetworkPerspectiveGround({
  z = 0,
  children
}: {
  /** Plane height in layout px, or `"top"` for the piece tops. @default 0 */
  z?: NetworkPerspectiveHeight
  children?: React.ReactNode
}): React.ReactElement {
  const frame = useNetworkPerspective()
  if (isIdentity(frame)) return <>{children}</>
  const [a, b, c, d, e, f] = frame.matrix
  const lifted = f - frame.lift * heightOf(frame, z)
  return (
    <g data-perspective="ground" transform={`matrix(${[a, b, c, d, e, lifted].map(r2).join(" ")})`}>
      {children}
    </g>
  )
}

/**
 * Move SVG children, authored in flat plot coordinates, with their anchor
 * point `(x, y)`: the content keeps its pixel size and lands on the projected
 * point `z` above the ground. By default it stays upright, for node badges,
 * labels and icons drawn in `overlays`. With `onGround` it lies on the ground
 * the way point marks (tokens) do, for decorations drawn on top of a circle
 * or symbol. Renders children untouched when the chart is flat.
 */
export function NetworkPerspectiveBillboard({
  x,
  y,
  z = "top",
  onGround = false,
  children
}: {
  x: number
  y: number
  /** Anchor height in layout px, or `"top"` for the piece tops. @default "top" */
  z?: NetworkPerspectiveHeight
  /** Lay the content on the ground at its pixel size instead of standing it up. */
  onGround?: boolean
  children?: React.ReactNode
}): React.ReactElement {
  const frame = useNetworkPerspective()
  if (isIdentity(frame) || !Number.isFinite(x) || !Number.isFinite(y)) return <>{children}</>
  const [px, py] = frame.project(x, y, heightOf(frame, z))
  if (!onGround) {
    return (
      <g data-perspective="billboard" transform={`translate(${r2(px - x)},${r2(py - y)})`}>
        {children}
      </g>
    )
  }
  // The ground map normalized to unit x-scale, as tokens are laid.
  const [a, b, c, d] = frame.matrix
  const k = Math.hypot(a, c) || 1
  const lay = [a / k, b / k, c / k, d / k].map((v) => Math.round(v * 1e4) / 1e4).join(" ")
  return (
    <g
      data-perspective="on-ground"
      transform={`translate(${r2(px)},${r2(py)}) matrix(${lay} 0 0) translate(${r2(-x)},${r2(-y)})`}
    >
      {children}
    </g>
  )
}
