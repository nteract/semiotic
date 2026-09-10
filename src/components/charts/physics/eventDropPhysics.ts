import { scaleLinear } from "d3-scale"
import { resolveEventDropAdmissions } from "./eventDropAdmission"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import {
  collidersFromPlotBounds,
  type PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  type PhysicsChartArea,
  type PhysicsChartLayout,
  baseConfig,
  finiteNumber,
  physicsChartArea,
  readAccessor
} from "./physicsChartShared"

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
  /** Visible wall rectangles, derived from the collision geometry (top-left coordinates). */
  windowWalls?: Array<EventDropPlotRegion & { id: string }>
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
  watermark?:
    { delay?: number; value?: number } | ((latestEventTime: number) => number)
  watermarkAtArrivalAccessor?: ChartAccessor<TDatum, number>
  ballRadius: number
  seed: number
  size: [number, number]
  timeExtent?: [number, number]
  timeScale?: number
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
    | "closedWindowCount"
    | "gutter"
    | "windowCount"
    | "windowPlot"
    | "windowSize"
    | "windowStart"
  >,
  lidRightY: number
): EventDropLidSegment[] {
  const closedWindowCount = Math.max(
    0,
    Math.min(metadata.windowCount, metadata.closedWindowCount)
  )
  if (!closedWindowCount) return []

  const domainStart = metadata.windowStart
  const domainEnd =
    metadata.windowStart + metadata.windowCount * metadata.windowSize
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
}) {
  const {
    count,
    idPrefix,
    wallThickness,
    xScale,
    yBottom,
    yTop,
    yTopForIndex
  } = options
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
    watermarkAtArrivalAccessor,
    ballRadius,
    seed,
    size,
    timeExtent,
    timeScale = 1
  } = options
  const { events, watermarkValue } = resolveEventDropAdmissions({
    data,
    timeAccessor,
    arrivalAccessor,
    watermark,
    watermarkAtArrivalAccessor,
    windowSize: windows.size
  })
  const area = physicsChartArea(size)
  const times = events.map((event) => event.eventTime)
  const firstArrival = events.length
    ? Math.min(...events.map((event) => event.arrivalTime))
    : 0
  const extentStart = finiteNumber(timeExtent?.[0])
  const extentEnd = finiteNumber(timeExtent?.[1])
  const dataMinTime = times.length ? Math.min(...times) : 0
  const dataMaxTime = times.length
    ? Math.max(...times)
    : dataMinTime + windows.size
  const minTime = Math.min(extentStart ?? dataMinTime, dataMinTime)
  const maxTime = Math.max(extentEnd ?? dataMaxTime, dataMaxTime)
  const windowStart = Math.floor(minTime / windows.size) * windows.size
  const windowCount = Math.max(
    1,
    Math.ceil((maxTime - windowStart + windows.size) / windows.size)
  )
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

  events.forEach(
    ({ datum, index, eventTime, arrivalTime, watermarkAtArrival, late }) => {
      const windowIndex = Math.max(
        0,
        Math.min(
          windowCount - 1,
          Math.floor((eventTime - windowStart) / windows.size)
        )
      )
      rows[windowIndex].value += late ? 0 : 1
      rows[windowIndex].secondary += late ? 1 : 0
      spawns.push({
        id: String((datum as Datum).id ?? `event-${index}`),
        x: eventDropSpawnX(
          eventTime,
          windowIndex,
          late,
          {
            windowStart,
            windowSize: windows.size,
            gutter: geometry.gutter,
            closedWindowCount,
            windowPlot: geometry.windowPlot,
            windowCount
          },
          ballRadius
        ),
        y: area.plot.y + ballRadius + 2,
        vx: 0,
        vy: 0,
        mass: 1,
        friction: 0.02,
        spawnAt: arrivalTime,
        shape: { type: "circle", radius: ballRadius },
        datum: {
          ...datum,
          eventTime,
          arrivalTime,
          windowIndex,
          watermarkAtArrival,
          late
        }
      })
    }
  )

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
  // This layout describes the CURRENT board. Previously accepted history
  // belongs beneath its closed lids; it must never fall through those lids.
  // A chronological replay supplies each earlier board before advancing it.
  for (const spawn of spawns) {
    const datum = spawn.datum as { late: boolean; windowIndex: number }
    spawn.y = eventDropSpawnY(
      { ...metadataBase, lidSegments },
      datum.windowIndex,
      datum.late,
      ballRadius
    )
  }
  const lidYAtBoundary = (index: number) => {
    if (index < 0 || index > closedWindowCount) return null
    const y =
      index === 0
        ? lidSegments[0]?.y1
        : (lidSegments[index - 1]?.y2 ?? lidSegments[index]?.y1)
    return typeof y === "number" && Number.isFinite(y) ? y : null
  }
  const windowWalls = eventDropWindowWallColliders({
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
  })
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
    ...windowWalls,
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
      timeAccessor: (spawn) => {
        const datum = spawn.datum as {
          arrivalTime: number
          windowIndex: number
          late: boolean
        }
        // History that the current apparatus cannot admit is already present.
        const closed = datum.windowIndex < closedWindowCount
        const history = (closed && !datum.late) || (!closed && datum.late)
        return history ? firstArrival : datum.arrivalTime
      },
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
      windowWalls: windowWalls.map(({ id, shape }) => ({
        id,
        x: shape.x - shape.width / 2,
        y: shape.y - shape.height / 2,
        width: shape.width,
        height: shape.height
      })),
      watermarkValue,
      windowCount,
      windowSize: windows.size,
      windowStart
    } satisfies EventDropProjectionMetadata
  }
}

