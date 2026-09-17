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
  /** Index into `schemas` for the stream this panel's props bind to. */
  schemaIndex: number
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
  const fields = schema.fields ?? []
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

  const numericCount = fields.filter((field) => field.kind === "numeric").length
  if (numericCount >= 2) {
    intents.push("correlation", "outlier-detection")
  } else if (hasNumericValue(schema) && hasTimeField(schema)) {
    intents.push("distribution")
  }

  return Array.from(new Set(intents))
}

function defaultIntentsForSchemas(schemas: ReadonlyArray<StreamSchema>): IntentId[] {
  const intents: IntentId[] = []
  for (const schema of schemas) {
    for (const intent of defaultStreamIntents(schema)) {
      if (!intents.includes(intent)) intents.push(intent)
    }
  }
  return intents
}

interface RankedStreamCandidate {
  suggestion: StreamSuggestion
  schemaIndex: number
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
  const maxPanels =
    options.budget ??
    options.audience?.dashboard?.cellBudget ??
    6
  const diversify = options.diversifyByFamily !== false
  const requested = options.intents
    ?? (options.intent
      ? (Array.isArray(options.intent) ? options.intent : [options.intent])
      : defaultIntentsForSchemas(list))

  const panels: StreamDashboardPanel[] = []
  const intentsCovered: IntentId[] = []
  const intentsMissing: IntentId[] = []
  const usedFamilies = new Set<string>()
  const usedKeys = new Set<string>()
  const usedSchemaIndexes = new Set<number>()
  const leadFamilies = options.audience?.dashboard?.leadFamilies ?? []

  const panelKey = (schemaIndex: number, component: string) =>
    `${schemaIndex}:${component}`

  const rankForIntent = (intent: IntentId): RankedStreamCandidate[] => {
    const ranked: RankedStreamCandidate[] = []
    for (let schemaIndex = 0; schemaIndex < list.length; schemaIndex++) {
      const { suggestions } = suggestStreamCharts(list[schemaIndex], {
        intent,
        allow: options.allow,
        deny: options.deny,
        maxResults: 20,
        minScore: 1.5,
        audience: options.audience,
      })
      for (const suggestion of suggestions) {
        ranked.push({ suggestion, schemaIndex })
      }
    }
    ranked.sort((a, b) => {
      if (b.suggestion.score !== a.suggestion.score) {
        return b.suggestion.score - a.suggestion.score
      }
      if (b.suggestion.rubric.accuracy !== a.suggestion.rubric.accuracy) {
        return b.suggestion.rubric.accuracy - a.suggestion.rubric.accuracy
      }
      return b.suggestion.rubric.familiarity - a.suggestion.rubric.familiarity
    })
    return ranked
  }

  const takeUnused = (
    ranked: RankedStreamCandidate[],
    predicate: (candidate: RankedStreamCandidate) => boolean,
  ): RankedStreamCandidate | undefined => {
    return ranked.find((candidate) => {
      if (usedKeys.has(panelKey(candidate.schemaIndex, candidate.suggestion.component))) {
        return false
      }
      return predicate(candidate)
    })
  }

  for (const intent of requested) {
    if (panels.length >= maxPanels) {
      intentsMissing.push(intent)
      continue
    }

    const ranked = rankForIntent(intent)
    const unusedSchema = (candidate: RankedStreamCandidate) =>
      !usedSchemaIndexes.has(candidate.schemaIndex)
    const unusedFamily = (candidate: RankedStreamCandidate) =>
      !(diversify && usedFamilies.has(candidate.suggestion.family))

    let pick: RankedStreamCandidate | undefined
    if (panels.length === 0 && leadFamilies.length > 0) {
      pick = takeUnused(ranked, (candidate) =>
        leadFamilies.includes(candidate.suggestion.family),
      )
    }
    if (!pick) {
      pick = takeUnused(ranked, (candidate) => unusedSchema(candidate) && unusedFamily(candidate))
    }
    if (!pick) {
      pick = takeUnused(ranked, unusedFamily)
    }
    if (!pick && diversify) {
      pick = takeUnused(ranked, unusedSchema) ?? takeUnused(ranked, () => true)
    }

    if (pick) {
      panels.push({
        intent,
        suggestion: pick.suggestion,
        schemaIndex: pick.schemaIndex,
      })
      intentsCovered.push(intent)
      usedFamilies.add(pick.suggestion.family)
      usedKeys.add(panelKey(pick.schemaIndex, pick.suggestion.component))
      usedSchemaIndexes.add(pick.schemaIndex)
    } else {
      intentsMissing.push(intent)
    }
  }

  const stretchPanels: StreamStretchSuggestion[] = []
  if (options.audience && (options.audience.exposureLevel ?? 1) > 0) {
    const maxStretch = options.maxStretchPanels ?? Math.min(3, maxPanels)
    const deny = [
      ...(options.deny ?? []),
      ...Array.from(usedKeys).map((key) => key.split(":")[1]),
    ]
    for (let schemaIndex = 0; schemaIndex < list.length; schemaIndex++) {
      if (stretchPanels.length >= maxStretch) break
      const stretches = suggestStreamCharts(list[schemaIndex], {
        audience: options.audience,
        deny,
        maxStretchResults: maxStretch - stretchPanels.length,
      }).stretchSuggestions
      for (const stretch of stretches) {
        stretchPanels.push({ ...stretch, schemaIndex })
        if (stretchPanels.length >= maxStretch) break
      }
    }
  }

  return {
    panels,
    intentsCovered,
    intentsMissing,
    stretchPanels,
    schemas: list,
  }
}
