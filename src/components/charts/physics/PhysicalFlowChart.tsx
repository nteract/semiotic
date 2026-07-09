"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import StreamPhysicsFrame, {
  type PhysicsSemanticItem,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type {
  PhysicsPipelineControlSurface,
  PhysicsPipelineConfig,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildPhysicalFlowPhysics,
  physicsChartArea,
  styleFromColorAccessor,
  type PhysicalFlowCoordinateMode,
  type PhysicalFlowPathConstraint,
  type PhysicalFlowProjectionMetadata,
  type PhysicalFlowRawPath
} from "./physicsChartUtils"
import { usePhysicsHocHandle } from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsChartSize,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"

export interface PhysicalFlowChartProps<
  TNode extends Datum = Datum,
  TLink extends Datum = Datum
> extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  nodes?: TNode[]
  links?: TLink[]
  edges?: TLink[]
  data?: TLink[]
  size?: [number, number]
  nodeIdAccessor?: ChartAccessor<TNode, string>
  nodeXAccessor?: ChartAccessor<TNode, number>
  nodeYAccessor?: ChartAccessor<TNode, number>
  sourceAccessor?: ChartAccessor<TLink, string>
  targetAccessor?: ChartAccessor<TLink, string>
  throughputAccessor?: ChartAccessor<TLink, number>
  pathAccessor?: ChartAccessor<TLink, PhysicalFlowRawPath | undefined>
  coordinateMode?: PhysicalFlowCoordinateMode
  particleRate?: number
  maxParticles?: number
  particleRadius?: number
  flowSpeed?: number
  pathConstraint?: PhysicalFlowPathConstraint
  reducedMotion?: boolean
  showStaticFlow?: boolean
  showNodeLabels?: boolean
  showSensors?: boolean
  colorBy?: ChartAccessor<TLink, string>
  seed?: number
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

function formatThroughput(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function pathD(points: PhysicalFlowProjectionMetadata["links"][number]["path"]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
}

function physicalFlowSemanticItems(
  metadata: PhysicalFlowProjectionMetadata | undefined
): PhysicsSemanticItem[] {
  if (!metadata) return []
  return metadata.links.map((link) => {
    const mid = link.path[Math.floor(link.path.length / 2)] ?? link.path[0]
    const label = `${link.sourceLabel} to ${link.targetLabel}: ${formatThroughput(link.throughput)} throughput, ${link.packetCount} packets`
    return {
      id: link.id,
      label,
      description: label,
      datum: link,
      x: mid?.x ?? 0,
      y: mid?.y ?? 0,
      shape: "path" as const,
      pathData: pathD(link.path),
      group: "flow"
    }
  })
}

type FlowPathPoint = { x: number; y: number }

interface FlowPathProjection {
  distance: number
  point: FlowPathPoint
  progress: number
  tangent: FlowPathPoint
  totalLength: number
}

function finitePoint(value: unknown): FlowPathPoint | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const x = Number(record.x)
  const y = Number(record.y)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function flowPathFromDatum(datum: unknown): FlowPathPoint[] {
  if (!datum || typeof datum !== "object") return []
  const path = (datum as Record<string, unknown>).flowPath
  if (!Array.isArray(path)) return []
  return path
    .map(finitePoint)
    .filter((point): point is FlowPathPoint => point != null)
}

function projectBodyToPath(
  body: PhysicsBodyState,
  path: readonly FlowPathPoint[]
): FlowPathProjection | null {
  if (path.length < 2) return null
  let totalLength = 0
  const lengths: number[] = []
  for (let index = 1; index < path.length; index += 1) {
    const length = Math.hypot(
      path[index].x - path[index - 1].x,
      path[index].y - path[index - 1].y
    )
    lengths.push(length)
    totalLength += length
  }
  if (totalLength <= 0) return null

  let best: FlowPathProjection | null = null
  let traveled = 0
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]
    const current = path[index]
    const segmentLength = lengths[index - 1]
    if (segmentLength <= 0) continue
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    const local = Math.max(
      0,
      Math.min(
        1,
        ((body.x - previous.x) * dx + (body.y - previous.y) * dy) /
          (segmentLength * segmentLength)
      )
    )
    const point = {
      x: previous.x + dx * local,
      y: previous.y + dy * local
    }
    const distance = Math.hypot(body.x - point.x, body.y - point.y)
    const progress = (traveled + local * segmentLength) / totalLength
    const candidate = {
      distance,
      point,
      progress,
      tangent: { x: dx / segmentLength, y: dy / segmentLength },
      totalLength
    }
    if (!best || candidate.distance < best.distance) best = candidate
    traveled += segmentLength
  }
  return best
}

