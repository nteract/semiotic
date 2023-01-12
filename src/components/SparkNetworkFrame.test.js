import React from "react"
import { render } from "@testing-library/react"
import { SparkNetworkFrame } from "./SparkNetworkFrame"

const settings = {
  size: [500, 500]
}

describe("SparkNetworkFrame", () => {
  it("renders without crashing", () => {
    render(<SparkNetworkFrame {...settings} />)
  })
})
