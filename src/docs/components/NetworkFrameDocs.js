import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { NetworkFrame } from "../../components"
import { Mark } from "semiotic-mark"

import { edgeData } from "../example_settings/networkframe"
import Button from "material-ui/Button"
import Select from "material-ui/Select"
import { MenuItem } from "material-ui/Menu"
import Icon from "material-ui-icons/Share"
import { /* Input, */ InputLabel } from "material-ui/Input"
import { FormControl /*, FormHelperText */ } from "material-ui/Form"
import ProcessViz from "./ProcessViz"

const glowyCanvas = (canvas, context, size) => {
  const dataURL = canvas.toDataURL("image/png")
  const baseImage = document.createElement("img")

  baseImage.src = dataURL
  baseImage.onload = () => {
    context.clearRect(0, 0, size[0] + 120, size[1] + 120)
    context.filter = "blur(10px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "blur(5px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "none"
    context.drawImage(baseImage, 0, 0)
  }
}

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

const nodeSizeHash = {
  degree: d => Math.min(20, d.degree + 2),
  inDegree: d => d.inDegree,
  outDegree: d => d.outDegree
}

const squareNodeGenerator = ({ d, transform, key }) => (
  <Mark
    key={key}
    rx={0}
    ry={0}
    transform={transform}
    markType="rect"
    width={d.degree}
    height={d.degree}
    x={-d.degree / 2}
    y={-d.degree / 2}
    style={{
      fill: d.createdByFrame ? "rgb(0, 162, 206)" : "rgb(179, 51, 29)"
    }}
  />
)

const chartSize = [750, 500]

const networkNodeStyle = d => ({
  fill: d.createdByFrame ? "#00a2ce" : "#b3331d",
  stroke: d.createdByFrame ? "#00a2ce" : "#b3331d"
})

const networkTypeHash = {
  force: {
    type: "force",
    iterations: 500,
    edgeStrength: 0.1
  },
  motifs: {
    type: "motifs",
    iterations: 500,
    edgeStrength: 0.1
  }
}

components.push({
  name: "NetworkFrame",
  proptypes: `
    {
  name: PropTypes.string,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  margin: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.object
  ]),
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
  nodeIDAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  sourceAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  targetAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  nodeSizeAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.func
  ]),
  nodeLabels: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func
  ]),
  edgeWidthAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleClickBehavior: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  networkType: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]),
  interaction: PropTypes.object,
  renderFn: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  nodeStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  edgeStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  hoverAnnotation: PropTypes.bool,
  backgroundGraphics:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ]),
  foregroundGraphics:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ])
    }
  `
})

const nodeData = [
  { id: "Susie" },
  { id: "Kai" },
  { id: "Elijah" },
  { id: "Enrico" },
  { id: "j" },
  { id: "k" },
  { id: "l" }
]

const networkEdgeStyle = () => ({
  stroke: "#4d430c",
  fill: "#4d430c",
  fillOpacity: 0.25,
  strokeWidth: "1px"
})

export default class NetworkFrameDocs extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      annotations: "off",
      networkType: "force",
      edge: "none",
      nodeSize: "degree",
      customNodeIcon: "off"
    }
  }

  render() {
    const networkType = networkTypeHash[this.state.networkType]
    const edgeOptions = [
      "none",
      "linearc",
      "ribbon",
      "arrowhead",
      "halfarrow",
      "nail",
      "comet",
      "taffy"
    ].map(d => (
      <MenuItem key={`edgeType-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const nodeSizeOptions = ["degree", "inDegree", "outDegree"].map(d => (
      <MenuItem key={`nodeSize-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const annotationOptions = ["off", "on"].map(d => (
      <MenuItem key={`annotation-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const networkTypeOptions = ["force", "motifs"].map(d => (
      <MenuItem key={`networkType-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const customNodeOptions = ["off", "on"].map(d => (
      <MenuItem key={`customNode-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const annotations = [
      { type: "node", dy: 25, id: "Miles", label: "Smart guy" },
      {
        type: "enclose",
        dy: -70,
        dx: 75,
        ids: ["Tony", "Fil", "Adam"],
        label: "Gang"
      }
    ]
    const buttons = [
      <div key="button-0">
        <FormControl>
          <InputLabel htmlFor="edge-type-input">edgeType</InputLabel>
          <Select
            value={this.state.edge}
            onChange={e => this.setState({ edge: e.target.value })}
          >
            {edgeOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-1">
        <FormControl>
          <InputLabel htmlFor="node-size-input">nodeSize</InputLabel>
          <Select
            value={this.state.nodeSize}
            onChange={e => this.setState({ nodeSize: e.target.value })}
          >
            {nodeSizeOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-2">
        <FormControl>
          <InputLabel htmlFor="annotations-input">annotations</InputLabel>
          <Select
            value={this.state.annotations}
            onChange={e => this.setState({ annotations: e.target.value })}
          >
            {annotationOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-3">
        <FormControl>
          <InputLabel htmlFor="network-type-input">networkType</InputLabel>
          <Select
            value={this.state.networkType}
            onChange={e => this.setState({ networkType: e.target.value })}
          >
            {networkTypeOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-4">
        <FormControl>
          <InputLabel htmlFor="custom-node-input">customNodeIcon</InputLabel>
          <Select
            value={this.state.customNodeIcon}
            onChange={e => {
              this.setState({ customNodeIcon: e.target.value })
            }}
          >
            {customNodeOptions}
          </Select>
        </FormControl>
      </div>
    ]

    const networkChart = {
      size: chartSize,
      graph: { nodes: nodeData, edges: edgeData },
      margin: { top: 50, bottom: 50, left: 50, right: 50 },
      edgeStyle: networkEdgeStyle,
      nodeStyle: networkNodeStyle,
      networkType: networkType,
      edgeType: this.state.edge,
      nodeSizeAccessor: nodeSizeHash[this.state.nodeSize],
      zoomToFit: true,
      nodeLabels: false,
      hoverAnnotation: true,
      download: true,
      nodeRenderMode: d =>
        d.createdByFrame
          ? {
              renderMode: "sketchy",
              fillWeight: 3,
              hachureGap: 3.5,
              roughness: 0.5
            }
          : { renderMode: "sketchy", fillWeight: 2, roughness: 2.4 },
      edgeRenderMode: "sketchy",
      canvasPostProcess: glowyCanvas,
      annotationSettings: {
        pointSizeFunction: d => (d.subject && d.subject.radius) || 5,
        labelSizeFunction: noteData => {
          return noteData.note.label.length * 5.5
        }
      }
    }
    if (this.state.customNodeIcon === "on") {
      networkChart.customNodeIcon = squareNodeGenerator
    }
    if (this.state.annotations === "on") {
      networkChart.annotations = annotations
    }

    const examples = []
    examples.push({
      name: "Basic",
      demo: (
        <div>
          <Button
            color="primary"
            raised
            onTouchTap={() =>
              window.open(
                `https://github.com/emeeks/semiotic/wiki/networkframe`
              )
            }
          >
            NetworkFrame API
          </Button>
          <ProcessViz frameSettings={networkChart} frameType="NetworkFrame" />
          <NetworkFrame {...networkChart} />
        </div>
      ),
      source: `
      import { NetworkFrame } from 'semiotic';

        <NetworkFrame
            size={[ 750, 500 ]}
            edges={edgeData}
            nodes={nodeData}
            margin={60}
            edgeStyle={() => ({ stroke: '#a91a1a', fill: '#a91a1a', fillOpacity: 0.25, strokeWidth: '1px' })}
            nodeStyle={d => ({ fill: d.createdByFrame ? '#1aa962' : "rgb(179, 51, 29)" })}
            networkType={{ type: '${
              this.state.networkType
            }', iterations: 500, edgeStrength: 0.1 }}
            edgeType={'${this.state.edge}'}
            ${
              this.state.customNodeIcon !== "on"
                ? ""
                : `customNodeIcon={ ? ({ d }) => <Mark
                markType="rect"
                width={d.degree}
                height={d.degree}
                x={-d.degree / 2}
                y={-d.degree / 2}
                style={{ fill: d.createdByFrame ? "rgb(0, 162, 206)" : "rgb(179, 51, 29)" }}
            />`
            }
            nodeSizeAccessor={d => d.${this.state.nodeSize} + 2}
            ${
              this.state.annotations === "on" ? "annotations={annotations}" : ""
            }
            zoomToFit={true}
            nodeLabels={true}
            hoverAnnotation={true}
            annotationSettings={{
                pointSizeFunction: d => d.subject && d.subject.radius || 5,
                labelSizeFunction: noteData => {
                    return noteData.note.label.length * 5.5
              } }}
        />
      `
    })

    return (
      <DocumentComponent
        name="NetworkFrame"
        api="https://github.com/emeeks/semiotic/wiki/NetworkFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The NetworkFrame lets you create network diagrams like chord diagrams,
          sankey diagrams and force-directed network diagrams.
        </p>

        <p>Data are sent to the nodes and edges properties.</p>
      </DocumentComponent>
    )
  }
}

NetworkFrameDocs.title = "NetworkFrame"
NetworkFrameDocs.icon = <Icon />
