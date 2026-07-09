"use client"

import * as React from "react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Style } from "../../stream/types"
import StreamPhysicsFrame, {
  type PhysicsBodySemanticItemAccessor,
  type PhysicsBodyStyleContext,
  type PhysicsHoverData,
  type PhysicsSemanticItem,
  type StreamPhysicsBodyForceContext,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps,
  type StreamPhysicsRegionEffect
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn,
  PhysicsSpawnSpringSpec
} from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { filterSparseArray } from "../shared/sparseArray"
import {
  physicsProcessGroupSemanticItems,
  type PhysicsProcessBodyGroup
} from "./physicsProcessPrimitives"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"

const DEFAULT_WIDTH = 900
const DEFAULT_HEIGHT = 520
const CORE_KIND = "gauntlet-core"
const POSITIVE_KIND = "gauntlet-positive"
const NEGATIVE_KIND = "gauntlet-negative"

export interface GauntletProjectPlacement {
  graveyardX?: number
  graveyardY?: number
  routeY?: number
  socketX?: number
  socketY?: number
  startX?: number
  startY?: number
}

export interface GauntletPropertyForceContext<TDatum extends Datum = Datum> {
  body: PhysicsBodyState
  bodies: readonly PhysicsBodyState[]
  core: PhysicsBodyState
  index: number
  layout: GauntletLayout
  placement: Required<GauntletProjectPlacement>
  project: GauntletProjectState<TDatum>
}

export interface GauntletPropertyDefinition {
  id: string
  label?: string
  short?: string
  color?: string
  value?: number
  radius?: number
  mass?: number
  buoyancy?: number
  load?: number
  pull?: { x?: number; y?: number }
  popColor?: string
  spring?: false | Partial<PhysicsSpawnSpringSpec>
  target?: (context: GauntletPropertyForceContext) => { x: number; y: number } | null | undefined
}

export interface GauntletGate {
  id: string
  label?: string
  description?: string
  color?: string
  enabled?: boolean
  regionEffect?: Partial<Omit<StreamPhysicsRegionEffect, "id" | "shape">>
  time?: number
  x?: number
  width?: number
}

export interface GauntletEffect {
  addPositive?: readonly string[] | Record<string, number>
  addNegative?: readonly string[] | Record<string, number>
  popPositive?:
    | readonly string[]
    | {
        candidates?: readonly string[]
        count?: number
        ids?: readonly string[]
      }
  delayDelta?: number
  metricsDelta?: Record<string, number>
  outcome?: string
  stage?: string
  summary?: string
  viabilityDelta?: number
  when?: (context: GauntletEventContext) => boolean
}

export interface GauntletEvent {
  id: string
  label?: string
  time: number
  gateId?: string
  effects?: readonly GauntletEffect[]
  final?: boolean
  outcome?: string
  routeX?: number
  routeY?: number
  summary?: string
}

export interface GauntletEventLogItem {
  id: string
  label: string
  summary?: string
  time?: number
}

export interface GauntletProjectState<TDatum extends Datum = Datum> {
  crashX?: number
  id: string
  activePositiveIds: string[]
  datum: TDatum
  delay: number
  eventsApplied: string[]
  killed: boolean
  lastEvent?: GauntletEventLogItem
  metrics: Record<string, number>
  missingPositiveIds: string[]
  negativeIds: string[]
  outcome: string
  poppedPositiveIds: string[]
  stage: string
  viability: number
}

export interface GauntletLayout {
  crashY: number
  floorY: number
  gates: Array<Required<Pick<GauntletGate, "id" | "x" | "width">> & GauntletGate>
  graveyardX: number
  graveyardY: number
  height: number
  routeY: number
  socketX: number
  startX: number
  width: number
}

export interface GauntletEventContext<TDatum extends Datum = Datum> {
  event: GauntletEvent
  gate?: GauntletLayout["gates"][number]
  negativeProperties: Map<string, GauntletPropertyDefinition>
  positiveProperties: Map<string, GauntletPropertyDefinition>
  project: GauntletProjectState<TDatum>
}

export interface GauntletChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  idAccessor?: ChartAccessor<TDatum, string>
  labelAccessor?: ChartAccessor<TDatum, string>
  positiveAccessor?: ChartAccessor<TDatum, readonly string[]>
  negativeAccessor?: ChartAccessor<TDatum, readonly string[]>
  metricsAccessor?: ChartAccessor<TDatum, Record<string, number>>
  initialViability?: ChartAccessor<TDatum, number>
  positiveProperties: readonly GauntletPropertyDefinition[]
  negativeProperties: readonly GauntletPropertyDefinition[]
  bodyGroups?:
    | readonly PhysicsProcessBodyGroup<TDatum>[]
    | ((projects: readonly GauntletProjectState<TDatum>[], layout: GauntletLayout) => readonly PhysicsProcessBodyGroup<TDatum>[])
  coreBody?: (
    project: GauntletProjectState<TDatum>,
    index: number,
    layout: GauntletLayout,
    placement: Required<GauntletProjectPlacement>
  ) => Partial<PhysicsQueuedSpawn>
  gates?: readonly GauntletGate[]
  events?:
    | readonly GauntletEvent[]
    | ((project: GauntletProjectState<TDatum>, layout: GauntletLayout) => readonly GauntletEvent[])
  crashOffset?: number
  emptyContent?: BaseChartProps["emptyContent"]
  frameProps?: PhysicsHocFrameProps<"bodyForces">
  initialSpawnPacing?: StreamPhysicsFrameProps["initialSpawnPacing"]
  loading?: BaseChartProps["loading"]
  loadingContent?: BaseChartProps["loadingContent"]
  onStateChange?: (states: GauntletProjectState<TDatum>[]) => void
  outcome?: (
    project: GauntletProjectState<TDatum>,
    context: {
      layout: GauntletLayout
      negativeProperties: Map<string, GauntletPropertyDefinition>
      positiveProperties: Map<string, GauntletPropertyDefinition>
    }
  ) => string
  paused?: boolean
  projectPlacement?: (
    project: GauntletProjectState<TDatum>,
    index: number,
    layout: GauntletLayout
  ) => Partial<GauntletProjectPlacement>
  showChrome?: boolean
  /**
   * Settled-projection strip: project viability bars and outcome labels so the
   * chart remains readable without tracking body motion.
   */
  showProjection?: boolean
  showTethers?: boolean
  terminalBehavior?: "outcome" | "hold-last"
  tooltip?: TooltipProp
  viability?: (
    project: GauntletProjectState<TDatum>,
    context: {
      negativeProperties: Map<string, GauntletPropertyDefinition>
      positiveProperties: Map<string, GauntletPropertyDefinition>
    }
  ) => number
}

interface GauntletBodyDatum<TDatum extends Datum = Datum> {
  __gauntlet: true
  kind: typeof CORE_KIND | typeof POSITIVE_KIND | typeof NEGATIVE_KIND
  projectId: string
  property?: GauntletPropertyDefinition
  sourceDatum: TDatum
}

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue> | undefined,
  fallback: TValue
): TValue {
  if (!accessor) return fallback
  return typeof accessor === "function"
    ? accessor(datum, index)
    : (datum[accessor] as TValue) ?? fallback
}

function expandIds(input: readonly string[] | Record<string, number> | undefined): string[] {
  if (!input) return []
  if (Array.isArray(input)) return [...input]
  return Object.entries(input).flatMap(([id, count]) =>
    Array.from({ length: Math.max(0, Math.round(Number(count) || 0)) }, () => id)
  )
}

function isReadonlyStringArray(
  value: GauntletEffect["popPositive"]
): value is readonly string[] {
  return Array.isArray(value)
}

