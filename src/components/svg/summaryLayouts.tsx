import * as React from "react"

import Axis from "../Axis"
import { Mark } from "semiotic-mark"
import { contouring } from "../svg/areaDrawing"
import { quantile } from "d3-array"
import { histogram, max } from "d3-array"
import { groupBarMark } from "../svg/SvgHelper"
import { area, line, curveCatmullRom, curveLinear, arc } from "d3-shape"
import { pointOnArcAtAngle } from "./pieceDrawing"
import { orFrameSummaryRenderer } from "./frameFunctions"
import { scaleLinear } from "d3-scale"
import { curveHash } from "../visualizationLayerBehavior/general"
import { GenericObject } from "../types/generalTypes"
import { sum } from "d3-array"

type BoxplotFnType = {
  data: GenericObject[]
  type: GenericObject
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: "horizontal" | "vertical" | "radial"
  adjustedSize: number[]
  baseMarkProps: GenericObject
}

interface BuckeyArrayType {
  [position: number]: GenericObject
  x0?: number
  x1?: number
  push(item: GenericObject): number
}

const contourMap = (d) => [d.xy.x, d.xy.y]

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

export function boxplotRenderFn({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
  baseMarkProps
}: BoxplotFnType) {
  const summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn

  const { outliers } = type

  const keys = Object.keys(data)
  const renderedSummaryMarks = []
  const summaryXYCoords = []
  keys.forEach((key, summaryI) => {
    const summary = data[key]
    const eventListeners = eventListenersGenerator(summary, summaryI)

    const columnWidth = summary.width

    const thisSummaryData = summary.pieceData

    const calculatedSummaryStyle = styleFn(thisSummaryData[0].data, summaryI)
    const calculatedSummaryClass = classFn(thisSummaryData[0].data, summaryI)

    let summaryPositionNest,
      summaryValueNest,
      translate,
      extentlineX1,
      extentlineX2,
      extentlineY1,
      extentlineY2,
      topLineX1,
      topLineX2,
      midLineX1,
      midLineX2,
      bottomLineX1,
      bottomLineX2,
      rectTopWidth,
      rectTopHeight,
      rectTopY,
      rectTopX,
      rectBottomWidth,
      rectBottomHeight,
      rectBottomY,
      rectBottomX,
      rectWholeWidth,
      rectWholeHeight,
      rectWholeY,
      rectWholeX,
      topLineY1,
      topLineY2,
      bottomLineY1,
      bottomLineY2,
      midLineY1,
      midLineY2

    const renderValue = renderMode ? renderMode(summary, summaryI) : undefined

    summaryValueNest = thisSummaryData.map((p) => p.value).sort((a, b) => a - b)

    summaryValueNest = [
      quantile(summaryValueNest, 0.0),
      quantile(summaryValueNest, 0.25),
      quantile(summaryValueNest, 0.5),
      quantile(summaryValueNest, 0.75),
      quantile(summaryValueNest, 1.0)
    ]

    const iqr = summaryValueNest[3] - summaryValueNest[1]
    let minOutlier, maxOutlier

    if (outliers) {
      minOutlier = summaryValueNest[1] - iqr * 1.5
      maxOutlier = summaryValueNest[3] + iqr * 1.5

      summaryValueNest[0] = Math.max(summaryValueNest[0], minOutlier)
      summaryValueNest[4] = Math.min(summaryValueNest[4], maxOutlier)
    }

    //translate

    if (projection === "vertical") {
      summaryPositionNest = thisSummaryData
        .map((p) => p.scaledVerticalValue)
        .sort((a, b) => b - a)

      translate = `translate(${summary.x + summary.padding},0)`

      summaryPositionNest = [
        quantile(summaryPositionNest, 0.0),
        quantile(summaryPositionNest, 0.25),
        quantile(summaryPositionNest, 0.5),
        quantile(summaryPositionNest, 0.75),
        quantile(summaryPositionNest, 1.0)
      ]

      if (outliers) {
        const positionIQR = summaryPositionNest[3] - summaryPositionNest[1]

        summaryPositionNest[0] = Math.min(
          summaryPositionNest[0],
          summaryPositionNest[1] - positionIQR * 1.5
        )
        summaryPositionNest[4] = Math.max(
          summaryPositionNest[4],
          summaryPositionNest[3] + positionIQR * 1.5
        )
      }

      extentlineX1 = 0
      extentlineX2 = 0
      extentlineY1 = summaryPositionNest[0]
      extentlineY2 = summaryPositionNest[4]
      topLineX1 = -columnWidth / 2
      topLineX2 = columnWidth / 2
      midLineX1 = -columnWidth / 2
      midLineX2 = columnWidth / 2
      bottomLineX1 = -columnWidth / 2
      bottomLineX2 = columnWidth / 2
      rectBottomWidth = columnWidth
      rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[2]
      rectBottomY = summaryPositionNest[2]
      rectBottomX = -columnWidth / 2
      rectTopWidth = columnWidth
      rectTopHeight = summaryPositionNest[2] - summaryPositionNest[3]
      rectWholeWidth = columnWidth
      rectWholeHeight = summaryPositionNest[1] - summaryPositionNest[3]
      rectWholeY = summaryPositionNest[3]
      rectWholeX = -columnWidth / 2
      rectTopY = summaryPositionNest[3]
      rectTopX = -columnWidth / 2
      topLineY1 = summaryPositionNest[0]
      topLineY2 = summaryPositionNest[0]
      bottomLineY1 = summaryPositionNest[4]
      bottomLineY2 = summaryPositionNest[4]
      midLineY1 = summaryPositionNest[2]
      midLineY2 = summaryPositionNest[2]

      summaryXYCoords.push(
        {
          label: "Maximum",
          key,
          summaryPieceName: "max",
          x: 0,
          y: summaryPositionNest[4],
          value: summaryValueNest[4]
        },
        {
          label: "3rd Quartile",
          key,
          summaryPieceName: "q3area",
          x: 0,
          y: summaryPositionNest[3],
          value: summaryValueNest[3]
        },
        {
          label: "Median",
          key,
          summaryPieceName: "median",
          x: 0,
          y: summaryPositionNest[2],
          value: summaryValueNest[2]
        },
        {
          label: "1st Quartile",
          key,
          summaryPieceName: "q1area",
          x: 0,
          y: summaryPositionNest[1],
          value: summaryValueNest[1]
        },
        {
          label: "Minimum",
          key,
          summaryPieceName: "min",
          x: 0,
          y: summaryPositionNest[0],
          value: summaryValueNest[0]
        }
      )
    } else if (projection === "horizontal") {
      summaryPositionNest = thisSummaryData
        .map((p) => p.scaledValue)
        .sort((a, b) => a - b)

      const boxplotY = summary.x + summary.padding

      translate = `translate(0,${
        summary.x + summary.padding + summary.width / 2
      })`

      summaryPositionNest = [
        quantile(summaryPositionNest, 0.0),
        quantile(summaryPositionNest, 0.25),
        quantile(summaryPositionNest, 0.5),
        quantile(summaryPositionNest, 0.75),
        quantile(summaryPositionNest, 1.0)
      ]

      if (outliers) {
        const positionIQR = summaryPositionNest[3] - summaryPositionNest[1]

        summaryPositionNest[0] = Math.max(
          summaryPositionNest[0],
          summaryPositionNest[1] - positionIQR * 1.5
        )
        summaryPositionNest[4] = Math.min(
          summaryPositionNest[4],
          summaryPositionNest[3] + positionIQR * 1.5
        )
      }

      extentlineY1 = 0
      extentlineY2 = 0
      extentlineX1 = summaryPositionNest[0]
      extentlineX2 = summaryPositionNest[4]
      topLineY1 = -columnWidth / 2
      topLineY2 = columnWidth / 2
      midLineY1 = -columnWidth / 2
      midLineY2 = columnWidth / 2
      bottomLineY1 = -columnWidth / 2
      bottomLineY2 = columnWidth / 2
      rectTopHeight = columnWidth
      rectTopWidth = summaryPositionNest[3] - summaryPositionNest[2]
      rectTopX = summaryPositionNest[2]
      rectTopY = -columnWidth / 2
      rectBottomHeight = columnWidth
      rectBottomWidth = summaryPositionNest[2] - summaryPositionNest[1]
      rectBottomX = summaryPositionNest[1]
      rectBottomY = -columnWidth / 2
      rectWholeHeight = columnWidth
      rectWholeWidth = summaryPositionNest[3] - summaryPositionNest[1]
      rectWholeX = summaryPositionNest[1]
      rectWholeY = -columnWidth / 2
      topLineX1 = summaryPositionNest[0]
      topLineX2 = summaryPositionNest[0]
      bottomLineX1 = summaryPositionNest[4]
      bottomLineX2 = summaryPositionNest[4]
      midLineX1 = summaryPositionNest[2]
      midLineX2 = summaryPositionNest[2]

      summaryXYCoords.push(
        {
          label: "Maximum",
          key,
          summaryPieceName: "max",
          x: summaryPositionNest[4],
          y: boxplotY,
          value: summaryValueNest[4]
        },
        {
          label: "3rd Quartile",
          key,
          summaryPieceName: "q3area",
          x: summaryPositionNest[3],
          y: boxplotY,
          value: summaryValueNest[3]
        },
        {
          label: "Median",
          key,
          summaryPieceName: "median",
          x: summaryPositionNest[2],
          y: boxplotY,
          value: summaryValueNest[2]
        },
        {
          label: "1st Quartile",
          key,
          summaryPieceName: "q1area",
          x: summaryPositionNest[1],
          y: boxplotY,
          value: summaryValueNest[1]
        },
        {
          label: "Minimum",
          key,
          summaryPieceName: "min",
          x: summaryPositionNest[0],
          y: boxplotY,
          value: summaryValueNest[0]
        }
      )
    }

    if (projection === "radial") {
      summaryPositionNest = thisSummaryData
        .map((p) => p.scaledValue)
        .sort((a, b) => a - b)

      summaryPositionNest = [
        quantile(summaryPositionNest, 0.0),
        quantile(summaryPositionNest, 0.25),
        quantile(summaryPositionNest, 0.5),
        quantile(summaryPositionNest, 0.75),
        quantile(summaryPositionNest, 1.0)
      ]

      extentlineX1 = 0
      extentlineX2 = 0
      extentlineY1 = summaryPositionNest[0]
      extentlineY2 = summaryPositionNest[4]
      topLineX1 = -columnWidth / 2
      topLineX2 = columnWidth / 2
      midLineX1 = -columnWidth / 2
      midLineX2 = columnWidth / 2
      bottomLineX1 = -columnWidth / 2
      bottomLineX2 = columnWidth / 2
      rectTopWidth = columnWidth
      rectTopHeight = summaryPositionNest[1] - summaryPositionNest[3]
      rectTopY = summaryPositionNest[3]
      rectTopX = -columnWidth / 2
      rectBottomWidth = columnWidth
      rectBottomHeight = summaryPositionNest[1] - summaryPositionNest[3]
      rectBottomY = summaryPositionNest[3]
      rectBottomX = -columnWidth / 2
      topLineY1 = summaryPositionNest[0]
      topLineY2 = summaryPositionNest[0]
      bottomLineY1 = summaryPositionNest[4]
      bottomLineY2 = summaryPositionNest[4]
      midLineY1 = summaryPositionNest[2]
      midLineY2 = summaryPositionNest[2]

      const twoPI = Math.PI * 2

      const bottomLineArcGenerator = arc()
        .innerRadius(bottomLineY1 / 2)
        .outerRadius(bottomLineY1 / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      const topLineArcGenerator = arc()
        .innerRadius(topLineY1 / 2)
        .outerRadius(topLineY1 / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      const midLineArcGenerator = arc()
        .innerRadius(midLineY1 / 2)
        .outerRadius(midLineY1 / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      const bodyArcTopGenerator = arc()
        .innerRadius(summaryPositionNest[1] / 2)
        .outerRadius(midLineY1 / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      const bodyArcBottomGenerator = arc()
        .innerRadius(midLineY1 / 2)
        .outerRadius(summaryPositionNest[3] / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      const bodyArcWholeGenerator = arc()
        .innerRadius(summaryPositionNest[1] / 2)
        .outerRadius(summaryPositionNest[3] / 2)
      //        .padAngle(summary.pct_padding * twoPI);

      let startAngle = summary.pct_start + summary.pct_padding / 2
      let endAngle = summary.pct + summary.pct_start - summary.pct_padding / 2
      const midAngle = summary.pct / 2 + summary.pct_start
      startAngle *= twoPI
      endAngle *= twoPI

      const radialAdjustX = adjustedSize[0] / 2

      const radialAdjustY = adjustedSize[1] / 2

      //        const bottomPoint = bottomLineArcGenerator.centroid({ startAngle, endAngle })
      //        const topPoint = topLineArcGenerator.centroid({ startAngle, endAngle })
      const bottomPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        summaryPositionNest[4] / 2
      )
      const topPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        summaryPositionNest[0] / 2
      )
      const thirdPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        summaryPositionNest[3] / 2
      )
      const midPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        summaryPositionNest[2] / 2
      )
      const firstPoint = pointOnArcAtAngle(
        [0, 0],
        midAngle,
        summaryPositionNest[1] / 2
      )

      summaryXYCoords.push(
        {
          label: "Minimum",
          key,
          summaryPieceName: "min",
          x: topPoint[0] + radialAdjustX,
          y: topPoint[1] + radialAdjustY,
          value: summaryValueNest[0]
        },
        {
          label: "1st Quartile",
          key,
          summaryPieceName: "q3area",
          x: firstPoint[0] + radialAdjustX,
          y: firstPoint[1] + radialAdjustY,
          value: summaryValueNest[1]
        },
        {
          label: "Median",
          key,
          summaryPieceName: "median",
          x: midPoint[0] + radialAdjustX,
          y: midPoint[1] + radialAdjustY,
          value: summaryValueNest[2]
        },
        {
          label: "3rd Quartile",
          key,
          summaryPieceName: "q1area",
          x: thirdPoint[0] + radialAdjustX,
          y: thirdPoint[1] + radialAdjustY,
          value: summaryValueNest[3]
        },
        {
          label: "Maximum",
          key,
          summaryPieceName: "max",
          x: bottomPoint[0] + radialAdjustX,
          y: bottomPoint[1] + radialAdjustY,
          value: summaryValueNest[4]
        }
      )
      translate = `translate(${radialAdjustX},${radialAdjustY})`

      renderedSummaryMarks.push(
        <g
          {...eventListeners}
          className={calculatedSummaryClass}
          transform={translate}
          key={`summaryPiece-${summaryI}`}
          role="img"
          tabIndex={-1}
          data-o={key}
          aria-label={`${key} boxplot showing ${summaryXYCoords
            .filter((d) => d.key === key)
            .map((d) => `${d.label} ${d.value}`)}`}
        >
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="line"
            x1={bottomPoint[0]}
            x2={topPoint[0]}
            y1={bottomPoint[1]}
            y2={topPoint[1]}
            style={Object.assign(
              { strokeWidth: 2 },
              calculatedSummaryStyle,
              summaryElementStylingFn("whisker")
            )}
          />
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={topLineArcGenerator({ startAngle, endAngle })}
            style={Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("max")
            )}
          />
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={midLineArcGenerator({ startAngle, endAngle })}
            style={Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("median")
            )}
          />
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={bottomLineArcGenerator({ startAngle, endAngle })}
            style={Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("min")
            )}
          />
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={bodyArcWholeGenerator({ startAngle, endAngle })}
            style={Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              summaryElementStylingFn("iqrarea")
            )}
          />

          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={bodyArcTopGenerator({ startAngle, endAngle })}
            style={Object.assign(
              {},
              calculatedSummaryStyle,
              { fill: "none", stroke: "none" },
              summaryElementStylingFn("q3area")
            )}
          />
          <Mark
            {...baseMarkProps}
            renderMode={renderValue}
            markType="path"
            d={bodyArcBottomGenerator({ startAngle, endAngle })}
            style={Object.assign(
              {},
              calculatedSummaryStyle,
              { fill: "none", stroke: "none" },
              summaryElementStylingFn("q1area")
            )}
          />
        </g>
      )
    } else {
      const boxplotMarks = [
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="line"
          x1={extentlineX1}
          x2={extentlineX2}
          y1={extentlineY1}
          y2={extentlineY2}
          style={Object.assign(
            { strokeWidth: "2px" },
            calculatedSummaryStyle,
            summaryElementStylingFn("whisker")
          )}
        />,
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="line"
          x1={topLineX1}
          x2={topLineX2}
          y1={topLineY1}
          y2={topLineY2}
          style={Object.assign(
            { strokeWidth: "2px" },
            calculatedSummaryStyle,
            summaryElementStylingFn("min")
          )}
        />,
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="line"
          x1={bottomLineX1}
          x2={bottomLineX2}
          y1={bottomLineY1}
          y2={bottomLineY2}
          style={Object.assign(
            { strokeWidth: "2px" },
            calculatedSummaryStyle,
            summaryElementStylingFn("max")
          )}
        />,
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="rect"
          x={rectWholeX}
          width={rectWholeWidth}
          y={rectWholeY}
          height={rectWholeHeight}
          style={Object.assign(
            { strokeWidth: "1px" },
            calculatedSummaryStyle,
            summaryElementStylingFn("iqrarea")
          )}
        />,

        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="rect"
          x={rectTopX}
          width={rectTopWidth}
          y={rectTopY}
          height={rectTopHeight}
          style={Object.assign(
            {},
            calculatedSummaryStyle,
            { fill: "none", stroke: "none" },
            summaryElementStylingFn("q3area")
          )}
        />,
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="rect"
          x={rectBottomX}
          width={rectBottomWidth}
          y={rectBottomY}
          height={rectBottomHeight}
          style={Object.assign(
            {},
            calculatedSummaryStyle,
            { fill: "none", stroke: "none" },
            summaryElementStylingFn("q1area")
          )}
        />,
        <Mark
          {...baseMarkProps}
          renderMode={renderValue}
          markType="line"
          x1={midLineX1}
          x2={midLineX2}
          y1={midLineY1}
          y2={midLineY2}
          style={Object.assign(
            { strokeWidth: "2px" },
            calculatedSummaryStyle,
            summaryElementStylingFn("median")
          )}
        />
      ]

      const outlierMarks = []

      if (outliers) {
        const outlierPoints = thisSummaryData.filter(
          (d) => d.value > maxOutlier || d.value < minOutlier
        )

        outlierPoints.forEach((point) => {
          outlierMarks.push(
            <Mark
              {...baseMarkProps}
              //              renderMode={renderValue}
              markType="circle"
              cx={projection === "horizontal" ? point.scaledValue : 0}
              cy={projection === "vertical" ? point.scaledVerticalValue : 0}
              style={Object.assign(
                { strokeWidth: "1px", stroke: "black", fill: "none", r: 2 },
                calculatedSummaryStyle,
                summaryElementStylingFn("outlier")
              )}
            />
          )
        })
      }
      renderedSummaryMarks.push(
        <g
          {...eventListeners}
          className={calculatedSummaryClass}
          transform={translate}
          key={`summaryPiece-${summaryI}`}
          role="img"
          tabIndex={-1}
          data-o={key}
          aria-label={`${key} boxplot showing ${summaryXYCoords
            .filter((d) => d.key === key)
            .map((d) => `${d.label} ${d.value}`)
            .join(", ")}`}
        >
          {boxplotMarks}
          {outlierMarks}
        </g>
      )
    }
  })

  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords }
}

