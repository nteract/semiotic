import React from "react"
import { mount } from "enzyme"
import { SparkNetworkFrame } from "./SparkNetworkFrame"

const settings = {
    size: [500, 500]
}

describe("SparkNetworkFrame", () => {
    it("renders without crashing", () => {
        mount(<SparkNetworkFrame
            {...settings}
        />)
    })

})
