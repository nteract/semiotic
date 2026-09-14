/**
 * Build NetworkPipelineConfig from StreamNetworkFrame props + theme.
 * Keeps the large useMemo payload out of the React component file.
 */
import type { SemioticTheme } from "../store/themeCore"
import { resolveThemeSemanticColors } from "../store/themeCore"
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
  | "clock"
  | "random"
  | "seed"
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
  // The frame supplies exactly this typed config slice. Only the theme needs
  // projection; layoutSelection stays in its dedicated restyle effect.
  const { currentTheme, ...config } = sources
  return {
    ...config,
    themeCategorical: currentTheme?.colors?.categorical,
    themeSemantic: resolveThemeSemanticColors(currentTheme)
  }
}
