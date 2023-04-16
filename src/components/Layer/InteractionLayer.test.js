import React from "react"
import { render } from "@testing-library/react"
import InteractionLayer from "./InteractionLayer"
import { scaleLinear } from "d3-scale"
import { TooltipProvider } from "../store/TooltipStore"

const xyEndFunction = () => {
  //  console.info(end)
}

describe("InteractionLayer", () => {
  it("renders without crashing", () => {
    render(
      <TooltipProvider>
        <InteractionLayer />
      </TooltipProvider>
    )
  })

  it("draws an SVG", () => {
    const { container } = render(
      <TooltipProvider>
        <InteractionLayer
          margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
          size={[400, 400]}
          svgSize={[400, 400]}
          enabled={true}
          xScale={scaleLinear().domain([0, 1000]).range([0, 400])}
          yScale={scaleLinear().domain([0, 1200]).range([400, 0])}
          disableCanvas={true}
          interaction={{
            brush: "xyBrush",
            end: xyEndFunction,
            during: undefined,
            start: undefined,
            extent: [
              [550, 300],
              [600, 650]
            ]
          }}
          renderPipeline={{}}
        />
      </TooltipProvider>
    )
    expect(container.getElementsByClassName("brush").length).toEqual(1)
    expect(container.getElementsByClassName("xybrush").length).toEqual(1)
  })
})
