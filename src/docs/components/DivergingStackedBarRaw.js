import React from "react";
import { answers } from "../sampledata/questions";
import { ORFrame } from "../../components";

export default (
  <ORFrame
    size={[700, 500]}
    data={answers}
    type="bar"
    projection="horizontal"
    oAccessor={"question"}
    rAccessor={"percent"}
    style={d => ({ fill: d.color })}
    margin={{ top: 30, bottom: 0, left: 80, right: 50 }}
    oPadding={20}
    oLabel={true}
    axis={{
      orient: "top",
      tickValues: [-0.3, -0.15, 0, 0.2, 0.4, 0.6, 0.8, 1]
    }}
  />
);
