import {
  dependencyForestLayout,
  type DependencyForestLayoutConfig
} from "./dependencyForestLayout"

export type DependencyForestChartProps = DependencyForestLayoutConfig & {
  width?: number
  height?: number
  title?: string
  onSelectNode?: (id: string) => void
}

/** Shared props for the recipe-local React wrapper and the public SVG renderer. */
export function dependencyForestChartProps({
  width = 920,
  height = 440,
  title = "Dependency X-Ray",
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
    animate: false as const,
    margin: { top: 12, right: 24, bottom: 12, left: 12 },
    description: `Sections organize the admitted directed graph. Gray links form the display backbone; rust links retain other original edges. Blue brackets describe required paths, separately from transport. Roots: ${config.forest.atlas.requiredPaths?.roots.join(", ") ?? "not declared"}. Relation scope: directed-admitted. Completeness: ${config.forest.atlas.requiredPaths?.status ?? "not prepared"}.`,
    summary: `Roots: ${config.forest.atlas.requiredPaths?.roots.join(", ") ?? "not declared"}. Relation scope: directed-admitted. Required-path completeness: ${config.forest.atlas.requiredPaths?.status ?? "not prepared"}. ${config.forest.residual.originalEdgeIds.length} original edges retained.`,
    accessibleTable: true
  }
}