function resolvePopPositiveIds<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect
): string[] {
  const popPositive = effect.popPositive
  if (!popPositive) return []
  if (isReadonlyStringArray(popPositive)) return [...popPositive]
  if (popPositive.ids) return [...popPositive.ids]
  if (!popPositive.candidates) return []
  return popPositive.candidates
    .filter((id: string) => project.activePositiveIds.includes(id))
    .slice(0, popPositive.count ?? 1)
}

function propertyLabel(property: GauntletPropertyDefinition | undefined): string {
  return property?.label ?? property?.id ?? "property"
}

function projectCoreId(projectId: string): string {
  return `gauntlet:${projectId}:core`
}

function projectPositiveId(projectId: string, propertyId: string): string {
  return `gauntlet:${projectId}:positive:${propertyId}`
}

function projectNegativeId(projectId: string, propertyId: string, index: number): string {
  return `gauntlet:${projectId}:negative:${propertyId}:${index}`
}

/** Interior of the collider box (matches wall segments in the frame config). */
export const GAUNTLET_WALL = {
  left: 28,
  top: 76,
  rightInset: 30,
  thickness: 8
} as const

/**
 * Keep body centers inside the playable gauntlet corridor so satellite
 * property particles never spawn or settle outside the left/right walls
 * (the "stuck on the left" regression for Homes on Main Street).
 */
export function clampGauntletPoint(
  x: number,
  y: number,
  radius: number,
  layout: Pick<GauntletLayout, "width" | "floorY">
): { x: number; y: number } {
  const pad = Math.max(2, radius + 2)
  const minX = GAUNTLET_WALL.left + GAUNTLET_WALL.thickness / 2 + pad
  const maxX = layout.width - GAUNTLET_WALL.rightInset - GAUNTLET_WALL.thickness / 2 - pad
  const minY = GAUNTLET_WALL.top + GAUNTLET_WALL.thickness / 2 + pad
  const maxY = layout.floorY - pad
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  }
}

function buildLayout(size: [number, number], gates: readonly GauntletGate[] | undefined, crashOffset: number): GauntletLayout {
  const [width, height] = size
  const routeY = Math.round(height * 0.48)
  const floorY = height - 36
  const enabledGates = (gates ?? []).filter((gate) => gate.enabled !== false)
  const gateCount = Math.max(1, enabledGates.length)
  const gateStart = width * 0.22
  const gateEnd = width * 0.78
  const gateStep = gateCount <= 1 ? 0 : (gateEnd - gateStart) / (gateCount - 1)
  // Start far enough right that positive-property orbits (radius ~72–80)
  // never clear the left wall on spawn.
  const startX = Math.max(Math.round(width * 0.14), 110)
  return {
    crashY: floorY - crashOffset,
    floorY,
    gates: enabledGates.map((gate, index) => ({
      ...gate,
      id: gate.id,
      x: gate.x ?? Math.round(gateStart + index * gateStep),
      width: gate.width ?? Math.max(54, Math.round(width * 0.07))
    })),
    graveyardX: Math.round(width * 0.84),
    graveyardY: floorY - 4,
    height,
    routeY,
    socketX: Math.round(width * 0.92),
    startX,
    width
  }
}

function defaultPlacement(layout: GauntletLayout): Required<GauntletProjectPlacement> {
  return {
    graveyardX: layout.graveyardX,
    graveyardY: layout.graveyardY,
    routeY: layout.routeY,
    socketX: layout.socketX,
    socketY: layout.routeY - 4,
    startX: layout.startX,
    startY: layout.routeY
  }
}

function resolvePlacement<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  index: number,
  layout: GauntletLayout,
  projectPlacement: GauntletChartProps<TDatum>["projectPlacement"] | undefined
): Required<GauntletProjectPlacement> {
  const base = defaultPlacement(layout)
  const resolved = projectPlacement?.(project, index, layout) ?? {}
  return {
    ...base,
    ...resolved,
    startY: resolved.startY ?? resolved.routeY ?? base.startY,
    socketY: resolved.socketY ?? resolved.routeY ?? base.socketY,
    graveyardY: resolved.graveyardY ?? base.graveyardY
  }
}

function featureSlot(ids: readonly string[], id: string): { angle: number; index: number; radius: number } {
  const ordered = [...ids].sort((a, b) => a.localeCompare(b))
  const index = Math.max(0, ordered.indexOf(id))
  const t = ordered.length > 1 ? index / (ordered.length - 1) : 0.5
  // Prefer the upper half-circle so satellites sit above the core; keep
  // orbit radius modest so left-side projects stay inside the left wall.
  return {
    angle: -Math.PI * 0.55 + t * Math.PI * 1.1,
    index,
    radius: 48 + (index % 2) * 6
  }
}

function defaultViability<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  positiveProperties: Map<string, GauntletPropertyDefinition>,
  negativeProperties: Map<string, GauntletPropertyDefinition>
): number {
  const lift = project.activePositiveIds.reduce(
    (sum, id) => sum + (positiveProperties.get(id)?.value ?? 1),
    0
  )
  const missing = project.missingPositiveIds.length + project.poppedPositiveIds.length
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (negativeProperties.get(id)?.load ?? 1),
    0
  )
  return Math.max(0, Math.min(100, 75 + lift * 3 - load * 8 - project.delay * 1.2 - missing * 5))
}

function createInitialState<TDatum extends Datum>(
  datum: TDatum,
  index: number,
  props: Pick<
    GauntletChartProps<TDatum>,
    "idAccessor" | "initialViability" | "metricsAccessor" | "negativeAccessor" | "positiveAccessor"
  >,
  positiveProperties: readonly GauntletPropertyDefinition[],
  negativeProperties: Map<string, GauntletPropertyDefinition>
): GauntletProjectState<TDatum> {
  const id = String(readAccessor(datum, index, props.idAccessor, datum.id != null ? String(datum.id) : `project-${index}`))
  const allPositiveIds = positiveProperties.map((property) => property.id)
  const activePositiveIds = [...readAccessor(datum, index, props.positiveAccessor, allPositiveIds)]
  const negativeIds = [...readAccessor(datum, index, props.negativeAccessor, [])].filter((id) =>
    negativeProperties.has(id)
  )
  const state: GauntletProjectState<TDatum> = {
    id,
    activePositiveIds,
    datum,
    delay: 0,
    eventsApplied: [],
    killed: false,
    metrics: { ...readAccessor(datum, index, props.metricsAccessor, {}) },
    missingPositiveIds: allPositiveIds.filter((propertyId) => !activePositiveIds.includes(propertyId)),
    negativeIds,
    outcome: "in_process",
    poppedPositiveIds: [],
    stage: "project filed",
    viability: readAccessor(datum, index, props.initialViability, 100)
  }
  return state
}

