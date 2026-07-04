import type { ChartCapability } from "./chartCapabilityTypes"
import type { ChartRecipe, CustomLayoutFunction } from "./chartRecipes"
import { validateChartRecipe } from "./chartRecipes"
import { recipeToChartCapability } from "./recipeCapability"

interface ChartRecipeRegistryStore {
  recipes: Map<string, ChartRecipe>
  capabilities: Map<string, ChartCapability>
  layouts: Map<string, CustomLayoutFunction>
}

const REGISTRY_KEY = Symbol.for("semiotic.chartRecipeRegistry")

function store(): ChartRecipeRegistryStore {
  const root = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: ChartRecipeRegistryStore
  }
  if (!root[REGISTRY_KEY]) {
    root[REGISTRY_KEY] = {
      recipes: new Map(),
      capabilities: new Map(),
      layouts: new Map(),
    }
  }
  return root[REGISTRY_KEY]
}

/** Register or replace a named recipe and its capability adapter. */
export function registerChartRecipe(recipe: ChartRecipe): void {
  validateChartRecipe(recipe)
  store().recipes.set(recipe.id, recipe)
  store().capabilities.set(recipe.id, recipeToChartCapability(recipe))
}

export function unregisterChartRecipe(recipeId: string): void {
  store().recipes.delete(recipeId)
  store().capabilities.delete(recipeId)
}

export function getChartRecipe(recipeId: string): ChartRecipe | undefined {
  return store().recipes.get(recipeId)
}

export function listChartRecipes(): ChartRecipe[] {
  return Array.from(store().recipes.values())
}

export function getRegisteredRecipeCapabilities(): ReadonlyArray<ChartCapability> {
  return Array.from(store().capabilities.values())
}

/** Register a known runtime implementation used by portable recipe manifests. */
export function registerRecipeLayout(
  layoutId: string,
  layout: CustomLayoutFunction,
): void {
  if (!layoutId) throw new Error("Recipe layout requires a non-empty id.")
  if (typeof layout !== "function") {
    throw new Error(`Recipe layout "${layoutId}" must be a function.`)
  }
  store().layouts.set(layoutId, layout)
}

export function unregisterRecipeLayout(layoutId: string): void {
  store().layouts.delete(layoutId)
}

export function getRecipeLayout(
  layoutId: string,
): CustomLayoutFunction | undefined {
  return store().layouts.get(layoutId)
}

export function resolveChartRecipe(
  value: unknown,
): ChartRecipe | undefined {
  if (typeof value === "string") return getChartRecipe(value)
  if (value && typeof value === "object" && typeof (value as ChartRecipe).id === "string") {
    return value as ChartRecipe
  }
  return undefined
}
