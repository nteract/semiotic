/**
 * Process-physics authoring kit.
 *
 * Pure helpers that turn stage / membrane / route / capacity *declarations*
 * into colliders, regionEffects, body-group specs, and settled-projection
 * rows — the recurring geometry that process demos (stakeholder journey,
 * merge pressure, gauntlets) otherwise re-derive by hand.
 *
 * Use with StreamPhysicsFrame / PhysicsCustomChart / ProcessFlow HOCs.
 * Dynamics stay on the frame; these functions only emit declarative specs.
 */

import type {
  PhysicsColliderBodyFilter,
  PhysicsColliderShape,
  PhysicsColliderSpec
} from "../stream/physics/PhysicsKernel"
import type {
  PhysicsSemanticItem,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEvent,
  StreamPhysicsRegionKind,
  StreamPhysicsRegionVector
} from "../stream/physics/StreamPhysicsFrame"
import type { Style } from "../stream/types"
import type { Datum } from "../charts/shared/datumTypes"

// ── Stage volume layout ──────────────────────────────────────────────────

export type ProcessVolumeShape = "lane" | "bowtie" | "funnel"

export interface ProcessStageDef {
  id: string
  label?: string
  description?: string
  /** Relative width share. Defaults to equal shares. */
  share?: number
  kind?: StreamPhysicsRegionKind | string
}

export interface ProcessMembraneDef {
  id: string
  label?: string
  description?: string
  /**
   * Position along the process axis as a fraction of the left approach
   * (bowtie) or full width (lane/funnel). 0 = start, 1 = end of that span.
   */
  offset: number
  /** 0–1 cost: maps to damping and energyDelta. */
  cost: number
  /** Vertical center offset in plot px (visual wobble). */
  wobble?: number
  color?: string
  /** Override membrane band width in px. */
  width?: number
  dampingScale?: number
  bodyStyle?: Style
  metadata?: unknown
  semanticItem?: false | Partial<PhysicsSemanticItem>
}

export interface ProcessVolumeLayoutOptions {
  width: number
  height: number
  stages: readonly ProcessStageDef[]
  shape?: ProcessVolumeShape
  padX?: number
  padY?: number
  /**
   * Bowtie: vertical pinch height as a fraction of usable height
   * (default 0.18). Lane ignores this.
   */
  pinchRatio?: number
  /**
   * Bowtie: which stage index is the center "pinch" band
   * (default: middle stage).
   */
  centerStageIndex?: number
  membranes?: readonly ProcessMembraneDef[]
  idPrefix?: string
  friction?: number
  restitution?: number
  wallThickness?: number
  /**
   * When true (default), membrane regionEffects are included on the layout.
   * Force fields / charge gates / portals are composed separately.
   */
  includeMembraneRegions?: boolean
  membraneDampingScale?: number
}

export interface ProcessVolumeStageBand {
  id: string
  label?: string
  description?: string
  kind?: StreamPhysicsRegionKind | string
  index: number
  x0: number
  x1: number
  /** Center x of the stage band. */
  x: number
  width: number
  y: number
  height: number
}

export interface ProcessVolumeMembraneBand extends ProcessMembraneDef {
  x: number
  y: number
  width: number
  height: number
}

