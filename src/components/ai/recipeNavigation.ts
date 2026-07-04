import type { Datum } from "../charts/shared/datumTypes"
import type {
  ChartRecipe,
  PortableNavigationStrategy,
} from "./chartRecipes"
import type { NavTreeNode } from "./navigationTree"
import {
  fieldForRole,
  fillRecipeTemplate,
  firstRole,
  recipeConfig,
  recipeData,
  roleByName,
} from "./recipeSemantics"

export interface RecipeNavigationOptions {
  maxLeaves?: number
  locale?: string
}

function slug(value: unknown): string {
  const normalized = String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "unknown"
}

function isPortableStrategy(
  value: ChartRecipe["navigation"],
): value is PortableNavigationStrategy {
  return !!value && typeof value === "object"
}

function defaultLeafLabel(
  datum: Datum,
  recipe: ChartRecipe,
  config: Record<string, unknown>,
  data: Datum[],
): string {
  const category = firstRole(recipe, ["nominal", "ordinal"])
  const quantitative = recipe.dataRoles.filter(
    (role) => role.semanticType === "quantitative",
  )
  const categoryField = category ? fieldForRole(category, config, data) : undefined
  const parts: string[] = []
  if (categoryField && datum[categoryField] != null) {
    parts.push(String(datum[categoryField]))
  }
  for (const role of quantitative) {
    const field = fieldForRole(role, config, data)
    if (field && datum[field] != null) parts.push(`${role.role}: ${String(datum[field])}`)
  }
  return parts.length > 0 ? parts.join(", ") : "Data item"
}

/**
 * Build navigation from a recipe strategy, or from its declared data roles
 * when no strategy exists. The fallback always produces data leaves rather
 * than collapsing an unfamiliar custom chart to a root-only node.
 */
export function buildRecipeNavigationTree(
  recipe: ChartRecipe,
  props: Datum,
  options: RecipeNavigationOptions = {},
): NavTreeNode {
  const data = recipeData(props)
  const config = recipeConfig(props)
  const maxLeaves = Math.max(1, options.maxLeaves ?? 200)
  const locale = options.locale ?? "en"

  if (typeof recipe.navigation === "function") {
    return recipe.navigation({ data, config, locale })
  }

  const strategy = isPortableStrategy(recipe.navigation)
    ? recipe.navigation
    : undefined
  const groupRole =
    (strategy?.groupByRole ? roleByName(recipe, strategy.groupByRole) : undefined) ??
    (strategy?.groupBy?.[0]
      ? roleByName(recipe, strategy.groupBy[0]) ??
        recipe.dataRoles.find((role) => role.field === strategy.groupBy?.[0])
      : undefined) ??
    firstRole(recipe, ["nominal", "ordinal"])
  const groupField = groupRole ? fieldForRole(groupRole, config, data) : undefined
  const idRole =
    (strategy?.idRole ? roleByName(recipe, strategy.idRole) : undefined) ??
    firstRole(recipe, ["identifier"])
  const idField = idRole ? fieldForRole(idRole, config, data) : undefined
  const rootSummary = strategy?.summaryTemplate
    ? fillRecipeTemplate(
        strategy.summaryTemplate,
        undefined,
        recipe,
        config,
        data,
        { count: data.length },
      )
    : `${recipe.name}: ${data.length} ${data.length === 1 ? "item" : "items"} represented.`
  const root: NavTreeNode = {
    id: "root",
    role: "chart",
    label: rootSummary,
    level: 1,
    children: [],
  }

  let emitted = 0
  const leaf = (datum: Datum, index: number, level: number): NavTreeNode => {
    const rawId = idField ? datum[idField] : undefined
    const label = strategy?.itemLabelTemplate
      ? fillRecipeTemplate(
          strategy.itemLabelTemplate,
          datum,
          recipe,
          config,
          data,
          { count: data.length },
        )
      : defaultLeafLabel(datum, recipe, config, data)
    return {
      id: `datum-${slug(rawId ?? index)}`,
      role: "datum",
      label,
      level,
      datum,
    }
  }

  if (groupField) {
    const groups = new Map<string, Datum[]>()
    for (const datum of data) {
      const key = String(datum[groupField] ?? "Uncategorized")
      const rows = groups.get(key)
      if (rows) rows.push(datum)
      else groups.set(key, [datum])
    }
    root.children = [...groups].map(([name, rows], groupIndex) => {
      const available = Math.max(0, maxLeaves - emitted)
      const shown = rows.slice(0, available)
      emitted += shown.length
      const children = shown.map((datum, index) => leaf(datum, groupIndex * 100000 + index, 3))
      if (shown.length < rows.length) {
        children.push({
          id: `more-${slug(name)}`,
          role: "datum",
          label: `…and ${rows.length - shown.length} more items`,
          level: 3,
        })
      }
      return {
        id: `group-${slug(name)}`,
        role: "series",
        label: `${name}: ${rows.length} ${rows.length === 1 ? "item" : "items"}.`,
        level: 2,
        children,
      }
    })
  } else {
    const shown = data.slice(0, maxLeaves)
    root.children = shown.map((datum, index) => leaf(datum, index, 2))
    if (shown.length < data.length) {
      root.children.push({
        id: "more",
        role: "datum",
        label: `…and ${data.length - shown.length} more items`,
        level: 2,
      })
    }
  }

  return root
}
