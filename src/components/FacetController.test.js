import React from "react"
import { mount } from "enzyme"
import FacetController from "./FacetController"

describe("FacetController", () => {
    it("renders without crashing", () => {
        mount(<FacetController
        >
            <div>Div Child 1</div>
            <div>Div Child 2</div>
        </FacetController>)
    })

})