import { describe, expect, it, vi } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { renderHook } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import {
  isUnderLayerBand,
  paintCanvasPreRenderers,
  underBandCanvasRenderer,
  underBandRect,
  underBandSVGRenderer,
  useUnderLayerBandRenderers,
} from "./underLayerBands"
import type { CanvasRendererFn, StreamScales } from "./types"

const scales = {
  x: scaleLinear().domain([0, 100]).range([0, 400]),
  y: scaleLinear().domain([0, 100]).range([200, 0]),
} as unknown as StreamScales
const layout = { width: 400, height: 200 }

function recordingContext() {
  const calls: Array<{ fillStyle: unknown; globalAlpha: number; rect: number[] }> = []
  const gradient = { addColorStop: vi.fn() }
  const ctx = {
    globalAlpha: 0.5,
    fillStyle: "",
    canvas: null,
    fillRect(x: number, y: number, w: number, h: number) {
      calls.push({ fillStyle: this.fillStyle, globalAlpha: this.globalAlpha, rect: [x, y, w, h] })
    },
    createLinearGradient: vi.fn(() => gradient),
    save: vi.fn(),
    restore: vi.fn(),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, gradient }
}

describe("isUnderLayerBand", () => {
  it("selects only band and x-band annotations with layer under", () => {
    expect(isUnderLayerBand({ type: "band", layer: "under" })).toBe(true)
    expect(isUnderLayerBand({ type: "x-band", layer: "under" })).toBe(true)
    expect(isUnderLayerBand({ type: "band" })).toBe(false)
    expect(isUnderLayerBand({ type: "y-threshold", layer: "under" })).toBe(false)
  })
})

describe("underBandRect", () => {
  it("spans the plot between the bounds, extending an open bound to the domain edge", () => {
    expect(underBandRect({ type: "band", y0: 20, y1: 60 }, scales, 400, 200)).toEqual({ x: 0, y: 80, width: 400, height: 80 })
    expect(underBandRect({ type: "x-band", x0: 70, x1: 30 }, scales, 400, 200)).toEqual({ x: 120, y: 0, width: 160, height: 200 })
    expect(underBandRect({ type: "x-band", x0: 20, x1: null }, scales, 400, 200)).toEqual({ x: 80, y: 0, width: 320, height: 200 })
    expect(underBandRect({ type: "band", y0: 20 }, {}, 400, 200)).toBeNull()
  })

  it("clamps bounds past the domain to the plot", () => {
    expect(underBandRect({ type: "band", y0: 50, y1: 200 }, scales, 400, 200)).toEqual({ x: 0, y: 0, width: 400, height: 100 })
    expect(underBandRect({ type: "x-band", x0: -50, x1: 25 }, scales, 400, 200)).toEqual({ x: 0, y: 0, width: 100, height: 200 })
    expect(underBandRect({ type: "x-band", x0: 150, x1: 200 }, scales, 400, 200)).toEqual({ x: 400, y: 0, width: 0, height: 200 })
  })
})

describe("underBandCanvasRenderer", () => {
  it("paints each band at its opacity times fillOpacity, on top of the context alpha", () => {
    const { ctx, calls } = recordingContext()
    underBandCanvasRenderer([
      { type: "band", y0: 20, y1: 60, fill: "#22c55e", fillOpacity: 0.3 },
      { type: "x-band", x0: 10, x1: 20, color: "#ef4444", opacity: 0.5 },
    ])(ctx, [], scales, layout)
    expect(calls).toEqual([
      { fillStyle: "#22c55e", globalAlpha: 0.5 * 0.3, rect: [0, 80, 400, 80] },
      { fillStyle: "#ef4444", globalAlpha: 0.5 * 0.5 * 0.1, rect: [40, 0, 40, 200] },
    ])
    expect(ctx.globalAlpha).toBe(0.5)
  })

  it("builds a canvas gradient along the band's axis", () => {
    const { ctx, gradient } = recordingContext()
    underBandCanvasRenderer([
      { type: "band", y0: 20, y1: 60, gradient: { stops: [{ offset: 0, color: "#fff" }, { offset: 1, color: "#000" }] } },
    ])(ctx, [], scales, layout)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 80, 0, 160)
    expect(gradient.addColorStop).toHaveBeenCalledTimes(2)
  })
})

