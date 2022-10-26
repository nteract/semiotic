import React from "react"
import DividedLine from "./DividedLine"
import { curveBasis } from "d3-shape"
import { render } from "@testing-library/react"
import "@testing-library/jest-dom"

function parameters(point) {
    if (point.x < 100)
        return {
            fill: "none",
            stroke: "#b3331d",
            strokeWidth: 6,
            strokeOpacity: 1
        }

    return { fill: "none", stroke: "black", strokeWidth: 1 }
}

describe("DividedLine", () => {
    it("renders without crashing", () => {
        render(
          <svg>
            <DividedLine
              parameters={parameters}
              data={[
                [
                  { x: 0, y: 0 },
                  { x: 1000, y: 1000 }
                ]
              ]}
              lineDataAccessor={(d) => d}
              customAccessors={{ x: (d) => d.x, y: (d) => d.y }}
              interpolate={curveBasis}
              searchIterations={20}
            />
          </svg>
        )
    })

})
