import { geoMercator } from "d3-geo"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderTiles, TileCache } from "./GeoTileRenderer"

class MockImage {
  static instances: MockImage[] = []
  crossOrigin = ""
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ""

  constructor() {
    MockImage.instances.push(this)
  }
}

describe("GeoTileRenderer", () => {
  beforeEach(() => {
    MockImage.instances = []
    vi.stubGlobal("Image", MockImage)
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 1,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("keys cached tiles by provider identity and effective DPR", () => {
    const cache = new TileCache()
    const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    const projection = geoMercator().scale(40).translate([128, 128])
    const providerA = () => "https://tiles.example/same.png"
    const providerB = () => "https://tiles.example/same.png"
    const options = { projection, width: 256, height: 256, tileCache: cache }

    renderTiles(ctx, { ...options, tileURL: providerA })
    const firstCount = MockImage.instances.length
    expect(firstCount).toBeGreaterThan(0)

    renderTiles(ctx, { ...options, tileURL: providerA })
    expect(MockImage.instances).toHaveLength(firstCount)

    renderTiles(ctx, { ...options, tileURL: providerB })
    expect(MockImage.instances).toHaveLength(firstCount * 2)

    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    })
    renderTiles(ctx, { ...options, tileURL: providerB })
    expect(MockImage.instances).toHaveLength(firstCount * 3)
  })

  it("schedules a terminal repaint after a tile load error", () => {
    const onTileLoad = vi.fn()
    renderTiles(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
      {
        tileURL: "https://tiles.example/{z}/{x}/{y}{r}.png",
        projection: geoMercator().scale(40).translate([128, 128]),
        width: 256,
        height: 256,
        tileCache: new TileCache(),
        onTileLoad,
      }
    )
    expect(MockImage.instances.length).toBeGreaterThan(0)
    MockImage.instances[0].onerror?.()
    expect(onTileLoad).toHaveBeenCalledTimes(1)
  })

  it("clamps cache limits to at least one entry", () => {
    const cache = new TileCache(0)
    cache.setLimit(0)
    const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
    renderTiles(ctx, {
      tileURL: "https://tiles.example/{z}/{x}/{y}.png",
      projection: geoMercator().scale(40).translate([128, 128]),
      width: 256,
      height: 256,
      tileCache: cache,
    })
    expect(MockImage.instances.length).toBeGreaterThan(0)
  })

  it("normalizes non-finite cache limits to the finite default", () => {
    const cache = new TileCache(Number.NaN)
    const state = cache as unknown as { limit: number }
    expect(state.limit).toBe(256)

    cache.setLimit(Infinity)
    expect(state.limit).toBe(256)
    cache.setLimit(3.9)
    expect(state.limit).toBe(3)
    cache.setLimit(-10)
    expect(state.limit).toBe(1)
  })
})
