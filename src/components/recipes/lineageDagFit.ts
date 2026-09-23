import type { Datum } from "../charts/shared/datumTypes"
import type { LineageDagConfig, LineageLod } from "./lineageDag"
import { readField } from "./recipeUtils"

/** Plot-relative box. Frame margins and viewport transforms are applied separately. */
export interface LineageDagFitRect {
  x: number
  y: number
  width: number
  height: number
}

/** Geometry-only subset of the lineage recipe configuration. */
export type LineageDagFitConfig = Pick<
  LineageDagConfig,
  | "layerCount"
  | "maxLayerSize"
  | "nodeWidth"
  | "nodeHeight"
  | "minGapX"
  | "minGapY"
  | "lod"
  | "layerAccessor"
  | "rowAccessor"
>

/** The exact fitting computation used by `lineageDagLayout`. */
export interface LineageDagFit {
  /** Resolved layer count (one for empty data unless explicitly configured). */
  layerCount: number
  /** Resolved largest layer population. */
  maxLayerSize: number
  /** Fitted glyph width, including the dot-LOD size adjustment. */
  nodeWidth: number
  /** Fitted glyph height, including the dot-LOD size adjustment. */
  nodeHeight: number
  /** Resolved level of detail. */
  lod: LineageLod
  /** Map logical layer/row coordinates to a node center in plot space. */
  project(layer: number, row: number): { x: number; y: number }
  /** Invert plot coordinates without clamping. A single-layer x axis returns
   * `layer: null` because every layer value projects to the same x coordinate.
   * The row axis retains the recipe's continuous minimum span of one. */
  invert(x: number, y: number): { layer: number | null; row: number }
  /** Read the configured accessors from a raw or ingested node and return its
   * fitted box and center. In dot LOD the box encloses the circle. */
  nodeBounds(node: Datum): LineageDagFitRect & { cx: number; cy: number }
}

/**
 * Fit lineage layer/row coordinates into a plot using the same defaults, LOD,
 * and padding as `lineageDagLayout`. Pure and usable before rendering or in SSR.
 * Accepts both raw nodes and the frame's `node.data` wrappers.
 *
 * Use a separate fit for each main view/minimap size and LOD. Convert a viewport
 * through `main.invert` and `mini.project`; do not copy the recipe's constants
 * or scale chart widths by a ratio. For a collapsed layer axis, show the full
 * minimap width instead of trying to invert it. Empty/tiny plots retain the
 * recipe's minimum glyph size and usable span; glyphs can exceed a tiny plot.
 */
export function createLineageDagFit(
  nodes: readonly Datum[],
  plot: LineageDagFitRect,
  config: LineageDagFitConfig = {}
): LineageDagFit {
  const layerAcc = config.layerAccessor ?? "x"
  const rowAcc = config.rowAccessor ?? "y"
  let layerCount = config.layerCount
  let maxLayerSize = config.maxLayerSize
  if (layerCount == null || maxLayerSize == null) {
    let maxLayer = 0
    const rowsByLayer = new Map<number, number>()
    for (const node of nodes) {
      const layer = Math.round(Number(readField(node, layerAcc, 0)))
      maxLayer = Math.max(maxLayer, layer)
      rowsByLayer.set(layer, (rowsByLayer.get(layer) ?? 0) + 1)
    }
    layerCount = layerCount ?? maxLayer + 1
    maxLayerSize = maxLayerSize ?? Math.max(1, ...rowsByLayer.values())
  }
  const availW = plot.width / Math.max(1, layerCount)
  const availH = plot.height / Math.max(1, maxLayerSize)
  let w = Math.min(
    config.nodeWidth ?? 172,
    Math.max(8, availW - (config.minGapX ?? 26))
  )
  let h = Math.min(
    config.nodeHeight ?? 54,
    Math.max(8, availH - (config.minGapY ?? 18))
  )
  const lod: LineageLod =
    config.lod && config.lod !== "auto"
      ? config.lod
      : w < 16
        ? "dot"
        : w < 48
          ? "icon"
          : w < 108
            ? "compact"
            : "full"
  if (lod === "dot") {
    const diameter = Math.min(w, h, 11)
    w = diameter
    h = diameter
  }
  const usableW = Math.max(1, plot.width - w)
  const usableH = Math.max(1, plot.height - h)
  const rowSpan = Math.max(1, maxLayerSize - 1)
  // Capture scalars: mutating the caller's plot object must not change this fit.
  const { x, y } = plot
  const project = (layer: number, row: number) => ({
    x: x + w / 2 + (layerCount > 1 ? layer / (layerCount - 1) : 0.5) * usableW,
    y: y + h / 2 + ((row + rowSpan / 2) / rowSpan) * usableH
  })
  return {
    layerCount,
    maxLayerSize,
    nodeWidth: w,
    nodeHeight: h,
    lod,
    project,
    invert: (px, py) => ({
      layer:
        layerCount > 1 ? ((px - x - w / 2) / usableW) * (layerCount - 1) : null,
      row: ((py - y - h / 2) / usableH) * rowSpan - rowSpan / 2
    }),
    nodeBounds: (node) => {
      const center = project(
        Number(readField(node, layerAcc, 0)),
        Number(readField(node, rowAcc, 0))
      )
      return {
        x: center.x - w / 2,
        y: center.y - h / 2,
        width: w,
        height: h,
        cx: center.x,
        cy: center.y
      }
    }
  }
}
