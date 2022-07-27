import * as React from "react"
import { OrdinalFrame } from "../../components"

import roughjs from "roughjs/dist/rough.es5.umd.js"

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
  rAccessor: "value",
  oAccessor: "market",
  projection: "vertical",
  dynamicColumnWidth: "value",
  style: (d) => ({
    fill: colors[d.segment],
    stroke: "black",
    strokeWidth: 1
  }),
  oSort: (d, i, a) => {
    return -a[0].pct
  },
  canvasPieces: true,
  /*  renderMode: d =>
    d.market === "Birmingham, AL"
      ? { renderMode: "sketchy", fillWeight: 3, bowing: 5 }
      : { renderMode: "sketchy", fillWeight: 2 }, */
  type: "bar",
  axes: [
    { orient: "left", tickFormat: (d) => d },
    { orient: "bottom", tickFormat: (d) => `${d / 1000}k` }
  ],
  rExtent: { includeAnnotations: true },
  annotations: [
    {
      type: "r",
      value: 8500,
      label: "An R threshold"
    }
  ],
  margin: { left: 55, top: 50, bottom: 80, right: 50 },
  oLabel: {
    orient: "top",
    label: (d) => <text transform="rotate(-45)">{d}</text>
  },
  sketchyRenderingEngine: roughjs
}

export default (
  <div>
    <OrdinalFrame {...mekkoChart} />
  </div>
)
