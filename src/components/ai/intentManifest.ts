import type { ChartRecipe } from "./chartRecipes"

export interface IntentManifest {
  ididVersion: string
  chartId: string
  title?: string
  author?: string
  createdAt?: string
  intent: {
    primary: string
    secondary?: string[]
    communicativeAct?: string
  }
  audience?: {
    primary?: string
    familiarityAssumptions?: Record<string, string>
    literacyTargets?: {
      feature: string
      rationale: string
    }[]
  }
  reception?: {
    channels: string[]
    strengths?: string[]
    risks?: string[]
    scaffolds?: string[]
    memorableForm?: boolean
  }
  designContract?: {
    chartFamily?: string
    whyThisForm?: string
    whyNotDefault?: string
    risks?: string[]
    misuse?: string[]
  }
  accessibility?: {
    description?: string
    navigation?: boolean
    dataFallback?: boolean
    manualChecks?: string[]
  }
  provenance?: {
    dataSources?: string[]
    code?: string
    reviewStatus?: string
    generatedBy?: string
  }
  lifecycle?: {
    staleAfter?: string
    refreshPolicy?: string
    annotationStatus?: string
  }
}

export function summarizeIntentManifest(manifest: IntentManifest): string {
  const form =
    manifest.designContract?.chartFamily ??
    manifest.title ??
    "chart"
  const audience = manifest.audience?.primary
    ? ` for ${manifest.audience.primary}`
    : ""
  const why = manifest.designContract?.whyThisForm
  return `${form}: ${manifest.intent.primary}${audience}${why ? `. ${why}` : ""}`
}

export interface IntentManifestFromRecipeOptions {
  chartId: string
  title?: string
  description?: string
  dataSources?: string[]
  reviewStatus?: string
}

/** Project a chart recipe into the cross-chart Intent Mark standard. */
export function intentManifestFromRecipe(
  recipe: ChartRecipe,
  options: IntentManifestFromRecipeOptions,
): IntentManifest {
  const intentIds = recipe.intents
    .map((intent) =>
      typeof intent === "string" ? intent : intent.id ?? intent.name,
    )
    .filter((intent): intent is string => !!intent)
  const primaryDeclared = recipe.intents.find(
    (intent) => typeof intent !== "string" && intent.strength === "primary",
  )
  const primary =
    (typeof primaryDeclared === "object"
      ? primaryDeclared.id ?? primaryDeclared.name
      : undefined) ??
    intentIds[0] ??
    "explanation"

  return {
    ididVersion: "0.1",
    chartId: options.chartId,
    title: options.title ?? recipe.name,
    intent: {
      primary,
      secondary: intentIds.filter((intent) => intent !== primary),
    },
    audience: {
      primary: recipe.audience?.primary,
      familiarityAssumptions: Object.fromEntries(
        Object.entries(recipe.audience?.familiarity ?? {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
      literacyTargets: recipe.audience?.literacyTargets?.map((target) => ({
        feature: target.concept,
        rationale: target.rationale,
      })),
    },
    reception: recipe.reception
      ? {
          channels: recipe.reception.channels,
          strengths: recipe.reception.strengths,
          risks: recipe.reception.risks,
          scaffolds: recipe.reception.scaffolds,
          memorableForm: recipe.reception.memorableForm,
        }
      : undefined,
    designContract: {
      chartFamily: recipe.frameFamily,
      whyThisForm:
        recipe.designContract.whyThisForm ??
        recipe.designContract.whyCustom,
      whyNotDefault: recipe.designContract.whyNotDefault,
      risks: recipe.reception?.risks,
      misuse: recipe.designContract.misuse,
    },
    accessibility: {
      description: options.description,
      navigation:
        recipe.accessibility.keyboardNavigation === "required" ||
        recipe.navigation != null,
      dataFallback:
        recipe.accessibility.fallbackTable === true ||
        recipe.accessibility.accessibleTable === "required" ||
        recipe.accessibility.requiresAccessibleTable === true,
      manualChecks: [
        "real screen-reader behavior",
        "keyboard order quality",
        "custom metaphor comprehension",
        "animation distraction",
      ],
    },
    provenance:
      options.dataSources || options.reviewStatus
        ? {
            dataSources: options.dataSources,
            reviewStatus: options.reviewStatus,
            generatedBy: "Semiotic recipe intelligence",
          }
        : undefined,
  }
}
