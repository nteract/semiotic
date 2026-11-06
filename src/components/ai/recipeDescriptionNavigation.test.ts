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
  it("retains numeric totals and percentage shares when the locale is invalid", () => {
    const result = describeChart("XYCustomChart", props, { locale: "invalid_locale" })
    expect(result).toEqual(describeChart("XYCustomChart", props, { locale: "en" }))
    expect(result.levels.l2).toContain("A accounts for 42 (42%)")
  })

  it("uses the correct article for a recipe name", () => {
    const result = describeChart("XYCustomChart", { ...props, recipe: { ...recipe, name: "Arc matrix" } })
    expect(result.levels.l1).toMatch(/^An arc matrix encodes/)
  })

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

  it("aggregates categories before identifying their shares", () => {
    const result = describeChart("XYCustomChart", {
      ...props,
      data: [
        { category: "A", value: 3 },
        { category: "B", value: 5 },
        { category: "A", value: 4 }
      ]
    })
    expect(result.levels.l2).toContain("2 categories total 12")
    expect(result.levels.l2).toContain("A accounts for 7 (58.3%)")
    expect(result.levels.l3).toContain("A and B")
  })

  it.each([
    [100, -60, 10],
    [10, -10, 5]
  ])("withholds recipe shares for negative input, including cancellation: %s", (a, b, c) => {
    const result = describeChart("XYCustomChart", {
      ...props,
      data: [
        { category: "A", value: a },
        { category: "A", value: b },
        { category: "B", value: c }
      ]
    })
    expect(result.levels.l2).toContain("Negative values")
    expect(result.levels.l3).toContain("prevent a part-to-whole concentration claim")
    expect(result.text).not.toMatch(/\d+%/)
  })

  it("reports tied shares without picking an arbitrary leading pair", () => {
    const result = describeChart("XYCustomChart", {
      ...props,
      data: ["A", "B", "C"].map(category => ({ category, value: 10 }))
    })
    expect(result.levels.l2).toContain("A, B and C tie at 10 (33.3% each)")
    expect(result.levels.l3).toContain("A, B and C tie for the largest share")
    expect(result.text).not.toContain("concentrated in A and B")
  })

  it("does not call exactly half of the total a majority", () => {
    const result = describeChart("XYCustomChart", {
      ...props,
      data: [12, 8, 7, 7, 6].map((value, index) => ({ category: String(index), value }))
    })
    expect(result.levels.l2).toContain("5 categories total 40")
    expect(result.levels.l3).toContain("without the first two forming a majority")
    expect(result.levels.l3).not.toContain("Most of the total")
  })

  it("avoids shares and leaders when every category is zero", () => {
    const result = describeChart("XYCustomChart", {
      ...props,
      data: ["A", "B"].map(category => ({ category, value: 0 }))
    })
    expect(result.levels.l2).toContain("All categories are zero")
    expect(result.text).not.toMatch(/accounts for|\d+%/)
  })
})

describe("recipe navigation fallback", () => {
  it("uses safe labels for malformed categories and honors own prototype-named template fields", () => {
    const portable = defineChartRecipe({
      ...recipe,
      navigation: {
        groupByRole: "category",
        itemLabelTemplate: "{category}: {value}; {__proto__}; {toString}",
      },
    })
    const datum = { category: Object.create(null), value: 7 }
    const protoLikeField = "__proto__"
    Object.defineProperty(datum, protoLikeField, {
      value: "own field",
      enumerable: true,
      writable: true,
      configurable: true,
    })
    const malformed = {
      ...props,
      recipe: portable,
      data: [datum],
    }
    expect(describeChart("XYCustomChart", malformed).levels.l2)
      .toContain("Uncategorized accounts for 7")
    const tree = buildNavigationTree("XYCustomChart", malformed)
    expect(tree.children?.[0].children?.[0].label)
      .toBe("{category}: 7; own field; {toString}")
  })

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
