"use client"
import { useMemo } from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"
import { prepareMotifBraid } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import type { PreparedNetworkAtlas } from "./types"
import { atlasLinkedHover, type AtlasChartOptions } from "./atlasChartOptions"

export type MotifBraidChartProps = AtlasChartOptions & {
  atlas: PreparedNetworkAtlas
  width?: number
  height?: number
  colorScheme?: NetworkCustomChartProps["colorScheme"]
  selection?: NetworkCustomChartProps["selection"]
  onClick?: NetworkCustomChartProps["onClick"]
  annotations?: NetworkCustomChartProps["annotations"]
  frameProps?: NetworkCustomChartProps["frameProps"]
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
  height,
  accessibleTable = true,
  linkedHover,
  ...chartOptions
}: MotifBraidChartProps) {
  const braid = useMemo(() => prepareMotifBraid(atlas), [atlas])
  return (
    <NetworkCustomChart
      {...chartOptions}
      linkedHover={atlasLinkedHover(linkedHover)}
      width={width}
      height={height}
      title={title ?? atlas.spec.dataRevision}
      description={
        description ??
        "Motif Braid. Labeled squares show successive journey steps; parallel strands split at diverging prefixes and taper with per-step traffic."
      }
      summary={
        summary ??
        `${braid.groups.length} supported journey groups. Counts use ${atlas.spec.motifs.countUnit}; overlapping motifs do not partition the population. Source revision: ${atlas.provenance.sourceRevision}.`
      }
      accessibleTable={accessibleTable}
      nodes={braid.sceneSeeds.nodes}
      edges={braid.sceneSeeds.edges}
      layout={motifBraidLayout}
      layoutConfig={{ braid }}
      colorScheme={colorScheme}
    />
  )
}
