// AI validation, diagnostics, and accessibility-audit public surface.
// Re-exported by `semiotic/ai` to keep the chart catalog focused.

export { validateProps } from "./charts/shared/validateProps"
export type { ValidationResult } from "./charts/shared/validateProps"

export { diagnoseConfig } from "./charts/shared/diagnoseConfig"
export type { Diagnosis, DiagnosisResult } from "./charts/shared/diagnoseConfig"
export {
  diagnoseTokenEncoding,
  normalizeTokenEncoding,
  suggestTokenEncoding,
  tokenTaskIntentToCapabilityIntents,
} from "./recipes/tokenEncoding"
export type {
  PositionedToken,
  SuggestTokenEncodingInput,
  TokenCapabilityIntent,
  TokenCountStrategy,
  TokenDiagnostic,
  TokenDiagnosticCode,
  TokenDiagnosticsContext,
  TokenEncoding,
  TokenEncodingSuggestion,
  TokenGeneratorInput,
  TokenGridOptions,
  TokenLabelPolicy,
  TokenLayout,
  TokenSemantics,
  TokenSet,
  TokenTaskIntent,
  TokenType,
  VisualToken,
} from "./recipes/tokenEncoding"

// Accessibility audit — Chartability (POUR-CAF) heuristics over a chart config
export {
  auditAccessibility,
  formatAccessibilityAudit,
  accessibilityCaveats,
} from "./charts/shared/auditAccessibility"
export {
  auditMobileVisualization,
  formatMobileVisualizationAudit,
  mobileVisualizationCaveats,
} from "./charts/shared/auditMobileVisualization"
export {
  responsiveRuleMatches,
  resolveResponsiveRules,
} from "./charts/shared/responsiveRules"
export type {
  A11yPrinciple,
  A11yStatus,
  A11yFinding,
  AccessibilityAuditResult,
  AuditAccessibilityOptions,
} from "./charts/shared/auditAccessibility"
export * from "./ai/evaluateChart"
export * from "./ai/auditVisualHierarchy"
export * from "./ai/evaluateAesthetics"
export type * from "./ai/aestheticProfileTypes"
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
  AuditMobileVisualizationOptions,
} from "./charts/shared/auditMobileVisualization"
export type {
  MobileClearSelectionBehavior,
  MobileSnapBehavior,
  MobileInteractionConfig,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
} from "./charts/shared/types"
export type {
  ResponsiveOrientation,
  ResponsiveRuleCondition,
  ResponsiveRuleContext,
  ResponsiveRule,
  ResponsiveRuleMatch,
  ResponsiveRuleResult,
} from "./charts/shared/responsiveRules"
