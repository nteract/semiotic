import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DendrogramRaw from "./DendrogramRaw"

const components = []

components.push({
  name: "Hierarchical Charts"
})

export default class Dendrogram extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "tree",
      projection: "vertical",
      annotation: "enclose-hull",
      filter: "none"
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
    ].map((d) => (
      <option key={`type-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const projectionOptions = ["vertical", "horizontal", "radial"].map((d) => (
      <option key={`type-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const annotationOptions = ["enclose-rect", "enclose", "enclose-hull"].map(
      (d) => (
        <option key={`type-option-${d}`} label={d} value={d}>
          {d}
        </option>
      )
    )

    const filterOptions = ["none", "time", "layout", "geo"].map((d) => (
      <option key={`type-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const buttons = [
      <form key="button-1-0-0">
        <label htmlFor="chart-type-input">Chart Type</label>
        <select
          value={this.state.type}
          onChange={(e) => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </select>
      </form>,
      <form key="button-2-0-0">
        <label htmlFor="chart-projection-input">Projection</label>
        <select
          value={this.state.projection}
          onChange={(e) => this.setState({ projection: e.target.value })}
        >
          {projectionOptions}
        </select>
      </form>,
      <form key="button-3-0-0">
        <label htmlFor="chart-projection-input">Annotation</label>
        <select
          value={this.state.annotation}
          onChange={(e) => this.setState({ annotation: e.target.value })}
        >
          {annotationOptions}
        </select>
      </form>,
      <form key="button-4-0-0">
        <label htmlFor="chart-projection-input">Filter</label>
        <select
          value={this.state.filter}
          onChange={(e) => this.setState({ filter: e.target.value })}
        >
          {filterOptions}
        </select>
      </form>
    ]

    const examples = []

    examples.push({
      name: "Basic",
      demo: DendrogramRaw({
        annotation: this.state.annotation,
        type: this.state.type,
        projection: this.state.projection,
        filter: this.state.filter
      }),
      source: ``
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
