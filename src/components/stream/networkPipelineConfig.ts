/**
 * Build NetworkPipelineConfig from StreamNetworkFrame props + theme.
 * Keeps the large useMemo payload out of the React component file.
 */
import type { SemioticTheme } from "../store/ThemeStore"
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import type { NetworkPipelineConfig } from "./networkTypes"
import type { StreamNetworkFrameProps } from "./networkTypes"

export type NetworkPipelineConfigSources = Pick<
  StreamNetworkFrameProps,
  | "chartType"
  | "nodeIDAccessor"
  | "sourceAccessor"
  | "targetAccessor"
  | "valueAccessor"
  | "edgeIdAccessor"
  | "childrenAccessor"
  | "hierarchySum"
  | "orientation"
  | "nodeAlign"
  | "nodePaddingRatio"
  | "nodeWidth"
  | "iterations"
  | "forceStrength"
  | "padAngle"
  | "groupWidth"
  | "sortGroups"
  | "edgeSort"
  | "treeOrientation"
  | "edgeType"
  | "padding"
  | "paddingTop"
  | "nodeStyle"
  | "edgeStyle"
  | "nodeLabel"
  | "showLabels"
  | "labelMode"
  | "colorBy"
  | "colorScheme"
  | "edgeColorBy"
  | "edgeOpacity"
  | "colorByDepth"
  | "nodeSize"
  | "nodeSizeRange"
  | "decay"
  | "pulse"
  | "transition"
  | "staleness"
  | "thresholds"
  | "orbitMode"
  | "orbitSize"
  | "orbitSpeed"
  | "orbitRevolution"
  | "orbitRevolutionStyle"
  | "orbitEccentricity"
  | "orbitShowRings"
  | "orbitAnimated"
  | "customNetworkLayout"
  | "onLayoutError"
  | "layoutConfig"
> & {
  tensionConfig: NetworkPipelineConfig["tensionConfig"]
  showParticles: boolean
  particleStyle: NetworkPipelineConfig["particleStyle"]
  introAnimation: boolean
  currentTheme: SemioticTheme | null | undefined
}

export function buildNetworkPipelineConfig(
  sources: NetworkPipelineConfigSources
): NetworkPipelineConfig {
  return {
    chartType: sources.chartType,
    nodeIDAccessor: sources.nodeIDAccessor,
    sourceAccessor: sources.sourceAccessor,
    targetAccessor: sources.targetAccessor,
    valueAccessor: sources.valueAccessor,
    edgeIdAccessor: sources.edgeIdAccessor,
    childrenAccessor: sources.childrenAccessor,
    hierarchySum: sources.hierarchySum,
    orientation: sources.orientation,
    nodeAlign: sources.nodeAlign,
    nodePaddingRatio: sources.nodePaddingRatio,
    nodeWidth: sources.nodeWidth,
    iterations: sources.iterations,
    forceStrength: sources.forceStrength,
    padAngle: sources.padAngle,
    groupWidth: sources.groupWidth,
    sortGroups: sources.sortGroups,
    edgeSort: sources.edgeSort,
    treeOrientation: sources.treeOrientation,
    edgeType: sources.edgeType,
    padding: sources.padding,
    paddingTop: sources.paddingTop,
    tensionConfig: sources.tensionConfig,
    showParticles: sources.showParticles,
    particleStyle: sources.particleStyle,
    nodeStyle: sources.nodeStyle,
    edgeStyle: sources.edgeStyle,
    nodeLabel: sources.nodeLabel,
    showLabels: sources.showLabels,
    labelMode: sources.labelMode,
    colorBy: sources.colorBy,
    colorScheme: sources.colorScheme,
    themeCategorical: sources.currentTheme?.colors?.categorical,
    themeSemantic: resolveThemeSemanticColors(sources.currentTheme),
    edgeColorBy: sources.edgeColorBy,
    edgeOpacity: sources.edgeOpacity,
    colorByDepth: sources.colorByDepth,
    nodeSize: sources.nodeSize,
    nodeSizeRange: sources.nodeSizeRange,
    decay: sources.decay,
    pulse: sources.pulse,
    transition: sources.transition,
    introAnimation: sources.introAnimation,
    staleness: sources.staleness,
    thresholds: sources.thresholds,
    orbitMode: sources.orbitMode,
    orbitSize: sources.orbitSize,
    orbitSpeed: sources.orbitSpeed,
    orbitRevolution: sources.orbitRevolution,
    orbitRevolutionStyle: sources.orbitRevolutionStyle,
    orbitEccentricity: sources.orbitEccentricity,
    orbitShowRings: sources.orbitShowRings,
    orbitAnimated: sources.orbitAnimated,
    customNetworkLayout: sources.customNetworkLayout,
    onLayoutError: sources.onLayoutError,
    layoutConfig: sources.layoutConfig
    // layoutSelection intentionally omitted — selection uses a cheap restyle path
  }
}

/** Fields that force re-ingest / re-layout when changed. */
export type NetworkLayoutConfigSignature = Pick<
  NetworkPipelineConfigSources,
  | "chartType"
  | "nodeIDAccessor"
  | "sourceAccessor"
  | "targetAccessor"
  | "valueAccessor"
  | "edgeIdAccessor"
  | "childrenAccessor"
  | "hierarchySum"
  | "orientation"
  | "nodeAlign"
  | "nodePaddingRatio"
  | "nodeWidth"
  | "iterations"
  | "forceStrength"
  | "padAngle"
  | "groupWidth"
  | "sortGroups"
  | "edgeSort"
  | "treeOrientation"
  | "edgeType"
  | "padding"
  | "paddingTop"
  | "tensionConfig"
  | "customNetworkLayout"
> & {
  orbitMode?: NetworkPipelineConfigSources["orbitMode"]
  orbitSize?: NetworkPipelineConfigSources["orbitSize"]
  orbitEccentricity?: NetworkPipelineConfigSources["orbitEccentricity"]
}

export function buildNetworkLayoutConfigSignature(
  sources: NetworkLayoutConfigSignature
): Record<string, unknown> {
  return {
    chartType: sources.chartType,
    nodeIDAccessor: sources.nodeIDAccessor,
    sourceAccessor: sources.sourceAccessor,
    targetAccessor: sources.targetAccessor,
    valueAccessor: sources.valueAccessor,
    edgeIdAccessor: sources.edgeIdAccessor,
    childrenAccessor: sources.childrenAccessor,
    hierarchySum: sources.hierarchySum,
    orientation: sources.orientation,
    nodeAlign: sources.nodeAlign,
    nodePaddingRatio: sources.nodePaddingRatio,
    nodeWidth: sources.nodeWidth,
    iterations: sources.iterations,
    forceStrength: sources.forceStrength,
    padAngle: sources.padAngle,
    groupWidth: sources.groupWidth,
    sortGroups: sources.sortGroups,
    edgeSort: sources.edgeSort,
    treeOrientation: sources.treeOrientation,
    edgeType: sources.edgeType,
    padding: sources.padding,
    paddingTop: sources.paddingTop,
    tensionConfig: sources.tensionConfig,
    customNetworkLayout: sources.customNetworkLayout,
    orbitMode: sources.orbitMode,
    orbitSize: sources.orbitSize,
    orbitEccentricity: sources.orbitEccentricity
  }
}
