import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const colors = {
  "Almond lovers": theme[0],
  "Berry buyers": theme[1],
  "Carrots-n-more": theme[2],
  "Delicious-n-new": theme[3]
}
const data = [
  { market: "Auburn, AL", segment: "Almond lovers", value: 3840, pct: 0.54 },
  { market: "Auburn, AL", segment: "Berry buyers", value: 1920, pct: 0.27 },
  { market: "Auburn, AL", segment: "Carrots-n-more", value: 960, pct: 0.135 },
  { market: "Auburn, AL", segment: "Delicious-n-new", value: 400, pct: 0.055 },
  {
    market: "Birmingham, AL",
    segment: "Almond lovers",
    value: 1600,
    pct: 0.36
  },
  { market: "Birmingham, AL", segment: "Berry buyers", value: 1440, pct: 0.33 },
  {
    market: "Birmingham, AL",
    segment: "Carrots-n-more",
    value: 960,
    pct: 0.22
  },
  {
    market: "Birmingham, AL",
    segment: "Delicious-n-new",
    value: 400,
    pct: 0.091
  },
  {
    market: "Gainesville, FL",
    segment: "Almond lovers",
    value: 640,
    pct: 0.24
  },
  { market: "Gainesville, FL", segment: "Berry buyers", value: 960, pct: 0.36 },
  {
    market: "Gainesville, FL",
    segment: "Carrots-n-more",
    value: 640,
    pct: 0.24
  },
  {
    market: "Gainesville, FL",
    segment: "Delicious-n-new",
    value: 400,
    pct: 0.16
  },
  { market: "Durham, NC", segment: "Almond lovers", value: 320, pct: 0.17 },
  { market: "Durham, NC", segment: "Berry buyers", value: 480, pct: 0.26 },
  { market: "Durham, NC", segment: "Carrots-n-more", value: 640, pct: 0.35 },
  { market: "Durham, NC", segment: "Delicious-n-new", value: 400, pct: 0.22 }
]

const frameProps = {
  size: [700, 400],
  rAccessor: "pct",
  oAccessor: "market",
  dynamicColumnWidth: "value",
  axis: { orient: "left", tickFormat: d => Math.floor(d * 100) + "%" },
  type: "bar",
  oLabel: d => <text transform="rotate(45)">{d}</text>,
  margin: { left: 45, top: 10, bottom: 80, right: 50 },
  data,
  style: (d, i) => {
    console.log(d.segment, colors[d.segment])
    return {
      fill: colors[d.segment],
      stroke: "white",
      strokeWidth: 1
    }
  }
}

const MarimekkoChart = () => {
  return (
    <div>
      <MarkdownText
        text={`

The Marimekko chart shows aggregate value of segments along with percent breakdown in each segment. It takes advantage of using the dynamicColumnWidth setting to encode one value (raw value of sales in a region) while the rAccessor uses a separate value (percent of sales in a region by brand).

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        // overrideProps={overrideProps}

        type={OrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default MarimekkoChart
