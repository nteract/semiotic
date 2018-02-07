import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import RegionatedLineChartRaw from "./RegionatedLineChartRaw"

export default class RegionatedLineChartDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: RegionatedLineChartRaw,
      source: `
      const borderCutLine = ({ d, i, xScale, yScale }) => {
      const lineOpacity = opacityScale(d.label)
      return (<DividedLine
          data={[d]}
          parameters={(p,q) => {
          if (p.delta < p.bottomDelta) {
              return { stroke: blue, strokeWidth: 1, fill: "none", strokeOpacity: lineOpacity }
          }
          if (p.delta > p.topDelta) {
              return { stroke: red, strokeWidth: 1, fill: "none", strokeOpacity: lineOpacity }
          }
              return { fill: "none", stroke: "gray", strokeOpacity: lineOpacity / 4 }
          }}
          searchIterations={20}
          customAccessors={{ x: d => xScale(d.x), y: d => yScale(d.y) }}
          forceUpdate={true}
          lineDataAccessor={d => d.data}
          interpolate={curveMonotoneX}
          />)}

      const monthNameHash = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]

      const degreeDiffFormat = d => ${"`${d > 0 ? '+' : ''}${Math.ceil(d * 100)/ 100}°`"}
      const monthNameFormat = d => monthNameHash[d] ? monthNameHash[d] : ""

      const lineAnnotater = ({ d, xScale, yScale }) => {
          if (!d.parentLine) {
              return null
          }
          const lineRenderer = line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(curveMonotoneX)

          return d.coincidentPoints.map((p,q) => {
              const lineD = lineRenderer(p.parentLine.data)
              const opacity = opacityScale(p.parentLine.label)
              return <path key={${"`hover-line-${q}`"}} d={lineD} style={{ fill: "none", stroke: "black", strokeWidth: 3, strokeOpacity: opacity }} />
          })
          
      }

      const chartSettings = {
        title: "Monthly Temperature in New York Since 1967",
        size: [720,500],
        lines,
        xAccessor: d => d.step,
        axes: [
        { orient: 'left', tickFormat: degreeDiffFormat, label: "Difference in monthly temperature from median" },
        { orient: 'bottom', rotate: 45, tickFormat: monthNameFormat }
          ],
        yAccessor: d => d.delta,
        margin: { top: 35, right: 30, left: 50, bottom: 50},
        customLineMark: borderCutLine,
        customPointMark: d => <Mark markType="circle" r={0} />,
        areaStyle: () => ({
          fillOpacity: 0.15,
          fill: "#E1E1E1",
          stroke: "#838383",
          strokeWidth: "1.5px",
          strokeDasharray: "2 4" }),
        areas: [ bounds ],
        areaDataAccessor: d => d.coordinates,
        annotations: [{
          type: annotationCalloutElbow,
          connector: { end: "dot" },
          dx: -100,
          dy: 0,
          step: 6,
          value: 79,
          delta: 2.9, 
          label: "Summer of Sam" }],
        dataVersion: "fixed",
        tooltipContent: d => <div className="tooltip-content">
        <h2 style={{ marginTop: "10px" }}>{d.coincidentPoints.map(d => d.year).join(",")}</h2>
        <h3 style={{ marginTop: "10px" }}>{monthNameFormat(d.step)}</h3>
        <p>{d.value}°</p><p>{degreeDiffFormat(d.delta)} from median</p>
        </div>,
        svgAnnotationRules: lineAnnotater,
        hoverAnnotation: true
      }

      displayFrame = <XYFrame
        { ...chartSettings }
      />

      `
    })

    return (
      <DocumentComponent
        name="RegionatedLineChart"
        components={[]}
        examples={examples}
        buttons={[]}
      >
        <p>
          Using DividedLine and area rendering to highlight the parts of a line
          that are significantly higher or lower.
        </p>
        <p>
          On hover, the custom tooltip takes advantage of the coincidentPoints
          being exposed in the hovered element to draw all lines that intersect
          with the hovered point.
        </p>
        <p>
          dataVersion is used to prevent the chart from rerendering on hover.
          dataVersion takes a string and as long as that string remains
          unchanged, the chart will not rerender. This can be used when you're
          passing complex and large datasets as a key to manage the update logic
          of the chart.
        </p>
      </DocumentComponent>
    )
  }
}

RegionatedLineChartDocs.title = "RegionatedLineChart"
