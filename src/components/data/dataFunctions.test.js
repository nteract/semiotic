import { calculateDataExtent } from "./dataFunctions"
import { createXYPipelineCache } from "./xyPipelineCache"

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

describe("XYPipelineCache memoization", () => {
  it("annotatedSettings returns same reference for same inputs", () => {
    const cache = createXYPipelineCache()
    const result1 = cache.annotatedSettings("x", "y", undefined, undefined, undefined, "line", undefined, undefined)
    const result2 = cache.annotatedSettings("x", "y", undefined, undefined, undefined, "line", undefined, undefined)
    expect(result1).toBe(result2)
  })

  it("annotatedSettings returns new reference when inputs change", () => {
    const cache = createXYPipelineCache()
    const result1 = cache.annotatedSettings("x", "y", undefined, undefined, undefined, "line", undefined, undefined)
    const result2 = cache.annotatedSettings("x2", "y", undefined, undefined, undefined, "line", undefined, undefined)
    expect(result1).not.toBe(result2)
  })

  it("marginCalc returns same reference for same inputs", () => {
    const cache = createXYPipelineCache()
    const margin = { top: 10, bottom: 10, left: 10, right: 10 }
    const size = [500, 500]
    const title = { title: "test", orient: "top" }
    const result1 = cache.marginCalc(margin, undefined, title, size)
    const result2 = cache.marginCalc(margin, undefined, title, size)
    expect(result1).toBe(result2)
  })
})
