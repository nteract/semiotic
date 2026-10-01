import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createHatchPattern, hatchTileGeometry } from "./hatchPattern"
import { hatchPatternDef } from "./hatchFill"
import { createSVGHatchPattern } from "../../server/svgHatchPattern"

interface TileCall {
  op: "fillRect"
  fillStyle: unknown
  globalAlpha: number
  args: number[]
}

function installOffscreenCanvas(calls: TileCall[], sizes: Array<[number, number]>) {
  class FakeOffscreenCanvas {
    constructor(public width: number, public height: number) {
      sizes.push([width, height])
    }
    getContext() {
      const ctx = {
        fillStyle: "" as unknown,
        strokeStyle: "" as unknown,
        globalAlpha: 1,
        lineWidth: 1,
        save: vi.fn(),
        restore: vi.fn(() => {
          ctx.globalAlpha = 1
        }),
        clearRect: vi.fn(),
        fillRect: vi.fn((...args: number[]) => {
          calls.push({ op: "fillRect", fillStyle: ctx.fillStyle, globalAlpha: ctx.globalAlpha, args })
        }),
        createPattern: vi.fn(() => null)
      }
      return ctx
    }
  }
  vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas)
}

function targetContext() {
  const setTransform = vi.fn()
  const createPattern = vi.fn(() => ({ setTransform }) as unknown as CanvasPattern)
  return { ctx: { createPattern } as unknown as CanvasRenderingContext2D, setTransform, createPattern }
}

describe("hatch tile geometry", () => {
  let calls: TileCall[]
  let sizes: Array<[number, number]>

  beforeEach(() => {
    calls = []
    sizes = []
    installOffscreenCanvas(calls, sizes)
    vi.stubGlobal("devicePixelRatio", 1)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("puts one line per spacing, so spacing is the perpendicular gap", () => {
    expect(hatchTileGeometry(5)).toEqual({ width: 8, height: 5, lineY: 2.5 })
    expect(hatchTileGeometry(12)).toEqual({ width: 12, height: 12, lineY: 6 })
    expect(hatchTileGeometry(0).height).toBe(6)
  })

  it("rotates the canvas pattern with the same matrix as SVG rotate(angle)", () => {
    for (const angle of [45, -45, 30, 0, 90]) {
      const { ctx, setTransform } = targetContext()
      createHatchPattern({ spacing: 5, angle }, ctx)
      expect(sizes.at(-1)).toEqual([8, 5])
      const rad = (angle * Math.PI) / 180
      const m = setTransform.mock.calls[0][0]
      // SVG rotate(a) = matrix(cos a, sin a, -sin a, cos a, 0, 0)
      expect(m.a).toBeCloseTo(Math.cos(rad))
      expect(m.b).toBeCloseTo(Math.sin(rad))
      expect(m.c).toBeCloseTo(-Math.sin(rad))
      expect(m.d).toBeCloseTo(Math.cos(rad))
      expect(m.e).toBe(0)
      expect(m.f).toBe(0)
    }
  })

  it("bakes the tile at device resolution and scales it back to CSS pixels", () => {
    vi.stubGlobal("devicePixelRatio", 2)
    const { ctx, setTransform } = targetContext()
    createHatchPattern({ spacing: 5, angle: 0, lineWidth: 1.5 }, ctx)
    expect(sizes.at(-1)).toEqual([16, 10])
    const m = setTransform.mock.calls[0][0]
    expect(m.a).toBeCloseTo(0.5)
    expect(m.d).toBeCloseTo(0.5)
    const line = calls.find((c) => c.fillStyle === "#000")
    // 1.5px line centered on the tile's midline, at 2x.
    expect(line?.args).toEqual([0, 5 - 1.5, 16, 3])
  })

  it("applies lineOpacity to the canvas lines but not the background", () => {
    const { ctx } = targetContext()
    createHatchPattern({ background: "#fde68a", stroke: "#92400e", lineOpacity: 0.4 }, ctx)
    const background = calls.find((c) => c.fillStyle === "#fde68a")
    const line = calls.find((c) => c.fillStyle === "#92400e")
    expect(background?.globalAlpha).toBe(1)
    expect(line?.globalAlpha).toBe(0.4)
  })

  it("serializes the same tile to SVG", () => {
    const svg = renderToStaticMarkup(
      hatchPatternDef({ type: "hatch", stroke: "#123", spacing: 5, angle: -45, lineOpacity: 0.4 }, "h")
    )
    expect(svg).toContain('width="8" height="5"')
    expect(svg).toContain('patternTransform="rotate(-45)"')
    expect(svg).toContain('<line x1="0" y1="2.5" x2="8" y2="2.5" stroke="#123" stroke-width="1.5" stroke-opacity="0.4"')
    expect(svg.match(/<line /g)).toHaveLength(1)
  })

  it("keeps the server funnel helper on the shared tile", () => {
    const svg = renderToStaticMarkup(createSVGHatchPattern({ id: "f", background: "#abc", spacing: 6, angle: 45 }))
    expect(svg).toContain('width="8" height="6"')
    expect(svg).toContain('patternTransform="rotate(45)"')
    expect(svg).toContain('<rect width="8" height="6" fill="#abc"')
    expect(svg).toContain('y1="3"')
  })
})
