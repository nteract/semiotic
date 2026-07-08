import { scaleLinear } from "d3-scale"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { Style } from "../../stream/types"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import {
  collidersFromPlotBounds,
  collidersFromXScaleBins,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsFrame"

export interface PhysicsChartLayout {
  config: PhysicsPipelineConfig
  initialSpawns: PhysicsQueuedSpawn[]
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  projectionRows: Array<{ label: string; value: number; secondary?: number }>
  metadata?: Record<string, unknown>
}

export interface PhysicsChartArea {
  width: number
  height: number
  plot: { x: number; y: number; width: number; height: number }
}

export function projectionRowsToSemanticItems(
  rows: readonly PhysicsChartLayout["projectionRows"][number][],
  size: [number, number],
  noun: string
): PhysicsSemanticItem[] {
  if (!rows.length) return []
  const area = physicsChartArea(size)
  const laneWidth = area.plot.width / Math.max(1, rows.length)
  const maxValue = Math.max(1, ...rows.map((row) => row.value))
  const maxHeight = area.plot.height * 0.62
  const yBottom = area.plot.y + area.plot.height

  return rows.map((row, index) => {
    const barHeight = Math.max(8, (row.value / maxValue) * maxHeight)
    const x = area.plot.x + (index + 0.5) * laneWidth
    const y = yBottom - barHeight / 2
    const secondary =
      row.secondary == null ? "" : `, ${row.secondary} secondary`
    const label = `${noun} ${row.label}: ${row.value}${secondary}`
    return {
      id: `${noun}-${row.label}`,
      label,
      description: label,
      datum: row,
      x,
      y,
      shape: "rect" as const,
      width: Math.max(12, laneWidth * 0.58),
      height: barHeight,
      group: noun
    }
  })
}

export interface GaltonBoardPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  valueAccessor: ChartAccessor<TDatum, number>
  bins: number
  ballRadius: number
  seed: number
  size: [number, number]
  valueExtent?: [number, number]
}

export interface GaltonBoardProjectionMetadata {
  kind: "galton-board"
  bins: number
  plot: PhysicsChartArea["plot"]
  valueExtent: [number, number]
}

export interface GaltonMechanicalSampleOptions {
  bins: number
  count?: number
  pegRows?: number
  branchProbability?: number
  seed?: number
  idPrefix?: string
}

export interface PhysicsPileMechanicalSampleOptions {
  categories?: readonly string[]
  count?: number
  idPrefix?: string
  seed?: number
  unitValue?: number
}

export interface EventDropWindowOptions {
  size: number
  gapPolicy?: "drop" | "keep"
}

export interface EventDropPlotRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface EventDropLidSegment {
  id: string
  windowIndex?: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface EventDropProjectionMetadata {
  kind: "event-drop"
  closedWindowCount: number
  gutter: EventDropPlotRegion
  lateCount: number
  lidSegments: EventDropLidSegment[]
  plot: PhysicsChartArea["plot"]
  windowPlot: EventDropPlotRegion
  watermarkValue: number
  windowCount: number
  windowSize: number
  windowStart: number
}

export interface EventDropPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  timeAccessor: ChartAccessor<TDatum, number>
  arrivalAccessor: ChartAccessor<TDatum, number>
  windows: EventDropWindowOptions
  watermark?: { delay?: number; value?: number } | ((latestEventTime: number) => number)
  ballRadius: number
  seed: number
  size: [number, number]
  timeExtent?: [number, number]
  timeScale?: number
}

export interface PhysicsPileOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  categoryAccessor: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  unitValue: number
  ballRadius: number
  seed: number
  size: [number, number]
}

export interface CollisionSwarmPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  xAccessor: ChartAccessor<TDatum, number>
  groupAccessor?: ChartAccessor<TDatum, string>
  radiusAccessor?: ChartAccessor<TDatum, number>
  pointRadius: number
  seed: number
  size: [number, number]
  xExtent?: [number, number]
  collisionIterations?: number
  settle?: boolean
}

export interface CollisionSwarmProjectionMetadata {
  kind: "collision-swarm"
  xExtent: [number, number]
  xRange: [number, number]
  groups: Array<{ label: string; y: number; count: number }>
  plot: PhysicsChartArea["plot"]
}

export type PhysicalFlowCoordinateMode = "auto" | "normalized" | "pixels"
export type PhysicalFlowPathConstraint = "path" | "none"

export interface PhysicalFlowPoint {
  x: number
  y: number
}

export type PhysicalFlowRawPath = ReadonlyArray<
  PhysicalFlowPoint | readonly [number, number]
>

export interface PhysicalFlowOptions<
  TNode extends Datum = Datum,
  TLink extends Datum = Datum
> {
  nodes: readonly TNode[]
  links: readonly TLink[]
  nodeIdAccessor: ChartAccessor<TNode, string>
  nodeXAccessor: ChartAccessor<TNode, number>
  nodeYAccessor: ChartAccessor<TNode, number>
  sourceAccessor: ChartAccessor<TLink, string>
  targetAccessor: ChartAccessor<TLink, string>
  throughputAccessor: ChartAccessor<TLink, number>
  pathAccessor?: ChartAccessor<TLink, PhysicalFlowRawPath | undefined>
  coordinateMode?: PhysicalFlowCoordinateMode
  particleRate: number
  maxParticles: number
  particleRadius: number
  flowSpeed: number
  pathConstraint?: PhysicalFlowPathConstraint
  reducedMotion?: boolean
  seed: number
  size: [number, number]
}

export interface PhysicalFlowProjectionMetadata {
  kind: "physical-flow"
  coordinateMode: Exclude<PhysicalFlowCoordinateMode, "auto">
  particleCount: number
  totalThroughput: number
  plot: PhysicsChartArea["plot"]
  nodes: Array<{
    id: string
    label: string
    x: number
    y: number
    sensorId: string
    incoming: number
    outgoing: number
  }>
  links: Array<{
    id: string
    source: string
    target: string
    sourceLabel: string
    targetLabel: string
    throughput: number
    packetCount: number
    path: PhysicalFlowPoint[]
  }>
}

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue>
): TValue {
  return typeof accessor === "function"
    ? accessor(datum, index)
    : (datum[accessor] as TValue)
}

