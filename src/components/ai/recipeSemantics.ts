import type { Datum } from "../charts/shared/datumTypes"
import type {
  ChartRecipe,
  DataRoleDefinition,
  IntentDefinition,
} from "./chartRecipes"
import { getChartRecipe, resolveChartRecipe } from "./chartRecipeRegistry"

export function recipeIntentId(intent: IntentDefinition): string | undefined {
  return typeof intent === "string" ? intent : intent.id ?? intent.name
}

export function recipeConfig(props: Datum): Record<string, unknown> {
  return props.layoutConfig && typeof props.layoutConfig === "object"
    ? (props.layoutConfig as Record<string, unknown>)
    : {}
}

export function recipeData(props: Datum): Datum[] {
  if (Array.isArray(props.data)) return props.data as Datum[]
  if (Array.isArray(props.nodes)) return props.nodes as Datum[]
  if (Array.isArray(props.points)) return props.points as Datum[]
  if (Array.isArray(props.areas)) return props.areas as Datum[]
  return []
}

export function resolveRecipeForChart(
  component: string,
  props: Datum,
  explicit?: ChartRecipe,
): ChartRecipe | undefined {
  return (
    explicit ??
    resolveChartRecipe(props.recipe) ??
    resolveChartRecipe(props.recipeId) ??
    getChartRecipe(component)
  )
}

export function fieldForRole(
  role: DataRoleDefinition,
  config: Record<string, unknown>,
  data: ReadonlyArray<Datum> = [],
): string | undefined {
  const configured = role.accessor ? config[role.accessor] : undefined
  if (typeof configured === "string" && configured) return configured
  if (role.field) return role.field

  const sample = data.find((row) => row && typeof row === "object")
  if (!sample) return undefined
  const entries = Object.entries(sample).filter(
    ([key, value]) => !key.startsWith("_") && value != null,
  )
  if (role.semanticType === "quantitative") {
    return entries.find(([, value]) => typeof value === "number")?.[0]
  }
  if (role.semanticType === "identifier") {
    return ["id", "key", "name"].find((key) => key in sample)
  }
  return entries.find(([, value]) => typeof value === "string")?.[0]
}

export function roleByName(
  recipe: ChartRecipe,
  name: string,
): DataRoleDefinition | undefined {
  return recipe.dataRoles.find((role) => role.role === name)
}

export function firstRole(
  recipe: ChartRecipe,
  semanticTypes: DataRoleDefinition["semanticType"][],
): DataRoleDefinition | undefined {
  return recipe.dataRoles.find((role) => semanticTypes.includes(role.semanticType))
}

export function roleValue(
  datum: Datum,
  role: DataRoleDefinition | undefined,
  config: Record<string, unknown>,
  data: ReadonlyArray<Datum>,
): unknown {
  if (!role) return undefined
  const field = fieldForRole(role, config, data)
  return field ? datum[field] : undefined
}

export function fillRecipeTemplate(
  template: string,
  datum: Datum | undefined,
  recipe: ChartRecipe,
  config: Record<string, unknown>,
  data: ReadonlyArray<Datum>,
  extra: Record<string, string | number> = {},
): string {
  const values: Record<string, unknown> = { ...extra }
  if (datum) {
    for (const [key, value] of Object.entries(datum)) values[key] = value
  }
  for (const role of recipe.dataRoles) {
    const field = fieldForRole(role, config, data)
    const value = datum && field ? datum[field] : field
    if (value !== undefined) values[role.role] = value
  }
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = values[key]
    return value == null ? `{${key}}` : String(value)
  })
}