function buildProjectSpawns<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  projectIndex: number,
  layout: GauntletLayout,
  placement: Required<GauntletProjectPlacement>,
  positiveProperties: Map<string, GauntletPropertyDefinition>,
  negativeProperties: Map<string, GauntletPropertyDefinition>,
  coreBody?: GauntletChartProps<TDatum>["coreBody"]
): PhysicsQueuedSpawn[] {
  const coreX = placement.startX
  const coreY = placement.startY + (placement.startY === layout.routeY ? projectIndex * 38 : 0)
  const corePatch = coreBody?.(project, projectIndex, layout, placement) ?? {}
  const coreDatum = {
    __gauntlet: true,
    kind: CORE_KIND,
    projectId: project.id,
    sourceDatum: project.datum
  } satisfies GauntletBodyDatum<TDatum>
  const spawns: PhysicsQueuedSpawn[] = [
    {
      ...corePatch,
      id: projectCoreId(project.id),
      x: corePatch.x ?? coreX,
      y: corePatch.y ?? coreY,
      vx: corePatch.vx ?? 42,
      vy: corePatch.vy ?? 0,
      mass: corePatch.mass ?? 7,
      shape: corePatch.shape ?? { type: "circle", radius: 28 },
      spawnAt: corePatch.spawnAt,
      datum: coreDatum
    }
  ]
  const coreRadius =
    corePatch.shape && "radius" in corePatch.shape
      ? Number(corePatch.shape.radius) || 28
      : 28
  const clampedCore = clampGauntletPoint(coreX, coreY, coreRadius, layout)
  spawns[0].x = clampedCore.x
  spawns[0].y = clampedCore.y

  for (const propertyId of project.activePositiveIds) {
    const property = positiveProperties.get(propertyId)
    if (!property) continue
    const slot = featureSlot(project.activePositiveIds, propertyId)
    const radius = property.radius ?? 10
    const rawX = clampedCore.x + Math.cos(slot.angle) * slot.radius
    const rawY = clampedCore.y + Math.sin(slot.angle) * slot.radius
    const pos = clampGauntletPoint(rawX, rawY, radius, layout)
    spawns.push({
      id: projectPositiveId(project.id, propertyId),
      x: pos.x,
      y: pos.y,
      vx: Math.cos(slot.angle) * 18,
      vy: Math.sin(slot.angle) * 18,
      mass: property.mass ?? 0.75,
      shape: { type: "circle", radius },
      spawnAt: corePatch.spawnAt,
      datum: {
        __gauntlet: true,
        kind: POSITIVE_KIND,
        projectId: project.id,
        property,
        sourceDatum: project.datum
      } satisfies GauntletBodyDatum<TDatum>,
      springs: property.spring === false ? [] : [
        {
          target: { type: "body", bodyId: projectCoreId(project.id) },
          stiffness: 0.56,
          damping: 0.9,
          restLength: 52 + (slot.index % 2) * 4,
          ...(property.spring ?? {})
        }
      ]
    })
  }
  project.negativeIds.forEach((propertyId, index) => {
    const property = negativeProperties.get(propertyId)
    if (!property) return
    spawns.push(
      buildNegativeSpawn(project, property, index, clampedCore.x, clampedCore.y, layout, corePatch.spawnAt)
    )
  })
  return spawns
}

/**
 * Pure Gauntlet world builder for SSR / renderChart. Materializes project
 * cores + property satellites once without React state or gate animation.
 */
export function buildGauntletPhysics<TDatum extends Datum = Datum>(options: {
  data?: readonly TDatum[]
  size?: [number, number]
  gates?: readonly GauntletGate[]
  positiveProperties?: readonly GauntletPropertyDefinition[]
  negativeProperties?: readonly GauntletPropertyDefinition[]
  crashOffset?: number
  idAccessor?: ChartAccessor<TDatum, string>
  positiveAccessor?: ChartAccessor<TDatum, string[]>
  negativeAccessor?: ChartAccessor<TDatum, string[]>
  metricsAccessor?: ChartAccessor<TDatum, Record<string, number>>
  initialViability?: ChartAccessor<TDatum, number>
  projectPlacement?: GauntletChartProps<TDatum>["projectPlacement"]
  coreBody?: GauntletChartProps<TDatum>["coreBody"]
  viability?: GauntletChartProps<TDatum>["viability"]
}): {
  config: NonNullable<import("../../stream/physics/PhysicsPipelineStore").PhysicsPipelineConfig>
  initialSpawns: PhysicsQueuedSpawn[]
  layout: GauntletLayout
} {
  const size = options.size ?? [900, 520]
  const layout = buildLayout(size, options.gates, options.crashOffset ?? 30)
  const positiveProperties = options.positiveProperties ?? []
  const positiveById = new Map(positiveProperties.map((p) => [p.id, p]))
  const negativeById = new Map(
    (options.negativeProperties ?? []).map((p) => [p.id, p])
  )
  const accessors = {
    idAccessor: options.idAccessor,
    initialViability: options.initialViability,
    metricsAccessor: options.metricsAccessor,
    negativeAccessor: options.negativeAccessor,
    positiveAccessor: options.positiveAccessor
  }
  const data = options.data ?? []
  const states = data.map((datum, index) => {
    const state = createInitialState(
      datum,
      index,
      accessors,
      positiveProperties,
      negativeById
    )
    return {
      ...state,
      viability:
        options.viability?.(state, {
          negativeProperties: negativeById,
          positiveProperties: positiveById
        }) ?? defaultViability(state, positiveById, negativeById)
    }
  })
  const initialSpawns = states.flatMap((project, index) => {
    const placement = resolvePlacement(
      project,
      index,
      layout,
      options.projectPlacement
    )
    return buildProjectSpawns(
      project,
      index,
      layout,
      placement,
      positiveById,
      negativeById,
      options.coreBody
    )
  })
  return {
    layout,
    initialSpawns,
    config: {
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      kernel: {
        gravity: { x: 0, y: 0 },
        restitution: 0.16,
        friction: 0.44,
        velocityDamping: 0.982,
        maxVelocity: 520,
        sleepAfter: 0.8,
        sleepSpeed: 7
      },
      colliders: [
        {
          id: "gauntlet-left",
          restitution: 0.12,
          friction: 0.42,
          shape: {
            type: "segment",
            x1: 28,
            y1: 76,
            x2: 28,
            y2: layout.floorY,
            thickness: 8
          }
        },
        {
          id: "gauntlet-ceiling",
          restitution: 0.12,
          friction: 0.42,
          shape: {
            type: "segment",
            x1: 28,
            y1: 76,
            x2: layout.width - 30,
            y2: 76,
            thickness: 8
          }
        },
        {
          id: "gauntlet-floor",
          restitution: 0.12,
          friction: 0.42,
          shape: {
            type: "segment",
            x1: 28,
            y1: layout.floorY,
            x2: layout.width - 30,
            y2: layout.floorY,
            thickness: 8
          }
        },
        {
          id: "gauntlet-right",
          restitution: 0.12,
          friction: 0.42,
          shape: {
            type: "segment",
            x1: layout.width - 30,
            y1: 76,
            x2: layout.width - 30,
            y2: layout.floorY,
            thickness: 8
          }
        }
      ]
    }
  }
}

function buildNegativeSpawn<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  property: GauntletPropertyDefinition,
  index: number,
  x: number,
  y: number,
  layout: Pick<GauntletLayout, "width" | "floorY">,
  spawnAt?: number
): PhysicsQueuedSpawn {
  const radius = property.radius ?? 7.2
  const pos = clampGauntletPoint(
    x - 12 + (index % 4) * 12,
    y + 54 + Math.floor(index / 4) * 12,
    radius,
    layout
  )
  return {
    id: projectNegativeId(project.id, property.id, index),
    x: pos.x,
    y: pos.y,
    vx: 10,
    vy: 6,
    mass: property.mass ?? 0.72,
    shape: { type: "circle", radius },
    spawnAt,
    datum: {
      __gauntlet: true,
      kind: NEGATIVE_KIND,
      projectId: project.id,
      property,
      sourceDatum: project.datum
    } satisfies GauntletBodyDatum<TDatum>,
    springs: property.spring === false ? [] : [
      {
        target: { type: "body", bodyId: projectCoreId(project.id) },
        stiffness: 0.62,
        damping: 0.92,
        restLength: 52 + (index % 4) * 3,
        ...(property.spring ?? {})
      }
    ]
  }
}

