import { axisPieces } from "./axis"
import { scaleLinear } from "d3-scale"

const size = [400, 400]

const axisSettings = {
    scale: scaleLinear().domain([0, 1000]).range([0, 400]),
    orient: "left",
    size
}

describe("axisPieces", () => {

    const pieces = axisPieces(axisSettings)

    it("desaturation layer creates a proper rectangle", () => {
        expect(pieces[0].y1).toEqual(0)
        //Desaturation Layer has a 10px overflow
        expect(pieces[1].y1).toEqual(40)
    })

}
)
