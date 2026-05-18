/**
 * Integration test for the ProcessSankey body-hover regression.
 *
 * Symptom under repro: hover on the BORDER of a band/ribbon shows a
 * tooltip, hover on the BODY does not. This file pins the contract that
 * a point that is geometrically strictly *interior* (≥ 8 px from any
 * perimeter segment) to a band's emitted path produces a hit at
 * `distance: 0` with finite `x`/`y` — the prerequisite for
 * `FlippingTooltip` to actually render.
 *
 * Strategy:
 *   1. Render `ProcessSankey` with realistic fixtures.
 *   2. Intercept `emitProcessSankeyScenes` so we can capture every
 *      `ProcessSankeyBandSpec` the HOC emits — these carry the same
 *      pathD strings the renderer paints.
 *   3. For each band, ray-cast its polygon to find an interior point
 *      that lies further than 8 px from every perimeter segment.
 *   4. Hand that point and the captured scene edges to
 *      `findNearestNetworkNode` (with a real-geometry Path2D + ctx),
 *      asserting `distance === 0` and finite coordinates.
 *
 * This test isolates the contract from rendering/event timing while
 * still using the actual emitted paths — so a future regression where
 * bands stop being filled, the band scene-edge is mistakenly marked
 * non-interactive, or the hit position becomes non-finite again will
 * fail here loudly.
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { ProcessSankey } from "./ProcessSankey"
import { TooltipProvider } from "../../store/TooltipStore"
import type {
  ProcessSankeyBandSpec,
  ProcessSankeyLayoutConfig,
} from "./processSankey/streamingLayout"
import {
  emitProcessSankeyScenes as realEmit,
} from "./processSankey/streamingLayout"
import type { NetworkLayoutContext } from "../../stream/networkCustomLayout"
import type { NetworkSceneEdge, NetworkSceneNode } from "../../stream/networkTypes"

// ── Real-geometry Path2D + ctx ──────────────────────────────────────────

type Cmd = { kind: "M" | "L" | "C"; x: number; y: number }

function parsePath(d: string): Cmd[] {
  const points: Cmd[] = []
  const re = /([MLC])\s*([^MLCZ]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    const kind = m[1].toUpperCase() as "M" | "L" | "C"
    const nums = m[2].split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n))
    if (kind === "C" && nums.length >= 6) {
      points.push({ kind, x: nums[4], y: nums[5] })
    } else if ((kind === "M" || kind === "L") && nums.length >= 2) {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        points.push({ kind, x: nums[i], y: nums[i + 1] })
      }
    }
  }
  return points
}

function pointInPolygon(pts: Cmd[], x: number, y: number): boolean {
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y
    const xj = pts[j].x, yj = pts[j].y
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function minDistanceToPerimeter(pts: Cmd[], x: number, y: number): number {
  let min = Infinity
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const d = pointToSegmentDist(x, y, pts[j].x, pts[j].y, pts[i].x, pts[i].y)
    if (d < min) min = d
  }
  return min
}

function pointNearStroke(pts: Cmd[], x: number, y: number, lineWidth: number): boolean {
  return minDistanceToPerimeter(pts, x, y) <= lineWidth / 2
}

class FakePath2D {
  _pts: Cmd[]
  constructor(d: string) { this._pts = parsePath(d) }
}

function installFakes() {
  const g = globalThis as unknown as { Path2D?: typeof Path2D }
  const origPath2D = g.Path2D
  const origGetContext = HTMLCanvasElement.prototype.getContext
  g.Path2D = FakePath2D as unknown as typeof Path2D
  const noop = () => {}
  HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    const ctx = {
      lineWidth: 1, fillStyle: "", strokeStyle: "", font: "", textAlign: "", textBaseline: "",
      globalAlpha: 1, globalCompositeOperation: "source-over",
      lineCap: "butt", lineJoin: "miter",
      shadowBlur: 0, shadowColor: "rgba(0,0,0,0)", shadowOffsetX: 0, shadowOffsetY: 0,
      isPointInPath(path: FakePath2D, x: number, y: number) { return pointInPolygon(path._pts, x, y) },
      isPointInStroke(path: FakePath2D, x: number, y: number) { return pointNearStroke(path._pts, x, y, this.lineWidth) },
      setTransform: noop, translate: noop, scale: noop, transform: noop, resetTransform: noop,
      clearRect: noop, fillRect: noop, strokeRect: noop, fill: noop, stroke: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
      quadraticCurveTo: noop, bezierCurveTo: noop, rect: noop, clip: noop,
      save: noop, restore: noop, fillText: noop, strokeText: noop,
      measureText: () => ({ width: 0 }),
      drawImage: noop, putImageData: noop,
      getImageData: () => ({ data: new Uint8ClampedArray(0) }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      createPattern: noop,
      setLineDash: noop, getLineDash: () => [],
    } as unknown as CanvasRenderingContext2D
    return ctx
  }) as unknown as HTMLCanvasElement["getContext"]
  return () => {
    g.Path2D = origPath2D
    HTMLCanvasElement.prototype.getContext = origGetContext
  }
}

// ── Spy: capture the bands ProcessSankey passes through to the scene ────

let capturedConfig: ProcessSankeyLayoutConfig | null = null
let capturedEdges: NetworkSceneEdge[] = []
let capturedNodes: NetworkSceneNode[] = []

vi.mock("./processSankey/streamingLayout", async (importOriginal) => {
  const mod: typeof import("./processSankey/streamingLayout") = await importOriginal()
  return {
    ...mod,
    emitProcessSankeyScenes: (ctx: NetworkLayoutContext) => {
      capturedConfig = ctx.config as unknown as ProcessSankeyLayoutConfig
      const result = mod.emitProcessSankeyScenes(ctx)
      capturedEdges = result.sceneEdges ?? []
      capturedNodes = result.sceneNodes ?? []
      return result
    },
  }
})

describe("ProcessSankey body-hover (integration)", () => {
  let restore: (() => void) | null = null
  afterEach(() => {
    restore?.()
    restore = null
    capturedConfig = null
    capturedEdges = []
    capturedNodes = []
  })

  it("registers an interior body hit on a band path (distance 0, finite coords)", async () => {
    restore = installFakes()
    // Bands need a lifetime extent to have a non-zero interior. Give
    // each node an explicit `xExtent` AND wire multiple overlapping
    // edges so the source/target lanes carry mass across a window,
    // producing a band big enough to have a body to hit. The fixture
    // mirrors what the docs Quick Start renders.
    const nodes = [
      { id: "Alice", category: "Person", xExtent: [5, 95] },
      { id: "Bob",   category: "Person", xExtent: [5, 95] },
      { id: "Eng",   category: "Team",   xExtent: [5, 95] },
    ]
    const edges = [
      { id: "alice-eng-a", source: "Alice", target: "Eng", value: 20, startTime: 15, endTime: 45 },
      { id: "alice-eng-b", source: "Alice", target: "Eng", value: 12, startTime: 30, endTime: 65 },
      { id: "bob-eng",     source: "Bob",   target: "Eng", value: 18, startTime: 25, endTime: 70 },
      { id: "bob-eng-2",   source: "Bob",   target: "Eng", value: 10, startTime: 50, endTime: 85 },
    ]

    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={nodes}
          edges={edges}
          domain={[0, 100]}
          width={800}
          height={500}
          margin={{ top: 20, right: 20, bottom: 20, left: 60 }}
        />
      </TooltipProvider>,
    )

    // The HOC always emits at least one band per node; if this fails
    // the test is broken (capture path or layout) before we can pin the
    // hover contract.
    expect(capturedConfig).not.toBeNull()
    expect(capturedConfig!.bands.length).toBeGreaterThanOrEqual(2)
    expect(capturedEdges.length).toBeGreaterThanOrEqual(2)

    // Find a point that's at least 8 px from any band-perimeter segment
    // — too far for the stroke fallback (lineWidth 10 → 5 px tolerance)
    // to fire, so a hit there must come from `isPointInPath`.
    const interior = findInteriorPoint(capturedConfig!.bands, 8)
    expect(interior, "couldn't find an interior point ≥ 8px from any band edge — the fixture may produce degenerate bands; widen the time range or add more edges").not.toBeNull()
    const { band, x, y } = interior!

    // Sanity: confirm the chosen point really is inside the band
    // polygon AND outside the stroke tolerance — if these fail, the
    // perimeter-distance threshold above needs tuning, not the
    // production code.
    const pts = parsePath(band.pathD)
    expect(pointInPolygon(pts, x, y)).toBe(true)
    expect(pointNearStroke(pts, x, y, 10)).toBe(false)

    // Production hit test against the captured scene. Must return the
    // band (not null, not a ribbon), with finite coordinates and
    // distance 0 — the body-hit signature `FlippingTooltip` needs.
    const { findNearestNetworkNode } = await import("../../stream/NetworkCanvasHitTester")
    const hit = findNearestNetworkNode(capturedNodes, capturedEdges, x, y)
    expect(hit, "no hit returned for an interior body point").not.toBeNull()
    expect(hit!.type).toBe("edge")
    expect(hit!.distance).toBe(0)
    expect(Number.isFinite(hit!.x)).toBe(true)
    expect(Number.isFinite(hit!.y)).toBe(true)

    // Routing: the hit datum must point at the band that contained the
    // point, not some adjacent ribbon. ProcessSankey marks its scene
    // payloads with `__kind: "band" | "ribbon"`.
    const datum = hit!.datum as { __kind?: string; id?: string }
    expect(datum.__kind).toBe("band")
    expect(datum.id).toBe(band.id)
  })

  it("registers an interior body hit on a ribbon path", async () => {
    restore = installFakes()
    const nodes = [
      { id: "Alice", category: "Person", xExtent: [5, 95] },
      { id: "Bob",   category: "Person", xExtent: [5, 95] },
      { id: "Eng",   category: "Team",   xExtent: [5, 95] },
    ]
    const edges = [
      { id: "alice-eng-a", source: "Alice", target: "Eng", value: 20, startTime: 15, endTime: 45 },
      { id: "alice-eng-b", source: "Alice", target: "Eng", value: 12, startTime: 30, endTime: 65 },
      { id: "bob-eng",     source: "Bob",   target: "Eng", value: 18, startTime: 25, endTime: 70 },
      { id: "bob-eng-2",   source: "Bob",   target: "Eng", value: 10, startTime: 50, endTime: 85 },
    ]
    render(
      <TooltipProvider>
        <ProcessSankey
          nodes={nodes}
          edges={edges}
          domain={[0, 100]}
          width={800}
          height={500}
          margin={{ top: 20, right: 20, bottom: 20, left: 60 }}
        />
      </TooltipProvider>,
    )

    expect(capturedConfig).not.toBeNull()
    expect(capturedConfig!.ribbons.length).toBeGreaterThan(0)

    // Each ribbon emits as a bezier with M-C-L-C-Z. Approximate the
    // filled region by sampling the bezier endpoints and find an
    // interior point far enough from any sampled segment to be outside
    // the stroke tolerance.
    const ribbons = capturedConfig!.ribbons
    let hitFound = false
    for (const r of ribbons) {
      const pts = parsePath(r.pathD)
      if (pts.length < 4) continue
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
      const xMin = Math.min(...xs), xMax = Math.max(...xs)
      const yMin = Math.min(...ys), yMax = Math.max(...ys)
      const steps = 30
      outer: for (let i = 1; i < steps; i++) {
        for (let j = 1; j < steps; j++) {
          const x = xMin + ((xMax - xMin) * i) / steps
          const y = yMin + ((yMax - yMin) * j) / steps
          if (pointInPolygon(pts, x, y) && minDistanceToPerimeter(pts, x, y) >= 8) {
            const { findNearestNetworkNode } = await import("../../stream/NetworkCanvasHitTester")
            const hit = findNearestNetworkNode(capturedNodes, capturedEdges, x, y)
            // The hit might be on a band that overlaps the ribbon body;
            // accept either, but require finite coords + distance 0.
            if (hit && hit.distance === 0 && Number.isFinite(hit.x) && Number.isFinite(hit.y)) {
              hitFound = true
              break outer
            }
          }
        }
      }
      if (hitFound) break
    }
    expect(hitFound, "no body hit registered on any ribbon's interior").toBe(true)
  })
})

// Sample a coarse grid over each band's bounding box and return the
// first point that's inside the polygon AND at least `tolerance` px
// from any perimeter segment.
function findInteriorPoint(
  bands: ProcessSankeyBandSpec[],
  tolerance: number,
): { band: ProcessSankeyBandSpec; x: number; y: number } | null {
  for (const band of bands) {
    const pts = parsePath(band.pathD)
    if (pts.length < 3) continue
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const steps = 25
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const x = xMin + ((xMax - xMin) * i) / steps
        const y = yMin + ((yMax - yMin) * j) / steps
        if (
          pointInPolygon(pts, x, y) &&
          minDistanceToPerimeter(pts, x, y) >= tolerance
        ) {
          return { band, x, y }
        }
      }
    }
  }
  return null
}
