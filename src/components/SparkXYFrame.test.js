import React from "react"
import { render } from "@testing-library/react"
import { SparkXYFrame } from "./SparkXYFrame"

const settings = {
    size: [500, 500]
}

describe("SparkXYFrame", () => {
    it("renders without crashing", () => {
        render(<SparkXYFrame
            {...settings}
        />)
    })

})
