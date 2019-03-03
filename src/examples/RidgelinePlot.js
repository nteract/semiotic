import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const ROOT = process.env.PUBLIC_URL

const frameProps = {
  size: [700, 550],
  data: [],
  projection: "horizontal",
  summaryType: {
    type: "ridgeline",
    bins: 10,
    amplitude: 50,
    curve: "monotonex"
  },
  summaryStyle: (d, i) => ({
    fill: theme[i % theme.length],
    stroke: "black",
    strokeWidth: 2,
    fillOpacity: 0.5,
    strokeOpacity: 0.25
  }),
  oAccessor: "k",
  rAccessor: "v",
  margin: { left: 150, top: 50, bottom: 75, right: 15 },
  title: " What [probability] would you assign to the [phrase]?",
  axes: [
    {
      orient: "bottom",
      label: "Count of Probability by Phrase",
      tickFormat: d => d + "%"
    }
  ],
  summaryHoverAnnotation: true,
  oLabel: d => (
    <text style={{ textAnchor: "end", fill: "grey" }} x={-10} y={5}>
      {d}
    </text>
  )
}

const overrideProps = {
  summaryStyle: `(d, i) => ({
    fill: theme[i % theme.length],
    stroke: "black",
    strokeWidth: 2,
    fillOpacity: 0.5,
    strokeOpacity: 0.25
  })`,
  oLabel: `d => (
    <text style={{ textAnchor: "end", fill: "grey" }} x={-10} y={5}>
      {d}
    </text>
  )`
}

export default class RidgelinePlot extends React.Component {
  constructor(props) {
    super(props)

    fetch(`${ROOT}/data/probably.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({ ...frameProps, data })
      })
  }

  render() {
    if (!this.state) return null
    return (
      <div>
        <MarkdownText
          text={`

Ridgeline plots show variation across values and allow overflowing of the plot into adjoining columns by adjusting the amplitude property of the \`summaryType\`. 

The example is a remake of the [Perceptions of Probability and Numbers](https://github.com/zonination/perceptions) by zonination.

`}
        />
        <DocumentFrame
          frameProps={this.state || {}}
          overrideProps={overrideProps}
          type={OrdinalFrame}
          useExpanded
        />
      </div>
    )
  }
}
