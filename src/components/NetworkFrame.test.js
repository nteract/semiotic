import React from "react"
import { mount, shallow } from "enzyme"
import NetworkFrame from "./NetworkFrame"
import injectTapEventPlugin from "react-tap-event-plugin"
injectTapEventPlugin()

const someEdgeData = [
  { source: "Heathcliff", target: "Garfield" },
  { source: "Fexix", target: "Tom" },
  { source: "Bill", target: "Hobbes" }
]

//Enzyme doesn't do well with context so disable it for now

describe("NetworkFrame", () => {
  it("renders", () => {
    mount(<NetworkFrame edges={someEdgeData} disableContext={true} />)
  })

  it("renders a <Frame>", () => {
    const wrapper = shallow(
      <NetworkFrame edges={someEdgeData} disableContext={true} />
    )
    expect(wrapper.find("Frame").length).toEqual(1)
  })
})