function applyEffect<TDatum extends Datum>(
  project: GauntletProjectState<TDatum>,
  effect: GauntletEffect,
  context: GauntletEventContext<TDatum>
): GauntletProjectState<TDatum> {
  if (effect.when && !effect.when(context)) return project
  let next = { ...project }
  const popIds = resolvePopPositiveIds(next, effect)
  if (popIds.length) {
    next = {
      ...next,
      activePositiveIds: next.activePositiveIds.filter((id) => !popIds.includes(id)),
      poppedPositiveIds: Array.from(new Set([...next.poppedPositiveIds, ...popIds]))
    }
  }
  const addedPositive = expandIds(effect.addPositive)
  if (addedPositive.length) {
    next = {
      ...next,
      activePositiveIds: Array.from(new Set([...next.activePositiveIds, ...addedPositive])),
      missingPositiveIds: next.missingPositiveIds.filter((id) => !addedPositive.includes(id))
    }
  }
  const addedNegative = expandIds(effect.addNegative)
  if (addedNegative.length) {
    next = {
      ...next,
      negativeIds: [...next.negativeIds, ...addedNegative]
    }
  }
  if (effect.delayDelta) {
    next = { ...next, delay: next.delay + effect.delayDelta }
  }
  if (effect.metricsDelta) {
    const metrics = { ...next.metrics }
    for (const [key, value] of Object.entries(effect.metricsDelta)) {
      metrics[key] = Number(metrics[key] ?? 0) + value
    }
    next = { ...next, metrics }
  }
  if (effect.viabilityDelta) {
    next = { ...next, viability: next.viability + effect.viabilityDelta }
  }
  if (effect.stage) next = { ...next, stage: effect.stage }
  if (effect.outcome) next = { ...next, outcome: effect.outcome }
  return next
}

function eventLogItem(event: GauntletEvent, effects: readonly GauntletEffect[]): GauntletEventLogItem {
  return {
    id: event.id,
    label: event.label ?? event.id,
    summary: event.summary ?? effects.find((effect) => effect.summary)?.summary,
    time: event.time
  }
}

function projectRouteTarget<TDatum extends Datum>(
  elapsed: number,
  project: GauntletProjectState<TDatum>,
  layout: GauntletLayout,
  placement: Required<GauntletProjectPlacement>,
  events: readonly GauntletEvent[],
  gateById: Map<string, GauntletLayout["gates"][number]>,
  terminalBehavior: "outcome" | "hold-last"
): { x: number; y: number } {
  if (project.killed) return { x: project.metrics.lastX ?? placement.graveyardX, y: placement.graveyardY }
  const finalEvent = events[events.length - 1]
  if (!finalEvent) return { x: placement.socketX, y: placement.routeY }
  const successful = project.outcome === "built" || project.outcome === "built_diminished"
  if (elapsed > finalEvent.time + 0.85) {
    if (terminalBehavior === "hold-last") {
      const gate = finalEvent.gateId ? gateById.get(finalEvent.gateId) : undefined
      return {
        x: finalEvent.routeX ?? gate?.x ?? placement.socketX,
        y: finalEvent.routeY ?? placement.routeY
      }
    }
    return successful
      ? { x: placement.socketX, y: placement.socketY }
      : { x: placement.graveyardX, y: placement.graveyardY - 14 }
  }
  const burden =
    project.delay * 0.85 +
    project.negativeIds.length * 12 +
    (project.poppedPositiveIds.length + project.missingPositiveIds.length) * 8
  const keyframes = [
    { time: 0, x: placement.startX, y: placement.startY },
    ...events.map((event) => {
      const gate = event.gateId ? gateById.get(event.gateId) : undefined
      return {
        time: event.time,
        x: event.routeX ?? gate?.x ?? placement.startX,
        y: event.routeY ?? placement.routeY + Math.min(180, burden) * 0.28
      }
    })
  ].sort((a, b) => a.time - b.time)
  let previous = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let index = 1; index < keyframes.length; index += 1) {
    if (elapsed <= keyframes[index].time) {
      next = keyframes[index]
      break
    }
    previous = keyframes[index]
  }
  const span = Math.max(0.1, next.time - previous.time)
  const tRaw = Math.max(0, Math.min(1, (elapsed - previous.time) / span))
  const t = tRaw * tRaw * (3 - 2 * tRaw)
  return {
    x: previous.x + (next.x - previous.x) * t,
    y: previous.y + (next.y - previous.y) * t + Math.sin(elapsed * 2.6) * 7
  }
}

