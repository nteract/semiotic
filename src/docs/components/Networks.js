import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { changeEdges } from "./NetworksRaw"

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
      mode: "combined",
      moreNodes: false
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
      name: "Change Edges",
      demo: changeEdges(this.state.moreNodes),
      source: ``
    })

    return (
      <DocumentComponent
        name="Networks"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <button onClick={() => { this.setState({ moreNodes: true }) }}>Add more nodes</button>
      </DocumentComponent>
    )
  }
}

Networks.title = "Networks"
