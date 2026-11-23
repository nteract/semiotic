import { describe, expect, it } from "vitest"
import {
  mobileBrushAlternatives,
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

describe("mobileBrushAlternatives", () => {
  it("offers touch-sized range, filter, and clear alternatives by default", () => {
    const recipe = mobileBrushAlternatives()
    expect(recipe.mobileInteraction).toMatchObject({
      enabled: true, targetSize: 44, standardControls: "brush", tapToSelect: true, tapToLockTooltip: true,
    })
    expect(recipe.controls).toEqual(["range-inputs", "chip-filter", "clear"])
    expect(recipe.mobileSemantics.interaction).toMatchObject({ primary: "filter", alternatives: recipe.controls })
  })

  it("describes the configured alternatives in order, including an explicitly empty list", () => {
    for (const controls of [["stepper", "clear"], []] as const) {
      const recipe = mobileBrushAlternatives({ controls: [...controls], targetSize: 56, summary: "Choose a date range" })
      expect(recipe.controls).toEqual(controls)
      expect(recipe.mobileInteraction.targetSize).toBe(56)
      expect(recipe.mobileSemantics.interaction).toEqual({
        primary: "filter", alternatives: controls, summary: "Choose a date range",
      })
    }
  })
})
