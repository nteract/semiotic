import { createLines } from "./general"
import { scaleLinear } from "d3-scale"

const lineData = [
  {
    name: "line 1",
    data: [
      { x: 0, y: 3 },
      { x: 10, y: 10 },
      { x: 20, y: 8 },
      { x: 30, y: 6 },
      { x: 40, y: 5 }
    ]
  }
]

const coordinateNames = {
  y: "y",
  x: "x",
  yMiddle: "yMiddle",
  yTop: "yTop",
  yBottom: "yBottom",
  xMiddle: "xMiddle",
  xTop: "xTop",
  xBottom: "xBottom"
}

const createLinesSettings = {
  xScale: scaleLinear().domain([0, 100]).range([0, 1000]),
  yScale: scaleLinear().domain([0, 10]).range([0, 50]),
  canvasDrawing: false,
  data: lineData,
  projectedCoordinateNames: coordinateNames,
  customMark: undefined,
  canvasRender: false,
  styleFn: () => ({ stroke: "red" }),
  classFn: () => "",
  renderMode: undefined,
  renderKeyFn: undefined,
  type: { type: "line", simpleLine: true },
  defined: () => true,
  baseMarkProps: {},
  ariaLabel: "No label",
  axesData: []
}

describe("axisPieces", () => {
  const createdLine = createLines(createLinesSettings)

  it("Creates a simple line", () => {
    expect(createdLine[0].props.d).toEqual("M0,15L100,50L200,40L300,30L400,25")
  })
})
