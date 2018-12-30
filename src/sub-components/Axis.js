import React from "react";
import { Axis } from "semiotic";
import MarkdownPage from "../MarkdownPage";
import MarkdownText from "../MarkdownText";
import { scaleTime, scaleLinear } from "d3-scale";

export default () => {
  return (
    <div>
      <MarkdownText
        text={`

The Axis lets you create a traditional D3 axis that can be labeled and is capable of being brushable.

The tickFormat function can return SVG JSX. Remember if you're using dates and scaleTime that you need to format your dates otherwise they'll defaul to the js .toString() (and very long) version for display.

Data are sent to the data properties with summary types and connector rules determining whether summaries and connectors are drawn.

`}
      />

      <svg style={{ height: "400px", width: "800px" }}>
        <g transform={"translate(100,20)"}>
          <Axis
            size={[200, 200]}
            scale={scaleLinear()
              .domain([10, 1000])
              .range([200, 0])}
            orient={"left"}
            label={"dynamicLabelPosition={true}"}
            dynamicLabelPosition
          />
        </g>
        <g transform={"translate(400,20)"}>
          <Axis
            size={[200, 200]}
            scale={scaleTime()
              .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
              .range([0, 200])}
            orient={"bottom"}
            tickFormat={d => `${d.getMonth()}-${d.getDate()}`}
            label={"Format Your Dates"}
          />
        </g>
        <g transform={"translate(100,320)"}>
          <Axis
            size={[200, 200]}
            scale={scaleLinear()
              .domain([10, 1000])
              .range([200, 0])}
            orient={"left"}
            label={"Custom tickLineGenerator"}
            tickLineGenerator={({ xy }) => (
              <path
                style={{ fill: "lightgrey", stroke: "grey" }}
                d={`M${xy.x1},${xy.y1 - 5}L${xy.x2},${xy.y1 - 5}L${
                  xy.x2
                },${xy.y1 + 5}L${xy.x1},${xy.y1 + 5}Z`}
              />
            )}
          />
        </g>
        <g transform={"translate(400,320)"}>
          <Axis
            size={[200, 200]}
            scale={scaleTime()
              .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
              .range([0, 200])}
            orient={"bottom"}
            tickFormat={d => `${d.getMonth()}-${d.getDate()}`}
            label={"Footer Bottom"}
            footer={true}
          />
        </g>
      </svg>

      <MarkdownText
        text={`
\`\`\`jsx
Axis.propTypes = {
  name: PropTypes.string,
  className: PropTypes.string,
  orient: PropTypes.string,
  position: PropTypes.array,
  size: PropTypes.array,
  rotate: PropTypes.number,
  scale: PropTypes.func,
  margin: PropTypes.object,
  annotationFunction: PropTypes.func,
  format: PropTypes.string,
  tickFormat: PropTypes.func,
  tickValues: PropTypes.array,
  padding: PropTypes.number,
  ticks: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.number
  ]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object
    // the label object takes the following properties
    // name : String to be displayed
    // locationDistance: Offset in px from original position      
    // position: Object with the following options
    //   location: One of "outside" or "inside" defaults to "outside"
    //   anchor: One of "middle", "start", or "end", defaults to "middle"
    //   rotation: Angle used in an svg transform rotation
  ])
  }
\`\`\`     
      `}
      />

      <MarkdownPage filename="axis" />
    </div>
  );
};
