/** Deterministic compilation, replay, geometry, and bodies for CrucibleChart. */
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type {
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import { applyCrucibleEvent, cloneCrucibleState } from "./crucibleEffects"
import type {
  CrucibleBodyDatum,
  CrucibleCompileOptions,
  CrucibleCompiledEvent,
  CrucibleCompiledPhase,
  CrucibleCompiledPlan,
  CrucibleComponentState,
  CrucibleComponentStatus,
  CrucibleDiagnostic,
  CrucibleLayout,
  CrucibleLayoutOutlet,
  CrucibleMetricMap,
  CrucibleOutlet,
  CruciblePhase,
  CrucibleProductDefinition,
  CrucibleProductState,
  CrucibleReplayResult,
  CrucibleRunState
} from "./crucibleTypes"

export const DEFAULT_CRUCIBLE_WIDTH = 900
export const DEFAULT_CRUCIBLE_HEIGHT = 520
export const DEFAULT_CRUCIBLE_SIZE: [number, number] = [
  DEFAULT_CRUCIBLE_WIDTH,
  DEFAULT_CRUCIBLE_HEIGHT
]

export const DEFAULT_CRUCIBLE_OUTLETS: readonly CrucibleOutlet[] = [
  { id: "product", label: "Products", side: "bottom", order: 0 },
  { id: "retained", label: "Retained", side: "bottom", order: 1 },
  { id: "residue", label: "Residue", side: "left", order: 2 },
  { id: "failed", label: "Failed", side: "right", order: 3 },
  { id: "recovered", label: "Recovered", side: "right", order: 4 }
]

const COMPONENT_STATUSES = new Set<CrucibleComponentStatus>([
  "queued",
  "active",
  "transformed",
  "consumed",
  "retained",
  "ejected",
  "failed",
  "recovered"
])

const EPSILON = 1e-9

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function issue(
  severity: CrucibleDiagnostic["severity"],
  code: string,
  message: string,
  path?: string,
  ids?: readonly string[]
): CrucibleDiagnostic {
  return {
    severity,
    code,
    message,
    path,
    ids: ids ? [...ids] : undefined
  }
}

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates].sort(compareIds)
}

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue> | undefined,
  fallback: TValue,
  diagnostics: CrucibleDiagnostic[],
  path: string
): TValue {
  if (!accessor) return fallback
  try {
    const value =
      typeof accessor === "function"
        ? accessor(datum, index)
        : (datum[accessor] as TValue)
    return value ?? fallback
  } catch (error) {
    diagnostics.push(
      issue(
        "error",
        "accessor-error",
        `Accessor threw: ${error instanceof Error ? error.message : String(error)}.`,
        path
      )
    )
    return fallback
  }
}

function normalizedMetrics(
  value: unknown,
  diagnostics: CrucibleDiagnostic[],
  path: string
): CrucibleMetricMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (value != null) {
      diagnostics.push(
        issue(
          "error",
          "invalid-metrics",
          "Metrics must be a numeric object.",
          path
        )
      )
    }
    return {}
  }
  const result: CrucibleMetricMap = {}
  for (const [key, raw] of Object.entries(value)) {
    const number = finite(raw)
    if (number == null) {
      diagnostics.push(
        issue(
          "error",
          "invalid-metric",
          `Metric "${key}" must be finite.`,
          `${path}.${key}`
        )
      )
      continue
    }
    result[key] = number
  }
  return result
}

function addMetrics(
  target: CrucibleMetricMap,
  metrics: CrucibleMetricMap
): void {
  for (const [key, value] of Object.entries(metrics)) {
    target[key] = Number(target[key] ?? 0) + value
  }
}

export interface CrucibleInitialStateResult<TDatum extends Datum = Datum> {
  state: CrucibleRunState<TDatum>
  diagnostics: CrucibleDiagnostic[]
}

