import * as React from "react"
import { XYFrame, OrdinalFrame } from "../../components"
import { scaleTime } from "d3-scale"
import { curveMonotoneX /* , curveCardinal */ } from "d3-shape"

import DocumentComponent from "../layout/DocumentComponent"
// import { line, area } from "d3-shape"

const inflatedBarChartData = [
  { user: "Jason", user2: "Jaammm", action: "tweets", value: 10 },
  { user: "Susie", user2: "Suammm", action: "tweets", value: 5 },
  { user: "Matt", user2: "Mammm", action: "tweets", value: 20 },
  { user: "Betty", user2: "Beammm", action: "tweets", value: 30 },
  { user: "Jason", user2: "Jaammm", action: "retweets", value: 5 },
  { user: "Susie", user2: "Suammm", action: "retweets", value: 100 },
  { user: "Matt", user2: "Mammm", action: "retweets", value: 25 },
  { user: "Betty", user2: "Beammm", action: "retweets", value: 20 },
  { user: "Jason", user2: "Jaammm", action: "favorites", value: 15 },
  { user: "Susie", user2: "Suammm", action: "favorites", value: 100 },
  { user: "Matt", user2: "Mammm", action: "favorites", value: 50 },
  { user: "Betty", user2: "Beammm", action: "favorites", value: 10 }
]

const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
]

const somePoints = [...new Array(50)].map((d, i) => ({
  x: Math.random(),
  y: Math.random(),
  i: i,
  category: i % 4
}))

const barColorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
}

const components = []
// const curvedCardinalLine = { type: "line", interpolator: curveCardinal }
// const interactiveLineStyle = { stroke: "#00a2ce" }
// const interactivePointStyle = () => ({
//   fill: "#00a2ce"
// })
// const interactiveXAccessor = d => d.week
// const interactiveYAccessor = d => d.grossWeekly

// const interactiveChartMargin = { left: 80, bottom: 50, right: 10, top: 40 }
// const interactiveChartAxes = [
//   {
//     orient: "left"
//   },
//   {
//     orient: "bottom"
//   }
// ]

// const chartSize = [700, 400]

