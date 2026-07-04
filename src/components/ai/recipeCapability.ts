import type { Datum } from "../charts/shared/datumTypes"
import type {
  ChartCapability,
  ChartDataProfile,
  ChartFamily,
} from "./chartCapabilityTypes"
import type {
  ChartRecipe,
  DataRoleDefinition,
  IntentDefinition,
} from "./chartRecipes"

function intentId(intent: IntentDefinition): string | undefined {
  return typeof intent === "string" ? intent : intent.id ?? intent.name
}

function intentScore(intent: IntentDefinition): number {
  if (typeof intent === "string") return 3
  if (typeof intent.score === "number" && Number.isFinite(intent.score)) {
    const normalized = intent.score <= 1 ? intent.score * 5 : intent.score
    return Math.max(0, Math.min(5, normalized))
  }
  if (intent.strength === "primary") return 5
  if (intent.strength === "secondary") return 3
  if (intent.strength === "supporting") return 2
  return 3
}

function recipeFamily(recipe: ChartRecipe): ChartFamily {
  const intents = new Set(recipe.intents.map(intentId))
  if (intents.has("geo")) return "geo"
  if (intents.has("hierarchy")) return "hierarchy"
  if (intents.has("flow")) return "flow"
  if (intents.has("relationship")) return "network"
  if (intents.has("distribution")) return "distribution"
  if (intents.has("correlation")) return "relationship"
  if (intents.has("trend") || intents.has("composition-over-time")) return "time-series"
  if (
    intents.has("compare-categories") ||
    intents.has("rank") ||
    intents.has("part-to-whole")
  ) {
    return "categorical"
  }
  return "custom"
}

function familiarity(recipe: ChartRecipe): number {
  const declared = Object.values(recipe.audience?.familiarity ?? {})
  const numeric = declared.find((value): value is number => typeof value === "number")
  if (numeric !== undefined) return Math.max(1, Math.min(5, Math.round(numeric)))
  const words = declared.filter((value): value is string => typeof value === "string")
  if (words.includes("high")) return 4
  if (words.includes("medium")) return 3
  if (words.includes("low")) return 2
  return recipe.reception?.memorableForm ? 3 : 2
}

function rowsForSource(
  profile: ChartDataProfile,
  source: DataRoleDefinition["source"],
): ReadonlyArray<Datum> {
  if (source === "nodes") return profile.network?.nodes ?? []
  if (source === "edges") return profile.network?.edges ?? []
  if (source === "areas") return profile.geo?.features ?? []
  if (source === "points") return profile.geo?.points ?? []
  if (source === "lines") return profile.geo?.flows ?? []
  return profile.data
}

function fieldExists(
  profile: ChartDataProfile,
  role: DataRoleDefinition,
  field: string,
): boolean {
  const rows = rowsForSource(profile, role.source)
  return rows.some((row) => row != null && Object.prototype.hasOwnProperty.call(row, field))
}

export function resolveRecipeRoleField(
  recipe: ChartRecipe,
  role: DataRoleDefinition,
  profile: ChartDataProfile,
): string | undefined {
  if (role.field && fieldExists(profile, role, role.field)) return role.field

  if (role.source === "nodes" || role.source === "edges") {
    const common =
      role.role === "node-id"
        ? "id"
        : role.role === "edge-source"
          ? "source"
          : role.role === "edge-target"
            ? "target"
            : undefined
    if (common && fieldExists(profile, role, common)) return common
  }

  switch (role.semanticType) {
    case "quantitative":
      return profile.primary.y ?? profile.primary.size ?? profile.primary.x
    case "temporal":
      return profile.primary.time ?? profile.primary.x
    case "nominal":
    case "ordinal":
      return profile.primary.category ?? profile.primary.series
    case "identifier": {
      const rows = rowsForSource(profile, role.source)
      const candidate = ["id", "key", "name"].find((field) =>
        rows.some((row) => row != null && Object.prototype.hasOwnProperty.call(row, field)),
      )
      return candidate
    }
    case "geographic":
      return profile.hasGeo ? role.field : undefined
    default:
      return role.field
  }
}

function recipeFit(recipe: ChartRecipe, profile: ChartDataProfile): string | null {
  for (const role of recipe.dataRoles) {
    if (role.required === false) continue
    const field = resolveRecipeRoleField(recipe, role, profile)
    if (!field) return `needs data role "${role.role}" (${role.semanticType})`
  }
  const maxCategories = recipe.audit?.maxCategories
  if (
    typeof maxCategories === "number" &&
    typeof profile.categoryCount === "number" &&
    profile.categoryCount > maxCategories
  ) {
    return `${profile.categoryCount} categories exceeds this recipe's declared maximum of ${maxCategories}`
  }
  return null
}

function recipeProps(
  recipe: ChartRecipe,
  profile: ChartDataProfile,
): Record<string, unknown> {
  const layoutConfig: Record<string, unknown> = {}
  for (const role of recipe.dataRoles) {
    const field = resolveRecipeRoleField(recipe, role, profile)
    if (field && role.accessor) layoutConfig[role.accessor] = field
  }
  const base: Record<string, unknown> = {
    recipeId: recipe.id,
    layoutConfig,
  }
  if (recipe.frameFamily.startsWith("Network")) {
    base.nodes = profile.network?.nodes ?? profile.data
    base.edges = profile.network?.edges ?? []
  } else if (recipe.frameFamily.startsWith("Geo")) {
    base.areas = profile.geo?.features ?? []
    base.points = profile.geo?.points ?? profile.data
    base.lines = profile.geo?.flows ?? []
  } else {
    base.data = profile.data
  }
  return base
}

/**
 * Adapt a declarative recipe into the existing capability engine. Raw custom
 * frame HOCs remain excluded; named recipes participate as distinct candidates.
 */
export function recipeToChartCapability(recipe: ChartRecipe): ChartCapability {
  const intentScores: ChartCapability["intentScores"] = {}
  const positiveRationale: string[] = []
  for (const intent of recipe.intents) {
    const id = intentId(intent)
    if (!id) continue
    intentScores[id] = intentScore(intent)
    if (typeof intent !== "string" && intent.rationale) {
      positiveRationale.push(intent.rationale)
    }
  }
  positiveRationale.push(...(recipe.reception?.strengths ?? []).map(
    (strength) => `Reception strength: ${strength}`,
  ))

  const risks = recipe.reception?.risks ?? []
  const misuse = recipe.designContract.misuse ?? []
  const caveats = [
    ...(recipe.designContract.caveats ?? []),
    ...(recipe.caveats ?? []),
  ]

  return {
    component: recipe.id,
    displayName: recipe.name,
    candidateKind: "recipe",
    family: recipeFamily(recipe),
    renderingFamily: recipe.frameFamily,
    importPath: "semiotic/ai",
    rubric: {
      familiarity: familiarity(recipe),
      accuracy: 4,
      precision: risks.some((risk) => /precis|comparison/i.test(risk)) ? 2 : 3,
    },
    fits: (profile) => recipeFit(recipe, profile),
    intentScores,
    caveats: () => [...risks, ...misuse, ...caveats],
    buildProps: (profile) => recipeProps(recipe, profile),
    recipe,
    positiveRationale,
    whyCustom: {
      defaultAlternative: recipe.designContract.defaultAlternative,
      reason: recipe.designContract.whyNotDefault ?? recipe.designContract.whyCustom,
      tradeoff:
        recipe.designContract.tradeoff ??
        (risks.length > 0 ? risks[0] : undefined),
    },
  }
}
