import React from "react"
import { XYFrame } from "../../components"
import { csvParse } from "d3-dsv"
import { scaleLog, scaleLinear, scaleTime } from "d3-scale"
import data from "../sampledata/birthdata.js"
import { d as glyphD } from "d3-glyphedge"
import AnnotationCalloutCircle from "react-annotation/lib/Types/AnnotationCalloutCircle"

import "../example_settings/comet.css"
import ProcessViz from "./ProcessViz"

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]

const processedData = csvParse(data)
let diff = 0
processedData.forEach(d => {
  d.endweight = +d.endweight
  d.startweight = +d.startweight
  d.endvalue = +d.endvalue
  d.startvalue = +d.startvalue
  d.weightDiff = d.endweight - d.startweight
  if (Math.abs(d.weightDiff) > diff) {
    diff = Math.abs(d.weightDiff)
  }
})

const colorScale = scaleLinear()
  .domain([-diff, 0, diff])
  .range(["orange", "grey", "blue"])

const widthScale = scaleLinear()
  .domain([-diff, 0, diff])
  .range([5, 1, 5])

function customCometMark({ d, xScale, yScale }) {
  const edge = {
    source: {
      x: xScale(d.startweight) - xScale(d.endweight),
      y: yScale(d.startvalue) - yScale(d.endvalue)
    },
    target: {
      x: 0,
      y: 0
    }
  }
  const circleSize = widthScale(d.weightDiff)
  return (
    <g>
      <path stroke={"none"} d={glyphD.comet(edge, circleSize)} />
      <circle r={circleSize} />
    </g>
  )
}