function pointAtProgress(
  path: readonly FlowPathPoint[],
  progress: number,
  totalLength: number
): FlowPathPoint {
  if (path.length === 0) return { x: 0, y: 0 }
  if (path.length === 1 || totalLength <= 0) return { ...path[0] }
  let traveled = 0
  const target = Math.max(0, Math.min(1, progress)) * totalLength
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]
    const current = path[index]
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y)
    if (segmentLength <= 0) continue
    if (traveled + segmentLength >= target) {
      const local = (target - traveled) / segmentLength
      return {
        x: previous.x + (current.x - previous.x) * local,
        y: previous.y + (current.y - previous.y) * local
      }
    }
    traveled += segmentLength
  }
  return { ...path[path.length - 1] }
}

function bodyRadius(body: { shape: PhysicsBodyState["shape"] }): number {
  return body.shape.type === "circle"
    ? body.shape.radius
    : Math.max(body.shape.width, body.shape.height) / 2
}

function clampImpulse(ix: number, iy: number, max: number): [number, number] {
  const magnitude = Math.hypot(ix, iy)
  if (magnitude <= max || magnitude <= 0) return [ix, iy]
  const scale = max / magnitude
  return [ix * scale, iy * scale]
}

function routeOffset(bodyId: string, radius: number): number {
  let hash = 0
  for (let index = 0; index < bodyId.length; index += 1) {
    hash = (hash * 31 + bodyId.charCodeAt(index)) >>> 0
  }
  return ((hash % 1000) / 1000 - 0.5) * radius * 1.4
}

function respawnAtRouteStart(
  body: PhysicsBodyState,
  path: readonly FlowPathPoint[],
  speed: number
): PhysicsQueuedSpawn {
  const projection = projectBodyToPath(
    { ...body, x: path[0].x, y: path[0].y },
    path
  )
  const tangent = projection?.tangent ?? {
    x: path[1].x - path[0].x,
    y: path[1].y - path[0].y
  }
  const tangentLength = Math.hypot(tangent.x, tangent.y) || 1
  const unit = { x: tangent.x / tangentLength, y: tangent.y / tangentLength }
  const radius = bodyRadius(body)
  const offset = routeOffset(body.id, radius)
  const normal = { x: -unit.y, y: unit.x }
  return {
    id: body.id,
    x: path[0].x + normal.x * offset,
    y: path[0].y + normal.y * offset,
    vx: unit.x * speed,
    vy: unit.y * speed,
    mass: body.mass,
    shape: body.shape,
    datum: {
      ...(body.datum && typeof body.datum === "object" ? body.datum : {}),
      routeProgress: 0
    }
  }
}

