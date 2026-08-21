import * as React from "react"
import { render } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import { MarginalGraphics } from "./MarginalGraphics"
import {
  collectMarginalValues,
  MarginalGraphicsLazy,
  provideMarginalGraphics,
} from "./MarginalGraphicsLazy"

describe("MarginalGraphicsLazy", () => {
  it("collectMarginalValues keeps finite numeric x/y", () => {
    const { xValues, yValues } = collectMarginalValues(
      [{ x: 1, y: 2 }, { x: Number.NaN, y: 3 }, { x: 4, y: "skip" }],
      "x",
      "y",
    )
    expect(xValues).toEqual([1, 4])
    expect(yValues).toEqual([2, 3])
  })

  it("paints on the first render after provideMarginalGraphics", () => {
    provideMarginalGraphics(MarginalGraphics)
    const { container } = render(
      <svg>
        <MarginalGraphicsLazy
          orient="top"
          config={{ type: "histogram" }}
          values={Array.from({ length: 20 }, (_, i) => i)}
          scale={scaleLinear().domain([0, 20]).range([0, 200])}
          size={40}
          length={200}
        />
      </svg>,
    )
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0)
  })
})