/** Evaluate accessors once and create the immutable replay origin. */
export function createInitialCrucibleState<TDatum extends Datum>(
  options: CrucibleCompileOptions<TDatum>
): CrucibleInitialStateResult<TDatum> {
  const diagnostics: CrucibleDiagnostic[] = []
  const components: Record<string, CrucibleComponentState<TDatum>> = {}
  const ids: string[] = []
  let inputAmount = 0
  const inputMetrics: CrucibleMetricMap = {}

  options.data.forEach((datum, index) => {
    const fallbackId = String(datum.id ?? `component-${index}`)
    const rawId = readAccessor(
      datum,
      index,
      options.idAccessor,
      fallbackId,
      diagnostics,
      `data.${index}.id`
    )
    const id = String(rawId ?? fallbackId).trim()
    if (!id) {
      diagnostics.push(
        issue(
          "error",
          "invalid-component-id",
          "Component ids may not be empty.",
          `data.${index}.id`
        )
      )
      return
    }
    ids.push(id)
    const rawAmount = readAccessor(
      datum,
      index,
      options.amountAccessor,
      1,
      diagnostics,
      `data.${index}.amount`
    )
    const amount = finite(rawAmount)
    const resolvedAmount = amount != null && amount >= 0 ? amount : 0
    if (amount == null || amount < 0) {
      diagnostics.push(
        issue(
          "error",
          "invalid-component-amount",
          "Component amount must be finite and non-negative.",
          `data.${index}.amount`,
          [id]
        )
      )
    }
    const rawMetrics = readAccessor(
      datum,
      index,
      options.metricsAccessor,
      {},
      diagnostics,
      `data.${index}.metrics`
    )
    const metrics = normalizedMetrics(
      rawMetrics,
      diagnostics,
      `data.${index}.metrics`
    )
    const rawStatus = readAccessor(
      datum,
      index,
      options.initialStateAccessor,
      "active" as CrucibleComponentStatus,
      diagnostics,
      `data.${index}.status`
    )
    const status = COMPONENT_STATUSES.has(rawStatus) ? rawStatus : "active"
    if (!COMPONENT_STATUSES.has(rawStatus)) {
      diagnostics.push(
        issue(
          "error",
          "invalid-component-status",
          `Unknown component status "${String(rawStatus)}".`,
          `data.${index}.status`,
          [id]
        )
      )
    }
    const label = String(
      readAccessor(
        datum,
        index,
        options.labelAccessor,
        String(datum.label ?? datum.name ?? id),
        diagnostics,
        `data.${index}.label`
      )
    )
    const category = String(
      readAccessor(
        datum,
        index,
        options.categoryAccessor,
        "component",
        diagnostics,
        `data.${index}.category`
      )
    )
    if (!components[id]) {
      components[id] = {
        id,
        label,
        category,
        datum,
        status,
        initialAmount: resolvedAmount,
        amount: resolvedAmount,
        initialMetrics: { ...metrics },
        metrics: { ...metrics },
        productIds: [],
        history: []
      }
      inputAmount += resolvedAmount
      addMetrics(inputMetrics, metrics)
    }
  })

  const duplicates = duplicateIds(ids)
  if (duplicates.length) {
    diagnostics.push(
      issue(
        "error",
        "duplicate-component-id",
        `Component ids must be unique: ${duplicates.join(", ")}.`,
        "data",
        duplicates
      )
    )
  }
  const metrics = normalizedMetrics(
    options.metrics ?? {},
    diagnostics,
    "metrics"
  )
  return {
    state: {
      elapsed: 0,
      phaseElapsed: 0,
      phaseId: options.phases[0]?.id ?? "",
      phaseIndex: options.phases.length ? 0 : -1,
      playing: false,
      complete: options.phases.length === 0,
      outcome: "in_process",
      eventsApplied: [],
      components,
      products: {},
      relations: {},
      input: { amount: inputAmount, metrics: inputMetrics },
      metrics,
      loss: { amount: 0, metrics: {} },
      history: []
    },
    diagnostics
  }
}

function compilePhases(phases: readonly CruciblePhase[]): {
  phases: CrucibleCompiledPhase[]
  diagnostics: CrucibleDiagnostic[]
} {
  const diagnostics: CrucibleDiagnostic[] = []
  if (!phases.length) {
    diagnostics.push(
      issue(
        "error",
        "empty-phase-program",
        "CrucibleChart requires at least one phase.",
        "phases"
      )
    )
  }
  const duplicates = duplicateIds(phases.map((phase) => phase.id))
  if (duplicates.length) {
    diagnostics.push(
      issue(
        "error",
        "duplicate-phase-id",
        `Phase ids must be unique: ${duplicates.join(", ")}.`,
        "phases",
        duplicates
      )
    )
  }
  let start = 0
  const compiled = phases.map((phase, index) => {
    const duration = finite(phase.duration)
    const normalizedDuration = duration != null && duration > 0 ? duration : 0
    if (!phase.id.trim()) {
      diagnostics.push(
        issue(
          "error",
          "invalid-phase-id",
          "Phase ids may not be empty.",
          `phases.${index}.id`
        )
      )
    }
    if (duration == null || duration <= 0) {
      diagnostics.push(
        issue(
          "error",
          "invalid-phase-duration",
          "Phase duration must be finite and greater than zero.",
          `phases.${index}.duration`,
          [phase.id]
        )
      )
    }
    if (phase.intensity !== undefined && !Number.isFinite(phase.intensity)) {
      diagnostics.push(
        issue(
          "error",
          "invalid-phase-intensity",
          "Phase intensity must be finite.",
          `phases.${index}.intensity`,
          [phase.id]
        )
      )
    }
    const result: CrucibleCompiledPhase = {
      ...phase,
      duration: normalizedDuration,
      intensity:
        phase.intensity === undefined
          ? 0.5
          : Number.isFinite(phase.intensity)
            ? Math.max(0, Math.min(1, phase.intensity))
            : 0.5,
      motion: phase.motion ?? "hold",
      index,
      start,
      end: start + normalizedDuration
    }
    start = result.end
    return result
  })
  return { phases: compiled, diagnostics }
}

function phaseForAbsoluteTime(
  phases: readonly CrucibleCompiledPhase[],
  duration: number,
  time: number
): { phase: CrucibleCompiledPhase | undefined; boundaryRank: 0 | 1 } {
  const starting = phases.find(
    (phase) => Math.abs(phase.start - time) <= EPSILON
  )
  if (starting) return { phase: starting, boundaryRank: 1 }
  const containing = phases.find(
    (phase) => time >= phase.start && time < phase.end
  )
  if (containing) return { phase: containing, boundaryRank: 0 }
  if (Math.abs(time - duration) <= EPSILON && phases.length) {
    return { phase: phases[phases.length - 1], boundaryRank: 0 }
  }
  return { phase: undefined, boundaryRank: 1 }
}

