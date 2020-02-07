import * as React from "react"
import { XYFrame, ResponsiveXYFrame } from "../../components"
import { scaleTime } from "d3-scale"
import { curveMonotoneX, curveCardinal, curveBasis, curveStep } from "d3-shape"
import { movies } from "../sampledata/movies"

import DocumentComponent from "../layout/DocumentComponent"

const components = []
const curvedCardinalLine = { type: "line", interpolator: curveCardinal }
const interactiveLineStyle = { stroke: "#00a2ce" }
const interactivePointStyle = () => ({
  fill: "#00a2ce"
})
const interactiveXAccessor = d => d.week
const interactiveYAccessor = d => d.grossWeekly

const interactiveChartMargin = { left: 100, bottom: 50, right: 10, top: 40 }
const interactiveChartAxes = [
  {
    orient: "left",
    label: "Axis Label w/ dynamicLabelPosition: true",
    dynamicLabelPosition: true
  },
  {
    orient: "bottom"
  }
]

const mlist = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const chartSize = [700, 400]

const colorHash = {
  "Ex Machina": "#4d430c",
  "Far from the Madding Crowd": "#b6a756",
  "Ex Machina-0": "red",
  "Far from the Madding Crowd-0": "blue",
  "Ex Machina-1": "purple",
  "Far from the Madding Crowd-1": "brown",
  "Ex Machina-2": "green",
  "Far from the Madding Crowd-2": "gold",
  "Ex Machina-3": "black",
  "Far from the Madding Crowd-3": "gray",
  "Ex Machina-4": "puce",
  "Far from the Madding Crowd-4": "red"
}

components.push({
  name: "Creating a Line Chart"
})

export default class CreatingLineChart extends React.Component {
  constructor(props) {
    super(props)
    this.lineHoverBehavior = this.lineHoverBehavior.bind(this)
    this.state = {
      hoverPoint: undefined,
      brushChart: "stackedpercent"
    }
  }
  lineHoverBehavior(d) {
    this.setState({ hoverPoint: d })
  }

  lineAnnotater({ d, xScale, yScale }) {
    if (d.type !== "hover") return null

    return (
      <circle
        key="hover-circle"
        r={10}
        style={{ fill: "none", stroke: "red", strokeWidth: 5 }}
        cx={xScale(d.week)}
        cy={yScale(d.grossWeekly)}
      />
    )
  }