describe("underBandSVGRenderer", () => {
  it("emits the band fill as a rect with the annotation's opacity and fillOpacity", () => {
    const markup = renderToStaticMarkup(
      <svg>{underBandSVGRenderer([{ type: "band", y0: 20, y1: 60, fill: "#22c55e", opacity: 0.8, fillOpacity: 0.3 }])([], scales, layout)}</svg>
    )
    expect(markup).toContain('<g opacity="0.8"><rect x="0" y="80" width="400" height="80" fill="#22c55e" fill-opacity="0.3"></rect></g>')
  })
})

describe("useUnderLayerBandRenderers", () => {
  const authored: CanvasRendererFn = () => {}

  it("removes canvas fills when bands are retracted or superseded by non-bands", () => {
    const band = { type: "band", layer: "under", y0: 20, y1: 60, fill: "#22c55e", provenance: { stableId: "old" } }
    const { result, rerender } = renderHook(
      ({ annotations }) => useUnderLayerBandRenderers(annotations, undefined, undefined),
      { initialProps: { annotations: [band] as Array<Record<string, unknown>> } }
    )
    const { ctx, calls } = recordingContext()
    paintCanvasPreRenderers(ctx, result.current.canvasPreRenderers, [], scales, layout)
    expect(calls).toHaveLength(1)
    rerender({ annotations: [{ ...band, lifecycle: { status: "retracted" } }] })
    paintCanvasPreRenderers(ctx, result.current.canvasPreRenderers, [], scales, layout)
    expect(calls).toHaveLength(1)
    rerender({ annotations: [band, { type: "y-threshold", lifecycle: { supersedes: "old" } }] })
    paintCanvasPreRenderers(ctx, result.current.canvasPreRenderers, [], scales, layout)
    expect(calls).toHaveLength(1)
    expect(result.current.svgPreRenderers).toBeUndefined()
  })

  it("returns the authored renderers untouched without under-layer bands", () => {
    const canvas = [authored]
    const { result } = renderHook(() => useUnderLayerBandRenderers([{ type: "band", y0: 1, y1: 2 }], canvas, undefined))
    expect(result.current.canvasPreRenderers).toBe(canvas)
    expect(result.current.svgPreRenderers).toBeUndefined()
  })

  it("draws the bands first and stays stable across renders with an inline annotations array", () => {
    const canvas = [authored]
    const { result, rerender } = renderHook(
      ({ y1 }) => useUnderLayerBandRenderers([{ type: "band", y0: 1, y1, layer: "under" }], canvas, undefined),
      { initialProps: { y1: 2 } }
    )
    const first = result.current
    expect(first.canvasPreRenderers).toHaveLength(2)
    expect(first.canvasPreRenderers?.[1]).toBe(authored)
    expect(first.svgPreRenderers).toHaveLength(1)
    rerender({ y1: 2 })
    expect(result.current).toBe(first)
    rerender({ y1: 3 })
    expect(result.current).not.toBe(first)
  })
})

describe("paintCanvasPreRenderers", () => {
  it("isolates each renderer's context state and skips without scales", () => {
    const { ctx } = recordingContext()
    const renderer = vi.fn()
    paintCanvasPreRenderers(ctx, [renderer, renderer], [], scales, layout)
    expect(renderer).toHaveBeenCalledTimes(2)
    expect(ctx.save).toHaveBeenCalledTimes(2)
    expect(ctx.restore).toHaveBeenCalledTimes(2)
    paintCanvasPreRenderers(ctx, [renderer], [], null, layout)
    expect(renderer).toHaveBeenCalledTimes(2)
  })
})
