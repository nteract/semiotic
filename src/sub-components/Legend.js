import React from "react";
import { Legend } from "semiotic";
import MarkdownPage from "../MarkdownPage";
import MarkdownText from "../MarkdownText";

export default () => {
  const areaLegendGroups = [
    {
      styleFn: d => ({ fill: d.color, stroke: "black" }),
      items: [
        { label: "Area 1", color: "#b3331d" },
        { label: "Area 2", color: "#007190" }
      ]
    }
  ];

  const lineLegendGroups = [
    {
      type: "line",
      styleFn: d => ({ stroke: d.color }),
      items: [
        { label: "Line 1", color: "#b3331d" },
        { label: "Line 2", color: "#007190" }
      ]
    }
  ];

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
        <g transform={"translate(50,0)"}>
          <Legend title={"Test Area Legend"} legendGroups={areaLegendGroups} />
        </g>

        <g transform={"translate(200,0)"}>
          <Legend title={"Test Line Legend"} legendGroups={lineLegendGroups} />
        </g>
        <g transform={"translate(350,0)"}>
          <Legend
            title={"Both Legend"}
            legendGroups={[...lineLegendGroups, ...areaLegendGroups]}
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

      <MarkdownPage filename="legend" />
    </div>
  );
};
