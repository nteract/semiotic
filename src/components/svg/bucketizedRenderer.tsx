import * as React from "react"

import { histogram, max } from "d3-array"
import { groupBarMark } from "../svg/SvgHelper"
import { area, line, curveCatmullRom, curveLinear, arc } from "d3-shape"
import { pointOnArcAtAngle } from "./pieceDrawing"
import { scaleLinear } from "d3-scale"
import { curveHash } from "../visualizationLayerBehavior/general"
import { GenericObject } from "../types/generalTypes"
import { quantile } from "d3-array"
import { sum } from "d3-array"

interface BuckeyArrayType {
  [position: number]: GenericObject
  x0?: number
  x1?: number
  push(item: GenericObject): number
}

const verticalXYSorting = (a, b) => a.xy.y - b.xy.y
const horizontalXYSorting = (a, b) => b.xy.x - a.xy.x
const emptyObjectReturnFn = () => ({})

function createSummaryAxis({
  summary,
  summaryI,
  axisSettings,
  axisCreator,
  projection,
  actualMax,
  adjustedSize,
  columnWidth
}) {
  let axisTranslate = `translate(${summary.x},0)`
  let axisDomain = [0, actualMax]
  if (projection === "horizontal") {
    axisTranslate = `translate(${0},${summary.x})`
    axisDomain = [actualMax, 0]
  } else if (projection === "radial") {
    axisTranslate = "translate(0, 0)"
  }

  const axisWidth = projection === "horizontal" ? adjustedSize[0] : columnWidth
  const axisHeight = projection === "vertical" ? adjustedSize[1] : columnWidth
  axisSettings.size = [axisWidth, axisHeight]
  const axisScale = scaleLinear().domain(axisDomain).range([0, columnWidth])

  const renderedSummaryAxis = axisCreator(axisSettings, summaryI, axisScale)

  return (
    <g
      className="summary-axis"
      key={`summaryPiece-axis-${summaryI}`}
      transform={axisTranslate}
    >
      {renderedSummaryAxis}
    </g>
  )
}