export function contourRenderFn({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  adjustedSize,
  baseMarkProps
}) {
  const keys = Object.keys(data)
  const renderedSummaryMarks = []
  const summaryXYCoords = []

  keys.forEach((key, ordsetI) => {
    const ordset = data[key]
    const renderValue = renderMode && renderMode(ordset, ordsetI)
    type.thresholds = type.thresholds || 8
    type.bandwidth = type.bandwidth || 12
    type.resolution = type.resolution || 1000

    const projectedOrd = [
      { id: ordset, _xyfCoordinates: ordset.xyData.map(contourMap) }
    ]

    const oContours = contouring({
      summaryType: type,
      data: projectedOrd,
      finalXExtent: [0, adjustedSize[0]],
      finalYExtent: [0, adjustedSize[1]]
    })
    const contourMarks = []
    oContours.forEach((d, i) => {
      d.coordinates.forEach((coords, ii) => {
        const eventListeners = eventListenersGenerator(d, i)
        contourMarks.push(
          <Mark
            {...baseMarkProps}
            {...eventListeners}
            renderMode={renderValue}
            simpleInterpolate={true}
            key={`${i}-${ii}`}
            style={styleFn(ordset.pieceData[0].data, ordsetI)}
            className={classFn(ordset.pieceData[0].data, ordsetI)}
            markType={"path"}
            d={`M${d.coordinates[0].map((p) => p.join(",")).join("L")}Z`}
          />
        )
      })
    })

    renderedSummaryMarks.push(
      <g
        key={`contour-container-${ordsetI}`}
        role="img"
        tabIndex={-1}
        data-o={key}
        aria-label={`${key} Contour plot`}
      >
        {contourMarks}
      </g>
    )
  })
  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords }
}

