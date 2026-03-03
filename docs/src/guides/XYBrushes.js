import React, { useState } from "react"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { MinimapChart, StreamXYFrame } from "semiotic"

import theme from "../theme"

const colors = theme

const dataSeeds = [20, 10, -10, -20]

function generatePoints(start, number) {
  const arrayOfPoints = []
  let currentValue = start
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue })
    currentValue += Math.random() * 10 - 5
  }
  return arrayOfPoints
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: colors[i],
    coordinates: generatePoints(s, 40)
  }
})

const xyFrameSettings = {
  data: generatedData,
  chartType: "line",
  curve: "monotoneX",
  lineDataAccessor: "coordinates",
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: d => ({ stroke: d.label, fillOpacity: 0.75 }),
  showAxes: true
}

const xyInteraction = {
  ...xyFrameSettings,
  margin: { left: 50, top: 10, bottom: 50, right: 20 },
  size: [700, 200]
}

const pre = `import { curveMonotoneX } from "d3-shape"`

const interactionOverride = {
  interaction: `{
    end: e => {
      this.setState({ extent: e })
    },
    brush: "xBrush",
    extent: this.state.extent
  }`,
  lineType: `{ type: "line", interpolator: curveMonotoneX }`
}

// Flatten line objects data for MinimapChart
const flatData = generatedData.flatMap(line =>
  line.coordinates.map(c => ({ ...c, series: line.label }))
)

function MinimapExample() {
  const [extent, setExtent] = useState(null)

  return (
    <MinimapChart
      data={flatData}
      xAccessor="step"
      yAccessor="value"
      lineBy="series"
      colorBy="series"
      colorScheme={colors}
      curve="monotoneX"
      width={700}
      height={300}
      margin={{ left: 50, top: 10, bottom: 40, right: 20 }}
      brushExtent={extent}
      onBrush={setExtent}
      minimap={{
        height: 50,
        margin: { left: 50, top: 0, bottom: 10, right: 20 },
      }}
    />
  )
}

export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props)
    this.state = { extent: [20, 30] }
  }

  render() {
    return (
      <div>
        <MarkdownText
          text={`
You can turn any \`XYFrame\` into an interactive region with a brush by using the \`interaction\` prop. Interaction settings:

- \`start\`: The function to run on the start of a brush
- \`during\`: The function to run at the during a brush
- \`end\`: The function to run at the end of a brush
- \`brush\`: A string \`"xBrush"\`, \`"yBrush"\`, or \`"xyBrush"\`
- \`extent\`: The base value for the brush, so you can set an extent if you want to initialize the brush with

`}
        />
        <DocumentFrame
          frameProps={{
            ...xyInteraction,
            interaction: {
              end: e => {
                this.setState({ extent: e })
              },
              brush: "xBrush",
              extent: this.state.extent
            }
          }}
          type={StreamXYFrame}
          overrideProps={interactionOverride}
          pre={pre}
          hiddenProps={{ interaction: true }}
          overrideRender={`
export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props)
    this.state = { extent: [20, 30]}
  }

  render() {
    return <StreamXYFrame {...frameProps} interaction={{
      end: e => {
        this.setState({ extent: e })
      },
      brush: "xBrush",
      extent: this.state.extent
    }}/>
  }
}
          `}
          useExpanded
        />

        <MarkdownText
          text={`

## MinimapChart
\`MinimapChart\` is a high-level HOC that renders a main chart and a minimap overview with a d3-brush for zooming into a region. It manages brush state internally, or you can control it via \`brushExtent\` and \`onBrush\`:

\`\`\`jsx
import { MinimapChart } from "semiotic"

<MinimapChart
  data={data}
  xAccessor="step"
  yAccessor="value"
  lineBy="series"
  colorBy="series"
  curve="monotoneX"
  width={700}
  height={300}
  margin={{ left: 50, top: 10, bottom: 40, right: 20 }}
  brushExtent={extent}
  onBrush={setExtent}
  minimap={{
    height: 50,
    margin: { left: 50, top: 0, bottom: 10, right: 20 },
  }}
/>
\`\`\`

    `}
        />
        <MinimapExample />
      </div>
    )
  }
}
