/**
 * GeoTileRenderer — fetches, caches, and renders raster map tiles on a canvas.
 *
 * Inlines slippy-tile math from `d3-tile` (the v1 module is ~30 lines
 * of math; the dependency wasn't earning its weight). The math is
 * Web Mercator standard: each zoom level z has 2^z × 2^z 256-px tiles
 * tiling the world; given a projection scale (in d3 units, where
 * scale=256 puts the world in 256 px) and a translate offset, we
 * compute the tile coordinates that cover the visible viewport and
 * the (translate, scale) transform that maps tile coords to canvas px.
 *
 * Tiles are always in Web Mercator projection. A dev warning is
 * emitted if tiles are used with a non-Mercator projection.
 */
import type { GeoProjection } from "d3-geo"
import { getDevicePixelRatio } from "./canvasSetup"

// ── Slippy-tile math (inlined from d3-tile v1) ────────────────────────

interface TileLayout {
  /** `[x, y, z]` tile triples that cover the viewport. */
  tiles: Array<[number, number, number]>
  /** Translate applied in tile-coord space: `tileX_canvas = (tx + translate[0]) * scale`. */
  translate: [number, number]
  /** Per-tile pixel size at the chosen zoom level. */
  scale: number
}

interface TileLayoutInput {
  size: [number, number]
  scale: number
  translate: [number, number]
  clampX?: boolean
  clampY?: boolean
}

/**
 * Compute the slippy-tile layout for a viewport. `scale` is in d3-tile
 * units (matches `geoMercator().scale() * 2π`). Returns the tile triples
 * plus the translate/scale needed to draw each tile at the right canvas
 * pixel position. Mirrors d3-tile@1's default-options behavior with
 * `tileSize=256` and clamping enabled by default.
 */
function computeTileLayout(input: TileLayoutInput): TileLayout {
  const { size, scale, translate, clampX = true, clampY = true } = input
  // z is the fractional zoom level; z0 is the integer level we render
  // at (z0 = round(z) so the rendered tile size k stays close to 256 px).
  const z = Math.max(Math.log(scale) / Math.LN2 - 8, 0)
  const z0 = Math.round(z)
  const j = 1 << z0 // tiles per side at z0
  const k = Math.pow(2, z - z0 + 8) // per-tile pixel size at z0
  const x = translate[0] - scale / 2
  const y = translate[1] - scale / 2
  const xMin = Math.max(clampX ? 0 : -Infinity, Math.floor((0 - x) / k))
  const xMax = Math.min(clampX ? j : Infinity, Math.ceil((size[0] - x) / k))
  const yMin = Math.max(clampY ? 0 : -Infinity, Math.floor((0 - y) / k))
  const yMax = Math.min(clampY ? j : Infinity, Math.ceil((size[1] - y) / k))

  const tiles: Array<[number, number, number]> = []
  for (let ty = yMin; ty < yMax; ++ty) {
    for (let tx = xMin; tx < xMax; ++tx) {
      tiles.push([tx, ty, z0])
    }
  }

  return { tiles, translate: [x / k, y / k], scale: k }
}

/**
 * Wrap an x tile coordinate at the antimeridian. y/z pass through.
 * Tile servers expect x in `[0, 2^z)`, so a tile at x = -1 is the
 * tile at x = 2^z - 1. Mirrors d3-tile's `tileWrap` helper.
 */
function tileWrap([x, y, z]: [number, number, number]): [number, number, number] {
  const j = 1 << z
  return [x - Math.floor(x / j) * j, y, z]
}

// ── Types ─────────────────────────────────────────────────────────────

export type TileURLTemplate =
  | string
  | ((z: number, x: number, y: number, dpr: number) => string)

interface CachedTile {
  img: HTMLImageElement
  loaded: boolean
  key: string
  lastUsed: number
}

// ── Tile URL resolution ───────────────────────────────────────────────

function resolveTileURL(
  template: TileURLTemplate,
  z: number,
  x: number,
  y: number,
  dpr: number
): string {
  if (typeof template === "function") {
    return template(z, x, y, dpr)
  }
  // String template: replace {z}, {x}, {y}, {r} placeholders
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
    .replace("{r}", dpr > 1 ? "@2x" : "")
}