const nflx = [
  { date: "09/14/2018", open: 368, high: 371, low: 363, close: 364.56 },
  { date: "09/13/2018", open: 371, high: 374, low: 366, close: 368.15 },
  { date: "09/12/2018", open: 359, high: 370, low: 356, close: 369.95 },
  { date: "09/11/2018", open: 344, high: 356, low: 343, close: 355.93 },
  { date: "09/10/2018", open: 352, high: 352, low: 343, close: 348.41 },
  { date: "09/07/2018", open: 342, high: 355, low: 341, close: 348.68 },
  { date: "09/06/2018", open: 347, high: 356, low: 341, close: 346.46 },
  { date: "09/05/2018", open: 360, high: 363, low: 335, close: 341.18 },
  { date: "09/04/2018", open: 366, high: 368, low: 361, close: 363.6 },
  { date: "08/31/2018", open: 370, high: 376, low: 367, close: 367.68 },
  { date: "08/30/2018", open: 365, high: 376, low: 363, close: 370.98 },
  { date: "08/29/2018", open: 367, high: 369, low: 362, close: 368.04 },
  { date: "08/28/2018", open: 367, high: 369, low: 360, close: 368.49 },
  { date: "08/27/2018", open: 367, high: 374, low: 360, close: 364.58 },
  { date: "08/24/2018", open: 346, high: 359, low: 344, close: 358.82 },
  { date: "08/23/2018", open: 348, high: 350, low: 337, close: 339.17 },
  { date: "08/22/2018", open: 338, high: 346, low: 337, close: 344.44 },
  { date: "08/21/2018", open: 331, high: 341, low: 329, close: 338.02 },
  { date: "08/20/2018", open: 314, high: 331, low: 310, close: 327.73 },
  { date: "08/17/2018", open: 319, high: 324, low: 312, close: 316.78 },
  { date: "08/16/2018", open: 329, high: 331, low: 321, close: 322.44 },
  { date: "08/15/2018", open: 334, high: 335, low: 321, close: 326.4 },
  { date: "08/14/2018", open: 342, high: 342, low: 336, close: 337.49 },
  { date: "08/13/2018", open: 339, high: 347, low: 339, close: 341.31 },
  { date: "08/10/2018", open: 346, high: 349, low: 344, close: 345.87 },
  { date: "08/09/2018", open: 347, high: 352, low: 345, close: 349.36 },
  { date: "08/08/2018", open: 352, high: 352, low: 346, close: 347.61 },
  { date: "08/07/2018", open: 353, high: 357, low: 349, close: 351.83 },
  { date: "08/06/2018", open: 342, high: 365, low: 341, close: 347 },
  { date: "08/03/2018", open: 347, high: 347, low: 338, close: 343.09 },
  { date: "08/02/2018", open: 337, high: 345, low: 334, close: 344.5 },
  { date: "08/01/2018", open: 335, high: 344, low: 334, close: 338.38 },
  { date: "07/31/2018", open: 331, high: 342, low: 328, close: 337.45 },
  { date: "07/30/2018", open: 351, high: 352, low: 334, close: 334.96 },
  { date: "07/27/2018", open: 366, high: 367, low: 351, close: 355.21 },
  { date: "07/26/2018", open: 358, high: 365, low: 356, close: 363.09 },
  { date: "07/25/2018", open: 357, high: 363, low: 355, close: 362.87 },
  { date: "07/24/2018", open: 366, high: 367, low: 354, close: 357.32 },
  { date: "07/23/2018", open: 359, high: 363, low: 353, close: 362.66 },
  { date: "07/20/2018", open: 364, high: 370, low: 360, close: 361.05 },
  { date: "07/19/2018", open: 371, high: 375, low: 363, close: 364.23 },
  { date: "07/18/2018", open: 381, high: 383, low: 372, close: 375.13 },
  { date: "07/17/2018", open: 346, high: 385, low: 344, close: 379.48 },
  { date: "07/16/2018", open: 398, high: 403, low: 391, close: 400.48 },
  { date: "07/13/2018", open: 409, high: 410, low: 395, close: 395.8 },
  { date: "07/12/2018", open: 415, high: 416, low: 407, close: 413.5 },
  { date: "07/11/2018", open: 411, high: 419, low: 410, close: 418.65 },
  { date: "07/10/2018", open: 417, high: 419, low: 413, close: 415.63 },
  { date: "07/09/2018", open: 415, high: 419, low: 411, close: 418.97 },
  { date: "07/06/2018", open: 397, high: 408, low: 395, close: 408.25 },
  { date: "07/05/2018", open: 393, high: 399, low: 390, close: 398.39 },
  { date: "07/03/2018", open: 399, high: 399, low: 389, close: 390.52 },
  { date: "07/02/2018", open: 385, high: 398, low: 380, close: 398.18 },
  { date: "06/29/2018", open: 399, high: 401, low: 390, close: 391.43 },
  { date: "06/28/2018", open: 395, high: 396, low: 387, close: 395.42 },
  { date: "06/27/2018", open: 407, high: 411, low: 390, close: 390.39 },
  { date: "06/26/2018", open: 393, high: 404, low: 389, close: 399.39 },
  { date: "06/25/2018", open: 404, high: 405, low: 378, close: 384.48 },
  { date: "06/22/2018", open: 419, high: 420, low: 409, close: 411.09 },
  { date: "06/21/2018", open: 421, high: 423, low: 406, close: 415.44 },
  { date: "06/20/2018", open: 415, high: 419, low: 409, close: 416.76 },
  { date: "06/19/2018", open: 389, high: 405, low: 388, close: 404.98 },
  { date: "06/18/2018", open: 387, high: 393, low: 386, close: 390.4 },
  { date: "06/15/2018", open: 390, high: 398, low: 387, close: 391.98 },
  { date: "06/14/2018", open: 384, high: 395, low: 383, close: 392.87 }
]

