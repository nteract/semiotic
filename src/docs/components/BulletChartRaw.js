import React from "react";
import { ORFrame, Mark } from "../../components";

const padding = 40;
const bulletData = [
  {
    title: "Revenue",
    subtitle: "US$, in thousands",
    ranges: [150, 225, 300],
    measures: [220, 270],
    markers: [250]
  },
  {
    title: "Profit",
    subtitle: "%",
    ranges: [20, 25, 30],
    measures: [21, 23],
    markers: [26]
  },
  {
    title: "Order Size",
    subtitle: "US$, average",
    ranges: [350, 500, 600],
    measures: [100, 320],
    markers: [550]
  },
  {
    title: "New Customers",
    subtitle: "count",
    ranges: [1400, 2000, 2500],
    measures: [1000, 1650],
    markers: [2100]
  },
  {
    title: "Satisfaction",
    subtitle: "out of 5",
    ranges: [3.5, 4.25, 5],
    measures: [3.2, 4.7],
    markers: [4.4]
  }
];

//type, data, renderMode, eventListenersGenerator, styleFn, projection, classFn, adjustedSize, margin, rScale
function generateBulletChart({ data, rScale, adjustedSize, margin }) {
  const rangeColors = ["eee", "ddd", "ccc"];
  const measureColors = ["rgb(0, 162, 206)", "rgb(0, 113, 144)"];
  const markerColors = ["black"];

  const colorHash = {
    range: rangeColors,
    measure: measureColors,
    marker: markerColors
  };

  const colorStepHash = {
    range: 0,
    measure: 0,
    marker: 0
  };

  const widthHash = {
    range: 1,
    measure: 0.5
  };
  const opacityHash = {
    range: 0.25,
    measure: 0.25
  };
  const renderedPieces = [];

  // Each chart is a separate ORFrame with a single column called "fixed"
  const column = data.fixed;
  column.pieceData.forEach((d, i) => {
    let pieceShape = {
      key: `bullet-piece-${i}`,
      style: {
        fill: colorHash[d.class][colorStepHash[d.class]],
        stroke: colorHash[d.class][colorStepHash[d.class]]
      }
    };
    colorStepHash[d.class] += 1;
    const valuePosition = rScale(d.value);
    if (d.class === "marker") {
      pieceShape.markType = "line";
      pieceShape.x1 = valuePosition;
      pieceShape.x2 = valuePosition;
      pieceShape.y1 = column.x;
      pieceShape.y2 = column.x + column.width;
    } else {
      //a rectangle
      const pieceSize = column.width * widthHash[d.class];
      pieceShape.markType = "rect";
      pieceShape.x = margin.left;
      pieceShape.y = column.middle - pieceSize / 2;
      pieceShape.width = valuePosition - margin.left;
      pieceShape.height = pieceSize;
    }

    //A type render function should return an object with the column name "o", the data for the original element "piece", an object with properties to be spread in a <Mark> "renderElement" and the hover coordinates for pieceHoverAnnotation "xy"
    const markObject = {
      o: "fixed",
      piece: d,
      renderElement: pieceShape,
      xy: {
        x: valuePosition,
        y: column.x + column.width / 2
      }
    };

    renderedPieces.push(markObject);
  });

  return renderedPieces;
}

export default (
  <div style={{ marginTop: "60px" }}>
    {bulletData.map(data => {
      const bulletRanges = data.ranges
        .map(p => ({ class: "range", value: p }))
        .sort((a, b) => b.value - a.value);
      const bulletMeasures = data.measures
        .map(p => ({
          class: "measure",
          value: p
        }))
        .sort((a, b) => b.value - a.value);
      const bulletMarkers = data.markers
        .map(p => ({ class: "marker", value: p }))
        .sort((a, b) => b.value - a.value);
      return (
        <ORFrame
          size={[700, 100]}
          data={[...bulletRanges, ...bulletMeasures, ...bulletMarkers]}
          rAccessor={d => d.value}
          rExtent={[0, undefined]}
          oAccessor={() => "fixed"}
          projection={"horizontal"}
          axis={{ orient: "bottom", ticks: 6, footer: true }}
          style={d => ({
            fill: d.value > 0 ? "green" : "red",
            stroke: "darkgray",
            strokeWidth: 1
          })}
          type={generateBulletChart}
          oLabel={() => (
            <g>
              <text style={{ textAnchor: "end" }}>{data.title}</text>
              <text y={18} style={{ textAnchor: "end", fill: "darkgray" }}>
                {data.subtitle}
              </text>
            </g>
          )}
          tooltipContent={d => (
            <div className="tooltip-content">
              <p>{d.class}</p>
              <p>{d.value}</p>
            </div>
          )}
          margin={{ left: 130, top: 10, bottom: 40, right: 20 }}
          oPadding={0}
          pieceHoverAnnotation={true}
        />
      );
    })}
  </div>
);