function compileEvents(
  events: readonly import("./crucibleTypes").CrucibleEvent[],
  phases: readonly CrucibleCompiledPhase[],
  duration: number
): { events: CrucibleCompiledEvent[]; diagnostics: CrucibleDiagnostic[] } {
  const diagnostics: CrucibleDiagnostic[] = []
  const duplicates = duplicateIds(events.map((event) => event.id))
  if (duplicates.length) {
    diagnostics.push(
      issue(
        "error",
        "duplicate-event-id",
        `Event ids must be unique: ${duplicates.join(", ")}.`,
        "events",
        duplicates
      )
    )
  }
  const compiled: CrucibleCompiledEvent[] = []
  events.forEach((event, index) => {
    if (!event.id.trim()) {
      diagnostics.push(
        issue(
          "error",
          "invalid-event-id",
          "Event ids may not be empty.",
          `events.${index}.id`
        )
      )
    }
    let authoredAt: number
    let phase: CrucibleCompiledPhase | undefined
    let boundaryRank: 0 | 1
    if ("time" in event.at && event.at.time !== undefined) {
      const time = finite(event.at.time)
      if (time == null || time < 0 || time > duration + EPSILON) {
        diagnostics.push(
          issue(
            "error",
            "event-time-out-of-range",
            `Event time must fall between 0 and ${duration}.`,
            `events.${index}.at.time`,
            [event.id]
          )
        )
        return
      }
      authoredAt = Math.max(0, Math.min(duration, time))
      const resolved = phaseForAbsoluteTime(phases, duration, authoredAt)
      phase = resolved.phase
      boundaryRank = resolved.boundaryRank
    } else {
      phase = phases.find((candidate) => candidate.id === event.at.phaseId)
      if (!phase) {
        diagnostics.push(
          issue(
            "error",
            "unknown-event-phase",
            `Event references unknown phase "${event.at.phaseId}".`,
            `events.${index}.at.phaseId`,
            [event.id, event.at.phaseId]
          )
        )
        return
      }
      const progress = event.at.progress ?? 0
      if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
        diagnostics.push(
          issue(
            "error",
            "event-progress-out-of-range",
            "Event phase progress must be between 0 and 1.",
            `events.${index}.at.progress`,
            [event.id]
          )
        )
        return
      }
      authoredAt = phase.start + phase.duration * progress
      boundaryRank = progress === 0 ? 1 : 0
    }
    if (!phase) {
      diagnostics.push(
        issue(
          "error",
          "event-without-phase",
          "Event could not be assigned to a phase.",
          `events.${index}.at`,
          [event.id]
        )
      )
      return
    }
    compiled.push({
      ...event,
      index,
      authoredAt,
      phaseId: phase.id,
      phaseIndex: phase.index,
      boundaryRank
    })
  })
  compiled.sort(
    (a, b) =>
      a.authoredAt - b.authoredAt ||
      a.boundaryRank - b.boundaryRank ||
      a.index - b.index
  )
  return { events: compiled, diagnostics }
}

function validateDefinitions(
  products: readonly CrucibleProductDefinition[],
  outlets: readonly CrucibleOutlet[]
): CrucibleDiagnostic[] {
  const diagnostics: CrucibleDiagnostic[] = []
  const outletIds = new Set(outlets.map((outlet) => outlet.id))
  const duplicateOutlets = duplicateIds(outlets.map((outlet) => outlet.id))
  const duplicateProducts = duplicateIds(products.map((product) => product.id))
  if (duplicateOutlets.length)
    diagnostics.push(
      issue(
        "error",
        "duplicate-outlet-id",
        `Outlet ids must be unique: ${duplicateOutlets.join(", ")}.`,
        "outlets",
        duplicateOutlets
      )
    )
  if (duplicateProducts.length)
    diagnostics.push(
      issue(
        "error",
        "duplicate-product-id",
        `Product ids must be unique: ${duplicateProducts.join(", ")}.`,
        "products",
        duplicateProducts
      )
    )
  outlets.forEach((outlet, index) => {
    if (!outlet.id.trim())
      diagnostics.push(
        issue(
          "error",
          "invalid-outlet-id",
          "Outlet ids may not be empty.",
          `outlets.${index}.id`
        )
      )
    if (outlet.order !== undefined && !Number.isFinite(outlet.order))
      diagnostics.push(
        issue(
          "error",
          "invalid-outlet-order",
          "Outlet order must be finite.",
          `outlets.${index}.order`,
          [outlet.id]
        )
      )
  })
  products.forEach((product, index) => {
    if (!product.id.trim())
      diagnostics.push(
        issue(
          "error",
          "invalid-product-id",
          "Product ids may not be empty.",
          `products.${index}.id`
        )
      )
    if (
      product.amount !== undefined &&
      (!Number.isFinite(product.amount) || product.amount < 0)
    )
      diagnostics.push(
        issue(
          "error",
          "invalid-product-amount",
          "Declared product amount must be finite and non-negative.",
          `products.${index}.amount`,
          [product.id]
        )
      )
    if (product.outletId !== undefined && !outletIds.has(product.outletId))
      diagnostics.push(
        issue(
          "error",
          "unknown-outlet",
          `Product "${product.id}" references unknown outlet "${product.outletId}".`,
          `products.${index}.outletId`,
          [product.outletId]
        )
      )
    normalizedMetrics(
      product.metrics ?? {},
      diagnostics,
      `products.${index}.metrics`
    )
  })
  return diagnostics
}