function finiteNumber(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) ? time : null
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(number) ? number : null
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function positiveNumber(value: unknown, fallback: number): number {
  const number = finiteNumber(value)
  return number != null && number > 0 ? number : fallback
}

function safeIdPart(value: unknown): string {
  const text = String(value ?? "unknown").trim()
  return text.replace(/[^A-Za-z0-9_-]+/g, "_") || "unknown"
}

function pointFromUnknown(value: unknown): PhysicalFlowPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = finiteNumber(value[0])
    const y = finiteNumber(value[1])
    return x != null && y != null ? { x, y } : null
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const x = finiteNumber(record.x)
    const y = finiteNumber(record.y)
    return x != null && y != null ? { x, y } : null
  }
  return null
}

function physicalFlowPathFromUnknown(value: unknown): PhysicalFlowPoint[] {
  if (!Array.isArray(value)) return []
  return value
    .map(pointFromUnknown)
    .filter((point): point is PhysicalFlowPoint => point != null)
}

function choosePhysicalFlowCoordinateMode(
  mode: PhysicalFlowCoordinateMode | undefined,
  points: readonly PhysicalFlowPoint[]
): Exclude<PhysicalFlowCoordinateMode, "auto"> {
  if (mode === "normalized" || mode === "pixels") return mode
  if (
    points.length > 0 &&
    points.every(
      (point) =>
        point.x >= 0 &&
        point.x <= 1 &&
        point.y >= 0 &&
        point.y <= 1
    )
  ) {
    return "normalized"
  }
  return "pixels"
}

function scalePhysicalFlowPoint(
  point: PhysicalFlowPoint,
  area: PhysicsChartArea,
  mode: Exclude<PhysicalFlowCoordinateMode, "auto">
): PhysicalFlowPoint {
  if (mode === "normalized") {
    return {
      x: area.plot.x + point.x * area.plot.width,
      y: area.plot.y + point.y * area.plot.height
    }
  }
  return {
    x: clampNumber(point.x, area.plot.x, area.plot.x + area.plot.width),
    y: clampNumber(point.y, area.plot.y, area.plot.y + area.plot.height)
  }
}

function routeLength(points: readonly PhysicalFlowPoint[]): number {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index].x - points[index - 1].x
    const dy = points[index].y - points[index - 1].y
    length += Math.hypot(dx, dy)
  }
  return length
}

function pointAlongRoute(
  points: readonly PhysicalFlowPoint[],
  progress: number
): PhysicalFlowPoint {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return { ...points[0] }
  const targetDistance = clampNumber(progress, 0, 1) * routeLength(points)
  let traveled = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y)
    if (segmentLength <= 0) continue
    if (traveled + segmentLength >= targetDistance) {
      const local = (targetDistance - traveled) / segmentLength
      return {
        x: previous.x + (current.x - previous.x) * local,
        y: previous.y + (current.y - previous.y) * local
      }
    }
    traveled += segmentLength
  }
  return { ...points[points.length - 1] }
}

function routeDirection(
  points: readonly PhysicalFlowPoint[],
  progress: number
): PhysicalFlowPoint {
  const before = pointAlongRoute(points, Math.max(0, progress - 0.02))
  const after = pointAlongRoute(points, Math.min(1, progress + 0.02))
  const dx = after.x - before.x
  const dy = after.y - before.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateGaltonMechanicalSamples(
  options: GaltonMechanicalSampleOptions
): Datum[] {
  const bins = Math.max(2, Math.round(options.bins))
  const pegRows = Math.max(1, Math.round(options.pegRows ?? bins - 1))
  const count = Math.max(1, Math.round(options.count ?? Math.max(64, bins * 4)))
  const branchProbability = clampNumber(
    Number.isFinite(options.branchProbability) ? options.branchProbability ?? 0.5 : 0.5,
    0,
    1
  )
  const random = seededRandom(options.seed ?? 1)
  const idPrefix = options.idPrefix ?? "mechanical"

  return Array.from({ length: count }, (_, index) => {
    let rights = 0
    for (let row = 0; row < pegRows; row += 1) {
      if (random() < branchProbability) rights += 1
    }
    const midpoint = pegRows / 2
    return {
      id: `${idPrefix}-${index}`,
      value: rights,
      mechanical: true,
      pegRows,
      branchProbability,
      pathRights: rights,
      side: rights < midpoint ? "left" : rights > midpoint ? "right" : "center"
    }
  })
}

export function generatePhysicsPileMechanicalSamples(
  options: PhysicsPileMechanicalSampleOptions = {}
): Datum[] {
  const categories = (options.categories?.length
    ? options.categories
    : ["Intake", "Review", "Build", "Ship"]
  )
    .map((category) => String(category).trim())
    .filter(Boolean)
  const resolvedCategories = categories.length ? categories : ["Intake"]
  const count = Math.max(
    resolvedCategories.length,
    Math.round(options.count ?? Math.max(48, resolvedCategories.length * 12))
  )
  const unitValue = positiveNumber(options.unitValue, 1)
  const random = seededRandom(options.seed ?? 1)
  const idPrefix = options.idPrefix ?? "mechanical-pile"
  const weights = resolvedCategories.map(() => 0.65 + random() * 0.9)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1
  const remaining = count - resolvedCategories.length
  const rawShares = weights.map((weight) => (weight / weightTotal) * remaining)
  const counts = rawShares.map((share) => 1 + Math.floor(share))
  let remainder = count - counts.reduce((sum, value) => sum + value, 0)
  const order = rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let index = 0; remainder > 0; index = (index + 1) % order.length) {
    counts[order[index].index] += 1
    remainder -= 1
  }

  return resolvedCategories.map((category, index) => ({
    id: `${idPrefix}-${index}`,
    category,
    value: counts[index] * unitValue,
    mechanical: true,
    unitCount: counts[index],
    unitValue,
    share: counts[index] / count
  }))
}

export function physicsChartArea(size: [number, number]): PhysicsChartArea {
  const [width, height] = size
  const plot = {
    x: 32,
    y: 24,
    width: Math.max(80, width - 64),
    height: Math.max(80, height - 58)
  }
  return { width, height, plot }
}

export function hashStringColor(value: unknown): string {
  const text = String(value ?? "")
  if (!text) return "#4e79a7"
  const palette = [
    "#4e79a7",
    "#59a14f",
    "#e15759",
    "#f28e2b",
    "#76b7b2",
    "#edc948",
    "#b07aa1",
    "#ff9da7"
  ]
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return palette[hash % palette.length]
}

