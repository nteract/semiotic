import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { NetworkFrame } from "../../components"
import { Mark } from "semiotic-mark"

import { edgeData } from "../example_settings/networkframe"
import Button from "@material-ui/core/Button"
import Select from "@material-ui/core/Select"
import MenuItem from "@material-ui/core/MenuItem"
import InputLabel from "@material-ui/core/InputLabel"
import FormControl from "@material-ui/core/FormControl"

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
  degree: (d) => Math.min(20, d.degree + 2),
  inDegree: (d) => d.inDegree,
  outDegree: (d) => d.outDegree
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

const chartSize = [600, 1000]

const networkNodeStyle = (d) => ({
  fill: d.createdByFrame ? "#00a2ce" : "#b3331d",
  stroke: d.createdByFrame ? "#00a2ce" : "#b3331d"
})

const networkTypeHash = {
  force: {
    type: "tree",
    iterations: 500,
    edgeStrength: 0.1,
    zoom: true
  },
  motifs: {
    type: "motifs",
    iterations: 500,
    edgeStrength: 0.1,
    zoom: true
  },
  matrix: {
    type: "matrix"
  }
}

components.push({
  name: "NetworkFrame",
  proptypes: `
  `
})

const nodeData = [{ id: "Miles", special: true }]

const networkGraph = { nodes: nodeData, edges: edgeData }

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
      annotations: "on",
      networkType: "matrix",
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
    ].map((d) => (
      <MenuItem key={`edgeType-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const nodeSizeOptions = ["degree", "inDegree", "outDegree"].map((d) => (
      <MenuItem key={`nodeSize-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const annotationOptions = ["off", "on"].map((d) => (
      <MenuItem key={`annotation-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const networkTypeOptions = ["matrix", "force", "motifs"].map((d) => (
      <MenuItem key={`networkType-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const customNodeOptions = ["off", "on"].map((d) => (
      <MenuItem key={`customNode-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const annotations = [
      { type: "node", dy: 25, id: "Miles", label: "Smart guy" },
      {
        type: "enclose-hull",
        nx: 75,
        ny: 75,
        ids: ["Tony", "Fil", "Adam"],
        label: "Annotations are easy!"
      },
      {
        type: "enclose-rect",
        dy: -70,
        dx: 75,
        ids: ["Tony", "Fil"],
        label: "Annotations are easy 2!"
      }
    ]
    const buttons = [
      <div key="button-0">
        <FormControl>
          <InputLabel htmlFor="edge-type-input">edgeType</InputLabel>
          <Select
            value={this.state.edge}
            onChange={(e) => this.setState({ edge: e.target.value })}
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
            onChange={(e) => this.setState({ nodeSize: e.target.value })}
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
            onChange={(e) => this.setState({ annotations: e.target.value })}
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
            onChange={(e) => this.setState({ networkType: e.target.value })}
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
            onChange={(e) => {
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
      graph: networkGraph,
      //      nodes: nodeData, edges: edgeData,
      margin: { top: 50, bottom: 50, left: 50, right: 50 },
      edgeStyle: networkEdgeStyle,
      nodeStyle: networkNodeStyle,
      networkType: networkType,
      edgeType: this.state.edge,
      nodeSizeAccessor: nodeSizeHash[this.state.nodeSize],
      nodeLabels: false,
      hoverAnnotation: "edge",
      htmlAnnotationRules: ({ d }) => {
        if (d.type === "frame-hover" || !d.id) {
          return null
        }
        return (
          <div
            key="specially-rendered"
            style={{
              position: "absolute",
              left: `${d.x}px`,
              top: `${d.y + nodeSizeHash[this.state.nodeSize](d)}px`,
              background: "white",
              border: "1px solid darkred",
              textAlign: "center"
            }}
          >
            HTML Annotation for {d.id}
          </div>
        )
      },
      /*      nodeRenderMode: d =>
        d.createdByFrame
          ? {
              renderMode: "sketchy",
              fillWeight: 3,
              hachureGap: 3.5,
              roughness: 0.5
            }
          : { renderMode: "sketchy", fillWeight: 2, roughness: 2.4 },
      edgeRenderMode: "sketchy", */
      //      canvasPostProcess: glowyCanvas,
      canvasEdges: true,
      canvasNodes: true,
      annotationSettings: {
        pointSizeFunction: (d) => (d.subject && d.subject.radius) || 5,
        labelSizeFunction: (noteData) => {
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
          <Button color="primary">NetworkFrame API</Button>
          <NetworkFrame {...networkChart} />
        </div>
      ),
      source: `
      `
    })

    return (
      <DocumentComponent
        name="NetworkFrame"
        api="https://github.com/emeeks/semiotic/wiki/NetworkFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      ></DocumentComponent>
    )
  }
}

NetworkFrameDocs.title = "NetworkFrame"