function orderedOutlets(outlets: readonly CrucibleOutlet[]): CrucibleOutlet[] {
  return outlets
    .map((outlet, index) => ({ outlet, index }))
    .sort(
      (a, b) =>
        (a.outlet.order ?? a.index) - (b.outlet.order ?? b.index) ||
        a.index - b.index
    )
    .map(({ outlet }) => ({ ...outlet }))
}

/** Responsive authored regions shared by the live chart and snapshot renderer. */
export function buildCrucibleLayout(
  size: [number, number] = DEFAULT_CRUCIBLE_SIZE,
  outlets: readonly CrucibleOutlet[] = DEFAULT_CRUCIBLE_OUTLETS
): CrucibleLayout {
  const width = Math.max(1, finite(size[0]) ?? DEFAULT_CRUCIBLE_WIDTH)
  const height = Math.max(1, finite(size[1]) ?? DEFAULT_CRUCIBLE_HEIGHT)
  const compact = width < 360 || height < 260
  const inset = compact ? Math.max(4, Math.min(width, height) * 0.035) : 20
  const railHeight = compact ? Math.max(10, height * 0.075) : 34
  const phaseRail = {
    x: inset,
    y: inset,
    width: Math.max(1, width - inset * 2),
    height: railHeight
  }
  const projectionHeight = compact
    ? Math.max(16, height * 0.14)
    : Math.min(78, height * 0.16)
  const projection = {
    x: inset,
    y: height - inset - projectionHeight,
    width: Math.max(1, width - inset * 2),
    height: projectionHeight
  }
  const sideReserve = compact
    ? Math.max(12, width * 0.08)
    : Math.min(150, width * 0.17)
  const chamberTop = phaseRail.y + phaseRail.height + (compact ? 12 : 38)
  const chamberBottom = projection.y - (compact ? 10 : 34)
  const chamber = {
    x: sideReserve,
    y: chamberTop,
    width: Math.max(24, width - sideReserve * 2),
    height: Math.max(24, chamberBottom - chamberTop)
  }
  const mouthWidth = Math.max(
    18,
    Math.min(chamber.width * 0.32, compact ? 84 : 180)
  )
  const mouth = {
    x: chamber.x + (chamber.width - mouthWidth) / 2,
    y: chamber.y - (compact ? 10 : 24),
    width: mouthWidth,
    height: compact ? 12 : 28
  }
  const sorted = orderedOutlets(outlets)
  const bySide = {
    left: sorted.filter((outlet) => (outlet.side ?? "bottom") === "left"),
    right: sorted.filter((outlet) => outlet.side === "right"),
    bottom: sorted.filter((outlet) => (outlet.side ?? "bottom") === "bottom")
  }
  const placed: CrucibleLayoutOutlet[] = []
  const placeVertical = (side: "left" | "right", entries: CrucibleOutlet[]) => {
    const laneWidth = Math.max(8, sideReserve - inset * 1.5)
    const heightPer = chamber.height / Math.max(1, entries.length)
    entries.forEach((outlet, index) => {
      placed.push({
        ...outlet,
        side,
        x: side === "left" ? inset : width - inset - laneWidth,
        y: chamber.y + index * heightPer,
        width: laneWidth,
        height: Math.max(8, heightPer - (compact ? 2 : 8))
      })
    })
  }
  placeVertical("left", bySide.left)
  placeVertical("right", bySide.right)
  const bottomWidth = chamber.width / Math.max(1, bySide.bottom.length)
  bySide.bottom.forEach((outlet, index) => {
    placed.push({
      ...outlet,
      side: "bottom",
      x: chamber.x + index * bottomWidth,
      y: chamber.y + chamber.height + (compact ? 2 : 7),
      width: Math.max(8, bottomWidth - (compact ? 2 : 8)),
      height: Math.max(
        8,
        projection.y - chamber.y - chamber.height - (compact ? 4 : 12)
      )
    })
  })
  placed.sort(
    (a, b) =>
      sorted.findIndex((outlet) => outlet.id === a.id) -
      sorted.findIndex((outlet) => outlet.id === b.id)
  )
  return {
    width,
    height,
    phaseRail,
    chamber,
    mouth,
    projection,
    outlets: placed
  }
}

function wallRangesOutsideOpenings(
  start: number,
  end: number,
  openings: ReadonlyArray<readonly [number, number]>
): Array<readonly [number, number]> {
  const clipped = openings
    .map(
      ([openingStart, openingEnd]) =>
        [
          Math.max(start, Math.min(openingStart, openingEnd)),
          Math.min(end, Math.max(openingStart, openingEnd))
        ] as const
    )
    .filter(([openingStart, openingEnd]) => openingEnd > openingStart + EPSILON)
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])
  const ranges: Array<readonly [number, number]> = []
  let cursor = start
  for (const [openingStart, openingEnd] of clipped) {
    if (openingStart > cursor + EPSILON) ranges.push([cursor, openingStart])
    cursor = Math.max(cursor, openingEnd)
  }
  if (end > cursor + EPSILON) ranges.push([cursor, end])
  return ranges
}

