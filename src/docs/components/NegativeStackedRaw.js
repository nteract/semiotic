import React from "react";
import { XYFrame } from "../../components";

const dataSeeds = [50, 30, 10, -10, -30, -50];
const colors = [
  "4d430c",
  "#d38779",
  "#b3331d",
  "#00a2ce",
  "#007190",
  "#b6a756"
];

function generatePoints(start, number) {
  const arrayOfPoints = [];
  let currentValue = start;
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue });
    currentValue += Math.random() * 20 - 10;
  }
  return arrayOfPoints;
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: colors[i],
    coordinates: generatePoints(s, 40)
  };
});

const lineStyle = {
  fill: "#007190",
  stroke: "#007190",
  strokeWidth: 1
};

export default (
  <div style={{ marginTop: "50px" }}>
    <XYFrame
      size={[700, 700]}
      lines={generatedData}
      lineType="stackedarea"
      xAccessor={"step"}
      yAccessor="value"
      lineStyle={d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 })}
      axes={[
        { orient: "left" },
        {
          orient: "bottom",
          ticks: 6
        }
      ]}
      margin={{ left: 50, top: 10, bottom: 50, right: 20 }}
    />
  </div>
);