function steerPhysicalFlowBodies(
  controls: PhysicsPipelineControlSurface,
  fallbackSpeed: number
): void {
  const bodies = controls.readBodies()
  const removeIds: string[] = []
  const respawns: PhysicsQueuedSpawn[] = []

  for (const body of bodies) {
    const path = flowPathFromDatum(body.datum)
    if (path.length < 2) continue
    const projection = projectBodyToPath(body, path)
    if (!projection) continue
    const datum = body.datum as Record<string, unknown> | undefined
    const speedValue = Number(datum?.flowSpeed)
    const speed = Number.isFinite(speedValue) && speedValue > 0
      ? speedValue
      : fallbackSpeed

    if (
      projection.progress >= 0.985 ||
      projection.distance > Math.max(90, bodyRadius(body) * 14)
    ) {
      removeIds.push(body.id)
      respawns.push(respawnAtRouteStart(body, path, speed))
      continue
    }

    const lookaheadProgress = Math.min(
      1,
      projection.progress + Math.max(0.035, Math.min(0.12, speed / projection.totalLength * 0.16))
    )
    const lookahead = pointAtProgress(
      path,
      lookaheadProgress,
      projection.totalLength
    )
    const tangent = projection.tangent
    const desiredVx = tangent.x * speed
    const desiredVy = tangent.y * speed
    const ix =
      (desiredVx - body.vx) * body.mass * 0.16 +
      (lookahead.x - body.x) * body.mass * 0.045 +
      (projection.point.x - body.x) * body.mass * 0.08
    const iy =
      (desiredVy - body.vy) * body.mass * 0.16 +
      (lookahead.y - body.y) * body.mass * 0.045 +
      (projection.point.y - body.y) * body.mass * 0.08
    const [clampedX, clampedY] = clampImpulse(ix, iy, body.mass * speed * 0.35)
    controls.applyImpulse(body.id, clampedX, clampedY)
  }

  if (removeIds.length) controls.remove(removeIds)
  if (respawns.length) controls.pushMany(respawns)
}