const movies = [
  {
    title: "Ex Machina",
    studio: "A24",
    firstWeek: "2015-15",
    maxRank: 6,
    maxGross: 25442958,
    coordinates: [
      {
        week: 1,
        grossWeekly: 327616,
        theaterCount: 4,
        theaterAvg: 81904,
        date: "2015-04-10",
        rank: 18
      },
      {
        week: 2,
        grossWeekly: 1150814,
        theaterCount: 39,
        theaterAvg: 29508,
        date: "2015-04-17",
        rank: 15
      },
      {
        week: 3,
        grossWeekly: 7156570,
        theaterCount: 1255,
        theaterAvg: 5702,
        date: "2015-04-24",
        rank: 6
      },
      {
        week: 4,
        grossWeekly: 3615000,
        theaterCount: 1279,
        theaterAvg: 2826,
        date: "2015-05-01",
        rank: 6
      },
      {
        week: 5,
        grossWeekly: 5212462,
        theaterCount: 2004,
        theaterAvg: 2601,
        date: "2015-05-08",
        rank: 6
      },
      {
        week: 6,
        grossWeekly: 3108609,
        theaterCount: 1718,
        theaterAvg: 1809,
        date: "2015-05-15",
        rank: 9
      },
      {
        week: 7,
        grossWeekly: 2248258,
        theaterCount: 896,
        theaterAvg: 2509,
        date: "2015-05-22",
        rank: 12
      },
      {
        week: 8,
        grossWeekly: 1122034,
        theaterCount: 506,
        theaterAvg: 2217,
        date: "2015-05-29",
        rank: 13
      },
      {
        week: 9,
        grossWeekly: 551552,
        theaterCount: 302,
        theaterAvg: 1826,
        date: "2015-06-05",
        rank: 19
      },
      {
        week: 10,
        grossWeekly: 316877,
        theaterCount: 194,
        theaterAvg: 1633,
        date: "2015-06-12",
        rank: 20
      },
      {
        week: 11,
        grossWeekly: 201345,
        theaterCount: 124,
        theaterAvg: 1624,
        date: "2015-06-19",
        rank: 29
      },
      {
        week: 12,
        grossWeekly: 153162,
        theaterCount: 81,
        theaterAvg: 1891,
        date: "2015-06-26",
        rank: 34
      },
      {
        week: 13,
        grossWeekly: 102114,
        theaterCount: 61,
        theaterAvg: 1674,
        date: "2015-07-03",
        rank: 36
      },
      {
        week: 14,
        grossWeekly: 64350,
        theaterCount: 39,
        theaterAvg: 1650,
        date: "2015-07-10",
        rank: 42
      },
      {
        week: 15,
        grossWeekly: 45344,
        theaterCount: 31,
        theaterAvg: 1463,
        date: "2015-07-17",
        rank: 47
      },
      {
        week: 16,
        grossWeekly: 19380,
        theaterCount: 19,
        theaterAvg: 1020,
        date: "2015-07-24",
        rank: 56
      },
      {
        week: 17,
        grossWeekly: 15952,
        theaterCount: 17,
        theaterAvg: 938,
        date: "2015-07-31",
        rank: 61
      },
      {
        week: 18,
        grossWeekly: 11938,
        theaterCount: 10,
        theaterAvg: 1194,
        date: "2015-08-07",
        rank: 66
      },
      {
        week: 19,
        grossWeekly: 7632,
        theaterCount: 5,
        theaterAvg: 1526,
        date: "2015-08-14",
        rank: 73
      },
      {
        week: 20,
        grossWeekly: 6272,
        theaterCount: 4,
        theaterAvg: 1568,
        date: "2015-08-21",
        rank: 81
      },
      {
        week: 21,
        grossWeekly: 5677,
        theaterCount: 5,
        theaterAvg: 1135,
        date: "2015-08-28",
        rank: 83
      }
    ],
    type: "iceberg"
  },
  {
    title: "Far from the Madding Crowd",
    studio: "FoxS",
    firstWeek: "2015-18",
    maxRank: 7,
    maxGross: 12236500,
    coordinates: [
      {
        week: 1,
        grossWeekly: 240160,
        theaterCount: 10,
        theaterAvg: 24016,
        date: "2015-05-01",
        rank: 24
      },
      {
        week: 2,
        grossWeekly: 1090487,
        theaterCount: 99,
        theaterAvg: 11015,
        date: "2015-05-08",
        rank: 15
      },
      {
        week: 3,
        grossWeekly: 1831958,
        theaterCount: 289,
        theaterAvg: 6339,
        date: "2015-05-15",
        rank: 10
      },
      {
        week: 4,
        grossWeekly: 3779833,
        theaterCount: 865,
        theaterAvg: 4370,
        date: "2015-05-22",
        rank: 7
      },
      {
        week: 5,
        grossWeekly: 2246233,
        theaterCount: 902,
        theaterAvg: 2490,
        date: "2015-05-29",
        rank: 9
      },
      {
        week: 6,
        grossWeekly: 1129007,
        theaterCount: 610,
        theaterAvg: 1851,
        date: "2015-06-05",
        rank: 14
      },
      {
        week: 7,
        grossWeekly: 701207,
        theaterCount: 366,
        theaterAvg: 1916,
        date: "2015-06-12",
        rank: 17
      },
      {
        week: 8,
        grossWeekly: 430870,
        theaterCount: 256,
        theaterAvg: 1683,
        date: "2015-06-19",
        rank: 20
      },
      {
        week: 9,
        grossWeekly: 270977,
        theaterCount: 122,
        theaterAvg: 2221,
        date: "2015-06-26",
        rank: 24
      },
      {
        week: 10,
        grossWeekly: 195483,
        theaterCount: 105,
        theaterAvg: 1862,
        date: "2015-07-03",
        rank: 28
      },
      {
        week: 11,
        grossWeekly: 138071,
        theaterCount: 98,
        theaterAvg: 1409,
        date: "2015-07-10",
        rank: 30
      },
      {
        week: 12,
        grossWeekly: 86393,
        theaterCount: 74,
        theaterAvg: 1167,
        date: "2015-07-17",
        rank: 39
      },
      {
        week: 13,
        grossWeekly: 52821,
        theaterCount: 47,
        theaterAvg: 1124,
        date: "2015-07-24",
        rank: 42
      },
      {
        week: 14,
        grossWeekly: 25708,
        theaterCount: 27,
        theaterAvg: 952,
        date: "2015-07-31",
        rank: 58
      },
      {
        week: 15,
        grossWeekly: 17292,
        theaterCount: 18,
        theaterAvg: 961,
        date: "2015-08-07",
        rank: 60
      }
    ],
    type: "iceberg"
  }
]

