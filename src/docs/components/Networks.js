import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import {
  basic,
  withCustomSimulation,
  bubbleChart,
  multiFoci,
  changeSimulationMode
} from "./NetworksRaw"

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
      name: "Basic",
      demo: basic,
      source: `<NetworkFrame
    edges={data}
    networkType={{
      type: "force",
      iterations: 1000,
      forceManyBody: -250,
      distanceMax: 500,
      edgeStrength: 2
    }}
    nodeSizeAccessor={2}
    edgeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />`
    })

    examples.push({
      name: "Custom Simulation",
      demo: withCustomSimulation,
      source: `const customSimulation = forceSimulation().force(
  "charge",
  forceManyBody()
    .distanceMax(500)
    .strength(-100)
)
      
      <NetworkFrame
    edges={data}
    networkType={{
      type: "force",
      iterations: 500,
      simulation: customSimulation,
      edgeStrength: 2
    }}
    nodeSizeAccessor={2}
    edgeStyle={{ stroke: "darkred" }}
    nodeIDAccessor="name"
  />`
    })

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

    examples.push({
      name: "Multi Foci Chart",
      demo: multiFoci,
      source: `const multiFociSimulation = forceSimulation()
  .force("collide", forceCollide().radius(d => d.r))
  .force("x", forceX(d => d.fociX))
  .force("y", forceY(d => d.fociY))
  
  <NetworkFrame
    nodes={multiFociNodes}
    networkType={{
      type: "force",
      iterations: 300,
      simulation: multiFociSimulation,
      zoom: false
    }}
    nodeSizeAccessor={d => d.r}
    nodeStyle={d => ({ stroke: "darkred", fill: d.color })}
    nodeIDAccessor="name"
  />`
    })

    examples.push({
      name: "Change Modes",
      demo: changeSimulationMode(this.state.mode, this.changeMode),
      source: `<NetworkFrame
      nodes={combinedFociNodes}
      networkType={{
        type: "force",
        iterations: 500,
        simulation:
          mode === "combined"
            ? bubbleSimulation
            : multiFociSimulation,
        zoom: false
      }}
      nodeSizeAccessor={d => d.r}
      nodeStyle={d => ({ stroke: "darkred", fill: d.color })}
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