const complexTickFormat = tickValue => {
  if (
    tickValue < 6 ||
    (tickValue >= 10 && tickValue <= 50) ||
    (tickValue >= 100 && tickValue <= 500) ||
    tickValue === 900
  ) {
    return tickValue
  }
  return ""
}
const cometChart = {
  size: [600, 600],
  margin: 70,
  xScaleType: scaleLog(),
  yScaleType: scaleLog(),
  pointStyle: d => ({ fill: colorScale(d.weightDiff) }),
  customPointMark: customCometMark,
  points: processedData,
  xAccessor: "endweight",
  yAccessor: "endvalue",
  xExtent: [500, 1000000],
  annotations: [
    {
      type: "enclose",
      coordinates: processedData.filter(
        d => d.birthweight === " 2000 - 2499 grams"
      ),
      dx: -100,
      dy: -1,
      label: " 2000 - 2499 grams"
    },
    {
      type: AnnotationCalloutCircle,
      coordinates: processedData.filter(d => d.state === "Georgia"),
      nx: 503,
      ny: 80,
      label: "Georgia",
      subject: { radius: 6, radiusPadding: 2 }
    }
  ],
  annotationSettings: { layout: { type: "marginalia", orient: "right" } },
  axes: [
    {
      orient: "left",
      tickFormat: complexTickFormat,
      label: "Fetal Death Rate"
    },
    {
      orient: "bottom",
      tickFormat: d => (d === 1000000 ? "1m" : `${d / 1000}k`),
      tickValues: [1000, 10000, 100000, 1000000],
      label: "Number of Births"
    }
  ],
  tooltipContent: d => (
    <div className="tooltip-content">
      <p>{d.state}</p>
      <p>{d.birthweight}</p>
    </div>
  ),
  hoverAnnotation: true
}
export default (
  <div>
    <ProcessViz frameSettings={cometChart} frameType="XYFrame" />
    <XYFrame {...cometChart} />
    <XYFrame
      title={"Candlestick Chart"}
      size={[700, 400]}
      dataVersion="fixed"
      points={nflx}
      pointStyle={(d, i, yi) => ({ fill: colors[yi] })}
      hoverAnnotation={true}
      xScaleType={scaleTime()}
      xAccessor={d => new Date(d.date)}
      yAccessor={d => [d.open, d.high, d.low, d.close]}
      margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left"
        },
        {
          orient: "bottom",
          tickFormat: d => `${d.getMonth()}/${d.getDate()}`
        }
      ]}
    />
    <XYFrame
      title={"Candlestick Chart"}
      size={[700, 400]}
      dataVersion="fixed"
      points={nflx}
      customPointMark={({ d, xy, yScale }) => {
        const middle = yScale(xy.yMiddle)

        const openY = yScale(d.open) - middle
        const closeY = yScale(d.close) - middle
        const minY = yScale(d.low) - middle
        const maxY = yScale(d.high) - middle
        return (
          <g>
            <line width={2} y1={minY} y2={maxY} stroke="black" />
            <rect
              width={4}
              x={-2}
              height={Math.abs(openY - closeY)}
              y={Math.min(openY, closeY)}
              fill={d.open > d.close ? "rgb(179, 51, 29)" : "rgb(77, 67, 12)"}
            />
          </g>
        )
      }}
      annotations={[
        {
          type: "enclose-hull",
          coordinates: nflx.filter((d, i) => i > 8 && i < 14),
          label: "False Optimism",
          dx: 50,
          dy: -50
        }
      ]}
      hoverAnnotation={true}
      xScaleType={scaleTime()}
      xAccessor={d => new Date(d.date)}
      yAccessor={d => [d.open, d.high, d.low, d.close]}
      margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left"
        },
        {
          orient: "bottom",
          tickFormat: d => `${d.getMonth()}/${d.getDate()}`
        }
      ]}
    />
    <XYFrame
      title={"Horizontal Candlestick Chart"}
      size={[700, 700]}
      dataVersion="fixed"
      points={nflx}
      customPointMark={({ d, xy, xScale }) => {
        const middle = xScale(xy.xMiddle)

        const openY = xScale(d.open) - middle
        const closeY = xScale(d.close) - middle
        const minY = xScale(d.low) - middle
        const maxY = xScale(d.high) - middle

        return (
          <g>
            <line width={2} x1={minY} x2={maxY} stroke="black" />
            <rect
              height={4}
              y={-2}
              width={Math.abs(openY - closeY)}
              x={Math.min(openY, closeY)}
              fill={d.open > d.close ? "rgb(179, 51, 29)" : "rgb(77, 67, 12)"}
            />
          </g>
        )
      }}
      annotations={[
        {
          type: "enclose-hull",
          coordinates: nflx.filter((d, i) => i > 8 && i < 14),
          label: "False Optimism",
          dx: 50,
          dy: -50
        }
      ]}
      hoverAnnotation={true}
      yScaleType={scaleTime()}
      yAccessor={d => new Date(d.date)}
      xAccessor={d => [d.open, d.high, d.low, d.close]}
      margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left",
          tickFormat: d => `${d.getMonth()}/${d.getDate()}`
        },
        {
          orient: "bottom"
        }
      ]}
    />
  </div>
)
