import React from "react"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"

const data = Array.from(Array(200), () => ({
  value: parseInt(Math.random() * 100, 10)
}))
const orFrameSettings = {
  size: [700, 200],
  rAccessor: "value",
  oAccessor: () => "singleColumn",
  style: { fill: theme[0], stroke: "white", strokeWidth: 1 },
  type: "swarm",
  summaryType: "violin",
  summaryStyle: {
    fill: theme[0],
    fillOpacity: 0.3,
    stroke: "white",
    strokeWidth: 1
  },
  projection: "horizontal",
  axes: [{ orient: "left" }],
  rExtent: [0, 100],
  margin: { left: 20, top: 0, bottom: 50, right: 20 },
  data
}

export default class CreateOrdinalBrush extends React.Component {
  constructor(props) {
    super(props)

    this.state = { selectedDataCount: 200, extent: [20, 70] }
    this.changeExtent = this.changeExtent.bind(this)
  }

  changeExtent(e) {
    this.setState({
      selectedDataCount: data.filter(d => d.value >= e[0] && d.value <= e[1])
        .length
    })
  }
  render() {
    const frameProps = {
      ...orFrameSettings,
      interaction: {
        columnsBrush: true,
        extent: { singleColumn: this.state.extent },
        end: this.changeExtent
      }
    }
    return (
      <div>
        <MarkdownText
          text={`
You can turn any \`OrdinalFrame\` into an interactive region with a brush by using the \`interaction\` prop. Interaction settings:

- \`start\`: The function with parameters (e,column) to run on the start of a brush where e is the array of the range of the brush and column is the column name of the brush
- \`during\`: The function with parameters (e,column) to run at the during a brush
- \`end\`: The function with parameters (e,column) to run at the end of a brush
- \`columnsBrush\`: turns on a brush for each column (parallel coordinates style) can be true or false. Otherwise you get a brush for selecting columns
- \`extent\`: The base value for the brush, so you can set an extent if you want to initialize the brush with

## Example
    `}
        />
        <p>
          Number of points in brushed region: {this.state.selectedDataCount}
        </p>

        <DocumentFrame
          frameProps={frameProps}
          type={OrdinalFrame}
          useExpanded
          hiddenProps={{ interaction: true }}
          overrideRender={`export default class CreateOrdinalBrush extends React.Component {
  constructor(props) {
    super(props)

    this.state = { selectedDataCount: 200, extent: [20, 70] }
    this.changeExtent = this.changeExtent.bind(this)
    }

    changeExtent(e) {
    this.setState({
      selectedDataCount: frameProps.data.filter(d => d.value >= e[0] && d.value <= e[1])
        .length
    })
    }
    render() {
      return (
        <OrdinalFrame {...frameProps} interaction={{
          columnsBrush: true,
          extent: { singleColumn: this.state.extent },
          end: this.changeExtent
        }}/>
      )}
}`}
        />
      </div>
    )
  }
}
