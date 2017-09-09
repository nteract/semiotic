import React from "react";
import { summaryChart } from "../example_settings/orframe";
import { ORFrame } from "../../components";

const axis = {
  orient: "left",
  tickFormat: d => d,
  label: {
    name: "axis label",
    position: { anchor: "middle" },
    locationDistance: 40
  }
};

export default <ORFrame size={[700, 500]} axis={axis} {...summaryChart} />;
