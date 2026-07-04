import type { Datum } from "../charts/shared/datumTypes"
import type { AudienceProfile } from "./audienceProfile"
import type { ChartRecipe } from "./chartRecipes"
import type {
  DescribeChartResult,
  DescribeLevel,
} from "./describeChart"
import {
  fieldForRole,
  firstRole,
  recipeConfig,
  recipeData,
  recipeIntentId,
} from "./recipeSemantics"

export interface DescribeRecipeChartOptions {
  levels?: DescribeLevel[]
  locale?: string
  audience?: AudienceProfile
  includeCaveats?: boolean
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function formatters(locale: string) {
  try {
    return {
      number: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
      percent: new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    }
  } catch {
    return {
      number: new Intl.NumberFormat("en", { maximumFractionDigits: 2 }),
      percent: new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    }
  }
}

function generatedLevels(
  recipe: ChartRecipe,
  data: Datum[],
  config: Record<string, unknown>,
  locale: string,
): DescribeChartResult["levels"] {
  const categoryRole = firstRole(recipe, ["nominal", "ordinal"])
  const valueRole = firstRole(recipe, ["quantitative"])
  const categoryField = categoryRole
    ? fieldForRole(categoryRole, config, data)
    : undefined
  const valueField = valueRole ? fieldForRole(valueRole, config, data) : undefined
  const categoryLabel = categoryRole?.role ?? categoryField ?? "category"
  const valueLabel = valueRole?.role ?? valueField ?? "value"
  const encodings = recipe.encodings ?? []
  const encodingText = encodings.length
    ? encodings
        .slice(0, 3)
        .map((encoding) => encoding.meaning.replace(/\.$/, ""))
        .join("; ")
    : `${categoryLabel} and ${valueLabel} are mapped through the recipe's declared visual semantics`

  const { number, percent } = formatters(locale)
  const aggregates = new Map<string, number>()
  if (categoryField && valueField) {
    for (const datum of data) {
      const category = String(datum[categoryField] ?? "Uncategorized")
      const raw = Number(datum[valueField])
      if (Number.isFinite(raw)) {
        aggregates.set(category, (aggregates.get(category) ?? 0) + raw)
      }
    }
  }
  const ranked = [...aggregates].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, value]) => sum + value, 0)
  const top = ranked[0]
  const second = ranked[1]
  const topTwoShare =
    total > 0
      ? ((top?.[1] ?? 0) + (second?.[1] ?? 0)) / total
      : 0

  const primaryIntent = recipe.intents
    .map((intent) => ({
      id: recipeIntentId(intent),
      strength: typeof intent === "string" ? undefined : intent.strength,
    }))
    .sort((a, b) => (a.strength === "primary" ? -1 : b.strength === "primary" ? 1 : 0))[0]?.id
  const audience =
    recipe.audience?.primary ??
    recipe.audienceFit?.find((fit) => fit.fit === "strong")?.audience

  return {
    l1: `A ${recipe.name.toLowerCase()} encodes ${categoryLabel} and ${valueLabel}. ${capitalize(encodingText)}.`,
    l2:
      ranked.length > 0
        ? `${ranked.length} categories total ${number.format(total)}. ${top[0]} accounts for ${number.format(top[1])}${total > 0 ? ` (${percent.format(top[1] / total)})` : ""}${second ? `, followed by ${second[0]} at ${number.format(second[1])}` : ""}.`
        : `${data.length} data ${data.length === 1 ? "item is" : "items are"} represented.`,
    l3:
      ranked.length >= 2
        ? topTwoShare >= 0.5
          ? `Most of the total is concentrated in ${top[0]} and ${second[0]}, which together account for ${percent.format(topTwoShare)}.`
          : `The total is distributed across ${ranked.length} categories without the first two forming a majority.`
        : top
          ? `${top[0]} is the only represented category.`
          : "No quantitative pattern can be derived from the available data.",
    l4: `The chart is intended for ${primaryIntent ?? "explanation"}${audience ? ` with a ${audience} audience` : ""}: ${recipe.designContract.whyCustom}`,
  }
}

/**
 * Generate a recipe-specific layered description. A registered implementation
 * may supply bespoke prose; otherwise declared roles/encodings/intents produce
 * an honest portable fallback.
 */
export function describeRecipeChart(
  recipe: ChartRecipe,
  props: Datum,
  options: DescribeRecipeChartOptions = {},
): DescribeChartResult {
  const data = recipeData(props)
  const config = recipeConfig(props)
  const locale = options.locale ?? "en"
  const authored =
    typeof recipe.description === "function"
      ? recipe.description({ data, config, locale })
      : undefined
  const allLevels = authored?.levels ?? generatedLevels(recipe, data, config, locale)
  const requested = options.levels ?? ["l1", "l2", "l3", "l4"]
  const levels: DescribeChartResult["levels"] = {}
  for (const level of requested) {
    if (allLevels[level]) levels[level] = allLevels[level]
  }
  const text = (["l1", "l2", "l3", "l4"] as DescribeLevel[])
    .map((level) => levels[level])
    .filter((value): value is string => !!value)
    .join(" ")
  const caveats = options.includeCaveats
    ? [
        ...(recipe.reception?.risks ?? []),
        ...(recipe.caveats ?? []),
        ...(recipe.designContract.misuse ?? []).map((item) => `Misuse: ${item}`),
      ]
    : undefined
  return {
    text,
    levels,
    ...(caveats?.length ? { caveats } : {}),
  }
}
