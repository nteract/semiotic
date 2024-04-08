import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { NetworkFrame } from "../../components"
import Mark from "../../components/Mark/Mark"

import { edgeData } from "../example_settings/networkframe"

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
      <option key={`edgeType-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const nodeSizeOptions = ["degree", "inDegree", "outDegree"].map((d) => (
      <option key={`nodeSize-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const annotationOptions = ["off", "on"].map((d) => (
      <option key={`annotation-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const networkTypeOptions = ["matrix", "force", "motifs"].map((d) => (
      <option key={`networkType-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const customNodeOptions = ["off", "on"].map((d) => (
      <option key={`customNode-option-${d}`} label={d} value={d}>
        {d}
      </option>
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
        <form>
          <label htmlFor="edge-type-input">edgeType</label>
          <select
            value={this.state.edge}
            onChange={(e) => this.setState({ edge: e.target.value })}
          >
            {edgeOptions}
          </select>
        </form>
      </div>,
      <div key="button-1">
        <form>
          <label htmlFor="node-size-input">nodeSize</label>
          <select
            value={this.state.nodeSize}
            onChange={(e) => this.setState({ nodeSize: e.target.value })}
          >
            {nodeSizeOptions}
          </select>
        </form>
      </div>,
      <div key="button-2">
        <form>
          <label htmlFor="annotations-input">annotations</label>
          <select
            value={this.state.annotations}
            onChange={(e) => this.setState({ annotations: e.target.value })}
          >
            {annotationOptions}
          </select>
        </form>
      </div>,
      <div key="button-3">
        <form>
          <label htmlFor="network-type-input">networkType</label>
          <select
            value={this.state.networkType}
            onChange={(e) => this.setState({ networkType: e.target.value })}
          >
            {networkTypeOptions}
          </select>
        </form>
      </div>,
      <div key="button-4">
        <form>
          <label htmlFor="custom-node-input">customNodeIcon</label>
          <select
            value={this.state.customNodeIcon}
            onChange={(e) => {
              this.setState({ customNodeIcon: e.target.value })
            }}
          >
            {customNodeOptions}
          </select>
        </form>
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
          <button color="primary">NetworkFrame API</button>
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
