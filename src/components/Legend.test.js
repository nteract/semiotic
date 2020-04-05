import React from "react"
import { mount } from "enzyme"
import Legend from "./Legend"

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
        mount(<svg><Legend
            legendGroups={legendGroups}
        /></svg>)
    })

})
