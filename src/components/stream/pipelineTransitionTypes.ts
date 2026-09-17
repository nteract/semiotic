/**
 * Shared types for XY pipeline transitions.
 *
 * Kept separate from the discrete-mark orchestrator and the line/area path
 * join so those modules can import without a cycle.
 */
import type { GlyphDef } from "./glyphDef"
import type { SceneNode } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import type { ActiveTransition } from "./pipelineTransitionUtils"

export type PrevPosition = {
  x: number
  y: number
  w?: number
  h?: number
  r?: number
  opacity?: number
  // Candlestick-only: the four y-coords of an OHLC bar. Stored separately
  // so geometry interpolates (body top/bottom, wick top/bottom) during a
  // transition instead of snapping.
  openY?: number
  closeY?: number
  highY?: number
  lowY?: number
  // Glyph-only: the pictogram definition + paint, carried so an exiting
  // glyph can fade out as itself (in a neutral ink) rather than vanish.
  glyph?: GlyphDef
}

export type PrevPath = {
  topPath?: [number, number][]
  bottomPath?: [number, number][]
  path?: [number, number][]
  pathIds?: string[]
  opacity?: number
}

/** Context needed from PipelineStore for identity resolution */
export interface TransitionContext {
  runtimeMode?: "streaming" | "bounded"
  getX: (d: Datum) => number
  getY: (d: Datum) => number
  getCategory?: (d: Datum) => string
  getPointId?: (d: Datum) => string
}

export interface TransitionState {
  scene: SceneNode[]
  exitNodes: SceneNode[]
  activeTransition: ActiveTransition | null
}