  render() {
    const examples = []
    examples.push({
      name: "Data",
      demo: (
        <div>
          <p>
            XYFrame line data takes an array of objects. Each of those objects
            has the coordinates of the line in whatever data space you set up
            the XYFrame to deal with. For this example we'll look at a pair of
            movies: The Fate of the Furious and Straight Outta Compton. For each
            movie, we record in a coordinates array the gross, the number of
            theaters, the average gross per theater, the date of that week, and
            the rank of the movie overall.
          </p>
        </div>
      ),
      source: `const movies = [
  {
    title: "The Fate of the Furious",
    studio: "Uni.",
    firstWeek: "2017-15",
    maxRank: 1,
    maxGross: 225764765,
    coordinates: [
      {week: 1,grossWeekly: 124896220,theaterCount: 4310,theaterAvg: 28978,date: "2017-04-14",rank: 1},
      {week: 2,grossWeekly: 48435355,theaterCount: 4329,theaterAvg: 11189,date: "2017-04-21",rank: 1},
      {week: 3,grossWeekly: 25275955,theaterCount: 4077,theaterAvg: 6200,date: "2017-04-28",rank: 1},
      {week: 4,grossWeekly: 11126400,theaterCount: 3595,theaterAvg: 3095,date: "2017-05-05",rank: 2},
      {week: 5,grossWeekly: 6976370,theaterCount: 3067,theaterAvg: 2275,date: "2017-05-12",rank: 4},
      {week: 6,grossWeekly: 4340570,theaterCount: 2287,theaterAvg: 1898,date: "2017-05-19",rank: 8},
      {week: 7,grossWeekly: 2267065,theaterCount: 1358,theaterAvg: 1669,date: "2017-05-26",rank: 11},
      {week: 8,grossWeekly: 746930,theaterCount: 593,theaterAvg: 1260,date: "2017-06-02",rank: 15},
      {week: 9,grossWeekly: 661010,theaterCount: 389,theaterAvg: 1699,date: "2017-06-09",rank: 16},
      {week: 10,grossWeekly: 327005,theaterCount: 175,theaterAvg: 1869,date: "2017-06-16",rank: 24},
      {week: 11,grossWeekly: 237990,theaterCount: 159,theaterAvg: 1497,date: "2017-06-23",rank: 26},
      {week: 12,grossWeekly: 296470,theaterCount: 144,theaterAvg: 2059,date: "2017-06-30",rank: 23},
      {week: 13,grossWeekly: 177425,theaterCount: 115,theaterAvg: 1543,date: "2017-07-07",rank: 25}
    ],
    type: "landslide"
  },
  {
    title: "Straight Outta Compton",
    studio: "Uni.",
    firstWeek: "2015-33",
    maxRank: 1,
    maxGross: 161058685,
    coordinates: [
      {week: 1,grossWeekly: 84723470,theaterCount: 2757,theaterAvg: 30730,date: "2015-08-14",rank: 1},
      {week: 2,grossWeekly: 36162705,theaterCount: 3025,theaterAvg: 11955,date: "2015-08-21",rank: 1},
      {week: 3,grossWeekly: 18049530,theaterCount: 3142,theaterAvg: 5745,date: "2015-08-28",rank: 1},
      {week: 4,grossWeekly: 12686895,theaterCount: 3094,theaterAvg: 4100,date: "2015-09-04",rank: 3},
      {week: 5,grossWeekly: 5328660,theaterCount: 2812,theaterAvg: 1895,date: "2015-09-11",rank: 6},
      {week: 6,grossWeekly: 2596870,theaterCount: 1938,theaterAvg: 1340,date: "2015-09-18",rank: 9},
      {week: 7,grossWeekly: 880290,theaterCount: 609,theaterAvg: 1445,date: "2015-09-25",rank: 16},
      {week: 8,grossWeekly: 338540,theaterCount: 281,theaterAvg: 1205,date: "2015-10-02",rank: 22},
      {week: 9,grossWeekly: 191170,theaterCount: 170,theaterAvg: 1125,date: "2015-10-09",rank: 31},
      {week: 10,grossWeekly: 100555,theaterCount: 113,theaterAvg: 890,date: "2015-10-16",rank: 38}
    ],
    type: "landslide"
  }
];`
    })

    const flatData = [
      { day: "2/19/2019", things: 3 },
      { day: "2/20/2019", things: 745 },
      { day: "2/21/2019", things: 784 },
      { day: "2/22/2019", things: 347 },
      { day: "2/23/2019", things: 139 },
      { day: "2/24/2019", things: 83 },
      { day: "2/25/2019", things: 86 },
      { day: "2/26/2019", things: 131 },
      { day: "2/27/2019", things: 89 },
      { day: "2/28/2019", things: 104 },
      { day: "3/1/2019", things: 88 },
      { day: "3/2/2019", things: 109 },
      { day: "3/3/2019", things: 121 },
      { day: "3/4/2019", things: 219 },
      { day: "3/5/2019", things: 167 },
      { day: "3/6/2019", things: 111 },
      { day: "3/7/2019", things: 116 },
      { day: "3/8/2019", things: 58 },
      { day: "3/9/2019", things: 26 },
      { day: "3/10/2019", things: 36 },
      { day: "3/11/2019", things: 56 },
      { day: "3/12/2019", things: 103 },
      { day: "3/13/2019", things: 156 },
      { day: "3/14/2019", things: 114 },
      { day: "3/15/2019", things: 144 },
      { day: "3/16/2019", things: 80 },
      { day: "3/17/2019", things: 39 },
      { day: "3/18/2019", things: 65 },
      { day: "3/19/2019", things: 61 },
      { day: "3/20/2019", things: 44 },
      { day: "3/21/2019", things: 46 },
      { day: "3/22/2019", things: 63 },
      { day: "3/23/2019", things: 17 },
      { day: "3/24/2019", things: 16 },
      { day: "3/25/2019", things: 54 },
      { day: "3/26/2019", things: 61 },
      { day: "3/27/2019", things: 41 },
      { day: "3/28/2019", things: 19 },
      { day: "3/29/2019", things: 33 },
      { day: "3/30/2019", things: 17 },
      { day: "3/31/2019", things: 11 },
      { day: "4/1/2019", things: 19 },
      { day: "4/2/2019", things: 25 },
      { day: "4/3/2019", things: 26 },
      { day: "4/4/2019", things: 44 },
      { day: "4/5/2019", things: 22 },
      { day: "4/6/2019", things: 10 },
      { day: "4/7/2019", things: 16 },
      { day: "4/8/2019", things: 27 },
      { day: "4/9/2019", things: 25 },
      { day: "4/10/2019", things: 19 },
      { day: "4/11/2019", things: 23 },
      { day: "4/12/2019", things: 25 },
      { day: "4/13/2019", things: 14 },
      { day: "4/14/2019", things: 7 },
      { day: "4/15/2019", things: 17 },
      { day: "4/16/2019", things: 22 },
      { day: "4/17/2019", things: 19 },
      { day: "4/18/2019", things: 28 },
      { day: "4/19/2019", things: 17 },
      { day: "4/20/2019", things: 11 },
      { day: "4/21/2019", things: 15 },
      { day: "4/22/2019", things: 20 },
      { day: "4/23/2019", things: 24 },
      { day: "4/24/2019", things: 31 },
      { day: "4/25/2019", things: 18 },
      { day: "4/26/2019", things: 13 },
      { day: "4/27/2019", things: 9 },
      { day: "4/28/2019", things: 2 },
      { day: "4/29/2019", things: 13 },
      { day: "4/30/2019", things: 11 },
      { day: "5/1/2019", things: 26 },
      { day: "5/2/2019", things: 17 },
      { day: "5/3/2019", things: 15 },
      { day: "5/4/2019", things: 8 },
      { day: "5/5/2019", things: 5 },
      { day: "5/6/2019", things: 13 },
      { day: "5/7/2019", things: 12 },
      { day: "5/8/2019", things: 7 },
      { day: "5/9/2019", things: 14 },
      { day: "5/10/2019", things: 14 },
      { day: "5/11/2019", things: 11 },
      { day: "5/12/2019", things: 8 },
      { day: "5/13/2019", things: 25 },
      { day: "5/14/2019", things: 46 },
      { day: "5/15/2019", things: 30 },
      { day: "5/16/2019", things: 32 },
      { day: "5/17/2019", things: 38 },
      { day: "5/18/2019", things: 19 },
      { day: "5/19/2019", things: 38 },
      { day: "5/20/2019", things: 22 },
      { day: "5/21/2019", things: 57 },
      { day: "5/22/2019", things: 60 },
      { day: "5/23/2019", things: 26 },
      { day: "5/24/2019", things: 19 },
      { day: "5/25/2019", things: 7 },
      { day: "5/26/2019", things: 8 },
      { day: "5/27/2019", things: 6 },
      { day: "5/28/2019", things: 37 },
      { day: "5/29/2019", things: 103 },
      { day: "5/30/2019", things: 68 },
      { day: "5/31/2019", things: 32 },
      { day: "6/1/2019", things: 17 },
      { day: "6/2/2019", things: 25 },
      { day: "6/3/2019", things: 46 },
      { day: "6/4/2019", things: 57 },
      { day: "6/5/2019", things: 52 },
      { day: "6/6/2019", things: 38 },
      { day: "6/7/2019", things: 35 },
      { day: "6/8/2019", things: 11 },
      { day: "6/9/2019", things: 15 },
      { day: "6/10/2019", things: 20 },
      { day: "6/11/2019", things: 39 },
      { day: "6/12/2019", things: 25 },
      { day: "6/13/2019", things: 22 },
      { day: "6/14/2019", things: 31 },
      { day: "6/15/2019", things: 21 },
      { day: "6/16/2019", things: 14 },
      { day: "6/17/2019", things: 34 },
      { day: "6/18/2019", things: 26 },
      { day: "6/19/2019", things: 23 },
      { day: "6/20/2019", things: 27 },
      { day: "6/21/2019", things: 19 },
      { day: "6/22/2019", things: 8 },
      { day: "6/23/2019", things: 13 },
      { day: "6/24/2019", things: 14 },
      { day: "6/25/2019", things: 33 },
      { day: "6/26/2019", things: 31 },
      { day: "6/27/2019", things: 17 },
      { day: "6/28/2019", things: 22 },
      { day: "6/29/2019", things: 11 },
      { day: "6/30/2019", things: 13 },
      { day: "7/1/2019", things: 24 },
      { day: "7/2/2019", things: 29 },
      { day: "7/3/2019", things: 19 },
      { day: "7/4/2019", things: 15 },
      { day: "7/5/2019", things: 12 },
      { day: "7/6/2019", things: 4 },
      { day: "7/7/2019", things: 12 },
      { day: "7/8/2019", things: 32 },
      { day: "7/9/2019", things: 25 },
      { day: "7/10/2019", things: 35 },
      { day: "7/11/2019", things: 19 },
      { day: "7/12/2019", things: 16 },
      { day: "7/13/2019", things: 6 },
      { day: "7/14/2019", things: 7 },
      { day: "7/15/2019", things: 48 },
      { day: "7/16/2019", things: 72 },
      { day: "7/17/2019", things: 28 },
      { day: "7/18/2019", things: 21 },
      { day: "7/19/2019", things: 25 },
      { day: "7/20/2019", things: 13 },
      { day: "7/21/2019", things: 13 },
      { day: "7/22/2019", things: 37 },
      { day: "7/23/2019", things: 35 },
      { day: "7/24/2019", things: 49 },
      { day: "7/25/2019", things: 30 },
      { day: "7/26/2019", things: 27 },
      { day: "7/27/2019", things: 9 },
      { day: "7/28/2019", things: 16 },
      { day: "7/29/2019", things: 26 },
      { day: "7/30/2019", things: 24 },
      { day: "7/31/2019", things: 27 },
      { day: "8/1/2019", things: 10 },
      { day: "8/2/2019", things: 13 },
      { day: "8/3/2019", things: 6 },
      { day: "8/4/2019", things: 13 },
      { day: "8/5/2019", things: 24 },
      { day: "8/6/2019", things: 17 },
      { day: "8/7/2019", things: 40 },
      { day: "8/8/2019", things: 23 },
      { day: "8/9/2019", things: 24 },
      { day: "8/10/2019", things: 16 },
      { day: "8/11/2019", things: 9 },
      { day: "8/12/2019", things: 21 },
      { day: "8/13/2019", things: 19 },
      { day: "8/14/2019", things: 44 },
      { day: "8/15/2019", things: 23 },
      { day: "8/16/2019", things: 28 },
      { day: "8/17/2019", things: 10 },
      { day: "8/18/2019", things: 8 },
      { day: "8/19/2019", things: 22 },
      { day: "8/20/2019", things: 18 },
      { day: "8/21/2019", things: 21 },
      { day: "8/22/2019", things: 48 },
      { day: "8/23/2019", things: 36 },
      { day: "8/24/2019", things: 8 },
      { day: "8/25/2019", things: 15 },
      { day: "8/26/2019", things: 25 },
      { day: "8/27/2019", things: 18 },
      { day: "8/28/2019", things: 28 },
      { day: "8/29/2019", things: 19 },
      { day: "8/30/2019", things: 23 },
      { day: "8/31/2019", things: 10 },
      { day: "9/1/2019", things: 9 },
      { day: "9/2/2019", things: 23 },
      { day: "9/3/2019", things: 11 },
      { day: "9/4/2019", things: 24 },
      { day: "9/5/2019", things: 30 },
      { day: "9/6/2019", things: 19 },
      { day: "9/7/2019", things: 10 },
      { day: "9/8/2019", things: 8 },
      { day: "9/9/2019", things: 18 },
      { day: "9/10/2019", things: 30 },
      { day: "9/11/2019", things: 32 },
      { day: "9/12/2019", things: 31 },
      { day: "9/13/2019", things: 34 },
      { day: "9/14/2019", things: 15 },
      { day: "9/15/2019", things: 17 },
      { day: "9/16/2019", things: 25 },
      { day: "9/17/2019", things: 37 },
      { day: "9/18/2019", things: 30 },
      { day: "9/19/2019", things: 35 },
      { day: "9/20/2019", things: 43 },
      { day: "9/21/2019", things: 18 },
      { day: "9/22/2019", things: 11 },
      { day: "9/23/2019", things: 24 },
      { day: "9/24/2019", things: 16 },
      { day: "9/25/2019", things: 19 },
      { day: "9/26/2019", things: 70 },
      { day: "9/27/2019", things: 33 },
      { day: "9/28/2019", things: 10 },
      { day: "9/29/2019", things: 18 },
      { day: "9/30/2019", things: 25 },
      { day: "10/1/2019", things: 36 },
      { day: "10/2/2019", things: 21 },
      { day: "10/3/2019", things: 24 },
      { day: "10/4/2019", things: 14 },
      { day: "10/5/2019", things: 9 },
      { day: "10/6/2019", things: 9 },
      { day: "10/7/2019", things: 20 },
      { day: "10/8/2019", things: 29 },
      { day: "10/9/2019", things: 23 },
      { day: "10/10/2019", things: 15 },
      { day: "10/11/2019", things: 19 },
      { day: "10/12/2019", things: 5 },
      { day: "10/13/2019", things: 6 },
      { day: "10/14/2019", things: 19 },
      { day: "10/15/2019", things: 16 },
      { day: "10/16/2019", things: 21 },
      { day: "10/17/2019", things: 23 },
      { day: "10/18/2019", things: 25 },
      { day: "10/19/2019", things: 6 },
      { day: "10/20/2019", things: 7 },
      { day: "10/21/2019", things: 31 },
      { day: "10/22/2019", things: 22 },
      { day: "10/23/2019", things: 44 },
      { day: "10/24/2019", things: 29 },
      { day: "10/25/2019", things: 22 },
      { day: "10/26/2019", things: 7 },
      { day: "10/27/2019", things: 3 },
      { day: "10/28/2019", things: 25 },
      { day: "10/29/2019", things: 18 },
      { day: "10/30/2019", things: 29 },
      { day: "10/31/2019", things: 22 },
      { day: "11/1/2019", things: 13 },
      { day: "11/2/2019", things: 8 },
      { day: "11/3/2019", things: 13 },
      { day: "11/4/2019", things: 13 },
      { day: "11/5/2019", things: 9 },
      { day: "11/6/2019", things: 6 },
      { day: "11/7/2019", things: 24 },
      { day: "11/8/2019", things: 9 },
      { day: "11/9/2019", things: 7 },
      { day: "11/10/2019", things: 3 },
      { day: "11/11/2019", things: 11 },
      { day: "11/12/2019", things: 21 },
      { day: "11/13/2019", things: 17 },
      { day: "11/14/2019", things: 17 },
      { day: "11/15/2019", things: 12 },
      { day: "11/16/2019", things: 7 },
      { day: "11/17/2019", things: 8 },
      { day: "11/18/2019", things: 12 },
      { day: "11/19/2019", things: 11 },
      { day: "11/20/2019", things: 24 },
      { day: "11/21/2019", things: 16 },
      { day: "11/22/2019", things: 15 },
      { day: "11/23/2019", things: 3 },
      { day: "11/24/2019", things: 5 },
      { day: "11/25/2019", things: 9 },
      { day: "11/26/2019", things: 11 },
      { day: "11/27/2019", things: 25 },
      { day: "11/28/2019", things: 19 },
      { day: "11/29/2019", things: 6 },
      { day: "11/30/2019", things: 10 },
      { day: "12/1/2019", things: 12 },
      { day: "12/2/2019", things: 15 },
      { day: "12/3/2019", things: 12 },
      { day: "12/4/2019", things: 27 },
      { day: "12/5/2019", things: 40 },
      { day: "12/6/2019", things: 38 },
      { day: "12/7/2019", things: 5 },
      { day: "12/8/2019", things: 7 },
      { day: "12/9/2019", things: 22 },
      { day: "12/10/2019", things: 23 },
      { day: "12/11/2019", things: 24 },
      { day: "12/12/2019", things: 22 },
      { day: "12/13/2019", things: 17 },
      { day: "12/14/2019", things: 5 },
      { day: "12/15/2019", things: 7 },
      { day: "12/16/2019", things: 15 },
      { day: "12/17/2019", things: 20 },
      { day: "12/18/2019", things: 21 },
      { day: "12/19/2019", things: 23 },
      { day: "12/20/2019", things: 8 },
      { day: "12/21/2019", things: 10 },
      { day: "12/22/2019", things: 4 },
      { day: "12/23/2019", things: 10 },
      { day: "12/24/2019", things: 8 },
      { day: "12/25/2019", things: 5 },
      { day: "12/26/2019", things: 5 },
      { day: "12/27/2019", things: 10 },
      { day: "12/28/2019", things: 3 },
      { day: "12/29/2019", things: 6 },
      { day: "12/30/2019", things: 20 },
      { day: "12/31/2019", things: 15 },
      { day: "1/1/2020", things: 12 },
      { day: "1/2/2020", things: 21 },
      { day: "1/3/2020", things: 20 },
      { day: "1/4/2020", things: 12 },
      { day: "1/5/2020", things: 8 },
      { day: "1/6/2020", things: 19 },
      { day: "1/7/2020", things: 26 },
      { day: "1/8/2020", things: 23 },
      { day: "1/9/2020", things: 11 },
      { day: "1/10/2020", things: 13 },
      { day: "1/11/2020", things: 11 },
      { day: "1/12/2020", things: 9 },
      { day: "1/13/2020", things: 30 },
      { day: "1/14/2020", things: 90 },
      { day: "1/15/2020", things: 54 },
      { day: "1/16/2020", things: 32 },
      { day: "1/17/2020", things: 20 },
      { day: "1/18/2020", things: 10 },
      { day: "1/19/2020", things: 16 },
      { day: "1/20/2020", things: 29 },
      { day: "1/21/2020", things: 40 },
      { day: "1/22/2020", things: 37 },
      { day: "1/23/2020", things: 43 },
      { day: "1/24/2020", things: 34 },
      { day: "1/25/2020", things: 17 },
      { day: "1/26/2020", things: 13 },
      { day: "1/27/2020", things: 33 },
      { day: "1/28/2020", things: 35 },
      { day: "1/29/2020", things: 18 },
      { day: "1/30/2020", things: 22 },
      { day: "1/31/2020", things: 24 },
      { day: "2/1/2020", things: 6 }
    ]

    examples.push({
      name: "Simple",
      demo: (
        <div>
          <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            dataVersion="fixed"
            lines={movies}
            lineType={{
              type: "line",
              interpolator: "monotonex"
            }}
            lineDataAccessor={["coordinates"]}
            xAccessor={["week"]}
            yAccessor={["theaterCount"]}
            lineStyle={d => ({
              stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
              fill: "none"
            })}
            pointStyle={d => ({
              fill: d.parentLine.title === "Ex Machina" ? "#00a2ce" : "red"
            })}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                jaggedBase: true,
                baseline: false
              },
              {
                orient: "bottom",
                jaggedBase: true,
                baseline: false
              }
            ]}
            customHoverBehavior={d => console.info("custom hover d", d)}
            customClickBehavior={d => console.info("click on d", d)}
            customDoubleClickBehavior={d =>
              console.info("customDoubleClickBehavior d", d)
            }
            backgroundGraphics={({ size, margin }) => (
              <g>
                <rect
                  fill="#fffceb"
                  stroke="#f8ffeb"
                  width={size[0] - margin.right}
                  height={size[1] - margin.top - margin.bottom}
                  x={margin.left}
                  y={margin.top}
                />
                <text>{JSON.stringify(margin)}</text>
              </g>
            )}
            foregroundGraphics={({ size, margin }) => (
              <g>
                <line
                  strokeWidth={3}
                  stroke={"#fcebff"}
                  x1={margin.left}
                  x2={size[0] - margin.right}
                  y1={size[1] - margin.bottom}
                  y2={size[1] - margin.bottom}
                />
              </g>
            )}
            defined={d => d.theaterCount !== null}
            showLinePoints={"orphan"}
          />
          <h3>Flat Data</h3>
          <ResponsiveXYFrame
            size={[700, 400]}
            responsiveWidth={true}
            lines={flatData}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.day)}
            yAccessor={d => d.things}
            lineStyle={{ stroke: "#1d6cb1", strokeWidth: 3 }}
            lineType={{
              type: "cumulative",
              interpolator: curveCardinal.tension(0.75)
            }}
            hoverAnnotation={true}
            tooltipContent={d => (
              <div className="tooltip-content">
                <div variant="caption">{d.day}</div>
                {d.things} active things
              </div>
            )}
            margin={{ left: 50, bottom: 40, right: 20, top: 13 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom",
                tickFormat: d => `${mlist[d.getMonth()]}`,
                label: "Members"
              }
            ]}
          />
        </div>
      ),
      source: ``
    })

    examples.push({
      name: "dynamicInterpolator",
      demo: (
        <div>
          <p>
            To get make a line chart from this data, you need to pass the array
            into the "lines" property and set up your xAccessor and yAccessor to
            reflect the properties you want to display. We'll start by showing
            the gross based on the week since release.
          </p>
          <p>
            To do this, we set xAccessor to "week" to base the x-axis on week
            and the yAccessor to "grossWeekly" to set the y-axis to reflect the
            gross. We also pass an array of simple axis objects to "axes" as
            well as a margin object to "margin" and a simple text title.
          </p>
          <p>Finally, line style is set with the lineStyle property.</p>
          <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            dataVersion="fixed"
            lines={movies}
            lineType={{
              type: "line",
              interpolator: {
                dynamicInterpolator: (d, i) =>
                  i === 0 ? curveStep : curveCardinal
              }
            }}
            xAccessor={"week"}
            yAccessor={"grossWeekly"}
            lineStyle={d => ({
              stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
              fill: "none"
            })}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
            hoverAnnotation={[
              d => ({
                type: "frame-hover",
                color:
                  (d.parentLine &&
                    d.parentLine.title === "Ex Machina" &&
                    "#00a2ce") ||
                  "red"
              })
            ]}
            customHoverBehavior={d => console.info("custom hover d", d)}
            customClickBehavior={d => console.info("click on d", d)}
            customDoubleClickBehavior={d =>
              console.info("customDoubleClickBehavior d", d)
            }
          />
        </div>
      ),
      source: `<XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            lines={movies}
            xAccessor={"week"}
            yAccessor={"grossWeekly"}
            lineStyle={{ stroke: "#00a2ce" }}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
            hoverAnnotation={true}
            customHoverBehavior={d => console.info("custom hover d", d)}
            customClickBehavior={d => console.info("click on d", d)}
            customDoubleClickBehavior={d =>
              console.info("customDoubleClickBehavior d", d)
            }
          />`
    })

    examples.push({
      name: "Line Chart with Options",
      demo: (
        <div>
          <p>
            If you don't send any value to lineType (like we did above) it
            defaults to "line". Other options are "stackedarea",
            "stackedpercent", "bumpline", "bumparea" and "difference". Rather
            than passing a string to "lineType" you can also pass an object with
            type equal to the kind of line chart you want to deploy. This lets
            you send a custom interpolator, like the curveCardinal interpolator
            in this example.
          </p>
          <p>
            This example also turns on tooltips by setting hoverAnnotation to
            true and shows the individual points that make up the lines by
            setting showLinePoints to true (and with corresponding pointStyle
            set to style those points). As with all the other frames, you can
            also adjust the rendering by setting lineRenderMode to "sketchy" or
            "painty".
          </p>
          <p>
            When hoverAnnotation is turned on, an XYFrame automatically builds a
            voronoi layer to improve interactivity (so you don't have to hover
            exactly on the point to get information, instead, any hovering on
            the chart will highlight the nearest point).
          </p>
          <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            dataVersion="fixed"
            lines={movies}
            xAccessor={"week"}
            yAccessor={"grossWeekly"}
            lineStyle={{ stroke: "black", strokeWidth: "3px", fill: "none" }}
            lineType={{ type: "line", interpolator: curveMonotoneX }}
            showLinePoints={true}
            pointStyle={() => {
              return { fill: "white", stroke: "black", strokeWidth: "2px" }
            }}
            hoverAnnotation={true}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>{d.parentLine.title}</p>
                  <p>Week {d.week}</p>
                  <p>${d.grossWeekly}</p>
                </div>
              )
            }}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
          />
        </div>
      ),
      source: `import { curveCardinal } from "d3-shape";

      <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            lines={movies}
            xAccessor={"week"}
            yAccessor={"grossWeekly"}
            lineStyle={{ stroke: "#00a2ce" }}
            lineType={{ type: "line", interpolator: curveCardinal }}
            lineRenderMode={"sketchy"}
            showLinePoints={true}
            pointStyle={{ fill: "#00a2ce" }}
            hoverAnnotation={true}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
          />`
    })

    examples.push({
      name: "Line Chart with Interactivity",
      demo: (
        <div>
          <p>
            If you want to add interactivity to highlight a point, you can do so
            by writing a custom annotation rule and passing the hovered point
            information into your annotations. Once you start using custom
            interaction and sending new data to an XYFrame, you can take
            advantage of the dataVersion prop to tell the frame if the data has
            changed. If it is passed a dataVersion, the frame will only update
            the data visualization portion of the frame if the dataVersion value
            changes. This is a simple way to optimize your chart when you can't
            ensure that you're sending the same literal for the data and various
            settings. In this case, we set the dataVersion to "fixed" because
            the data will never change. The text "fixed" isn't a special case,
            it could have been "no" or 8 or any other value, it's the fact that
            the value doesn't change that keeps it from updating. We're still
            sending different settings to the chart via the annotations setting
            but it's only updating the annotation layer.
          </p>
          <p>
            A red circular ring is drawn on the hovered point because we define
            a custom rule to handle that dynamic annotation.
          </p>

          <XYFrame
            title={"Two Movies"}
            size={chartSize}
            lines={movies}
            xAccessor={interactiveXAccessor}
            yAccessor={interactiveYAccessor}
            lineStyle={interactiveLineStyle}
            lineType={curvedCardinalLine}
            showLinePoints={true}
            pointStyle={interactivePointStyle}
            hoverAnnotation={true}
            margin={interactiveChartMargin}
            axes={interactiveChartAxes}
            customHoverBehavior={this.lineHoverBehavior}
            lineRenderMode="sketchy"
            annotations={
              this.state.hoverPoint
                ? [{ ...this.state.hoverPoint, type: "hover" }]
                : undefined
            }
            svgAnnotationRules={this.lineAnnotater}
          />
        </div>
      ),
      source: `import { curveCardinal } from "d3-shape";

export default class CreatingLineChart extends React.Component {
  constructor(props) {
    super(props);
    this.lineHoverBehavior = this.lineHoverBehavior.bind(this);
    this.state = {
      hoverPoint: undefined
    };
  }
  lineHoverBehavior(d) {
    this.setState({ hoverPoint: d });
  }

  lineAnnotater({ d, xScale, yScale }) {
    if (!d.type === "hover") {
      return null;
    }

    return (
      <circle
        r={10}
        style={{ fill: "none", stroke: "red", strokeWidth: 5 }}
        cx={xScale(d.week)}
        cy={yScale(d.grossWeekly)}
      />
    );
  }

  render() {

  <XYFrame
    title={"Two Movies"}
    size={[700, 400]}
    lines={movies}
    xAccessor={"week"}
    yAccessor={"grossWeekly"}
    lineStyle={{ stroke: "#00a2ce" }}
    lineType={{ type: "line", interpolator: curveCardinal }}
    showLinePoints={true}
    pointStyle={{ fill: "#00a2ce" }}
    hoverAnnotation={true}
    margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
    axes={[
      {
        orient: "left"
      },
      {
        orient: "bottom"
      }
    ]}
    customHoverBehavior={this.lineHoverBehavior}
    lineRenderMode="sketchy"
    annotations={
      this.state.hoverPoint ? (
        [Object.assign({}, this.state.hoverPoint, { type: "hover" })]
      ) : (
        undefined
      )
    }
    svgAnnotationRules={this.lineAnnotater}
  />
}
}`
    })

    examples.push({
      name: "Stacked Area Chart",
      demo: (
        <div>
          <p>
            Instead of plotting the week of the movie's release, we can plot its
            actual date, but to do so we need to send a more complex accessor to
            cast the date string into a JavaScript date, as well as pass a
            D3-style scale (in this case scaleTime) to xScaleType. This example
            also shows how to format your ticks, since dates by default show the
            ugly full date string.
          </p>
          <p>
            This example uses the stackedarea lineType, which shows aggregated
            values, and passes a function to lineStyle that sets the fill based
            on the title associated with the line.
          </p>
          <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            lines={movies}
            dataVersion="fixed"
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={{
              type: "stackedpercent",
              interpolator: {
                dynamicInterpolator: (d, i) =>
                  i === 0 ? curveMonotoneX : curveBasis
              }
            }}
            lineStyle={d => ({
              fill: colorHash[d.title]
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => `${d / 1000000}m`
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`
              }
            ]}
          />
        </div>
      ),
      source: `import { scaleTime } from "d3-scale";
                <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            lines={movies}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={"stackedarea"}
            lineStyle={d => ({
              fill: colorHash[d.title]
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => d / 1000000 + "m"
              },
              {
                orient: "bottom",
                tickFormat: d => d.getMonth() + "/" + d.getDate()
              }
            ]}
          />`
    })

    examples.push({
      name: "Percent Charts",
      demo: (
        <div>
          <p>
            For convenience there are "stackedpercent" and "linepercent" chart
            types that lay out stacked area and line charts but calculate the
            line position and value as a percent of the lines at that point.
            These also expose a percent value in the default tooltip.
          </p>
          <XYFrame
            title={"linepercent"}
            size={[700, 400]}
            lines={movies}
            dataVersion="fixed"
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={{ type: "linepercent", interpolator: curveMonotoneX }}
            lineStyle={d => ({
              stroke: colorHash[d.title],
              strokeWidth: 2
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => `${parseInt(d * 100, 10)}%`
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`
              }
            ]}
            hoverAnnotation={true}
          />
          <XYFrame
            title={"stackedpercent"}
            size={[700, 400]}
            lines={movies}
            dataVersion="fixed"
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={{ type: "stackedpercent", interpolator: curveMonotoneX }}
            lineStyle={d => ({
              fill: colorHash[d.title]
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => `${parseInt(d * 100, 10)}%`
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`
              }
            ]}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `import { curveMonotoneX } from "d3-shape";
      <XYFrame
      title={"stackedpercent"}
      size={[700, 400]}
      lines={movies}
      dataVersion="fixed"
      xScaleType={scaleTime()}
      xAccessor={d => new Date(d.date)}
      yAccessor={"grossWeekly"}
      lineType={{ type: "linepercent", interpolator: curveMonotoneX }}
      lineStyle={d => ({
        stroke: colorHash[d.title], strokeWidth: 2
      })}
      margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left",
          tickFormat: d => parseInt(d * 100) + "%"
        },
        {
          orient: "bottom",
          tickFormat: d => d.getMonth() + "/" + d.getDate()
        }
      ]}
      hoverAnnotation={true}
    />

      <XYFrame
      title={"stackedpercent"}
      size={[700, 400]}
      lines={movies}
      dataVersion="fixed"
      xScaleType={scaleTime()}
      xAccessor={d => new Date(d.date)}
      yAccessor={"grossWeekly"}
      lineType={{ type: "stackedpercent", interpolator: curveMonotoneX }}
      lineStyle={d => ({
        fill: colorHash[d.title]
      })}
      margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left",
          tickFormat: d => parseInt(d * 100) + "%"
        },
        {
          orient: "bottom",
          tickFormat: d => d.getMonth() + "/" + d.getDate()
        }
      ]}
      hoverAnnotation={true}
    />`
    })

    examples.push({
      name: "Cumulative Charts",
      demo: (
        <div>
          <p>
            For convenience there are "cumulative" and "cumulative-reverse" to
            conveniently make cumulative charts.
          </p>
          <XYFrame
            title={"cumulative"}
            size={[700, 400]}
            dataVersion="fixed"
            lines={movies}
            lineType={{
              type: "cumulative",
              interpolator: "linear"
            }}
            lineDataAccessor={["coordinates"]}
            xAccessor={["week"]}
            yAccessor={["theaterCount"]}
            lineStyle={d => ({
              stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
              fill: "none"
            })}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
            hoverAnnotation={[
              d => ({
                type: "frame-hover",
                color:
                  (d.parentLine &&
                    d.parentLine.title === "Ex Machina" &&
                    "#00a2ce") ||
                  "red"
              })
            ]}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>{d.parentLine.title}</p>
                  <p>Week: {d.week}</p>
                  <p>
                    Theaters: {d.theaterCount} ({d.yMiddle} Cumulative)
                  </p>
                </div>
              )
            }}
          />
          <XYFrame
            title={"cumulative-reverse"}
            size={[700, 400]}
            dataVersion="fixed"
            lines={movies}
            lineType={{
              type: "cumulative-reverse",
              interpolator: "linear"
            }}
            lineDataAccessor={["coordinates"]}
            xAccessor={["week"]}
            yAccessor={["theaterCount"]}
            lineStyle={d => ({
              stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
              fill: "none"
            })}
            margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom"
              }
            ]}
            hoverAnnotation={[
              d => ({
                type: "frame-hover",
                color:
                  (d.parentLine &&
                    d.parentLine.title === "Ex Machina" &&
                    "#00a2ce") ||
                  "red"
              })
            ]}
            customHoverBehavior={d => console.info("custom hover d", d)}
            customClickBehavior={d => console.info("click on d", d)}
            customDoubleClickBehavior={d =>
              console.info("customDoubleClickBehavior d", d)
            }
          />
        </div>
      ),
      source: `<XYFrame
      title={"Two Movies"}
      size={[700, 400]}
      dataVersion="fixed"
      lines={movies}
      lineType={{
        type: "cumulative-reverse",
        interpolator: "cardinal"
      }}
      lineDataAccessor={["coordinates"]}
      xAccessor={["week"]}
      yAccessor={["theaterCount"]}
      lineStyle={d => ({
        stroke: d.title === "Ex Machina" ? "#00a2ce" : "red",
        fill: "none"
      })}
      margin={{ left: 80, bottom: 50, right: 10, top: 40 }}
      axes={[
        {
          orient: "left"
        },
        {
          orient: "bottom"
        }
      ]}
      hoverAnnotation={[
        d => ({
          type: "frame-hover",
          color:
            (d.parentLine &&
              d.parentLine.title === "Ex Machina" &&
              "#00a2ce") ||
            "red"
        })
      ]}
      tooltipContent={d => {
        return (
          <div className="tooltip-content">
            <p>{d.parentLine.title}</p>
            <p>Week: {d.week}</p>
            <p>
              Theaters: {d.theaterCount} ({d.yMiddle} Cumulative)
            </p>
          </div>
        )
      }}
    />`
    })

    examples.push({
      name: "Bump Area Chart",
      demo: (
        <div>
          <p>
            Here's the "bumparea" mode, which is liked "stackedarea" but changes
            the stack order based on rank. Notice that tooltips with the area
            lines are anchored in the middle of the area of the line.
          </p>
          <XYFrame
            title={"Two Movies"}
            size={[700, 400]}
            lines={movies}
            dataVersion="fixed"
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={{ type: "bumparea", interpolator: curveMonotoneX }}
            lineStyle={d => ({
              fill: colorHash[d.title]
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => `${d / 1000000}m`
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`
              }
            ]}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `import { curveMonotoneX } from "d3-shape";
<XYFrame
  title={"Two Movies"}
  size={[700, 400]}
  lines={movies}
  xScaleType={scaleTime()}
  xAccessor={d => new Date(d.date)}
  yAccessor={"grossWeekly"}
  lineType={{ type: "bumparea", interpolator: curveMonotoneX }}
  lineStyle={d => ({
    stroke: colorHash[d.title],
    fill: colorHash[d.title]
  })}
  margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
  axes={[
    {
      orient: "left",
      tickFormat: d => d / 1000000 + "m"
    },
    {
      orient: "bottom",
      tickFormat: d => d.getMonth() + "/" + d.getDate()
    }
  ]}
  hoverAnnotation={true}
/>`
    })

    examples.push({
      name: "Brush Y Chart",
      demo: (
        <div>
          <p>
            You can use the built-in "onChange" event in a chart's extent to set
            the extent of another chart. Pairing this with the "interaction"
            settings of an XYFrame lets you easily deploy a brushable chart.
          </p>
          <button
            onClick={() =>
              this.setState({
                brushChart:
                  this.state.brushChart === "stackedpercent"
                    ? "line"
                    : "stackedpercent"
              })
            }
            style={{ color: "black" }}
          >
            Switch lineType
          </button>
          <div>
            <div style={{ display: "inline-block", width: "100px" }}>
              <XYFrame
                size={[100, 400]}
                axes={[
                  {
                    orient: "left",
                    tickFormat:
                      this.state.brushChart === "stackedpercent"
                        ? d => d
                        : d => `${d / 1000000}m`
                  }
                ]}
                interaction={{
                  end: e => {
                    this.setState({ extent: e })
                  },
                  brush: "yBrush",
                  extent: [this.state.yMax, 0]
                }}
                yExtent={[0, this.state.yMax]}
                margin={{ left: 50, bottom: 50, right: 5, top: 40 }}
              />
            </div>
            <div style={{ display: "inline-block", width: "600px" }}>
              <XYFrame
                title={"Two Movies"}
                size={[600, 400]}
                lines={movies}
                xScaleType={scaleTime()}
                xAccessor={d => new Date(d.date)}
                yAccessor={"grossWeekly"}
                yExtent={{
                  extent: this.state.extent,
                  onChange: e => this.setState({ yMax: e[1] })
                }}
                lineType={{
                  type: this.state.brushChart,
                  interpolator: curveMonotoneX
                }}
                lineStyle={d => ({
                  stroke: colorHash[d.title],
                  fill:
                    this.state.brushChart === "line"
                      ? undefined
                      : colorHash[d.title]
                })}
                margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
                axes={[
                  {
                    orient: "left",
                    tickFormat:
                      this.state.brushChart === "stackedpercent"
                        ? d => d
                        : d => `${d / 1000000}m`
                  },
                  {
                    orient: "bottom",
                    tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                    ticks: 5
                  }
                ]}
                hoverAnnotation={true}
                matte={true}
              />
            </div>
          </div>
        </div>
      ),
      source: `
<button
onClick={() =>
  this.setState({
    brushChart:
      this.state.brushChart === "stackedpercent"
        ? "line"
        : "stackedpercent"
  })
}
style={{ color: "black"}}
>
Switch to lines
</button>

<div>
      <div style={{ display: "inline-block", width: "100px" }}>
        <XYFrame
          size={[100, 400]}
          axes={[
            {
              orient: "left",
              tickFormat:
                this.state.brushChart === "stackedpercent"
                  ? d => d
                  : d => ${"`${d / 1000000}m`"}
            }
          ]}
          interaction={{
            end: e => {
              this.setState({ extent: e.reverse() })
            },
            brush: "yBrush",
            extent: [this.state.yMax, 0]
          }}
          yExtent={[0, this.state.yMax]}
          margin={{ left: 50, bottom: 50, right: 5, top: 40 }}
        />
      </div>
      <div style={{ display: "inline-block", width: "600px" }}>
        <XYFrame
          title={"Two Movies"}
          size={[600, 400]}
          lines={movies}
          xScaleType={scaleTime()}
          xAccessor={d => new Date(d.date)}
          yAccessor={"grossWeekly"}
          yExtent={{
            extent: this.state.extent,
            onChange: e => this.setState({ yMax: e[1] })
          }}
          lineType={{
            type: this.state.brushChart,
            interpolator: curveMonotoneX
          }}
          lineStyle={d => ({
            fill: colorHash[d.title],
            stroke: colorHash[d.title]
          })}
          margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
          axes={[
            {
              orient: "left",
              tickFormat:
                this.state.brushChart === "stackedpercent"
                  ? d => d
                  : d => ${"`${d / 1000000}m`"}
            },
            {
              orient: "bottom",
              tickFormat: d => ${"`${d.getMonth()}/${d.getDate()}`,"}
              ticks: 5
            }
          ]}
          hoverAnnotation={true}
          matte={true}
        />
      </div>
    </div>
    `
    })

    const manyMovies = [
      ...movies,
      ...movies.map(m => ({
        ...m,
        title: `${m.title}-0`,
        coordinates: m.coordinates.map(d => ({
          ...d,
          grossWeekly: d.grossWeekly + 50000
        }))
      })),
      ...movies.map(m => ({
        ...m,
        title: `${m.title}-1`,
        coordinates: m.coordinates.map(d => ({
          ...d,
          grossWeekly: d.grossWeekly + 30000
        }))
      })),
      ...movies.map(m => ({
        ...m,
        title: `${m.title}-2`,
        coordinates: m.coordinates.map(d => ({
          ...d,
          grossWeekly: d.grossWeekly + 70000
        }))
      })),
      ...movies.map(m => ({
        ...m,
        title: `${m.title}-3`,
        coordinates: m.coordinates.map(d => ({
          ...d,
          grossWeekly: d.grossWeekly + 20000
        }))
      })),
      ...movies.map(m => ({
        ...m,
        title: `${m.title}-4`,
        coordinates: m.coordinates.map(d => ({
          ...d,
          grossWeekly: d.grossWeekly + 90000
        }))
      }))
    ]
    examples.push({
      name: "Marginalia Line Labeling",
      demo: (
        <div>
          <p>Using marginalia annotation handling to label lines</p>
          <XYFrame
            title={"linepercent"}
            size={[700, 400]}
            lines={manyMovies}
            lineDataAccessor={d => d.coordinates.filter(p => p.week <= 10)}
            dataVersion="fixed"
            xAccessor={"week"}
            yAccessor={"grossWeekly"}
            lineType={{ type: "linepercent", interpolator: curveMonotoneX }}
            lineStyle={d => ({
              stroke: colorHash[d.title],
              strokeWidth: 2
            })}
            margin={{ left: 50, bottom: 50, right: 100, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => `${parseInt(d * 100, 10)}%`
              },
              {
                orient: "bottom"
              }
            ]}
            annotations={manyMovies.map(movie => ({
              week: 10,
              label: movie.title,
              title: movie.title,
              type: "react-annotation",
              color: colorHash[movie.title]
            }))}
            annotationSettings={{
              layout: {
                type: "marginalia",
                orient: "right",
                characterWidth: 8,
                lineWidth: 20,
                padding: 2
              }
            }}
            lineIDAccessor={"title"}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: ``
    })

    return (
      <DocumentComponent
        name="Creating a Line Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The very basics of how to create a line chart, stacked area and bump
          area chart using XYFrame along with hover behavior and styling.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingLineChart.title = "Creating a Line Chart"
