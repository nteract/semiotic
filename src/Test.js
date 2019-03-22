import React from "react"
import XYFrame from "semiotic/lib/XYFrame"
const colors = {
  "Ex Machina": "#ac58e5",
  "Far from the Madding Crowd": "#E0488B",
  "The Longest Ride": "#9fd0cb"
}
const frameProps = {
  summaries: [
    {
      coordinates: [
        { theaterCount: 4, rank: 18, grossWeekly: 327616, title: "Ex Machina" },
        {
          theaterCount: 39,
          rank: 15,
          grossWeekly: 1150814,
          title: "Ex Machina"
        },
        {
          theaterCount: 1255,
          rank: 6,
          grossWeekly: 7156570,
          title: "Ex Machina"
        },
        {
          theaterCount: 1279,
          rank: 6,
          grossWeekly: 3615000,
          title: "Ex Machina"
        },
        {
          theaterCount: 2004,
          rank: 6,
          grossWeekly: 5212462,
          title: "Ex Machina"
        },
        {
          theaterCount: 1718,
          rank: 9,
          grossWeekly: 3108609,
          title: "Ex Machina"
        },
        {
          theaterCount: 896,
          rank: 12,
          grossWeekly: 2248258,
          title: "Ex Machina"
        },
        {
          theaterCount: 506,
          rank: 13,
          grossWeekly: 1122034,
          title: "Ex Machina"
        },
        {
          theaterCount: 302,
          rank: 19,
          grossWeekly: 551552,
          title: "Ex Machina"
        },
        {
          theaterCount: 194,
          rank: 20,
          grossWeekly: 316877,
          title: "Ex Machina"
        },
        {
          theaterCount: 124,
          rank: 29,
          grossWeekly: 201345,
          title: "Ex Machina"
        },
        {
          theaterCount: 81,
          rank: 34,
          grossWeekly: 153162,
          title: "Ex Machina"
        },
        {
          theaterCount: 61,
          rank: 36,
          grossWeekly: 102114,
          title: "Ex Machina"
        },
        { theaterCount: 39, rank: 42, grossWeekly: 64350, title: "Ex Machina" },
        { theaterCount: 31, rank: 47, grossWeekly: 45344, title: "Ex Machina" }
      ],
      title: "Ex Machina"
    }
  ],
  size: [700, 400],
  margin: { left: 60, bottom: 90, right: 10, top: 40 },
  summaryType: { type: "trendline" },
  xAccessor: "theaterCount",
  yAccessor: "rank",
  yExtent: [0],
  xExtent: [0],
  summaryStyle: { fill: "none", stroke: "#ac58e5", strokeWidth: 2 },
  pointStyle: d => {
    return {
      r: 2,
      fill: d && colors[d.title]
    }
  },
  title: (
    <text textAnchor="middle">
      Theaters showing <tspan fill={"#ac58e5"}>Ex Machina</tspan> vs{" "}
      <tspan fill={"#E0488B"}>Far from the Madding Crowd</tspan>
    </text>
  ),
  axes: [
    { orient: "left", label: "Rank" },
    { orient: "bottom", label: { name: "Theaters", locationDistance: 55 } }
  ],
  showLinePoints: true,
  showSummaryPoints: true
}

export default () => {
  return <XYFrame {...frameProps} />
}
