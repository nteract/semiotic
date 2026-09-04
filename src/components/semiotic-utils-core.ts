/**
 * semiotic/utils — Shared utilities, ThemeProvider, and data helpers.
 *
 * Lightweight entry point for consumers that need the theme system,
 * format utilities, data transforms, or color constants without pulling
 * in any chart type bundles. Import from "semiotic/utils" instead of
 * "semiotic" to keep bundle size minimal.
 */

// ── Theme ────────────────────────────────────────────────────────────────
export type { SemioticTheme } from "./store/themeCore"
export {
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLOR_BLIND_SAFE_CATEGORICAL
} from "./store/themeCore"
export {
  themeToCSS,
  themeToCSSVariables,
  themeToTokens,
  resolveThemePreset,
  THEME_PRESETS,
  CARBON_CATEGORICAL_14,
  CARBON_ALERT
} from "./semiotic-themes-core"
export type {
  KnownThemePresetName,
  ThemePresetName
} from "./semiotic-themes-core"

// ── Format utilities ─────────────────────────────────────────────────────
export { adaptiveTimeTicks, smartTickFormat } from "./charts/shared/formatUtils"
export type {
  AdaptiveTimeTickOptions,
  TimeGranularity
} from "./charts/shared/formatUtils"

// ── Responsive sizing math (React-free) ─────────────────────────────────
export { resolveResponsiveDimension } from "./stream/responsiveSize"
export type { ResponsiveSizeOptions } from "./stream/responsiveSize"

// ── Color manipulation ───────────────────────────────────────────────────
export { darkenColor, lightenColor } from "./charts/shared/colorManipulation"

// ── Pattern fills ────────────────────────────────────────────────────────
export { createHatchPattern } from "./charts/shared/hatchPattern"
export type { HatchPatternOptions } from "./charts/shared/hatchPattern"

// Declarative hatch-fill descriptor + threshold-aware style rules (pure).
export {
  isHatchFill,
  hatchFillId,
  hatchFillKey
} from "./charts/shared/hatchFill"
export type { HatchFill } from "./charts/shared/hatchFill"
export {
  resolveStyleRules,
  matchesThreshold,
  ruleMatches,
  makeRuleValueResolver,
  makeXYRuleContext,
  makeNodeRuleContext,
  composeStyleRules,
  makeStyleRuleStyleFn
} from "./charts/shared/styleRules"
export type {
  StyleRule,
  StyleRuleStyle,
  StyleRuleThreshold,
  StyleRuleContext,
  StyleRulePredicate
} from "./charts/shared/styleRules"

// ── Validation ───────────────────────────────────────────────────────────
export { validateProps } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
export {
  auditData,
  formatDataAudit,
  profileNumericFields,
  toDataAuditNotifications
} from "./data/auditData"
export type {
  AuditDataOptions,
  CheckedNumericContract,
  DataAuditChartNotification,
  DataAuditDiagnosis,
  DataAuditNotificationOptions,
  DataAuditResult,
  NumericFieldProfile,
  ProfileNumericFieldsOptions
} from "./data/auditData"
export type {
  NumericAggregateContract,
  NumericContracts,
  NumericFieldContract,
  NumericFieldRole,
  NumericRequirement
} from "./data/numericContracts"
export {
  evaluateChart,
  formatEvaluateChart,
  toEvaluateChartNotifications
} from "./ai/evaluateChart"
export type {
  EvaluateChartFinding,
  EvaluateChartNotification,
  EvaluateChartOptions,
  EvaluateChartResult,
  EvaluateChartSeverity,
  EvaluateChartStage,
  EvaluateChartSummary
} from "./ai/evaluateChart"
export { auditVisualHierarchy } from "./ai/auditVisualHierarchy"
export type {
  VisualHierarchyAuditResult,
  VisualHierarchyFinding,
  VisualHierarchyInput,
  VisualHierarchyStatus
} from "./ai/auditVisualHierarchy"
export {
  AESTHETICS_OFF_PROFILE,
  DEFAULT_AESTHETIC_PROFILE,
  DEFAULT_AESTHETIC_THRESHOLDS,
  DEFAULT_AESTHETIC_WEIGHTS,
  evaluateAesthetics
} from "./ai/evaluateAesthetics"
export type {
  AestheticEvaluationResult,
  AestheticFeatureResult,
  AestheticFeatureStatus,
  EvaluateAestheticsOptions
} from "./ai/evaluateAesthetics"
export type {
  AestheticFeatureId,
  AestheticFeatureWeights,
  AestheticProfile,
  AestheticThresholds
} from "./ai/aestheticProfileTypes"
export {
  auditAccessibility,
  formatAccessibilityAudit,
  accessibilityCaveats
} from "./charts/shared/auditAccessibility"
export {
  auditMobileVisualization,
  formatMobileVisualizationAudit,
  mobileVisualizationCaveats
} from "./charts/shared/auditMobileVisualization"
export {
  responsiveRuleMatches,
  resolveResponsiveRules
} from "./charts/shared/responsiveRules"
export {
  describeChart,
  resolveCommunicativeAct,
  communicativeActForIntent
} from "./ai/describeChart"
export type {
  DescribeChartResult,
  DescribeChartOptions,
  DescribeLevel,
  CommunicativeAct,
  DescribeCapabilityContext
} from "./ai/describeChart"
export {
  buildNavigationTree,
  flattenVisible,
  countNodes
} from "./ai/navigationTree"
export type {
  NavTreeNode,
  NavTreeRole,
  BuildNavigationTreeOptions
} from "./ai/navigationTree"
// Agent-reader grounding payload — describeChart (L1–L3) + capability intent
// (L4) + nav-tree structure, the documented thing an LLM reads to interpret a
// chart. Composes the describeChart + buildNavigationTree exports above; pulls
// in no recommender code.
export { buildReaderGrounding } from "./ai/readerGrounding"
export type {
  ChartReaderGrounding,
  ChartReaderGroundingOptions,
  ChartReaderGroundingIntent,
  PhysicsReaderGrounding,
  PhysicsReaderGroundingAggregate,
  PhysicsReaderGroundingAggregates,
  PhysicsReaderGroundingGeometry,
  PhysicsReaderGroundingInput,
  PhysicsReaderGroundingSediment,
  PhysicsReaderGroundingSimulation
} from "./ai/readerGrounding"
export type {
  A11yPrinciple,
  A11yStatus,
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions
} from "./charts/shared/auditAccessibility"
export type {
  MobileAuditStatus,
  MobileAuditCategory,
  MobileAuditImpact,
  MobileVisualizationInteractionContract,
  MobileVisualizationLabelContract,
  MobileVisualizationCustomContract,
  MobileVisualizationContract,
  MobileVisualizationFinding,
  MobileVisualizationAuditResult,
  AuditMobileVisualizationOptions
} from "./charts/shared/auditMobileVisualization"
export type {
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult
} from "./charts/shared/responsiveRules"

