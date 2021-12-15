import React from "react"
import { mount } from "enzyme"
import { SparkOrdinalFrame } from "./SparkOrdinalFrame"

const settings = {
    size: [500, 500]
}

describe("SparkOrdinalFrame", () => {
    it("renders without crashing", () => {
        mount(<SparkOrdinalFrame
            {...settings}
        />)
    })

})
