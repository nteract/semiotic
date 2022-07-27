import * as React from "react"
import { NetworkFrame, XYFrame, OrdinalFrame } from "../../components"
import { network_data, or_data } from "../sampledata/energy_time"
import Button from "@material-ui/core/Button"

const components = []
const lineTypes = ["stackedarea", "line", "bumpline", "bumparea"]

const lineSeed = parseInt(Math.random() * 4)

const xyPossibilities = [
  {
    lines: null,
    points: or_data,
    xAccessor: (d) => d.years[0],
    yAccessor: (d) => d.years[8]
  },
  {
    lines: or_data,
    lineType: lineTypes[lineSeed],
    lineDataAccessor: "years",
    xAccessor: (d, i) => i,
    yAccessor: (d) => d
  },
  {
    lines: or_data,
    lineType: lineTypes[(lineSeed + 1) % 5],
    lineDataAccessor: "years",
    xAccessor: (d, i) => i,
    yAccessor: (d) => d
  },
  {
    lines: or_data,
    lineType: lineTypes[(lineSeed + 2) % 5],
    lineDataAccessor: "years",
    xAccessor: (d, i) => i,
    yAccessor: (d) => d
  },
  {
    summaries: [{ label: "Area", coordinates: or_data }],
    summaryType: "contour",
    xAccessor: (d) => d.years[0],
    yAccessor: (d) => d.years[8]
  }
]

const orPossibilities = [
  {
    type: "bar"
  },
  {
    type: "point"
  },
  {
    summaryType: "violin"
  },
  {
    summaryType: "heatmap"
  },
  {
    summaryType: "boxplot"
  }
]

const networkPossibilities = [
  {
    networkType: "sankey"
  },
  {
    networkType: "force"
  },
  {
    networkType: "chord",
    edgeWidthAccessor: (d) => d.value
  }
]

const formatter = (d) => (d > 1000 ? `${parseInt(d / 1000)}k` : d)

const productionSettings = {
  hoverAnnotation: true,
  axes: { orient: "left", tickFormat: formatter },
  axes: [
    { orient: "left", tickFormat: formatter },
    { orient: "bottom", tickFormat: formatter }
  ],
  title: "Amazing datapoints",
  annotations: [
    {
      type: "y",
      years: [0, 0, 0, 0, 0, 0, 1000, 1000, 1000],
      label: "More than a thousand"
    },
    {
      type: "id",
      id: "Gas imports",
      label: "We import more gas than the rest of the world uses in a decade"
    }
  ],
  margin: { left: 50, bottom: 80, right: 10, top: 30 },
  oLabel: true
}

const sharedSettings = {
  size: [400, 400]
}

const networkSettings = {
  nodes: or_data,
  edges: network_data,
  nodeIDAccessor: "id",
  sourceAccessor: "source",
  targetAccessor: "target",
  nodeStyle: (d) => ({ fill: d.color, stroke: d.color }),
  edgeStyle: (d) => ({
    fill: d.source.color,
    stroke: d.source.color,
    fillOpacity: 0.75
  })
}

const xySettings = {
  lineStyle: (d) => ({ fill: d.color, stroke: d.color, fillOpacity: 0.75 }),
  pointStyle: (d) => ({ fill: d.color, stroke: "black", fillOpacity: 0.75 }),
  summaryStyle: (d) => ({
    fill: d.color || "red",
    stroke: "black",
    fillOpacity: 0.75
  })
}

const orSettings = {
  data: or_data,
  oAccessor: "category",
  rAccessor: "output",
  style: (d) => ({ fill: d.color, stroke: d.color }),
  summaryStyle: (d) => ({ fill: d.color, stroke: d.color, fillOpacity: 0.5 }),
  oPadding: 5,
  margin: { top: 5, bottom: 5, left: 0, right: 0 }
}

const renderNetworkFrame = (additionalSettings) => (
  <NetworkFrame
    {...sharedSettings}
    {...networkSettings}
    {...additionalSettings}
  />
)

const renderOrdinalFrame = (additionalSettings) => (
  <OrdinalFrame {...sharedSettings} {...orSettings} {...additionalSettings} />
)

const renderXYFrame = (additionalSettings) => (
  <XYFrame {...sharedSettings} {...xySettings} {...additionalSettings} />
)

components.push({
  name: "Process"
})

