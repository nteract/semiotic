import { describe, expect, it } from "vitest"
import { defineChartRecipe } from "./chartRecipes"
import { describeChart } from "./describeChart"
import { buildNavigationTree } from "./navigationTree"

const recipe = defineChartRecipe({
  id: "semiotic.recipe.waffle.description-test",
  name: "Waffle chart",
  frameFamily: "XYCustomChart",
  portability: "portable",
  layout: { id: "semiotic.layout.waffle" },
  layoutConfigSchema: { type: "object", properties: {} },
  dataRoles: [
    {
      role: "category",
      accessor: "categoryAccessor",
      semanticType: "nominal",
      required: true,
    },
    {
      role: "value",
      accessor: "valueAccessor",
      semanticType: "quantitative",
      required: true,
    },
  ],
  encodings: [
    {
      channel: "count",
      role: "value",
      meaning: "Repeated cells correspond to value",
    },
    {
      channel: "color",
      role: "category",
      meaning: "Color distinguishes categories",
      redundantWith: ["grouping", "labels"],
    },
  ],
  intents: [{ id: "part-to-whole", strength: "primary" }],
  audience: { primary: "general technical" },
  reception: {
    channels: ["visual", "screen-reader"],
    risks: ["Limited precision"],
  },
  designContract: {
    whyCustom: "Repeated units make composition memorable and concrete.",
    misuse: ["Too many categories"],
  },
  accessibility: {
    navigationGranularity: "category",
    fallbackTable: true,
  },
})

const props = {
  recipe,
  data: [
    { category: "A", value: 42, id: "a" },
    { category: "B", value: 31, id: "b" },
    { category: "C", value: 27, id: "c" },
  ],
  layoutConfig: {
    categoryAccessor: "category",
    valueAccessor: "value",
  },
}

describe("recipe-aware description", () => {
  it("uses the visual idiom and produces recipe L1-L4 instead of the raw HOC name", () => {
    const result = describeChart("XYCustomChart", props)
    expect(result.text).not.toContain("xycustom chart chart")
    expect(result.levels.l1).toMatch(/waffle chart/i)
    expect(result.levels.l2).toContain("A accounts for 42")
    expect(result.levels.l3).toContain("A and B")
    expect(result.levels.l4).toContain("part-to-whole")
    expect(result.levels.l4).toContain("general technical")
  })

  it("returns recipe caveats only when requested", () => {
    expect(describeChart("XYCustomChart", props).caveats).toBeUndefined()
    expect(
      describeChart("XYCustomChart", props, { includeCaveats: true }).caveats,
    ).toEqual(expect.arrayContaining(["Limited precision", "Misuse: Too many categories"]))
  })
})

describe("recipe navigation fallback", () => {
  it("groups by the primary categorical role and emits stable data leaves", () => {
    const tree = buildNavigationTree("XYCustomChart", props)
    expect(tree.label).toContain("Waffle chart")
    expect(tree.children).toHaveLength(3)
    expect(tree.children?.[0].label).toBe("A: 1 item.")
    expect(tree.children?.[0].children?.[0].datum).toBe(props.data[0])
  })

  it("supports a portable template strategy", () => {
    const portable = defineChartRecipe({
      ...recipe,
      id: "semiotic.recipe.waffle.navigation-template-test",
      navigation: {
        groupByRole: "category",
        itemLabelTemplate: "{category}: {value}",
        summaryTemplate: "{count} categories represented as unit groups.",
      },
    })
    const tree = buildNavigationTree("XYCustomChart", { ...props, recipe: portable })
    expect(tree.label).toBe("3 categories represented as unit groups.")
    expect(tree.children?.[0].children?.[0].label).toBe("A: 42")
  })
})