// ── Tile cache ────────────────────────────────────────────────────────

const DEFAULT_CACHE_LIMIT = 256

export class TileCache {
  private cache = new Map<string, CachedTile>()
  private limit: number

  constructor(limit = DEFAULT_CACHE_LIMIT) {
    this.limit = limit
  }

  get(key: string): CachedTile | undefined {
    const entry = this.cache.get(key)
    if (entry) entry.lastUsed = performance.now()
    return entry
  }

  set(key: string, entry: CachedTile): void {
    this.cache.set(key, entry)
    if (this.cache.size > this.limit) {
      this.evict()
    }
  }

  private evict(): void {
    // Remove single oldest entry — O(n) scan instead of O(n log n) sort
    while (this.cache.size > this.limit) {
      let oldestKey: string | undefined
      let oldestTime = Infinity
      for (const [key, entry] of this.cache) {
        if (entry.lastUsed < oldestTime) {
          oldestTime = entry.lastUsed
          oldestKey = key
        }
      }
      if (oldestKey) {
        const entry = this.cache.get(oldestKey)
        if (entry) {
          entry.img.onload = null
          entry.img.onerror = null
          entry.img.src = ""
        }
        this.cache.delete(oldestKey)
      } else break
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      entry.img.onload = null
      entry.img.onerror = null
      entry.img.src = ""
    }
    this.cache.clear()
  }
}

// ── Tile renderer ─────────────────────────────────────────────────────

export interface TileRenderOptions {
  tileURL: TileURLTemplate
  projection: GeoProjection
  width: number
  height: number
  tileCache: TileCache
  onTileLoad?: () => void
}

/**
 * Render visible tiles onto a canvas context.
 * Returns true if all visible tiles are loaded (no pending fetches).
 */
export function renderTiles(
  ctx: CanvasRenderingContext2D,
  options: TileRenderOptions
): boolean {
  const { tileURL, projection, width, height, tileCache, onTileLoad } = options

  // Get projection scale and translate for d3-tile
  const projScale = projection.scale()
  const projTranslate = projection.translate()

  // d3-tile needs the scale in terms of the full 2π Mercator scale
  // For a Mercator projection: scale = k / (2π), where k is d3's internal scale
  // d3-tile expects: scale = 2π * projection.scale()
  const tileScale = projScale * 2 * Math.PI

  const layout = computeTileLayout({
    size: [width, height],
    scale: tileScale,
    translate: projTranslate as [number, number],
  })

  const dpr = getDevicePixelRatio()
  let allLoaded = true

  for (const t of layout.tiles) {
    const [x, y, z] = tileWrap(t)
    const key = `${z}/${x}/${y}`

    let cached = tileCache.get(key)

    if (!cached) {
      // Start loading
      const img = new Image()
      img.crossOrigin = "anonymous"
      const entry: CachedTile = {
        img,
        loaded: false,
        key,
        lastUsed: performance.now()
      }
      tileCache.set(key, entry)

      img.onload = () => {
        entry.loaded = true
        onTileLoad?.()
      }
      img.onerror = () => {
        // Mark as loaded (with broken image) to avoid re-fetching
        entry.loaded = true
      }
      img.src = resolveTileURL(tileURL, z, x, y, dpr)
      cached = entry
    }

    if (!cached.loaded) {
      allLoaded = false
      continue
    }

    // Compute tile position on canvas. t[0] / t[1] are the original
    // (unwrapped) tile coords; the layout-level scale + translate
    // turn them into canvas pixel offsets.
    const tileK = layout.scale
    const tileTx = layout.translate[0]
    const tileTy = layout.translate[1]

    const tileX = (t[0] + tileTx) * tileK
    const tileY = (t[1] + tileTy) * tileK

    // Draw with 0.5px overlap to eliminate antialiasing seam lines
    ctx.drawImage(cached.img, tileX - 0.5, tileY - 0.5, tileK + 1, tileK + 1)
  }

  return allLoaded
}
