import React from "react"
import { mount } from "enzyme"
import MiniMap from "./MiniMap"

describe("MiniMap", () => {
    it("renders without crashing", () => {
        mount(<MiniMap
        />)
    })

})
