import { describe, expect, it } from "vitest"
import { styleFromColorAccessor } from "./physicsChartShared"

describe("styleFromColorAccessor", () => {
  it("layers declarative rules over the colorBy-derived particle style", () => {
    const bodyStyle = styleFromColorAccessor("outcome", "#2563eb", {
      styleRules: [
        {
          when: { field: "outcome", eq: "accepted" },
          style: { fill: "#57c7b7", stroke: "#f0e7cf" }
        },
        {
          when: { field: "value", gte: 10 },
          style: { strokeWidth: 2 }
        }
      ],
      valueAccessor: "value"
    })

    expect(
      bodyStyle({
        datum: { id: "accepted-route", outcome: "accepted", value: 12 }
      })
    ).toMatchObject({
      fill: "#57c7b7",
      stroke: "#f0e7cf",
      strokeWidth: 2
    })
  })
})
