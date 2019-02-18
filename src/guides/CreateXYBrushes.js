import React from "react"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { MinimapXYFrame } from "semiotic"
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

// const lineStyle = {
//   fill: "#007190",
//   stroke: "#007190",
//   strokeWidth: 1
// };

// const xyFrameSettings = {

// };
//In your Component where you're creating the MinimapXYFrame

//
// <MinimapXYFrame
//     size={[700, 700]}
//     {...xyFrameSettings}
//     xExtent={selectedExtent}
//     matte={true}
//     margin={}
//     minimap={{
//       margin: { top: 20, bottom: 35, left: 20, right: 20 },
//       ...xyFrameSettings,
//       brushEnd: brushFunction,
//       yBrushable: false,
//       xBrushExtent: extent,
//       size: [700, 150]
//     }}
//   />

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

export default class CreateXYBrushes extends React.Component {
  constructor(props) {
    super(props)
    this.state = { extent: [0, 40], selectedExtent: [0, 40] }
    // this.randomizeExtent = this.randomizeExtent.bind(this);
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
      margin: { left: 50, top: 10, bottom: 50, right: 20 },
      matte: true,
      minimap: {
        ...xyFrameSettings,
        brushEnd: this.changeExtent,
        yBrushable: false,
        xBrushExtent: this.state.extent,
        size: [700, 100]
      }
    }
    return (
      <div>
        <MarkdownText
          text={`
MinimapXYFrame allows you to conveniently instantiate a brushable region, typically referred to as a minimap, to let users brush to zoom in to a particular extent. Here's it's used to allow users to zoom to a particular part of a line chart. The minimap property in MinimapXYFrame takes an object with settings almost identical to XYFrame except it also includes properties for brush behavior and extent like brushEnd, yBrushable, xBrushable, xBrushExtent and the functions for brush, brushstart and brushEnd.

You can programmatically change brush extent by sending a new xBrushExtent.

    `}
        />
        <DocumentFrame
          frameProps={frameProps}
          type={MinimapXYFrame}
          // overrideProps={overrideProps}
          useExpanded
        />
      </div>
    )
  }
}
