import React from "react"
import { mount } from "enzyme"
import TooltipPositioner from "./"

describe("tooltipPositioner", () => {
  const MockDiv = () => <div id="mock-tooltip-div" />
  it("renders", () => {
    const res = mount(<TooltipPositioner tooltipContent={MockDiv} />)
    const mountedTooltip = res.find("TooltipPositioner")
    expect(mountedTooltip.length).toBe(1)
  })
})
