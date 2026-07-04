import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IntentMark } from "./IntentMark"

describe("IntentMark", () => {
  it("renders a visible, inspectable intent contract", () => {
    render(
      <IntentMark
        manifest={{
          ididVersion: "0.1",
          chartId: "waffle",
          title: "Waffle chart",
          intent: { primary: "part-to-whole" },
          reception: {
            channels: ["visual", "screen-reader", "agent"],
            strengths: ["memorable"],
          },
          designContract: {
            chartFamily: "XYCustomChart",
            whyThisForm: "Repeated units make composition concrete.",
          },
        }}
      />,
    )
    expect(screen.getByText(/Intent Mark · part-to-whole/)).toBeInTheDocument()
    expect(screen.getAllByText(/Repeated units make composition concrete/)).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Copy manifest" })).toBeInTheDocument()
  })
})
