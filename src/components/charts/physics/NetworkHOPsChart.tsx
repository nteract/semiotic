"use client"

import * as React from "react"
import { forwardRef, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import { ForceDirectedGraph, type ForceDirectedGraphProps } from "../network/ForceDirectedGraph"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import {
  buildNetworkHOPsModel,
  networkHOPsEdgeId,
  NETWORK_HOPS_EDGE_ID,
  NETWORK_HOPS_PROBABILITY,
  type NetworkHOPsModel,
  type NetworkHOPsSample
} from "./networkHopsUtils"

export type { NetworkHOPsModel, NetworkHOPsSample } from "./networkHopsUtils"

export interface NetworkHOPsChartProps<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
> extends Omit<
    ForceDirectedGraphProps<TNode, TEdge>,
    "edges" | "edgeOpacity" | "edgeWidth" | "forceStrength" | "frameProps" | "nodes"
  > {
  nodes?: TNode[]
  edges?: TEdge[]
  samples?: NetworkHOPsSample<TNode, TEdge>[]
  size?: [number, number]
  edgeProbabilityAccessor?: ChartAccessor<TEdge, number>
  sampleIndex?: number
  sampleRate?: number
  paused?: boolean
  seed?: number
  anchoringStrength?: number
  showAggregate?: boolean
  showSampleReadout?: boolean
  activeEdgeColor?: string
  activeEdgeOpacity?: number
  aggregateEdgeColor?: string
  aggregateEdgeOpacity?: number
  aggregateEdgeWidth?: number
  edgeWidth?: number | ChartAccessor<TEdge, number>
  frameProps?: Partial<
    Omit<StreamNetworkFrameProps, "edges" | "nodes" | "size">
  >
}

function positiveNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function resolveEdgeWidth<TEdge extends Datum>(
  edge: TEdge,
  edgeWidth: number | ChartAccessor<TEdge, number> | undefined
): number {
  if (typeof edgeWidth === "number") return edgeWidth
  if (typeof edgeWidth === "function") {
    const value = edgeWidth(edge, 0)
    return positiveNumber(value, 2)
  }
  if (typeof edgeWidth === "string") {
    return positiveNumber(edge[edgeWidth], 2)
  }
  return 2
}

function composeGraphics(a: ReactNode, b: ReactNode): ReactNode {
  if (!a) return b
  if (!b) return a
  return (
    <>
      {a}
      {b}
    </>
  )
}

function sampleReadout(
  enabled: boolean,
  size: [number, number],
  sampleLabel: string,
  rows: Array<{ label: string; value: number; secondary?: number }>
): ReactNode {
  if (!enabled) return null
  const [width] = size
  return (
    <svg
      aria-hidden="true"
      data-testid="network-hops-sample-readout"
      width={width}
      height={48}
      viewBox={`0 0 ${width} 48`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none"
      }}
    >
      <rect
        x={12}
        y={10}
        width={Math.min(360, width - 24)}
        height={28}
        rx={6}
        fill="var(--semiotic-bg, #fff)"
        fillOpacity={0.82}
        stroke="var(--semiotic-border, #d1d5db)"
      />
      <text
        x={24}
        y={29}
        fill="var(--semiotic-text-primary, #111827)"
        fontSize={12}
        fontWeight={800}
      >
        {sampleLabel}
      </text>
      {rows.slice(0, 2).map((row, index) => (
        <text
          key={row.label}
          x={132 + index * 104}
          y={29}
          fill="var(--semiotic-text-secondary, #555)"
          fontSize={11}
        >
          {row.label}: {row.value}
        </text>
      ))}
    </svg>
  )
}

/**
 * Physics-backed network HOPs chart that animates sampled or probabilistic edges around anchored nodes.
 *
 * @example
 * ```tsx
 * <NetworkHOPsChart
 *   nodes={[{ id: "a", x: 0.2, y: 0.4 }, { id: "b", x: 0.8, y: 0.5 }]}
 *   edges={[{ source: "a", target: "b", p: 0.42 }]}
 *   edgeProbabilityAccessor="p"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <NetworkHOPsChart
 *   nodes={nodes}
 *   edges={edges}
 *   sampleRate={0.2}
 *   showAggregate
 *   showSampleReadout
 * />
 * ```
 */
