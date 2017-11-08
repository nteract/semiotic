import React from "react";
import { data, fieldGraphic } from "../sampledata/stanton";
import { XYFrame } from "../../components";
import { scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import { Mark } from "semiotic-mark";

const groupedData = [];
const groupHash = {};
const colors = ["#00a2ce", "#b3331d", "rgb(77, 67, 12)", "rgb(182, 167, 86)"];

const velocityExtent = extent(data.map(d => d.exit_velocity));
const velocityScale = scaleLinear()
  .domain(velocityExtent)
  .range(["#00a2ce", "#b3331d"]);

export default mode => (
  <XYFrame
    size={[500, 500]}
    points={data}
    xAccessor={d => d.bx}
    yAccessor={d => d.by}
    yExtent={[-50]}
    customPointMark={d => <Mark markType="circle" r={5} />}
    pointStyle={d => ({
      stroke: "black",
      fill: velocityScale(d.exit_velocity)
    })}
    areas={[{ label: "stanton", coordinates: data }]}
    hoverAnnotation={true}
    tooltipContent={d => (
      <div className="tooltip-content">
        <p>Date: {d.game_date}</p>
        <p>Distance: {d.distance}</p>
        <p>Velocity: {d.exit_velocity}</p>
      </div>
    )}
    margin={{ left: 25, right: 25, top: 25, bottom: 25 }}
    backgroundGraphics={fieldGraphic}
    {...mode}
  />
);
