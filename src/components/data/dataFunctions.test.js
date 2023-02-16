import { calculateDataExtent } from "./dataFunctions"

const lineDataAccessor = [(d) => d.coordinates]
const xAccessor = [(d) => d.x]
const yAccessor = [(d) => d.y]
const summaries = [
  {
    coordinates: [
      { x: 0, y: 100 },
      { x: 100, y: 100 }
    ]
  }
]
const points = [
  { x: 15, y: 22 },
  { x: -150, y: -300 }
]
const lines = [
  {
    coordinates: [
      { x: 3, y: 200 },
      { x: 4, y: 10 }
    ]
  }
]
const lineType = { type: "line" }
const showLinePoints = true
const showSummaryPoints = true
const xExtent = undefined
const yExtent = undefined
const invertX = false
const invertY = false
const summaryDataAccessor = [(d) => d.coordinates]
const summaryType = { type: "basic" }
const adjustedSize = [500, 500]
const margin = { left: 10, top: 10, bottom: 10, right: 10 }
const baseMarkProps = {}
const summaryStyleFn = () => ({})
const summaryClassFn = () => "no-class"
const summaryRenderModeFn = undefined
const chartSize = [400, 400]
const filterRenderedLines = () => true
const filterRenderedSummaries = () => true
const filterRenderedPoints = () => true
const defined = (d) => d.y !== null
const annotations = []

describe("dataFunctions", () => {
  const calculatedExtent = calculateDataExtent({
    lineDataAccessor,
    xAccessor,
    yAccessor,
    summaries,
    points,
    lines,
    lineType,
    showLinePoints,
    showSummaryPoints,
    xExtent,
    yExtent,
    invertX,
    invertY,
    summaryDataAccessor,
    summaryType,
    adjustedSize,
    margin,
    baseMarkProps,
    summaryStyleFn,
    summaryClassFn,
    summaryRenderModeFn,
    chartSize,
    filterRenderedLines,
    filterRenderedSummaries,
    filterRenderedPoints,
    defined,
    annotations
  })

  it("calculatedExtent from summaries, lines & points", () => {
    expect(calculatedExtent.xExtent[0]).toEqual(-150)
    expect(calculatedExtent.xExtent[1]).toEqual(100)
    expect(calculatedExtent.yExtent[0]).toEqual(-300)
    expect(calculatedExtent.yExtent[1]).toEqual(200)
    expect(calculatedExtent.fullDataset.length).toEqual(6)
  })
})
