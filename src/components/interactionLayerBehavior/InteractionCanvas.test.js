import React from "react"
import { mount } from "enzyme"
import InteractionCanvas from "./InteractionCanvas"

describe("InteractionLayer", () => {
    it("renders without crashing", () => {
        mount(<InteractionCanvas />)
    })

})