export function styleFromColorAccessor<TDatum extends Datum>(
  colorBy: ChartAccessor<TDatum, string> | undefined,
  fallback = "#4e79a7"
): (body: { datum?: unknown }) => Style {
  return (body) => {
    const datum = body.datum as TDatum | undefined
    const value =
      datum && colorBy
        ? typeof colorBy === "function"
          ? colorBy(datum, 0)
          : datum[colorBy]
        : undefined
    return {
      fill: value == null ? fallback : hashStringColor(value),
      stroke: "#111827",
      strokeWidth: 1,
      opacity: 0.9
    }
  }
}

function baseConfig(
  seed: number,
  colliders: PhysicsColliderSpec[],
  chartType: string,
  kernel?: Partial<NonNullable<PhysicsPipelineConfig["kernel"]>>
): PhysicsPipelineConfig {
  return {
    fixedDt: 1 / 120,
    maxSubsteps: 8,
    colliders,
    observation: {
      chartType
    },
    kernel: {
      seed,
      gravity: { x: 0, y: 760 },
      cellSize: 36,
      collisionIterations: 6,
      velocityDamping: 0.995,
      restitution: 0.08,
      friction: 0.4,
      sleepSpeed: 8,
      // A unit must be near-still for this long before it anchors — long enough
      // that being briefly held by a falling crowd does not sleep it mid-air.
      sleepAfter: 0.6,
      ...kernel
    }
  }
}

export function buildGaltonBoardPhysics<TDatum extends Datum>(
  options: GaltonBoardPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const { data, valueAccessor, bins, ballRadius, seed, size, valueExtent } = options
  const area = physicsChartArea(size)
  const values = data
    .map((datum, index) => finiteNumber(readAccessor(datum, index, valueAccessor)))
    .filter((value): value is number => value != null)
  const extentMin = valueExtent ? finiteNumber(valueExtent[0]) : null
  const extentMax = valueExtent ? finiteNumber(valueExtent[1]) : null
  const min = extentMin ?? (values.length ? Math.min(...values) : 0)
  const max = extentMax ?? (values.length ? Math.max(...values) : 1)
  const span = max === min ? 1 : max - min
  const xScale = scaleLinear()
    .domain([0, bins])
    .range([area.plot.x, area.plot.x + area.plot.width])
  const binCounts = Array.from({ length: bins }, () => 0)
  const spawns: PhysicsQueuedSpawn[] = []

  data.forEach((datum, index) => {
    const value = finiteNumber(readAccessor(datum, index, valueAccessor))
    if (value == null) return
    const bin = Math.max(
      0,
      Math.min(bins - 1, Math.floor(((value - min) / span) * bins))
    )
    binCounts[bin] += 1
    spawns.push({
      id: String((datum as Datum).id ?? `galton-${index}`),
      x: xScale(bin + 0.5),
      y: area.plot.y + ballRadius + 2,
      vx: ((index % 5) - 2) * 8,
      vy: 0,
      mass: 1,
      shape: { type: "circle", radius: ballRadius },
      datum: { ...datum, value, bin }
    })
  })

  const yBottom = area.plot.y + area.plot.height
  const colliders = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      { idPrefix: "galton", wallThickness: 20, floorThickness: 20 }
    ),
    ...collidersFromXScaleBins({
      idPrefix: "galton-bin",
      count: bins,
      domainStart: 0,
      domainStep: 1,
      xScale,
      // Walls extend well above the viewport so a transient crowd can never
      // squeeze a unit over a wall top (there is no reachable ledge); units are
      // channeled into their bin and stack into a column instead of spilling.
      yTop: area.plot.y - 400,
      yBottom,
      wallThickness: 6
    })
  ]

  return {
    config: baseConfig(seed, colliders, "GaltonBoardChart"),
    initialSpawns: spawns,
    // Rain the units in rather than dumping them: the board animates as it
    // fills and each unit settles before the next crowds its bin.
    initialSpawnPacing: { pacing: { ratePerSec: 55 } },
    projectionRows: binCounts.map((value, index) => ({
      label: String(index + 1),
      value
    })),
    metadata: {
      kind: "galton-board",
      bins,
      plot: area.plot,
      valueExtent: [min, max]
    } satisfies GaltonBoardProjectionMetadata
  }
}

function eventDropGeometry(
  area: PhysicsChartArea,
  ballRadius: number
): {
  gutter: EventDropPlotRegion
  windowPlot: EventDropPlotRegion
  wallTop: number
} {
  const gutterWidth = Math.max(
    ballRadius * 5,
    Math.min(92, area.plot.width * 0.13)
  )
  const gutter = {
    x: area.plot.x,
    y: area.plot.y,
    width: gutterWidth,
    height: area.plot.height
  }
  const windowPlot = {
    x: area.plot.x + gutterWidth,
    y: area.plot.y,
    width: Math.max(40, area.plot.width - gutterWidth),
    height: area.plot.height
  }
  return {
    gutter,
    windowPlot,
    wallTop: area.plot.y + area.plot.height * 0.48
  }
}

function eventDropLidSegments(
  metadata: Pick<
    EventDropProjectionMetadata,
    "closedWindowCount" | "gutter" | "windowCount" | "windowPlot" | "windowSize" | "windowStart"
  >,
  lidRightY: number
): EventDropLidSegment[] {
  const closedWindowCount = Math.max(0, Math.min(metadata.windowCount, metadata.closedWindowCount))
  if (!closedWindowCount) return []

  const domainStart = metadata.windowStart
  const domainEnd = metadata.windowStart + metadata.windowCount * metadata.windowSize
  const xScale = scaleLinear()
    .domain([domainStart, domainEnd])
    .range([
      metadata.windowPlot.x,
      metadata.windowPlot.x + metadata.windowPlot.width
    ])
  const closedEndX = xScale(
    metadata.windowStart + closedWindowCount * metadata.windowSize
  )
  const gutterCatchX = metadata.windowPlot.x
  const availableDrop = Math.max(
    18,
    Math.min(metadata.windowPlot.height * 0.3, closedEndX - gutterCatchX)
  )
  const lidLeftY = lidRightY + availableDrop
  const yAt = (x: number) => {
    if (closedEndX === gutterCatchX) return lidRightY
    const t = (x - gutterCatchX) / (closedEndX - gutterCatchX)
    return lidLeftY + (lidRightY - lidLeftY) * t
  }
  const segments: EventDropLidSegment[] = []

  for (let index = 0; index < closedWindowCount; index += 1) {
    const start = metadata.windowStart + index * metadata.windowSize
    const end = start + metadata.windowSize
    const x1 = xScale(start)
    const x2 = xScale(end)
    segments.push({
      id: `eventdrop-lid-${index}`,
      windowIndex: index,
      x1,
      y1: yAt(x1),
      x2,
      y2: yAt(x2)
    })
  }

  return segments
}

