import {
  dependencyForestLayout,
  type DependencyForestLayoutConfig
} from "./dependencyForestLayout"
import { atlasLinkedHover, type AtlasChartOptions } from "./atlasChartOptions"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"

export type DependencyForestChartProps = DependencyForestLayoutConfig &
  AtlasChartOptions & {
    width?: number
    height?: number
    annotations?: NetworkCustomChartProps["annotations"]
    frameProps?: NetworkCustomChartProps["frameProps"]
    linkedSelection?: Pick<NonNullable<NetworkCustomChartProps["selection"]>, "name">
    onSelectNode?: (id: string) => void
  }

/** Shared props for the recipe-local React wrapper and the public SVG renderer. */
export function dependencyForestChartProps({
  width = 920,
  height = 440,
  title = "Dependency X-Ray",
  description,
  summary,
  accessibleTable = true,
  chartId,
  className,
  onObservation,
  linkedHover,
  linkedSelection,
  annotations,
  frameProps,
  onSelectNode: _onSelectNode,
  ...config
}: DependencyForestChartProps) {
  return {
    nodes: config.forest.sceneSeeds.nodes,
    edges: config.forest.sceneSeeds.edges,
    layout: dependencyForestLayout,
    layoutConfig: config,
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    width,
    height,
    title,
    chartId,
    className,
    onObservation,
    linkedHover: atlasLinkedHover(linkedHover),
    selection: linkedSelection,
    annotations,
    frameProps,
    animate: false as const,
    margin: { top: 12, right: 24, bottom: 12, left: 12 },
    description:
      description ??
      `Sections organize the admitted directed graph. Backbone links organize the drawing; residual links retain other original edges. Brackets describe required paths, separately from transport. Roots: ${config.forest.atlas.requiredPaths?.roots.join(", ") ?? "not declared"}. Relation scope: directed-admitted. Completeness: ${config.forest.atlas.requiredPaths?.status ?? "not prepared"}.`,
    summary:
      summary ??
      `Roots: ${config.forest.atlas.requiredPaths?.roots.join(", ") ?? "not declared"}. Relation scope: directed-admitted. Required-path completeness: ${config.forest.atlas.requiredPaths?.status ?? "not prepared"}. ${config.forest.residual.originalEdgeIds.length} original edges retained.`,
    accessibleTable
  }
}