export interface ProcessVolumeLayout {
  shape: ProcessVolumeShape
  width: number
  height: number
  padX: number
  padY: number
  left: number
  right: number
  topY: number
  bottomY: number
  midY: number
  centerLeft: number
  centerRight: number
  pinchTop: number
  pinchBottom: number
  stages: ProcessVolumeStageBand[]
  membranes: ProcessVolumeMembraneBand[]
  colliders: PhysicsColliderSpec[]
  regionEffects: StreamPhysicsRegionEffect[]
  /** Interior height of the volume at x (top/bottom boundary). */
  boundaryY: (x: number, side: "top" | "bottom") => number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function sumShares(stages: readonly ProcessStageDef[]): number {
  const total = stages.reduce((acc, stage) => acc + (stage.share ?? 1), 0)
  return total > 0 ? total : stages.length
}

function segmentCollider(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: {
    thickness?: number
    friction?: number
    restitution?: number
    bodyFilter?: PhysicsColliderBodyFilter
  } = {}
): PhysicsColliderSpec {
  return {
    id,
    friction: options.friction,
    restitution: options.restitution,
    bodyFilter: options.bodyFilter,
    shape: {
      type: "segment",
      x1,
      y1,
      x2,
      y2,
      thickness: options.thickness ?? 8
    }
  }
}

function aabbFromCenter(
  x: number,
  y: number,
  width: number,
  height: number
): Extract<PhysicsColliderShape, { type: "aabb" }> {
  return { type: "aabb", x, y, width, height }
}

/**
 * Build a horizontal process volume: stage bands, optional membranes, and
 * shape-specific wall colliders (`lane` | `bowtie` | `funnel`).
 */
export function processStageLayout(
  options: ProcessVolumeLayoutOptions
): ProcessVolumeLayout {
  const shape = options.shape ?? "lane"
  const width = Math.max(1, Math.round(options.width))
  const height = Math.max(1, Math.round(options.height))
  const padX = options.padX ?? 46
  const padY = options.padY ?? 72
  const left = padX
  const right = width - padX
  const topY = padY
  const bottomY = height - Math.max(24, Math.round(padY * 0.45))
  const midY = (topY + bottomY) / 2
  const usableHeight = Math.max(1, bottomY - topY)
  const pinchRatio = clamp(options.pinchRatio ?? 0.18, 0.06, 0.5)
  const pinchHalf = (usableHeight * pinchRatio) / 2
  const pinchTop = midY - pinchHalf
  const pinchBottom = midY + pinchHalf
  const idPrefix = options.idPrefix ?? "process"
  const friction = options.friction ?? 0.58
  const restitution = options.restitution ?? 0.18
  const thickness = options.wallThickness ?? 8
  const stagesIn = options.stages
  if (!stagesIn.length) {
    throw new Error("processStageLayout requires at least one stage")
  }

  const centerStageIndex = clamp(
    options.centerStageIndex ?? Math.floor(stagesIn.length / 2),
    0,
    stagesIn.length - 1
  )
  const totalShare = sumShares(stagesIn)
  const span = right - left
  let cursor = left
  const stages: ProcessVolumeStageBand[] = stagesIn.map((stage, index) => {
    const share = stage.share ?? 1
    const bandWidth = (share / totalShare) * span
    const x0 = cursor
    const x1 = index === stagesIn.length - 1 ? right : cursor + bandWidth
    cursor = x1
    return {
      id: stage.id,
      label: stage.label,
      description: stage.description,
      kind: stage.kind ?? "stage",
      index,
      x0,
      x1,
      x: (x0 + x1) / 2,
      width: x1 - x0,
      y: midY,
      height: usableHeight
    }
  })

  const centerStage = stages[centerStageIndex]
  const centerLeft = centerStage.x0
  const centerRight = centerStage.x1

  const boundaryY = (x: number, side: "top" | "bottom"): number => {
    if (shape === "lane") {
      return side === "top" ? topY : bottomY
    }

    if (shape === "funnel") {
      // Wide on the left, pinches toward the right end.
      const t = clamp((x - left) / Math.max(1, right - left), 0, 1)
      if (side === "top") return topY + (pinchTop - topY) * t
      return bottomY + (pinchBottom - bottomY) * t
    }

    // bowtie
    if (x <= centerLeft) {
      const t = clamp((x - left) / Math.max(1, centerLeft - left), 0, 1)
      return side === "top"
        ? topY + (pinchTop - topY) * t
        : bottomY + (pinchBottom - bottomY) * t
    }
    if (x <= centerRight) {
      return side === "top" ? pinchTop : pinchBottom
    }
    const t = clamp((x - centerRight) / Math.max(1, right - centerRight), 0, 1)
    return side === "top"
      ? pinchTop + (topY - pinchTop) * t
      : pinchBottom + (bottomY - pinchBottom) * t
  }

  const wallOpts = { thickness, friction, restitution }
  const colliders: PhysicsColliderSpec[] = []

  if (shape === "lane") {
    colliders.push(
      segmentCollider(`${idPrefix}-top`, left, topY, right, topY, wallOpts),
      segmentCollider(
        `${idPrefix}-bottom`,
        left,
        bottomY,
        right,
        bottomY,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-left`,
        left,
        topY,
        left,
        bottomY,
        { ...wallOpts, thickness: Math.max(6, thickness - 2) }
      ),
      segmentCollider(
        `${idPrefix}-right`,
        right,
        topY,
        right,
        bottomY,
        { ...wallOpts, thickness: Math.max(6, thickness) }
      )
    )
  } else if (shape === "funnel") {
    colliders.push(
      segmentCollider(
        `${idPrefix}-top`,
        left,
        topY,
        right,
        pinchTop,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-bottom`,
        left,
        bottomY,
        right,
        pinchBottom,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-left`,
        left,
        topY,
        left,
        bottomY,
        { ...wallOpts, thickness: Math.max(6, thickness - 2) }
      ),
      segmentCollider(
        `${idPrefix}-right`,
        right,
        pinchTop,
        right,
        pinchBottom,
        { ...wallOpts, thickness: Math.max(6, thickness) }
      )
    )
  } else {
    // bowtie walls
    colliders.push(
      segmentCollider(
        `${idPrefix}-left-top`,
        left,
        topY,
        centerLeft,
        pinchTop,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-left-bottom`,
        left,
        bottomY,
        centerLeft,
        pinchBottom,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-center-top`,
        centerLeft,
        pinchTop,
        centerRight,
        pinchTop,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-center-bottom`,
        centerLeft,
        pinchBottom,
        centerRight,
        pinchBottom,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-right-top`,
        centerRight,
        pinchTop,
        right,
        topY,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-right-bottom`,
        centerRight,
        pinchBottom,
        right,
        bottomY,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-left`,
        left,
        topY,
        left,
        bottomY,
        { ...wallOpts, thickness: Math.max(6, thickness - 2) }
      ),
      segmentCollider(
        `${idPrefix}-right`,
        right,
        topY,
        right,
        bottomY,
        { ...wallOpts, thickness: Math.max(6, thickness) }
      )
    )
  }

  const membraneDampingScale = options.membraneDampingScale ?? 0.5
  const membraneSpanLeft = shape === "bowtie" ? left : left
  const membraneSpanRight = shape === "bowtie" ? centerLeft : right
  const membraneSpan = Math.max(1, membraneSpanRight - membraneSpanLeft)

  const membranes: ProcessVolumeMembraneBand[] = (options.membranes ?? []).map(
    (membrane) => {
      const x =
        membraneSpanLeft + clamp(membrane.offset, 0, 1) * membraneSpan
      const width = membrane.width ?? 18 + membrane.cost * 18
      const height = usableHeight - 16
      const y = midY + (membrane.wobble ?? 0) * 0.25
      return {
        ...membrane,
        x,
        y,
        width,
        height
      }
    }
  )

  const regionEffects: StreamPhysicsRegionEffect[] =
    options.includeMembraneRegions === false
      ? []
      : membranes.map((membrane) =>
          membraneRegion({
            id: membrane.id,
            label: membrane.label ?? membrane.id,
            description:
              membrane.description ??
              `${membrane.label ?? membrane.id} is a permeable region. It taxes energy and damps velocity while bodies overlap it.`,
            x: membrane.x,
            y: membrane.y,
            width: membrane.width,
            height: membrane.height,
            cost: membrane.cost,
            dampingScale: membrane.dampingScale ?? membraneDampingScale,
            bodyStyle: membrane.bodyStyle,
            metadata: membrane.metadata,
            semanticItem: membrane.semanticItem,
            color: membrane.color
          })
        )

  return {
    shape,
    width,
    height,
    padX,
    padY,
    left,
    right,
    topY,
    bottomY,
    midY,
    centerLeft,
    centerRight,
    pinchTop,
    pinchBottom,
    stages,
    membranes,
    colliders,
    regionEffects,
    boundaryY
  }
}

/**
 * Sample a spawn / spring target inside a stage band, respecting volume walls.
 */
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
  const x =
    stage.x0 +
    (stage.x1 - stage.x0) * along +
    (random() * 2 - 1) * jitterX
  const top = layout.boundaryY(x, "top") + padY
  const bottom = layout.boundaryY(x, "bottom") - padY
  const y =
    bottom <= top ? layout.midY : top + random() * Math.max(1, bottom - top)
  return { x, y }
}

// ── Region effect factories ──────────────────────────────────────────────

export interface ProcessRegionBaseOptions {
  id: string
  label?: string
  description?: string
  kind?: StreamPhysicsRegionKind
  x: number
  y: number
  width: number
  height: number
  bodyFilter?: PhysicsColliderBodyFilter
  collider?: StreamPhysicsRegionEffect["collider"]
  colliderThickness?: number
  friction?: number
  restitution?: number
  semanticItem?: false | Partial<PhysicsSemanticItem>
  metadata?: unknown
  bodyStyle?: Style
  attributes?: StreamPhysicsRegionEffect["attributes"]
  onEnter?: StreamPhysicsRegionEffect["onEnter"]
  onExit?: StreamPhysicsRegionEffect["onExit"]
}

function regionBase(
  options: ProcessRegionBaseOptions
): Pick<
  StreamPhysicsRegionEffect,
  | "id"
  | "label"
  | "description"
  | "kind"
  | "shape"
  | "bodyFilter"
  | "collider"
  | "colliderThickness"
  | "friction"
  | "restitution"
  | "semanticItem"
  | "metadata"
  | "bodyStyle"
  | "attributes"
  | "onEnter"
  | "onExit"
> {
  return {
    id: options.id,
    label: options.label,
    description: options.description,
    kind: options.kind,
    shape: aabbFromCenter(
      options.x,
      options.y,
      options.width,
      options.height
    ),
    bodyFilter: options.bodyFilter,
    collider: options.collider,
    colliderThickness: options.colliderThickness,
    friction: options.friction,
    restitution: options.restitution,
    semanticItem: options.semanticItem,
    metadata: options.metadata,
    bodyStyle: options.bodyStyle,
    attributes: options.attributes,
    onEnter: options.onEnter,
    onExit: options.onExit
  }
}

/** Permeable information membrane: damps and taxes energy, does not block. */
export function membraneRegion(
  options: ProcessRegionBaseOptions & {
    cost: number
    dampingScale?: number
    energyScale?: number
    color?: string
  }
): StreamPhysicsRegionEffect {
  const dampingScale = options.dampingScale ?? 0.5
  const energyScale = options.energyScale ?? 1
  const cost = clamp(options.cost, 0, 2)
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "membrane",
      attributes: {
        primitive: "membrane",
        membraneCost: cost,
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    damping: cost * dampingScale,
    energyDelta: -cost * energyScale
  }
}

/** Charge gate: stamps charge/energy when a body enters. */
export function chargeGateRegion(
  options: ProcessRegionBaseOptions & {
    charge?: StreamPhysicsRegionEffect["charge"]
    energyDelta?: number
    impulseOnEnter?: StreamPhysicsRegionVector
  }
): StreamPhysicsRegionEffect {
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "charge-gate",
      attributes: {
        primitive: "chargeGate",
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    charge: options.charge ?? true,
    energyDelta: options.energyDelta,
    impulseOnEnter: options.impulseOnEnter
  }
}

/** Conveyor / route surface: continuous force while overlapping. */
export function routeSurfaceRegion(
  options: ProcessRegionBaseOptions & {
    force?: StreamPhysicsRegionVector | number
    damping?: number
  }
): StreamPhysicsRegionEffect {
  const force =
    typeof options.force === "number"
      ? { x: options.force, y: 0 }
      : (options.force ?? { x: 12, y: 0 })
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "force-field",
      attributes: {
        primitive: "routeSurface",
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    force,
    damping: options.damping ?? 0.015
  }
}

/**
 * Pressure field: drag rises with occupancy (or a precomputed pressure).
 * For live occupancy coupling, pass `occupancy` each rebuild or a force
 * function via the frame's regionEffects after counting active bodies.
 */
export function pressureFieldRegion(
  options: ProcessRegionBaseOptions & {
    /** Occupancy or precomputed pressure scalar. */
    pressure?: number
    occupancy?: number
    baseDamping?: number
    dampingPerUnit?: number
    energyPerUnit?: number
    force?: StreamPhysicsRegionVector
  }
): StreamPhysicsRegionEffect {
  const load = options.pressure ?? options.occupancy ?? 0
  const baseDamping = options.baseDamping ?? 0.08
  const dampingPerUnit = options.dampingPerUnit ?? 0.12
  const energyPerUnit = options.energyPerUnit ?? 0
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "membrane",
      attributes: {
        primitive: "pressureField",
        pressure: load,
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    damping: baseDamping + load * dampingPerUnit,
    energyDelta: energyPerUnit ? -load * energyPerUnit : undefined,
    force: options.force
  }
}

/**
 * Capacitated stage region: marks capacity metadata and optional force/damping.
 * Pair with `createCapacityQueueController({ regionId })` (or ProcessFlowChart
 * `liveCapacity`) for a live FIFO queue that drains at unitsPerSecond.
 */
export function capacitatedRegion(
  options: ProcessRegionBaseOptions & {
    capacity: number
    unitsPerSecond?: number
    force?: StreamPhysicsRegionVector | number
    damping?: number
    charge?: StreamPhysicsRegionEffect["charge"]
  }
): StreamPhysicsRegionEffect {
  const force =
    typeof options.force === "number"
      ? { x: options.force, y: 0 }
      : options.force
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "force-field",
      attributes: {
        primitive: "capacitatedSensor",
        capacity: options.capacity,
        unitsPerSecond: options.unitsPerSecond ?? options.capacity,
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    force,
    damping: options.damping,
    charge: options.charge ?? options.capacity
  }
}

/** Portal / rework loop: impulse or force that redirects bodies. */
export function portalRegion(
  options: ProcessRegionBaseOptions & {
    force?: StreamPhysicsRegionVector
    impulseOnEnter?: StreamPhysicsRegionVector
    damping?: number
    targetStage?: string
  }
): StreamPhysicsRegionEffect {
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "force-field",
      attributes: {
        primitive: "portal",
        targetStage: options.targetStage,
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    force: options.force,
    impulseOnEnter: options.impulseOnEnter,
    damping: options.damping ?? 0.08
  }
}

/** Absorbing sink (merge basin, completion socket). */
export function absorbRegion(
  options: ProcessRegionBaseOptions & {
    force?: StreamPhysicsRegionVector | number
    damping?: number
    charge?: StreamPhysicsRegionEffect["charge"]
  }
): StreamPhysicsRegionEffect {
  const force =
    typeof options.force === "number"
      ? { x: options.force, y: 0 }
      : (options.force ?? { x: 24, y: 0 })
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "sink",
      attributes: {
        primitive: "absorb",
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    force,
    damping: options.damping ?? 0.02,
    charge: options.charge ?? "absorbed"
  }
}

/** Generic force field (commitment, leadership, etc.). */
export function forceFieldRegion(
  options: ProcessRegionBaseOptions & {
    force?: StreamPhysicsRegionVector
    damping?: number
    energyDelta?: number
  }
): StreamPhysicsRegionEffect {
  return {
    ...regionBase({
      ...options,
      kind: options.kind ?? "force-field",
      attributes: {
        primitive: "forceField",
        ...(typeof options.attributes === "object" && options.attributes
          ? options.attributes
          : {})
      }
    }),
    force: options.force,
    damping: options.damping,
    energyDelta: options.energyDelta
  }
}

// ── Body groups ──────────────────────────────────────────────────────────

export interface BodyGroupSpecOptions<TDatum extends Datum = Datum> {
  id: string
  label?: string
  description?: string
  group?: string
  bodyIds?: readonly string[]
  datum?: TDatum
  state?: string
  x?: number
  y?: number
  width?: number
  height?: number
  /** Anchor point for tethers / chrome. */
  anchor?: { x: number; y: number }
  /**
   * Completion rule consumed by `groupCompletionRows` and available to
   * ProcessFlow / custom controllers as group metadata.
   */
  completion?: {
    mode: "allMembersAbsorbed" | "anyAbsorbed" | "threshold"
    targetZone?: string
    /** Required absorbed member value when mode is `threshold`. */
    threshold?: number
    /**
     * Optional per-member values used by threshold completion and progress
     * readouts. Members without an entry have value 1.
     */
    valueByBodyId?: Readonly<Record<string, number>>
  }
  tether?: {
    stiffness?: number
    visible?: boolean
    restLength?: number
  }
  semanticItem?: false | Partial<PhysicsSemanticItem>
}

export interface BodyGroupSpec<TDatum extends Datum = Datum> {
  id: string
  label?: string
  description?: string
  group?: string
  bodyIds?: readonly string[]
  datum?: TDatum
  state?: string
  x?: number
  y?: number
  width?: number
  height?: number
  anchor?: { x: number; y: number }
  completion?: BodyGroupSpecOptions<TDatum>["completion"]
  tether?: BodyGroupSpecOptions<TDatum>["tether"]
  semanticItem?: false | Partial<PhysicsSemanticItem>
}

export function bodyGroupSpec<TDatum extends Datum = Datum>(
  options: BodyGroupSpecOptions<TDatum>
): BodyGroupSpec<TDatum> {
  const x = options.x ?? options.anchor?.x ?? 0
  const y = options.y ?? options.anchor?.y ?? 0
  return {
    id: options.id,
    label: options.label,
    description: options.description,
    group: options.group,
    bodyIds: options.bodyIds,
    datum: options.datum,
    state: options.state,
    x,
    y,
    width: options.width,
    height: options.height,
    anchor: options.anchor ?? { x, y },
    completion: options.completion,
    tether: options.tether,
    semanticItem: options.semanticItem
  }
}

// ── Aggregates / settled projection ──────────────────────────────────────

export interface RegionCountBucket {
  id: string
  label?: string
  count: number
  bodyIds: string[]
}

export type RegionCountMap = Record<string, RegionCountBucket>

/**
 * Reduce region-enter events into per-region unique body counts.
 * Suitable for settled-projection rows and example readouts.
 */
export function aggregateRegionCounts(
  previous: RegionCountMap,
  event: Pick<StreamPhysicsRegionEvent, "type" | "bodyId" | "region">
): RegionCountMap {
  if (event.type !== "region-enter") return previous
  const regionId = event.region.id
  const current = previous[regionId] ?? {
    id: regionId,
    label: event.region.label ?? regionId,
    count: 0,
    bodyIds: []
  }
  if (current.bodyIds.includes(event.bodyId)) return previous
  const bodyIds = [...current.bodyIds, event.bodyId]
  return {
    ...previous,
    [regionId]: {
      ...current,
      count: bodyIds.length,
      bodyIds
    }
  }
}

export function regionCountsToProjectionRows(
  counts: RegionCountMap,
  order?: readonly string[]
): Array<{ label: string; value: number }> {
  const ids = order ?? Object.keys(counts)
  return ids
    .map((id) => counts[id])
    .filter((bucket): bucket is RegionCountBucket => bucket != null)
    .map((bucket) => ({
      label: bucket.label ?? bucket.id,
      value: bucket.count
    }))
}

/**
 * Group-completion ledger for all-members, any-member, and weighted-threshold
 * stories. Pure: callers supply which member ids have been absorbed.
 */
export function groupCompletionRows(
  groups: readonly BodyGroupSpec[],
  absorbedBodyIds: ReadonlySet<string> | readonly string[]
): Array<{
  id: string
  label: string
  mode: "allMembersAbsorbed" | "anyAbsorbed" | "threshold"
  complete: boolean
  absorbed: number
  total: number
  absorbedValue: number
  totalValue: number
  threshold?: number
  missing: string[]
}> {
  const absorbed =
    absorbedBodyIds instanceof Set
      ? absorbedBodyIds
      : new Set(absorbedBodyIds)
  return groups.map((group) => {
    const members = group.bodyIds ?? []
    const missing = members.filter((id) => !absorbed.has(id))
    const absorbedCount = members.length - missing.length
    const mode = group.completion?.mode ?? "allMembersAbsorbed"
    const valueByBodyId = group.completion?.valueByBodyId
    const memberValue = (bodyId: string): number => {
      const configured = valueByBodyId?.[bodyId]
      return Number.isFinite(configured) && Number(configured) >= 0
        ? Number(configured)
        : 1
    }
    const totalValue = members.reduce(
      (sum, bodyId) => sum + memberValue(bodyId),
      0
    )
    const absorbedValue = members.reduce(
      (sum, bodyId) => sum + (absorbed.has(bodyId) ? memberValue(bodyId) : 0),
      0
    )
    const configuredThreshold = group.completion?.threshold
    const threshold =
      mode === "threshold"
        ? Number.isFinite(configuredThreshold) && Number(configuredThreshold) >= 0
          ? Number(configuredThreshold)
          : totalValue
        : undefined
    const complete =
      members.length > 0 &&
      (mode === "anyAbsorbed"
        ? absorbedCount > 0
        : mode === "threshold"
          ? absorbedValue >= (threshold ?? totalValue)
          : missing.length === 0)
    return {
      id: group.id,
      label: group.label ?? group.id,
      mode,
      complete,
      absorbed: absorbedCount,
      total: members.length,
      absorbedValue,
      totalValue,
      threshold,
      missing
    }
  })
}

// ── Misc geometry ────────────────────────────────────────────────────────

export function processLaneWalls(options: {
  idPrefix?: string
  left: number
  right: number
  top: number
  bottom: number
  friction?: number
  restitution?: number
  thickness?: number
  openEnds?: boolean
}): PhysicsColliderSpec[] {
  const idPrefix = options.idPrefix ?? "lane"
  const wallOpts = {
    thickness: options.thickness ?? 8,
    friction: options.friction ?? 0.5,
    restitution: options.restitution ?? 0.16
  }
  const colliders = [
    segmentCollider(
      `${idPrefix}-top`,
      options.left,
      options.top,
      options.right,
      options.top,
      wallOpts
    ),
    segmentCollider(
      `${idPrefix}-bottom`,
      options.left,
      options.bottom,
      options.right,
      options.bottom,
      wallOpts
    )
  ]
  if (!options.openEnds) {
    colliders.push(
      segmentCollider(
        `${idPrefix}-left`,
        options.left,
        options.top,
        options.left,
        options.bottom,
        wallOpts
      ),
      segmentCollider(
        `${idPrefix}-right`,
        options.right,
        options.top,
        options.right,
        options.bottom,
        wallOpts
      )
    )
  }
  return colliders
}