function eventDropWindowWallColliders(options: {
  idPrefix: string
  count: number
  xScale: (value: number) => number
  yBottom: number
  yTop: number
  yTopForIndex?: (index: number) => number
  wallThickness: number
}): PhysicsColliderSpec[] {
  const { count, idPrefix, wallThickness, xScale, yBottom, yTop, yTopForIndex } = options
  return Array.from({ length: count + 1 }, (_, index) => {
    const wallTop = Math.min(yBottom - 1, yTopForIndex?.(index) ?? yTop)
    const wallHeight = Math.max(1, yBottom - wallTop)
    return {
      id: `${idPrefix}-wall-${index}`,
      shape: {
        type: "aabb" as const,
        x: xScale(index),
        y: wallTop + wallHeight / 2,
        width: wallThickness,
        height: wallHeight
      }
    }
  })
}

export function buildEventDropPhysics<TDatum extends Datum>(
  options: EventDropPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const {
    data,
    timeAccessor,
    arrivalAccessor,
    windows,
    watermark,
    ballRadius,
    seed,
    size,
    timeExtent,
    timeScale = 1
  } = options
  const area = physicsChartArea(size)
  const times = data
    .map((datum, index) => finiteNumber(readAccessor(datum, index, timeAccessor)))
    .filter((value): value is number => value != null)
  const extentStart = finiteNumber(timeExtent?.[0])
  const extentEnd = finiteNumber(timeExtent?.[1])
  const dataMinTime = times.length ? Math.min(...times) : 0
  const dataMaxTime = times.length ? Math.max(...times) : dataMinTime + windows.size
  const minTime = Math.min(extentStart ?? dataMinTime, dataMinTime)
  const maxTime = Math.max(extentEnd ?? dataMaxTime, dataMaxTime)
  const windowStart = Math.floor(minTime / windows.size) * windows.size
  const windowCount = Math.max(
    1,
    Math.ceil((maxTime - windowStart + windows.size) / windows.size)
  )
  const latest = times.length ? Math.max(...times) : 0
  const watermarkValue =
    typeof watermark === "function"
      ? watermark(latest)
      : finiteNumber(watermark?.value) ??
        latest - (watermark?.delay ?? windows.size)
  const closedWindowCount = Math.max(
    0,
    Math.min(
      windowCount,
      Array.from({ length: windowCount }, (_, index) => index).reduce(
        (sum, index) =>
          windowStart + (index + 1) * windows.size <= watermarkValue
            ? sum + 1
            : sum,
        0
      )
    )
  )
  const geometry = eventDropGeometry(area, ballRadius)
  const domainEnd = windowStart + windowCount * windows.size
  const xScale = scaleLinear()
    .domain([windowStart, domainEnd])
    .range([
      geometry.windowPlot.x,
      geometry.windowPlot.x + geometry.windowPlot.width
    ])
  const rows = Array.from({ length: windowCount }, () => ({
    value: 0,
    secondary: 0
  }))
  const spawns: PhysicsQueuedSpawn[] = []

  data.forEach((datum, index) => {
    const eventTime = finiteNumber(readAccessor(datum, index, timeAccessor))
    if (eventTime == null) return
    const arrivalTime =
      finiteNumber(readAccessor(datum, index, arrivalAccessor)) ?? eventTime
    const windowIndex = Math.max(
      0,
      Math.min(
        windowCount - 1,
        Math.floor((eventTime - windowStart) / windows.size)
      )
    )
    const windowEnd = windowStart + (windowIndex + 1) * windows.size
    const late = windowEnd <= watermarkValue
    rows[windowIndex].value += late ? 0 : 1
    rows[windowIndex].secondary += late ? 1 : 0
    spawns.push({
      id: String((datum as Datum).id ?? `event-${index}`),
      x: Math.max(
        geometry.windowPlot.x + ballRadius,
        Math.min(
          geometry.windowPlot.x + geometry.windowPlot.width - ballRadius,
          xScale(eventTime)
        )
      ),
      y: area.plot.y + ballRadius + 2,
      vx: ((index % 3) - 1) * 8,
      vy: 0,
      mass: 1,
      friction: 0.02,
      spawnAt: arrivalTime,
      shape: { type: "circle", radius: ballRadius },
      datum: { ...datum, eventTime, arrivalTime, windowIndex, late }
    })
  })

  const yBottom = area.plot.y + area.plot.height
  const lidRightY = area.plot.y + area.plot.height * 0.28
  const metadataBase = {
    closedWindowCount,
    gutter: geometry.gutter,
    plot: area.plot,
    windowCount,
    windowPlot: geometry.windowPlot,
    windowSize: windows.size,
    windowStart
  }
  const lidSegments = eventDropLidSegments(metadataBase, lidRightY)
  const lidYAtBoundary = (index: number) => {
    if (index < 0 || index > closedWindowCount) return null
    const y = index === 0
      ? lidSegments[0]?.y1
      : lidSegments[index - 1]?.y2 ?? lidSegments[index]?.y1
    return typeof y === "number" && Number.isFinite(y) ? y : null
  }
  const colliders = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      { idPrefix: "eventdrop", wallThickness: 20, floorThickness: 20 }
    ),
    ...eventDropWindowWallColliders({
      idPrefix: "eventdrop-window",
      count: windowCount,
      xScale: (index) => xScale(windowStart + index * windows.size),
      yTop: geometry.wallTop,
      yTopForIndex: (index) => {
        const lidY = lidYAtBoundary(index)
        return lidY == null ? geometry.wallTop : lidY + ballRadius * 1.25
      },
      yBottom,
      wallThickness: 6
    }),
    ...lidSegments.map((segment) => ({
      id: segment.id,
      shape: {
        type: "segment" as const,
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
        thickness: Math.max(4, ballRadius * 0.42)
      },
      friction: 0.02,
      restitution: 0.01
    }))
  ]

  return {
    config: baseConfig(seed, colliders, "EventDropChart", {
      friction: 0.08
    }),
    initialSpawns: spawns,
    initialSpawnPacing: {
      pacing: "arrival",
      timeAccessor: (spawn) =>
        (spawn.datum as { arrivalTime?: number } | undefined)?.arrivalTime,
      timeScale
    },
    projectionRows: rows.map((row, index) => ({
      label: `${windowStart + index * windows.size}-${windowStart + (index + 1) * windows.size}`,
      value: row.value,
      secondary: row.secondary
    })),
    metadata: {
      kind: "event-drop",
      closedWindowCount,
      gutter: geometry.gutter,
      lidSegments,
      lateCount: rows.reduce((sum, row) => sum + row.secondary, 0),
      plot: area.plot,
      windowPlot: geometry.windowPlot,
      watermarkValue,
      windowCount,
      windowSize: windows.size,
      windowStart
    } satisfies EventDropProjectionMetadata
  }
}

