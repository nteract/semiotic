import React from "react"
import { mount } from "enzyme"
import { desaturationLayer } from "./baseRules"

const style = { fill: "white", fillOpacity: 0.1 }
const size = [400, 400]
const i = 0
const key = "desat-key"

describe("annotationHandling", () => {
    const LightDesaturation = desaturationLayer({
        style,
        size,
        i,
        key
    })


    it("renders a desaturation layer without crashing", () => {
        mount(<svg>{LightDesaturation}</svg>)
    })

    const mountedDesat = mount(<svg>{LightDesaturation}</svg>)

    it("desaturation layer creates a proper rectangle", () => {
        expect(mountedDesat.find("rect").length).toEqual(1)
        //Desaturation Layer has a 10px overflow
        expect(mountedDesat.find("rect").props().width).toEqual(410)
    })

}
)
