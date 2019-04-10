import React from "react"
import DocumentFrame from "../DocumentFrame"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { XYFrame } from "semiotic"

const dataSeeds = [40, 40]


function generatePoints(start, number) {
  const arrayOfPoints = []
  let currentValue = start
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue })
    currentValue += Math.ceil(Math.random() * 20) - 10
  }
  return arrayOfPoints
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: theme[i],
    coordinates: generatePoints(s, 40)
  }
})

const overrideProps = {
  lineType: `{ type: "stackedarea", interpolator: curveMonotoneX }`
}

const chartSettings = {
  lines: generatedData,
  lineStyle: { stroke: theme[1] },
  pointStyle: { fill: theme[1] },
  xAccessor: "step",
  yAccessor: "value",
  margin: 70
}

export default function AxisSettings() {
  return (
    <div>
      <MarkdownText
        text={`\`OrdinalFrame\` and \`XYFrame\`  both take an \`axes\` prop that takes an array of objects that determine how your axes are displayed:
- \`orient\`: the only required prop, determines where to place the axis (\`left\`, \`right\`, \`top\`, \`bottom\`). 
- \`ticks\`: guidance for a prefered number of ticks to display
- \`tickValues\`: an array of explicit tick values to use
- \`tickFormat\`: determines how to render the value displayed by the ticks  
- \`tickLineGenerator\`: Allows you to overwrite how the tick lines are displayed, it gives you a parameter ({ x1, x2, y1, y2}) and the function should return a JSX element
- \`label\`: (which can be a string or an object with more settings) to label the axis 
- \`baseline\`: defaults to \`true\` can be overwritten with \`false\`. By default it is drawn over the visualization layer but can be drawn underneath the visualization by setting it to \`"under"\`.
- \`jaggedBase\`  (enabled in v1.19.6): defaults to \`false\`, \`true\` renders the tick at the minimum point in your dataset with a "torn" appearance
- \`marginalSummaryGraphics\` (enabled in v1.19.6): Lets you add an ordinal summary to your chart in the axis, see the [marginal graphics](/examples/marginal-graphics) page for an details
- \`axisAnnotationFunction\`: defaults to \`undefined\`, if a function is supplied, it creates a hover region on the axis, turns on the default hover display, when you click this function is run with ({ className, type, value }) 
- \`glyphFunction\`: Allows you create a custom hover display on the axis, it passed ({ lineWidth, lineHeight, value }) and expects you to return a JSX element`}
      />
      <XYFrame
        {...chartSettings}
        lines={[generatedData[0]]}
        axes={[{ orient: "left", label: "Amount of Sales" }]}
      />
      <MarkdownText
        text={`
### Jagged Base Example

If you set \`jaggedBase\` to true, a tick at the minimum point in your dataset will be added and rendered with a "torn" appearance. This was considered a best practice historically for non-zero baselines in data visualization. Keep in mind that the \`baseline\` refers to the perpendicular neatline on the axis whereas \`jaggedBase\` refers to an actual tick.
`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...chartSettings,
          size: undefined,
          lines: generatedData[0],
          axes: [{ orient: "left", baseline: false, jaggedBase: true }]
        }}
        type={XYFrame}
        overrideProps={overrideProps}
      />
      <MarkdownText
        text={`
### Custom tick lines
Axes can take a \`tickLineGenerator\` prop which you can use to draw whatever kinds of tick lines you want. This axis is also using \`baseline: "under"\` to ensure that the baseline is drawn beneath the visualization layer.
`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...chartSettings,
          lines: generatedData[0],
          showLinePoints: true,
          axes: [
            {
              orient: "left",
              baseline: "under",
              tickLineGenerator: ({ xy }) => (
                <path
                  style={{
                    fill: "#efefef",
                    stroke: "#ccc",
                    strokeDasharray: "2 2"
                  }}
                  d={`M${xy.x1},${xy.y1 - 5}L${xy.x2},${xy.y1 - 5}L${
                    xy.x2
                    },${xy.y1 + 5}L${xy.x1},${xy.y1 + 5}Z`}
                />
              )
            }
          ]
        }}
        type={XYFrame}
        overrideProps={{
          ...overrideProps,
          axes: `[
            {
              orient: "left",
              baseline: "under",
              tickLineGenerator: ({ xy }) => (
                <path
                  style={{
                    fill: "#efefef",
                    stroke: "#ccc",
                    strokeDasharray: "2 2"
                  }}
                  d={\`M\${xy.x1},\${xy.y1 - 5}L\${xy.x2},\${xy.y1 - 5}L\${
                    xy.x2
                    },\${xy.y1 + 5}L\${xy.x1},\${xy.y1 + 5}Z\`}
                />
              )
            }
        ]`
        }}
        startHidden
      />
      <MarkdownText
        text={`
### Axis Interactivity
If you set the \`axisAnnotationFunction\` it will turn on a region on the axis that you can hover on. Hover on the axis below to see the guideline it draws. If you click on it, you'll get a value that you can pass to a threshold annotation or other function. If you want to adjust the form that the hover graphic takes, you can use \`glyphFunction\` to define a custom line and text display.
`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...chartSettings,
          lines: generatedData[0],
          axes: [
            {
              orient: "left",
              label: "Hover your mouse on me",
              axisAnnotationFunction: d => {
                console.log("Here's the axis that you clicked on:", d)
              }
            }
          ]
        }}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
    </div>
  )
}
