/**
 * semiotic/utils — Shared utilities, ThemeProvider, and data helpers.
 *
 * Lightweight entry point for consumers that need the theme system,
 * format utilities, data transforms, or color constants without pulling
 * in any chart type bundles. Import from "semiotic/utils" instead of
 * "semiotic" to keep bundle size minimal.
 */

// ── Theme ────────────────────────────────────────────────────────────────
export { ThemeProvider, useTheme } from "./ThemeProvider"
export type { SemioticTheme } from "./store/ThemeStore"
export {
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  COLOR_BLIND_SAFE_CATEGORICAL,
} from "./store/ThemeStore"
export {
  themeToCSS,
  themeToTokens,
  resolveThemePreset,
  THEME_PRESETS,
  CARBON_CATEGORICAL_14,
  CARBON_ALERT,
} from "./semiotic-themes"
export type { ThemePresetName } from "./semiotic-themes"

// ── Format utilities ─────────────────────────────────────────────────────
export { adaptiveTimeTicks, smartTickFormat } from "./charts/shared/formatUtils"

// ── Color manipulation ───────────────────────────────────────────────────
export { darkenColor, lightenColor } from "./charts/shared/colorManipulation"

// ── Pattern fills ────────────────────────────────────────────────────────
export { createHatchPattern } from "./charts/shared/hatchPattern"
export type { HatchPatternOptions } from "./charts/shared/hatchPattern"

// ── Validation ───────────────────────────────────────────────────────────
export { validateProps } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
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
export { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export { serializeSelections, deserializeSelections } from "./export/selectionSerializer"
export type { SerializedSelections, SerializedSelection, SerializedFieldSelection } from "./export/selectionSerializer"
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
export { normalizeTooltip, MultiPointTooltip } from "./Tooltip/Tooltip"

// ── Accessibility hooks ─────────────────────────────────────────────────
export { useReducedMotion, useHighContrast } from "./stream/useMediaPreferences"

// ── Radial chart geometry ────────────────────────────────────────────────
// Pure math helpers extracted from GaugeChart for custom radial chart
// authors using XYCustomChart or any bespoke radial layout.
export {
  sweepToAngles,
  valueToAngle,
  computeArcBoundingBox,
} from "./charts/shared/radialGeometry"
export type { SweepAngles, ArcBoundingBox } from "./charts/shared/radialGeometry"

// ── Stream status observer ──────────────────────────────────────────────
// User-facing hook for any push-API chart (realtime or HOC) — wraps
// the ref and exposes a reactive `status` enum (idle/active/stale)
// + last-push timestamp. The frame-internal staleness check in
// `useStalenessCheck` powers per-mark dimming inside the canvas;
// `useStreamStatus` is the user-facing surface for app-level
// indicators ("Stale data" badges, idle banners, etc.).
export { useStreamStatus } from "./charts/shared/useStreamStatus"
export type {
  StreamStatus,
  StreamStatusOptions,
  StreamStatusResult,
} from "./charts/shared/useStreamStatus"
