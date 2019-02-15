import React from "react";
import DocumentFrame from "../DocumentFrame";
import { XYFrame } from "semiotic";
import { csvParse } from "d3-dsv";

import theme from "../theme";
import MarkdownText from "../MarkdownText";
const ROOT = process.env.PUBLIC_URL;

const cutHash = {
  Ideal: theme[0],
  Premium: theme[1],
  Good: theme[2],
  "Very Good": theme[3],
  Fair: theme[4],
  Premium: theme[5]
};

const frameProps = {
  size: [700, 500],
  xAccessor: "x",
  yAccessor: "y",
  pointStyle: d => ({ fill: d.color, fillOpacity: 0.9 }),
  canvasPoints: true,
  margin: { top: 60, bottom: 50, left: 60, right: 60 },
  hoverAnnotation: true,
  axes: [
    { orient: "bottom", label: "Carat" },
    {
      label: "Price",
      orient: "left",
      tickFormat: d => `$${d / 1000}k`
    }
  ],
  title: "Diamonds: Carat vs Price",
  tooltipContent: d => {
    return (
      <div className="tooltip-content">
        <p>Price: ${d.y}</p>
        <p>Caret: {d.x}</p>
        <p>
          {d.coincidentPoints.length > 1 &&
            `+${d.coincidentPoints.length - 1} more diamond${(d.coincidentPoints
              .length > 2 &&
              "s") ||
              ""} here`}
        </p>
      </div>
    );
  }
};

const overrideProps = {
  tooltipContent: `d => {
    return (
      <div className="tooltip-content">
        <p>Price: \${d.y}</p>
        <p>Caret: {d.x}</p>
        <p>
          {d.coincidentPoints.length > 1 &&
            \`+\${d.coincidentPoints.length - 1} more diamond\${(d.coincidentPoints
              .length > 2 &&
              "s") ||
              ""} here\`}
        </p>
      </div>
    );
  }
  `
};

export default class CanvasInteraction extends React.Component {
  constructor(props) {
    super(props);

    fetch(`${ROOT}/data/diamonds.csv`)
      .then(response => response.text())
      .then(data => {
        const parsedDiamonds = [];
        csvParse(data).forEach(d => {
          parsedDiamonds.push({
            y: +d.price,
            x: +d.carat,
            size: +d.table,
            color: cutHash[d.cut],
            clarity: d.clarity
          });
        });
        this.setState({ ...frameProps, points: parsedDiamonds });
      })
      .catch(err => console.log(err));
  }

  componentDidUpdate(prevProps, prevState) {
    console.log("update", prevState === this.state);
  }

  render() {
    return (
      <div>
        <MarkdownText
          text={`

Ridgeline Plots show variation across values and allow overflowing of the plot into adjoining columns by adjusting the amplitude property of the summaryType. This example also uses dynamicColumnWidth to set column width to be based on the maximum value of each column, normalizing the variation.

`}
        />
        {!this.state ? (
          <div>Loading...</div>
        ) : (
          <DocumentFrame
            frameProps={this.state}
            overrideProps={overrideProps}
            type={XYFrame}
            useExpanded
          />
        )}
      </div>
    );
  }
}
