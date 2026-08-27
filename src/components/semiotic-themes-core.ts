/**
 * semiotic/themes — Named theme presets and serialization utilities.
 *
 * ThemeProvider imports the preset implementation directly so browser chart
 * families do not load CSS/design-token serializers they never call.
 */

export * from "./store/themePresets"

export {
  themeToCSS,
  themeToCSSVariables,
  themeToTokens
} from "./store/themeSerialization"

export { designTokensToTheme } from "./store/designTokens"
export type { DesignTokensToThemeOptions } from "./store/designTokens"

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
