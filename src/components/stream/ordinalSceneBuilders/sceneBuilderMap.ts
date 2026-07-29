/**
 * chartType → pure scene builder dispatch for OrdinalPipelineStore.
 */

import { buildBarScene, buildClusterBarScene } from "./barScene"
import { buildPointScene, buildSwarmScene } from "./pointScene"
import { buildPieScene } from "./pieScene"
import {
  buildBoxplotScene,
  buildViolinScene,
  buildHistogramScene,
  buildRidgelineScene
} from "./statisticalScene"
import { buildTimelineScene } from "./timelineScene"
import { buildFunnelScene } from "./funnelScene"
import { buildBarFunnelScene } from "./barFunnelScene"
import { buildSwimlaneScene } from "./swimlaneScene"
import type { SceneBuilderFn } from "./types"
import type { OrdinalChartType } from "../ordinalTypes"

// "custom" isn't listed — XYCustomChart/OrdinalCustomChart charts build their
// scene via a user-supplied layout function instead of a registry lookup.
export const ORDINAL_SCENE_BUILDERS: Partial<Record<OrdinalChartType, SceneBuilderFn>> = {
  bar: buildBarScene,
  clusterbar: buildClusterBarScene,
  point: buildPointScene,
  swarm: buildSwarmScene,
  pie: buildPieScene,
  donut: buildPieScene,
  boxplot: buildBoxplotScene,
  violin: buildViolinScene,
  histogram: buildHistogramScene,
  ridgeline: buildRidgelineScene,
  timeline: buildTimelineScene,
  funnel: buildFunnelScene,
  "bar-funnel": buildBarFunnelScene,
  swimlane: buildSwimlaneScene
}