function physicalFlowOverlay(
  metadata: PhysicalFlowProjectionMetadata | undefined,
  options: {
    showNodeLabels: boolean
    showSensors: boolean
    showStaticFlow: boolean
  }
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  const { showNodeLabels, showSensors, showStaticFlow } = options
  if (!metadata || (!showStaticFlow && !showSensors)) return undefined

  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 760,
      Number(size[1]) || 420
    ]
    const maxThroughput = Math.max(
      1,
      ...metadata.links.map((link) => link.throughput)
    )
    const sensorById = new Set(metadata.nodes.map((node) => node.sensorId))

    return (
      <svg
        aria-hidden="true"
        data-testid="physical-flow-static-flow-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      >
        {showStaticFlow
          ? metadata.links.map((link) => {
              const strokeWidth = 3 + (link.throughput / maxThroughput) * 16
              const mid = link.path[Math.floor(link.path.length / 2)]
              return (
                <g key={link.id}>
                  <path
                    d={pathD(link.path)}
                    fill="none"
                    stroke="var(--semiotic-border, #d1d5db)"
                    strokeWidth={strokeWidth + 5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.26}
                  />
                  <path
                    d={pathD(link.path)}
                    fill="none"
                    stroke="var(--semiotic-accent, #4e79a7)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.16}
                  />
                  {mid ? (
                    <text
                      x={mid.x}
                      y={mid.y - strokeWidth / 2 - 5}
                      textAnchor="middle"
                      fill="var(--semiotic-text-secondary, #555)"
                      fontSize={10}
                      fontWeight={700}
                    >
                      {formatThroughput(link.throughput)}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}
        {metadata.nodes.map((node) => (
          <g key={node.id}>
            {showSensors && sensorById.has(node.sensorId) ? (
              <rect
                data-testid="physical-flow-sensor-overlay"
                x={node.x - 12}
                y={node.y - 12}
                width={24}
                height={24}
                rx={4}
                fill="none"
                stroke="var(--semiotic-warning, #f59e0b)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                opacity={0.88}
              />
            ) : null}
            {showStaticFlow ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={6}
                fill="var(--semiotic-bg, #fff)"
                stroke="var(--semiotic-text-secondary, #555)"
                strokeWidth={1.2}
              />
            ) : null}
            {showNodeLabels ? (
              <text
                x={node.x}
                y={node.y - 14}
                textAnchor="middle"
                fill="var(--semiotic-text-primary, #111827)"
                fontSize={11}
                fontWeight={800}
              >
                {node.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    )
  }
}

function withPhysicalFlowObservation(
  config: PhysicsPipelineConfig,
  chartId: string | undefined,
  onObservation: BaseChartProps["onObservation"]
): PhysicsPipelineConfig {
  return {
    ...config,
    observation: {
      ...config.observation,
      chartId: chartId ?? config.observation?.chartId ?? "physical-flow",
      chartType: "PhysicalFlowChart",
      onObservation:
        (onObservation as NonNullable<
          PhysicsPipelineConfig["observation"]
        >["onObservation"]) ?? config.observation?.onObservation
    }
  }
}

/**
 * Physics-backed flow chart that sends packet bodies along authored routes while retaining a static throughput layer.
 *
 * @example
 * ```tsx
 * <PhysicalFlowChart
 *   nodes={[{ id: "in", x: 0.1, y: 0.5 }, { id: "out", x: 0.9, y: 0.5 }]}
 *   links={[{ source: "in", target: "out", value: 40 }]}
 *   coordinateMode="normalized"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <PhysicalFlowChart
 *   nodes={ports}
 *   edges={routes}
 *   pathAccessor="path"
 *   maxParticles={120}
 *   showSensors
 * />
 * ```
 */
export const PhysicalFlowChart = forwardRef(function PhysicalFlowChart<
  TNode extends Datum = Datum,
  TLink extends Datum = Datum
>(
  props: PhysicalFlowChartProps<TNode, TLink>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    chartId,
    className,
    colorBy,
    coordinateMode = "auto",
    data,
    edges,
    emptyContent,
    flowSpeed = 90,
    frameProps,
    height,
    links,
    loading,
    loadingContent,
    maxParticles = 180,
    nodeIdAccessor = "id" as ChartAccessor<TNode, string>,
    nodeXAccessor = "x" as ChartAccessor<TNode, number>,
    nodeYAccessor = "y" as ChartAccessor<TNode, number>,
    nodes,
    onObservation,
    particleRadius = 4,
    particleRate = 0.16,
    pathAccessor = "path" as ChartAccessor<TLink, PhysicalFlowRawPath | undefined>,
    pathConstraint = "path",
    paused,
    reducedMotion = false,
    responsiveHeight,
    responsiveWidth,
    seed = 1,
    showNodeLabels = true,
    showSensors = false,
    showStaticFlow = true,
    size,
    sourceAccessor = "source" as ChartAccessor<TLink, string>,
    targetAccessor = "target" as ChartAccessor<TLink, string>,
    throughputAccessor = "value" as ChartAccessor<TLink, number>,
    width
  } = props
  const layoutMode = usePhysicsChartMode(props, [760, 420])
  const {
    chartSize,
    className: modeClassName,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const chartNodes = useMemo(() => nodes ?? [], [nodes])
  const chartLinks = useMemo(
    () => links ?? edges ?? data ?? [],
    [data, edges, links]
  )
  const layout = useMemo(
    () =>
      buildPhysicalFlowPhysics({
        nodes: chartNodes,
        links: chartLinks,
        nodeIdAccessor,
        nodeXAccessor,
        nodeYAccessor,
        sourceAccessor,
        targetAccessor,
        throughputAccessor,
        pathAccessor,
        coordinateMode,
        particleRate,
        maxParticles,
        particleRadius,
        flowSpeed,
        pathConstraint,
        reducedMotion,
        seed,
        size: chartSize
      }),
    [
      chartLinks,
      chartNodes,
      chartSize,
      coordinateMode,
      flowSpeed,
      maxParticles,
      nodeIdAccessor,
      nodeXAccessor,
      nodeYAccessor,
      particleRadius,
      particleRate,
      pathAccessor,
      pathConstraint,
      reducedMotion,
      seed,
      sourceAccessor,
      targetAccessor,
      throughputAccessor
    ]
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildPhysicalFlowPhysics({
        nodes: chartNodes as Datum[],
        links: [datum],
        nodeIdAccessor: nodeIdAccessor as ChartAccessor<Datum, string>,
        nodeXAccessor: nodeXAccessor as ChartAccessor<Datum, number>,
        nodeYAccessor: nodeYAccessor as ChartAccessor<Datum, number>,
        sourceAccessor: sourceAccessor as ChartAccessor<Datum, string>,
        targetAccessor: targetAccessor as ChartAccessor<Datum, string>,
        throughputAccessor: throughputAccessor as ChartAccessor<Datum, number>,
        pathAccessor: pathAccessor as ChartAccessor<
          Datum,
          PhysicalFlowRawPath | undefined
        >,
        coordinateMode,
        particleRate,
        maxParticles,
        particleRadius,
        flowSpeed,
        pathConstraint,
        reducedMotion,
        seed: seed + index + 1,
        size: chartSize
      })
      const fallback = {
        id: String(datum.id ?? `physical-flow-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: particleRadius },
        datum
      }
      const spawns = single.initialSpawns.length
        ? single.initialSpawns
        : [fallback]
      return {
        datumId: String(datum.id ?? spawns[0].id),
        spawns: spawns as PhysicsQueuedSpawn[]
      }
    },
    [
      chartNodes,
      chartSize,
      coordinateMode,
      flowSpeed,
      maxParticles,
      nodeIdAccessor,
      nodeXAccessor,
      nodeYAccessor,
      particleRadius,
      particleRate,
      pathAccessor,
      pathConstraint,
      reducedMotion,
      seed,
      sourceAccessor,
      targetAccessor,
      throughputAccessor
    ]
  )
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: chartLinks as Datum[],
    seedSpawns: layout.initialSpawns
  })

  const resolvedColorBy =
    (colorBy as ChartAccessor<Datum, string> | undefined) ??
    ("source" as ChartAccessor<Datum, string>)
  const bodyStyle = useMemo(
    () => styleFromColorAccessor(resolvedColorBy, "#2563eb"),
    [resolvedColorBy]
  )
  const observedConfig = useMemo(
    () => withPhysicalFlowObservation(layout.config, chartId, onObservation),
    [chartId, layout.config, onObservation]
  )
  const userOnTickRef = useRef(frameProps?.onTick)
  userOnTickRef.current = frameProps?.onTick
  const flowOnTick = useCallback<NonNullable<StreamPhysicsFrameProps["onTick"]>>(
    (result, controls) => {
      if (!reducedMotion && pathConstraint !== "none") {
        steerPhysicalFlowBodies(controls, flowSpeed)
      }
      userOnTickRef.current?.(result, controls)
    },
    [flowSpeed, pathConstraint, reducedMotion]
  )

  const stateEl = renderPhysicsChartState({
    data:
      links == null && edges == null && data == null
        ? undefined
        : chartLinks,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl

  const overlay = physicalFlowOverlay(
    layout.metadata as PhysicalFlowProjectionMetadata | undefined,
    { showNodeLabels, showSensors, showStaticFlow }
  )
  const semanticItems = physicalFlowSemanticItems(
    layout.metadata as PhysicalFlowProjectionMetadata | undefined
  )
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

  return renderPhysicsFrame(
    "PhysicalFlowChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      config={observedConfig}
      continuous={!reducedMotion && pathConstraint !== "none"}
      foregroundGraphics={composePhysicsFrameGraphics(
        overlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      onTick={flowOnTick}
      paused={paused || reducedMotion}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      simulationExecution={
        pathConstraint === "none"
          ? frameProps?.simulationExecution
          : "sync"
      }
      size={chartSize}
      bodyStyle={bodyStyle}
      workerBodyThreshold={frameProps?.workerBodyThreshold ?? Number.POSITIVE_INFINITY}
    />
  )
}) as unknown as {
  <TNode extends Datum = Datum, TLink extends Datum = Datum>(
    props: PhysicalFlowChartProps<TNode, TLink> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

PhysicalFlowChart.displayName = "PhysicalFlowChart"

export default PhysicalFlowChart
