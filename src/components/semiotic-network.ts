/**
 * Network entry point — force graphs, sankey, chord, trees, treemaps, circle packing.
 * Import from "semiotic/network" instead of the full bundle to reduce bundle size.
 */

import StreamNetworkFrame from "./stream/StreamNetworkFrame"

export { StreamNetworkFrame }

// Chart HOCs
export { ForceDirectedGraph } from "./charts/network/ForceDirectedGraph"
export { useForceLayout } from "./charts/network/useForceLayout"
export type {
  ForceLayoutStatus,
  UseForceLayoutResult
} from "./charts/network/useForceLayout"
export { SankeyDiagram } from "./charts/network/SankeyDiagram"
export { ChordDiagram } from "./charts/network/ChordDiagram"
export { TreeDiagram } from "./charts/network/TreeDiagram"
export { Treemap } from "./charts/network/Treemap"
export { CirclePack } from "./charts/network/CirclePack"
export { OrbitDiagram } from "./charts/network/OrbitDiagram"
export { ProcessSankey } from "./charts/network/ProcessSankey"
export { NetworkCustomChart } from "./charts/custom/NetworkCustomChart"
export { responsiveRuleMatches, resolveResponsiveRules } from "./charts/shared/responsiveRules"
export type {
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult,
} from "./charts/shared/responsiveRules"
export { useCustomLayoutSelection } from "./stream/customLayoutSelection"
export type { CustomLayoutSelection } from "./stream/customLayoutSelection"
// hitTarget — invisible, interaction-bearing scene node for custom network
// layouts (keyboard nav + focus ring, pointId annotation anchoring,
// onObservation, shared selection). See also semiotic/recipes.
export { networkHitTarget, DEFAULT_HIT_RADIUS } from "./stream/hitTarget"
export type { NetworkHitTargetCircleProps, NetworkHitTargetRectProps } from "./stream/hitTarget"
// glyph — the composite-pictogram scene node for custom network layouts.
export { glyphPlacement, glyphExtent } from "./stream/glyphDef"
export type { GlyphDef, GlyphPart } from "./stream/glyphDef"
export type { NetworkGlyphNode } from "./stream/networkTypes"
export type { SceneAccessibilityMetadata } from "./stream/types"

// Stream Frame types
export type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkChartType,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  ThresholdAlertConfig
} from "./stream/networkTypes"

// Chart prop types
export type { ForceDirectedGraphProps } from "./charts/network/ForceDirectedGraph"
export type { SankeyDiagramProps } from "./charts/network/SankeyDiagram"
export type { ProcessSankeyProps, ProcessSankeyTick } from "./charts/network/ProcessSankey"
export type { ChordDiagramProps } from "./charts/network/ChordDiagram"
export type { TreeDiagramProps } from "./charts/network/TreeDiagram"
export type { TreemapProps } from "./charts/network/Treemap"
export type { CirclePackProps } from "./charts/network/CirclePack"
export type { OrbitDiagramProps } from "./charts/network/OrbitDiagram"
export type { NetworkCustomChartProps } from "./charts/custom/NetworkCustomChart"

// customLayout escape hatch
export type {
  NetworkCustomLayout,
  NetworkLayoutContext,
  NetworkLayoutResult,
  NetworkHtmlMark,
} from "./stream/networkCustomLayout"

// ProcessSankey temporal-validation primitives. External code
// (data pipelines, AI agents constructing graphs, server-side
// validators) can pre-check node/edge sets against the same rules
// the chart enforces — value conservation per node, edge endpoints
// resolve, etc.
export {
  validateProcessSankey,
  formatProcessSankeyIssue,
} from "./charts/network/processSankey/algorithm"
export type {
  ProcessSankeyNode as ProcessSankeyValidatorNode,
  ProcessSankeyEdge as ProcessSankeyValidatorEdge,
  ProcessSankeyIssue,
} from "./charts/network/processSankey/algorithm"
