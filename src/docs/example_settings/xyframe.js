import React from "react";
import { xyframe_data } from "../sampledata/nyc_temp";
import { quantile } from "d3-array";
import { DividedLine } from "../../components";

import { Mark } from "semiotic-mark";
import { scaleLinear } from "d3-scale";
import { AnnotationCalloutElbow } from "react-annotation";
import { curveMonotoneX, line } from "d3-shape";

const blue = "rgb(0, 162, 206)";
const red = "rgb(179, 51, 29)";

//const opacityScale = scaleLinear().domain([0, 148]).range([0.1, 1])
const opacityScale = scaleLinear()
  .domain([1869, 2017])
  .range([0.1, 1]);

const processedNYCTemp = xyframe_data;

const monthHash = {};
const lines = [];
const bounds = { label: "boundingRegion", bounding: [], coordinates: [] };
processedNYCTemp.forEach(d => {
  const line = { label: d.year, average: d.Annual, coordinates: [] };
  lines.push(line);
  Object.keys(d).forEach(k => {
    if (k !== "year" && k !== "Annual") {
      if (!monthHash[k]) {
        monthHash[k] = [];
      }
      monthHash[k].push(d[k]);
      line.coordinates.push({
        value: d[k],
        step: line.coordinates.length,
        year: d.year
      });
    }
  });
});

Object.keys(monthHash).forEach(key => {
  const values = monthHash[key].sort((a, b) => b - a);

  const topVal = quantile(values, 0.05);
  const bottomVal = quantile(values, 0.95);
  const medianVal = quantile(values, 0.5);
  bounds.bounding.push({
    top: topVal,
    bottom: bottomVal,
    step: bounds.bounding.length,
    median: medianVal
  });
});

lines.forEach(line => {
  line.coordinates.forEach(point => {
    const thisBound = bounds.bounding[point.step];
    point.top = thisBound.top;
    point.bottom = thisBound.bottom;
    point.delta = point.value - thisBound.median;
    point.topDelta = thisBound.top - thisBound.median;
    point.bottomDelta = thisBound.bottom - thisBound.median;
  });
});

bounds.coordinates = [
  ...bounds.bounding.map(d => ({
    value: d.top,
    delta: d.top - d.median,
    step: d.step
  })),
  ...bounds.bounding
    .map(d => ({ value: d.bottom, delta: d.bottom - d.median, step: d.step }))
    .sort((a, b) => b.step - a.step)
];

const borderCutLine = ({ d, i, xScale, yScale }) => {
  const lineOpacity = opacityScale(d.label);

  return (
    <DividedLine
      key={`regionated-line-${i}`}
      data={[d]}
      parameters={(p, q) => {
        //    if (p.value < p.bottom) {
        if (p.delta < p.bottomDelta) {
          return {
            stroke: blue,
            strokeWidth: 1,
            fill: "none",
            strokeOpacity: lineOpacity
          };
        }
        //    if (p.value > p.top) {
        if (p.delta > p.topDelta) {
          return {
            stroke: red,
            strokeWidth: 1,
            fill: "none",
            strokeOpacity: lineOpacity
          };
        }
        return { fill: "none", stroke: "gray", strokeOpacity: lineOpacity / 4 };
      }}
      searchIterations={20}
      customAccessors={{ x: d => xScale(d._xyfX), y: d => yScale(d._xyfY) }}
      forceUpdate={true}
      lineDataAccessor={d => d.data}
      interpolate={curveMonotoneX}
    />
  );
};
const monthNameHash = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const degreeDiffFormat = d => `${d > 0 ? "+" : ""}${Math.ceil(d * 100) / 100}°`;
const monthNameFormat = (d, i) => monthNameHash[d];

const lineAnnotater = ({ d, xScale, yScale }) => {
  if (!d.parentLine) {
    return null;
  }
  const lineRenderer = line()
    .x(d => xScale(d._xyfX))
    .y(d => yScale(d._xyfY))
    .curve(curveMonotoneX);

  return d.coincidentPoints.map((p, q) => {
    if (!p.parentLine) {
      return null;
    }
    const lineD = lineRenderer(p.parentLine.data);
    const opacity = opacityScale(p.parentLine.label);
    return (
      <path
        key={`hover-line-${q}`}
        d={lineD}
        style={{
          fill: "none",
          stroke: "black",
          strokeWidth: 3,
          strokeOpacity: opacity
        }}
      />
    );
  });
};

