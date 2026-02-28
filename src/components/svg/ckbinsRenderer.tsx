import { scaleLinear } from "d3-scale"
import { ckmeans } from "./ckmeans"
import { GenericObject } from "../types/generalTypes"

type BoxplotFnType = {
  data: GenericObject[]
  type: GenericObject
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: "horizontal" | "vertical" | "radial"
  adjustedSize: number[]
}

interface summaryInstruction {
  Mark?: JSX.Element
  containerProps?: object
  elements: object[]
}

export function ckBinsRenderFn(props: BoxplotFnType) {
  const {
    data,
    type,
    renderMode,
    eventListenersGenerator,
    styleFn,
    classFn,
    projection,
    adjustedSize
  } = props
  const renderedSummaryMarks: summaryInstruction[] = []

  const summaryXYCoords = []

  const keys = Object.keys(data)

  let maxClusterSize = 0

  const allBins: GenericObject[][] = []

  keys.forEach((key, summaryI) => {
    const summary = data[key]
    const eventListeners = eventListenersGenerator(summary, summaryI)

    const columnWidth = summary.width

    const thisSummaryData = summary.pieceData.sort((a, b) => a.value - b.value)

    const firstElement = thisSummaryData[0]
    const lastElement = thisSummaryData[thisSummaryData.length - 1]

    const binScale = scaleLinear()
      .domain([firstElement.value, lastElement.value])
      .range([firstElement.scaledValue, lastElement.scaledValue])

    const calculatedSummaryStyle = styleFn(thisSummaryData[0].data, summaryI)
    const calculatedSummaryClass = classFn(thisSummaryData[0].data, summaryI)

    const binData = thisSummaryData.map((d) => d.value)

    const clusters = 5

    const ckstops = ckmeans(binData, clusters)

    let ckBins = []

    ckstops.forEach((ckstop, i) => {
      const start = ckstop
      const end = ckstops[i + 1] ?? lastElement.value

      ckBins.push({
        start,
        end,
        key,
        summary,
        calculatedSummaryStyle,
        calculatedSummaryClass,
        scaledStart: binScale(start),
        scaledEnd: binScale(end),
        values: []
      })
    })

    allBins.push(ckBins)

    let binI = 0

    for (const datapoint of thisSummaryData) {
      if (ckBins[binI].end <= datapoint.value) {
        if (ckBins[binI + 1]) {
          binI++
        }
      }
      ckBins[binI].values.push(datapoint)
    }

    ckBins.forEach((ckbin) => {
      const clusterSize = ckbin.values.length
      maxClusterSize = Math.max(clusterSize, maxClusterSize)
    })
  })

  allBins.forEach((ckBins, index) => {
    const CKBinElements = ckBins.map((ckBin) => {
      const { key, summary, calculatedSummaryStyle, calculatedSummaryClass } =
        ckBin

      const { fill = "black", stroke = "black" } = calculatedSummaryStyle

      const lightScale = scaleLinear()
        .domain([1, maxClusterSize])
        .range(["white", fill])

      return {


        markType: "rect",
        x: ckBin.scaledStart,
        width: ckBin.scaledEnd - ckBin.scaledStart,
        y: ckBin.summary.x,
        height: ckBin.summary.width,
        style: Object.assign({ strokeWidth: 2 }, calculatedSummaryStyle, {
          fill: lightScale(ckBin.values.length),
          strokeWidth: 1,
          stroke
        })
      }
    })

    renderedSummaryMarks.push({
      containerProps: {
        //        className: calculatedSummaryClass,
        transform: "",
        key: `summaryPiece-${index}`,
        role: "img",
        tabIndex: -1
      },
      //These are drawn items
      elements: CKBinElements
    })
  })

  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords }
}
