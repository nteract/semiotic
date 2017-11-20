import React from "react";
import { XYFrame } from "../../components";
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
    meaningfulFrivolous: 0.5,
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
    accessibleShowingOff: -0.75,
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
    title={"Data Sketches"}
    size={[1000, 1000]}
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
          y={18}
          textAnchor="middle"
          fill={"white"}
          stroke="white"
          strokeWidth={4}
          opacity={0.9}
        >
          {d.name}
        </text>
        <text y={18} textAnchor="middle" fill={speciousColors[d.who]}>
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
    hoverAnnotaiton={true}
    tooltipContent={d => (
      <div className="tooltip-content">
        <h1>{d.name}</h1>
        <p>{d.name}</p>
      </div>
    )}
    xAccessor={"meaningfulFrivolous"}
    yAccessor={"accessibleShowingOff"}
    margin={{ left: 100, bottom: 100, right: 100, top: 100 }}
    backgroundGraphics={
      <g>
        <image opacity={1} xlinkHref={quadImage} x={50} y={50} height={900} />
        <line x1={500} x2={500} y1={100} y2={900} style={{ stroke: "black" }} />
        <line y1={500} y2={500} x1={100} x2={900} style={{ stroke: "black" }} />
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
);
