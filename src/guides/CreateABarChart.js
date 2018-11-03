import React from "react"
import { OrdinalFrame } from "semiotic"
import DocumentFrame from "../DocumentFrame"

// Add your component proptype data here
// multiple component proptype documentation supported
const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
]

const longBarChartData = [
  ...barChartData,
  { user: "Jason1", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie1", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt1", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty1", tweets: 30, retweets: 20, favorites: 10 },
  { user: "Jason2", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie2", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt2", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty2", tweets: 30, retweets: 20, favorites: 10 }
]
const inflatedBarChartData = [
  { user: "Jason", action: "tweets", value: 10 },
  { user: "Susie", action: "tweets", value: 5 },
  { user: "Susie", action: "tweets", value: 1 },
  { user: "Matt", action: "tweets", value: 20 },
  { user: "Betty", action: "tweets", value: 30 },
  { user: "Jason", action: "retweets", value: 5 },
  { user: "Susie", action: "retweets", value: 100 },
  { user: "Matt", action: "retweets", value: 25 },
  { user: "Betty", action: "retweets", value: 20 },
  { user: "Jason", action: "favorites", value: 15 },
  { user: "Susie", action: "favorites", value: 100 },
  { user: "Matt", action: "favorites", value: 50 },
  { user: "Betty", action: "favorites", value: 10 }
]

const colorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
}

const barSize = [200, 300]
const stackedBarStyle = d => ({ fill: colorHash[d.action], stroke: "white" })
const stackedBarLabel = d => (
  <text transform="translate(-15,0)rotate(45)">{d}</text>
)

const stackedBarAxis = {
  orient: "left",
  label: "Tweets + Favorites + Retweets"
}
const stackedBarMargin = { left: 70, bottom: 50, right: 5, top: 5 }

const frameProps = {
  size: barSize,
  data: barChartData,
  oAccessor: "user",
  rAccessor: "tweets",
  style: { fill: "#00a2ce", stroke: "white" },
  type: "bar",
  oLabel: true
}

export default class CreatingBarChart extends React.Component {
  constructor(props) {
    super(props)
    this.columnHoverBehavior = this.columnHoverBehavior.bind(this)
    this.state = {
      hoverPoint: undefined
    }
  }
  columnHoverBehavior(d) {
    this.setState({ hoverPoint: d })
  }

  barAnnotator({ d, i, categories }) {
    if (d.type !== "hover") return null

    return (
      <rect
        key={`annotation-${i}`}
        x={categories[d.user].x}
        y={d.y}
        height={d.scaledValue}
        width={categories[d.user].width}
        style={{ fill: "none", stroke: "#00a2ce", strokeWidth: 5 }}
      />
    )
  }

  render() {
    return (
      <div>
        <h2>Creating a Bar Chart</h2>

        <p>
          Creating a bar chart and stacked bar chart with tooltips, labels, and
          an axis in Semiotic.
        </p>

        <p>
          OrdinalFrame operates on an array of data referred to in the API as
          "pieces". These pieces can be shown individually or stacked in a bar
          chart, or as points on a dot plot or you can show summary
          visualizations of the patterns of the data.
        </p>

        <p>
          To get a bar chart of that data, pass it to the data property of
          OrdinalFrame and pass the attribute you want to split by into the
          oAccessor (the "ordinal" or categorical mapping) and the attribute you
          want to measure into the rAccessor (the "range" or quantitative
          mapping). You also want to give the OrdinalFrame a "size" which is an
          array of [height, width]. This example also turns on labels (oLabel),
          margins and a title.
        </p>

        <DocumentFrame frameProps={frameProps} type={OrdinalFrame} />
      </div>
    )
  }
}
