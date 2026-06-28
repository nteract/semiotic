import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { MarginType } from "../types/marginType"
import type { GeoScales, GeoSceneNode } from "./geoTypes"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import type { Style, ThemeSemanticColors } from "./types"

/**
 * Custom-layout escape hatch for `StreamGeoFrame`.
 *
 * The frame resolves and fits the geographic projection before invoking the
 * layout. The layout may use those geographic scales, replace the built-in
 * geometry entirely, or combine both approaches while continuing to emit the
 * GeoFrame scene primitives (`geoarea`, `point`, and `line`).
 */
export type GeoCustomLayout<C extends object = Record<string, unknown>> = (
  ctx: GeoLayoutContext<C>
) => GeoLayoutResult

export interface GeoLayoutContext<C extends object = Record<string, unknown>> {
  /** Geographic areas supplied to the frame. */
  areas: GeoJSON.Feature[]
  /** Buffered point data supplied through props or the push API. */
  points: Datum[]
  /** Line/flow records supplied to the frame. */
  lines: Datum[]
  /** Frame-fitted projection helpers. */
  scales: GeoScales
  /** Plot-local geometry. Scene-node coordinates are relative to this plot. */
  dimensions: {
    width: number
    height: number
    margin: MarginType
    plot: { x: number; y: number; width: number; height: number }
  }
  /** Theme-resolved semantic and categorical colors. */
  theme: {
    semantic: ThemeSemanticColors
    categorical: string[]
  }
  /** Resolve a stable categorical color from the active palette. */
  resolveColor: (key: string) => string
  /** User configuration threaded through `layoutConfig`. */
  config: C
  /** Shared-selection projection, when the chart participates in one. */
  selection?: CustomLayoutSelection | null
}

export interface GeoLayoutResult {
  /** Geo scene nodes rendered on canvas and serialized for SSR. */
  nodes?: GeoSceneNode[]
  /** SVG graphics composited above the canvas. */
  overlays?: ReactNode
  /**
   * Selection-only style updates that do not require rebuilding geometry.
   * Patches are merged onto the node's original emitted style.
   */
  restyle?: (
    node: GeoSceneNode,
    selection: CustomLayoutSelection | null
  ) => Partial<Style> | void
}
