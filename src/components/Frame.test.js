import React from "react"
import { render } from "@testing-library/react"
import Frame from "./Frame"

const frameWidth = 100
const frameHeight = 200

const frameProps = {
  size: [frameWidth, frameHeight],
  disableContext: true
}

describe("Frame", () => {
  it("renders without crashing", () => {
    render(<Frame {...frameProps} />)
  })
})
