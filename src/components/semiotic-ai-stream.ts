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
  StreamStretchSuggestion
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
  pickSeriesField
} from "./ai/streamSchema"
export { suggestStreamDashboard } from "./ai/suggestStreamDashboard"
export type {
  StreamDashboardPanel,
  StreamDashboardSuggestion,
  SuggestStreamDashboardOptions
} from "./ai/suggestStreamDashboard"
