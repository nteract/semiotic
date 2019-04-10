import React from "react"
import DocumentFrame from "../DocumentFrame"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { XYFrame } from "semiotic"

const dataSeeds = [40, 40]

const stackedColors = {
  a: theme[1],
  b: theme[2],
  c: theme[3],
  d: theme[4]
}

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
        text={`OrdinalFrame and XYFrame can both take an \`axes\` prop that takes an array of objects with props that determine how your axes are displayed. The one prop the object needs is \`orient\` to determine where to place the axis (\`left\`, \`right\`, \`top\`, \`bottom\`). You can also pass an array of explicit tick values to \`tickValues\`, a prefered number of ticks to \`ticks\`, \`tickFormat\` to determine how to render the value displayed by the ticks and \`label\` (which can be a string or an object with more settings) to label the axis. Each axis is drawn with a neat baseline that can be disabled by settings \`baseline: false\` and which by default is drawn over the visualization layer but can be drawn underneath the visualization by setting it to \`baseline: "under"\`.`}
      />
      <XYFrame
        {...chartSettings}
        lines={[generatedData[0]]}
        axes={[{ orient: "left", label: "Amount of Sales" }]}
      />
      <MarkdownText
        text={`
### Additional Settings

Semiotic axes have a few more fancy features. If you set \`jaggedBase\` to true, a tick at the minimum point in your dataset will be added and rendered with a "torn" appearance. This was considered a best practice historically for non-zero baselines in data visualization. Keep in mind that the \`baseline\` refers to the perpendicular neatline on the axis whereas \`jaggedBase\` refers to an actual tick.
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
        showExpanded
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
                    fill: "lightgrey",
                    stroke: "grey",
                    strokeDasharray: "5 2"
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
                  fill: "lightgrey",
                  stroke: "grey",
                  strokeDasharray: "5 2"
                }}
                d={\`${"M${xy.x1},${xy.y1 - 5}L${xy.x2},${xy.y1 - 5}L${xy.x2},${xy.y1 + 5}L${xy.x1},${xy.y1 + 5}Z"}\`}
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
              label: "HOVER YOUR MOUSE ON ME",
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
