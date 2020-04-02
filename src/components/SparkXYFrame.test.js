import React from "react"
import { mount } from "enzyme"
import SparkXYFrame from "./SparkXYFrame"

const settings = {
    size: [500, 500]
}

describe("SparkXYFrame", () => {
    it("renders without crashing", () => {
        mount(<SparkXYFrame
            {...settings}
        />)
    })

})
