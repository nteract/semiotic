import React from "react"
import { mount } from "enzyme"
import Brush from "./Brush"
import { brushX } from "d3-brush"

const extent = [0, 100]
const selectedExtent = [20, 40]
const svgBrush = brushX().extent([0, 0], [500, 500])


describe("Brush", () => {
    it("renders without crashing", () => {
        mount(<svg><Brush
            extent={extent}
            selectedExtent={selectedExtent}
            svgBrush={svgBrush}
        /></svg>)
    })

    const mountedBrush = mount(
        <svg>
            <Brush
                extent={extent}
                selectedExtent={selectedExtent}
                svgBrush={svgBrush}
            /></svg>
    )
    it("creates a g to hold the brush", () => {
        expect(mountedBrush.find("g.xybrush").length).toEqual(1)
    })
})
