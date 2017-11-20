import React from "react";
import { ORFrame } from "../../components";

export default (data, event, resetExtent) => (
  <div style={{ marginTop: "50px" }}>
    <ORFrame
      size={[700, 200]}
      data={data}
      rAccessor={d => d.value}
      oAccessor={() => "singleColumn"}
      style={(d, i) => ({ fill: "#007190", stroke: "white", strokeWidth: 1 })}
      type={"swarm"}
      summaryType={"violin"}
      summaryStyle={(d, i) => ({
        fill: "#007190",
        stroke: "white",
        strokeWidth: 1
      })}
      projection={"horizontal"}
      axis={{ orient: "left" }}
      rExtent={[0, 100]}
      margin={{ left: 20, top: 0, bottom: 50, right: 20 }}
      oPadding={0}
      interaction={{
        columnsBrush: true,
        extent: { singleColumn: resetExtent },
        end: event
      }}
    />
  </div>
);
