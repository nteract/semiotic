import React from "react"
import { render } from "@testing-library/react"
import MiniMap from "./MiniMap"

describe("MiniMap", () => {
    it("renders without crashing", () => {
        render(<MiniMap
        />)
    })

})
