import React from "react";
import { XYFrame } from "../../components";
import { scaleTime } from "d3-scale";
import { curveMonotoneX, curveCardinal } from "d3-shape";

import DocumentComponent from "../layout/DocumentComponent";

const components = [];
const curvedCardinalLine = { type: "line", interpolator: curveCardinal };
const interactiveLineStyle = { stroke: "#00a2ce" };
const interactivePointStyle = () => ({
  fill: "#00a2ce"
});
const interactiveXAccessor = d => d.week;
const interactiveYAccessor = d => d.grossWeekly;

const interactiveChartMargin = { left: 80, bottom: 50, right: 10, top: 40 };
const interactiveChartAxes = [
  {
    orient: "left"
  },
  {
    orient: "bottom"
  }
];
const chartSize = [700, 400];

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
];

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const colorHash = {
  "Ex Machina": "#4d430c",
  "Far from the Madding Crowd": "#b6a756"
};

components.push({
  name: "Creating a Line Chart"
});

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
    const examples = [];
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
    });

    examples.push({
      name: "Simple",
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
          />`
    });

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
    });

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
              this.state.hoverPoint ? (
                [Object.assign({}, this.state.hoverPoint, { type: "hover" })]
              ) : (
                undefined
              )
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
    });

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
    });

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
                tickFormat: d => d / 1000000 + "m"
              },
              {
                orient: "bottom",
                tickFormat: d => d.getMonth() + "/" + d.getDate()
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
    });

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
    );
  }
}

CreatingLineChart.title = "Creating a Line Chart";
