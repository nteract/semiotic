import React from "react"
import { mount } from "enzyme"
import InteractionLayer from "./InteractionLayer"
import { scaleLinear } from "d3-scale"
import { TooltipProvider } from "./store/TooltipStore"

const xyEndFunction = (end) => {
  //  console.info(end)
}

describe("InteractionLayer", () => {
  it("renders without crashing", () => {
    mount(
      <TooltipProvider>
        <InteractionLayer />
      </TooltipProvider>
    )
  })

  const mountedLayerWithOptions = mount(
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
  it("draws an SVG", () => {
    expect(mountedLayerWithOptions.find("svg").length).toEqual(1)
    expect(mountedLayerWithOptions.find("g.brush").length).toEqual(1)
    expect(mountedLayerWithOptions.find("g.xybrush").length).toEqual(1)
  })

  /*
  looks like d3-selection no workie
  it("a selection rectangle is drawn of the right shape", () => {
    expect(mountedLayerWithOptions.find("rect.selection").length).toEqual(5)

    expect(
      mountedLayerWithOptions.find("rect.selection").props().height
    ).toEqual(50)
  })
  */
})
