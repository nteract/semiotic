import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type {
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { StreamPhysicsRegionEffect } from "../../stream/physics/StreamPhysicsTypes"
import {
  absorbRegion,
  bodyGroupSpec,
  capacitatedRegion,
  forceFieldRegion,
  groupCompletionRows,
  portalRegion,
  pressureFieldRegion,
  processStageLayout,
  routeSurfaceRegion,
  type BodyGroupSpec,
  type ProcessStageDef,
  type ProcessVolumeLayout
} from "../../recipes/processPhysics"
import {
  type PhysicsChartArea,
  type PhysicsChartLayout,
  clampNumber,
  finiteNumber,
  physicsChartArea,
  readAccessor,
  seededRandom
} from "./physicsChartShared"

export interface ProcessFlowStageDef {
  id: string
  label?: string
  description?: string
  /** Relative width share along the route. */
  share?: number
  /**
   * Continuous forward force while bodies overlap the stage.
   * Number form is `{ x: force, y: 0 }`.
   */
  force?: number | { x?: number; y?: number }
  damping?: number
  /**
   * Capacitated processing stand-in: throughput metadata + force/damping.
   * Full queue DES is ProcessFlow controller territory later.
   */
  capacity?: {
    unitsPerSecond: number
    /** Datum field used as work-units (stamped into attributes only for now). */
    unitAccessor?: string
  }
  /**
   * Raise drag with a pressure scalar (or occupancy when provided at build time).
   */
  pressure?:
    | boolean
    | {
        pressure?: number
        occupancy?: number
        baseDamping?: number
        dampingPerUnit?: number
        energyPerUnit?: number
      }
  /** Rework / bounce portal toward another stage id. */
  portal?: {
    targetStageId: string
    force?: { x?: number; y?: number }
  }
  /** Absorbing sink (completion / merge). */
  absorb?: boolean
  kind?: StreamPhysicsRegionEffect["kind"]
}

export interface ProcessFlowPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  stages: readonly ProcessFlowStageDef[]
  size: [number, number]
  idAccessor?: ChartAccessor<TDatum, string>
  stageAccessor?: ChartAccessor<TDatum, string>
  groupBy?: ChartAccessor<TDatum, string>
  groupLabelAccessor?: ChartAccessor<TDatum, string>
  workAccessor?: ChartAccessor<TDatum, number>
  radiusAccessor?: ChartAccessor<TDatum, number>
  ballRadius?: number
  seed?: number
  /** Horizontal process lane (default). */
  route?: "horizontal"
  groupCompletion?: "allAbsorbed" | "none"
  /** Optional column x for feature/group anchors (plot-relative fraction 0–1). */
  groupAnchorAlong?: number
  springStiffness?: number
  springDamping?: number
  gravityX?: number
  gravityY?: number
  settle?: boolean
}

export interface ProcessFlowProjectionMetadata {
  kind: "process-flow"
  plot: PhysicsChartArea["plot"]
  volume: ProcessVolumeLayout
  stages: Array<{
    id: string
    label: string
    x: number
    width: number
    count: number
    capacity?: number
    absorb?: boolean
    portalTarget?: string
  }>
  groups: BodyGroupSpec[]
  groupCompletion: ReturnType<typeof groupCompletionRows>
  regionEffects: StreamPhysicsRegionEffect[]
}

function forceVector(
  force: number | { x?: number; y?: number } | undefined,
  fallbackX = 12
): { x: number; y: number } {
  if (typeof force === "number") return { x: force, y: 0 }
  if (force && typeof force === "object") {
    return {
      x: Number.isFinite(force.x) ? Number(force.x) : fallbackX,
      y: Number.isFinite(force.y) ? Number(force.y) : 0
    }
  }
  return { x: fallbackX, y: 0 }
}