export const NetworkHOPsChart = forwardRef(function NetworkHOPsChart<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
>(
  props: NetworkHOPsChartProps<TNode, TEdge>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    activeEdgeColor,
    activeEdgeOpacity = 0.88,
    aggregateEdgeColor = "#94a3b8",
    aggregateEdgeOpacity = 0.18,
    aggregateEdgeWidth = 1,
    anchoringStrength = 0.14,
    edgeProbabilityAccessor = "p" as ChartAccessor<TEdge, number>,
    edges,
    edgeWidth,
    frameProps,
    height,
    iterations = 300,
    nodeIdAccessor = "id" as ChartAccessor<TNode, string>,
    nodeIDAccessor,
    nodes,
    paused = false,
    sampleIndex,
    sampleRate = 1,
    samples,
    seed = 1,
    showAggregate = true,
    showSampleReadout = true,
    size,
    sourceAccessor = "source" as ChartAccessor<TEdge, string>,
    targetAccessor = "target" as ChartAccessor<TEdge, string>,
    width,
    ...rest
  } = props
  const [internalSampleIndex, setInternalSampleIndex] = useState(0)
  const chartSize: [number, number] = [
    size?.[0] ?? width ?? 700,
    size?.[1] ?? height ?? 460
  ]
  const resolvedSampleIndex = sampleIndex ?? internalSampleIndex
  const hasAnimatedDomain = (samples?.length ?? 0) > 1 || (edges?.length ?? 0) > 0

  useEffect(() => {
    if (sampleIndex != null || paused || !hasAnimatedDomain) return
    const intervalMs = Math.max(120, 1000 / positiveNumber(sampleRate, 1))
    const timer = window.setInterval(() => {
      setInternalSampleIndex((current) => current + 1)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [hasAnimatedDomain, paused, sampleIndex, sampleRate])

  const userEdgeStyle = frameProps?.edgeStyle
  const model = useMemo<NetworkHOPsModel>(
    () =>
      buildNetworkHOPsModel({
        nodes,
        edges,
        samples,
        nodeIdAccessor,
        sourceAccessor,
        targetAccessor,
        edgeProbabilityAccessor,
        sampleIndex: resolvedSampleIndex,
        seed
      }),
    [
      edgeProbabilityAccessor,
      edges,
      nodeIdAccessor,
      nodes,
      resolvedSampleIndex,
      samples,
      seed,
      sourceAccessor,
      targetAccessor
    ]
  )

  const edgeStyle = useMemo(
    () => (edgeDatum: Datum) => {
      const edge = ((edgeDatum.data as Datum | undefined) ?? edgeDatum) as TEdge
      const id = String(
        edge[NETWORK_HOPS_EDGE_ID] ??
          networkHOPsEdgeId(edge, 0, sourceAccessor, targetAccessor)
      )
      const active = model.activeEdgeIds.has(id)
      const probability = positiveNumber(edge[NETWORK_HOPS_PROBABILITY], 0)
      const base =
        typeof userEdgeStyle === "function" ? userEdgeStyle(edgeDatum) : {}
      return {
        ...base,
        stroke: active ? activeEdgeColor ?? rest.edgeColor ?? "#2563eb" : aggregateEdgeColor,
        strokeWidth: active ? resolveEdgeWidth(edge, edgeWidth) : aggregateEdgeWidth,
        opacity: active
          ? activeEdgeOpacity
          : showAggregate
            ? Math.max(0.025, aggregateEdgeOpacity * probability)
            : 0
      }
    },
    [
      activeEdgeColor,
      activeEdgeOpacity,
      aggregateEdgeColor,
      aggregateEdgeOpacity,
      aggregateEdgeWidth,
      edgeWidth,
      model.activeEdgeIds,
      rest.edgeColor,
      showAggregate,
      sourceAccessor,
      targetAccessor,
      userEdgeStyle
    ]
  )

  const readout = sampleReadout(
    showSampleReadout,
    chartSize,
    model.sampleLabel,
    model.projectionRows
  )
  const resolvedFrameProps = useMemo(
    () => ({
      ...frameProps,
      edgeStyle,
      foregroundGraphics: composeGraphics(
        readout,
        frameProps?.foregroundGraphics
      )
    }),
    [edgeStyle, frameProps, readout]
  )

  return (
    <ForceDirectedGraph
      {...rest}
      ref={ref}
      nodes={model.nodes as TNode[]}
      edges={model.aggregateEdges as TEdge[]}
      width={chartSize[0]}
      height={chartSize[1]}
      nodeIdAccessor={nodeIdAccessor}
      nodeIDAccessor={nodeIDAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      iterations={iterations}
      forceStrength={anchoringStrength}
      edgeOpacity={1}
      edgeWidth={1}
      title={props.title ?? "Network hypothetical outcome plot"}
      frameProps={resolvedFrameProps}
    />
  )
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(
    props: NetworkHOPsChartProps<TNode, TEdge> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

NetworkHOPsChart.displayName = "NetworkHOPsChart"

export default NetworkHOPsChart
