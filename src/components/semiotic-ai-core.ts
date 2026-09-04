/**
 * Semiotic AI core — chart-free deterministic intelligence for agent backends.
 *
 * Import from `semiotic/ai/core` when an agent needs recommendation,
 * validation, repair, grounding, or provider-tool adapters but does not render
 * React chart components in the same runtime. `semiotic/ai` remains the
 * backwards-compatible HOC catalog for code generation.
 */

import { registerBuiltInChartRecipeManifests } from "./ai/builtInChartRecipes"

registerBuiltInChartRecipeManifests()

export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"
export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
export type { Diagnosis, DiagnosisResult } from "./charts/shared/diagnoseConfig"
export {
  auditAccessibility,
  formatAccessibilityAudit,
  accessibilityCaveats
} from "./charts/shared/auditAccessibility"
export type {
  A11yPrinciple,
  A11yStatus,
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions
} from "./charts/shared/auditAccessibility"
export {
  auditMobileVisualization,
  formatMobileVisualizationAudit,
  mobileVisualizationCaveats
} from "./charts/shared/auditMobileVisualization"
export type {
  MobileVisualizationAuditResult,
  AuditMobileVisualizationOptions
} from "./charts/shared/auditMobileVisualization"
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

// Compatibility bridge for the general artifact contract. Broad collection,
// lineage, packet, migration, and format-projection utilities live only at
// `semiotic/artifact`; the established AI entry retains the core authoring,
// evaluation, audit, grounding, and policy workflow.
export type * from "./semiotic-artifact"
export { ARTIFACT_CONTRACT_VERSION } from "./artifact/types"
export { canonicalJson, fingerprintValue } from "./artifact/fingerprint"
export {
  ARTIFACT_FIELD_POLICIES,
  buildArtifactContract,
  formatArtifactContract,
  fromIntentManifest,
  toIntentManifest,
  validateArtifactContract
} from "./artifact/contract"
export { auditClaims } from "./artifact/claims"
export { auditTemporalContext } from "./artifact/temporal"
export {
  ARTIFACT_POLICIES,
  activePolicyRules,
  resolveArtifactPolicy
} from "./artifact/policies"
export { recommendRepresentation } from "./artifact/representation"
export {
  evaluateArtifact,
  explainArtifactRefusal,
  repairArtifact
} from "./artifact/evaluateArtifact"
export { buildArtifactGrounding } from "./artifact/grounding"
export {
  requireSerializableArtifactContract,
  serializeArtifactContract
} from "./artifact/serialization"
export { summarizeData } from "./data/DataSummarizer"
export type {
  DataSummary,
  FieldSummary,
  FieldType,
  SummarizeOptions
} from "./data/DataSummarizer"
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
export type {
  NumericAggregateContract,
  NumericContracts,
  NumericFieldContract,
  NumericFieldRole,
  NumericRequirement
} from "./data/numericContracts"