export function bucketizedRenderingFn({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
  chartSize,
  axisCreator: axisCreatorParam
}) {
  const renderedSummaryMarks = []
  const summaryXYCoords = []

  const buckets = type.bins || 25
  const relativeBuckets = type.relative ? {} : false
  const summaryValueAccessor = type.binValue || ((d) => d.length)

  const summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn

  let axisCreator
  if (type.axis) {
    type.axis.orient =
      projection === "horizontal" &&
      ["left", "right"].indexOf(type.axis.orient) === -1
        ? "left"
        : type.axis.orient
    type.axis.orient =
      projection === "vertical" &&
      ["bottom", "top"].indexOf(type.axis.orient) === -1
        ? "bottom"
        : type.axis.orient
    axisCreator = axisCreatorParam
    if (projection === "radial") {
      console.error("Summary axes cannot be drawn for radial histograms")
      axisCreator = () => null
    }
  }

  let bucketSize = chartSize / buckets

  const keys = Object.keys(data)
  let binMax = 0

  const baseHistogram = histogram()

  const binDomain = [0, chartSize]

  const binBuckets = []

  for (let x = 0; x < buckets; x++) {
    binBuckets.push(binDomain[0] + (x / buckets) * chartSize)
  }

  const xyValue =
    projection === "vertical"
      ? (p) => p.piece.scaledVerticalValue
      : (p) => p.piece.scaledValue

  const instantiatedHistogram = baseHistogram
    .domain(binDomain)
    .thresholds(binBuckets)
    .value(xyValue)

  const calculatedBins = keys.map((key, summaryI) => {
    const summary = data[key]

    const thisSummaryData = summary.xyData

    const xySorting =
      projection === "vertical" ? verticalXYSorting : horizontalXYSorting

    const summaryPositionNest = thisSummaryData.sort(xySorting)

    let keyBins
    if (type.useBins === false) {
      const calculatedValues = summaryPositionNest.map((value) =>
        xyValue(value)
      )
      keyBins = summaryPositionNest
        .map((value, i) => {
          const bucketArray: BuckeyArrayType = []
          bucketArray.x0 = calculatedValues[i] - 1
          bucketArray.x1 = calculatedValues[i] + 1
          bucketArray.push(value)
          return bucketArray
        })
        .sort((a, b) => a.x0 - b.x0)
      bucketSize = chartSize / keyBins.length
    } else {
      keyBins = instantiatedHistogram(summaryPositionNest)
    }

    keyBins = keyBins.map((d) => ({
      y: d.x0,
      y1: d.x1 - d.x0,
      pieces: d,
      value: summaryValueAccessor(d.map((p) => p.piece.data))
    }))

    if (type.type === "histogram" || type.type === "heatmap") {
      keyBins = keyBins.filter((d) => d.value !== 0)
    }

    const relativeMax =
      keyBins.length === 0 ? 0 : max(keyBins.map((d) => d.value))
    if (relativeBuckets) {
      relativeBuckets[key] = relativeMax
    }

    binMax = Math.max(binMax, relativeMax)

    return { bins: keyBins, summary, summaryI, thisSummaryData }
  })

  const numHorizons = type.horizon
    ? binMax / type.horizon
    : type.numHorizons || 4
  const horizon = type.horizon || binMax / numHorizons

  calculatedBins.forEach(({ bins, summary, summaryI, thisSummaryData }) => {
    const eventListeners = eventListenersGenerator(summary, summaryI)
    const columnWidth = summary.width
    let calculatedSummaryStyle = thisSummaryData[0]
      ? styleFn(thisSummaryData[0].piece.data, summaryI)
      : {}
    let calculatedSummaryClass = thisSummaryData[0]
      ? classFn(thisSummaryData[0].piece.data, summaryI)
      : ""

    let translate = [summary.middle, 0]
    if (projection === "horizontal") {
      translate = [bucketSize, summary.middle]
    } else if (projection === "radial") {
      translate = [adjustedSize[0] / 2, adjustedSize[1] / 2]
    }

    const actualMax =
      (relativeBuckets && relativeBuckets[summary.name]) || binMax

    if (type.type === "heatmap" || type.type === "histogram") {
      const mappedBars = groupBarMark({
        bins,
        binMax,
        relativeBuckets,
        columnWidth,
        projection,
        adjustedSize,
        summaryI,
        summary,
        summaryStyle: calculatedSummaryStyle,
        type
      })
      const tiles = mappedBars.marks
      if (projection === "radial") {
        translate = [0, 0]
      }

      if (type.axis && type.type === "histogram") {
        renderedSummaryMarks.push({
          type: "svg-only-mark",
          Mark: createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        })
      }
      mappedBars.points.forEach((d) => {
        d.x += translate[0]
        d.y += translate[1]
      })

      summaryXYCoords.push(...mappedBars.points)
      renderedSummaryMarks.push({
        containerProps: {
          ...eventListeners,
          transform: `translate(${translate})`,
          className: calculatedSummaryClass,
          key: `summaryPiece-${summaryI}`,
          role: "img",
          tabIndex: -1,
          "data-o": summary.name,
          "aria-label": `${summary.name} ${type.type}`
        },
        //These are drawn items
        elements: tiles
      })
    } else if (type.type === "violin") {
      const { iqr } = type
      const subsets = type.subsets || [false]
      const violinElements: GenericObject[] = []

      bins[0].y = bins[0].y - bucketSize / 2
      bins[bins.length - 1].y = bins[bins.length - 1].y + bucketSize / 2

      subsets.forEach((subsettingFn, subsettingIndex) => {
        let actualBins = bins
        if (subsettingFn) {
          calculatedSummaryStyle = thisSummaryData[0]
            ? styleFn(thisSummaryData[0].piece.data, summaryI, subsettingIndex)
            : {}
          calculatedSummaryClass = thisSummaryData[0]
            ? classFn(thisSummaryData[0].piece.data, summaryI, subsettingIndex)
            : ""
          actualBins = bins.map((d) => {
            const actualPieces = d.pieces
              .filter((p, pi) => subsettingFn(p.piece, pi))
              .map((d) => d)
            const actualValue = summaryValueAccessor(actualPieces)
            return {
              ...d,
              pieces: actualPieces,
              value: actualValue
            }
          })
        }

        let violinArea = area().curve(type.curve || curveCatmullRom)

        let violinPoints = []

        if (projection === "horizontal") {
          actualBins.forEach((summaryPoint) => {
            const xValue = summaryPoint.y - bucketSize / 2
            const yValue = ((summaryPoint.value / actualMax) * columnWidth) / 2

            violinPoints.push({
              x: xValue,
              y0: -yValue,
              y1: yValue
            })
            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map((d) => d.piece),
              value: summaryPoint.value
            })
          })
          violinArea
            .x((d) => d.x)
            .y0((d) => d.y0)
            .y1((d) => d.y1)
            .defined(
              (d, i) =>
                d.y0 !== 0 ||
                (violinPoints[i - 1] && violinPoints[i - 1].y0 !== 0) ||
                (violinPoints[i + 1] && violinPoints[i + 1].y0 !== 0)
            )
        } else if (projection === "vertical") {
          actualBins.forEach((summaryPoint) => {
            const yValue = summaryPoint.y + bucketSize / 2
            const xValue = ((summaryPoint.value / actualMax) * columnWidth) / 2

            violinPoints.push({
              y: yValue,
              x0: -xValue,
              x1: xValue
            })

            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map((d) => d.piece),
              value: summaryPoint.value
            })
          })
          violinArea
            .y((d) => d.y)
            .x0((d) => d.x0)
            .x1((d) => d.x1)
            .defined(
              (d, i) =>
                d.x0 !== 0 ||
                (violinPoints[i - 1] && violinPoints[i - 1].x0 !== 0) ||
                (violinPoints[i + 1] && violinPoints[i + 1].x0 !== 0)
            )
        } else if (projection === "radial") {
          const angle = summary.pct - summary.pct_padding / 2
          const midAngle = summary.pct_middle
          violinPoints = actualBins
          violinArea = (inbins) => {
            const forward = []
            const backward = []
            inbins.forEach((bin) => {
              const outsidePoint = pointOnArcAtAngle(
                [0, 0],
                midAngle + (angle * bin.value) / actualMax / 2,
                (bin.y + bin.y1 - bucketSize / 2) / 2
              )
              const insidePoint = pointOnArcAtAngle(
                [0, 0],
                midAngle - (angle * bin.value) / actualMax / 2,
                (bin.y + bin.y1 - bucketSize / 2) / 2
              )

              //Ugh a terrible side effect has appeared
              summaryXYCoords.push({
                key: summary.name,
                x: insidePoint[0] + translate[0],
                y: insidePoint[1] + translate[1],
                pieces: bin.pieces.map((d) => d.piece),
                value: bin.value
              })
              summaryXYCoords.push({
                key: summary.name,
                x: outsidePoint[0] + translate[0],
                y: outsidePoint[1] + translate[1],
                pieces: bin.pieces.map((d) => d.piece),
                value: bin.value
              })

              forward.push(outsidePoint)
              backward.push(insidePoint)
            })
            return `M${forward.map((d) => d.join(",")).join("L")}L${backward
              .reverse()
              .map((d) => d.join(","))
              .join("L")}Z`
          }
        }

        violinElements.push({

          ...eventListeners,
          transform: `translate(${translate})`,
          key: `summaryPiece-${summaryI}-${subsettingIndex}`,

          markType: "path",
          className: calculatedSummaryClass,
          style: calculatedSummaryStyle,
          d: violinArea(violinPoints),
          role: "img",
          tabIndex: -1,
          "data-o": summary.name,
          "aria-label": `${summary.name} distribution`
        })
        if (iqr) {
          let iqrPieces = []
          actualBins.forEach((aBin) => {
            iqrPieces.push(...aBin.pieces)
          })

          iqrPieces = iqrPieces
            .map((d) =>
              projection === "vertical"
                ? d.piece.scaledVerticalValue
                : d.piece.scaledValue
            )
            .sort((a, b) => a - b)

          const iqrValues = [
            quantile(iqrPieces, 0.25),
            quantile(iqrPieces, 0.5),
            quantile(iqrPieces, 0.75)
          ]

          const iqrLine =
            projection === "vertical"
              ? (first, last, translate) =>
                  `M${translate[0]},${first}L${translate[0]},${last}`
              : (first, last, translate) =>
                  `M${first},${translate[1]}L${last},${translate[1]}`

          violinElements.push({

            ...eventListeners,
            key: `summaryPiece-${summaryI}-${subsettingIndex}-iqr-line`,

            markType: "path",
            className: calculatedSummaryClass,
            style: {
              stroke: "black",
              strokeWidth: "2px",
              ...calculatedSummaryStyle,
              ...summaryElementStylingFn("iqr")
            },
            d: iqrLine(iqrValues[0], iqrValues[2], translate),
            role: "img",
            tabIndex: -1,
            "data-o": summary.name,
            "aria-label": `${summary.name} distribution`
          })

          violinElements.push({

            ...eventListeners,
            key: `summaryPiece-${summaryI}-${subsettingIndex}-iqr-median`,
            markType: "circle",
            className: calculatedSummaryClass,
            style: {
              stroke: "black",
              fill: "black",
              strokeWidth: "1px",
              r: "3px",
              ...calculatedSummaryStyle,
              ...summaryElementStylingFn("median")
            },
            cx: projection === "vertical" ? translate[0] : iqrValues[1],
            cy: projection === "vertical" ? iqrValues[1] : translate[1],
            role: "img",
            tabIndex: -1,
            "data-o": summary.name,
            "aria-label": `${summary.name} distribution`
          })
        }
      })

      renderedSummaryMarks.push({
        elements: violinElements
      })
    } else if (type.type === "ridgeline") {
      const zeroedStart = Object.assign({}, bins[0], { value: 0 })
      const zeroedEnd = Object.assign({}, bins[bins.length - 1], { value: 0 })
      //Ridgeline plots need to visually signify the zero baseline with their start and end position

      zeroedStart.y = zeroedStart.y - bucketSize / 2
      zeroedEnd.y = zeroedEnd.y + bucketSize / 2

      const joyBins = [zeroedStart, ...bins, zeroedEnd]
      let joyPoints = []

      const interpolatorSetting = type.curve || type.interpolator

      const actualInterpolator =
        typeof interpolatorSetting === "string"
          ? curveHash[interpolatorSetting]
          : interpolatorSetting

      let joyArea = line()
        .curve(actualInterpolator || curveCatmullRom)
        .x((d) => d.x)
        .y((d) => d.y)

      const joyHeight = type.amplitude || 0

      if (type.axis && type.type === "histogram") {
        renderedSummaryMarks.push({
          type: "svg-only-mark",
          Mark: createSummaryAxis({
            summary,
            summaryI,
            axisSettings: { baseline: false, ...type.axis },
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        })
      }

      if (projection === "horizontal") {
        joyBins.forEach((summaryPoint, i) => {
          const xValue = summaryPoint.y - bucketSize / 2

          const yValue = type.flip
            ? (summaryPoint.value / actualMax) * (columnWidth + joyHeight) -
              columnWidth / 2
            : (-summaryPoint.value / actualMax) * (columnWidth + joyHeight) +
              columnWidth / 2

          joyPoints.push({
            y: yValue,
            x: xValue
          })

          //Don't make an interaction point for the first or last
          if (i !== 0 && i !== joyBins.length - 1) {
            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map((d) => d.piece),
              value: summaryPoint.value
            })
          }
        })
      } else if (projection === "vertical") {
        joyBins.forEach((summaryPoint) => {
          const yValue = summaryPoint.y + bucketSize / 2
          const xValue =
            type.flip === true
              ? (summaryPoint.value / actualMax) * (columnWidth + joyHeight) -
                columnWidth / 2
              : (-summaryPoint.value / actualMax) * (columnWidth + joyHeight) +
                columnWidth / 2

          joyPoints.push({
            y: yValue,
            x: xValue
          })

          summaryXYCoords.push({
            key: summary.name,
            x: xValue + translate[0],
            y: yValue + translate[1],
            pieces: summaryPoint.pieces.map((d) => d.piece),
            value: summaryPoint.value
          })
        })
      } else if (projection === "radial") {
        const angle = summary.pct - summary.pct_padding / 2
        const midAngle = summary.pct_start + summary.pct_padding / 2

        translate = [0, 0]
        joyPoints = joyBins
        joyArea = (inbins) => {
          const forward = []
          inbins.forEach((bin) => {
            const outsidePoint = pointOnArcAtAngle(
              [adjustedSize[0] / 2, adjustedSize[1] / 2],
              midAngle + (angle * bin.value) / actualMax,
              (bin.y + bin.y1 - bucketSize / 2) / 2
            )
            //Ugh a terrible side effect has appeared
            summaryXYCoords.push({
              key: summary.name,
              x: outsidePoint[0] + translate[0],
              y: outsidePoint[1] + translate[1],
              pieces: bin.pieces.map((d) => d.piece),
              value: bin.value
            })

            forward.push(outsidePoint)
          })
          return `M${forward.map((d) => d.join(",")).join("L")}Z`
        }
      }

      if (type.axis) {
        renderedSummaryMarks.push({
          type: "svg-only-mark",
          Mark: createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        })
      }

      renderedSummaryMarks.push({
        elements: [
          {

            ...eventListeners,
            transform: `translate(${translate})`,
            key: `summaryPiece-${summaryI}`,

            markType: "path",
            className: calculatedSummaryClass,
            style: calculatedSummaryStyle,
            d: joyArea(joyPoints),
            role: "img",
            tabIndex: -1,
            "data-o": summary.name,
            "aria-label": `${summary.name} distribution`
          }
        ]
      })
    } else if (type.type === "horizon") {
      const zeroedStart = Object.assign({}, bins[0], { value: 0 })
      const zeroedEnd = Object.assign({}, bins[bins.length - 1], { value: 0 })

      zeroedStart.y = zeroedStart.y - bucketSize / 2
      zeroedEnd.y = zeroedEnd.y + bucketSize / 2

      const horizonBins = [zeroedStart, ...bins, zeroedEnd]

      let multiBins = []
      let remainingPieces = true
      let currentHorizon = 0

      while (remainingPieces === true) {
        const currentStrip = horizonBins.map((d) => ({
          ...d,
          value: Math.max(0, Math.min(d.value - currentHorizon, horizon))
        }))
        multiBins.push(
          currentStrip.map((d) => ({ ...d, value: d.value * numHorizons }))
        )
        currentHorizon += horizon
        if (max(currentStrip.map((d) => d.value)) < horizon) {
          remainingPieces = false
        }
      }

      multiBins = multiBins.filter((d) => sum(d, (p) => p.value) > 0)

      horizonBins.forEach((summaryPoint, i) => {
        if (i !== 0 && i !== horizonBins.length - 1) {
          if (projection === "horizontal") {
            const xValue = summaryPoint.y - bucketSize / 2
            const yValue =
              (-summaryPoint.value / actualMax) * columnWidth + columnWidth / 2

            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map((d) => d.piece),
              value: summaryPoint.value
            })
          } else if (projection === "vertical") {
            const yValue = summaryPoint.y + bucketSize / 2
            const xValue =
              type.flip === true
                ? (summaryPoint.value / actualMax) * columnWidth -
                  columnWidth / 2
                : (-summaryPoint.value / actualMax) * columnWidth +
                  columnWidth / 2

            summaryXYCoords.push({
              key: summary.name,
              x: xValue + translate[0],
              y: yValue + translate[1],
              pieces: summaryPoint.pieces.map((d) => d.piece),
              value: summaryPoint.value
            })
          }
        }
      })

      const multiBinMarks = multiBins.map((multiBin, multiBinI) => {
        let horizonPoints = []

        const interpolatorSetting = type.curve || type.interpolator

        const actualInterpolator =
          typeof interpolatorSetting === "string"
            ? curveHash[interpolatorSetting]
            : interpolatorSetting

        let horizonArea = line()
          .curve(actualInterpolator || curveLinear)
          .x((d) => d.x)
          .y((d) => d.y)

        if (projection === "horizontal") {
          multiBin.forEach((summaryPoint) => {
            const xValue = summaryPoint.y - bucketSize / 2
            const yValue =
              (-summaryPoint.value / actualMax) * columnWidth + columnWidth / 2

            horizonPoints.push({
              y: yValue,
              x: xValue
            })

            //Don't make an interaction point for the first or last
          })
        } else if (projection === "vertical") {
          multiBin.forEach((summaryPoint) => {
            const yValue = summaryPoint.y + bucketSize / 2
            const xValue =
              type.flip === true
                ? (summaryPoint.value / actualMax) * columnWidth -
                  columnWidth / 2
                : (-summaryPoint.value / actualMax) * columnWidth +
                  columnWidth / 2

            horizonPoints.push({
              y: yValue,
              x: xValue
            })
          })
        } else if (projection === "radial") {
          const angle = summary.pct - summary.pct_padding / 2
          const midAngle = summary.pct_start + summary.pct_padding / 2

          translate = [0, 0]
          horizonPoints = multiBin
          horizonArea = (inbins) => {
            const forward = []
            inbins.forEach((bin) => {
              const outsidePoint = pointOnArcAtAngle(
                [adjustedSize[0] / 2, adjustedSize[1] / 2],
                midAngle + (angle * bin.value) / actualMax,
                (bin.y + bin.y1 - bucketSize / 2) / 2
              )

              forward.push(outsidePoint)
            })
            return `M${forward.map((d) => d.join(",")).join("L")}Z`
          }
        }

        return {

          ...eventListeners,
          transform: `translate(${translate})`,
          key: `summaryPiece-${summaryI}-${multiBinI}`,

          markType: "path",
          className: calculatedSummaryClass,
          style: {
            ...calculatedSummaryStyle,
            ...summaryElementStylingFn(multiBin, multiBinI)
          },
          d: horizonArea(horizonPoints),
          role: "img",
          tabIndex: -1,
          "data-o": summary.name,
          "aria-label": `${summary.name} distribution`
        }
      })

      if (type.axis) {
        renderedSummaryMarks.push({
          type: "svg-only-mark",
          Mark: createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        })
      }

      renderedSummaryMarks.push({ elements: multiBinMarks })
    }
  })

  return {
    marks: renderedSummaryMarks,
    xyPoints: summaryXYCoords,
    thresholds: binBuckets
  }
}