function drawGauntletBody(ctx: CanvasRenderingContext2D, body: PhysicsBodyState, style: Style): void {
  const datum = body.datum as GauntletBodyDatum | undefined
  if (!datum?.__gauntlet) return
  const radius = body.shape.type === "circle" ? body.shape.radius : 8
  ctx.save()
  ctx.translate(body.x, body.y)
  if (datum.kind === CORE_KIND) {
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill, "#0f766e")
    ctx.strokeStyle = resolveCanvasColor(ctx, style.stroke, "#f8fafc")
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else {
    const property = datum.property
    ctx.fillStyle = resolveCanvasColor(ctx, style.fill ?? property?.color, "#38bdf8")
    ctx.strokeStyle = resolveCanvasColor(ctx, style.stroke, "#0f172a")
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = resolveCanvasColor(ctx, "var(--semiotic-background, #07111f)", "#07111f")
    ctx.font = `900 ${datum.kind === NEGATIVE_KIND ? 9 : 8}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(property?.short ?? property?.id?.slice(0, 1).toUpperCase() ?? "?", 0, 0.5)
  }
  ctx.restore()
}

function resolveCanvasColor(
  ctx: CanvasRenderingContext2D,
  value: Style[keyof Style] | undefined,
  fallback: string
): string {
  if (typeof value !== "string") return fallback
  if (typeof getComputedStyle !== "function" || !ctx.canvas) return value || fallback
  const token = value.startsWith("var(")
    ? value.match(/var\((--[^,\s)]+)/)?.[1]
    : value.startsWith("--")
      ? value
      : null
  if (!token) return value || fallback
  return getComputedStyle(ctx.canvas).getPropertyValue(token).trim() || fallback
}

function drawTethers(ctx: CanvasRenderingContext2D, bodies: PhysicsBodyState[]): void {
  const cores = new Map(bodies.filter((body) => (body.datum as GauntletBodyDatum | undefined)?.kind === CORE_KIND).map((body) => [(body.datum as GauntletBodyDatum).projectId, body]))
  ctx.save()
  ctx.lineWidth = 1.1
  ctx.setLineDash([3, 4])
  for (const body of bodies) {
    const datum = body.datum as GauntletBodyDatum | undefined
    if (!datum?.__gauntlet || datum.kind === CORE_KIND) continue
    const core = cores.get(datum.projectId)
    if (!core) continue
    ctx.globalAlpha = datum.kind === NEGATIVE_KIND ? 0.24 : 0.36
    ctx.strokeStyle = datum.kind === NEGATIVE_KIND ? "#d94a45" : "#7a8794"
    ctx.beginPath()
    ctx.moveTo(core.x, core.y)
    ctx.lineTo(body.x, body.y)
    ctx.stroke()
  }
  ctx.restore()
}

function GauntletChrome({ layout, states }: { layout: GauntletLayout; states: readonly GauntletProjectState[] }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <path
        d={`M ${layout.startX - 42} ${layout.routeY} C ${layout.width * 0.24} ${layout.routeY - 70}, ${layout.width * 0.42} ${layout.routeY + 78}, ${layout.width * 0.58} ${layout.routeY} S ${layout.width * 0.78} ${layout.routeY - 82}, ${layout.socketX + 36} ${layout.routeY}`}
        fill="none"
        stroke="var(--semiotic-accent, #38bdf8)"
        strokeDasharray="18 12"
        strokeLinecap="round"
        strokeOpacity={0.45}
        strokeWidth={7}
      />
      <line
        x1={Math.round(layout.width * 0.06)}
        x2={Math.round(layout.width * 0.94)}
        y1={layout.crashY}
        y2={layout.crashY}
        stroke="var(--semiotic-negative, #ef4444)"
        strokeDasharray="3 7"
        strokeOpacity={0.64}
      />
      <text x={Math.round(layout.width * 0.07)} y={layout.crashY - 8} fill="var(--semiotic-negative, #ef4444)" fontSize={9} fontWeight={800}>CRASH LINE</text>
      {layout.gates.map((gate) => (
        <g key={gate.id}>
          <rect
            x={gate.x - gate.width / 2}
            y={Math.max(80, layout.routeY - 180)}
            width={gate.width}
            height={Math.min(360, layout.height - 170)}
            rx={12}
            fill={gate.color ?? "var(--semiotic-accent, #38bdf8)"}
            fillOpacity={0.1}
            stroke={gate.color ?? "var(--semiotic-accent, #38bdf8)"}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
          />
          <text x={gate.x} y={Math.max(64, layout.routeY - 196)} fill="var(--semiotic-text-secondary, #64748b)" fontSize={10} fontWeight={800} textAnchor="middle">{gate.label ?? gate.id}</text>
        </g>
      ))}
      <g>
        <rect x={layout.socketX - 52} y={layout.routeY - 56} width={104} height={112} rx={13} fill="var(--semiotic-positive, #22c55e)" fillOpacity={0.12} stroke="var(--semiotic-positive, #22c55e)" strokeWidth={1.5} />
        <text x={layout.socketX} y={layout.routeY - 72} fill="var(--semiotic-text-secondary, #64748b)" fontSize={10} fontWeight={800} textAnchor="middle">SOCKET</text>
      </g>
      <g>
        <rect x={layout.graveyardX - 82} y={layout.graveyardY - 34} width={164} height={58} rx={11} fill="var(--semiotic-negative, #ef4444)" fillOpacity={0.16} stroke="var(--semiotic-negative, #ef4444)" strokeOpacity={0.7} />
        <text x={layout.graveyardX} y={layout.graveyardY - 8} fill="var(--semiotic-negative, #ef4444)" fontSize={10} fontWeight={800} textAnchor="middle">GRAVEYARD</text>
        <text x={layout.graveyardX} y={layout.graveyardY + 12} fill="var(--semiotic-text-secondary, #64748b)" fontSize={9} fontWeight={700} textAnchor="middle">{states.some((state) => state.killed) ? "lift shut off" : "too heavy or too small"}</text>
      </g>
    </svg>
  )
}

function gauntletSemanticItem(body: PhysicsBodyState) {
  const datum = body.datum as GauntletBodyDatum | undefined
  if (!datum?.__gauntlet) return false
  if (datum.kind === CORE_KIND) {
    return {
      label: `${datum.projectId} project core`,
      group: "project",
      description: "Project core carrying positive and negative properties."
    }
  }
  return {
    label: `${propertyLabel(datum.property)} ${datum.kind === POSITIVE_KIND ? "positive" : "negative"} property`,
    group: datum.kind === POSITIVE_KIND ? "positive property" : "negative property",
    description: `${propertyLabel(datum.property)} attached to ${datum.projectId}.`
  }
}

function gauntletProjectionRows<TDatum extends Datum>(
  states: readonly GauntletProjectState<TDatum>[]
): Array<{ label: string; value: number; outcome: string }> {
  return states.map((project) => ({
    label: project.id,
    value: Math.max(0, Number(project.viability) || 0),
    outcome: project.outcome || project.stage || "in-process"
  }))
}

function gauntletProjectionSemanticItems<TDatum extends Datum>(
  states: readonly GauntletProjectState<TDatum>[],
  layout: GauntletLayout
): PhysicsSemanticItem[] {
  if (!states.length) return []
  const stripY = 28
  const laneWidth = Math.max(40, (layout.width - 80) / states.length)
  return states.map((project, index) => {
    const label = `${project.id}: viability ${Math.round(project.viability)}, ${project.outcome || project.stage}`
    return {
      id: `gauntlet-projection-${project.id}`,
      label,
      description: label,
      datum: project,
      x: 40 + (index + 0.5) * laneWidth,
      y: stripY,
      shape: "rect" as const,
      width: Math.max(16, laneWidth * 0.55),
      height: 22,
      group: "settled projection"
    }
  })
}

function GauntletProjectionOverlay<TDatum extends Datum>({
  states,
  layout
}: {
  states: readonly GauntletProjectState<TDatum>[]
  layout: GauntletLayout
}) {
  const rows = gauntletProjectionRows(states)
  if (!rows.length) return null
  const maxValue = Math.max(1, ...rows.map((row) => row.value))
  const stripTop = 10
  const barMaxH = 28
  const laneWidth = Math.max(40, (layout.width - 80) / rows.length)

  return (
    <svg
      aria-hidden="true"
      data-testid="gauntlet-projection-overlay"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <text
        x={36}
        y={stripTop + 8}
        fill="var(--semiotic-text-secondary, #64748b)"
        fontSize={9}
        fontWeight={800}
      >
        SETTLED · viability / outcome
      </text>
      {rows.map((row, index) => {
        const x = 40 + index * laneWidth
        const h = Math.max(2, (row.value / maxValue) * barMaxH)
        const killed = /kill|crash|block|grave/i.test(row.outcome)
        return (
          <g key={row.label}>
            <rect
              x={x + laneWidth * 0.18}
              y={stripTop + 12 + (barMaxH - h)}
              width={Math.max(10, laneWidth * 0.45)}
              height={h}
              rx={2}
              fill={
                killed
                  ? "var(--semiotic-danger, #ef4444)"
                  : "var(--semiotic-success, #16a34a)"
              }
              fillOpacity={0.35}
              stroke={
                killed
                  ? "var(--semiotic-danger, #ef4444)"
                  : "var(--semiotic-success, #16a34a)"
              }
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={x + laneWidth * 0.4}
              y={stripTop + 12 + barMaxH + 12}
              textAnchor="middle"
              fill="var(--semiotic-text-secondary, #64748b)"
              fontSize={9}
              fontWeight={700}
            >
              {row.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export const GauntletChart = forwardRef(function GauntletChart<TDatum extends Datum = Datum>(
  props: GauntletChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    bodyGroups,
    coreBody,
    crashOffset = 30,
    data,
    emptyContent,
    events,
    frameProps = {},
    gates,
    initialSpawnPacing,
    loading,
    loadingContent,
    negativeProperties,
    onClick,
    onStateChange,
    outcome,
    paused,
    positiveProperties,
    projectPlacement,
    responsiveHeight,
    responsiveWidth,
    showTethers = true,
    terminalBehavior = "outcome",
    viability
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const stateAccessors = useMemo(
    () => ({
      idAccessor: props.idAccessor,
      initialViability: props.initialViability,
      metricsAccessor: props.metricsAccessor,
      negativeAccessor: props.negativeAccessor,
      positiveAccessor: props.positiveAccessor
    }),
    [
      props.idAccessor,
      props.initialViability,
      props.metricsAccessor,
      props.negativeAccessor,
      props.positiveAccessor
    ]
  )
  const layoutMode = usePhysicsChartMode(props, [DEFAULT_WIDTH, DEFAULT_HEIGHT])
  const {
    chartSize,
    showProjection,
    showChrome,
    className: modeClassName,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  const safeData = useMemo(() => filterSparseArray(data ?? []) as TDatum[], [data])
  const dataKey = useMemo(
    () =>
      safeData
        .map((datum, index) =>
          String(
            readAccessor(
              datum,
              index,
              stateAccessors.idAccessor,
              datum.id != null ? String(datum.id) : `project-${index}`
            )
          )
        )
        .join("|"),
    [safeData, stateAccessors.idAccessor]
  )
  const positiveById = useMemo(
    () => new Map(positiveProperties.map((property) => [property.id, property])),
    [positiveProperties]
  )
  const negativeById = useMemo(
    () => new Map(negativeProperties.map((property) => [property.id, property])),
    [negativeProperties]
  )
  const layout = useMemo(() => buildLayout(chartSize, gates, crashOffset), [chartSize, crashOffset, gates])
  const gateById = useMemo(() => new Map(layout.gates.map((gate) => [gate.id, gate])), [layout.gates])
  const gateRegionEffects = useMemo<StreamPhysicsRegionEffect[]>(
    () =>
      layout.gates.map((gate) => ({
        kind: "force-field",
        damping: 0.035,
        force: { x: 12, y: 0 },
        semanticItem: false,
        ...gate.regionEffect,
        id: `gauntlet-gate-${gate.id}`,
        label: gate.label ?? gate.id,
        description: gate.description,
        shape: {
          type: "aabb",
          x: gate.x,
          y: layout.routeY,
          width: gate.width,
          height: Math.min(360, layout.height - 170)
        }
      })),
    [layout.gates, layout.height, layout.routeY]
  )
  const [states, setStates] = useState<GauntletProjectState<TDatum>[]>(() =>
    safeData.map((datum, index) => {
      const state = createInitialState(datum, index, stateAccessors, positiveProperties, negativeById)
      return {
        ...state,
        viability:
          viability?.(state, {
            negativeProperties: negativeById,
            positiveProperties: positiveById
          }) ?? defaultViability(state, positiveById, negativeById)
      }
    })
  )
  const statesRef = useRef(states)
  const elapsedRef = useRef(0)

  const createState = useCallback(
    (datum: TDatum, index: number) => {
      const state = createInitialState(datum, index, stateAccessors, positiveProperties, negativeById)
      return {
        ...state,
        viability:
          viability?.(state, {
            negativeProperties: negativeById,
            positiveProperties: positiveById
          }) ?? defaultViability(state, positiveById, negativeById)
      }
    },
    [negativeById, positiveById, positiveProperties, stateAccessors, viability]
  )

  useEffect(() => {
    const next = safeData.map((datum, index) => createState(datum, index))
    statesRef.current = next
    setStates(next)
  }, [createState, safeData])

  useEffect(() => {
    statesRef.current = states
    onStateChange?.(states)
  }, [onStateChange, states])

  const projectEvents = useCallback(
    (project: GauntletProjectState<TDatum>) => {
      const resolved = typeof events === "function" ? events(project, layout) : events
      return [...(resolved ?? [])].sort((a, b) => a.time - b.time)
    },
    [events, layout]
  )

  const initialSpawns = useMemo(
    () =>
      states.flatMap((project, index) => {
        const placement = resolvePlacement(project, index, layout, projectPlacement)
        return buildProjectSpawns(project, index, layout, placement, positiveById, negativeById, coreBody)
      }),
    [coreBody, layout, negativeById, positiveById, projectPlacement, states]
  )

  const updateProjectState = useCallback((projectId: string, updater: (project: GauntletProjectState<TDatum>) => GauntletProjectState<TDatum>) => {
    setStates((current) => {
      const next = current.map((project) =>
        project.id === projectId ? updater(project) : project
      )
      statesRef.current = next
      return next
    })
  }, [])

  useImperativeHandle(
    ref,
    (): RealtimeFrameHandle => ({
      push: (datum) => {
        const state = createState(datum as TDatum, statesRef.current.length)
        const placement = resolvePlacement(
          state,
          statesRef.current.length,
          layout,
          projectPlacement
        )
        const spawns = buildProjectSpawns(
          state,
          statesRef.current.length,
          layout,
          placement,
          positiveById,
          negativeById,
          coreBody
        )
        const nextStates = [...statesRef.current, state]
        statesRef.current = nextStates
        setStates(nextStates)
        frameRef.current?.pushMany(spawns)
        frameRef.current?.step(0)
      },
      pushMany: (rows) => {
        const nextStates = [...statesRef.current]
        const nextSpawns: PhysicsQueuedSpawn[] = []
        rows.forEach((row) => {
          const state = createState(row as TDatum, nextStates.length)
          const placement = resolvePlacement(state, nextStates.length, layout, projectPlacement)
          nextSpawns.push(
            ...buildProjectSpawns(
              state,
              nextStates.length,
              layout,
              placement,
              positiveById,
              negativeById,
              coreBody
            )
          )
          nextStates.push(state)
        })
        statesRef.current = nextStates
        setStates(nextStates)
        if (nextSpawns.length) frameRef.current?.pushMany(nextSpawns)
        frameRef.current?.step(0)
      },
      remove: (id) => {
        const ids = Array.isArray(id) ? id : [id]
        const removed: Datum[] = []
        const bodyIds: string[] = []
        for (const projectId of ids) {
          const project = statesRef.current.find((state) => state.id === projectId)
          if (!project) continue
          removed.push(project.datum)
          bodyIds.push(
            projectCoreId(project.id),
            ...project.activePositiveIds.map((propertyId) => projectPositiveId(project.id, propertyId))
          )
          project.negativeIds.forEach((propertyId, index) => {
            bodyIds.push(projectNegativeId(project.id, propertyId, index))
          })
        }
        statesRef.current = statesRef.current.filter((state) => !ids.includes(state.id))
        setStates(statesRef.current)
        frameRef.current?.remove(bodyIds)
        return removed
      },
      update: (id, updater) => {
        const ids = Array.isArray(id) ? id : [id]
        const previous: Datum[] = []
        for (const projectId of ids) {
          const old = statesRef.current.find((state) => state.id === projectId)
          if (!old) continue
          const projectIndex = statesRef.current.findIndex((state) => state.id === projectId)
          previous.push(old.datum)
          const nextDatum = updater(old.datum) as TDatum
          const nextState = createState(nextDatum, projectIndex < 0 ? statesRef.current.length : projectIndex)
          const placement = resolvePlacement(
            nextState,
            projectIndex < 0 ? statesRef.current.length : projectIndex,
            layout,
            projectPlacement
          )
          frameRef.current?.remove([
            projectCoreId(old.id),
            ...old.activePositiveIds.map((propertyId) => projectPositiveId(old.id, propertyId)),
            ...old.negativeIds.map((propertyId, index) => projectNegativeId(old.id, propertyId, index))
          ])
          frameRef.current?.pushMany(
            buildProjectSpawns(
              nextState,
              projectIndex < 0 ? statesRef.current.length : projectIndex,
              layout,
              placement,
              positiveById,
              negativeById,
              coreBody
            )
          )
          statesRef.current = statesRef.current.map((state) => state.id === projectId ? nextState : state)
        }
        setStates(statesRef.current)
        return previous
      },
      clear: () => {
        statesRef.current = []
        setStates([])
        frameRef.current?.clear()
      },
      getData: () => statesRef.current.map((state) => state.datum),
      getScales: () => null,
      getCustomLayout: () => frameRef.current?.snapshot() ?? null
    }),
    [coreBody, createState, layout, negativeById, positiveById, projectPlacement]
  )

  const addBodiesForEffect = useCallback(
    (project: GauntletProjectState<TDatum>, effect: GauntletEffect, controls: PhysicsPipelineControlSurface) => {
      const core = controls.readBodies().find((body) => body.id === projectCoreId(project.id))
      const x = core?.x ?? layout.startX
      const y = core?.y ?? layout.routeY
      const currentNegativeCount = project.negativeIds.length
      const negativeSpawns = expandIds(effect.addNegative).flatMap((propertyId, offset) => {
        const property = negativeById.get(propertyId)
        return property
          ? [buildNegativeSpawn(project, property, currentNegativeCount + offset, x, y, layout)]
          : []
      })
      const positiveSpawns = expandIds(effect.addPositive).flatMap((propertyId) => {
        const property = positiveById.get(propertyId)
        if (!property || project.activePositiveIds.includes(propertyId)) return []
        const placement = {
          ...defaultPlacement(layout),
          routeY: y,
          socketY: y,
          startX: x,
          startY: y
        }
        return buildProjectSpawns(
          { ...project, activePositiveIds: [propertyId], negativeIds: [] },
          0,
          layout,
          placement,
          positiveById,
          negativeById,
          coreBody
        ).filter((spawn) => spawn.id.includes(":positive:"))
      })
      if (negativeSpawns.length || positiveSpawns.length) {
        controls.pushMany([...negativeSpawns, ...positiveSpawns])
      }
      const popIds = resolvePopPositiveIds(project, effect)
      for (const propertyId of popIds) {
        const property = positiveById.get(propertyId)
        frameRef.current?.popBodies([projectPositiveId(project.id, propertyId)], {
          color: property?.popColor ?? property?.color,
          durationMs: 900,
          radius: (property?.radius ?? 10) + 3
        })
      }
    },
    [coreBody, layout, negativeById, positiveById]
  )

  const bodyForces = useCallback(
    ({ body, bodies }: StreamPhysicsBodyForceContext) => {
      const datum = body.datum as GauntletBodyDatum<TDatum> | undefined
      if (!datum?.__gauntlet) return null
      const projectIndex = statesRef.current.findIndex((state) => state.id === datum.projectId)
      const project = projectIndex >= 0 ? statesRef.current[projectIndex] : undefined
      if (!project) return null
      const placement = resolvePlacement(project, projectIndex, layout, projectPlacement)
      const core = bodies.find((candidate) => candidate.id === projectCoreId(project.id))
      const negativeLoad = project.negativeIds.reduce(
        (sum, id) => sum + (negativeById.get(id)?.load ?? 1),
        0
      )
      const forward = project.killed ? 0 : 58
      if (datum.kind !== CORE_KIND) {
        if (!core) return null
        let target: { x: number; y: number }
        const property = datum.property
        if (property?.target) {
          const matchingBodies = bodies
            .filter((candidate) => {
              const candidateDatum = candidate.datum as GauntletBodyDatum | undefined
              return candidateDatum?.__gauntlet && candidateDatum.projectId === project.id && candidateDatum.kind === datum.kind
            })
            .sort((a, b) => String(a.id).localeCompare(String(b.id)))
          const index = Math.max(0, matchingBodies.findIndex((candidate) => candidate.id === body.id))
          target = property.target({ body, bodies, core, index, layout, placement, project }) ?? {
            x: core.x,
            y: core.y
          }
        } else if (datum.kind === POSITIVE_KIND && datum.property) {
          const slot = featureSlot(project.activePositiveIds, datum.property.id)
          target = {
            x: core.x + Math.cos(slot.angle) * slot.radius,
            y: core.y + Math.sin(slot.angle) * slot.radius - 2
          }
        } else {
          const negatives = bodies
            .filter((candidate) => (candidate.datum as GauntletBodyDatum | undefined)?.kind === NEGATIVE_KIND && (candidate.datum as GauntletBodyDatum).projectId === project.id)
            .sort((a, b) => String(a.id).localeCompare(String(b.id)))
          const index = Math.max(0, negatives.findIndex((candidate) => candidate.id === body.id))
          const row = Math.floor(index / 4)
          const count = Math.min(4, negatives.length - row * 4)
          const column = index % 4
          target = {
            x: core.x + (column - (count - 1) / 2) * 18,
            y: core.y + 54 + row * 13
          }
        }
        const bodyRadius =
          body.shape.type === "circle" ? body.shape.radius : 8
        target = clampGauntletPoint(target.x, target.y, bodyRadius, layout)
        // If a satellite is already outside the corridor (legacy spawn / wall
        // jam), pull hard toward the clamped core instead of fighting the wall.
        const bodyClamped = clampGauntletPoint(body.x, body.y, bodyRadius, layout)
        const outside =
          Math.abs(bodyClamped.x - body.x) > 0.5 ||
          Math.abs(bodyClamped.y - body.y) > 0.5
        if (outside) {
          return {
            x: (bodyClamped.x - body.x) * 48 - body.vx * 6,
            y: (bodyClamped.y - body.y) * 48 - body.vy * 6
          }
        }
        const lift =
          datum.kind === POSITIVE_KIND && !project.killed
            ? (property?.buoyancy ?? property?.value ?? 1) * 3.2
            : 0
        const pull =
          datum.kind === NEGATIVE_KIND
            ? {
                x: (property?.pull?.x ?? -8) * 0.22,
                y: (property?.pull?.y ?? 22) * 0.22
              }
            : { x: 0, y: 0 }
        return {
          x: (target.x - body.x) * 28 - (body.vx - core.vx) * 3 + pull.x + forward * 0.01,
          y: (target.y - body.y) * 28 - (body.vy - core.vy) * 3 + pull.y - lift
        }
      }
      if (project.killed) {
        const crashX = project.crashX ?? project.metrics.lastX ?? body.x
        return {
          x: (crashX - body.x) * 44 - body.vx * 9,
          y: 160 + negativeLoad * 12 - body.vy * 1.6
        }
      }
      const projectEventsForRoute = projectEvents(project)
      const target = projectRouteTarget(
        elapsedRef.current,
        project,
        layout,
        placement,
        projectEventsForRoute,
        gateById,
        terminalBehavior
      )
      const positiveLift = project.activePositiveIds.reduce(
        (sum, id) => sum + (positiveById.get(id)?.buoyancy ?? positiveById.get(id)?.value ?? 1),
        0
      )
      const dragPull = negativeLoad * 13
      return {
        x: (target.x - body.x) * 15 - body.vx * 1.8 + forward * 0.18,
        y: (target.y - body.y) * 15 - body.vy * 1.8 + dragPull - positiveLift * 2.2
      }
    },
    [gateById, layout, negativeById, positiveById, projectEvents, projectPlacement, terminalBehavior]
  )

  const onTick = useCallback(
    (result: PhysicsPipelineTickResult, controls: PhysicsPipelineControlSurface) => {
      frameProps.onTick?.(result, controls)
      elapsedRef.current = result.elapsedSeconds ?? controls.snapshot().elapsedSeconds
      for (const project of statesRef.current) {
        const core = controls.readBodies().find((body) => body.id === projectCoreId(project.id))
        if (!core) continue
        const radius = core.shape.type === "circle" ? core.shape.radius : 28
        if (!project.killed && core.y + radius >= layout.crashY) {
          controls.readBodies().forEach((body) => {
            const datum = body.datum as GauntletBodyDatum | undefined
            if (!datum?.__gauntlet || datum.projectId !== project.id) return
            controls.applyImpulse(body.id, -body.vx * body.mass, 0)
          })
          updateProjectState(project.id, (current) => ({
            ...current,
            crashX: core.x,
            killed: true,
            lastEvent: {
              id: "gauntlet-crash-line",
              label: "Crash Line",
              summary: "The project hit the crash threshold; lift and forward motion shut off.",
              time: elapsedRef.current
            },
            metrics: {
              ...current.metrics,
              lastX: core.x
            },
            outcome: "bad_design_crash",
            stage: "Crash Line",
            viability: Math.min(0, current.viability)
          }))
          continue
        }
        if (project.killed) continue
        const due = projectEvents(project).filter(
          (event) => event.time <= elapsedRef.current && !project.eventsApplied.includes(event.id)
        )
        for (const event of due) {
          const gate = event.gateId ? gateById.get(event.gateId) : undefined
          const effects = event.effects ?? []
          let projectedForBodies = project
          for (const effect of effects) {
            const context: GauntletEventContext<TDatum> = {
              event,
              gate,
              negativeProperties: negativeById,
              positiveProperties: positiveById,
              project: projectedForBodies
            }
            if (effect.when && !effect.when(context)) continue
            addBodiesForEffect(projectedForBodies, effect, controls)
            projectedForBodies = applyEffect(projectedForBodies, effect, context)
          }
          updateProjectState(project.id, (current) => {
            let next: GauntletProjectState<TDatum> = {
              ...current,
              eventsApplied: [...current.eventsApplied, event.id],
              lastEvent: eventLogItem(event, effects),
              stage: event.label ?? current.stage
            }
            for (const effect of effects) {
              const context: GauntletEventContext<TDatum> = {
                event,
                gate,
                negativeProperties: negativeById,
                positiveProperties: positiveById,
                project: next
              }
              next = applyEffect(next, effect, context)
            }
            const computedViability =
              viability?.(next, {
                negativeProperties: negativeById,
                positiveProperties: positiveById
              }) ?? defaultViability(next, positiveById, negativeById)
            next = { ...next, viability: computedViability }
            if (event.final) {
              next = {
                ...next,
                outcome:
                  event.outcome ??
                  outcome?.(next, {
                    layout,
                    negativeProperties: negativeById,
                    positiveProperties: positiveById
                  }) ??
                  (next.viability > 20 ? "built" : "approved_not_built")
              }
            }
            return next
          })
        }
      }
    },
    [
      addBodiesForEffect,
      frameProps,
      gateById,
      layout,
      negativeById,
      outcome,
      positiveById,
      projectEvents,
      updateProjectState,
      viability
    ]
  )

  const bodyStyle = useCallback(
    (body: PhysicsBodyState, context: PhysicsBodyStyleContext): Style => {
      const frameStyle =
        typeof frameProps.bodyStyle === "function"
          ? frameProps.bodyStyle(body, context)
          : frameProps.bodyStyle
      const datum = body.datum as GauntletBodyDatum | undefined
      if (!datum?.__gauntlet) return frameStyle ?? {}
      return {
        fill:
          datum.kind === CORE_KIND
            ? "var(--semiotic-accent, #0f766e)"
            : datum.property?.color ?? "var(--semiotic-accent, #38bdf8)",
        stroke: datum.kind === CORE_KIND ? "#f8fafc" : "#0f172a",
        opacity: 0.96,
        ...frameStyle
      }
    },
    [frameProps]
  )

  const resolvedBodyGroups = useMemo(
    () =>
      typeof bodyGroups === "function"
        ? bodyGroups(states, layout)
        : bodyGroups ?? [],
    [bodyGroups, layout, states]
  )
  const bodyGroupSemanticItems = useMemo(
    () => physicsProcessGroupSemanticItems(resolvedBodyGroups),
    [resolvedBodyGroups]
  )
  const projectionSemanticItems = useMemo(
    () =>
      showProjection ? gauntletProjectionSemanticItems(states, layout) : [],
    [layout, showProjection, states]
  )
  const semanticItems = useMemo(
    () => [...projectionSemanticItems, ...bodyGroupSemanticItems],
    [bodyGroupSemanticItems, projectionSemanticItems]
  )

  const handlePointerDown = useCallback<
    NonNullable<StreamPhysicsFrameProps["onBodyPointerDown"]>
  >(
    (body, event) => {
      frameProps.onBodyPointerDown?.(body, event)
    },
    [frameProps]
  )

  // Gauntlet bodies wrap source rows — unwrap for the Semiotic onClick contract.
  const gauntletOnClick = useCallback<
    NonNullable<StreamPhysicsFrameProps["onClick"]>
  >(
    (datum, event) => {
      if (!onClick) return
      const wrapped = datum as GauntletBodyDatum<TDatum> | null
      if (wrapped && typeof wrapped === "object" && wrapped.__gauntlet) {
        onClick(wrapped.sourceDatum, { x: event.x, y: event.y })
        return
      }
      onClick(datum, { x: event.x, y: event.y })
    },
    [onClick]
  )

  if (stateEl) return stateEl

  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems,
    {
      chartMode,
      className: modeClassName,
      title: modeTitle,
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
  )
  const projectionOverlay = showProjection ? (
    <GauntletProjectionOverlay states={states} layout={layout} />
  ) : undefined
  const backgroundGraphics = composePhysicsFrameGraphics(
    showChrome ? <GauntletChrome layout={layout} states={states} /> : undefined,
    frameProps.backgroundGraphics
  )
  const foregroundGraphics = composePhysicsFrameGraphics(
    projectionOverlay,
    frameProps.foregroundGraphics
  )
  const beforePaint = (ctx: CanvasRenderingContext2D, bodies: PhysicsBodyState[]) => {
    frameProps.beforePaint?.(ctx, bodies)
    if (showTethers) drawTethers(ctx, bodies)
  }
  const renderBody = frameProps.renderBody ?? drawGauntletBody
  const tooltipContent = tooltipProps.tooltipContent ?? ((hover: PhysicsHoverData) => {
    const datum = hover.data as GauntletBodyDatum | undefined
    if (!datum?.__gauntlet) return null
    const sourceLabel =
      typeof datum.sourceDatum?.label === "string"
        ? datum.sourceDatum.label
        : datum.projectId
    return (
      <div
        className="semiotic-tooltip"
        style={{
          background: "var(--semiotic-tooltip-bg, rgba(15, 23, 42, 0.94))",
          color: "var(--semiotic-tooltip-text, #f8fafc)",
          padding: "8px 12px",
          borderRadius: 6,
          boxShadow: "var(--semiotic-tooltip-shadow, 0 8px 24px rgba(0,0,0,0.35))",
          maxWidth: 280
        }}
      >
        <strong>{datum.kind === CORE_KIND ? sourceLabel : propertyLabel(datum.property)}</strong>
        <div>{datum.kind === POSITIVE_KIND ? "Positive property" : datum.kind === NEGATIVE_KIND ? "Negative property" : "Project core"}</div>
      </div>
    )
  })

  return renderPhysicsFrame(
    "GauntletChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      key={`${chartSize[0]}x${chartSize[1]}:${dataKey}`}
      ref={frameRef}
      accessibleTable={props.accessibleTable ?? frameProps.accessibleTable}
      backgroundGraphics={backgroundGraphics}
      bodyForces={bodyForces}
      bodySemanticItems={(frameProps.bodySemanticItems as PhysicsBodySemanticItemAccessor | undefined) ?? gauntletSemanticItem}
      bodyStyle={bodyStyle}
      beforePaint={beforePaint}
      onClick={onClick ? gauntletOnClick : sharedFrameProps.onClick}
      config={{
        fixedDt: 1 / 60,
        maxSubsteps: 8,
        kernel: {
          gravity: { x: 0, y: 0 },
          restitution: 0.16,
          friction: 0.44,
          velocityDamping: 0.982,
          maxVelocity: 520,
          sleepAfter: 0.8,
          sleepSpeed: 7,
          ...(frameProps.config?.kernel ?? {})
        },
        colliders: [
          { id: "gauntlet-left", restitution: 0.12, friction: 0.42, shape: { type: "segment", x1: 28, y1: 76, x2: 28, y2: layout.floorY, thickness: 8 } },
          { id: "gauntlet-ceiling", restitution: 0.12, friction: 0.42, shape: { type: "segment", x1: 28, y1: 76, x2: layout.width - 30, y2: 76, thickness: 8 } },
          { id: "gauntlet-floor", restitution: 0.12, friction: 0.42, shape: { type: "segment", x1: 28, y1: layout.floorY, x2: layout.width - 30, y2: layout.floorY, thickness: 8 } },
          { id: "gauntlet-right", restitution: 0.12, friction: 0.42, shape: { type: "segment", x1: layout.width - 30, y1: 76, x2: layout.width - 30, y2: layout.floorY, thickness: 8 } },
          ...(frameProps.config?.colliders ?? [])
        ]
      }}
      enableHover={tooltipProps.enableHover ?? true}
      foregroundGraphics={foregroundGraphics}
      hoverRadius={props.hoverRadius ?? frameProps.hoverRadius ?? 18}
      initialSpawns={initialSpawns}
      initialSpawnPacing={initialSpawnPacing}
      onBodyPointerDown={handlePointerDown}
      onTick={onTick}
      paused={paused}
      regionEffects={[...gateRegionEffects, ...(frameProps.regionEffects ?? [])]}
      renderBody={renderBody}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      tooltipContent={tooltipContent}
    />
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: GauntletChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(GauntletChart as { displayName?: string }).displayName = "GauntletChart"

export const GuantletChart = GauntletChart

export default GauntletChart
