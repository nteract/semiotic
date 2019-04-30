import * as React from "react"
import { OrdinalFrame } from "../../components"
import { scaleSqrt } from "d3-scale"

import DocumentComponent from "../layout/DocumentComponent"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported
const barChartData = [
  { user: "Jason", tweets: 10, retweets: 10, favorites: 15 },
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

const longBarChartAnnotationData = [
  ...barChartData,
  { user: "Jason1", tweets: 20 },
  { user: "Susie1", tweets: 10 },
  { user: "Matt1", tweets: 10 },
  { user: "Betty1", tweets: 15 },
  { user: "Jason2", tweets: 20 },
  { user: "Susie2", tweets: 10 },
  { user: "Matt2", tweets: 10 },
  { user: "Betty2", tweets: 10 }
]

const colorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
}

const barSize = [300, 500]
const stackedBarStyle = d => ({ fill: colorHash[d.rName], stroke: "white" })
const stackedBarLabel = d => (
  <text transform="translate(-15,0)rotate(45)">{d}</text>
)

const stackedBarAxis = {
  orient: "left",
  label: "Tweets + Favorites + Retweets"
}
const stackedBarMargin = { left: 70, bottom: 50, right: 5, top: 5 }

components.push({
  name: "Creating a Bar Chart"
})

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
    const examples = []
    examples.push({
      name: "Data",
      demo: (
        <div>
          <p>
            OrdinalFrame operates on an array of data referred to in the API as
            "pieces". These pieces can be shown individually or stacked in a bar
            chart, or as points on a dot plot or you can show summary
            visualizations of the patterns of the data.
          </p>
          <p>This is the dataset we'll be using in our examples:</p>
        </div>
      ),
      source: `const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];      `
    })

    examples.push({
      name: "Simple",
      demo: (
        <div>
          <p>
            To get a bar chart of that data, pass it to the data property of
            OrdinalFrame and pass the attribute you want to split by into the
            oAccessor (the "ordinal" or categorical mapping) and the attribute
            you want to measure into the rAccessor (the "range" or quantitative
            mapping). You also want to give the OrdinalFrame a "size" which is
            an array of [height, width]. This example also turns on labels
            (oLabel), margins and a title.
          </p>
          <OrdinalFrame
            size={[500, 300]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
            hoverAnnotation={[]}
            customHoverBehavior={d => console.info("hover", d)}
            customClickBehavior={d => console.info("click", d)}
            customDoubleClickBehavior={d => console.info("doubleclick", d)}
          />
        </div>
      ),
      source: `<OrdinalFrame
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
          />`
    })

    examples.push({
      name: "Complex",
      demo: (
        <div>
          <p>
            The rAccessor can be a simple string or it can be a function that
            returns a more complex value. The labels can also take a function
            that returns SVG JSX so you can move them or rotate them or change
            them as you like. You can adjust margins and easily turn on an axis
            and add some padding (oPadding).
          </p>
          <OrdinalFrame
            title={"A Bar Chart"}
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={d => d.favorites}
            dynamicColumnWidth="retweets"
            style={{ fill: "#00a2ce", stroke: "#00a2ce" }}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{
              orient: "left",
              label: "Favorites +  Retweets",
              jaggedBase: true
            }}
            margin={{ left: 70, bottom: 50, right: 5, top: 55 }}
            oPadding={15}
            backgroundGraphics={({ size, margin }) => (
              <g>
                <rect
                  fill="#fffceb"
                  stroke="#f8ffeb"
                  width={size[0] - margin.right - margin.left}
                  height={size[1] - margin.top - margin.bottom}
                  x={margin.left}
                  y={margin.top}
                  strokeWidth={1}
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
          />
          />
        </div>
      ),
      source: `<OrdinalFrame
            title={"A Bar Chart"}
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={d => d.retweets + d.favorites}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{ orient: "left", label: "Favorites + Retweets" }}
            margin={{ left: 70, bottom: 50, right: 5, top: 55 }}
            oPadding={5}
          />`
    })

    examples.push({
      name: "Stacked Data",
      demo: (
        <div>
          <p>
            Because of the way OrdinalFrame models information, it can be useful
            to reformat your data to slice it into smaller pieces so that you
            can use its automatic stacking and other data visualization modes.
            So, for instance, we could take the original dataset and make it a
            bit more verbose to make a stacked chart.
          </p>
        </div>
      ),
      source: `const inflatedBarChartData = [
  { user: "Jason", type: "tweets", value: 10 },
  { user: "Susie", type: "tweets", value: 5 },
  { user: "Matt", type: "tweets", value: 20 },
  { user: "Betty", type: "tweets", value: 30 },
  { user: "Jason", type: "retweets", value: 5 },
  { user: "Susie", type: "retweets", value: 100 },
  { user: "Matt", type: "retweets", value: 25 },
  { user: "Betty", type: "retweets", value: 20 },
  { user: "Jason", type: "favorites", value: 15 },
  { user: "Susie", type: "favorites", value: 100 },
  { user: "Matt", type: "favorites", value: 50 },
  { user: "Betty", type: "favorites", value: 10 }
];`
    })

    examples.push({
      name: "Stacked Bar Chart",
      demo: (
        <div>
          <p>
            With that data, we just need to figure out a way to color each
            different kind of action (tweet, retweet, favorite) differently and
            get you automatically get a simple stacked bar chart.
          </p>
          <p>
            Here I define a simple hash that associates each action with a
            different color and use the "style" functionality to pass a data
            that colors each piece based on its type.
          </p>
          <p>
            One thing to notice is that the sorting of items in OrdinalFrame is
            based on the sorting of the data array you send in, so if you want
            certain columns or pieces to appear first, then pre-sort your data.
          </p>
          <OrdinalFrame
            size={barSize}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={[d => d.tweets, "favorites", "retweets"]}
            projection={"horizontal"}
            style={stackedBarStyle}
            type={"bar"}
            oLabel={stackedBarLabel}
            axis={stackedBarAxis}
            margin={stackedBarMargin}
            oPadding={5}
            pieceHoverAnnotation={true}
            rScaleType={scaleSqrt}
            annotations={
              this.state.hoverPoint
                ? [Object.assign({}, this.state.hoverPoint, { type: "hover" })]
                : [
                    {
                      type: "react-annotation",
                      rName: "retweets",
                      user: "Matt",
                      label: "Testing a relative value annotation",
                      dx: 100,
                      dy: -50
                    }
                  ]
            }
            svgAnnotationRules={this.barAnnotator}
          />
        </div>
      ),
      source: `const colorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
}
          <OrdinalFrame
            size={[300, 500]}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={d => ({ fill: colorHash[d.action], stroke: "white" })}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{ orient: "left", label: "Tweets + Favorites + Retweets" }}
            margin={{ left: 70, bottom: 50, right: 5, top: 5 }}
            oPadding={5}
          />
`
    })

    examples.push({
      name: "Brushing",
      demo: (
        <div>
          <p>
            You can enable brushing on a whole OrdinalFrame and it will snap to
            columns/rows.
          </p>
          <OrdinalFrame
            size={[600, 300]}
            data={longBarChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            oPadding={10}
            projection="vertical"
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
            //            hoverAnnotation={[]}
            customHoverBehavior={d => console.info("hover", d)}
            customClickBehavior={d => console.info("click", d)}
            customDoubleClickBehavior={d => console.info("doubleclick", d)}
            renderMode="sketchy"
            interaction={{
              extent: ["Matt1", "Susie2"],
              end: e => {
                console.info("e", e)
              },
              during: e => {
                console.info("during e", e)
              }
            }}
          />
          <OrdinalFrame
            size={[300, 600]}
            data={longBarChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            oPadding={10}
            projection="horizontal"
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
            renderMode="sketchy"
            interaction={{
              extent: ["Jason", "Betty"],
              end: e => {
                console.info("e", e)
              },
              during: e => {
                console.info("during e", e)
              }
            }}
          />
        </div>
      ),
      source: `<OrdinalFrame
  size={[300, 600]}
  data={longBarChartData}
  oAccessor={"user"}
  rAccessor={"tweets"}
  oPadding={10}
  projection="horizontal"
  style={{ fill: "#00a2ce", stroke: "white" }}
  type={"bar"}
  oLabel={true}
  renderMode="sketchy"
  interaction={{
    extent: ["Jason", "Betty"],
    end: e => {
      console.info("e", e)
    },
    during: e => {
      console.info("during e", e)
    }
  }}
/>`
    })

    examples.push({
      name: "Bar/Line Charts",
      demo: (
        <div>
          <p>
            OrdinalFrame supports an "ordinal-line" annotation that lets you
            draw a simple line from data (using all the built-in annotation
            functionality) so you can compose line + bar charts. Notice the
            settings for "ordinal-line": You need to pass coordinates and can
            enable interactivity, set a curve/interpolator, show line points,
            set the point radius, define the radius for interactivity (the px
            size around a point that is interactive), pass pointStyle and
            lineStyle objects or functions that return style objects.
          </p>
          <OrdinalFrame
            size={[600, 300]}
            data={longBarChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            oPadding={10}
            projection="vertical"
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
            annotations={[
              {
                type: "ordinal-line",
                curve: "monotonex",
                points: true,
                hoverRadius: 20,
                coordinates: longBarChartAnnotationData,
                interactive: true
              }
            ]}
            hoverAnnotation={true}
          />
          <OrdinalFrame
            size={[300, 600]}
            data={longBarChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            oPadding={10}
            projection="horizontal"
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
            pieceHoverAnnotation={true}
            annotations={[
              {
                type: "ordinal-line",
                curve: "monotoney",
                points: true,
                interactive: true,
                radius: 3,
                lineStyle: { stroke: "darkblue" },
                pointStyle: d =>
                  d.user === "Betty"
                    ? { fill: "white", stroke: "brown", strokeWidth: 4 }
                    : { fill: "white", stroke: "darkblue", strokeWidth: 4 },
                coordinates: longBarChartAnnotationData,
                interactive: true
              }
            ]}
          />
        </div>
      ),
      source: `<OrdinalFrame
      size={[600, 300]}
      data={longBarChartData}
      oAccessor={"user"}
      rAccessor={"tweets"}
      oPadding={10}
      projection="vertical"
      style={{ fill: "#00a2ce", stroke: "white" }}
      type={"bar"}
      oLabel={true}
      annotations={[
        {
          type: "ordinal-line",
          curve: "monotonex",
          points: true,
          hoverRadius: 20,
          coordinates: longBarChartAnnotationData,
          interactive: true
        }
      ]}
      hoverAnnotation={true}
    />
    <OrdinalFrame
      size={[300, 600]}
      data={longBarChartData}
      oAccessor={"user"}
      rAccessor={"tweets"}
      oPadding={10}
      projection="horizontal"
      style={{ fill: "#00a2ce", stroke: "white" }}
      type={"bar"}
      oLabel={true}
      pieceHoverAnnotation={true}
      annotations={[
        {
          type: "ordinal-line",
          curve: "monotoney",
          points: true,
          interactive: true,
          radius: 3,
          lineStyle: { stroke: "darkblue" },
          pointStyle: d =>
            d.user === "Betty"
              ? { fill: "white", stroke: "brown", strokeWidth: 4 }
              : { fill: "white", stroke: "darkblue", strokeWidth: 4 },
          coordinates: longBarChartAnnotationData,
          interactive: true
        }
      ]}
    />`
    })

    return (
      <DocumentComponent
        name="Creating a Bar Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The very basics of how to create a bar chart or stacked bar chart with
          labels and an axis in Semiotic.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingBarChart.title = "Creating a Bar Chart"
