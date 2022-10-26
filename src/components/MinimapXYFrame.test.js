import React from "react"
import { render } from "@testing-library/react"
import MinimapXYFrame from "./MinimapXYFrame"

const settings = {
    size: [500, 500],
    minimap: {
        summaries: []
    }
}

describe("MinimapXYFrame", () => {
    it("renders without crashing", () => {
        render(<MinimapXYFrame {...settings} />)
    })

})
