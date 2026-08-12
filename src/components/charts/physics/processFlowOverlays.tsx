import * as React from "react"
import type { CapacityQueueSnapshot } from "../../stream/physics/PhysicsControllers"
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsTypes"
import {
  processChrome,
  type ProcessChromeOptions
} from "../../recipes/processChrome"
import {
  physicsChartArea,
  type ProcessFlowProjectionMetadata
} from "./physicsChartUtils"

export function processFlowChrome(
  metadata: ProcessFlowProjectionMetadata | undefined,
  enabled: boolean | undefined,
  capacityByRegion: Record<string, CapacityQueueSnapshot> = {},
  chromeOptions?: ProcessChromeOptions
): StreamPhysicsFrameProps["backgroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined
  const { volume, stages, groups, groupCompletion } = metadata
  const bandById = new Map(volume.stages.map((stage) => [stage.id, stage]))
  const completionById = new Map(groupCompletion.map((row) => [row.id, row]))
  return ({ size }) => {
    const width = Number(size[0]) || volume.width
    const height = Number(size[1]) || volume.height
    const chromeStages = stages.map((stage) => {
      const band = bandById.get(stage.id)
      const capacity = capacityByRegion[`process-stage-${stage.id}`]
      return {
        id: stage.id,
        label: stage.label,
        x0: band?.x0 ?? stage.x - stage.width / 2,
        x1:
          (band?.x0 ?? stage.x - stage.width / 2) +
          (band?.width ?? stage.width),
        x: stage.x,
        width: band?.width ?? stage.width,
        count: stage.count,
        capacity: stage.capacity,
        absorb: stage.absorb,
        portalTarget: stage.portalTarget,
        queueDepth: capacity?.queueDepth,
        processed: capacity?.processedCount
      }
    })
    const chromeGroups = groups.map((group) => {
      const completion = completionById.get(group.id)
      return {
        id: group.id,
        label: group.label ?? group.id,
        x: group.anchor?.x ?? group.x ?? 0,
        y: group.anchor?.y ?? group.y ?? 0,
        absorbed: completion?.absorbed,
        total: completion?.total,
        complete: completion?.complete
      }
    })
    return processChrome(
      {
        width,
        height,
        left: volume.left,
        right: volume.right,
        topY: volume.topY,
        bottomY: volume.bottomY,
        midY: volume.midY,
        stages: chromeStages,
        groups: chromeGroups
      },
      {
        showCapacityBadges: true,
        showGroupSockets: true,
        ...chromeOptions
      }
    )
  }
}

export function processFlowProjectionOverlay(
  rows: Array<{ label: string; value: number }>,
  metadata: ProcessFlowProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata || rows.length === 0) return undefined
  const bandById = new Map(
    metadata.volume.stages.map((stage) => [stage.id, stage])
  )
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || metadata.volume.width,
      Number(size[1]) || metadata.volume.height
    ]
    const area = physicsChartArea(resolvedSize)
    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    const barMaxHeight = Math.min(48, area.plot.height * 0.18)
    const y = area.plot.y + 6

    return (
      <svg
        aria-hidden="true"
        data-testid="process-flow-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {metadata.stages.map((stage, index) => {
          const row = rows[index]
          if (!row) return null
          const band = bandById.get(stage.id)
          if (!band) return null
          const height = Math.max(2, (row.value / maxValue) * barMaxHeight)
          const width = Math.max(8, band.width * 0.35)
          return (
            <rect
              key={stage.id}
              x={band.x - width / 2}
              y={y}
              width={width}
              height={height}
              rx={2}
              fill="var(--semiotic-primary, #4e79a7)"
              fillOpacity={0.18}
              stroke="var(--semiotic-primary, #4e79a7)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          )
        })}
      </svg>
    )
  }
}
