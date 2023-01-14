import React from "react"
import { render } from "@testing-library/react"
import TooltipPositioner from "./"

describe("tooltipPositioner", () => {
  const MockDiv = () => <div id="mock-tooltip-div" />
  it("renders", () => {
    const res = render(<TooltipPositioner tooltipContent={MockDiv} />)
    const renderedTooltip = res.getByTestId("TooltipPositioner")
    expect(renderedTooltip).toBeInTheDocument()
  })
})
