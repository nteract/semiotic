import React from "react"
import XYFrame from "semiotic/lib/XYFrame"
const frameProps = {
  lines: {
    label: "#ac58e5", coordinates: [{ step: 0, value: 40 },
    { step: 1, value: 46 },
    { step: 2, value: 51 },
    { step: 3, value: 55 },
    { step: 4, value: 46 },
    { step: 5, value: 55 },
    { step: 6, value: 50 },
    { step: 7, value: 56 },
    { step: 8, value: 50 },
    { step: 9, value: 59 },
    { step: 10, value: 66 },
    { step: 11, value: 72 },
    { step: 12, value: 73 },
    { step: 13, value: 80 },
    { step: 14, value: 82 },
    { step: 15, value: 85 },
    { step: 16, value: 90 },
    { step: 17, value: 91 },
    { step: 18, value: 87 },
    { step: 19, value: 96 },
    { step: 20, value: 99 },
    { step: 21, value: 92 },
    { step: 22, value: 91 },
    { step: 23, value: 93 },
    { step: 24, value: 99 },
    { step: 25, value: 106 },
    { step: 26, value: 98 },
    { step: 27, value: 100 },
    { step: 28, value: 108 },
    { step: 29, value: 105 },
    { step: 30, value: 113 },
    { step: 31, value: 119 },
    { step: 32, value: 127 },
    { step: 33, value: 127 },
    { step: 34, value: 120 },
    { step: 35, value: 121 },
    { step: 36, value: 113 },
    { step: 37, value: 111 },
    { step: 38, value: 104 },
    { step: 39, value: 114 },
    { step: 40, value: 122 }]
  },
  margin: 70,
  xAccessor: "step",
  yAccessor: "value",
  pointStyle: { fill: "#E0488B" },
  lineStyle: { stroke: "#E0488B" },
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
  ],
  showLinePoints: true
}

export default () => {
  return <XYFrame {...frameProps} />
}