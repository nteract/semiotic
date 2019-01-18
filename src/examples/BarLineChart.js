import React from "react";
import DocumentFrame from "../DocumentFrame";
import { OrdinalFrame } from "semiotic";
import theme from "../theme";
import MarkdownText from "../MarkdownText";

const frameProps = {
  size: [700, 500],
  rAccessor: ["leads", "sales"],
  oAccessor: "month",
  // projection: "horizontal",
  type: {
    type: "point",
    customMark: d => {
      if (d.rIndex === 1) {
        return <circle r={6} fill={theme[1]} />;
      }
      return <rect height={d.scaledValue} width={20} x={-10} fill={theme[0]} />;
    }
  },
  rExtent: [0],
  oLabel: true,
  margin: { top: 60, bottom: 50, left: 60, right: 60 },
  oPadding: 10,
  data: [
    { sales: 5, leads: 150, month: "Jan" },
    { sales: 7, leads: 100, month: "Feb" },
    { sales: 7, leads: 75, month: "Mar" },
    { sales: 4, leads: 50, month: "Apr" },
    { sales: 2, leads: 200, month: "May" },
    { sales: 3, leads: 175, month: "Jun" },
    { sales: 5, leads: 125, month: "Jul" }
  ],
  axis: [
    {
      key: "leads-axis",
      orient: "right",
      ticks: 3,
      tickValues: [0, 25, 50, 75, 100, 125, 150, 175, 200],
      label: (
        <text fontWeight="bold" fill={theme[0]}>
          Leads
        </text>
      )
    },
    {
      key: "sales-axis",
      orient: "left",
      tickValues: [0, 1, 2, 3, 4, 5, 6, 7],
      label: (
        <text fontWeight="bold" fill={theme[1]}>
          Sales
        </text>
      )
    }
  ],
  connectorType: d => {
    return d.rIndex !== 0 && d.rIndex;
  },
  connectorStyle: { stroke: theme[1], strokeWidth: 3 },
  multiAxis: true,
  renderOrder: ["pieces", "connectors"],
  pieceHoverAnnotation: [
    {
      type: "highlight",
      style: {
        stroke: "white",
        fill: "none",
        strokeWidth: 4,
        strokeOpacity: 0.5
      }
    },
    { type: "frame-hover" }
  ],
  title: (
    <text>
      <tspan fill={theme[1]}>Sales</tspan> vs{" "}
      <tspan fill={theme[0]}>Leads</tspan>
    </text>
  ),
  style: { fill: theme[0], opacity: 1, stroke: "white" },
  tooltipContent: d => {
    const bothValues = [
      <div style={{ color: theme[0] }} key={"1"}>
        Leads: {d.leads}
      </div>,
      <div style={{ color: theme[1] }} key="2">
        Sales: {d.sales}
      </div>
    ];
    const content = d.rIndex === 0 ? bothValues : bothValues.reverse();
    return (
      <div style={{ fontWeight: 900 }} className="tooltip-content">
        {content}
      </div>
    );
  }
};

const overrideProps = {
  type: `{
    type: "point",
    customMark: d => {
      if (d.rIndex === 1) {
        return <circle r={6} fill={theme[1]} />;
      }
      return <rect height={d.scaledValue} width={20} x={-10} fill={theme[0]} />;
    }
  }`,
  axis: `
  [
    {
      key: "leads-axis",
      orient: "right",
      ticks: 3,
      tickValues: [0, 25, 50, 75, 100, 125, 150, 175, 200],
      label: (
        <text fontWeight="bold" fill={theme[0]}>
          Leads
        </text>
      )
    },
    {
      key: "sales-axis",
      orient: "left",
      tickValues: [0, 1, 2, 3, 4, 5, 6, 7],
      label: (
        <text fontWeight="bold" fill={theme[1]}>
          Sales
        </text>
      )
    }
  ]
  `,
  title: `
  (
    <text>
      <tspan fill={theme[1]}>Sales</tspan> vs{" "}
      <tspan fill={theme[0]}>Leads</tspan>
    </text>
  )
  `,
  tooltipContent: `d => {
    const bothValues = [
      <div style={{ color: theme[0] }} key={"1"}>
        Leads: {d.leads}
      </div>,
      <div style={{ color: theme[1] }} key="2">
        Sales: {d.sales}
      </div>
    ];
    const content = d.rIndex === 0 ? bothValues : bothValues.reverse();
    return (
      <div style={{ fontWeight: 900 }} className="tooltip-content">
        {content}
      </div>
    );
  }
  `
};

const BarLineChart = () => {
  return (
    <div>
      <MarkdownText
        text={`

OrdinalFrame has a multiAxis prop that, if set to true, will calculate separate extents for each of the rAccessor props (meaning you need to pass more than one to see any effect) as well as decorating sent axes in an order matching the sent rAccessor props so that it renders axes with the data extent. You can use the rIndex props of the data to then adjust the display and tooltips to show the proper data and render it, for instance here using customMark, as a bar/line chart.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalFrame}
        useExpanded
      />
    </div>
  );
};

export default BarLineChart;