function wallSegmentColliders(options: {
  id: string
  orientation: "horizontal" | "vertical"
  fixed: number
  start: number
  end: number
  openings: ReadonlyArray<readonly [number, number]>
  thickness: number
  friction: number
  restitution: number
}): PhysicsColliderSpec[] {
  const {
    id,
    orientation,
    fixed,
    start,
    end,
    openings,
    thickness,
    friction,
    restitution
  } = options
  const ranges = wallRangesOutsideOpenings(start, end, openings)
  return ranges.map(([rangeStart, rangeEnd], index) => ({
    id: ranges.length === 1 ? id : `${id}:${index}`,
    friction,
    restitution,
    shape:
      orientation === "horizontal"
        ? {
            type: "segment" as const,
            x1: rangeStart,
            y1: fixed,
            x2: rangeEnd,
            y2: fixed,
            thickness
          }
        : {
            type: "segment" as const,
            x1: fixed,
            y1: rangeStart,
            x2: fixed,
            y2: rangeEnd,
            thickness
          }
  }))
}

/** Chamber walls with outlet apertures, plus non-blocking outlet sensors. */
export function crucibleBoundaryColliders(
  layout: CrucibleLayout
): PhysicsColliderSpec[] {
  const { chamber, mouth } = layout
  const thickness = Math.max(
    2,
    Math.min(10, Math.min(layout.width, layout.height) * 0.018)
  )
  const leftMouth = Math.max(chamber.x, mouth.x)
  const rightMouth = Math.min(chamber.x + chamber.width, mouth.x + mouth.width)
  const outletsBySide = {
    left: layout.outlets.filter((outlet) => outlet.side === "left"),
    right: layout.outlets.filter((outlet) => outlet.side === "right"),
    bottom: layout.outlets.filter((outlet) => outlet.side === "bottom")
  }
  const colliders: PhysicsColliderSpec[] = [
    {
      id: "crucible:wall:top-left",
      friction: 0.42,
      restitution: 0.1,
      shape: {
        type: "segment",
        x1: chamber.x,
        y1: chamber.y,
        x2: leftMouth,
        y2: chamber.y,
        thickness
      }
    },
    {
      id: "crucible:wall:top-right",
      friction: 0.42,
      restitution: 0.1,
      shape: {
        type: "segment",
        x1: rightMouth,
        y1: chamber.y,
        x2: chamber.x + chamber.width,
        y2: chamber.y,
        thickness
      }
    }
  ]
  colliders.push(
    ...wallSegmentColliders({
      id: "crucible:wall:left",
      orientation: "vertical",
      fixed: chamber.x,
      start: chamber.y,
      end: chamber.y + chamber.height,
      openings: outletsBySide.left.map(
        (outlet) => [outlet.y, outlet.y + outlet.height] as const
      ),
      thickness,
      friction: 0.46,
      restitution: 0.12
    }),
    ...wallSegmentColliders({
      id: "crucible:wall:right",
      orientation: "vertical",
      fixed: chamber.x + chamber.width,
      start: chamber.y,
      end: chamber.y + chamber.height,
      openings: outletsBySide.right.map(
        (outlet) => [outlet.y, outlet.y + outlet.height] as const
      ),
      thickness,
      friction: 0.46,
      restitution: 0.12
    }),
    ...wallSegmentColliders({
      id: "crucible:wall:bottom",
      orientation: "horizontal",
      fixed: chamber.y + chamber.height,
      start: chamber.x,
      end: chamber.x + chamber.width,
      openings: outletsBySide.bottom.map(
        (outlet) => [outlet.x, outlet.x + outlet.width] as const
      ),
      thickness,
      friction: 0.5,
      restitution: 0.08
    })
  )
  for (const outlet of layout.outlets) {
    colliders.push({
      id: `crucible:outlet:${encodeURIComponent(outlet.id)}`,
      sensor: true,
      shape: {
        type: "aabb",
        x: outlet.x + outlet.width / 2,
        y: outlet.y + outlet.height / 2,
        width: outlet.width,
        height: outlet.height
      }
    })
  }
  return colliders
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seedNumber(seed: number | string | undefined): number {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0
  if (typeof seed === "string") return hashText(seed)
  return 1
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function buildCruciblePhysicsConfig(
  seed: number | string | undefined,
  colliders: readonly PhysicsColliderSpec[]
): PhysicsPipelineConfig {
  return {
    fixedDt: 1 / 120,
    maxSubsteps: 8,
    settleStepLimit: 7200,
    colliders: colliders.map((collider) => ({
      ...collider,
      shape: { ...collider.shape }
    })),
    observation: { chartType: "crucible" },
    kernel: {
      seed: seedNumber(seed),
      gravity: { x: 0, y: 0 },
      cellSize: 42,
      collisionIterations: 6,
      velocityDamping: 0.992,
      restitution: 0.12,
      friction: 0.42,
      sleepSpeed: 4,
      sleepAfter: 0.5,
      maxVelocity: 620
    }
  }
}

export function crucibleComponentBodyId(componentId: string): string {
  return `crucible:component:${encodeURIComponent(componentId)}`
}

export function crucibleProductBodyId(productId: string): string {
  return `crucible:product:${encodeURIComponent(productId)}`
}

export function crucibleBondId(productId: string, sourceId: string): string {
  return `crucible:bond:${encodeURIComponent(productId)}:${encodeURIComponent(sourceId)}`
}

function resolvedRadius(
  amount: number,
  values: readonly number[],
  fixed: number | undefined,
  range: [number, number]
): number {
  if (fixed !== undefined && Number.isFinite(fixed) && fixed > 0) return fixed
  const min = Math.min(...values, amount)
  const max = Math.max(...values, amount)
  if (max - min <= EPSILON) return (range[0] + range[1]) / 2
  const progress = Math.sqrt(Math.max(0, amount - min) / (max - min))
  return range[0] + (range[1] - range[0]) * progress
}

function normalizedRadiusRange(
  range: [number, number] | undefined,
  layout: CrucibleLayout
): [number, number] {
  const scale = Math.max(
    0.25,
    Math.min(1, layout.width / 900, layout.height / 520)
  )
  const first = range?.[0] ?? 7 * scale
  const second = range?.[1] ?? 18 * scale
  const low = Math.max(1, Math.min(first, second))
  return [low, Math.max(low, Math.max(first, second))]
}

export interface CrucibleSpawnOptions {
  seed?: number | string
  bodyRadius?: number
  radiusRange?: [number, number]
}

/** Stable component bodies at the chamber charge point. */
export function buildCrucibleInitialSpawns<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  layout: CrucibleLayout,
  options: CrucibleSpawnOptions = {}
): PhysicsQueuedSpawn[] {
  const components = Object.values(state.components).sort((a, b) =>
    compareIds(a.id, b.id)
  )
  const amounts = components.map((component) => component.amount)
  const range = normalizedRadiusRange(options.radiusRange, layout)
  const random = seededRandom(seedNumber(options.seed))
  const centerX = layout.mouth.x + layout.mouth.width / 2
  const centerY = layout.chamber.y + Math.max(18, layout.chamber.height * 0.18)
  const ringX = Math.max(4, layout.chamber.width * 0.28)
  const ringY = Math.max(4, layout.chamber.height * 0.12)
  return components.map((component, index) => {
    const angle =
      (index / Math.max(1, components.length)) * Math.PI * 2 +
      (random() - 0.5) * 0.18
    const radius = resolvedRadius(
      component.amount,
      amounts,
      options.bodyRadius,
      range
    )
    const datum: CrucibleBodyDatum<TDatum> = {
      __crucible: true,
      kind: "component",
      semanticId: component.id,
      sourceDatum: component.datum
    }
    return {
      id: crucibleComponentBodyId(component.id),
      x: centerX + Math.cos(angle) * ringX * (0.45 + random() * 0.45),
      y: centerY + Math.sin(angle) * ringY * (0.45 + random() * 0.45),
      vx: (random() - 0.5) * 24,
      vy: (random() - 0.5) * 18,
      mass: Math.max(0.25, radius * radius * 0.015),
      restitution: 0.12,
      friction: 0.4,
      shape: { type: "circle", radius },
      datum
    }
  })
}

function slotsInRect(
  count: number,
  rect: { x: number; y: number; width: number; height: number }
): Array<{ x: number; y: number }> {
  if (!count) return []
  const columns = Math.min(
    count,
    Math.max(
      1,
      Math.ceil(
        Math.sqrt(count * Math.max(0.5, rect.width / Math.max(1, rect.height)))
      )
    )
  )
  const rows = Math.max(1, Math.ceil(count / columns))
  return Array.from({ length: count }, (_, index) => ({
    x: rect.x + ((index % columns) + 0.5) * (rect.width / columns),
    y: rect.y + (Math.floor(index / columns) + 0.5) * (rect.height / rows)
  }))
}

function effectiveComponentOutlet<TDatum extends Datum>(
  component: CrucibleComponentState<TDatum>
): string | undefined {
  if (component.outletId) return component.outletId
  if (component.status === "failed") return "failed"
  if (component.status === "recovered") return "recovered"
  if (component.status === "retained") return "retained"
  if (component.status === "ejected") return "residue"
  return undefined
}

function targetRect(
  layout: CrucibleLayout,
  outletId: string | undefined
): { x: number; y: number; width: number; height: number } {
  const outlet = layout.outlets.find((candidate) => candidate.id === outletId)
  if (outlet) return outlet
  return {
    x: layout.chamber.x + layout.chamber.width * 0.18,
    y: layout.chamber.y + layout.chamber.height * 0.2,
    width: layout.chamber.width * 0.64,
    height: layout.chamber.height * 0.6
  }
}

function productTargetMap(
  products: readonly CrucibleProductState[],
  layout: CrucibleLayout
): Map<string, { x: number; y: number }> {
  const groups = new Map<string, CrucibleProductState[]>()
  for (const product of products) {
    const key = product.outletId ?? "__chamber__"
    const group = groups.get(key) ?? []
    group.push(product)
    groups.set(key, group)
  }
  const targets = new Map<string, { x: number; y: number }>()
  for (const [key, group] of groups) {
    group.sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.order ?? Number.MAX_SAFE_INTEGER) || compareIds(a.id, b.id)
    )
    const slots = slotsInRect(
      group.length,
      targetRect(layout, key === "__chamber__" ? undefined : key)
    )
    group.forEach((product, index) => targets.set(product.id, slots[index]))
  }
  return targets
}

