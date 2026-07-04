import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { waffleLayout } from "../recipes/waffle"
import { defineChartRecipe, type ChartRecipe } from "./chartRecipes"

interface WaffleRow extends Datum {
  category: string
  value: number
}

interface WaffleConfig {
  rows?: number
  columns?: number
}

describe("defineChartRecipe", () => {
  it("returns the same recipe object without hidden registration or mutation", () => {
    const recipe: ChartRecipe<WaffleRow, WaffleConfig> = {
      id: "semiotic.recipe.waffle.test",
      name: "Waffle chart",
      frameFamily: "XYCustomChart",
      portability: "local",
      dataRoles: [
        {
          role: "category",
          field: "category",
          required: true,
          semanticType: "nominal",
        },
        {
          role: "value",
          field: "value",
          required: true,
          semanticType: "quantitative",
        },
      ],
      intents: ["part-to-whole"],
      designContract: {
        whyCustom: "Repeated units make composition concrete.",
      },
      accessibility: {
        keyboardNavigation: "required",
        navigationGranularity: "category",
      },
    }

    expect(defineChartRecipe(recipe)).toBe(recipe)
  })

  it("accepts optional reception, encoding, description, and navigation semantics", () => {
    const recipe = defineChartRecipe<WaffleRow, WaffleConfig>({
      id: "semiotic.recipe.waffle.complete-test",
      name: "Waffle chart",
      version: "0",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: "semiotic.layout.waffle" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [
        {
          role: "category",
          field: "category",
          required: true,
          semanticType: "nominal",
        },
      ],
      encodings: [
        {
          channel: "count",
          role: "value",
          meaning: "Each unit represents one normalized share.",
        },
      ],
      intents: [
        {
          id: "part-to-whole",
          strength: "primary",
          rationale: "The unit count shows composition.",
        },
      ],
      reception: {
        channels: ["visual", "screen-reader", "agent"],
        strengths: ["memorable"],
        risks: ["false precision"],
      },
      designContract: {
        whyCustom: "Repeated units make composition concrete.",
        misuse: ["too many units"],
      },
      accessibility: {
        accessibleTable: "required",
        navigationGranularity: "category",
      },
      description: () => ({
        text: "A waffle chart.",
        levels: { l1: "A waffle chart." },
      }),
      navigation: () => ({
        id: "root",
        role: "chart",
        label: "A waffle chart.",
        level: 1,
      }),
    })

    expect(recipe.layout).toEqual({ id: "semiotic.layout.waffle" })
    expect(recipe.reception?.channels).toContain("agent")
    expect(recipe.description?.({ data: [], config: {} }).levels?.l1).toBe("A waffle chart.")
  })

  it("rejects recipes without an id or data roles", () => {
    expect(() =>
      defineChartRecipe({
        name: "Missing id",
        frameFamily: "Other",
        portability: "local",
        dataRoles: [{ role: "value", semanticType: "quantitative" }],
        intents: ["explanation"],
        designContract: { whyCustom: "Test" },
        accessibility: {},
      } as unknown as ChartRecipe),
    ).toThrow(/non-empty id/)

    expect(() =>
      defineChartRecipe({
        id: "local.recipe.no-roles",
        name: "Missing roles",
        frameFamily: "Other",
        portability: "local",
        dataRoles: [],
        intents: ["explanation"],
        designContract: { whyCustom: "Test" },
        accessibility: {},
      }),
    ).toThrow(/at least one data role/)
  })

  it("requires portable recipes to use a registered layout and JSON-safe schema", () => {
    const base = {
      id: "semiotic.recipe.portable-test",
      name: "Portable test",
      frameFamily: "XYCustomChart" as const,
      portability: "portable" as const,
      dataRoles: [{ role: "value", semanticType: "quantitative" as const }],
      intents: ["explanation"],
      designContract: { whyCustom: "Test portability." },
      accessibility: {},
    }
    expect(() =>
      defineChartRecipe({
        ...base,
        layout: waffleLayout,
        layoutConfigSchema: { type: "object" },
      }),
    ).toThrow(/registered layout/)
    expect(() =>
      defineChartRecipe({
        ...base,
        layout: { id: "semiotic.layout.test" },
        layoutConfigSchema: { validate: () => true },
      }),
    ).toThrow(/not JSON-safe/)
  })

  it("accepts an existing typed Semiotic custom layout without an adapter", () => {
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.waffle.layout-test",
      name: "Waffle chart",
      frameFamily: "XYCustomChart",
      portability: "local",
      layout: waffleLayout,
      dataRoles: [
        {
          role: "category",
          accessor: "categoryAccessor",
          semanticType: "nominal",
        },
      ],
      intents: ["part-to-whole"],
      designContract: {
        whyCustom: "Repeated units make composition concrete.",
      },
      accessibility: {
        navigationGranularity: "category",
      },
    })

    expect(recipe.layout).toBe(waffleLayout)
  })
})
