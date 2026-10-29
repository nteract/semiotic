import {
  suggestStreamCharts,
  suggestStreamDashboard,
  explainStreamCapabilityFit,
  type SuggestStreamChartsResult,
  type StreamDashboardSuggestion,
  type IntentId,
} from "semiotic/ai"
import {
  suggestStreamCharts as suggestCoreStreamCharts,
  suggestStreamDashboard as suggestCoreStreamDashboard,
  explainStreamCapabilityFit as explainCoreStreamCapabilityFit,
  type SuggestStreamChartsResult as CoreSuggestStreamChartsResult,
  type StreamDashboardSuggestion as CoreStreamDashboardSuggestion,
} from "semiotic/ai/core"

// Released interfaces still accept stored results and mocks without diagnostics.
const releasedCharts = {
  suggestions: [],
  excluded: [],
  stretchSuggestions: [],
} satisfies SuggestStreamChartsResult & CoreSuggestStreamChartsResult

const releasedDashboard = {
  panels: [],
  intentsCovered: [],
  intentsMissing: [],
  stretchPanels: [],
  schemas: [],
} satisfies StreamDashboardSuggestion & CoreStreamDashboardSuggestion

// Both public entry points guarantee diagnostics on newly produced results,
// including the explanation overload that returns the full suggestion result.
for (const suggest of [
  suggestStreamCharts,
  suggestCoreStreamCharts,
  explainStreamCapabilityFit,
  explainCoreStreamCapabilityFit,
]) {
  const result = suggest({ fields: [] })
  const warnings: string[] = result.warnings
  const rankingIntents: IntentId[] = result.rankingIntents
  const compatible: SuggestStreamChartsResult = result
  void [warnings, rankingIntents, compatible]
}

for (const suggest of [suggestStreamDashboard, suggestCoreStreamDashboard]) {
  const result = suggest({ fields: [] })
  const warnings: string[] = result.warnings
  const compatible: StreamDashboardSuggestion = result
  void [warnings, compatible]
}

void [releasedCharts, releasedDashboard]
