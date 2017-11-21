import React from "react";
import { XYFrame } from "../../components";
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
    accessibleShowingOff: -0.65,
    month: "April"
  },
  {
    who: "nadieh",
    name: "Beautiful in English",
    meaningfulFrivolous: -0.2,
    accessibleShowingOff: 0.8,
    month: "March"
  },
  {
    who: "shirley",
    name: "Explore Adventure",
    meaningfulFrivolous: 0.45,
    accessibleShowingOff: 0.5,
    month: "March"
  },
  {
    who: "nadieh",
    name: "Marble Butterflies",
    meaningfulFrivolous: -0.9,
    accessibleShowingOff: 1,
    month: "February"
  },
  {
    who: "shirley",
    name: "The Most Popular of Them All",
    meaningfulFrivolous: 1,
    accessibleShowingOff: -0.4,
    month: "January"
  },
  {
    who: "nadieh",
    name: "All fights from DRAGON BALL Z",
    meaningfulFrivolous: 1,
    accessibleShowingOff: 0.3,
    month: "January"
  },
  {
    who: "guest",
    name: "A Year of Scrabble",
    meaningfulFrivolous: 0.8,
    accessibleShowingOff: 0.5,
    month: "January"
  },
  {
    who: "nadieh",
    name: "TOP 2000 ❤ the 70's & 80's",
    meaningfulFrivolous: 0.75,
    accessibleShowingOff: 0.75,
    month: "December"
  },
  {
    who: "shirley",
    name: "DATA DRIVEN REVOLUTIONS",
    meaningfulFrivolous: 0.5,
    accessibleShowingOff: 0.9,
    month: "December"
  },
  {
    who: "nadieh",
    name: "DATA DRIVEN REVOLUTIONS",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: -0.2,
    month: "November"
  },
  {
    who: "shirley",
    name: "An Interactive Visualization of Every Line in Hamilton",
    meaningfulFrivolous: -0.75,
    accessibleShowingOff: -0.4,
    month: "November"
  },
  {
    who: "nadieh",
    name: "Royal Constellations",
    meaningfulFrivolous: -0.3,
    accessibleShowingOff: 0.5,
    month: "October"
  },
  {
    who: "shirley",
    name: "Putting :Ds on the President’s Face",
    meaningfulFrivolous: 0.6,
    accessibleShowingOff: -0.8,
    month: "October"
  },
  {
    who: "nadieh",
    name: "My Life in Vacations",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: -0.8,
    month: "September"
  },
  {
    who: "shirley",
    name: "Four Years of Vacations in 20,000 Colors",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: 0,
    month: "September"
  },
  {
    who: "nadieh",
    name: "ALL OLYMPIC GOLD MEDAL WINNERS",
    meaningfulFrivolous: -0.25,
    accessibleShowingOff: 0.6,
    month: "August"
  },
  {
    who: "shirley",
    name: "dive fractals: synchronized diving in the olympics",
    meaningfulFrivolous: -0.1,
    accessibleShowingOff: 1,
    month: "August"
  },
  {
    who: "nadieh",
    name: "Who's speaking in Middle Earth",
    meaningfulFrivolous: 0.1,
    accessibleShowingOff: 0.4,
    month: "July"
  },
  {
    who: "shirley",
    name: "untitled",
    meaningfulFrivolous: -0.5,
    accessibleShowingOff: 0.7,
    month: "July"
  }
];

export default (
  <XYFrame
    size={[750, 750]}
    xExtent={[-1, 1]}
    yExtent={[-1, 1]}
    points={speciousDataset}
    customPointMark={({ d }) => (
      <Mark markType="g" opacity={0.75}>
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
        <Mark
          markType="circle"
          renderMode="sketchy"
          style={{ fill: speciousColors[d.who] }}
          r={8}
        />
        <Mark
          markType="circle"
          style={{
            strokeWidth: 2,
            stroke: "white",
            fill: "none"
          }}
          r={4}
        />
      </Mark>
    )}
    hoverAnnotation={true}
    tooltipContent={d => (
      <div
        className="tooltip-content"
        style={{
          border: "none",
          background: speciousColors[d.who],
          color: "white"
        }}
      >
        <h1
          style={{
            fontSize: "16px",
            color: "white",
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
        <image
          opacity={1}
          xlinkHref={"/semiotic/ds_quads.jpg"}
          x={50}
          y={50}
          height={650}
        />
        <line x1={375} x2={375} y1={100} y2={650} style={{ stroke: "black" }} />
        <line y1={375} y2={375} x1={100} x2={650} style={{ stroke: "black" }} />
      </g>
    }
    axes={[
      {
        orient: "left",
        label: "← Accessible - Showing Off →",
        tickFormat: () => "",
        tickValues: [-1, -0.5, 0.5, 1]
      },
      {
        orient: "bottom",
        label: "← Meaningful - Frivolous →",
        tickFormat: () => "",
        tickValues: [-1, -0.5, 0.5, 1]
      }
    ]}
  />
);
