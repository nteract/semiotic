import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
import { green, red, purple } from "../theme"
import MarkdownText from "../MarkdownText"

const frameProps = {
  size: [700, 400],
  rExtent: [0, 65000],
  rAccessor: "value",
  oAccessor: "name",
  showAxes: true,
  chartType: "bar",
  oLabel: true,
  margin: { left: 60, top: 20, bottom: 100, right: 20 },
  barPadding: 40,
  data: [
    { name: "Product Revenue", value: 42000 },
    { name: "Services Revenue", value: 21000 },
    { name: "Fixed Costs", value: -17000 },
    { name: "Variable Costs", value: -14000 },
    { name: "Other Costs", value: -10000 },
    { name: "Ransoms", value: 10000 },
    { name: "Cat Rental", value: 10000 },
    { name: "Total" }
  ],
  pieceStyle: d => ({
    fill: d.name === "Total" ? purple : (d.value > 0 ? green : red)
  })
}

const overrideProps = {
  pieceStyle: `d => ({
    fill: d.name === "Total" ? purple : (d.value > 0 ? green : red)
  })`
}

const WaterfallChart = () => {
  return (
    <div>
      <MarkdownText
        text={`
This demonstrates a simplified waterfall chart using StreamOrdinalFrame.

Note: The custom \`type\` function for waterfall rendering (cumulative bar positioning, connector lines, and value labels) is not supported in StreamOrdinalFrame. This version renders as a standard bar chart with color-coded positive/negative values.

The data in this chart is fictitious.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        pre={`const purple = "${purple}"
const green = "${green}"
const red = "${red}"`}
        type={StreamOrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default WaterfallChart