/**
 * Stable terminal body set. Source body ids persist; product cores are added.
 * Split sources target the centroid of their products.
 */
export function buildCrucibleStateSpawns<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  layout: CrucibleLayout,
  options: CrucibleSpawnOptions = {}
): PhysicsQueuedSpawn[] {
  const products = Object.values(state.products).sort((a, b) =>
    compareIds(a.id, b.id)
  )
  const components = Object.values(state.components).sort((a, b) =>
    compareIds(a.id, b.id)
  )
  const allAmounts = [
    ...components.map((component) => component.amount),
    ...products.map((product) => product.amount)
  ]
  const range = normalizedRadiusRange(options.radiusRange, layout)
  const productTargets = productTargetMap(products, layout)
  const productSpawns: PhysicsQueuedSpawn[] = products.map((product) => {
    const target = productTargets.get(product.id) ?? {
      x: layout.chamber.x + layout.chamber.width / 2,
      y: layout.chamber.y + layout.chamber.height / 2
    }
    const radius =
      resolvedRadius(product.amount, allAmounts, options.bodyRadius, range) *
      1.28
    const datum: CrucibleBodyDatum<TDatum> = {
      __crucible: true,
      kind: "product",
      semanticId: product.id,
      product
    }
    return {
      id: crucibleProductBodyId(product.id),
      x: target.x,
      y: target.y,
      mass: Math.max(0.25, radius * radius * 0.018),
      bodyCollisions: false,
      shape: { type: "circle", radius },
      datum
    }
  })

  const independentGroups = new Map<string, CrucibleComponentState<TDatum>[]>()
  for (const component of components.filter(
    (candidate) => !candidate.productIds.length
  )) {
    const key = effectiveComponentOutlet(component) ?? "__chamber__"
    const group = independentGroups.get(key) ?? []
    group.push(component)
    independentGroups.set(key, group)
  }
  const independentTargets = new Map<string, { x: number; y: number }>()
  for (const [key, group] of independentGroups) {
    const slots = slotsInRect(
      group.length,
      targetRect(layout, key === "__chamber__" ? undefined : key)
    )
    group.forEach((component, index) =>
      independentTargets.set(component.id, slots[index])
    )
  }
  const componentSpawns: PhysicsQueuedSpawn[] = components.map((component) => {
    let target = independentTargets.get(component.id)
    if (component.productIds.length) {
      const targets = component.productIds
        .map((id) => productTargets.get(id))
        .filter((value): value is { x: number; y: number } => Boolean(value))
      if (targets.length) {
        target = {
          x: targets.reduce((sum, point) => sum + point.x, 0) / targets.length,
          y: targets.reduce((sum, point) => sum + point.y, 0) / targets.length
        }
        const angle = (hashText(component.id) / 0xffffffff) * Math.PI * 2
        const orbit = Math.min(20, Math.max(4, layout.width * 0.012))
        target = {
          x: target.x + Math.cos(angle) * orbit,
          y: target.y + Math.sin(angle) * orbit
        }
      }
    }
    target ??= {
      x: layout.chamber.x + layout.chamber.width / 2,
      y: layout.chamber.y + layout.chamber.height / 2
    }
    const radius = resolvedRadius(
      component.amount,
      allAmounts,
      options.bodyRadius,
      range
    )
    const datum: CrucibleBodyDatum<TDatum> = {
      __crucible: true,
      kind: "component",
      semanticId: component.id,
      sourceDatum: component.datum
    }
    return {
      id: crucibleComponentBodyId(component.id),
      x: target.x,
      y: target.y,
      mass: Math.max(0.25, radius * radius * 0.015),
      shape: { type: "circle", radius },
      datum
    }
  })
  return [...componentSpawns, ...productSpawns]
}

