export interface SharpPipeline {
  resize(width: number, height: number): SharpPipeline
  ensureAlpha(): SharpPipeline
  raw(): SharpPipeline
  jpeg(options: { quality: number }): SharpPipeline
  png(): SharpPipeline
  toBuffer(): Promise<Buffer>
}

export type SharpFactory = (
  input: Uint8Array,
  options?: { density: number }
) => SharpPipeline

export type SharpModule = SharpFactory & { default?: SharpFactory }

export type GifPalette = number[][] | Uint8Array

export interface GifEncoder {
  writeFrame(
    indexedPixels: Uint8Array,
    width: number,
    height: number,
    options: {
      palette: GifPalette
      delay: number
      repeat: number
    }
  ): void
  finish(): void
  bytes(): Uint8Array
}

export interface GifencExports {
  GIFEncoder?: () => GifEncoder
  quantize?: (pixels: Uint8Array, maxColors: number) => GifPalette
  applyPalette?: (pixels: Uint8Array, palette: GifPalette) => Uint8Array
  default?: GifencExports
}

export interface GifencRuntimeExports extends GifencExports {
  GIFEncoder: () => GifEncoder
  quantize: (pixels: Uint8Array, maxColors: number) => GifPalette
  applyPalette: (pixels: Uint8Array, palette: GifPalette) => Uint8Array
}
