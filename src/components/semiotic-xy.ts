/**
 * XY entry point — line, area, scatter, heatmap, and bubble charts.
 * Import from "semiotic/xy" instead of the full bundle to reduce bundle size.
 */

import StreamXYFrame from "./stream/StreamXYFrame"

export { StreamXYFrame }

// Chart HOCs
export { LineChart } from "./charts/xy/LineChart"
export { AreaChart } from "./charts/xy/AreaChart"
export { DifferenceChart } from "./charts/xy/DifferenceChart"
export { StackedAreaChart } from "./charts/xy/StackedAreaChart"
export { Scatterplot } from "./charts/xy/Scatterplot"
export { ConnectedScatterplot } from "./charts/xy/ConnectedScatterplot"
export { BubbleChart } from "./charts/xy/BubbleChart"
export { Heatmap } from "./charts/xy/Heatmap"
export { ScatterplotMatrix } from "./charts/xy/ScatterplotMatrix"
export { MinimapChart } from "./charts/xy/MinimapChart"
export { QuadrantChart } from "./charts/xy/QuadrantChart"
export { MultiAxisLineChart } from "./charts/xy/MultiAxisLineChart"
export { CandlestickChart } from "./charts/xy/CandlestickChart"
export { XYCustomChart } from "./charts/custom/XYCustomChart"
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
export type {
  CustomLayoutFailureDiagnostic,
  CustomLayoutFailureRecovery,
  CustomLayoutFamily
} from "./stream/customLayoutFailure"
// hitTarget — invisible, interaction-bearing scene nodes for custom layouts
// (keyboard nav + focus ring, pointId annotation anchoring, onObservation,
// transition identity). See also semiotic/recipes.
export { hitTargetPoint, hitTargetRect, DEFAULT_HIT_RADIUS } from "./stream/hitTarget"
export type { HitTargetPointProps, HitTargetRectProps } from "./stream/hitTarget"
// glyph — the composite-pictogram scene node for custom layouts.
export { glyphPlacement, glyphExtent } from "./stream/glyphDef"
export type { GlyphDef, GlyphPart } from "./stream/glyphDef"
export type { GlyphSceneNode, SceneAccessibilityMetadata } from "./stream/types"
export type {
  CategoricalLegendConfig,
  GradientLegendConfig,
  GradientLegendValue,
  LegendGroup,
  LegendItem,
  LegendLayout,
  LegendValue,
} from "./types/legendTypes"

// Stream Frame types
export type {
  StreamXYFrameProps,
  StreamXYFrameHandle
} from "./stream/types"

// customLayout escape hatch
export type {
  CustomLayout,
  LayoutContext,
  LayoutResult
} from "./stream/customLayout"

// Chart prop types
export type { LineChartProps } from "./charts/xy/LineChart"
export type { AreaChartProps, SemanticGradientStop } from "./charts/xy/AreaChart"
export type { DifferenceChartProps } from "./charts/xy/DifferenceChart"
export type { StackedAreaChartProps } from "./charts/xy/StackedAreaChart"
export type { ScatterplotProps } from "./charts/xy/Scatterplot"
export type { ConnectedScatterplotProps } from "./charts/xy/ConnectedScatterplot"
export type { BubbleChartProps } from "./charts/xy/BubbleChart"
export type { HeatmapProps } from "./charts/xy/Heatmap"
export type { QuadrantChartProps, QuadrantsConfig, QuadrantsConfigOverride, QuadrantConfig, CenterlineStyle } from "./charts/xy/QuadrantChart"
export type { MultiAxisLineChartProps } from "./charts/xy/MultiAxisLineChart"
export type { CandlestickChartProps } from "./charts/xy/CandlestickChart"
export type { XYCustomChartProps } from "./charts/custom/XYCustomChart"

// Declarative threshold-aware style rules (Scatterplot/LineChart/AreaChart… `styleRules`) + hatch fills.
export { resolveStyleRules, matchesThreshold, ruleMatches, makeRuleValueResolver, makeXYRuleContext, composeStyleRules } from "./charts/shared/styleRules"
export type { StyleRule, StyleRuleStyle, StyleRuleThreshold, StyleRuleContext, StyleRulePredicate } from "./charts/shared/styleRules"
export { isHatchFill, hatchPatternDef, resolveSvgFill, hatchFillId } from "./charts/shared/hatchFill"
export type { HatchFill } from "./charts/shared/hatchFill"
