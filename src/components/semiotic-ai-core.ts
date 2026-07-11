/**
 * Semiotic AI core — chart-free deterministic intelligence for agent backends.
 *
 * Import from `semiotic/ai/core` when an agent needs recommendation,
 * validation, repair, grounding, or provider-tool adapters but does not render
 * React chart components in the same runtime. `semiotic/ai` remains the
 * backwards-compatible HOC catalog for code generation.
 */

export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
export type { Diagnosis, DiagnosisResult } from "./charts/shared/diagnoseConfig"
export {
  auditAccessibility,
  formatAccessibilityAudit,
  accessibilityCaveats,
} from "./charts/shared/auditAccessibility"
export type {
  A11yPrinciple,
  A11yStatus,
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions,
} from "./charts/shared/auditAccessibility"
export {
  auditMobileVisualization,
  formatMobileVisualizationAudit,
  mobileVisualizationCaveats,
} from "./charts/shared/auditMobileVisualization"
export type {
  MobileVisualizationAuditResult,
  AuditMobileVisualizationOptions,
} from "./charts/shared/auditMobileVisualization"
export { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "./export/chartConfig"
export type { ChartConfig, ToConfigOptions, CopyFormat } from "./export/chartConfig"
export { summarizeData } from "./data/DataSummarizer"
export type { DataSummary, FieldSummary, FieldType, SummarizeOptions } from "./data/DataSummarizer"

export { profileData } from "./ai/profileData"
export type { ProfileDataOptions } from "./ai/profileData"
export { inferIntent } from "./ai/inferIntent"
export type { InferIntentResult } from "./ai/inferIntent"
export { suggestCharts, suggestChartsGrouped, scoreChart, explainCapabilityFit } from "./ai/suggestCharts"
export type { SuggestChartsOptions, RejectedCapability, ExplainCapabilityFitResult } from "./ai/suggestCharts"
export { suggestDashboard } from "./ai/suggestDashboard"
export type { DashboardPanel, DashboardSuggestion, SuggestDashboardOptions } from "./ai/suggestDashboard"
export { suggestStreamCharts } from "./ai/suggestStreamCharts"
export type { SuggestStreamChartsOptions } from "./ai/suggestStreamCharts"
export type { StreamSchema, StreamSuggestion } from "./ai/streamingTypes"
export { suggestStretchCharts } from "./ai/suggestStretchCharts"
export type { StretchSuggestion, SuggestStretchChartsOptions } from "./ai/suggestStretchCharts"
export { repairChartConfig } from "./ai/repairChartConfig"
export type { RepairResult, RepairOptions } from "./ai/repairChartConfig"
export { proposeVariant, evaluateVariantProposal } from "./ai/variantDiscovery"
export type { VariantProposal, VariantScore, EvaluateVariantProposalOptions } from "./ai/variantDiscovery"
export { describeChart, resolveCommunicativeAct, communicativeActForIntent } from "./ai/describeChart"
export type { DescribeChartResult, DescribeChartOptions, DescribeLevel, CommunicativeAct, DescribeCapabilityContext } from "./ai/describeChart"
export { buildReaderGrounding } from "./ai/readerGrounding"
export type { ChartReaderGrounding, ChartReaderGroundingOptions } from "./ai/readerGrounding"
export { buildNavigationTree, flattenVisible, countNodes } from "./ai/navigationTree"
export type { NavTreeNode, NavTreeRole, BuildNavigationTreeOptions } from "./ai/navigationTree"
export {
  prepareChart,
  chartGenerationTool,
  toAnthropicTool,
  toOpenAITool,
  toOpenAIResponsesTool,
  createChartToolHandler,
} from "./ai/generativeChart"
export type {
  RenderFn,
  PrepareChartInput,
  PrepareChartOptions,
  PrepareChartResult,
  ChartToolDefinition,
  ChartToolOptions,
  OpenAIResponsesTool,
  OpenAIResponsesToolOptions,
} from "./ai/generativeChart"
