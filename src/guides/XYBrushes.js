import React from "react"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { MinimapXYFrame, XYFrame } from "semiotic"
import { curveMonotoneX } from "d3-shape"
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
  lines: generatedData,
  lineType: { type: "line", interpolator: curveMonotoneX },
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: d => ({ stroke: d.label, fillOpacity: 0.75 }),
  axes: [
    { orient: "left" },
    {
      orient: "bottom",
      ticks: 6
    }
  ]
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

export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props)
    this.state = { extent: [20, 30], selectedExtent: [20, 30] }
    this.changeExtent = this.changeExtent.bind(this)
  }

  changeExtent(e) {
    this.setState({ selectedExtent: [Math.floor(e[0]), Math.ceil(e[1])] })
  }
  render() {
    const frameProps = {
      size: [700, 300],
      ...xyFrameSettings,
      xExtent: this.state.selectedExtent,
      margin: { left: 50, top: 10, bottom: 40, right: 20 },
      matte: true,
      minimap: {
        brushEnd: this.changeExtent,
        yBrushable: false,
        margin: { left: 50, top: 0, bottom: 10, right: 20 },
        axes: [{ orient: "left", ticks: 2 }],
        xBrushExtent: this.state.selectedExtent,
        size: [700, 50]
      }
    }
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
                console.log(e)
                this.setState({ extent: e })
              },
              brush: "yBrush",
              extent: this.state.extent
            }
          }}
          type={XYFrame}
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
    return <XYFrame {...frameProps} interaction={{
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

## MinimapXYFrame
\`MinimapXYFrame\` creates two frames and automatically handles the brushing state management. Here it's used to allow users to zoom to a particular part of a line chart. The minimap property in \`MinimapXYFrame\` takes an object with settings almost identical to \`XYFrame\` except it also includes properties for brush behavior and extent:
\`\`\`jsx
minimap={{
  xBrushable: false, // boolean (enable horizontal brushing)
  yBrushable: false, // boolean (enable vertical brushing)
  xBrushExtent: array (initial selected extent, defaults to all),
  yBrushExtent: array (initial selected extent, defaults to all),
  brushStart: () => {},//interactivity.start fn
  brush: () => {}, //interactivity.during fn
  brushEnd: () => {}, // interactivity.end fn
  //any additional props can be sent to override the 
  //xyframe props used to render the minimap
}}

\`\`\`

You can programmatically change brush extent by sending a new xBrushExtent.

    `}
        />
        <DocumentFrame
          frameProps={frameProps}
          type={MinimapXYFrame}
          overrideProps={interactionOverride}
          useExpanded
          pre={pre}
          hiddenProps={{ minimap: true }}
          overrideRender={`
export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props)
    this.state = { selectedExtent: [20, 30]}
    this.changeExtent = this.changeExtent.bind(this)

  }

  changeExtent(e) {
    this.setState({ selectedExtent: [Math.floor(e[0]), Math.ceil(e[1])] })
  }

  render() {          
    return <MinimapXYFrame {...frameProps} minimap={{
      brushEnd: this.changeExtent,
      yBrushable: false,
      xBrushExtent: this.state.extent,
      size: [700, 50],
      margin: { left: 50, top: 0, bottom: 10, right: 20 },
      axes: [{ orient: "left", ticks: 2 }]
    }}/>         
  }
}  
          `}
        />
      </div>
    )
  }
}