const colorHash = {
  "Ex Machina": "#4d430c",
  "Far from the Madding Crowd": "#b6a756"
}

components.push({
  name: "Creating Cross Highlights"
})

export default class CreatingLineChart extends React.Component {
  constructor(props) {
    super(props)
    this.hoverBehavior = this.hoverBehavior.bind(this)
    this.state = {
      hoverPoint: undefined,
      brushChart: "stackedpercent",
      annotations: []
    }
  }

  hoverBehavior = d => {
    if (d) {
      this.setState({
        annotations: [
          {
            type: "highlight",
            ...d,
            style: { fill: "red", stroke: "red", strokeWidth: 2 }
          }
        ]
      })
    } else {
      this.setState({
        annotations: []
      })
    }
  }

  lineAnnotater({ d, xScale, yScale }) {
    if (!d.type === "highlight") return null

    return (
      <circle
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
      name: "Highlight Annotation Type",
      demo: (
        <div>
          <p>
            There is a built-in annotation type "highlight" that you can use in
            your annotations or pass in your hoverAnnotation array. In XYFrame
            it uses the function in lineIDAccessor to evaluate what objects to
            highlight and will render that shape (or shapes) in the
            AnnotationLayer with style and class defined by the annotation.
            Style can be a React style object or function returning a React
            style object and class can be a string or function returning a
            string. All highlight annotations created in the annotation layer
            will always have "highlight-annotation" class in addition to any
            passed classes.
          </p>
          <p>Move your mouse over the chart to see the region highlighted.</p>
          <XYFrame
            size={[650, 400]}
            lines={movies}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            lineType={"line"}
            lineStyle={d => ({
              fill: "none",
              stroke: colorHash[d.title]
            })}
            margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
            axes={[
              {
                orient: "left",
                tickFormat: d => d
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                ticks: 5
              }
            ]}
            svgAnnotationRules={this.makeLines}
            hoverAnnotation={[
              {
                type: "highlight",
                style: { fill: "red", strokeWidth: 3 }
              }
            ]}
            lineIDAccessor={d => d.title}
          />
        </div>
      ),
      source: `<XYFrame
      size={[650, 400]}
      lines={movies}
      xScaleType={scaleTime()}
      xAccessor={d => new Date(d.date)}
      yAccessor={"grossWeekly"}
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
          tickFormat: d => d
        },
        {
          orient: "bottom",
          tickFormat: d => ${"`${d.getMonth()}/${d.getDate()}`,"}
          ticks: 5
        }
      ]}
      svgAnnotationRules={this.makeLines}
      hoverAnnotation={[
        {
          type: "highlight",
          style: { fill: "red", stroke: "orange", strokeWidth: 3 }
        }
      ]}
      lineIDAccessor={d => d.title}
    />`
    })

