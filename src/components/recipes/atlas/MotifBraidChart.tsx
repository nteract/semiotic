"use client"
import { useMemo } from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"
import { prepareMotifBraid } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import type { PreparedNetworkAtlas } from "./types"

export type MotifBraidChartProps = {
  atlas: PreparedNetworkAtlas
  expandedCapsuleIds?: string[]
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
  expandedCapsuleIds,
  colorScheme,
  title,
  description,
  summary,
  width,
  height
}: MotifBraidChartProps) {
  const braid = useMemo(
    () => prepareMotifBraid(atlas, { expandedCapsuleIds }),
    [atlas, expandedCapsuleIds]
  )
  return (
    <NetworkCustomChart
      width={width}
      height={height}
      title={title ?? atlas.spec.dataRevision}
      description={
        description ??
        "Synthetic Motif Braid. Stepped dendrogram of journey types; stroke width is per-path magnitude."
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
