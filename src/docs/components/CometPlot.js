import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import CometPlotRaw from "./CometPlotRaw"

const components = []

components.push({
  name: "Comet Plot"
})

export default class CometPlotDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: CometPlotRaw,
      source: `import * as React from "react"
import { XYFrame } from "semiotic"
import { csvParse } from "d3-dsv"
import { scaleLog, scaleLinear } from "d3-scale"
import { d as glyphD } from "d3-glyphedge"
import AnnotationCalloutCircle from "react-annotation/lib/Types/AnnotationCalloutCircle"
import "../example_settings/comet.css"
      
      const data = ${"`"}state,birthweight,startvalue,endvalue,startweight,endweight
Ohio, 2500 - 2999 grams, 5.53, 4.88, 101227, 109151
Ohio, 1500 - 1999 grams, 29.19, 26.96, 9078, 9904${"`"}

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

      <XYFrame
    size={[600, 600]}
    margin={{ left: 50, top: 20, right: 30, bottom: 50 }}
    xScaleType={scaleLog()}
    yScaleType={scaleLog()}
    pointStyle={d => ({ fill: colorScale(d.weightDiff) })}
    customPointMark={customCometMark}
    points={processedData}
    xAccessor={"endweight"}
    yAccessor={"endvalue"}
    xExtent={[500, 1000000]}
    annotations={[
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
    ]}
    axes={[
      { orient: "left", tickFormat: complexTickFormat },
      {
        orient: "bottom",
        tickFormat: d => (d === 1000000 ? "1m" : d / 1000 + "k"),
        tickValues: [1000, 10000, 100000, 1000000]
      }
    ]}
    tooltipContent={d => (
      <div className="tooltip-content">
        <p>{d.state}</p>
        <p>{d.birthweight}</p>
      </div>
    )}
    hoverAnnotation={true}
  />`
    })

    return (
      <DocumentComponent
        name="Comet Plot Plot"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Based on{" "}
          <a
            href="https://bl.ocks.org/zanarmstrong/f7793345e15b0916d353ee33c54478c4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Zan Armstrong's concept of a Comet Plot
          </a>{" "}
          that encodes change from one time (the point of the comet) to another
          (the broad part of the comet) in a traditional XY space. This example
          uses customPointMark to draw each comet. Because the mark will be
          drawn at the XY position of the point, notice how the function needs
          to calculate the scaled x and y positions of the both start and end
          point to pass the values to a d3-glyphEdge generator to draw the
          comet.
        </p>
        <p>
          Also demonstrated here are the "enclose" annotation and the
          multi-subject annotation. Both take a coordinates array of points
          within the chartspace but one draws a circle around the minimum area
          of those points whereas the other draws a connector and subject but
          only one note for all the points. You send a multisubject annotation
          by giving any react-annotation a coordinates, you send an enclose
          annotation by declaring the type to be "enclose".
        </p>
      </DocumentComponent>
    )
  }
}

CometPlotDocs.title = "Comet Plot"
