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
  axis: {
    orient: "bottom",
    label: "Count of Probability by Phrase",
    tickFormat: d => d + "%"
  },
  summaryHoverAnnotation: true,
  oLabel: d => (
    <text style={{ textAnchor: "end", fill: "grey" }} x={-10} y={5}>
      {d}
    </text>
  )
}

const overrideProps = {
  style: `d => {
    return {
      fill: d.rIndex === 0 ? ${theme[0]} : ${theme[5]},
      stroke: "white",
      strokeWidth: 1,
      r: 8
    }
  }`,
  svgAnnotationRules: `function drawRange({ d, rScale, orFrameState }) {
    if (d.type === "range") {
      const start = rScale(d.y1990) - dotRadius
      const end = rScale(d.y2013) + dotRadius
      const y = orFrameState.projectedColumns[d.region].middle
      return (
        <line
          x1={start}
          x2={end}
          y1={y}
          y2={y}
          style={{ stroke: "black", strokeWidth: 2 }}
        />
      )
    }
    return null
  }
  `
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
    return (
      <div>
        <MarkdownText
          text={`

Ridgeline Plots show variation across values and allow overflowing of the plot into adjoining columns by adjusting the amplitude property of the summaryType. This example also uses dynamicColumnWidth to set column width to be based on the maximum value of each column, normalizing the variation.

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
