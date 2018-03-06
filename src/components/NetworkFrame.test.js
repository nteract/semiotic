import React from "react"
import { mount, shallow } from "enzyme"
import NetworkFrame from "./NetworkFrame"

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
  const wrapper = shallow(
    <NetworkFrame edges={someEdgeData} disableContext={true} />
  )

  it("renders a <Frame>", () => {
    expect(wrapper.find("Frame").length).toEqual(1)
  })

  it("renders some edges", () => {
    const mountedFrame = mount(
      <NetworkFrame edges={someEdgeData} disableContext={true} />
    )

    expect(mountedFrame.find("g.edge").length).toEqual(3)
  })
})
