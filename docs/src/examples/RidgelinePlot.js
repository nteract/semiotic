import React from "react"
import DocumentFrame from "../DocumentFrame"
import { RidgelinePlot as RidgelineChart } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import probablyData from "../../public/data/probably.json"

const frameProps = {
  size: [700, 550],
  data: probablyData,
  orientation: "horizontal",
  categoryAccessor: "k",
  valueAccessor: "v",
  bins: 10,
  amplitude: 1.5,
  colorBy: "k",
  colorScheme: theme,
  categoryPadding: 5,
  margin: { left: 150, top: 50, bottom: 75, right: 15 },
  title: " What [probability] would you assign to the [phrase]?",
  enableHover: true,
  showGrid: false
}

const overrideProps = {}

const RidgelinePlot = () => {
  return (
    <div>
      <MarkdownText
        text={`

Ridgeline plots show variation across values and allow overflowing of the plot into adjoining columns by adjusting the amplitude property. Each category's distribution is rendered as a one-sided density curve that can overlap with neighboring rows.

The example is a remake of the [Perceptions of Probability and Numbers](https://github.com/zonination/perceptions) by zonination.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={RidgelineChart}
        useExpanded
      />
    </div>
  )
}

export default RidgelinePlot
