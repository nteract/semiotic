import { afterEach, describe, expect, it } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { waffleLayout } from "../recipes/waffle"
import { ChartRecipe } from "./ChartRecipe"
import { getCapabilities } from "./chartCapabilities"
import {
  registerChartRecipe,
  registerRecipeLayout,
  unregisterChartRecipe,
  unregisterRecipeLayout,
} from "./chartRecipeRegistry"
import { defineChartRecipe } from "./chartRecipes"
import { recipeToChartCapability } from "./recipeCapability"
import { scoreChart, suggestCharts } from "./suggestCharts"

const recipe = defineChartRecipe({
  id: "semiotic.recipe.waffle.capability-test",
  name: "Waffle chart",
  frameFamily: "XYCustomChart",
  portability: "portable",
  layout: { id: "semiotic.layout.waffle" },
  layoutConfigSchema: { type: "object", properties: {} },
  dataRoles: [
    {
      role: "category",
      accessor: "categoryAccessor",
      required: true,
      semanticType: "nominal",
    },
    {
      role: "value",
      accessor: "valueAccessor",
      required: true,
      semanticType: "quantitative",
    },
  ],
  intents: [
    {
      id: "part-to-whole",
      score: 0.95,
      rationale: "Repeated units make composition concrete and memorable.",
    },
  ],
  reception: {
    channels: ["visual", "screen-reader", "agent"],
    strengths: ["memorable", "concrete"],
    risks: ["precise comparison is harder than with bars"],
    scaffolds: ["legend", "fallback-table"],
  },
  designContract: {
    whyCustom: "Repeated units make composition concrete.",
    whyNotDefault: "A bar chart loses the tangible unit metaphor.",
    defaultAlternative: "BarChart",
    caveats: ["Use fewer than nine categories."],
  },
  accessibility: {
    accessibleTable: "required",
  },
})

const data = [
  { category: "A", value: 42 },
  { category: "B", value: 31 },
  { category: "C", value: 27 },
]

afterEach(() => {
  unregisterChartRecipe(recipe.id)
  unregisterRecipeLayout("semiotic.layout.waffle")
})

describe("recipeToChartCapability", () => {
  it("preserves recipe identity, intent score, rationale, and caveats", () => {
    const capability = recipeToChartCapability(recipe)
    expect(capability.component).toBe(recipe.id)
    expect(capability.displayName).toBe("Waffle chart")
    expect(capability.candidateKind).toBe("recipe")
    expect(capability.renderingFamily).toBe("XYCustomChart")
    expect(capability.intentScores["part-to-whole"]).toBeCloseTo(4.75)
    expect(capability.positiveRationale).toContain(
      "Repeated units make composition concrete and memorable.",
    )
    expect(capability.caveats?.({} as never)).toContain(
      "precise comparison is harder than with bars",
    )
    expect(capability.caveats?.({} as never)).toContain(
      "Use fewer than nine categories.",
    )
  })

  it("registers the recipe id as a candidate, not the raw custom HOC", () => {
    registerChartRecipe(recipe)
    const components = getCapabilities().map((capability) => capability.component)
    expect(components).toContain(recipe.id)
    expect(components).not.toContain("XYCustomChart")
  })

  it("renders a portable registered recipe through the generic component", () => {
    registerChartRecipe(recipe)
    registerRecipeLayout("semiotic.layout.waffle", waffleLayout)
    const html = renderToString(
      React.createElement(ChartRecipe, {
        recipeId: recipe.id,
        data,
        layoutConfig: {
          rows: 2,
          columns: 5,
          categoryAccessor: "category",
          valueAccessor: "value",
        },
        width: 240,
        height: 120,
      }),
    )
    expect(html).toContain("<svg")
    expect(html).toContain("semiotic")
  })

  it("appears in suggestions with recipe-specific explanation", () => {
    registerChartRecipe(recipe)
    const suggestions = suggestCharts(data, {
      intent: "part-to-whole",
      allow: [recipe.id],
      includeVariants: false,
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      component: recipe.id,
      displayName: "Waffle chart",
      candidateKind: "recipe",
      recipeId: recipe.id,
    })
    expect(suggestions[0].props.layoutConfig).toMatchObject({
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    expect(suggestions[0].reasons.join(" ")).toMatch(/Why leave the catalog/)
    expect(suggestions[0].whyCustom?.defaultAlternative).toBe("BarChart")
  })

  it("scores recipes with reception and portability inputs", () => {
    registerChartRecipe(recipe)
    const result = scoreChart(recipe.id, data, {
      intent: "part-to-whole",
      receptionChannel: "agent",
      portability: "portable",
      riskTolerance: "low",
    })
    expect("score" in result).toBe(true)
    if ("score" in result) {
      expect(result.candidateKind).toBe("recipe")
      expect(result.reasons).toContain("Designed for agent reception")
      expect(result.caveats).toContain("precise comparison is harder than with bars")
    }
  })
})
