import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { OrdinalFrame } from "../../components"
import { orframe_data } from "../sampledata/nyc_temp"
import { degreeDiffFormat } from "../example_settings/orframe"
import ProcessViz from "./ProcessViz"

const components = []

components.push({
  name: "Parallel Coordinates"
})

export default class ParallelCoordinatesDocs extends React.Component {
  constructor(props) {
    super(props)
    this.brushing = this.brushing.bind(this)
    this.state = {
      columnExtent: {
        January: undefined,
        February: undefined,
        March: undefined,
        April: undefined,
        May: undefined,
        June: undefined,
        July: undefined,
        August: undefined,
        September: undefined,
        October: undefined,
        November: undefined,
        December: undefined
      }
    }
  }

  brushing(e, c) {
    const columnExtent = this.state.columnExtent
    columnExtent[c] = e
    this.setState(columnExtent)
  }

  render() {
    const axis = {
      orient: "left",
      tickFormat: d => d,
      label: {
        name: "axis label",
        position: { anchor: "middle" },
        locationDistance: 40
      }
    }

    const hiddenHash = new Map()

    Object.keys(this.state.columnExtent).forEach(key => {
      if (this.state.columnExtent[key]) {
        const extent = this.state.columnExtent[key].sort((a, b) => a - b)
        orframe_data
          .filter(
            d =>
              d.stepName === key &&
              (d.stepValue < extent[0] || d.stepValue > extent[1])
          )
          .forEach(p => {
            hiddenHash.set(p.funnelKey, true)
          })
      }
    })

    const examples = []

    const parralelCoordinatesChart = {
      size: [700, 500],
      rExtent: [0, 85],
      data: orframe_data,
      rAccessor: "stepValue",
      oAccessor: "stepName",
      style: d => ({
        fill: hiddenHash.get(d.funnelKey)
          ? "none"
          : "red",
        fillOpacity: 0.75,
        stroke: hiddenHash.get(d.funnelKey)
          ? "black"
          : "none",
        strokeOpacity: 0.5
      }),
      connectorType: d => d.funnelKey,
      connectorStyle: d => ({
        stroke: hiddenHash.get(d.source.funnelKey)
          ? "gray"
          : "red",
        strokeWidth: 1,
        strokeOpacity: hiddenHash.get(d.source.funnelKey) ? 0.25 : 0.5
      }),
      type: { type: "point", r: 2 },
      axis: {
        ...axis,
        orient: "left",
        tickFormat: degreeDiffFormat,
        label: "Monthly temperature"
      },
      oLabel: d => <text transform="rotate(45) translate(0,20)">{d}</text>,
      margin: { left: 60, top: 20, bottom: 50, right: 30 },
      oPadding: 5,
      renderKey: d =>
        d.source
          ? `${d.source.stepName}-${d.source.funnelKey}`
          : `${d.stepName}-${d.funnelKey}`,
      interaction: {
        columnsBrush: true,
        during: this.brushing,
        extent: this.state.columnExtent
      },
      canvasConnectors: true,
      canvasPieces: true
    }

    examples.push({
      name: "Basic",
      demo: (
        <div>
          <ProcessViz
            frameSettings={parralelCoordinatesChart}
            frameType="OrdinalFrame"
          />
          <OrdinalFrame {...parralelCoordinatesChart} />
        </div>
      ),
      source: `
constructor(props) {
  super(props)
  this.brushing = this.brushing.bind(this)
  this.state = { columnExtent: { 'January': undefined, 'February': undefined, 'March': undefined, 'April': undefined, 'May': undefined, 'June': undefined, 'July': undefined, 'August': undefined, 'September': undefined, 'October': undefined, 'November': undefined, 'December': undefined } }
}

brushing(e,c) {   
  const columnExtent = this.state.columnExtent    
  columnExtent[c] = e   
  this.setState(columnExtent)   
}

const axis = { orient: 'left', tickFormat: d => d, label: {
    name: "axis label",
    position: { anchor: "middle" },
    locationDistance: 40
} }

const hiddenHash = new Map()

Object.keys(this.state.columnExtent).forEach(key => {
  if (this.state.columnExtent[key]) {
    const extent = this.state.columnExtent[key].sort((a,b) => a - b)
    orframe_data
      .filter(d => d.stepName === key && (d.stepValue < extent[0] || d.stepValue > extent[1]))
      .forEach(p => {
        hiddenHash.set(p.funnelKey, true)
      })
  }
})
const parallelCoordinatesChart = ${JSON.stringify({ ...parralelCoordinatesChart, data: [] }, null, 2)}
<OrdinalFrame
  {...parallelCoordinatesChart}
/>
      `
    })

    return (
      <DocumentComponent
        name="Parallel Coordinates"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          An OrdinalFrame can be turned into a simple Parallel Coordinates by
          enabling column brushing and tying the brushes for each column to a
          filter for the dataset bound to the frame.
        </p>
        <p>
          This example just allows you to filter out different years by
          constraining the recorded temperature by month. A more traditional
          parallel coordinates implementation, one that filtered a dataset by
          different values in each column, would require more work, such as
          custom axis labels and calculating the min/max of each attribute by
          column.
        </p>
      </DocumentComponent>
    )
  }
}

ParallelCoordinatesDocs.title = "Parallel Coordinates"