function stageRegionEffect(
  stage: ProcessFlowStageDef,
  band: { x: number; y: number; width: number; height: number }
): StreamPhysicsRegionEffect {
  const base = {
    id: `process-stage-${stage.id}`,
    label: stage.label ?? stage.id,
    description: stage.description,
    x: band.x,
    y: band.y,
    width: Math.max(12, band.width * 0.92),
    height: Math.max(40, band.height * 0.88),
    semanticItem: false as const,
    attributes: { stageId: stage.id }
  }

  if (stage.absorb) {
    return absorbRegion({
      ...base,
      kind: stage.kind ?? "sink",
      force: forceVector(stage.force, 28),
      damping: stage.damping ?? 0.04,
      charge: "absorbed",
      attributes: { ...base.attributes, primitive: "absorb" }
    })
  }

  if (stage.portal) {
    const portalForce = stage.portal.force ?? stage.force ?? { x: -40, y: 0 }
    return portalRegion({
      ...base,
      kind: stage.kind ?? "force-field",
      force: forceVector(portalForce, -40),
      damping: stage.damping ?? 0.1,
      targetStage: stage.portal.targetStageId,
      attributes: {
        ...base.attributes,
        primitive: "portal",
        targetStage: stage.portal.targetStageId
      }
    })
  }

  if (stage.capacity) {
    const capacity = Math.max(0.1, stage.capacity.unitsPerSecond)
    return capacitatedRegion({
      ...base,
      kind: stage.kind ?? "force-field",
      capacity,
      unitsPerSecond: capacity,
      force: forceVector(stage.force, 10 + capacity * 0.8),
      damping: stage.damping ?? Math.max(0.04, 0.32 - capacity * 0.01),
      attributes: {
        ...base.attributes,
        unitAccessor: stage.capacity.unitAccessor,
        reviewerCapacity: capacity
      }
    })
  }

  if (stage.pressure) {
    const pressureOpts =
      typeof stage.pressure === "object" && stage.pressure
        ? stage.pressure
        : {}
    return pressureFieldRegion({
      ...base,
      kind: stage.kind ?? "membrane",
      pressure: pressureOpts.pressure,
      occupancy: pressureOpts.occupancy,
      baseDamping: pressureOpts.baseDamping ?? stage.damping ?? 0.1,
      dampingPerUnit: pressureOpts.dampingPerUnit ?? 0.1,
      energyPerUnit: pressureOpts.energyPerUnit ?? 0,
      force: forceVector(stage.force, 8),
      attributes: { ...base.attributes, primitive: "pressureField" }
    })
  }

  if (stage.force != null || stage.damping != null) {
    return routeSurfaceRegion({
      ...base,
      kind: stage.kind ?? "force-field",
      force: forceVector(stage.force, 14),
      damping: stage.damping ?? 0.02,
      attributes: { ...base.attributes, primitive: "routeSurface" }
    })
  }

  return forceFieldRegion({
    ...base,
    kind: stage.kind ?? "force-field",
    force: { x: 10, y: 0 },
    damping: 0.02,
    attributes: { ...base.attributes, primitive: "forceField" }
  })
}

/**
 * Build a capacitated multi-body process lane: stage regions, optional feature
 * body-groups, springs toward stage centers, and a settled stage-count projection.
 */
