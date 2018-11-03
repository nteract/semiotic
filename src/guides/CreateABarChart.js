import React from "react"
import { OrdinalFrame } from "semiotic"
import DocumentFrame from "../DocumentFrame"
import theme from "../theme"

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
  tweets: theme[0],
  retweets: theme[1],
  favorites: theme[2]
}

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
  size: [200, 200],
  data: barChartData,
  oAccessor: "user",
  rAccessor: "tweets",
  style: { fill: theme[0], stroke: "white" },
  type: "bar",
  oLabel: true
}

const stackedFrameProps = {
  ...frameProps,
  size: [280, 300],
  data: inflatedBarChartData,
  rAccessor: "value",
  axis: {
    orient: "left",
    label: (
      <text textAnchor="middle">
        <tspan fill={colorHash.tweets}>Tweets</tspan> +{" "}
        <tspan fill={colorHash.favorites}>Favorites</tspan> +{" "}
        <tspan fill={colorHash.retweets}>Retweets</tspan>
      </text>
    )
  },
  style: d => ({ fill: colorHash[d.action], stroke: "white" })
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

        <h3>Bar Chart</h3>

        <DocumentFrame frameProps={frameProps} type={OrdinalFrame} />

        <h3>Bar Chart with Bar Padding</h3>
        <p>
          Adding the property <code>oPadding</code> gives spacing between bars.
        </p>
        <DocumentFrame
          frameProps={{ ...frameProps, oPadding: 5 }}
          type={OrdinalFrame}
        />

        <h3>Bar Chart with Bar Padding</h3>
        <p>
          Adding the property <code>oPadding</code> gives spacing between bars.
        </p>
        <DocumentFrame
          frameProps={{ ...frameProps, oPadding: 5, title: "Twitter Chart" }}
          type={OrdinalFrame}
        />

        <h3>Stacked Bar Chart</h3>

        <DocumentFrame frameProps={stackedFrameProps} type={OrdinalFrame} />
      </div>
    )
  }
}
