"use client"
import { useMemo } from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"
import { prepareMotifBraid } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import type { PreparedNetworkAtlas } from "./types"

export type MotifBraidChartProps = {
  atlas: PreparedNetworkAtlas
  width?: number
  height?: number
  colorScheme?: NetworkCustomChartProps["colorScheme"]
  title?: string
  description?: string
  summary?: string
}

/**
 * Motif Braid reader. Prepare the atlas outside this component.
 * Not a public export in Phase 2 — use as a recipe-local chart.
 */
export function MotifBraidChart({
  atlas,
  colorScheme,
  title,
  description,
  summary,
  width,
  height
}: MotifBraidChartProps) {
  const braid = useMemo(() => prepareMotifBraid(atlas), [atlas])
  return (
    <NetworkCustomChart
      width={width}
      height={height}
      title={title ?? atlas.spec.dataRevision}
      description={
        description ??
        "Synthetic Motif Braid. Labeled squares show successive journey steps; parallel strands split at diverging prefixes and taper with per-step traffic."
      }
      summary={summary}
      nodes={braid.sceneSeeds.nodes}
      edges={braid.sceneSeeds.edges}
      layout={motifBraidLayout}
      layoutConfig={{ braid }}
      colorScheme={colorScheme}
    />
  )
}