const pointsAtThisPoint = ({ d, lines, xScale, yScale }) => {
  if (d && d._xyfX) {
    const thesePoints = lines.map(line => {
      return line.data.find(p => p._xyfX === d._xyfX);
    });

    return thesePoints.map(p => {
      const fill =
        p.delta < p.bottomDelta ? blue : p.delta > p.topDelta ? red : "#E1E1E1";
      return (
        <circle
          r={2}
          style={{ fill }}
          cx={xScale(p._xyfX)}
          cy={yScale(p._xyfY)}
        />
      );
    });
  }
  return null;
};

export const regionatedLineChart = {
  title: "Monthly Temperature in New York Since 1869",
  size: [720, 500],
  lines,
  xAccessor: d => d.step,
  axes: [
    {
      orient: "left",
      tickFormat: degreeDiffFormat,
      label: "Difference in monthly temperature from median"
    },
    { orient: "bottom", rotate: 45, tickFormat: monthNameFormat }
  ],
  //    yAccessor: d => d.value,
  yAccessor: d => d.delta,
  margin: { top: 35, right: 30, left: 60, bottom: 50 },
  customLineMark: borderCutLine,
  customPointMark: d => <Mark markType="circle" r={0} />,
  showLinePoints: true,
  //    pointStyle: (d,i) => ({ stroke: d.value < bounds.bounding[d.step].bottom ? blue : d.value > bounds.bounding[d.step].top ? red : "none", fill: "none", strokeWidth: "1px", strokeOpacity: 0.1 }),
  pointStyle: (d, i) => ({
    stroke:
      d.delta < d.bottomDelta ? blue : d.delta > d.topDelta ? red : "none",
    fill: d.delta < d.bottomDelta ? blue : d.delta > d.topDelta ? red : "none",
    strokeWidth: "1px",
    strokeOpacity: 0.1
  }),
  areaStyle: () => ({
    fillOpacity: 0.15,
    fill: "#E1E1E1",
    stroke: "#838383",
    strokeWidth: "1.5px",
    strokeDasharray: "2 4"
  }),
  areas: [bounds],
  areaDataAccessor: d => d.coordinates,
  annotations: [
    {
      type: AnnotationCalloutElbow,
      connector: { end: "dot" },
      dx: -100,
      dy: 0,
      step: 6,
      value: 79,
      delta: 1.2,
      label: "Summer of Sam"
    }
  ],
  dataVersion: "fixed",
  tooltipContent: d => (
    <div className="tooltip-content">
      <h2 style={{ marginTop: "10px" }}>
        {d.coincidentPoints.map(d => d.year).join(",")}
      </h2>
      <h3 style={{ marginTop: "10px" }}>{d.step}</h3>
      <p>{d.value}°</p>
      <p>{degreeDiffFormat(d.delta)} from median</p>
    </div>
  ),
  svgAnnotationRules: lineAnnotater,
  //    svgAnnotationRules: pointsAtThisPoint,
  hoverAnnotation: true
};

export const testData = [
  {
    id: "linedata-1",
    color: "#00a2ce",
    data: [
      { py: 500, px: 1 },
      { py: 700, px: 2 },
      { py: 0, px: 3 },
      { py: 0, px: 4 },
      { py: 200, px: 5 },
      { py: 300, px: 6 },
      { py: 500, px: 7 }
    ]
  },
  {
    id: "linedata-2",
    color: "#4d430c",
    data: [
      { py: 100, px: 1 },
      { py: 700, px: 2 },
      { py: 800, px: 3 },
      { py: 600, px: 4 },
      { py: 0, px: 5 },
      { py: 0, px: 6 },
      { py: 0, px: 7 }
    ]
  },
  {
    id: "linedata-3",
    color: "#b3331d",
    data: [
      { py: 1000, px: 1 },
      { py: 800, px: 2 },
      { py: 200, px: 3 },
      { py: 300, px: 4 },
      { py: 300, px: 5 },
      { py: 400, px: 6 },
      { py: 400, px: 7 }
    ]
  },
  {
    id: "linedata-4",
    color: "#b6a756",
    data: [
      { py: 600, px: 1 },
      { py: 700, px: 2 },
      { py: 300, px: 3 },
      { py: 500, px: 4 },
      { py: 600, px: 5 },
      { py: 600, px: 6 },
      { py: 600, px: 7 }
    ]
  }
];