export default class Process extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "Process",
      sankeyorient: "center",
      prototypeSeed: 1,
      designSeed: 1,
      mode: "prototype"
    }
  }

  render() {
    const frames = []
    const sketchyFrames = []
    const productionFrames = []

    const designedORSettings = orPossibilities[this.state.designSeed]
    const designedXYSettings = xyPossibilities[this.state.designSeed]
    const designedNetworkSettings = networkPossibilities[this.state.designSeed]

    const prototypedSeeds = [
      this.state.prototypeSeed,
      (this.state.prototypeSeed + 1) % 3
    ]
    const possibleFrames = [
      <div key="pf-1" style={{ display: "inline-block", width: "400px" }}>
        {renderXYFrame(designedXYSettings)}
      </div>,
      <div key="pf-2" style={{ display: "inline-block", width: "400px" }}>
        {renderOrdinalFrame(designedORSettings)}
      </div>,
      <div key="pf-3" style={{ display: "inline-block", width: "400px" }}>
        {renderNetworkFrame(designedNetworkSettings)}
      </div>
    ]

    const possibleSketchyFrames = [
      <div key="psf-1" style={{ display: "inline-block", width: "400px" }}>
        {renderXYFrame({
          ...designedXYSettings,
          lineRenderMode: "sketchy",
          pointRenderMode: "sketchy",
          areaRenderMode: "sketchy"
        })}
      </div>,
      <div key="psf-2" style={{ display: "inline-block", width: "400px" }}>
        {renderOrdinalFrame({
          ...designedORSettings,
          renderMode: "sketchy",
          summaryRenderMode: "sketchy"
        })}
      </div>,
      <div key="psf-3" style={{ display: "inline-block", width: "400px" }}>
        {renderNetworkFrame({
          ...designedNetworkSettings,
          edgeRenderMode: "sketchy",
          nodeRenderMode: "sketchy"
        })}
      </div>
    ]

    const possibleProductionFrames = [
      <div key="psf-1" style={{ display: "inline-block", width: "400px" }}>
        {renderXYFrame({ ...designedXYSettings, ...productionSettings })}
      </div>,
      <div key="psf-2" style={{ display: "inline-block", width: "400px" }}>
        {renderOrdinalFrame({ ...designedORSettings, ...productionSettings })}
      </div>,
      <div key="psf-3" style={{ display: "inline-block", width: "400px" }}>
        {renderNetworkFrame({
          ...designedNetworkSettings,
          ...productionSettings
        })}
      </div>
    ]

    prototypedSeeds.forEach((d) => {
      sketchyFrames.push(possibleSketchyFrames[d])
      frames.push(possibleFrames[d])
      productionFrames.push(possibleProductionFrames[d])
    })

    const prototypeDiv = (
      <div className="process-proto process">
        <div className="process-buttons">
          <Button
            color="primary"
            label={"Prototype!"}
            onTouchTap={() => {
              this.setState({
                prototypeSeed: (this.state.prototypeSeed + 1) % 3
              })
            }}
          />
          <Button
            color="primary"
            label={"On to Design!"}
            onTouchTap={() => {
              this.setState({ mode: "design" })
            }}
          />
        </div>
        {sketchyFrames}
      </div>
    )
    const designDiv = (
      <div className="process-design process">
        <div className="process-buttons">
          <Button
            color="primary"
            label={"Back to prototyping!"}
            onTouchTap={() => {
              this.setState({ mode: "prototype" })
            }}
          />
          <Button
            color="primary"
            label={"Design!"}
            onTouchTap={() => {
              this.setState({ designSeed: (this.state.designSeed + 1) % 5 })
            }}
          />
          <Button
            color="primary"
            label={"On to production!"}
            onTouchTap={() => {
              this.setState({ mode: "production" })
            }}
          />
        </div>
        {frames}
      </div>
    )

    const productionDiv = (
      <div className="process-production process">
        <div className="process-buttons">
          <Button
            primary
            label={"Back to design!"}
            onTouchTap={() => {
              this.setState({ mode: "design" })
            }}
          />
        </div>
        {productionFrames}
      </div>
    )

    return (
      <div className="process-container">
        <h2>Trust the Process</h2>
        <p>
          Good data visualization does not mean implementing a chart as a
          feature request, it means iteration both at the design phase with
          fellow data visualization designers and in the prototyping phase with
          stakeholders.
        </p>
        <p>
          Here's a toy of that process that leverages sketchy rendering in a
          simple "design" phase when you're quickly jumping between possible
          chart modes, followed by a prototyping phase that lets you adjust
          individual frame settings, and ending with a production phase that
          sees the addition of annotations, axes, titles and tooltips.
        </p>
        {this.state.mode !== "prototype" ? null : prototypeDiv}
        {this.state.mode !== "design" ? null : designDiv}
        {this.state.mode !== "production" ? null : productionDiv}
      </div>
    )
  }
}

Process.title = "Process"
