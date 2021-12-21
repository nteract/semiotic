import React from "react"
import MarkdownText from "../MarkdownText"
import { FacetController, OrdinalFrame, XYFrame } from "semiotic"
import theme from "../theme"
import { propertyToString } from "../DocumentFrame"

const blue = [
  {
    column: "a",
    color: theme[1],
    step: 1,
    value: 15
  },

  {
    column: "b",
    color: theme[1],
    step: 2,
    value: 25
  },

  {
    column: "c",
    color: theme[1],
    step: 3,
    value: 5
  },

  {
    column: "d",
    color: theme[1],
    step: 4,
    value: 8
  }
]

const red = [
  {
    column: "a",
    color: theme[2],
    step: 1,
    value: 15
  },

  {
    column: "b",
    color: theme[2],
    step: 2,
    value: 15
  },

  {
    column: "b",
    color: theme[2],
    step: 3,
    value: 7
  },

  {
    column: "c",
    color: theme[2],
    step: 4,
    value: 15
  }
]

const ordinalData = blue.concat(red)
const ordinalData2 = blue
  .concat(red)
  .map(d => ({ ...d, value: d.value * Math.random() * 4 }))

const xyFrameData2 = [
  {
    color: theme[2],
    coordinates: red.map(d => ({ ...d }))
  },
  {
    color: theme[1],
    coordinates: blue.map(d => ({ ...d }))
  }
]

const xyFrameData3 = [
  {
    color: theme[2],
    coordinates: red.map(d => ({ ...d, value: d.value * Math.random() }))
  },
  {
    color: theme[1],
    coordinates: blue.map(d => ({ ...d, value: d.value * Math.random() }))
  }
]

export default function() {
  return (
    <div>
      <MarkdownText
        text={`
        
Small multiples is accomplshed using the \`FacetController\`, which is a wrapper that uses composition to decorate any child frames (whether \`ORFrame\`, \`NetworkFrame\` or \`XYFrame\`) with  valid attributes in addition to:

- \`pieceHoverAnnotation\` or \`hoverAnnotation\` set to true will create tooltips across the frames. You still need to set \`lineIDAccessor\` and/or \`pieceIDAccessor\` to appropriate values for this to work relatively. If your pieces in \`ORFrame\` have matching data structures with points in \`XYFrame\` then you will also see tooltips across frames. Currently the hover annotation settings in \`FacetController\` only accept true but in the future will respect the model in the rest of Semiotic where you can send an array of annotation types or functions returning annotation types which will be propagated across frames.

- \`sharedXExtent\`, \`sharedYExtent\` and \`sharedRExtent\` will set the respective extents of child frames to match the min/max of the smallest and largest values of any siblings. Currently this only supports true but will also be updated to support the existing extent model in frames where you can send partial extents.      
      
      `}
      />
      <FacetController
        size={[300, 300]}
        margin={{ top: 40, left: 55, bottom: 40, right: 10 }}
        xAccessor="step"
        yAccessor="value"
        lineStyle={d => ({ stroke: d.color })}
        hoverAnnotation={true}
        lineIDAccessor={"color"}
        axes={[{ orient: "left" }, { orient: "bottom", ticks: 4 }]}
        sharedXExtent={true}
        sharedYExtent={true}
        oPadding={5}
        oAccessor="column"
        rAccessor="value"
        type="bar"
        style={d => ({ fill: d.color })}
        pieceHoverAnnotation={true}
        pieceIDAccessor="color"
        sharedRExtent={true}
        react15Wrapper={<div style={{ display: "flex" }} />}
      >
        <OrdinalFrame data={ordinalData} title="OrdinalFrame" />
        <OrdinalFrame data={ordinalData2} title="OrdinalFrame" />
        <XYFrame title={"XYFrame"} lines={xyFrameData2} />
        <XYFrame title={"XYFrame"} lines={xyFrameData3} />
      </FacetController>

      <MarkdownText
        text={`
\`\`\`jsx
import { FacetController, OrdinalFrame, XYFrame } from "semiotic"

<FacetController
  size={[300, 300]}
  margin={{ top: 40, left: 55, bottom: 40, right: 10 }}
  xAccessor="step"
  yAccessor="value"
  lineStyle={d => ({ stroke: d.color })}
  hoverAnnotation={true}
  lineIDAccessor={() => true}
  axes={[{ orient: "left" }, { orient: "bottom", ticks: 4 }]}
  sharedXExtent={true}
  sharedYExtent={true}
  oPadding={5}
  oAccessor="column"
  rAccessor="value"
  type="bar"
  style={d => ({ fill: d.color })}
  pieceHoverAnnotation={true}
  pieceIDAccessor="color"
  sharedRExtent={true}
  react15Wrapper={<div style={{ display: "flex" }} />}
>
  <OrdinalFrame data={${propertyToString(ordinalData)}} title="OrdinalFrame" />
  <XYFrame title={"XYFrame"} lines={${propertyToString(xyFrameData2)}} />
  <XYFrame title={"XYFrame"} lines={${propertyToString(xyFrameData3)}} />
</FacetController>
\`\`\`
`}
      />
    </div>
  )
}
