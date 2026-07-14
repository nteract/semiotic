import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { Style } from "./types"

/**
 * Optional paint backend for pre-computed scene nodes. A backend may change
 * how a mark looks, but it must not mutate the scene node: original geometry
 * remains authoritative for interaction, focus, transitions, and accessibility.
 */
export interface SceneRenderBackend<Node = unknown> {
  readonly id: string
  cacheKey(node: Node, style: Style): string
  drawCanvas(args: {
    context: CanvasRenderingContext2D
    node: Node
    style: Style
    pixelRatio: number
  }): boolean
  renderStaticSVG(args: {
    node: Node
    style: Style
    key: string
  }): ReactNode | null
}

/** A backend can cover the whole scene or be selected per datum. */
export type SceneRenderMode<Node = unknown> =
  | "sketchy"
  | SceneRenderBackend<Node>
  | ((datum: Datum | null, node: Node) => "sketchy" | SceneRenderBackend<Node> | undefined)
