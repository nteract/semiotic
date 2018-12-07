import React from "react"
import DocumentFrame from "../DocumentFrame"
import { SparkXYFrame, SparkOrdinalFrame, SparkNetworkFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { curveMonotoneX } from "d3-shape"

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`

Sometimes the default size isn't the aspect ratio you need, you can still pass an explicit \`size={[100, 20]}\` prop to override the default size based on \`lineHeight\` 
`}
      />{" "}
      <DocumentFrame
        frameProps={{
          ...negativeChart,
          // lineRenderMode: "sketchy",
          // lineType: "line",
          // size: undefined,
          lines: generatedData[0]
          // hoverAnnotation: true
        }}
        type={SparkXYFrame}
        startHidden
      />
      <MarkdownText
        text={`
## What next?

For technical specifications on all of \`XYFrame\`'s features, reference the [XYFrame API](#api/xyframe) docs.
For technical specifications on all of \`OrdinalFrames\`'s features, reference the [OrdinalFrame API](#api/ordinalframe) docs.
For technical specifications on all of \`NetworkFrame\`'s features, reference the [NetworkFrame API](#api/networkframe) docs.

`}
      />
    </div>
  )
}
