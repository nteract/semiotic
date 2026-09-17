import { suggestStreamCharts, type StreamStretchSuggestion } from "./suggestStreamCharts"
import type { StreamSchema, StreamSuggestion } from "./streamingTypes"
import type { IntentId } from "./intents"
import type { AudienceProfile } from "./audienceProfile"
import {
  hasCategoryField,
  hasNumericValue,
  hasSeriesField,
  hasTimeField,
  resolveStreamShape,
} from "./streamSchema"

export interface StreamDashboardPanel {
  intent: IntentId
  suggestion: StreamSuggestion
}

export interface StreamDashboardSuggestion {
  panels: StreamDashboardPanel[]
  intentsCovered: IntentId[]
  intentsMissing: IntentId[]
  stretchPanels: StreamStretchSuggestion[]
  schemas: ReadonlyArray<StreamSchema>
}

export interface SuggestStreamDashboardOptions {
  intent?: IntentId | IntentId[]
  intents?: ReadonlyArray<IntentId>
  audience?: AudienceProfile
  budget?: number
  allow?: ReadonlyArray<string>
  deny?: ReadonlyArray<string>
  diversifyByFamily?: boolean
  maxStretchPanels?: number
}

function defaultStreamIntents(schema: StreamSchema): IntentId[] {
  const intents: IntentId[] = []
  const shape = resolveStreamShape(schema)

  if (hasTimeField(schema)) {
    intents.push("trend", "change-detection")
    if (hasSeriesField(schema)) {
      intents.push("compare-series", "composition-over-time")
    }
  }

  if (hasCategoryField(schema)) {
    intents.push("rank", "compare-categories", "part-to-whole")
  }

  if (shape === "aggregate" && hasNumericValue(schema)) {
    intents.push("part-to-whole")
  }

  const numericCount = schema.fields.filter((field) => field.kind === "numeric").length
  if (numericCount >= 2) {
    intents.push("correlation", "outlier-detection")
  } else if (hasNumericValue(schema) && hasTimeField(schema)) {
    intents.push("distribution")
  }

  return Array.from(new Set(intents))
}

function withWindowPreference(
  schema: StreamSchema,
  windowPreference: "windowed" | "cumulative" | undefined,
): StreamSchema {
  if (!windowPreference || schema.retention) return schema
  return { ...schema, retention: windowPreference }
}

/**
 * Compose a multi-panel dashboard from one or more stream schemas.
 *
 * Parallel to `suggestDashboard`, but schema-based. Audience layout
 * policy (`dashboard.cellBudget`, `leadFamilies`, `windowPreference`)
 * is first-class: pass it on `AudienceProfile.dashboard`.
 */
export function suggestStreamDashboard(
  schemas: StreamSchema | ReadonlyArray<StreamSchema>,
  options: SuggestStreamDashboardOptions = {},
): StreamDashboardSuggestion {
  const list = (Array.isArray(schemas) ? schemas : [schemas]).map((schema) =>
    withWindowPreference(schema, options.audience?.dashboard?.windowPreference),
  )
  const primary = list[0] ?? { fields: [] }
  const maxPanels =
    options.budget ??
    options.audience?.dashboard?.cellBudget ??
    6
  const diversify = options.diversifyByFamily !== false
  const requested = options.intents
    ?? (options.intent
      ? (Array.isArray(options.intent) ? options.intent : [options.intent])
      : defaultStreamIntents(primary))

  const panels: StreamDashboardPanel[] = []
  const intentsCovered: IntentId[] = []
  const intentsMissing: IntentId[] = []
  const usedFamilies = new Set<string>()
  const usedComponents = new Set<string>()
  const leadFamilies = options.audience?.dashboard?.leadFamilies ?? []

  for (const intent of requested) {
    if (panels.length >= maxPanels) {
      intentsMissing.push(intent)
      continue
    }

    const { suggestions } = suggestStreamCharts(primary, {
      intent,
      allow: options.allow,
      deny: options.deny,
      maxResults: 20,
      minScore: 1.5,
      audience: options.audience,
    })

    let pick: StreamSuggestion | undefined
    if (panels.length === 0 && leadFamilies.length > 0) {
      pick = suggestions.find(
        (candidate) =>
          leadFamilies.includes(candidate.family) &&
          !usedComponents.has(candidate.component),
      )
    }
    if (!pick) {
      for (const candidate of suggestions) {
        if (usedComponents.has(candidate.component)) continue
        if (diversify && usedFamilies.has(candidate.family)) continue
        pick = candidate
        break
      }
    }
    if (!pick && diversify) {
      pick = suggestions.find((candidate) => !usedComponents.has(candidate.component))
    }

    if (pick) {
      panels.push({ intent, suggestion: pick })
      intentsCovered.push(intent)
      usedFamilies.add(pick.family)
      usedComponents.add(pick.component)
    } else {
      intentsMissing.push(intent)
    }
  }

  const stretchPanels: StreamStretchSuggestion[] =
    options.audience && (options.audience.exposureLevel ?? 1) > 0
      ? suggestStreamCharts(primary, {
          audience: options.audience,
          deny: [
            ...(options.deny ?? []),
            ...Array.from(usedComponents),
          ],
          maxStretchResults: options.maxStretchPanels ?? Math.min(3, maxPanels),
        }).stretchSuggestions
      : []

  return {
    panels,
    intentsCovered,
    intentsMissing,
    stretchPanels,
    schemas: list,
  }
}
