import { describe, expect, it } from "vitest"
import {
  orientProcessSankeyBand,
  orientProcessSankeyRibbon,
  transposeProcessSankeyPath,
} from "./orientation"

describe("ProcessSankey orientation projection", () => {
  it("transposes every absolute coordinate in band and ribbon paths", () => {
    expect(transposeProcessSankeyPath("M1,2 L3.5,-4 C5,6 7,8 9,10 Z"))
      .toBe("M2,1 L-4,3.5 C6,5 8,7 10,9 Z")
  })

  it("projects labels and lifecycle gradients into a vertical scene", () => {
    const band = orientProcessSankeyBand({
      id: "A",
      pathD: "M1,2 L3,4 Z",
      fill: "#000",
      rawDatum: { id: "A" },
      labelX: 10,
      labelY: 30,
      labelText: "A",
      gradientStubs: [{ pathD: "M1,2 L3,2 L3,4 L1,4 Z", x0: 1, x1: 3, from: 0, to: 1 }],
    }, "vertical")

    expect(band).toMatchObject({
      pathD: "M2,1 L4,3 Z",
      labelX: 30,
      labelY: 10,
      labelAnchor: "middle",
    })
    expect(band.gradientStubs?.[0]).toMatchObject({ x0: 0, x1: 0, y0: 1, y1: 3 })
  })

  it("transposes the particle bezier with the visible ribbon", () => {
    const ribbon = orientProcessSankeyRibbon({
      id: "A-B",
      pathD: "M1,2 C3,2 7,8 9,8 L9,10 C7,10 3,4 1,4 Z",
      fill: "#000",
      opacity: 0.5,
      rawDatum: { id: "A-B" },
      bezier: {
        circular: false,
        points: [{ x: 1, y: 3 }, { x: 3, y: 3 }, { x: 7, y: 9 }, { x: 9, y: 9 }],
        halfWidth: 1,
      },
    }, "vertical")

    expect(ribbon.bezier?.points).toEqual([
      { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 9, y: 7 }, { x: 9, y: 9 },
    ])
    expect(ribbon.bezier?.halfWidth).toBe(1)
  })
})
