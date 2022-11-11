import React from "react"
import InteractionCanvas from "./InteractionCanvas"
import { render } from "@testing-library/react"

describe("InteractionLayer", () => {
    it("renders without crashing", () => {
        render(<InteractionCanvas />)
    })

})