// ── Hit testing ─────────────────────────────────────────────────────────
export { getHitRadius } from "./stream/hitTestUtils"

// ── Datum unwrapping ──────────────────────────────────────────────────────
// Collapse the wrapped-vs-raw datum split that bites onObservation consumers:
// always yields the raw user object whether the frame wrapped it or not.
export { unwrapDatum } from "./recipes/recipeUtils"

// ── Serialization ────────────────────────────────────────────────────────
export {
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  copyConfig,
  configToJSX,
  configToJSXWithReport
} from "./export/chartConfig"
export type {
  ChartConfig,
  ChartArtifactTransferStatus,
  ToConfigOptions,
  FromConfigResult,
  ToURLOptions,
  JSXProjectionResult,
  CopyFormat
} from "./export/chartConfig"
export {
  serializeSelections,
  deserializeSelections
} from "./export/selectionSerializer"
export type {
  SerializedSelections,
  SerializedSelection,
  SerializedFieldSelection
} from "./export/selectionSerializer"
export { exportChart } from "./export/exportChart"
export { auditObservedScene } from "./ai/observedSceneAudit"
export type {
  AuditObservedSceneInput,
  ObservedAuditFinding,
  ObservedSceneAuditResult
} from "./ai/observedSceneAudit"

// ── Vega-Lite translator ─────────────────────────────────────────────────
export { fromVegaLite } from "./data/fromVegaLite"
export type { VegaLiteSpec, VegaLiteEncoding } from "./data/fromVegaLite"

// ── Data structures ──────────────────────────────────────────────────────
export { RingBuffer } from "./realtime/RingBuffer"
export { IncrementalExtent } from "./realtime/IncrementalExtent"

// ── Tooltip utilities ────────────────────────────────────────────────────
export {
  Tooltip,
  TooltipRoot,
  MultiLineTooltip,
  MultiPointTooltip,
  normalizeTooltip,
  resolveTooltipContent,
  resolveMultiCapableTooltip,
  isMultiTooltip,
  hasOwnTooltipChrome,
  markTooltipChrome
} from "./Tooltip/Tooltip"
export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig,
  MultiTooltipConfig,
  TooltipRootProps,
  TooltipChromeMode
} from "./Tooltip/Tooltip"

// ── Accessibility hooks ─────────────────────────────────────────────────
// ── Radial chart geometry ────────────────────────────────────────────────
// Pure math helpers extracted from GaugeChart for custom radial chart
// authors using XYCustomChart or any bespoke radial layout.
export {
  sweepToAngles,
  valueToAngle,
  computeArcBoundingBox
} from "./charts/shared/radialGeometry"
export type {
  SweepAngles,
  ArcBoundingBox
} from "./charts/shared/radialGeometry"
