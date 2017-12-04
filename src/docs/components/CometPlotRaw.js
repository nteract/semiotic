import React from "react";
import { XYFrame } from "../../components";
import { csvParse } from "d3-dsv";
import { scaleLog, scaleLinear } from "d3-scale";
import { Mark } from "semiotic-mark";
import data from "../sampledata/birthdata.js";
import { d as glyphD } from "d3-glyphedge";
import { AnnotationCalloutCircle } from "react-annotation";
import "../example_settings/comet.css";

const processedData = csvParse(data);
let diff = 0;
processedData.forEach(d => {
  d.endweight = +d.endweight;
  d.startweight = +d.startweight;
  d.endvalue = +d.endvalue;
  d.startvalue = +d.startvalue;
  d.weightDiff = d.endweight - d.startweight;
  if (Math.abs(d.weightDiff) > diff) {
    diff = Math.abs(d.weightDiff);
  }
});

const colorScale = scaleLinear()
  .domain([-diff, 0, diff])
  .range(["orange", "grey", "blue"]);

const widthScale = scaleLinear()
  .domain([-diff, 0, diff])
  .range([5, 1, 5]);

function customCometMark({ d, xScale, yScale }) {
  const edge = {
    source: {
      x: xScale(d.startweight) - xScale(d.endweight),
      y: yScale(d.startvalue) - yScale(d.endvalue)
    },
    target: {
      x: 0,
      y: 0
    }
  };
  const circleSize = widthScale(d.weightDiff);
  return (
    <g>
      <path stroke={"none"} d={glyphD.comet(edge, circleSize)} />
      <circle r={circleSize} />
    </g>
  );
}

const complexTickFormat = tickValue => {
  if (
    tickValue < 6 ||
    (tickValue >= 10 && tickValue <= 50) ||
    (tickValue >= 100 && tickValue <= 500) ||
    tickValue === 900
  ) {
    return tickValue;
  }
  return "";
};

export default (
  <XYFrame
    size={[600, 600]}
    margin={{ left: 50, top: 20, right: 30, bottom: 50 }}
    xScaleType={scaleLog()}
    yScaleType={scaleLog()}
    pointStyle={d => ({ fill: colorScale(d.weightDiff) })}
    customPointMark={customCometMark}
    points={processedData}
    xAccessor={"endweight"}
    yAccessor={"endvalue"}
    xExtent={[500, 1000000]}
    annotations={[
      {
        type: "enclose",
        coordinates: processedData.filter(
          d => d.birthweight === " 2000 - 2499 grams"
        ),
        dx: -100,
        dy: -1,
        label: " 2000 - 2499 grams"
      },
      {
        type: AnnotationCalloutCircle,
        coordinates: processedData.filter(d => d.state === "Georgia"),
        nx: 503,
        ny: 80,
        label: "Georgia",
        subject: { radius: 6, radiusPadding: 2 }
      }
    ]}
    axes={[
      { orient: "left", tickFormat: complexTickFormat },
      {
        orient: "bottom",
        tickFormat: d => (d === 1000000 ? "1m" : d / 1000 + "k"),
        tickValues: [1000, 10000, 100000, 1000000]
      }
    ]}
    tooltipContent={d => (
      <div className="tooltip-content">
        <p>{d.state}</p>
        <p>{d.birthweight}</p>
      </div>
    )}
    hoverAnnotation={true}
  />
);
