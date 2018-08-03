import React from "react"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"

const colors = {
  "Almond lovers": "#00a2ce",
  "Berry buyers": "#4d430c",
  "Carrots-n-more": "#b3331d",
  "Delicious-n-new": "#b6a756"
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

const mekkoChart = {
  size: [700, 400],
  data: data,
  rAccessor: "pct",
  oAccessor: "market",
  dynamicColumnWidth: "value",
  style: d => ({
    fill: colors[d.segment],
    stroke: "black",
    strokeWidth: 1
  }),
  canvasPieces: true,
  renderMode: d =>
    d.market === "Birmingham, AL"
      ? { renderMode: "sketchy", fillWeight: 3, bowing: 5 }
      : { renderMode: "sketchy", fillWeight: 2 },
  type: "barpercent",
  axis: { orient: "left", tickFormat: d => `${Math.floor(d * 100)}%` },
  margin: { left: 55, top: 10, bottom: 80, right: 50 },
  oLabel: d => <text transform="rotate(45)">{d}</text>
}

export default (
  <div>
    <ProcessViz frameSettings={mekkoChart} frameType="OrdinalFrame" />
    <OrdinalFrame {...mekkoChart} />
  </div>
)
