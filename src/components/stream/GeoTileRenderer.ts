/**
 * GeoTileRenderer — fetches, caches, and renders raster map tiles on a canvas.
 *
 * Uses d3-tile to compute visible tiles from projection state.
 * Tile images are cached in an LRU map to avoid re-fetching.
 *
 * Tiles are always in Web Mercator projection. A dev warning is
 * emitted if tiles are used with a non-Mercator projection.
 */
import { tile as d3Tile, tileWrap } from "d3-tile"
import type { GeoProjection } from "d3-geo"
import { getDevicePixelRatio } from "./canvasSetup"

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
      if (oldestKey) this.cache.delete(oldestKey)
      else break
    }
  }

  clear(): void {
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

  const tiles = d3Tile()
    .size([width, height])
    .scale(tileScale)
    .translate(projTranslate as [number, number])
    .clamp(true)
    ()

  const dpr = getDevicePixelRatio()
  let allLoaded = true

  for (const t of tiles) {
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

    // Compute tile position on canvas
    // t[0] and t[1] are the original (unwrapped) tile coords from d3-tile
    const tileK = tiles.scale
    const tileTx = tiles.translate[0]
    const tileTy = tiles.translate[1]

    const tileX = (t[0] + tileTx) * tileK
    const tileY = (t[1] + tileTy) * tileK

    // Draw with 0.5px overlap to eliminate antialiasing seam lines
    ctx.drawImage(cached.img, tileX - 0.5, tileY - 0.5, tileK + 1, tileK + 1)
  }

  return allLoaded
}