export function buildProcessFlowPhysics<TDatum extends Datum>(
  options: ProcessFlowPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const stagesIn = options.stages
  if (!stagesIn.length) {
    throw new Error("buildProcessFlowPhysics requires at least one stage")
  }

  const size = options.size
  const area = physicsChartArea(size)
  const ballRadius = clampNumber(options.ballRadius ?? 6, 2, 18)
  const seed = options.seed ?? 1
  const random = seededRandom(seed)
  const idAccessor = options.idAccessor
  const stageAccessor = options.stageAccessor ?? ("stage" as ChartAccessor<TDatum, string>)
  const groupBy = options.groupBy
  const groupLabelAccessor = options.groupLabelAccessor
  const workAccessor = options.workAccessor
  const radiusAccessor = options.radiusAccessor
  const groupCompletionMode = options.groupCompletion ?? (groupBy ? "allAbsorbed" : "none")
  const springStiffness = options.springStiffness ?? 0.28
  const springDamping = options.springDamping ?? 0.72
  const settle = options.settle === true

  const stageDefs: ProcessStageDef[] = stagesIn.map((stage) => ({
    id: stage.id,
    label: stage.label ?? stage.id,
    description: stage.description,
    share: stage.share
  }))

  const volume = processStageLayout({
    width: size[0],
    height: size[1],
    shape: "lane",
    padX: Math.max(28, area.plot.x),
    padY: Math.max(36, area.plot.y + 8),
    stages: stageDefs,
    idPrefix: "process-flow",
    includeMembraneRegions: false,
    friction: 0.48,
    restitution: 0.14
  })

  const stageIndex = new Map(volume.stages.map((stage, index) => [stage.id, index]))
  const bandById = new Map(volume.stages.map((stage) => [stage.id, stage]))
  const firstStageId = volume.stages[0].id
  const firstBand = volume.stages[0]
  const absorbStageIds = new Set(
    stagesIn.filter((stage) => stage.absorb).map((stage) => stage.id)
  )

  const regionEffects = stagesIn.map((stage) => {
    const band = bandById.get(stage.id) ?? firstBand
    return stageRegionEffect(stage, {
      x: band.x,
      y: volume.midY,
      width: band.width,
      height: volume.bottomY - volume.topY
    })
  })

  // Mild whole-lane conveyor so bodies keep drifting when not spring-locked.
  regionEffects.unshift(
    routeSurfaceRegion({
      id: "process-flow-route",
      label: "process route",
      description: "Baseline conveyor along the process lane.",
      x: (volume.left + volume.right) / 2,
      y: volume.midY,
      width: volume.right - volume.left,
      height: volume.bottomY - volume.topY - 12,
      force: 8,
      damping: 0.012,
      semanticItem: false
    })
  )

  const stageCounts = new Map<string, number>()
  for (const stage of volume.stages) stageCounts.set(stage.id, 0)

  type Row = {
    datum: TDatum
    id: string
    stageId: string
    groupId?: string
    groupLabel?: string
    work: number
    radius: number
    index: number
  }

  const rows: Row[] = []
  options.data.forEach((datum, index) => {
    const id = String(
      idAccessor
        ? readAccessor(datum, index, idAccessor) ??
            (datum as Datum).id ??
            `process-flow-${index}`
        : (datum as Datum).id ?? `process-flow-${index}`
    )
    const rawStage = String(
      readAccessor(datum, index, stageAccessor) ?? firstStageId
    )
    const stageId = stageIndex.has(rawStage) ? rawStage : firstStageId
    stageCounts.set(stageId, (stageCounts.get(stageId) ?? 0) + 1)
    const groupId = groupBy
      ? String(readAccessor(datum, index, groupBy) ?? "")
      : undefined
    const groupLabel =
      groupId && groupLabelAccessor
        ? String(readAccessor(datum, index, groupLabelAccessor) ?? groupId)
        : groupId
    const work = workAccessor
      ? finiteNumber(readAccessor(datum, index, workAccessor)) ?? 1
      : 1
    const radiusValue = radiusAccessor
      ? finiteNumber(readAccessor(datum, index, radiusAccessor))
      : null
    const radius = clampNumber(
      radiusValue != null && radiusValue > 0 ? radiusValue : ballRadius,
      2,
      18
    )
    rows.push({
      datum,
      id,
      stageId,
      groupId: groupId || undefined,
      groupLabel: groupLabel || undefined,
      work,
      radius,
      index
    })
  })

  const groupMembers = new Map<string, string[]>()
  const groupLabels = new Map<string, string>()
  for (const row of rows) {
    if (!row.groupId) continue
    const members = groupMembers.get(row.groupId) ?? []
    members.push(row.id)
    groupMembers.set(row.groupId, members)
    if (row.groupLabel) groupLabels.set(row.groupId, row.groupLabel)
  }

  const groupAnchorAlong = clampNumber(options.groupAnchorAlong ?? 0.55, 0.15, 0.9)
  const groupAnchorX =
    volume.left + (volume.right - volume.left) * groupAnchorAlong
  const groupIds = Array.from(groupMembers.keys())
  const groups: BodyGroupSpec[] = groupIds.map((groupId, groupIndex) => {
    const members = groupMembers.get(groupId) ?? []
    const ySpread =
      groupIds.length <= 1
        ? volume.midY
        : volume.topY +
          28 +
          (groupIndex / Math.max(1, groupIds.length - 1)) *
            (volume.bottomY - volume.topY - 56)
    return bodyGroupSpec({
      id: groupId,
      label: groupLabels.get(groupId) ?? groupId,
      bodyIds: members,
      anchor: { x: groupAnchorX, y: ySpread },
      x: groupAnchorX,
      y: ySpread,
      completion:
        groupCompletionMode === "allAbsorbed"
          ? {
              mode: "allMembersAbsorbed",
              targetZone: stagesIn.find((stage) => stage.absorb)?.id ?? "merged"
            }
          : undefined,
      tether: { stiffness: 0.06, visible: true, restLength: 18 }
    })
  })

  const absorbedIds = rows
    .filter((row) => absorbStageIds.has(row.stageId))
    .map((row) => row.id)
  const completion = groupCompletionRows(groups, absorbedIds)

  const groupById = new Map(groups.map((group) => [group.id, group]))
  const spawns: PhysicsQueuedSpawn[] = rows.map((row, orderedIndex) => {
    const band = bandById.get(row.stageId) ?? firstBand
    const targetX = band.x + (random() - 0.5) * Math.min(24, band.width * 0.2)
    const top = volume.boundaryY(targetX, "top") + row.radius + 10
    const bottom = volume.boundaryY(targetX, "bottom") - row.radius - 10
    const targetY =
      bottom <= top
        ? volume.midY
        : top + random() * Math.max(1, bottom - top)
    const entryX = settle
      ? targetX
      : volume.left + 18 + (orderedIndex % 7) * 4
    const entryY = settle
      ? targetY
      : volume.midY + (random() - 0.5) * (volume.bottomY - volume.topY) * 0.35

    const springs: NonNullable<PhysicsQueuedSpawn["springs"]> = [
      {
        target: { type: "point", x: targetX, y: targetY },
        restLength: row.radius * 0.45,
        stiffness: springStiffness,
        damping: springDamping
      }
    ]

    if (row.groupId) {
      const group = groupById.get(row.groupId)
      if (group?.anchor && !absorbStageIds.has(row.stageId)) {
        springs.push({
          target: {
            type: "point",
            x: group.anchor.x,
            y: group.anchor.y
          },
          restLength: group.tether?.restLength ?? 22,
          stiffness: group.tether?.stiffness ?? 0.05,
          damping: 0.8
        })
      }
    }

    return {
      id: row.id,
      x: entryX,
      y: entryY,
      vx: settle ? 0 : 40 + random() * 40,
      vy: settle ? 0 : (random() - 0.5) * 20,
      mass: 1,
      shape: { type: "circle", radius: row.radius },
      spawnAt: settle ? 0 : orderedIndex * 0.03,
      springs,
      datum: {
        ...row.datum,
        id: row.id,
        stage: row.stageId,
        groupId: row.groupId,
        groupLabel: row.groupLabel,
        work: row.work,
        __processFlow: true
      }
    }
  })

  const config: PhysicsPipelineConfig = {
    kernel: {
      seed,
      gravity: {
        x: options.gravityX ?? 22,
        y: options.gravityY ?? 0
      },
      restitution: 0.14,
      friction: 0.48,
      velocityDamping: 0.988,
      maxVelocity: 420,
      sleepSpeed: 8,
      sleepAfter: 0.9,
      collisionIterations: 4
    },
    colliders: volume.colliders,
    fixedDt: 1 / 60,
    maxSubsteps: 8
  }

  const projectionRows = volume.stages.map((stage) => ({
    label: stage.label ?? stage.id,
    value: stageCounts.get(stage.id) ?? 0
  }))

  const stageMeta = stagesIn.map((stage) => {
    const band = bandById.get(stage.id) ?? firstBand
    return {
      id: stage.id,
      label: stage.label ?? stage.id,
      x: band.x,
      width: band.width,
      count: stageCounts.get(stage.id) ?? 0,
      capacity: stage.capacity?.unitsPerSecond,
      absorb: stage.absorb === true,
      portalTarget: stage.portal?.targetStageId
    }
  })

  return {
    config,
    initialSpawns: spawns,
    initialSpawnPacing: settle
      ? undefined
      : { pacing: "arrival", timeAccessor: "spawnAt", timeScale: 1 },
    projectionRows,
    metadata: {
      kind: "process-flow",
      plot: area.plot,
      volume,
      stages: stageMeta,
      groups,
      groupCompletion: completion,
      regionEffects
    } satisfies ProcessFlowProjectionMetadata
  }
}

