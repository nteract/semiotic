import React from "react"
import Brush from "./Brush"
import { brushX } from "d3-brush"
import { render } from "@testing-library/react"

const extent = [0, 100]
const selectedExtent = [20, 40]
const svgBrush = brushX().extent([0, 0], [500, 500])


describe("Brush", () => {
    it("renders without crashing", () => {
        render(<svg><Brush
            extent={extent}
            selectedExtent={selectedExtent}
            svgBrush={svgBrush}
        /></svg>)
    })

    it("creates a g to hold the brush", () => {
            const { container } = render(
              <svg>
                <Brush
                  extent={extent}
                  selectedExtent={selectedExtent}
                  svgBrush={svgBrush}
                />
              </svg>
            )
        const brushG = container.getElementsByClassName("xybrush")[0]
        expect(brushG).toBeTruthy()
    })
})
