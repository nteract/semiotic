import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DendrogramRaw from "./DendrogramRaw"
import { MenuItem } from "material-ui/Menu"
import { InputLabel } from "material-ui/Input"
import { FormControl } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "Hierarchical Charts"
})

export default class Dendrogram extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "circlepack",
      projection: "vertical",
      annotation: "rectangle"
    }
  }
  render() {
    const typeOptions = [
      "sankey",
      "force",
      "tree",
      "cluster",
      "circlepack",
      "treemap",
      "partition"
    ].map(d => (
      <MenuItem key={`type-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const projectionOptions = ["vertical", "horizontal", "radial"].map(d => (
      <MenuItem key={`type-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))
    const annotationOptions = ["rectangle", "circle"].map(d => (
      <MenuItem key={`type-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Chart Type</InputLabel>
        <Select
          value={this.state.type}
          onChange={e => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-2-0-0">
        <InputLabel htmlFor="chart-projection-input">Projection</InputLabel>
        <Select
          value={this.state.projection}
          onChange={e => this.setState({ projection: e.target.value })}
        >
          {projectionOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-3-0-0">
        <InputLabel htmlFor="chart-projection-input">Annotation</InputLabel>
        <Select
          value={this.state.annotation}
          onChange={e => this.setState({ annotation: e.target.value })}
        >
          {annotationOptions}
        </Select>
      </FormControl>
    ]

    const examples = []

    examples.push({
      name: "Basic",
      demo: DendrogramRaw({
        annotation: this.state.annotation,
        type: this.state.type,
        projection: this.state.projection
      }),
      source: `const annotations = [
        {
          type: "enclose${
            this.state.annotation === "rectangle" ? "-rect" : ""
          }",
          ids: [
            "identity",
            "linear",
            "pow",
            "category20",
            "category20",
            "log",
            "sqrt",
            "ordinal",
            "threshold",
            "quantize"
          ],
          label: "Scales",
          padding: 5,
          dy: -150,
          nx: 650
        }
      ]
      const data = {
        name: "d3",
        children: [
          { name: "version", leafColor: "#fdcc8a", blockCalls: 1 },
          { name: "ascending", leafColor: "#e34a33", blockCalls: 120 },
          { name: "descending", leafColor: "#e34a33", blockCalls: 119 },
          { name: "min", leafColor: "#b30000", blockCalls: 1200 },
          { name: "max", leafColor: "#b30000", blockCalls: 721 }
        ]
      }

      const colors = ["#00a2ce", "#b6a756", "#4d430c", "#b3331d"]

      <NetworkFrame
        size={[700, 700]}
        edges={data}
        nodeStyle={(d, i) => ({
          fill: colors[d.depth],
          stroke: "black",
          strokeOpacity: 0.25,
          fillOpacity: 0.25
        })}
        edgeStyle={(d, i) => ({
          fill: colors[d.source.depth],
          stroke: colors[d.source.depth],
          opacity: 0.5
        })}
        nodeIDAccessor={"name"}
        hoverAnnotation={true}
        networkType={{
          type: "${this.state.type}",
          projection: "${this.state.projection}",
          nodePadding: 1,
          forceManyBody: -15,
          edgeStrength: 1.5,
          padding: type === "treemap" ? 3 : type === "circlepack" ? 2 : 0,
          hierarchySum: d => d.blockCalls
        }}
        tooltipContent={d => (
          <div className="tooltip-content">
            {d.parent ? <p>{d.parent.data.name}</p> : undefined}
            <p>{d.data.name}</p>
          </div>
        )}
        annotations={annotations}
        margin={50}
      />`
    })

    return (
      <DocumentComponent
        name="Hierarchical Charts"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          If you send hierarchical data to NetworkFrame (hierarchical JSON to
          the edges property) you can use the various hierarchical diagrams in
          D3 to display that data--"tree", "cluster", "circlepack", "partition"
          and "treemap" which all correspond to D3's tree, cluster, pack,
          partition and treemap layouts. In cases where a layout can honor
          differences in projection (such as "radial", "horizontal" or
          "vertical" for cluster or radial for partition to make a sunburst) it
          will honor those as a projection property of networkType. Other
          properties passed to networkType that correspond to properties
          specific to those layouts, such as padding for treemap and partition,
          will be passed through. You can pass any kind of tree layout function
          that processes hierarchical data like that created with d3-hierarchy.
          Hierarchical JSON can be sent to any NetworkFrame edges property.
        </p>
        <p>The dataset is a pruned map of the D3v3 library.</p>
      </DocumentComponent>
    )
  }
}

Dendrogram.title = "Hierarchical Charts"
