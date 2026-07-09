import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import {
  collidersFromPlotBounds,
  type PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  type PhysicsChartArea,
  type PhysicsChartLayout,
  baseConfig,
  clampNumber,
  finiteNumber,
  physicsChartArea,
  positiveNumber,
  readAccessor,
  safeIdPart,
  seededRandom
} from "./physicsChartShared"

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
