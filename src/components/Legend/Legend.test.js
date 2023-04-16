import React from "react"
import { render } from "@testing-library/react"
import Legend from "./Legend"
// import "@testing-library/jest-dom"

const legendGroups = [
    {
        styleFn: () => ({ fill: "red", stroke: "blue" }),
        items: [{ label: "nothing" }],
        label: "cool test legend"
    }
]

/*
title?: string
width?: number
height?: number
orientation?: string
position?: "left" | "right"
*/

describe("Legend", () => {
    it("renders without crashing", () => {
        render(<svg><Legend
            legendGroups={legendGroups}
        /></svg>)
    })

})
