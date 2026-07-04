import { describe, expect, it } from "vitest"
import { waffleRecipeManifest } from "../custom-charts/waffleRecipeManifest"
import { URINE_NODES } from "./data/urineWheel"
import { urineWheelRecipeManifest } from "./urineWheelRecipeManifest"

describe("custom chart recipe manifests", () => {
  it("describes and navigates a waffle by semantic category rather than cell", () => {
    const data = [
      { region: "AMER", share: 42 },
      { region: "EMEA", share: 28 },
      { region: "APAC", share: 18 },
      { region: "LATAM", share: 12 },
    ]
    const config = {
      rows: 10,
      columns: 10,
      categoryAccessor: "region",
      valueAccessor: "share",
    }

    const description = waffleRecipeManifest.description({ data, config })
    const navigation = waffleRecipeManifest.navigation({ data, config })

    expect(description.levels.l1).toContain("100-cell waffle chart")
    expect(description.levels.l4).toContain("apportioning")
    expect(navigation.children).toHaveLength(4)
    expect(navigation.children[0].label).toContain("42 of 100 cells")
  })

  it("makes the Urine Wheel's situated idiom and grouped reading explicit", () => {
    const description = urineWheelRecipeManifest.description({
      data: URINE_NODES,
      config: {},
    })
    const navigation = urineWheelRecipeManifest.navigation({
      data: URINE_NODES,
      config: {},
    })

    expect(description.levels.l1).toContain("20 named urine colors")
    expect(description.levels.l1).toContain("7 stages of digestion")
    expect(description.levels.l4).toContain("situated explanatory chart")
    expect(navigation.children[0].children).toHaveLength(20)
    expect(navigation.children[1].children).toHaveLength(7)
  })
})
