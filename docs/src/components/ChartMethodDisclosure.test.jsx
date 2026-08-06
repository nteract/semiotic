import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ChartMethodDisclosure, { chartRecipeDisclosure } from "./ChartMethodDisclosure"

const recipe = {
  intents: [{ id: "explanation", strength: "primary", rationale: "Explain movement" }],
  reception: { strengths: ["sequence"], risks: ["false certainty"] },
  designContract: {
    whyCustom: "Movement matters",
    whyThisForm: "Ribbons preserve movement",
    whyNotDefault: "A pie hides origins",
  },
}

describe("ChartMethodDisclosure", () => {
  it("projects the canonical ChartRecipe fields", () => {
    expect(chartRecipeDisclosure(recipe)).toMatchObject({
      primary: "Explain movement",
      strengths: ["sequence"],
      risks: ["false certainty"],
    })
    render(<ChartMethodDisclosure recipe={recipe} />)
    expect(screen.getByText("Ribbons preserve movement")).toBeTruthy()
    expect(screen.getByText("A pie hides origins")).toBeTruthy()
  })

  it("renders compact shows / does-not-show disclosure", () => {
    render(
      <ChartMethodDisclosure
        inline
        shows="observed overlap"
        doesNotShow="causal influence"
      />,
    )
    expect(screen.getByText(/observed overlap/)).toBeTruthy()
    expect(screen.getByText(/causal influence/)).toBeTruthy()
  })
})
