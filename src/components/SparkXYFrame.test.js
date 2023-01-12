import React from "react"
import { SparkXYFrame } from "./SparkXYFrame"
import { render } from "@testing-library/react"

const settings = {
  size: [500, 500]
}

describe("SparkXYFrame", () => {
  it("renders without crashing", () => {
    render(<SparkXYFrame {...settings} />)
  })
})
