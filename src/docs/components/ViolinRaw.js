import React from "react";
import { summaryChart } from "../example_settings/orframe";
import { ORFrame } from "../../components";
import { max } from "d3-array";

const axis = {
  orient: "left",
  tickFormat: d => d,
  label: {
    name: "axis label",
    position: { anchor: "middle" },
    locationDistance: 40
  }
};

export default (
  <ORFrame
    size={[700, 600]}
    axis={axis}
    {...summaryChart}
    margin={{ top: 75, bottom: 50, left: 60, right: 50 }}
    dynamicColumnWidth={d => max(d.map(p => p.stepValue))}
    annotations={[
      {
        type: "category",
        categories: ["January", "February", "March"],
        label: "Q1",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["April", "May", "June"],
        label: "Q2",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["July", "August", "September"],
        label: "Q3",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: ["October", "November", "December"],
        label: "Q4",
        position: "top",
        offset: 15,
        depth: 10,
        padding: 0
      },
      {
        type: "category",
        categories: [
          "July",
          "August",
          "September",
          "October",
          "November",
          "December"
        ],
        label: "Latter Half",
        position: "top",
        offset: 45,
        depth: 10,
        padding: 0
      }
    ]}
  />
);
