import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

import { data } from "./stanton"

const frameProps = {
  chartType: "scatter",
  data: data,
  xAccessor: "distance",
  yAccessor: "exit_velocity",
  pointStyle: d => ({
    fill: theme[1],
    fillOpacity: 0.7,
    r: 4
  }),
  enableHover: true,
  showAxes: true,
  xLabel: "Distance",
  yLabel: "Exit Velocity",
  margin: { left: 70, right: 60, top: 60, bottom: 60 },
  size: [700, 400],
  marginalGraphics: {
    top: { type: "ridgeline", fill: theme[3], fillOpacity: 0.5, stroke: theme[3] },
    right: { type: "histogram", fill: theme[3], fillOpacity: 0.5 }
  }
}

const overrideProps = {
  pointStyle: `d => ({
    fill: theme[1],
    fillOpacity: 0.7,
    r: 4
  })`,
  marginalGraphics: `{
    top: { type: "ridgeline", fill: theme[3], fillOpacity: 0.5, stroke: theme[3] },
    right: { type: "histogram", fill: theme[3], fillOpacity: 0.5 }
  }`
}

const MarginalGraphics = () => {
  return (
    <div>
      <MarkdownText
        text={`
Marginal graphics are small distribution visualizations rendered in the axis margins of scatter and bubble charts. They show the univariate distribution along each axis, providing density context alongside the bivariate relationship.

You can configure marginals on any side using the \`marginalGraphics\` prop with a type string (\`"histogram"\`, \`"violin"\`, \`"ridgeline"\`, \`"boxplot"\`) or a config object with \`type\`, \`bins\`, \`fill\`, \`fillOpacity\`, \`stroke\`, and \`strokeWidth\`. This chart shows Giancarlo Stanton's hit distance vs exit velocity.
`}
      />

      <DocumentFrame
        frameProps={frameProps}
        type={StreamXYFrame}
        overrideProps={overrideProps}
        useExpanded
      />
    </div>
  )
}

export default MarginalGraphics
