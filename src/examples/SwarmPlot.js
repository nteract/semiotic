import React from "react";
import DocumentFrame from "../DocumentFrame";
import { OrdinalFrame } from "semiotic";
import theme from "../theme";
import MarkdownText from "../MarkdownText";

const ROOT = process.env.PUBLIC_URL;

const frameProps = {
  size: [700, 450],
  projection: "horizontal",
  oAccessor: "none",
  rAccessor: "total",
  rExtent: [0],
  margin: { left: 20, top: 50, bottom: 75, right: 20 },
  title: (
    <text textAnchor="middle">
      Weekly(1-52) Box Office Totals from <tspan fill={theme[0]}>2016</tspan> -
      mid <tspan fill={theme[2]}>2017</tspan>
    </text>
  ),
  axis: {
    orient: "bottom",
    label: "Box office total",
    ticks: 8,
    tickFormat: d => d / 1000000 + "m"
  },
  type: {
    type: "swarm",
    r: 14,
    customMark: d => {
      const [year, week] = d.date.split("-");
      return (
        <g>
          <circle
            r={11}
            stroke={year === "2016" ? theme[0] : theme[2]}
            fill={year === "2016" ? theme[0] : theme[2]}
          />
          <text
            fill={year === "2016" ? "white" : "black"}
            fontWeight="bold"
            textAnchor="middle"
            y=".4em"
          >
            {week}
          </text>
        </g>
      );
    }
  },
  tooltipContent: d => (
    <div>
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  ),
  pieceHoverAnnotation: true
};

const overrideProps = {
  title: `(
    <text textAnchor="middle">
      Weekly(1-52) Box Office Totals from <tspan fill={
        theme[0]}
      >2016</tspan> -
      mid <tspan fill={theme[2]}>2017</tspan>
    </text>
  )`,
  tooltipContent: `d => (
    <div>
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  )
  `,
  type: `{
    type: "swarm",
    r: 14,
    customMark: d => {
      const [year, week] = d.date.split("-");
      return (
        <g>
          <circle
            r={11}
            stroke={year === "2016" ? theme[0] : theme[2]}
            fill={year === "2016" ? theme[0] : theme[2]}
          />
          <text
            fill={year === "2016" ? "white" : "black"}
            fontWeight="bold"
            textAnchor="middle"
            y=".4em"
          >
            {week}
          </text>
        </g>
      );
    }
  }
  `
};

export default class SwarmPlot extends React.Component {
  constructor(props) {
    super(props);

    fetch(`${ROOT}/data/boxofficetotals.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({ ...frameProps, data });
      });
  }

  render() {
    if (!this.state) return null;

    return (
      <div>
        <MarkdownText
          text={`

Swarm plots allow you have position your data based on an numerical value but apply a force to prevent overlapping. 

`}
        />
        <DocumentFrame
          frameProps={this.state || {}}
          overrideProps={overrideProps}
          type={OrdinalFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
          `}
          useExpanded
        />
      </div>
    );
  }
}
