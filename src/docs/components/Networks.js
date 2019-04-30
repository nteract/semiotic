import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { bubbleChart } from "./NetworksRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Networks Chart"
})

export default class Networks extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mode: "combined"
    }

    this.changeMode = this.changeMode.bind(this)
  }

  changeMode() {
    const mode = this.state.mode === "combined" ? "multi" : "combined"
    this.setState({ mode })
  }

  render() {
    const examples = []

    examples.push({
      name: "Bubble Chart",
      demo: bubbleChart,
      source: `const bubbleSimulation = forceSimulation().force(
  "collide",
  forceCollide().radius(d => d.r)
)

  <NetworkFrame
    nodes={bunchaNodes}
    networkType={{
      type: "force",
      iterations: 400,
      simulation: bubbleSimulation,
      zoom: false
    }}
    nodeSizeAccessor={d => d.r}
    nodeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />`
    })

    return (
      <DocumentComponent
        name="Networks"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          {" "}
          Networks of various kinds showing off different ways of playing with
          network settings. This uses the flare.json dataset, which is
          technically hierarchical JSON but NetworkFrame doesn't care.
        </p>
      </DocumentComponent>
    )
  }
}

Networks.title = "Networks"
