import type { Datum } from "../charts/shared/datumTypes"
import type { AudienceProfile } from "./audienceProfile"
import { aiNumericValue } from "./aiData"
import { stringValue } from "./navigationValues"
import { article, computeStats } from "./chartRoles"
import type { ChartRecipe } from "./chartRecipes"
import type { DescribeChartResult, DescribeLevel } from "./describeChart"
import {
  fieldForRole,
  firstRole,
  recipeConfig,
  recipeData,
  recipeIntentId
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
        maximumFractionDigits: 1
      })
    }
  } catch {
    return {
      number: new Intl.NumberFormat("en", { maximumFractionDigits: 2 }),
      percent: new Intl.NumberFormat("en", {
        style: "percent",
        maximumFractionDigits: 1
      })
    }
  }
}

function generatedLevels(
  recipe: ChartRecipe,
  data: Datum[],
  config: Record<string, unknown>,
  locale: string
): DescribeChartResult["levels"] {
  const categoryRole = firstRole(recipe, ["nominal", "ordinal"])
  const valueRole = firstRole(recipe, ["quantitative"])
  const categoryField = categoryRole
    ? fieldForRole(categoryRole, config, data)
    : undefined
  const valueField = valueRole
    ? fieldForRole(valueRole, config, data)
    : undefined
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
  const stats =
    categoryField && valueField
      ? computeStats(
          data,
          (datum) => aiNumericValue(datum[valueField]),
          (datum) => stringValue(datum[categoryField], "Uncategorized"),
          number.format,
          { aggregate: true }
        )
      : null
  const count = stats?.count ?? 0,
    total = stats?.sum ?? 0
  const second = stats?.second
  const shares = stats && !stats.negative && total > 0
  const topTwoShare =
    stats && shares ? (stats.max + (second?.value ?? 0)) / total : 0

  const primary =
    recipe.intents.find(
      (intent) => typeof intent !== "string" && intent.strength === "primary"
    ) ?? recipe.intents[0]
  const primaryIntent = primary && recipeIntentId(primary)
  const audience =
    recipe.audience?.primary ??
    recipe.audienceFit?.find((fit) => fit.fit === "strong")?.audience

  return {
    l1: `${article(recipe.name)} ${recipe.name.toLowerCase()} encodes ${categoryLabel} and ${valueLabel}. ${capitalize(encodingText)}.`,
    l2: stats
      ? `${count} ${count === 1 ? "category totals" : "categories total"} ${number.format(total)}. ` +
        (stats.max === 0 && stats.min === 0
          ? "All categories are zero."
          : `${stats.maxLabels} ${stats.maxCount > 1 ? "tie at" : "accounts for"} ${number.format(stats.max)}${shares ? ` (${percent.format(stats.max / total)}${stats.maxCount > 1 ? " each" : ""})` : ""}${second && stats.maxCount === 1 ? `, followed by ${second.label} at ${number.format(second.value)}` : ""}.`) +
        (stats.negative
          ? " Negative values are present; shares are undefined."
          : "")
      : `${data.length} data ${data.length === 1 ? "item is" : "items are"} represented.`,
    l3: stats?.negative
      ? "Negative values prevent a part-to-whole concentration claim."
      : stats && second && shares
        ? stats.maxCount > 1
          ? `${stats.maxLabels} tie for the largest share at ${percent.format(stats.max / total)} each.`
          : topTwoShare > 0.5
            ? `Most of the total is concentrated in ${stats.maxLabel} and ${second.label}, which together account for ${percent.format(topTwoShare)}.`
            : `The total is distributed across ${count} categories without the first two forming a majority.`
        : stats && count === 1
          ? `${stats.maxLabel} is the only represented category.`
          : "No quantitative pattern can be derived from the available data.",
    l4: `The chart is intended for ${primaryIntent ?? "explanation"}${audience ? ` with a ${audience} audience` : ""}: ${recipe.designContract.whyCustom}`
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
  options: DescribeRecipeChartOptions = {}
): DescribeChartResult {
  const data = recipeData(props)
  const config = recipeConfig(props)
  const locale = options.locale ?? "en"
  const authored =
    typeof recipe.description === "function"
      ? recipe.description({ data, config, locale })
      : undefined
  const allLevels =
    authored?.levels ?? generatedLevels(recipe, data, config, locale)
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
        ...(recipe.designContract.misuse ?? []).map((item) => `Misuse: ${item}`)
      ]
    : undefined
  return {
    text,
    levels,
    ...(caveats?.length ? { caveats } : {})
  }
}
