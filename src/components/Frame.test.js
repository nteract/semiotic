import React from "react"
import { mount /*, shallow*/ } from "enzyme"
import Frame from "./Frame"

const frameWidth = 100
const frameHeight = 200

const frameProps = {
  size: [frameWidth, frameHeight],
  disableContext: true
}

describe("Frame", () => {
  it("renders without crashing", () => {
    mount(<Frame {...frameProps} />)
  })
  //  const shallowFrame = shallow(<Frame {...frameProps} className="test-class" />)
})