function axisGenerator(axisProps, i, axisScale) {
  return (
    <Axis
      label={axisProps.label}
      key={axisProps.key || `orframe-summary-axis-${i}`}
      orient={axisProps.orient}
      size={axisProps.size}
      ticks={axisProps.ticks}
      tickSize={axisProps.tickSize}
      tickFormat={axisProps.tickFormat}
      tickValues={axisProps.tickValues}
      rotate={axisProps.rotate}
      scale={axisScale}
      className={axisProps.className}
    />
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
  baseMarkProps
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
    axisCreator = axisGenerator
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
    const renderValue = renderMode && renderMode(summary, summaryI)

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
        renderValue,
        summaryStyle: calculatedSummaryStyle,
        type,
        baseMarkProps
      })
      const tiles = mappedBars.marks
      if (projection === "radial") {
        translate = [0, 0]
      }

      if (type.axis && type.type === "histogram") {
        renderedSummaryMarks.push(
          createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        )
      }
      mappedBars.points.forEach((d) => {
        d.x += translate[0]
        d.y += translate[1]
      })

      summaryXYCoords.push(...mappedBars.points)
      renderedSummaryMarks.push(
        <g
          {...eventListeners}
          transform={`translate(${translate})`}
          key={`summaryPiece-${summaryI}`}
          role="img"
          tabIndex={-1}
          data-o={summary.name}
          aria-label={`${summary.name} ${type.type}`}
        >
          {tiles}
        </g>
      )
    } else if (type.type === "violin") {
      const { iqr } = type
      const subsets = type.subsets || [false]
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

        renderedSummaryMarks.push(
          <Mark
            {...baseMarkProps}
            transform={`translate(${translate})`}
            key={`summaryPiece-${summaryI}-${subsettingIndex}`}
            {...eventListeners}
            renderMode={renderValue}
            markType="path"
            className={calculatedSummaryClass}
            style={calculatedSummaryStyle}
            d={violinArea(violinPoints)}
            role="img"
            tabIndex={-1}
            data-o={summary.name}
            aria-label={`${summary.name} distribution`}
          />
        )
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

          renderedSummaryMarks.push(
            <Mark
              {...baseMarkProps}
              key={`summaryPiece-${summaryI}-${subsettingIndex}-iqr-line`}
              {...eventListeners}
              renderMode={renderValue}
              markType="path"
              className={calculatedSummaryClass}
              style={{
                stroke: "black",
                strokeWidth: "2px",
                ...calculatedSummaryStyle,
                ...summaryElementStylingFn("iqr")
              }}
              d={iqrLine(iqrValues[0], iqrValues[2], translate)}
              role="img"
              tabIndex={-1}
              data-o={summary.name}
              aria-label={`${summary.name} distribution`}
            />
          )

          renderedSummaryMarks.push(
            <Mark
              {...baseMarkProps}
              key={`summaryPiece-${summaryI}-${subsettingIndex}-iqr-median`}
              {...eventListeners}
              markType="circle"
              className={calculatedSummaryClass}
              style={{
                stroke: "black",
                fill: "black",
                strokeWidth: "1px",
                r: "3px",
                ...calculatedSummaryStyle,
                ...summaryElementStylingFn("median")
              }}
              cx={projection === "vertical" ? translate[0] : iqrValues[1]}
              cy={projection === "vertical" ? iqrValues[1] : translate[1]}
              role="img"
              tabIndex={-1}
              data-o={summary.name}
              aria-label={`${summary.name} distribution`}
            />
          )
        }
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
        renderedSummaryMarks.push(
          createSummaryAxis({
            summary,
            summaryI,
            axisSettings: { baseline: false, ...type.axis },
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        )
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
        renderedSummaryMarks.push(
          createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        )
      }

      renderedSummaryMarks.push(
        <Mark
          {...baseMarkProps}
          transform={`translate(${translate})`}
          key={`summaryPiece-${summaryI}`}
          {...eventListeners}
          renderMode={renderValue}
          markType="path"
          className={calculatedSummaryClass}
          style={calculatedSummaryStyle}
          d={joyArea(joyPoints)}
          role="img"
          tabIndex={-1}
          data-o={summary.name}
          aria-label={`${summary.name} distribution`}
        />
      )
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

        return (
          <Mark
            {...baseMarkProps}
            transform={`translate(${translate})`}
            key={`summaryPiece-${summaryI}-${multiBinI}`}
            {...eventListeners}
            renderMode={renderValue}
            markType="path"
            className={calculatedSummaryClass}
            style={{
              ...calculatedSummaryStyle,
              ...summaryElementStylingFn(multiBin, multiBinI)
            }}
            d={horizonArea(horizonPoints)}
            role="img"
            tabIndex={-1}
            data-o={summary.name}
            aria-label={`${summary.name} distribution`}
          />
        )
      })

      if (type.axis) {
        renderedSummaryMarks.push(
          createSummaryAxis({
            summary,
            summaryI,
            axisSettings: type.axis,
            axisCreator,
            projection,
            actualMax,
            adjustedSize,
            columnWidth
          })
        )
      }

      renderedSummaryMarks.push(<g>{multiBinMarks}</g>)
    }
  })

  return {
    marks: renderedSummaryMarks,
    xyPoints: summaryXYCoords,
    thresholds: binBuckets
  }
}

export const drawSummaries = ({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
  margin,
  baseMarkProps
}) => {
  if (!type || !type.type) return
  type = typeof type === "string" ? { type } : type
  const chartSize =
    projection === "vertical" ? adjustedSize[1] : adjustedSize[0]

  return orFrameSummaryRenderer({
    data,
    type,
    renderMode,
    eventListenersGenerator,
    styleFn,
    classFn,
    projection,
    adjustedSize,
    chartSize,
    margin,
    baseMarkProps
  })
}

export const renderLaidOutSummaries = ({ data }) => {
  return data
}