function eventDropSpawnY(
  metadata: Pick<EventDropProjectionMetadata, "windowPlot" | "lidSegments">,
  windowIndex: number,
  late: boolean,
  radius: number
): number {
  const { windowPlot, lidSegments } = metadata
  const lid = lidSegments[windowIndex]
  // A recorded rejection can outlive the board that caused it (for example,
  // after a policy rewind). Place that history directly inside the late bin.
  if (late && !lid)
    return Math.min(
      windowPlot.y + windowPlot.height - radius,
      windowPlot.y + windowPlot.height * 0.48 + radius * 2 + 4
    )
  return !late && lid
    ? Math.min(
        windowPlot.y + windowPlot.height - radius,
        Math.max(lid.y1, lid.y2) + radius * 2 + 4
      )
    : windowPlot.y + radius + 2
}

/**
 * Classify body centers using the matching board geometry, independently of
 * source admission labels. Occupants can still be moving. Only supplied,
 * materialized bodies are counted; queued arrivals are not included.
 */
export function readEventDropOccupancy(
  metadata: EventDropProjectionMetadata,
  bodies: readonly { x: number; y: number }[]
): { accepted: number[]; late: number; inFlight: number; total: number } {
  const { windowPlot, gutter, windowCount, lidSegments } = metadata
  const accepted = Array<number>(windowCount).fill(0)
  const bottom = windowPlot.y + windowPlot.height
  const openTop = windowPlot.y + windowPlot.height * 0.48
  let late = 0
  let inFlight = 0
  for (const body of bodies) {
    if (
      body.x >= gutter.x &&
      body.x < windowPlot.x &&
      body.y >= (lidSegments[0]?.y1 ?? openTop) &&
      body.y <= bottom
    ) {
      late++
      continue
    }
    const index = Math.floor(
      ((body.x - windowPlot.x) / windowPlot.width) * windowCount
    )
    const lid = lidSegments[index]
    const top = lid ? Math.max(lid.y1, lid.y2) : openTop
    if (index >= 0 && index < windowCount && body.y >= top && body.y <= bottom)
      accepted[index]++
    else inFlight++
  }
  return { accepted, late, inFlight, total: bodies.length }
}

function eventDropSpawnX(
  eventTime: number,
  windowIndex: number,
  late: boolean,
  metadata: Pick<
    EventDropProjectionMetadata,
    | "windowPlot"
    | "windowStart"
    | "windowCount"
    | "windowSize"
    | "gutter"
    | "closedWindowCount"
  >,
  ballRadius: number
): number {
  const { windowPlot, windowCount, windowStart, windowSize } = metadata
  if (late && windowIndex >= metadata.closedWindowCount)
    return metadata.gutter.x + metadata.gutter.width / 2
  const laneWidth = windowPlot.width / windowCount
  const left = late ? windowPlot.x : windowPlot.x + windowIndex * laneWidth
  const right = late ? windowPlot.x + windowPlot.width : left + laneWidth
  const inset = Math.min((right - left) / 2, ballRadius + (late ? 0 : 3))
  const x = windowPlot.x + ((eventTime - windowStart) / windowSize) * laneWidth
  return Math.max(left + inset, Math.min(right - inset, x))
}

/**
 * Place a single event onto an already-mounted EventDropChart using the live
 * board's domain (window layout + current watermark) so a pushed arrival drops
 * over its true event-time x instead of the center of a one-event mini-domain.
 * Closed-window lids divert new arrivals. Recorded history that the current
 * board cannot admit starts inside its destination container.
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
    watermarkAtArrivalAccessor?: ChartAccessor<TDatum, number>
    ballRadius: number
  }
): PhysicsQueuedSpawn | null {
  const eventTime = finiteNumber(
    readAccessor(datum, index, options.timeAccessor)
  )
  if (eventTime == null) return null
  const arrivalTime =
    finiteNumber(readAccessor(datum, index, options.arrivalAccessor)) ??
    eventTime
  const { windowStart, windowCount, windowSize, watermarkValue } = metadata
  const windowIndex = Math.max(
    0,
    Math.min(
      windowCount - 1,
      Math.floor((eventTime - windowStart) / windowSize)
    )
  )
  const windowEnd = windowStart + (windowIndex + 1) * windowSize
  const watermarkAtArrival = options.watermarkAtArrivalAccessor
    ? (finiteNumber(
        readAccessor(datum, index, options.watermarkAtArrivalAccessor)
      ) ?? watermarkValue)
    : watermarkValue
  const late = windowEnd <= watermarkAtArrival
  const { ballRadius } = options
  return {
    id: String((datum as Datum).id ?? `event-push-${index}`),
    x: eventDropSpawnX(eventTime, windowIndex, late, metadata, ballRadius),
    y: eventDropSpawnY(metadata, windowIndex, late, ballRadius),
    vx: 0,
    vy: 0,
    mass: 1,
    friction: 0.02,
    shape: { type: "circle", radius: ballRadius },
    datum: {
      ...datum,
      eventTime,
      arrivalTime,
      windowIndex,
      watermarkAtArrival,
      late
    }
  }
}
