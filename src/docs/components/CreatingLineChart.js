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
      { day: "2018-06-26", things: 1 },
      { day: "2018-06-27", things: 2 },
      { day: "2018-06-28", things: 1 },
      { day: "2018-06-29", things: 3 },
      { day: "2018-06-30", things: 5 }
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
            size={[500, 150]}
            responsiveWidth={true}
            lines={flatData}
            xScaleType={scaleTime()}
            xAccessor={d => new Date(d.day)}
            yAccessor={d => d.things}
            lineStyle={{ stroke: "blue", strokeWidth: 3 }}
            lineType={{
              type: "line",
              interpolator: curveCardinal.tension(0.75)
            }}
            hoverAnnotation={true}
            tooltipContent={d => (
              <div className="tooltip-content">
                <div variant="caption">{d.day}</div>
                {d.things} active things
              </div>
            )}
            margin={{ left: 30, bottom: 40, right: 10, top: 13 }}
            axes={[
              {
                orient: "left"
              },
              {
                orient: "bottom",
                tickFormat: d => `${d.getMonth()}/${d.getDate()}`
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
            lineStyle={{ stroke: "#00a2ce", fill: "none" }}
            lineType={{ type: "line", interpolator: curveCardinal }}
            showLinePoints={true}
            pointStyle={() => {
              return { fill: "#00a2ce" }
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
