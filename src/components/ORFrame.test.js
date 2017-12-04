import React from "react"
import { mount, shallow } from "enzyme"
import ORFrame from "./ORFrame"
import injectTapEventPlugin from "react-tap-event-plugin"
injectTapEventPlugin()

const someBarData = [
  { column: "a", cats: 15 },
  { column: "a", cats: 20 },
  { column: "b", cats: 30 },
  { column: "c", cats: 100 }
]

//Enzyme doesn't do well with context so disable it for now

describe("ORFrame", () => {
  it("renders", () => {
    mount(<ORFrame data={someBarData} disableContext={true} />)
  })

  it("renders a <Frame>", () => {
    const wrapper = shallow(
      <ORFrame data={someBarData} disableContext={true} />
    )
    expect(wrapper.find("Frame").length).toEqual(1)
  })
})
