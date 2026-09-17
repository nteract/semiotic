import type { LabelBox, LabelFinding } from "./labelPlacement"
import { LABEL_REMEDIES } from "./labelPlacement"

export interface AxisLabelAssessment {
  status: "complete" | "incomplete" | "not-assessed"
  checked: number
  unsupported: number
  collisions: number
  overflows: number
  findings: LabelFinding[]
}

/** Assess painted bounding rectangles; rotated labels use their enclosing box. */
export function assessAxisLabelBoxes(
  labels: { id: string; axis: string; box: LabelBox }[],
  bounds: LabelBox,
  unsupported = 0
): AxisLabelAssessment {
  let collisions = 0
  let overflows = 0
  const collisionIds = new Set<string>()
  const overflowIds: string[] = []
  for (let i = 0; i < labels.length; i++) {
    const { box: a, id, axis } = labels[i]
    if (
      a.x < bounds.x - 1 ||
      a.y < bounds.y - 1 ||
      a.x + a.width > bounds.x + bounds.width + 1 ||
      a.y + a.height > bounds.y + bounds.height + 1
    ) {
      overflows++
      if (overflowIds.length < 20) overflowIds.push(id)
    }
    for (let j = i + 1; j < labels.length; j++) {
      const b = labels[j].box
      if (
        axis === labels[j].axis &&
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
      ) {
        collisions++
        if (collisionIds.size < 20) collisionIds.add(id)
        if (collisionIds.size < 20) collisionIds.add(labels[j].id)
      }
    }
  }
  return {
    status: unsupported ? "incomplete" : "complete",
    checked: labels.length,
    unsupported,
    collisions,
    overflows,
    findings: [
      ...(collisions
        ? [
            {
              code: "LABEL_COLLISION" as const,
              count: collisions,
              labelIds: [...collisionIds],
              remedy: LABEL_REMEDIES.LABEL_COLLISION
            }
          ]
        : []),
      ...(overflows
        ? [
            {
              code: "LABEL_OVERFLOW" as const,
              count: overflows,
              labelIds: overflowIds,
              remedy: LABEL_REMEDIES.LABEL_OVERFLOW
            }
          ]
        : [])
    ]
  }
}
