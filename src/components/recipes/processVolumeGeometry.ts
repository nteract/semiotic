/** Renderable polygons derived from the same geometry as process barriers. */

import type { ProcessVolumeLayout } from "./processPhysics"

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export type ProcessVolumePoint = [x: number, y: number]

export type ProcessVolumePolygonRole =
  | "volume"
  | "incoming"
  | "center"
  | "outgoing"

export interface ProcessVolumePolygon {
  id: ProcessVolumePolygonRole
  role: ProcessVolumePolygonRole
  /** Clockwise points suitable for SVG, Canvas, or custom mark renderers. */
  points: ProcessVolumePoint[]
}

/** Sample a spawn or spring target inside a stage and its physical walls. */
export function stageTargetInVolume(
  layout: ProcessVolumeLayout,
  stageId: string,
  options: {
    random?: () => number
    /** Horizontal position inside the stage as 0–1 (default 0.5). */
    along?: number
    jitterX?: number
    padY?: number
  } = {}
): { x: number; y: number } {
  const random = options.random ?? Math.random
  const stage =
    layout.stages.find((candidate) => candidate.id === stageId) ??
    layout.stages[layout.stages.length - 1]
  const along = clamp(options.along ?? 0.5, 0.05, 0.95)
  const jitterX = options.jitterX ?? 0
  const padY = options.padY ?? 20
  const rawX =
    stage.x0 +
    (stage.x1 - stage.x0) * along +
    (random() * 2 - 1) * jitterX
  const xInset = Math.min(1, stage.width / 2)
  const x = clamp(rawX, stage.x0 + xInset, stage.x1 - xInset)
  const top = layout.boundaryY(x, "top") + padY
  const bottom = layout.boundaryY(x, "bottom") - padY
  const y =
    bottom <= top ? layout.midY : top + random() * Math.max(1, bottom - top)
  return { x, y }
}

/**
 * Derive visible process panels from a processStageLayout result.
 *
 * The returned edges share coordinates with the layout's physical wall
 * colliders, keeping rendered boundaries and collision geometry synchronized.
 */
export function processVolumePolygons(
  layout: ProcessVolumeLayout
): ProcessVolumePolygon[] {
  if (layout.shape === "bowtie") {
    return [
      {
        id: "incoming",
        role: "incoming",
        points: [
          [layout.left, layout.topY],
          [layout.centerLeft, layout.pinchTop],
          [layout.centerLeft, layout.pinchBottom],
          [layout.left, layout.bottomY]
        ]
      },
      {
        id: "center",
        role: "center",
        points: [
          [layout.centerLeft, layout.pinchTop],
          [layout.centerRight, layout.pinchTop],
          [layout.centerRight, layout.pinchBottom],
          [layout.centerLeft, layout.pinchBottom]
        ]
      },
      {
        id: "outgoing",
        role: "outgoing",
        points: [
          [layout.centerRight, layout.pinchTop],
          [layout.right, layout.topY],
          [layout.right, layout.bottomY],
          [layout.centerRight, layout.pinchBottom]
        ]
      }
    ]
  }

  return [
    {
      id: "volume",
      role: "volume",
      points: [
        [layout.left, layout.topY],
        [
          layout.right,
          layout.shape === "funnel" ? layout.pinchTop : layout.topY
        ],
        [
          layout.right,
          layout.shape === "funnel" ? layout.pinchBottom : layout.bottomY
        ],
        [layout.left, layout.bottomY]
      ]
    }
  ]
}