    examples.push({
      name: "Dynamic Styles",
      demo: (
        <div>
          <p>
            The annotation honors a style prop that can be a React style object
            or a function that returns a React style object and evaluates the
            annotation. Because dynamically produced hover annotations are
            generated with the hover item's data, this lets you create custom
            styles. This also passes a frame-hover to the hoverAnnotation
            settings, showing off the ability to pass multiple annotation types
            to hoverAnnotation. Nothing else is changed from the previous
            example.
          </p>
          <XYFrame
            size={[650, 400]}
            lines={movies}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
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
                tickFormat: d => d
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                ticks: 5
              }
            ]}
            hoverAnnotation={[
              { type: "frame-hover" },
              {
                type: "highlight",
                style: d => ({
                  fill: d.title === "Ex Machina" ? "blue" : "purple",
                  stroke: "orange",
                  strokeWidth: 3
                })
              }
            ]}
            lineIDAccessor={d => d.title}
          />
        </div>
      ),
      source: `hoverAnnotation={[
        { type: "frame-hover" },
        {
          type: "highlight",
          style: d => ({
            fill: d.title === "Ex Machina" ? "blue" : "purple",
            stroke: "orange",
            strokeWidth: 3
          })
        }
      ]}`
    })

    examples.push({
      name: "Cross-Highlighting",
      demo: (
        <div>
          <p>
            Frames have custom interaction using customHoverBehavior,
            customClickBehavior and customDoubleClickBehavior. You can use these
            to take the value of the hovered or clicked item and pass a
            highlight annotation made from that data object to the annotations
            property of another frame to achieve cross-highlighting. These two
            frames have different sizes and different lineTypes but otherwise
            the only change is in the
          </p>
          <div>
            <div style={{ display: "inline-block", width: "350px" }}>
              <XYFrame
                size={[350, 400]}
                lines={movies}
                xScaleType={scaleTime()}
                xAccessor={d => new Date(d.date)}
                yAccessor={"grossWeekly"}
                lineType={{
                  type: "line",
                  interpolator: curveMonotoneX
                }}
                lineStyle={d => ({
                  stroke: colorHash[d.title]
                })}
                margin={{ left: 50, bottom: 50, right: 10, top: 40 }}
                axes={[
                  {
                    orient: "left",
                    tickFormat: d => `${d / 1000000}m`
                  },
                  {
                    orient: "bottom",
                    tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                    ticks: 5
                  }
                ]}
                annotations={this.state.annotations}
                customHoverBehavior={this.hoverBehavior}
                hoverAnnotation={true}
                lineIDAccessor={d => d.title}
                canvasLines={true}
              />
            </div>
            <div style={{ display: "inline-block", width: "350px" }}>
              <XYFrame
                size={[350, 400]}
                lines={movies}
                xScaleType={scaleTime()}
                xAccessor={d => new Date(d.date)}
                yAccessor={"grossWeekly"}
                lineType={{
                  type: "stackedpercent",
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
                        : d => `${d / 1000000}m`
                  },
                  {
                    orient: "bottom",
                    tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                    ticks: 5
                  }
                ]}
                annotations={this.state.annotations}
                customHoverBehavior={this.hoverBehavior}
                hoverAnnotation={true}
                lineIDAccessor={d => d.title}
                canvasLines={true}
              />
            </div>
          </div>
        </div>
      ),
      source: `hoverBehavior = d => {
  if (d) {
    this.setState({
      annotations: [
        {
          type: "highlight",
          ...d,
          style: { fill: "red", stroke: "red", strokeWidth: 2 }
        }
      ]
    })
  } else {
    this.setState({
      annotations: []
    })
  }
}
      
<XYFrame
  {...earlierSettings}
  annotations={this.state.annotations}
  customHoverBehavior={this.hoverBehavior}
/>`
    })

    examples.push({
      name: "Point and Area Highlighting",
      demo: (
        <div>
          <p>
            Highlight annotations will return all points, lines and areas that
            match the id value of the passed highlight. This can be used to
            highlight multiple shapes if your lineIDAccessor is sophisticated
            (or simple) enough. Here I check in lineIDAccessor not only for
            title but if the object has a parentLine (indicating a point
            generated by showLinePoints) to match against the parentLine title
            value.
          </p>
          <XYFrame
            size={[700, 400]}
            lines={movies}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.date)}
            yAccessor={"grossWeekly"}
            yExtent={{
              extent: this.state.extent,
              onChange: e => this.setState({ yMax: e[1] })
            }}
            lineType={{
              type: "linepercent",
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
                    : d => `${d / 1000000}m`
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`,
                ticks: 5
              }
            ]}
            hoverAnnotation={{
              type: "highlight",
              style: d => ({
                fill:
                  d.parentLine && d.parentLine.title === "Ex Machina"
                    ? "blue"
                    : "purple",
                stroke: d.parentLine ? "darkred" : "orange",
                strokeWidth: 3
              })
            }}
            lineIDAccessor={d =>
              (d.parentLine && d.parentLine.title) || d.title
            }
            showLinePoints={true}
            pointStyle={{ fill: "none" }}
          />
        </div>
      ),
      source: `hoverAnnotation={{
  type: "highlight",
  style: d => ({
    fill: d.title === "Ex Machina" ? "blue" : "purple",
    stroke: "orange",
    strokeWidth: 3
  })
}}
lineIDAccessor={d =>
  (d.parentLine && d.parentLine.title) || d.title
}`
    })

    examples.push({
      name: "OrdinalFrame Highlighting",
      demo: (
        <div>
          <p>
            OrdinalFrames get highlighting, too. The second example uses classes
            with a defined gradient in CSS. Unlike in XYFrame, there's already
            one built-in id accessor in OrdinalFrame: oAccessor, additionally if
            you define a pieceIDAccessor you can use that to highlight
            individual pieces (this is the same property used to annotate
            specific pieces with other OrdinalFrame annotatinos). Without a
            pieceIDAccessor defined, all items in a column/row will be
            highlighted.
          </p>
          <p>
            Highlighting is not available for custom graphics or summary
            graphics.
          </p>
          <OrdinalFrame
            size={[600, 400]}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={d => ({ fill: barColorHash[d.action] })}
            type={"bar"}
            oPadding={5}
            pieceHoverAnnotation={[
              { type: "highlight", style: { fill: "red" } }
            ]}
            pieceIDAccessor="action"
            margin={10}
          />
          <OrdinalFrame
            size={[600, 400]}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={d => ({ fill: barColorHash[d.action] })}
            type={"bar"}
            oPadding={5}
            pieceHoverAnnotation={[
              {
                type: "highlight",
                class: d =>
                  d.action === "tweets" ? "purple-gradient" : "blue-gradient"
              }
            ]}
            pieceIDAccessor="action"
            margin={10}
            additionalDefs={[
              <linearGradient
                x1="0"
                x2="0"
                y1="0"
                y2="1"
                key="purple-gradient"
                id="purple-gradient"
              >
                <stop offset="5%" stopColor="#005aa7" />
                <stop offset="95%" stopColor="#fffde4" />
              </linearGradient>,
              <linearGradient
                x1="0"
                x2="0"
                y1="0"
                y2="1"
                key="blue-gradient"
                id="blue-gradient"
              >
                <stop offset="5%" stopColor="#fc466b" />
                <stop offset="95%" stopColor="#3f5efb" />
              </linearGradient>
            ]}
          />
          <OrdinalFrame
            size={[600, 400]}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={d => ({ fill: barColorHash[d.action] })}
            type={"point"}
            oPadding={5}
            pieceHoverAnnotation={[
              {
                type: "highlight",
                style: d => ({
                  fill: d.action === "tweets" ? "purple" : "blue"
                })
              }
            ]}
            pieceIDAccessor="action"
            margin={10}
          />
        </div>
      ),
      source: `<OrdinalFrame
  size={[600, 400]}
  data={inflatedBarChartData}
  oAccessor={"user"}
  rAccessor={"value"}
  style={d => ({ fill: barColorHash[d.action] })}
  type={"bar"}
  oPadding={5}
  pieceHoverAnnotation={[
    {
      type: "highlight",
      class: d =>
        d.action === "tweets" ? "purple-gradient" : "blue-gradient"
    }
  ]}
  pieceIDAccessor="action"
  margin={10}
  additionalDefs={[
    <linearGradient
      x1="0"
      x2="0"
      y1="0"
      y2="1"
      key="purple-gradient"
      id="purple-gradient"
    >
      <stop offset="5%" stopColor="#005aa7" />
      <stop offset="95%" stopColor="#fffde4" />
    </linearGradient>,
    <linearGradient
      x1="0"
      x2="0"
      y1="0"
      y2="1"
      key="blue-gradient"
      id="blue-gradient"
    >
      <stop offset="5%" stopColor="#fc466b" />
      <stop offset="95%" stopColor="#3f5efb" />
    </linearGradient>
  ]}
/>`
    })

    examples.push({
      name: "Highlighting across categories",
      demo: (
        <div>
          <p>
            You don't have to send annotations with valid oAccessor or
            pieceIDAccessor traits. If you do, they will highlight all the
            pieces that satisfy the one you do send. This example has two
            annotations sent that highlight all the pieces in one column as well
            as all pieces of a certain type across all four columns.
          </p>
          <OrdinalFrame
            size={[600, 400]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={["tweets", "favorites", "retweets"]}
            style={d => ({
              fill: barColorHash[["tweets", "favorites", "retweets"][d.rIndex]]
            })}
            type={"clusterbar"}
            oPadding={5}
            pieceHoverAnnotation={[
              {
                type: "highlight",
                style: d => ({
                  fill: d.rIndex === 1 ? "purple" : "blue"
                })
              }
            ]}
            annotations={[
              {
                type: "highlight",
                user: "Betty",
                style: { fill: "red", stroke: "none" }
              },
              {
                type: "highlight",
                rIndex: 1,
                style: { fill: "none", stroke: "violet", strokeWidth: 5 }
              }
            ]}
            pieceIDAccessor="rIndex"
            margin={10}
          />
        </div>
      ),
      source: `<OrdinalFrame
  size={[600, 400]}
  data={inflatedBarChartData}
  oAccessor={"user"}
  rAccessor={"value"}
  style={d => ({ fill: barColorHash[d.action] })}
  type={"clusterbar"}
  oPadding={5}
  pieceHoverAnnotation={[
    {
      type: "highlight",
      style: d => ({
        fill: d.action === "tweets" ? "purple" : "blue"
      })
    }
  ]}
  annotations={[
    {
      type: "highlight",
      user: "Betty",
      style: { fill: "red", stroke: "none" }
    },
    {
      type: "highlight",
      action: "tweets",
      style: { fill: "none", stroke: "purple", strokeWidth: 5 }
    }
  ]}
  pieceIDAccessor="action"
  margin={10}
/>`
    })

    examples.push({
      name: "Scatterplot Highlighting",
      demo: (
        <div>
          <p>Scatterplot highlighting works the same way.</p>
          <XYFrame
            size={[500, 500]}
            points={somePoints}
            xAccessor={"x"}
            yAccessor={"y"}
            pointStyle={{ fill: "red" }}
            margin={10}
            hoverAnnotation={[{ type: "highlight" }]}
            lineIDAccessor={d => d.category}
          />
        </div>
      ),
      source: `<XYFrame
      size={[500, 500]}
      points={somePoints}
      xAccessor={"x"}
      yAccessor={"y"}
      pointStyle={{ fill: "red" }}
      margin={10}
      hoverAnnotation={[{ type: "highlight" }]}
      lineIDAccessor={d => d.category}
    />`
    })

    return (
      <DocumentComponent
        name="Creating Cross Highlights"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          How to use the highlight annotation type on its own to highlight a
          hovered item or in tandem to achieve cross-highlighting. Move your
          mouse over things.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingLineChart.title = "Creating Cross Highlights"
