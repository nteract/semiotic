import type { Datum } from "../charts/shared/datumTypes"

export type WordCloudAccessor<T> = string | ((datum: Datum) => T)

/** A silhouette describes allowed ink for inside mode, or an obstacle for outside mode. */
export type WordCloudMask =
  | {
      type: "svgPath"
      path: string
      viewBox: [number, number, number, number]
      fillRule?: "nonzero" | "evenodd"
      mode?: "inside" | "outside"
    }
  | {
      type: "image"
      /** Same-origin/CORS-enabled URL or data URL. Alpha defines the silhouette. */
      src: string
      mode?: "inside" | "outside"
    }

/** Already aggregated terms; no implicit tokenization or stop-word removal. */
export interface WordCloudLayoutOptions {
  data: readonly Datum[]
  width?: number
  height?: number
  textAccessor?: WordCloudAccessor<string>
  valueAccessor?: WordCloudAccessor<number>
  idAccessor?: WordCloudAccessor<string>
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: "normal" | "italic" | "oblique"
  fontSizeRange?: [number, number]
  fontSizeScale?: "sqrt" | "linear" | "log"
  rotate?: "horizontal" | "orthogonal" | readonly number[]
  padding?: number
  seed?: number
  strategy?: "archimedean" | "rectangular"
  maxWords?: number
  mask?: WordCloudMask
  maskFit?: "contain" | "cover"
  maskThreshold?: number
}

export interface WordCloudPlacedWord {
  id: string
  text: string
  value: number
  sourceIndex: number
  /** Center-origin coordinates; y is the alphabetic baseline. */
  x: number
  y: number
  /** Occupied, rotated bounds relative to the word anchor, including padding. */
  x0: number
  y0: number
  x1: number
  y1: number
  fontFamily: string
  fontStyle: string
  fontWeight: string | number
  fontSize: number
  /** Clockwise degrees. */
  rotate: number
}

export interface WordCloudOmission {
  id: string
  sourceIndex: number
  reason:
    | "invalid-row"
    | "missing-text"
    | "invalid-value"
    | "duplicate-id"
    | "max-words"
    | "no-space"
    | "rasterization"
}

/** Portable geometry: no DOM objects, sprite instances, or original mutable data. */
export interface WordCloudLayoutResult {
  version: 1
  width: number
  height: number
  seed: number
  engineVersion: "d3-cloud@2.0.0"
  inputFingerprint: string
  fontFingerprint: string
  /** Caller-supplied identity of the loaded font files / raster environment. */
  fontIdentity?: string
  maskFingerprint?: string
  maskResolution: [number, number] | null
  inputCount: number
  words: WordCloudPlacedWord[]
  omitted: WordCloudOmission[]
  /** Bounds of words alone, excluding the invisible mask obstacle. */
  bounds: [{ x: number; y: number }, { x: number; y: number }] | null
}

/** Inject a raster environment for Node; no native Canvas package is required by Semiotic. */
export interface WordCloudCanvasEnvironment {
  canvas?: () => {
    width: number
    height: number
    getContext(context: "2d"): unknown
  }
  path?: (svgPath: string) => Path2D
  loadImage?: (
    src: string
  ) => Promise<CanvasImageSource & { width: number; height: number }>
  /** Identify the exact font file / raster environment when caching across hosts. */
  fontIdentity?: string
}

export class WordCloudLayoutError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "CANVAS_REQUIRED"
      | "FONT_UNAVAILABLE"
      | "INVALID_MASK"
      | "MASK_LOAD"
      | "RASTERIZATION"
      | "STALE_LAYOUT",
    message: string
  ) {
    super(message)
    this.name = "WordCloudLayoutError"
  }
}
