import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import AppleStockChartRaw from "./AppleStockChartRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "AppleStockChart"
})

export default class AppleStockChart extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      editMode: true,
      overridePosition: {}
    }
  }
  render() {
    const buttons = []

    const examples = []
    examples.push({
      name: "Basic",
      demo: AppleStockChartRaw(this.state.editMode),
      source: `
import { XYFrame, DividedLine } from "../../components"
import { data } from '../sampledata/apple_stock'
import { scaleTime } from 'd3-scale'


const chartAxes = [
    {orient: "left", tickFormat: d => ${"`$${d}`"}},
    {orient: "bottom", ticks: 6, tickFormat: d => d.getFullYear()}
]

const thresholdLine = ({ d, i, xScale, yScale }) => {

return (<DividedLine
    key={${"`threshold-${i}`"}}
    data={[d]}
    parameters={(p,q) => {
        if (p.close > 100) {
            return { stroke: "rgb(182, 167, 86)", fill: "none" }
        }
            return { stroke: "rgb(77, 67, 12)", fill: "none" }
        }
    }
    customAccessors={{ x: d => xScale(d.x), y: d => yScale(d.y) }}
    lineDataAccessor={d => d.data}
    />)}

const annotations = [
  {
    className: "dot-com-bubble",
    type: "bounds",
    bounds: [{ date: new Date("1/2/1997") }, { date: new Date("1/2/2001") }],
    label: "The dot-com bubble",
    dx: 350
  },
  { type: "x", date: "7/9/1997", note: { label: "Steve Jobs Returns", align: "middle" }, color: "rgb(0, 162, 206)", dy: -10, dx: 0, connector: { end: "none" } },
  { type: "x", date: "8/15/1998", note: { label: "iMac Release", align: "middle" }, color: "rgb(0, 162, 206)", dy: -10, dx: 0, connector: { end: "none" } },
  { type: "x", date: "10/23/2001", note: { label: "iPod Release", align: "middle" }, color: "rgb(0, 162, 206)", dy: -10, dx: 0, connector: { end: "none" } },
  { type: "y", close: 100, label: "Over $100", color: "rgb(182, 167, 86)", x: 350, dx: -15 },
  { type: "enclose", label: "Stock Split", dy: 0, dx: 50, color: "rgba(179, 51, 29, 0.75)", connector: { end: "none" }, coordinates: [
      {
          "date": "6/21/2000",
          "close": 55.62
      }, {
          "date": "6/20/2000",
          "close": 101.25
      }
  ] },
]

const customTooltip = d => <div className="tooltip-content">
    <p>Date: {d.date}</p>
    <p>Closing Price: ${"${d.close}"}</p>
    </div>

<XYFrame
    size={[750,300]}
    xScaleType={scaleTime()}
    xAccessor={d => new Date(d.date)}
    yAccessor={"close"}
    lines={[ { label: "Apple Stock", coordinates: data } ]}
    lineStyle={{ stroke: "red" }}
    customLineMark={thresholdLine}
    axes={chartAxes}
    annotations={annotations}
    margin={50}
    hoverAnnotation={true}
    tooltipContent={customTooltip}
/>

      `
    })

    examples.push({
      name: "Editable Annotations",
      demo: (
        <div>
          <p>
            react-annotation already has built in functionality for adjusting
            the annotations it creates. You can activate the note editing
            control points by setting `editMode: true` on any of your
            annotations. With that in place, you can also set the drag,
            dragStart or dragEnd properties of the annotation to pass the new
            annotation position data to whatever you're using to manage state.
            In this simple example, I just override the dx/dy based on the new
            values but you could pass this back to a central annotation store or
            other method of saving changes.
          </p>
          <button
            style={{ color: "black" }}
            onClick={() => this.setState({ editMode: !this.state.editMode })}
          >
            {this.state.editMode ? "Turn off editMode" : "Turn on editMode"}
          </button>
          {AppleStockChartRaw(
            this.state.editMode,
            this.state.overridePosition,
            d => {
              this.setState({
                overridePosition: {
                  ...this.state.overridePosition,
                  [d.noteIndex]: {
                    dx: d.updatedSettings.dx,
                    dy: d.updatedSettings.dy
                  }
                }
              })
            }
          )}
        </div>
      ),
      source: `
constructor(props) {
  super(props)

  this.state = {
    editMode: true,
    overridePosition: {}
  }
}

render() {
  const annotations = [{
    type: "x",
    date: "7/9/1997",
    note: { label: "Steve Jobs Returns", align: "middle" },
    color: "rgb(0, 162, 206)",
    dy: -10,
    dx: 0,
    connector: { end: "none" },
    editMode,
    onDragEnd: annotationInfo => {
      annotationInfo => {
        this.setState({
          overridePosition: {
            ...this.state.overridePosition,
            [annotationInfo.noteIndex]: {
              dx: annotationInfo.updatedSettings.dx,
              dy: annotationInfo.updatedSettings.dy
            }
          }
        })
      }

    }  
  }]

  annotations.forEach((d, i) => {
    if (this.state.overridePosition[i]) {
      d.dx = overridePosition[i].dx
      d.dy = overridePosition[i].dy
    }
  })

  return <XYFrame
  {...as above example}
/>
}`
    })
    return (
      <DocumentComponent
        name="Stock Chart with Annotations and Divided Line"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          A detailed example of a single chart with annotations and rich
          information display. It leverages the DividedLine component and
          built-in annotation handling to reproduce{" "}
          <a
            href="https://bl.ocks.org/susielu/23dc3082669ee026c552b85081d90976"
            target="_blank"
            rel="noopener noreferrer"
          >
            Susie Lu's Apple stock chart
          </a>
          .
        </p>
        <p>
          It also uses a custom x scale using xScaleType to pass a scale built
          with D3's scaleTime, as well as tooltip processing rules using
          tooltipContent.
        </p>
        <p>
          (If you want to see how to allow your users to edit annotations, check
          out the second example below)
        </p>
      </DocumentComponent>
    )
  }
}

AppleStockChart.title = "Annotations"
