import { describe, expect, it } from "vitest"
import {
  mobileChartFamilyRecipe,
  mobileGeoChartRecipe,
  mobileOrdinalChartRecipe,
} from "./mobileChartFamilyRecipes"

describe("mobile chart family recipes", () => {
  it("keeps base props desktop-safe and moves mobile behavior into responsiveRules", () => {
    const recipe = mobileChartFamilyRecipe("line")

    expect(recipe.props).not.toHaveProperty("mode")
    expect(recipe.props).not.toHaveProperty("mobileInteraction")
    expect(recipe.props).not.toHaveProperty("mobileSemantics")
    expect(recipe.responsiveRules[0].transform).toMatchObject({
      mode: "mobile",
      mobileInteraction: recipe.mobileInteraction,
      mobileSemantics: recipe.mobileSemantics,
    })
  })

  it("does not emit phantom ordinal direct-label props", () => {
    const recipe = mobileOrdinalChartRecipe({ transformProfile: "compare" })

    expect(recipe.props).not.toHaveProperty("directLabel")
    expect(recipe.props).not.toHaveProperty("labelStrategy")
    expect(recipe.props.sort).toBe("desc")
  })

  it("does not emit generic geo props that only some geo charts understand", () => {
    const recipe = mobileGeoChartRecipe({ density: "dense", transformProfile: "inspect" })

    expect(recipe.props).not.toHaveProperty("projectionScale")
    expect(recipe.props).not.toHaveProperty("simplify")
    expect(recipe.props).not.toHaveProperty("showLabels")
    expect(recipe.props).not.toHaveProperty("legendPosition")
  })
})