export { profileData } from "./ai/profileData"
export type { ProfileDataOptions } from "./ai/profileData"
export { deriveProfileFields, rederiveProfile } from "./ai/deriveProfileFields"
export type {
  DerivedProfileFields,
  ProfilePrimaryFields,
  ReprofileFieldsOptions
} from "./ai/deriveProfileFields"
export type {
  ProfileFieldRole,
  ProfileFieldRoleHint,
  ProfileFieldRoleHints,
  NormalizedProfileFieldRoles
} from "./ai/fieldRoles"
export type { SuggestionPropContract } from "./ai/suggestionPropContracts"
export type {
  ChartFieldPolicy,
  SemanticRenderEvidence,
  SemanticViabilityCallback,
  SemanticViabilityCheck,
  SemanticViabilityDiagnostic,
  SemanticViabilityRule,
  ScoreChartRejected,
  ScoreChartResult,
  ScoreChartSuggestion
} from "./ai/chartCapabilityTypes"
export { inferIntent } from "./ai/inferIntent"
export type {
  InferIntentField,
  InferIntentOptions,
  InferIntentResult
} from "./ai/inferIntent"
export {
  BUILT_IN_INTENT_IDS,
  getIntent,
  listIntents,
  registerIntent
} from "./ai/intents"
export type {
  BuiltInIntentId,
  IntentDescriptor,
  IntentFieldKind,
  IntentId,
  IntentSignals
} from "./ai/intents"
export {
  suggestCharts,
  suggestChartsGrouped,
  scoreChart,
  explainCapabilityFit
} from "./ai/suggestCharts"
export type {
  SuggestChartsOptions,
  ScoreChartOptions,
  RejectedCapability,
  ExplainCapabilityFitResult
} from "./ai/suggestCharts"
export {
  BUILT_IN_CHART_RECIPES,
  CALENDAR_HEATMAP_CONFIG_SCHEMA,
  CALENDAR_HEATMAP_LAYOUT_ID,
  CALENDAR_HEATMAP_RECIPE_ID,
  PARALLEL_COORDINATES_CONFIG_SCHEMA,
  PARALLEL_COORDINATES_LAYOUT_ID,
  PARALLEL_COORDINATES_RECIPE_ID,
  calendarHeatmapRecipe,
  parallelCoordinatesRecipe,
  registerBuiltInChartRecipeManifests
} from "./ai/builtInChartRecipes"
export {
  defineChartRecipe,
  isJsonSafe,
  isRegisteredRecipeLayout,
  validateChartRecipe
} from "./ai/chartRecipes"
export type {
  ChartRecipe,
  ChartRecipeFrameFamily,
  ChartRecipePortability,
  DataRoleDefinition,
  EncodingDefinition,
  SerializableSchema
} from "./ai/chartRecipes"
export {
  getChartRecipe,
  getRegisteredRecipeCapabilities,
  hasRegisteredRecipeCapabilities,
  listChartRecipes,
  registerChartRecipe,
  resolveChartRecipe,
  unregisterChartRecipe
} from "./ai/chartRecipeRegistry"
export { suggestDashboard } from "./ai/suggestDashboard"
export type {
  DashboardPanel,
  DashboardSuggestion,
  SuggestDashboardOptions
} from "./ai/suggestDashboard"
export { suggestStreamCharts } from "./ai/suggestStreamCharts"
export type { SuggestStreamChartsOptions } from "./ai/suggestStreamCharts"
export type { StreamSchema, StreamSuggestion } from "./ai/streamingTypes"
export { suggestStretchCharts } from "./ai/suggestStretchCharts"
export type {
  StretchSuggestion,
  SuggestStretchChartsOptions
} from "./ai/suggestStretchCharts"
export { repairChartConfig } from "./ai/repairChartConfig"
export type { RepairResult, RepairOptions } from "./ai/repairChartConfig"
export { proposeVariant, evaluateVariantProposal } from "./ai/variantDiscovery"
export type {
  VariantProposal,
  VariantScore,
  EvaluateVariantProposalOptions
} from "./ai/variantDiscovery"
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
export { buildReaderGrounding } from "./ai/readerGrounding"
export type {
  ChartReaderGrounding,
  ChartReaderGroundingOptions
} from "./ai/readerGrounding"
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
export {
  prepareChart,
  refreshChartDiagnostics,
  createRenderEvidenceMemo,
  chartGenerationTool,
  toAnthropicTool,
  toOpenAITool,
  toOpenAIResponsesTool,
  createChartToolHandler
} from "./ai/generativeChart"
export type {
  RenderFn,
  RenderEvidenceMemo,
  PrepareChartInput,
  PrepareChartOptions,
  PrepareChartResult,
  ChartToolDefinition,
  ChartToolOptions,
  OpenAIResponsesTool,
  OpenAIResponsesToolOptions
} from "./ai/generativeChart"
export { inspectChart } from "./ai/chartClinic"
export type {
  ChartClinicConfig,
  ChartClinicInput,
  ChartClinicOptions,
  ChartClinicReport,
  ChartClinicRevisionInput,
  ChartClinicRevisionStatus,
  ChartClinicSceneSummary,
  ChartClinicBundleGuidance
} from "./ai/chartClinic"
