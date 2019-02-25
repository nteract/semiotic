import React from "react"
import MarkdownPage from "../MarkdownPage"
import DocumentFrame, { propertyToString } from "../DocumentFrame"
import { XYFrame } from "semiotic"
import lines from "./sharedTooltipData"
import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"
import MarkdownText from "../MarkdownText"

const tooltipStyles = {
  header: {
    fontWeight: "bold",
    borderBottom: "thin solid black",
    marginBottom: "10px",
    textAlign: "center"
  },
  lineItem: { position: "relative", display: "block", textAlign: "left" },
  title: { display: "inline-block", margin: "0 5px 0 15px" },
  value: { display: "inline-block", fontWeight: "bold", margin: "0" },
  wrapper: {
    background: "rgba(255,255,255,0.8)",
    minWidth: "max-content",
    whiteSpace: "nowrap"
  }
}

const sharedTooltipChart = {
  size: [700, 300],
  className: "sharedTooltip",
  lineDataAccessor: "data",
  xAccessor: d => new Date(d.x),
  xScaleType: scaleTime(),
  yAccessor: "y",
  lines: lines,
  lineStyle: d => {
    return { stroke: d.color, strokeWidth: "2px", fill: "none" }
  },
  axes: [
    { orient: "left" },
    { orient: "bottom", ticks: 6, tickFormat: d => timeFormat("%m/%d")(d) }
  ],
  margin: { top: 10, left: 40, right: 10, bottom: 60 },
  pointStyle: {
    fill: "none",
    stroke: "black",
    strokeWidth: "1.5px"
  },
  hoverAnnotation: [
    { type: "x", disable: ["connector", "note"] },
    { type: "frame-hover" },
    { type: "vertical-points", threshold: 0.1, r: () => 5 }
  ],
  tooltipContent: d => {
    const points = lines
      .map(point => {
        return {
          id: point.id,
          color: point.color,
          data: point.data.find(i => {
            // Search the lines for a similar x value for vertical shared tooltip
            // Can implement a 'close enough' conditional here too (fuzzy equality)
            return new Date(i.x).getTime() === new Date(d.x).getTime()
          })
        }
      })
      .sort((a, b) => b.data.y - a.data.y)

    const returnArray = [
      <div key={"header_multi"} style={tooltipStyles.header}>
        {`Records for: ${timeFormat("%m/%d/%Y")(new Date(d.x))}`}
      </div>
    ]

    points.forEach((point, i) => {
      const title = point.id
      const valString = `${point.data.y} units`

      returnArray.push([
        <div key={`tooltip_line_${i}`} style={tooltipStyles.lineItem}>
          <p
            key={`tooltip_color_${i}`}
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: point.color,
              display: "inline-block",
              position: "absolute",
              top: "8px",
              left: "0",
              margin: "0"
            }}
          />
          <p
            key={`tooltip_p_${i}`}
            style={tooltipStyles.title}
          >{`${title} =`}</p>
          <p key={`tooltip_p_val_${i}`} style={tooltipStyles.value}>
            {valString}
          </p>
        </div>
      ])
    })

    return (
      <div className="tooltip-content" style={tooltipStyles.wrapper}>
        {returnArray}
      </div>
    )
  }
}

const overrideProps = {
  axes: `[
  { orient: "left" },
  { orient: "bottom", ticks: 6, tickFormat: d => timeFormat("%m/%d")(d) }
]`,
  lines: "lines",
  xScaleType: "scaleTime()",
  tooltipContent: `d => {
    const points = lines
      .map(point => {
        return {
          id: point.id,
          color: point.color,
          data: point.data.find(i => {
            // Search the lines for a similar x value for vertical shared tooltip
            // Can implement a 'close enough' conditional here too (fuzzy equality)
            return new Date(i.x).getTime() === new Date(d.x).getTime();
          })
        };
      })
      .sort((a, b) => b.data.y - a.data.y);

    const returnArray = [
      <div key={"header_multi"} style={tooltipStyles.header}>
        {\`Records for: \${timeFormat("%m/%d/%Y")(new Date(d.x))}\`}
      </div>
    ];

    points.forEach((point, i) => {
      const title = point.id;
      const valString = \`\${point.data.y} units\`;

      returnArray.push([
        <div key={\`tooltip_line_\${i}\`} style={tooltipStyles.lineItem}>
          <p
            key={\`tooltip_color_\${i}\`}
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: point.color,
              display: "inline-block",
              position: "absolute",
              top: "8px",
              left: "0",
              margin: "0"
            }}
          />
          <p
            key={\`tooltip_p_\${i}\`}
            style={tooltipStyles.title}
          >{\`\${title} =\`}</p>
          <p key={\`tooltip_p_val_\${i}\`} style={tooltipStyles.value}>
            {valString}
          </p>
        </div>
      ]);
    });

    return (
      <div className="tooltip-content" style={tooltipStyles.wrapper}>
        {returnArray}
      </div>
    );
}`
}

export default () => {
  return (
    <div>
      <MarkdownPage filename="tooltips" />
      <MarkdownText
        text={`
## Shared Tooltips

`}
      />
      <DocumentFrame
        frameProps={sharedTooltipChart}
        type={XYFrame}
        overrideProps={overrideProps}
        pre={`import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"

const tooltipStyles = {
  header: {
    fontWeight: "bold",
    borderBottom: "thin solid black",
    marginBottom: "10px",
    textAlign: "center"
  },
  lineItem: { position: "relative", display: "block", textAlign: "left" },
  title: { display: "inline-block", margin: "0 5px 0 15px" },
  value: { display: "inline-block", fontWeight: "bold", margin: "0" },
  wrapper: {
    background: "rgba(255,255,255,0.8)",
    minWidth: "max-content",
    whiteSpace: "nowrap"
  }
}

const lines = ${propertyToString(lines, 0, false)}
        `}
      />
    </div>
  )
}