/**
 * Place a single event onto an already-mounted EventDropChart using the live
 * board's domain (window layout + current watermark) so a pushed arrival drops
 * over its true event-time x instead of the center of a one-event mini-domain.
 * Closed-window lids then decide whether physics sends it to the gutter.
 * Returns null when the datum carries no finite event time. Omits `spawnAt` so
 * the store drops it now.
 */
export function placeEventDropSpawn<TDatum extends Datum>(
  datum: TDatum,
  index: number,
  metadata: EventDropProjectionMetadata,
  options: {
    timeAccessor: ChartAccessor<TDatum, number>
    arrivalAccessor: ChartAccessor<TDatum, number>
    ballRadius: number
  }
): PhysicsQueuedSpawn | null {
  const eventTime = finiteNumber(readAccessor(datum, index, options.timeAccessor))
  if (eventTime == null) return null
  const arrivalTime =
    finiteNumber(readAccessor(datum, index, options.arrivalAccessor)) ?? eventTime
  const { windowPlot, windowStart, windowCount, windowSize, watermarkValue } = metadata
  const domainEnd = windowStart + windowCount * windowSize
  const xScale = scaleLinear()
    .domain([windowStart, domainEnd])
    .range([windowPlot.x, windowPlot.x + windowPlot.width])
  const windowIndex = Math.max(
    0,
    Math.min(windowCount - 1, Math.floor((eventTime - windowStart) / windowSize))
  )
  const windowEnd = windowStart + (windowIndex + 1) * windowSize
  const late = windowEnd <= watermarkValue
  const { ballRadius } = options
  return {
    id: String((datum as Datum).id ?? `event-push-${index}`),
    x: Math.max(
      windowPlot.x + ballRadius,
      Math.min(windowPlot.x + windowPlot.width - ballRadius, xScale(eventTime))
    ),
    y: windowPlot.y + ballRadius + 2,
    vx: ((index % 3) - 1) * 8,
    vy: 0,
    mass: 1,
    friction: 0.02,
    shape: { type: "circle", radius: ballRadius },
    datum: { ...datum, eventTime, arrivalTime, windowIndex, late }
  }
}

export interface PileTubeGeometry {
  laneWidth: number
  tubeWidth: number
  ballDiameter: number
  perRow: number
  centerX: (index: number) => number
  pileHeight: (count: number) => number
}

/**
 * Column geometry shared by the pile builder and its projection overlay so the
 * ghost bar's height is exactly the fill target the stacked units rise to reach.
 * Units drop into a narrow tube (a few balls wide) so their count reads as
 * height — a bar chart assembled from falling units, not a spreading heap.
 */
export function pileTubeGeometry(
  plot: { x: number; y: number; width: number; height: number },
  categoryCount: number,
  ballRadius: number
): PileTubeGeometry {
  const count = Math.max(1, categoryCount)
  const laneWidth = plot.width / count
  const ballDiameter = Math.max(2, ballRadius * 2)
  const tubeWidth = Math.min(
    laneWidth * 0.7,
    Math.max(ballDiameter * 3.2, ballDiameter + 8)
  )
  const perRow = Math.max(1, Math.floor(tubeWidth / ballDiameter))
  return {
    laneWidth,
    tubeWidth,
    ballDiameter,
    perRow,
    centerX: (index) => plot.x + (index + 0.5) * laneWidth,
    pileHeight: (value) => Math.ceil(Math.max(0, value) / perRow) * ballDiameter
  }
}

