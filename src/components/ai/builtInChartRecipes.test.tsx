import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import Ajv2020 from "ajv/dist/2020.js"
import { describe, expect, it } from "vitest"
import { ChartRecipe } from "./ChartRecipe"
import {
  BUILT_IN_CHART_RECIPES,
  CALENDAR_HEATMAP_LAYOUT_ID,
  CALENDAR_HEATMAP_RECIPE_ID,
  PARALLEL_COORDINATES_LAYOUT_ID,
  PARALLEL_COORDINATES_RECIPE_ID,
  generateBuiltInRecipeSchemaTools,
  registerBuiltInChartRecipeManifests
} from "./builtInChartRecipes"
import {
  listChartRecipes,
  unregisterRecipeLayout
} from "./chartRecipeRegistry"
import { suggestCharts } from "./suggestCharts"

const vehicleData = [
  {
    id: 101,
    mpg: 32,
    horsepower: 88,
    weight: 2100,
    acceleration: 16,
    origin: "EU"
  },
  {
    id: 102,
    mpg: 18,
    horsepower: 155,
    weight: 3400,
    acceleration: 11,
    origin: "US"
  },
  {
    id: 103,
    mpg: 25,
    horsepower: 110,
    weight: 2700,
    acceleration: 14,
    origin: "JP"
  }
]

const dailyData = [
  { date: "2026-01-01", count: 4 },
  { date: "2026-01-02", count: 9 },
  { date: "2026-01-03", count: 2 }
]

describe("built-in chart recipes", () => {
  it("registers exactly the two schema-backed pilot recipes", () => {
    registerBuiltInChartRecipeManifests()
    const ids = listChartRecipes().map((recipe) => recipe.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        PARALLEL_COORDINATES_RECIPE_ID,
        CALENDAR_HEATMAP_RECIPE_ID
      ])
    )
    expect(BUILT_IN_CHART_RECIPES).toHaveLength(2)
    expect(generateBuiltInRecipeSchemaTools()).toHaveLength(2)
  })

  it("accepts valid serialized props and rejects incomplete recipe configs", () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    const tools = generateBuiltInRecipeSchemaTools()
    const parallelSchema = tools.find(
      (tool) => tool.function.name === PARALLEL_COORDINATES_RECIPE_ID
    )?.function.parameters
    const calendarSchema = tools.find(
      (tool) => tool.function.name === CALENDAR_HEATMAP_RECIPE_ID
    )?.function.parameters

    expect(parallelSchema).toBeDefined()
    expect(calendarSchema).toBeDefined()
    expect(
      ajv.validate(parallelSchema!, {
        data: vehicleData,
        layoutConfig: { fields: ["mpg", "horsepower", "weight"] },
        title: "Vehicle profiles",
        description: "Profiles across three measures.",
        summary: "No vehicle dominates every measure.",
        accessibleTable: true
      })
    ).toBe(true)
    expect(
      ajv.validate(calendarSchema!, {
        data: dailyData,
        layoutConfig: { dateAccessor: "date" },
        title: "Daily activity",
        description: "Activity by calendar day.",
        summary: "January 2 is highest."
      })
    ).toBe(false)
  })

  it("derives a multi-field parallel-coordinates config in suggestions", () => {
    registerBuiltInChartRecipeManifests()
    const [suggestion] = suggestCharts(vehicleData, {
      intent: "correlation",
      allow: [PARALLEL_COORDINATES_RECIPE_ID],
      includeVariants: false
    })

    expect(suggestion).toMatchObject({
      component: PARALLEL_COORDINATES_RECIPE_ID,
      candidateKind: "recipe",
      recipeId: PARALLEL_COORDINATES_RECIPE_ID,
      propContract: { componentKind: "chart-recipe" }
    })
    expect(suggestion.props.layoutConfig).toMatchObject({
      fields: ["mpg", "horsepower", "weight", "acceleration"],
      colorBy: "origin"
    })
  })

  it("does not mistake ordinary fields ending in lowercase id for identifiers", () => {
    registerBuiltInChartRecipeManifests()
    const [suggestion] = suggestCharts(
      [
        { userId: "a", paid: 12, valid: 8, hybrid: "alpha" },
        { userId: "b", paid: 18, valid: 5, hybrid: "beta" },
        { userId: "c", paid: 15, valid: 9, hybrid: "alpha" }
      ],
      {
        intent: "correlation",
        allow: [PARALLEL_COORDINATES_RECIPE_ID],
        includeVariants: false
      }
    )

    expect(suggestion.props.layoutConfig).toMatchObject({
      fields: ["paid", "valid"],
      colorBy: "hybrid"
    })
  })

  it("derives calendar date/value accessors in suggestions", () => {
    registerBuiltInChartRecipeManifests()
    const [suggestion] = suggestCharts(dailyData, {
      intent: "trend",
      allow: [CALENDAR_HEATMAP_RECIPE_ID],
      includeVariants: false
    })

    expect(suggestion).toMatchObject({
      component: CALENDAR_HEATMAP_RECIPE_ID,
      recipeId: CALENDAR_HEATMAP_RECIPE_ID,
      props: {
        layoutConfig: {
          dateAccessor: "date",
          valueAccessor: "count"
        }
      }
    })
  })

  it("renders both portable manifests through the generic ChartRecipe component", () => {
    registerBuiltInChartRecipeManifests()
    unregisterRecipeLayout(PARALLEL_COORDINATES_LAYOUT_ID)
    unregisterRecipeLayout(CALENDAR_HEATMAP_LAYOUT_ID)

    const parallel = renderToStaticMarkup(
      <ChartRecipe
        recipeId={PARALLEL_COORDINATES_RECIPE_ID}
        data={vehicleData}
        layoutConfig={{
          fields: ["mpg", "horsepower", "weight", "acceleration"],
          colorBy: "origin"
        }}
        width={480}
        height={260}
        title="Vehicle profiles"
      />
    )
    const calendar = renderToStaticMarkup(
      <ChartRecipe
        recipeId={CALENDAR_HEATMAP_RECIPE_ID}
        data={dailyData}
        layoutConfig={{
          dateAccessor: "date",
          valueAccessor: "count",
          year: 2026
        }}
        width={600}
        height={140}
        title="Daily activity"
      />
    )

    expect(parallel).toContain("<svg")
    expect(parallel).toContain("Vehicle profiles")
    expect(calendar).toContain("<svg")
    expect(calendar).toContain("Daily activity")
  })
})
