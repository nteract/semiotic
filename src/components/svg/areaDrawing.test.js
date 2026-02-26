import { lineBounding } from "./areaDrawing"

const baseData = [
  { x: 1, y: 10, bounds: 3 },
  { x: 2, y: 10, bounds: 3 },
  { x: 3, y: 10, bounds: 3 },
  { x: 4, y: 10, bounds: 3 },
  { x: 5, y: 10, bounds: 3 },
  { x: 6, y: 10, bounds: 3 }
]
const sampleLine = {
  _baseData: baseData,
  _xyfCoordinates: baseData.map((d) => [d.x, d.y])
}

const baseBoundingSettings = {
  type: "linebounds",
  boundingAccessor: (d) => d.bounds
}

// Tests for areaDrawing.js
describe("areaDrawing", () => {
  const lineBounds = lineBounding({
    summaryType: baseBoundingSettings,
    data: [sampleLine],
    defined: () => true
  })

  it("creates a simple equally bounded line", () => {
    expect(lineBounds[0]._xyfCoordinates[0][1]).toEqual(13)
  })
})
