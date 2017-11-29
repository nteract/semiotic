import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import DataSketchesPlotRaw from "./DataSketchesPlotRaw";

const components = [];

components.push({
  name: "DataSketchesPlot"
});

export default class DataSketchesPlotDocs extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: DataSketchesPlotRaw,
      source: `import { XYFrame } from "../../components";
import quadImage from "../sampledata/ds_quads.jpg";
import { Mark } from "semiotic-mark";
const speciousColors = {
  shirley: "#ff269d",
  nadieh: "#4c50a9",
  guest: "#6d8f6b"
};

const speciousDataset = [
  {
    who: "guest",
    name: "Voices that Care",
    meaningfulFrivolous: 0.5,
    accessibleShowingOff: 0.8,
    month: "April"
  },
  {
    who: "nadieh",
    name: "A Breathing Earth",
    meaningfulFrivolous: -0.75,
    accessibleShowingOff: -0.75,
    month: "April"
  }]
  <XYFrame
    size={[750, 750]}
    xExtent={[-1, 1]}
    yExtent={[-1, 1]}
    points={speciousDataset}
    customPointMark={({ d }) => (
      <Mark markType="g" opacity={0.75}>
        <Mark
          markType="circle"
          renderMode="sketchy"
          style={{ fill: speciousColors[d.who] }}
          r={3}
        />
        <text
          fontSize={10}
          y={18}
          textAnchor="middle"
          fill={"white"}
          stroke="white"
          strokeWidth={4}
          opacity={0.9}
        >
          {d.name}
        </text>
        <text
          fontSize={10}
          y={18}
          textAnchor="middle"
          fill={speciousColors[d.who]}
        >
          {d.name}
        </text>
        <circle
          fill="none"
          strokeWidth={3}
          stroke={speciousColors[d.who]}
          r={6}
        />
      </Mark>
    )}
    hoverAnnotation={true}
    tooltipContent={d => (
      <div className="tooltip-content" style={{ color: speciousColors[d.who] }}>
        <h1
          style={{
            fontSize: "16px",
            color: speciousColors[d.who],
            fontWeight: 900
          }}
        >
          {d.name}
        </h1>
        <p>by {d.who}</p>
        <p>{d.month}</p>
      </div>
    )}
    xAccessor={"meaningfulFrivolous"}
    yAccessor={"accessibleShowingOff"}
    margin={{ left: 100, bottom: 100, right: 100, top: 100 }}
    backgroundGraphics={
      <g>
        <image opacity={1} xlinkHref={quadImage} x={50} y={50} height={650} />
        <line x1={375} x2={375} y1={100} y2={650} style={{ stroke: "black" }} />
        <line y1={375} y2={375} x1={100} x2={650} style={{ stroke: "black" }} />
      </g>
    }
    axes={[
      {
        orient: "left",
        label: "← Accessible - Showing Off →",
        tickFormat: () => ""
      },
      {
        orient: "bottom",
        label: "← Meaningful - Frivolous →",
        tickFormat: () => ""
      }
    ]}
  />
      `
    });

    return (
      <DocumentComponent
        name="Data Sketches Plot"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          An interactive scatterplot of all the projects from{" "}
          <a target="_blank" href="http://www.datasketch.es/">
            the Information is Beautiful Gold Medal-winning Data Sketches by
            Shirley Wu & Nadieh Bremer
          </a>{" "}
          showing how to use backgroundGraphics to place an image and guide
          lines, as well as axis labeling and tick formatting functions to
          create a quadrant view.
        </p>
      </DocumentComponent>
    );
  }
}

DataSketchesPlotDocs.title = "Data Sketches";
