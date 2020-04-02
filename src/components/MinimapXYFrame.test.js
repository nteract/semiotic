import React from "react"
import { mount } from "enzyme"
import MinimapXYFrame from "./MinimapXYFrame"

const settings = {
    size: [500, 500],
    minimap: {
        summaries: []
    }
}

describe("MinimapXYFrame", () => {
    it("renders without crashing", () => {
        mount(<MinimapXYFrame
            {...settings}
        />)
    })

})
