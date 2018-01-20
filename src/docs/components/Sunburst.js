import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { NetworkFrame } from "../../components"
import SunburstRaw from "./SunburstRaw"
import { MenuItem } from "material-ui/Menu"
import Input, { InputLabel } from "material-ui/Input"
import { FormControl, FormHelperText } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "Sunburst"
})

export default class Sunburst extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "partition",
      projection: "radial"
    }
  }
  render() {
    const buttons = []

    const annotations = []

    const examples = []

    examples.push({
      name: "Basic",
      demo: SunburstRaw,
      source: `
      const data = {
        name: "flare",
        children: [
          {
            name: "analytics",
            children: [
              {
                name: "cluster",
                children: [
                  { name: "AgglomerativeCluster", size: 3938 },
                  { name: "CommunityStructure", size: 3812 },
                  { name: "HierarchicalCluster", size: 6714 },
                  { name: "MergeEdge", size: 743 }
                ]
              }
            }
          ]
        }

        <NetworkFrame
          size={[700, 700]}
          edges={data}
          nodeStyle={(d, i) => ({
            fill: colors[d.depth],
            stroke: "black",
            opacity: 0.75
          })}
          nodeIDAccessor={"name"}
          hoverAnnotation={true}
          networkType={{
            type: "partition",
            projection: "radial",
            nodePadding: 1,
            hierarchySum: d => d.size
          }}
          tooltipContent={d => (
            <div className="tooltip-content">
              {d.parent ? <p>{d.parent.data.name}</p> : undefined}
              <p>{d.data.name}</p>
            </div>
          )}
          margin={10}
        />
`
    })

    return (
      <DocumentComponent
        name="Sunburst"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          In Semiotic, a Sunburst Chart is not a separate chart type, it is a
          Partition layout with a radial projection in a NetworkFrame.
        </p>
      </DocumentComponent>
    )
  }
}

Sunburst.title = "Sunburst"