/** Terminal-name alias retained for callers explicitly rendering the outcome. */
export const buildCrucibleTerminalSpawns = buildCrucibleStateSpawns

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([, entry]) => entry !== undefined && typeof entry !== "function"
        )
        .sort(([a], [b]) => compareIds(a, b))
        .map(([key, entry]) => [key, stableValue(entry)])
    )
  }
  return value
}

export function crucibleSemanticKey(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

export interface CrucibleResolvedTime {
  elapsed: number
  phaseId: string
  phaseIndex: number
  phaseElapsed: number
  complete: boolean
}

export function resolveCrucibleTime<TDatum extends Datum>(
  plan: Pick<CrucibleCompiledPlan<TDatum>, "phases" | "duration">,
  elapsed: number
): CrucibleResolvedTime {
  const safe = finite(elapsed) ?? 0
  const time = Math.max(0, Math.min(plan.duration, safe))
  if (!plan.phases.length) {
    return {
      elapsed: time,
      phaseId: "",
      phaseIndex: -1,
      phaseElapsed: 0,
      complete: true
    }
  }
  const complete = time >= plan.duration - EPSILON
  const phase = complete
    ? plan.phases[plan.phases.length - 1]
    : (plan.phases.find(
        (candidate) => time >= candidate.start && time < candidate.end
      ) ?? plan.phases[0])
  return {
    elapsed: time,
    phaseId: phase.id,
    phaseIndex: phase.index,
    phaseElapsed: complete ? phase.duration : Math.max(0, time - phase.start),
    complete
  }
}

export function resolveCrucibleSnapshotAt<TDatum extends Datum>(
  plan: Pick<CrucibleCompiledPlan<TDatum>, "phases" | "duration">,
  snapshotAt: number | { phaseId: string; progress?: number } | undefined
): number {
  if (snapshotAt === undefined) return plan.duration
  if (typeof snapshotAt === "number")
    return Math.max(0, Math.min(plan.duration, finite(snapshotAt) ?? 0))
  const phase = plan.phases.find(
    (candidate) => candidate.id === snapshotAt.phaseId
  )
  if (!phase) return plan.duration
  const progress = Math.max(
    0,
    Math.min(1, finite(snapshotAt.progress ?? 0) ?? 0)
  )
  return phase.start + phase.duration * progress
}

/** Replay from the immutable origin through an inclusive authored time. */
export function replayCruciblePlan<TDatum extends Datum>(
  plan: Pick<
    CrucibleCompiledPlan<TDatum>,
    "initialState" | "events" | "products" | "outlets" | "phases" | "duration"
  >,
  throughTime = plan.duration
): CrucibleReplayResult<TDatum> {
  const resolved = resolveCrucibleTime(plan, throughTime)
  let state = cloneCrucibleState(plan.initialState)
  const diagnostics: CrucibleDiagnostic[] = []
  const materializations: CrucibleReplayResult<TDatum>["materializations"] = []
  const observations: CrucibleReplayResult<TDatum>["observations"] = []
  for (const event of plan.events) {
    if (event.authoredAt > resolved.elapsed + EPSILON) break
    const result = applyCrucibleEvent(state, event, {
      phaseId: event.phaseId,
      authoredAt: event.authoredAt,
      appliedAt: event.authoredAt,
      products: plan.products,
      outlets: plan.outlets
    })
    diagnostics.push(...result.diagnostics)
    materializations.push(...result.materializations)
    observations.push(...result.observations)
    if (result.applied) state = result.state
  }
  state.elapsed = resolved.elapsed
  state.phaseId = resolved.phaseId
  state.phaseIndex = resolved.phaseIndex
  state.phaseElapsed = resolved.phaseElapsed
  state.complete = resolved.complete
  if (resolved.complete && state.outcome === "in_process") {
    state.outcome = "complete"
  }
  state.playing = false
  return { state, diagnostics, materializations, observations }
}

/** Compile and validate the full controlled tape, including a terminal dry run. */
export function compileCruciblePlan<TDatum extends Datum>(
  options: CrucibleCompileOptions<TDatum>
): CrucibleCompiledPlan<TDatum> {
  const phaseResult = compilePhases(options.phases)
  const duration = phaseResult.phases.at(-1)?.end ?? 0
  const outlets = orderedOutlets(options.outlets ?? DEFAULT_CRUCIBLE_OUTLETS)
  const products = (options.products ?? []).map((product) => ({
    ...product,
    metrics: product.metrics ? { ...product.metrics } : undefined
  }))
  const eventResult = compileEvents(
    options.events ?? [],
    phaseResult.phases,
    duration
  )
  const initialResult = createInitialCrucibleState(options)
  const layout = buildCrucibleLayout(
    options.size ?? DEFAULT_CRUCIBLE_SIZE,
    outlets
  )
  const colliders = crucibleBoundaryColliders(layout)
  const definitionDiagnostics = validateDefinitions(products, outlets)
  const semanticKey = crucibleSemanticKey({
    seed: options.seed ?? 1,
    components: Object.values(initialResult.state.components)
      .sort((a, b) => compareIds(a.id, b.id))
      .map((component) => ({
        id: component.id,
        label: component.label,
        category: component.category,
        amount: component.amount,
        metrics: component.metrics,
        status: component.status
      })),
    phases: phaseResult.phases.map(
      ({
        id,
        duration: phaseDuration,
        label,
        description,
        intensity,
        motion,
        color,
        metrics
      }) => ({
        id,
        duration: phaseDuration,
        label,
        description,
        intensity,
        motion,
        color,
        metrics
      })
    ),
    products,
    outlets,
    events: eventResult.events.map(
      ({
        id,
        label,
        description,
        summary,
        authoredAt,
        phaseId,
        boundaryRank,
        effects
      }) => ({
        id,
        label,
        description,
        summary,
        authoredAt,
        phaseId,
        boundaryRank,
        effects
      })
    )
  })
  const initialSpawns = buildCrucibleInitialSpawns(
    initialResult.state,
    layout,
    {
      seed: options.seed,
      bodyRadius: options.bodyRadius,
      radiusRange: options.radiusRange
    }
  )
  const baseDiagnostics = [
    ...phaseResult.diagnostics,
    ...eventResult.diagnostics,
    ...initialResult.diagnostics,
    ...definitionDiagnostics
  ]
  const provisional: CrucibleCompiledPlan<TDatum> = {
    phases: phaseResult.phases,
    events: eventResult.events,
    products,
    outlets,
    duration,
    initialState: initialResult.state,
    terminalState: initialResult.state,
    layout,
    colliders,
    config: buildCruciblePhysicsConfig(options.seed, colliders),
    initialSpawns,
    terminalSpawns: [],
    semanticKey,
    diagnostics: baseDiagnostics
  }
  const replay = replayCruciblePlan(provisional)
  const formingProducts = Object.values(replay.state.products)
    .filter((product) => product.status === "forming")
    .map((product) => product.id)
  const terminalDiagnostics = formingProducts.length
    ? [
        issue(
          "warning",
          "forming-product-at-end",
          `Products remain forming at the end of the tape: ${formingProducts.join(", ")}.`,
          "events",
          formingProducts
        )
      ]
    : []
  provisional.terminalState = replay.state
  provisional.terminalSpawns = buildCrucibleTerminalSpawns(
    replay.state,
    layout,
    {
      seed: options.seed,
      bodyRadius: options.bodyRadius,
      radiusRange: options.radiusRange
    }
  )
  provisional.diagnostics = [
    ...baseDiagnostics,
    ...replay.diagnostics,
    ...terminalDiagnostics
  ]
  return provisional
}