export function buildPhysicsPile<TDatum extends Datum>(
  options: PhysicsPileOptions<TDatum>
): PhysicsChartLayout {
  const {
    data,
    categoryAccessor,
    valueAccessor,
    unitValue,
    ballRadius,
    seed,
    size
  } = options
  const safeUnitValue = positiveNumber(unitValue, 1)
  const area = physicsChartArea(size)
  const categories: string[] = []
  const categoryIndex = new Map<string, number>()
  const rows = new Map<string, number>()
  const spawns: PhysicsQueuedSpawn[] = []

  function indexFor(category: string): number {
    let index = categoryIndex.get(category)
    if (index == null) {
      index = categories.length
      categories.push(category)
      categoryIndex.set(category, index)
    }
    return index
  }

  data.forEach((datum, index) => {
    const category = String(readAccessor(datum, index, categoryAccessor) ?? "unknown")
    indexFor(category)
  })
  const categoryCount = Math.max(1, categories.length)
  const geom = pileTubeGeometry(area.plot, categoryCount, ballRadius)
  const spawnOffset = Math.max(0, geom.tubeWidth / 2 - ballRadius - 1)

  // Collect each category's units separately, then interleave them round-robin
  // so paced spawning trickles into every tube at once instead of hammering one
  // tube with a concentrated burst (which squeezes units up and out).
  const perCategory: PhysicsQueuedSpawn[][] = categories.map(() => [])
  data.forEach((datum, index) => {
    const category = String(readAccessor(datum, index, categoryAccessor) ?? "unknown")
    const catIndex = indexFor(category)
    const rawValue = valueAccessor
      ? finiteNumber(readAccessor(datum, index, valueAccessor))
      : 1
    const count = Math.max(0, Math.round((rawValue ?? 0) / safeUnitValue))
    const centerX = geom.centerX(catIndex)
    for (let unitIndex = 0; unitIndex < count; unitIndex += 1) {
      const running = rows.get(category) ?? 0
      // Fan units across the tube's columns so they settle into rows rather
      // than a single toppling stack.
      const column = geom.perRow > 1 ? running % geom.perRow : 0
      const columnOffset =
        geom.perRow > 1
          ? ((column / (geom.perRow - 1)) * 2 - 1) * spawnOffset
          : 0
      rows.set(category, running + 1)
      perCategory[catIndex].push({
        id: `${String((datum as Datum).id ?? `pile-${index}`)}-${unitIndex}`,
        x: centerX + columnOffset,
        y: area.plot.y + ballRadius + 2,
        vx: (((unitIndex % 3) - 1) * ballRadius) / 2,
        vy: 0,
        mass: 1,
        shape: { type: "circle", radius: ballRadius },
        datum: { ...datum, category, unitIndex }
      })
    }
  })
  const maxUnits = perCategory.reduce((max, list) => Math.max(max, list.length), 0)
  for (let round = 0; round < maxUnits; round += 1) {
    for (const list of perCategory) {
      if (round < list.length) spawns.push(list[round])
    }
  }

  const floorY = area.plot.y + area.plot.height
  const colliders: PhysicsColliderSpec[] = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      { idPrefix: "pile", wallThickness: 20, floorThickness: 20 }
    )
  ]
  // A narrow tube per category confines its units into a column so pile height
  // encodes the count and rises to meet the projection bar.
  const tubeTop = area.plot.y - 400
  for (let index = 0; index < categoryCount; index += 1) {
    const centerX = geom.centerX(index)
    for (const side of [-1, 1] as const) {
      colliders.push({
        id: `pile-tube-${index}-${side < 0 ? "l" : "r"}`,
        shape: {
          type: "aabb",
          x: centerX + (side * geom.tubeWidth) / 2,
          y: (tubeTop + floorY) / 2,
          width: 6,
          height: floorY - tubeTop
        }
      })
    }
  }

  return {
    config: baseConfig(seed, colliders, "PhysicsPileChart"),
    initialSpawns: spawns,
    // Rain units in so each tube fills from the bottom without a mouth jam.
    initialSpawnPacing: { pacing: { ratePerSec: 20 } },
    projectionRows: categories.map((category) => ({
      label: category,
      value: rows.get(category) ?? 0
    }))
  }
}

export function buildCollisionSwarmPhysics<TDatum extends Datum>(
  options: CollisionSwarmPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const {
    data,
    xAccessor,
    groupAccessor,
    radiusAccessor,
    pointRadius,
    seed,
    size,
    xExtent,
    collisionIterations,
    settle
  } = options
  const area = physicsChartArea(size)
  const random = seededRandom(seed)
  const rows: Array<{
    datum: TDatum
    index: number
    value: number
    group: string
    radius: number
  }> = []
  const groups: string[] = []
  const groupIndex = new Map<string, number>()

  function indexFor(group: string): number {
    let index = groupIndex.get(group)
    if (index == null) {
      index = groups.length
      groups.push(group)
      groupIndex.set(group, index)
    }
    return index
  }

  data.forEach((datum, index) => {
    const value = finiteNumber(readAccessor(datum, index, xAccessor))
    if (value == null) return
    const group = groupAccessor
      ? String(readAccessor(datum, index, groupAccessor) ?? "All")
      : "All"
    const radiusValue = radiusAccessor
      ? finiteNumber(readAccessor(datum, index, radiusAccessor))
      : null
    const radius = clampNumber(
      radiusValue != null && radiusValue > 0 ? radiusValue : pointRadius,
      2,
      18
    )
    indexFor(group)
    rows.push({ datum, index, value, group, radius })
  })

  const values = rows.map((row) => row.value)
  const extentMin = xExtent ? finiteNumber(xExtent[0]) : null
  const extentMax = xExtent ? finiteNumber(xExtent[1]) : null
  const valueMin = values.length ? Math.min(...values) : 0
  const valueMax = values.length ? Math.max(...values) : 1
  let min = extentMin ?? valueMin
  let max = extentMax ?? valueMax
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  if (min > max) {
    const nextMin = max
    max = min
    min = nextMin
  }

  const maxRadius = Math.max(pointRadius, ...rows.map((row) => row.radius))
  const xRangeStart = area.plot.x + maxRadius + 8
  const xRangeEnd = area.plot.x + area.plot.width - maxRadius - 8
  const xScale = scaleLinear().domain([min, max]).range([xRangeStart, xRangeEnd])
  const groupCount = Math.max(1, groups.length)
  const laneTop = area.plot.y + Math.max(28, maxRadius * 3)
  const laneBottom =
    area.plot.y + area.plot.height - Math.max(28, maxRadius * 3)
  const laneSpan = Math.max(0, laneBottom - laneTop)
  const yForGroup = (group: string): number => {
    const index = groupIndex.get(group) ?? 0
    if (groupCount === 1) return area.plot.y + area.plot.height * 0.54
    return laneTop + (index / (groupCount - 1)) * laneSpan
  }
  const counts = new Map<string, number>()
  const spawns: PhysicsQueuedSpawn[] = rows.map((row, orderedIndex) => {
    counts.set(row.group, (counts.get(row.group) ?? 0) + 1)
    const targetX = xScale(row.value)
    const targetY = yForGroup(row.group)
    const jitterX = (random() - 0.5) * row.radius * 1.6
    const jitterY = (random() - 0.5) * row.radius * 1.6
    const entryOffset = ((orderedIndex % 9) - 4) * row.radius * 2.5
    return {
      id: String((row.datum as Datum).id ?? `collision-swarm-${orderedIndex}`),
      x: settle
        ? targetX + jitterX
        : clampNumber(targetX + entryOffset, xRangeStart, xRangeEnd),
      y: settle
        ? targetY + jitterY
        : area.plot.y - 18 - (orderedIndex % 12) * row.radius,
      vx: settle ? 0 : (random() - 0.5) * 22,
      vy: settle ? 0 : 24 + random() * 18,
      // Constant mass: position (x = value) and size (radius) carry the data.
      // Mass is a neutral process property, never a data channel (dynamics are
      // not perceptually readable as a quantity).
      mass: 1,
      shape: { type: "circle", radius: row.radius },
      datum: {
        ...row.datum,
        xValue: row.value,
        group: row.group,
        radius: row.radius,
        targetX,
        targetY
      },
      springs: [
        {
          target: { type: "point", x: targetX, y: targetY },
          restLength: 0,
          stiffness: 34,
          damping: 5.5
        }
      ]
    }
  })

  const colliders = collidersFromPlotBounds(
    {
      x: area.plot.x,
      y: area.plot.y,
      width: area.plot.width,
      height: area.plot.height
    },
    {
      idPrefix: "collision-swarm",
      includeCeiling: false,
      wallThickness: 20,
      floorThickness: 20
    }
  )

  return {
    config: baseConfig(seed, colliders, "CollisionSwarmChart", {
      gravity: { x: 0, y: 0 },
      cellSize: Math.max(24, maxRadius * 4),
      collisionIterations: Math.max(1, Math.round(collisionIterations ?? 6)),
      velocityDamping: 0.992,
      restitution: 0.02,
      friction: 0.18,
      sleepSpeed: 3,
      sleepAfter: 0.5
    }),
    initialSpawns: spawns,
    projectionRows: groups.map((group) => ({
      label: group,
      value: counts.get(group) ?? 0
    })),
    metadata: {
      kind: "collision-swarm",
      xExtent: [min, max],
      xRange: [xRangeStart, xRangeEnd],
      groups: groups.map((group) => ({
        label: group,
        y: yForGroup(group),
        count: counts.get(group) ?? 0
      })),
      plot: area.plot
    } satisfies CollisionSwarmProjectionMetadata
  }
}

