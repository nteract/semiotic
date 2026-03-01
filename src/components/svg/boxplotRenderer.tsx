import { quantile } from "d3-array"
import { arc } from "d3-shape"
import { pointOnArcAtAngle } from "./pieceDrawing"
import { scaleLinear } from "d3-scale"

type BoxplotFnType = {
  data: Record<string, any>[]
  type: Record<string, any>
  renderMode: Function
  eventListenersGenerator: Function
  styleFn: Function
  classFn: Function
  projection: "horizontal" | "vertical" | "radial"
  adjustedSize: number[]
}

const emptyObjectReturnFn = () => ({})

export function boxplotRenderFn({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  projection,
  adjustedSize,
}: BoxplotFnType) {
  const summaryElementStylingFn = type.elementStyleFn || emptyObjectReturnFn

  const { outliers, fixedInput } = type

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

    summaryValueNest = thisSummaryData.map((p) => p.value).sort((a, b) => a - b)

    if (fixedInput !== true || summaryValueNest.length !== 5) {
      summaryValueNest = [
        quantile(summaryValueNest, 0.0),
        quantile(summaryValueNest, 0.25),
        quantile(summaryValueNest, 0.5),
        quantile(summaryValueNest, 0.75),
        quantile(summaryValueNest, 1.0)
      ]
    }

    const iqr = summaryValueNest[3] - summaryValueNest[1]
    let minOutlier, maxOutlier

    if (outliers) {
      minOutlier = summaryValueNest[1] - iqr * 1.5
      maxOutlier = summaryValueNest[3] + iqr * 1.5

      summaryValueNest[0] = Math.max(summaryValueNest[0], minOutlier)
      summaryValueNest[4] = Math.min(summaryValueNest[4], maxOutlier)
    }

    // Derive position quantiles from value quantiles via linear interpolation.
    // This avoids depending on d3.quantile sort-order behavior (which changed in v3).
    const posAccessor = projection === "vertical"
      ? (p: { scaledVerticalValue: number }) => p.scaledVerticalValue
      : (p: { scaledValue: number }) => p.scaledValue

    const sortedPieces = [...thisSummaryData].sort((a, b) => a.value - b.value)
    const valMin = sortedPieces[0].value
    const valMax = sortedPieces[sortedPieces.length - 1].value
    const posOfMin = posAccessor(sortedPieces[0])
    const posOfMax = posAccessor(sortedPieces[sortedPieces.length - 1])

    // summaryPositionNest indices now match summaryValueNest:
    // [0]=min, [1]=Q1, [2]=median, [3]=Q3, [4]=max
    summaryPositionNest = summaryValueNest.map((v: number) => {
      if (valMax === valMin) return (posOfMin + posOfMax) / 2
      return posOfMin + (v - valMin) / (valMax - valMin) * (posOfMax - posOfMin)
    })

    if (projection === "vertical") {
      translate = `translate(${summary.x + summary.width / 2},0)`

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

      const columnCenter = summary.x + summary.width / 2

      summaryXYCoords.push(
        {
          label: "Maximum",
          key,
          summaryPieceName: "max",
          x: columnCenter,
          y: summaryPositionNest[4],
          value: summaryValueNest[4]
        },
        {
          label: "3rd Quartile",
          key,
          summaryPieceName: "q3area",
          x: columnCenter,
          y: summaryPositionNest[3],
          value: summaryValueNest[3]
        },
        {
          label: "Median",
          key,
          summaryPieceName: "median",
          x: columnCenter,
          y: summaryPositionNest[2],
          value: summaryValueNest[2]
        },
        {
          label: "1st Quartile",
          key,
          summaryPieceName: "q1area",
          x: columnCenter,
          y: summaryPositionNest[1],
          value: summaryValueNest[1]
        },
        {
          label: "Minimum",
          key,
          summaryPieceName: "min",
          x: columnCenter,
          y: summaryPositionNest[0],
          value: summaryValueNest[0]
        }
      )
    } else if (projection === "horizontal") {
      const columnCenter = summary.x + summary.width / 2

      translate = `translate(0,${columnCenter})`

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
          y: columnCenter,
          value: summaryValueNest[4]
        },
        {
          label: "3rd Quartile",
          key,
          summaryPieceName: "q3area",
          x: summaryPositionNest[3],
          y: columnCenter,
          value: summaryValueNest[3]
        },
        {
          label: "Median",
          key,
          summaryPieceName: "median",
          x: summaryPositionNest[2],
          y: columnCenter,
          value: summaryValueNest[2]
        },
        {
          label: "1st Quartile",
          key,
          summaryPieceName: "q1area",
          x: summaryPositionNest[1],
          y: columnCenter,
          value: summaryValueNest[1]
        },
        {
          label: "Minimum",
          key,
          summaryPieceName: "min",
          x: summaryPositionNest[0],
          y: columnCenter,
          value: summaryValueNest[0]
        }
      )
    }

    if (projection === "radial") {
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

      renderedSummaryMarks.push({
        //This is a g element
        containerProps: {
          ...eventListeners,
          className: calculatedSummaryClass,
          transform: translate,
          key: `summaryPiece-${summaryI}`,
          role: "img",
          tabIndex: -1,
          "data-o": key,
          "aria-label": `${key} boxplot showing ${summaryXYCoords
            .filter((d) => d.key === key)
            .map((d) => `${d.label} ${d.value}`)}`
        },
        //These are drawn items
        elements: [
          {


            markType: "line",
            x1: bottomPoint[0],
            x2: topPoint[0],
            y1: bottomPoint[1],
            y2: topPoint[1],
            style: Object.assign(
              { strokeWidth: 2 },
              calculatedSummaryStyle,
              summaryElementStylingFn("whisker", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: topLineArcGenerator({ startAngle, endAngle }),
            style: Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("max", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: midLineArcGenerator({ startAngle, endAngle }),
            style: Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("median", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: bottomLineArcGenerator({ startAngle, endAngle }),
            style: Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              { fill: "none" },
              summaryElementStylingFn("min", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: bodyArcWholeGenerator({ startAngle, endAngle }),
            style: Object.assign(
              { strokeWidth: 4 },
              calculatedSummaryStyle,
              summaryElementStylingFn("iqrarea", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: bodyArcTopGenerator({ startAngle, endAngle }),
            style: Object.assign(
              {},
              calculatedSummaryStyle,
              { fill: "none", stroke: "none" },
              summaryElementStylingFn("q3area", thisSummaryData)
            )
          },
          {


            markType: "path",
            d: bodyArcBottomGenerator({ startAngle, endAngle }),
            style: Object.assign(
              {},
              calculatedSummaryStyle,
              { fill: "none", stroke: "none" },
              summaryElementStylingFn("q1area", thisSummaryData)
            )
          }
        ]
      })
    } else {
      const boxplotMarks = [
        {


          markType: "line",
          x1: extentlineX1,
          x2: extentlineX2,
          y1: extentlineY1,
          y2: extentlineY2,
          style: Object.assign(
            { strokeWidth: 2 },
            calculatedSummaryStyle,
            summaryElementStylingFn("whisker", thisSummaryData)
          )
        },
        {


          markType: "line",
          x1: topLineX1,
          x2: topLineX2,
          y1: topLineY1,
          y2: topLineY2,
          style: Object.assign(
            { strokeWidth: 2 },
            calculatedSummaryStyle,
            summaryElementStylingFn("min", thisSummaryData)
          )
        },
        {


          markType: "line",
          x1: bottomLineX1,
          x2: bottomLineX2,
          y1: bottomLineY1,
          y2: bottomLineY2,
          style: Object.assign(
            { strokeWidth: 2 },
            calculatedSummaryStyle,
            summaryElementStylingFn("max", thisSummaryData)
          )
        },
        {


          markType: "rect",
          x: rectWholeX,
          width: rectWholeWidth,
          y: rectWholeY,
          height: rectWholeHeight,
          style: Object.assign(
            { strokeWidth: 1 },
            calculatedSummaryStyle,
            summaryElementStylingFn("iqrarea", thisSummaryData)
          )
        },
        {


          markType: "rect",
          x: rectTopX,
          width: rectTopWidth,
          y: rectTopY,
          height: rectTopHeight,
          style: Object.assign(
            {},
            calculatedSummaryStyle,
            { fill: "none", stroke: "none" },
            summaryElementStylingFn("q3area", thisSummaryData)
          )
        },
        {


          markType: "rect",
          x: rectBottomX,
          width: rectBottomWidth,
          y: rectBottomY,
          height: rectBottomHeight,
          style: Object.assign(
            {},
            calculatedSummaryStyle,
            { fill: "none", stroke: "none" },
            summaryElementStylingFn("q1area", thisSummaryData)
          )
        },
        {


          markType: "line",
          x1: midLineX1,
          x2: midLineX2,
          y1: midLineY1,
          y2: midLineY2,
          style: Object.assign(
            { strokeWidth: 2 },
            calculatedSummaryStyle,
            summaryElementStylingFn("median", thisSummaryData)
          )
        }
      ]

      const outlierMarks = []

      if (outliers) {
        const outlierPoints = thisSummaryData.filter(
          (d) => d.value > maxOutlier || d.value < minOutlier
        )

        outlierPoints.forEach((point) => {
          outlierMarks.push({


            markType: "circle",
            cx: projection === "horizontal" ? point.scaledValue : 0,
            cy: projection === "vertical" ? point.scaledVerticalValue : 0,
            style: Object.assign(
              { strokeWidth: "1px", stroke: "black", fill: "none", r: 2 },
              calculatedSummaryStyle,
              summaryElementStylingFn("outlier", thisSummaryData)
            )
          })
        })
      }
      renderedSummaryMarks.push({
        containerProps: {
          ...eventListeners,
          className: calculatedSummaryClass,
          transform: translate,
          key: `summaryPiece-${summaryI}`,
          role: "img",
          tabIndex: -1,
          "data-o": key,
          "aria-label": `${key} boxplot showing ${summaryXYCoords
            .filter((d) => d.key === key)
            .map((d) => `${d.label} ${d.value}`)}`
        },
        //These are drawn items
        elements: [...boxplotMarks, ...outlierMarks]
      })
    }
  })

  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords }
}
