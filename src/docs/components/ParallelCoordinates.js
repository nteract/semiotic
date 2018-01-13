import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { curveBasis } from "d3-shape"
import { OrdinalFrame } from "../../components"
import { orframe_data } from "../sampledata/nyc_temp"
import { degreeDiffFormat } from "../example_settings/orframe"
import { scaleLinear } from "d3-scale"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

const yearScale = scaleLinear()
  .range(["#f2f0f7", "#cbc9e2", "#9e9ac8", "#6a51a3"])
  .domain([1869, 1900, 1950, 2017])

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

    examples.push({
      name: "Basic",
      demo: (
        <OrdinalFrame
          size={[700, 500]}
          axis={axis}
          rExtent={[0, 85]}
          data={orframe_data}
          rAccessor={d => d.stepValue}
          oAccessor={d => d.stepName}
          style={d => ({
            fill: hiddenHash.get(d.funnelKey)
              ? "none"
              : yearScale(parseInt(d.funnelKey)),
            fillOpacity: 0.75
          })}
          connectorType={d => d.funnelKey}
          connectorStyle={d => ({
            stroke: hiddenHash.get(d.source.funnelKey)
              ? "lightgray"
              : yearScale(parseInt(d.source.funnelKey)),
            strokeWidth: 1,
            strokeOpacity: hiddenHash.get(d.source.funnelKey) ? 0.99 : 0.99
          })}
          type={{ type: "point", r: 1 }}
          axis={{
            orient: "left",
            tickFormat: degreeDiffFormat,
            label: "Monthly temperature"
          }}
          oLabel={d => <text transform="rotate(45) translate(0,20)">{d}</text>}
          margin={{ left: 60, top: 20, bottom: 50, right: 30 }}
          oPadding={5}
          renderKey={d =>
            d.source
              ? `${d.source.stepName}-${d.source.funnelKey}`
              : `${d.stepName}-${d.funnelKey}`
          }
          interaction={{
            columnsBrush: true,
            end: this.brushing,
            extent: this.state.columnExtent
          }}
        />
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
            <OrdinalFrame
              size={[ 700,500 ]}
              axis={axis}
              rExtent={[ 0, 85 ]}
              data={orframe_data.filter(d => !hiddenHash.get(d.funnelKey))}
              rAccessor={d => d.stepValue}
              oAccessor={d => d.stepName}
              style={d => ({ fill: hiddenHash.get(d.funnelKey) ? "none" : yearScale(parseInt(d.funnelKey)), fillOpacity: 0.75 })}
              connectorType={d => d.funnelKey}
              connectorStyle={d => ({ stroke: hiddenHash.get(d.source.funnelKey) ? "lightgray" : yearScale(parseInt(d.source.funnelKey)), strokeWidth: 1, strokeOpacity: 0.75 })}
              type={{ type: "point", r: 1 }}
              axis={{ orient: 'left', tickFormat: degreeDiffFormat, label: "Monthly temperature" }}
              oLabel={d => <text transform="rotate(45)">{d}</text>}
              margin={{ left: 50, top: 150, bottom: 50, right: 30 }}
              oPadding={20}
              renderKey={d => d.source ? ${"`${d.source.stepName}-${d.source.funnelKey}`"} : ${"`${d.stepName}-${d.funnelKey}`"}}
              interaction={{ columnsBrush: true, end: this.brushing, extent: this.state.columnExtent }}
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