export function buildPhysicalFlowPhysics<
  TNode extends Datum,
  TLink extends Datum
>(options: PhysicalFlowOptions<TNode, TLink>): PhysicsChartLayout {
  const {
    coordinateMode,
    flowSpeed,
    links,
    maxParticles,
    nodeIdAccessor,
    nodeXAccessor,
    nodeYAccessor,
    nodes,
    particleRadius,
    particleRate,
    pathAccessor,
    pathConstraint = "path",
    reducedMotion,
    seed,
    size,
    sourceAccessor,
    targetAccessor,
    throughputAccessor
  } = options
  const area = physicsChartArea(size)
  const random = seededRandom(seed)
  const rawNodePoints = new Map<string, PhysicalFlowPoint>()
  const nodeLabels = new Map<string, string>()
  const rawPoints: PhysicalFlowPoint[] = []

  nodes.forEach((node, index) => {
    const id = String(readAccessor(node, index, nodeIdAccessor) ?? (node as Datum).id ?? index)
    const x = finiteNumber(readAccessor(node, index, nodeXAccessor))
    const y = finiteNumber(readAccessor(node, index, nodeYAccessor))
    if (x != null && y != null) {
      const point = { x, y }
      rawNodePoints.set(id, point)
      rawPoints.push(point)
    }
    nodeLabels.set(
      id,
      String((node as Datum).label ?? (node as Datum).name ?? id)
    )
  })

  type RawRoute = {
    id: string
    link: TLink
    index: number
    source: string
    target: string
    throughput: number
    rawPath: PhysicalFlowPoint[]
  }

  function endpointId(value: unknown): string {
    if (value && typeof value === "object") {
      const record = value as Datum
      if (typeof nodeIdAccessor === "function") {
        const resolved = nodeIdAccessor(record as TNode, 0)
        if (resolved != null) return String(resolved)
      }
      if (typeof nodeIdAccessor === "string" && record[nodeIdAccessor] != null) {
        return String(record[nodeIdAccessor])
      }
      if (record.id != null) return String(record.id)
    }
    return String(value ?? "unknown")
  }

  const rawRoutes: RawRoute[] = []
  links.forEach((link, index) => {
    const source = endpointId(readAccessor(link, index, sourceAccessor))
    const target = endpointId(readAccessor(link, index, targetAccessor))
    const throughput = Math.max(
      0,
      finiteNumber(readAccessor(link, index, throughputAccessor)) ?? 0
    )
    const rawPath = physicalFlowPathFromUnknown(
      pathAccessor ? readAccessor(link, index, pathAccessor) : undefined
    )
    const fallbackPath = rawPath.length
      ? rawPath
      : physicalFlowPathFromUnknown(
          (link as Datum).path ?? (link as Datum).points ?? (link as Datum).route
        )
    fallbackPath.forEach((point) => rawPoints.push(point))
    rawRoutes.push({
      id: String((link as Datum).id ?? `physical-flow-${source}-${target}-${index}`),
      link,
      index,
      source,
      target,
      throughput,
      rawPath: fallbackPath
    })
  })

  const resolvedCoordinateMode = choosePhysicalFlowCoordinateMode(
    coordinateMode,
    rawPoints
  )
  const nodePoints = new Map<string, PhysicalFlowPoint>()
  for (const [id, point] of rawNodePoints) {
    nodePoints.set(id, scalePhysicalFlowPoint(point, area, resolvedCoordinateMode))
  }

  type Route = RawRoute & {
    path: PhysicalFlowPoint[]
    packetCount: number
  }

  const routes: Route[] = []
  for (const route of rawRoutes) {
    let path = route.rawPath.map((point) =>
      scalePhysicalFlowPoint(point, area, resolvedCoordinateMode)
    )

    if (path.length >= 2) {
      if (!nodePoints.has(route.source)) nodePoints.set(route.source, path[0])
      if (!nodePoints.has(route.target)) {
        nodePoints.set(route.target, path[path.length - 1])
      }
    } else {
      const sourcePoint = nodePoints.get(route.source)
      const targetPoint = nodePoints.get(route.target)
      if (sourcePoint && targetPoint) path = [sourcePoint, targetPoint]
    }

    if (path.length < 2 || route.throughput <= 0) continue
    if (!nodeLabels.has(route.source)) nodeLabels.set(route.source, route.source)
    if (!nodeLabels.has(route.target)) nodeLabels.set(route.target, route.target)
    routes.push({ ...route, path, packetCount: 0 })
  }

  const safeParticleRate = positiveNumber(particleRate, 0.12)
  const safeMaxParticles = Math.max(1, Math.round(maxParticles))
  const plannedCounts = routes.map((route) =>
    Math.max(1, Math.round(route.throughput * safeParticleRate))
  )
  const plannedTotal = plannedCounts.reduce((sum, value) => sum + value, 0)
  const countScale =
    plannedTotal > safeMaxParticles ? safeMaxParticles / plannedTotal : 1
  routes.forEach((route, index) => {
    route.packetCount = Math.max(1, Math.floor(plannedCounts[index] * countScale))
  })
  let packetCount = routes.reduce((sum, route) => sum + route.packetCount, 0)
  while (packetCount > safeMaxParticles) {
    const largest = routes.reduce((largestIndex, route, index) => {
      if (route.packetCount <= 1) return largestIndex
      return largestIndex === -1 || route.packetCount > routes[largestIndex].packetCount
        ? index
        : largestIndex
    }, -1)
    if (largest === -1) break
    routes[largest].packetCount -= 1
    packetCount -= 1
  }

  const incoming = new Map<string, number>()
  const outgoing = new Map<string, number>()
  const spawns: PhysicsQueuedSpawn[] = []
  const speed = positiveNumber(flowSpeed, 90)
  const radius = positiveNumber(particleRadius, 4)

  routes.forEach((route, routeIndex) => {
    incoming.set(route.target, (incoming.get(route.target) ?? 0) + route.throughput)
    outgoing.set(route.source, (outgoing.get(route.source) ?? 0) + route.throughput)
    const routeTotalLength = routeLength(route.path)
    for (let packetIndex = 0; packetIndex < route.packetCount; packetIndex += 1) {
      const share = (packetIndex + 0.5) / route.packetCount
      const targetProgress = reducedMotion
        ? share
        : clampNumber(0.12 + share * 0.84 + (random() - 0.5) * 0.04, 0.04, 0.98)
      const startProgress = reducedMotion
        ? targetProgress
        : Math.max(0, targetProgress - (0.18 + random() * 0.12))
      const start = pointAlongRoute(route.path, startProgress)
      const target = pointAlongRoute(route.path, targetProgress)
      const direction = routeDirection(route.path, startProgress)
      const normal = { x: -direction.y, y: direction.x }
      const jitter = (random() - 0.5) * radius * 1.5
      const id = `${route.id}-packet-${packetIndex}`
      spawns.push({
        id,
        x: start.x + normal.x * jitter,
        y: start.y + normal.y * jitter,
        vx: reducedMotion ? 0 : direction.x * speed + (random() - 0.5) * 10,
        vy: reducedMotion ? 0 : direction.y * speed + (random() - 0.5) * 10,
        mass: 0.8,
        spawnAt: reducedMotion ? 0 : routeIndex * 0.04 + packetIndex / 32,
        shape: { type: "circle", radius },
        datum: {
          ...route.link,
          source: route.source,
          target: route.target,
          throughput: route.throughput,
          packetIndex,
          packetCount: route.packetCount,
          routeProgress: targetProgress,
          flowPath: route.path,
          flowPathLength: routeTotalLength,
          flowRouteId: route.id,
          flowSpeed: speed,
          sourceLabel: nodeLabels.get(route.source) ?? route.source,
          targetLabel: nodeLabels.get(route.target) ?? route.target
        },
        springs:
          pathConstraint === "none" || !reducedMotion
            ? undefined
            : [
                {
                  target: { type: "point", x: target.x, y: target.y },
                  restLength: radius * 0.7,
                  stiffness: 26,
                  damping: 4.25
                }
              ]
      })
    }
  })

  const sensorSize = Math.max(18, radius * 5)
  const sensorEntries = Array.from(nodePoints, ([id, point]) => ({
    nodeId: id,
    label: nodeLabels.get(id) ?? id,
    sensorId: `physical-flow-node-${safeIdPart(id)}`,
    point
  }))
  const sensorColliders: PhysicsColliderSpec[] = sensorEntries.map((entry) => ({
    id: entry.sensorId,
    sensor: true,
    shape: {
      type: "aabb",
      x: entry.point.x,
      y: entry.point.y,
      width: sensorSize,
      height: sensorSize
    }
  }))
  const sensors = Object.fromEntries(
    sensorEntries.map((entry) => {
      return [
        entry.sensorId,
        {
          binId: entry.label,
          enterType: "physics-proximity-enter" as const,
          exitType: "physics-proximity-exit" as const
        }
      ]
    })
  )

  const colliders = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      {
        idPrefix: "physical-flow",
        wallThickness: 18,
        floorThickness: 18
      }
    ),
    ...sensorColliders
  ]
  const config = baseConfig(seed, colliders, "PhysicalFlowChart", {
    gravity: { x: 0, y: 0 },
    cellSize: Math.max(24, radius * 7),
    collisionIterations: 3,
    velocityDamping: 0.994,
    restitution: 0.01,
    friction: 0.16,
    sleepSpeed: 2.5,
    sleepAfter: 0.7
  })

  config.bodyLimit = safeMaxParticles
  config.eviction = "oldest"
  config.observation = {
    ...config.observation,
    sensors
  }

  const metadataNodes = Array.from(nodePoints, ([id, point]) => ({
    id,
    label: nodeLabels.get(id) ?? id,
    x: point.x,
    y: point.y,
    sensorId: `physical-flow-node-${safeIdPart(id)}`,
    incoming: incoming.get(id) ?? 0,
    outgoing: outgoing.get(id) ?? 0
  }))
  const metadataLinks = routes.map((route) => ({
    id: route.id,
    source: route.source,
    target: route.target,
    sourceLabel: nodeLabels.get(route.source) ?? route.source,
    targetLabel: nodeLabels.get(route.target) ?? route.target,
    throughput: route.throughput,
    packetCount: route.packetCount,
    path: route.path
  }))

  return {
    config,
    initialSpawns: spawns,
    projectionRows: metadataNodes
      .filter((node) => node.incoming > 0 || node.outgoing > 0)
      .map((node) => ({
        label: node.label,
        value: node.incoming,
        secondary: node.outgoing
      })),
    metadata: {
      kind: "physical-flow",
      coordinateMode: resolvedCoordinateMode,
      particleCount: spawns.length,
      totalThroughput: routes.reduce((sum, route) => sum + route.throughput, 0),
      plot: area.plot,
      nodes: metadataNodes,
      links: metadataLinks
    } satisfies PhysicalFlowProjectionMetadata
  }
}
