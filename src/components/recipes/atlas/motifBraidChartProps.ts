import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"
import { atlasLinkedHover, type AtlasChartOptions } from "./atlasChartOptions"
import { prepareMotifBraid } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import type { PreparedNetworkAtlas } from "./types"

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

/** Shared client/static reader contract; atlas analysis precedes rendering. */
export function motifBraidChartProps(
  { atlas, linkedHover, ...props }: MotifBraidChartProps,
  braid = prepareMotifBraid(atlas)
) {
  return {
    ...props,
    linkedHover: atlasLinkedHover(linkedHover),
    title: props.title ?? atlas.spec.dataRevision,
    description:
      props.description ??
      "Motif Braid. Labeled squares show successive journey steps; parallel strands split at diverging prefixes and taper with per-step traffic.",
    summary:
      props.summary ??
      `${braid.groups.length} supported journey groups. Counts use ${atlas.spec.motifs.countUnit}; overlapping motifs do not partition the population. Source revision: ${atlas.provenance.sourceRevision}.`,
    accessibleTable: props.accessibleTable ?? true,
    nodes: braid.sceneSeeds.nodes,
    edges: braid.sceneSeeds.edges,
    layout: motifBraidLayout,
    layoutConfig: { braid }
  }
}
