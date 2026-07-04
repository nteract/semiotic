"use client"
import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { XYCustomChart } from "../charts/custom/XYCustomChart"
import { OrdinalCustomChart } from "../charts/custom/OrdinalCustomChart"
import { NetworkCustomChart } from "../charts/custom/NetworkCustomChart"
import { GeoCustomChart } from "../charts/custom/GeoCustomChart"
import type {
  ChartRecipe as ChartRecipeDefinition,
  CustomLayoutFunction,
} from "./chartRecipes"
import { isRegisteredRecipeLayout } from "./chartRecipes"
import {
  getChartRecipe,
  getRecipeLayout,
  resolveChartRecipe,
} from "./chartRecipeRegistry"

export type ChartRecipe = ChartRecipeDefinition

export interface ChartRecipeProps extends Datum {
  recipeId?: string
  recipe?: ChartRecipeDefinition
  layoutConfig?: Record<string, unknown>
  chartId?: string
  className?: string
}

function runtimeLayout(
  recipe: ChartRecipeDefinition,
): CustomLayoutFunction | undefined {
  if (typeof recipe.layout === "function") return recipe.layout
  if (isRegisteredRecipeLayout(recipe.layout)) {
    return getRecipeLayout(recipe.layout.id)
  }
  return undefined
}

/**
 * Render a registered recipe config. Portable recipes resolve their layout by
 * registered id; local recipes may carry the function in their manifest.
 */
export function ChartRecipe(props: ChartRecipeProps): React.ReactElement {
  const recipe =
    resolveChartRecipe(props.recipe) ??
    (props.recipeId ? getChartRecipe(props.recipeId) : undefined)
  if (!recipe) {
    throw new Error(
      `Unknown chart recipe "${props.recipeId ?? "(missing recipeId)"}". Register it before rendering.`,
    )
  }
  const layout = runtimeLayout(recipe)
  if (!layout) {
    const id = isRegisteredRecipeLayout(recipe.layout)
      ? recipe.layout.id
      : recipe.id
    throw new Error(
      `No runtime layout registered for chart recipe "${recipe.id}" (${id}).`,
    )
  }

  const recipeClassName = `semiotic-chart-recipe semiotic-chart-recipe-${recipe.id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`
  const componentProps = {
    ...props,
    chartId: props.chartId ?? recipe.id,
    className: props.className
      ? `${recipeClassName} ${props.className}`
      : recipeClassName,
    recipeId: recipe.id,
    recipe,
    layout,
  }
  const Component =
    recipe.frameFamily === "XYFrame" || recipe.frameFamily === "XYCustomChart"
      ? XYCustomChart
      : recipe.frameFamily === "OrdinalFrame" ||
          recipe.frameFamily === "OrdinalCustomChart"
        ? OrdinalCustomChart
        : recipe.frameFamily === "NetworkFrame" ||
            recipe.frameFamily === "NetworkCustomChart"
          ? NetworkCustomChart
          : recipe.frameFamily === "GeoFrame" ||
              recipe.frameFamily === "GeoCustomChart"
            ? GeoCustomChart
            : undefined

  if (!Component) {
    throw new Error(
      `Chart recipe "${recipe.id}" uses unsupported frame family "${recipe.frameFamily}".`,
    )
  }
  const RenderComponent = Component as unknown as React.ComponentType<
    Record<string, unknown>
  >
  return React.createElement(RenderComponent, componentProps)
}
