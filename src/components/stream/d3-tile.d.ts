declare module "d3-tile" {
  interface TileResult extends Array<[number, number, number]> {
    translate: [number, number]
    scale: number
  }

  interface TileGenerator {
    (): TileResult
    size(size: [number, number]): TileGenerator
    extent(extent: [[number, number], [number, number]]): TileGenerator
    scale(scale: number | (() => number)): TileGenerator
    translate(translate: [number, number] | (() => [number, number])): TileGenerator
    zoomDelta(delta: number): TileGenerator
    tileSize(size: number): TileGenerator
    clamp(clamp: boolean): TileGenerator
    clampX(clamp: boolean): TileGenerator
    clampY(clamp: boolean): TileGenerator
  }

  export function tile(): TileGenerator
  export function tileWrap(tile: [number, number, number]): [number, number, number]
}
