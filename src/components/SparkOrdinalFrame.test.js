import React from "react"
import { render } from "@testing-library/react"
import { SparkOrdinalFrame } from "./SparkOrdinalFrame"

const settings = {
  size: [500, 500]
}

describe("SparkOrdinalFrame", () => {
  it("renders without crashing", () => {
    render(<SparkOrdinalFrame {...settings} />)
  })
})
