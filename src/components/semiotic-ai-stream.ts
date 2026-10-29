/**
 * Stream suggestion surface re-exported from `semiotic/ai`.
 * Kept as a satellite so the AI barrel stays under the production line ceiling.
 */

export {
  suggestStreamCharts,
  explainStreamCapabilityFit,
  registerStreamChartCapability,
  unregisterStreamChartCapability,
  getStreamCapabilities
} from "./ai/suggestStreamCharts"
export type {
  SuggestStreamChartsOptions,
  SuggestStreamChartsResult,
  RejectedStreamCapability,
  StreamStretchSuggestion,
  StreamCapabilityExplanation
} from "./ai/suggestStreamCharts"
export type {
  StreamSchema,
  StreamFieldSchema,
  StreamFieldKind,
  StreamFieldRole,
  StreamShape,
  StreamThroughput,
  StreamThroughputBand,
  StreamThroughputThresholds,
  StreamChartCapability,
  StreamIntentScorer,
  StreamSuggestion
} from "./ai/streamingTypes"
export {
  resolveStreamShape,
  streamKeyFields,
  streamThroughputBand,
  pickValueField,
  pickCategoryField,
  pickTimeField,
  pickSeriesField,
  pickSplitField,
  pickMeasureFields,
  normalizeStreamSchema
} from "./ai/streamSchema"
export type { NormalizedStreamSchema } from "./ai/streamSchema"
export { suggestStreamDashboard } from "./ai/suggestStreamDashboard"
export type {
  StreamDashboardPanel,
  StreamDashboardSuggestion,
  SuggestStreamDashboardOptions
} from "./ai/suggestStreamDashboard"
