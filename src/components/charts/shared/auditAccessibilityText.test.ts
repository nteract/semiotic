import { describe, expect, it } from "vitest"
import { auditAccessibility } from "./auditAccessibility"
import {
  registerChartRecipe,
  unregisterChartRecipe
} from "../../ai/chartRecipeRegistry"
import type { ChartRecipeFrameFamily } from "../../ai/chartRecipes"

const customComponents = [
  "XYCustomChart",
  "OrdinalCustomChart",
  "NetworkCustomChart",
  "GeoCustomChart"
]
const textProps = {
  title: "Reported flights for one aircraft",
  description: "Scheduled and actual departures, ordered by UTC instant.",
  summary: "The final flight left twelve minutes late. Cause is not inferred."
}
const finding = (
  component: string,
  props: Record<string, unknown>,
  id: string
) =>
  auditAccessibility(component, props).findings.find((item) => item.id === id)

describe.each(customComponents)(
  "%s rendered accessibility text",
  (component) => {
    it.each(Object.entries(textProps))(
      "credits the direct %s prop",
      (name, value) => {
        const props = { [name]: value }
        expect(
          finding(component, props, "understandable.title-summary-caption")
            ?.status
        ).toBe("pass")
        expect(
          finding(component, props, "understandable.explain-purpose")?.status
        ).toBe(name === "title" ? "warn" : "pass")
        expect(
          finding(
            component,
            props,
            "understandable.unsupported-description-prop"
          )
        ).toBeUndefined()
      }
    )

    it("still fails when text is absent, blank or not a string", () => {
      const props = { title: "  ", description: undefined, summary: 42 }
      expect(
        finding(component, props, "understandable.title-summary-caption")
          ?.status
      ).toBe("fail")
      expect(
        finding(component, props, "understandable.explain-purpose")?.status
      ).toBe("fail")
    })
  }
)

describe("recipe renderer text contracts", () => {
  const families: ChartRecipeFrameFamily[] = [
    "XYCustomChart",
    "OrdinalCustomChart",
    "NetworkCustomChart",
    "GeoCustomChart",
    "XYFrame",
    "OrdinalFrame",
    "NetworkFrame",
    "GeoFrame",
    "Other"
  ]

  it.each(families)("checks the registered %s renderer", (frameFamily) => {
    const id = `test.accessibility-text.${frameFamily}`
    registerChartRecipe({
      id,
      name: "Reported flight sequence",
      frameFamily,
      portability: "local",
      dataRoles: [{ role: "time", semanticType: "temporal" }],
      intents: [{ id: "trend" }],
      designContract: {
        whyCustom: "Compare paired scheduled and actual instants."
      },
      accessibility: { description: "required" }
    })
    try {
      const result = auditAccessibility(id, textProps)
      expect(
        result.findings.find(
          (item) => item.id === "understandable.explain-purpose"
        )?.status
      ).toBe(frameFamily === "Other" ? "fail" : "pass")
      expect(
        result.findings.some(
          (item) => item.id === "understandable.recipe-description"
        )
      ).toBe(frameFamily === "Other")
    } finally {
      unregisterChartRecipe(id)
    }
    expect(
      finding(id, textProps, "understandable.explain-purpose")?.status
    ).toBe("fail")
  })

  it.each(["MysteryChart", "XYFrame", "BigNumber"])(
    "does not credit unsupported text on %s",
    (component) => {
      const props =
        component === "BigNumber"
          ? { title: textProps.title }
          : { description: textProps.description, summary: textProps.summary }
      expect(
        finding(component, props, "understandable.explain-purpose")?.status
      ).toBe("fail")
      expect(
        finding(component, props, "understandable.unsupported-description-prop")
          ?.status
      ).toBe("warn")
    }
  )
})
