import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import CustomNodesRaw from "./CustomNodesRaw"
import { MenuItem } from "material-ui/Menu"
import { InputLabel } from "material-ui/Input"
import { FormControl } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "DAGRE Graph"
})

export default class DagreGraph extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      direction: "BT",
      ranker: "network-simplex"
    }
  }
  render() {
    const directionOptions = ["BT", "TB", "LR", "RL"].map(d => (
      <MenuItem key={`direction-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const rankerOptions = ["network-simplex", "tight-tree", "longest-path"].map(
      d => (
        <MenuItem key={`direction-option-${d}`} label={d} value={d}>
          {d}
        </MenuItem>
      )
    )

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-direction-input">Layout</InputLabel>
        <Select
          value={this.state.ranker}
          onChange={e => this.setState({ ranker: e.target.value })}
        >
          {rankerOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-2-0-0">
        <InputLabel htmlFor="chart-direction-input">Direction</InputLabel>
        <Select
          value={this.state.direction}
          onChange={e => this.setState({ direction: e.target.value })}
        >
          {directionOptions}
        </Select>
      </FormControl>
    ]

    const examples = []

    examples.push({
      name: "Basic",
      demo: CustomNodesRaw({
        direction: this.state.direction,
        ranker: this.state.ranker
      }),
      source: `import dagre from "dagre"
const g = new dagre.graphlib.Graph()
g.setGraph({ rankdir:  "${this.state.direction}", ranker: "${
        this.state.ranker
      }" })
g.setDefaultEdgeLabel(() => ({}))

g.setNode("spongebob", { label: "Mr. Squarepants", width: 44, height: 35 })
g.setNode("swilliams", { label: "Saul Williams", width: 60, height: 35 })
g.setNode("bpitt", { label: "Brad Pitt", width: 108, height: 35 })
g.setNode("hford", { label: "Harrison Ford", width: 68, height: 35 })
g.setNode("lwilson", { label: "Luke Wilson", width: 44, height: 35 })
g.setNode("kbacon", { label: "Kevin Bacon", width: 101, height: 35 })
g.setNode("f", { label: "Kevin Bacon", width: 210, height: 40 })
g.setNode("ff", { label: "Kevin Bacon", width: 110, height: 40 })
g.setNode("fff", { label: "Kevin Bacon", width: 121, height: 35 })
g.setNode("ffff", { label: "Kevin Bacon", width: 151, height: 45 })

g.setEdge("swilliams", "kbacon", {
  color: "#b3331d",
  weight: 3
})
g.setEdge("bpitt", "kbacon", {
  color: "#b3331d",
  weight: 3
})
g.setEdge("hford", "lwilson", {
  color: "#007190",
  weight: 2
})
g.setEdge("lwilson", "kbacon", {
  color: "#007190",
  weight: 1
})
g.setEdge("f", "lwilson", {
  color: "#007190",
  weight: 3
})
g.setEdge("ff", "f", {
  color: "#007190",
  weight: 5
})
g.setEdge("fff", "ff", {
  color: "#b3331d",
  weight: 4
})
g.setEdge("fff", "hford", {
  color: "#b3331d",
  weight: 3
})
g.setEdge("ff", "kbacon", {
  color: "#b3331d",
  weight: 3
})

dagre.layout(g)

<NetworkFrame
size={[700, 500]}
graph={g}
networkType={{ type: "dagre", zoom: true }}
nodeStyle={{ fill: "#b6a756", stroke: "black" }}
edgeStyle={d => ({
  stroke: d.color,
  fill: "none",
  strokeWidth: d.weight
})}
margin={10}
hoverAnnotation={true}
/>`
    })

    examples.push({
      name: "Parallel Edges",
      demo: CustomNodesRaw({
        direction: this.state.direction,
        ranker: this.state.ranker,
        parallelEdges: true
      }),
      source: `import dagre from "dagre"
const g = new dagre.graphlib.Graph()
g.setGraph({ rankdir: "${this.state.direction}", ranker: "${
        this.state.ranker
      }" })
g.setDefaultEdgeLabel(() => ({}))

g.setNode("spongebob", { label: "Mr. Squarepants", width: 44, height: 35 })
g.setNode("swilliams", {
  label: "Saul Williams",
  width: 60,
  height: 35
})
g.setNode("bpitt", { label: "Brad Pitt", width: 108, height: 35 })
g.setNode("hford", { label: "Harrison Ford", width: 68, height: 35 })
g.setNode("lwilson", { label: "Luke Wilson", width: 44, height: 35 })
g.setNode("kbacon", { label: "Kevin Bacon", width: 101, height: 35 })
g.setNode("f", { label: "Kevin Bacon", width: 210, height: 40 })
g.setNode("ff", { label: "Kevin Bacon", width: 110, height: 40 })
g.setNode("fff", { label: "Kevin Bacon", width: 121, height: 35 })
g.setNode("ffff", { label: "Kevin Bacon", width: 151, height: 45 })

g.setEdge("swilliams", "kbacon", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 10 },
    { color: "#007190", weight: 2 }
  ]
})
g.setEdge("bpitt", "kbacon", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 5 },
    { color: "#007190", weight: 5 }
  ]
})
g.setEdge("hford", "lwilson", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 10 },
    { color: "#007190", weight: 3 }
  ]
})
g.setEdge("lwilson", "kbacon", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [{ color: "#b3331d", weight: 10 }]
})
g.setEdge("f", "lwilson", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 2 },
    { color: "#007190", weight: 6 }
  ]
})
g.setEdge("ff", "f", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 10 },
    { color: "#007190", weight: 5 },
    { color: "#4d430c", weight: 3 }
  ]
})
g.setEdge("fff", "ff", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 3 },
    { color: "#007190", weight: 3 },
    { color: "#4d430c", weight: 3 }
  ]
})
g.setEdge("fff", "hford", {
  color: "#b3331d",
  weight: 3,
  parallelEdges: [
    { color: "#b3331d", weight: 2 },
    { color: "#007190", weight: 1 },
    { color: "#4d430c", weight: 1 }
  ]
})
g.setEdge("ff", "kbacon", {
  color: "#b3331d",
  weight: 3,
  label: "problemEdge",
  parallelEdges: [
    { color: "#b3331d", weight: 5 },
    { color: "#b3331d", weight: 5 },
    { color: "#b3331d", weight: 5 }
  ]
})

dagre.layout(g)

<NetworkFrame
size={[700, 500]}
graph={g}
networkType={{ type: "dagre", zoom: true }}
nodeStyle={{ fill: "#b6a756", stroke: "black" }}
edgeStyle={d => ({
  stroke: "black",
  fill: d.color,
  fillOpacity: 0.5,
  strokeWidth: 0.5
})}
margin={10}
hoverAnnotation={true}
/>`
    })

    return (
      <DocumentComponent
        name="dagre Layout"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Semiotic provides some support for using dagre.js, a flowchart/DAG
          layout that is very effective. You need to import dagre yourself and
          create a dagre graph but once you do that you can pass the laid out
          graph to the graph property and Semiotic will render it fine. It even
          provides support for parallel edges where the weight property of a
          parallel edge determines its width.
        </p>
      </DocumentComponent>
    )
  }
}

DagreGraph.title = "DAGRE Graph"
