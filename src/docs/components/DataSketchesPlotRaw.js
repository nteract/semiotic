import * as React from "react"
import { XYFrame } from "../../components"
import { Mark } from "semiotic-mark"
import { scaleLinear } from "d3-scale"

const depthScale = scaleLinear().domain([0, 100]).range([1, 10])

const speciousColors = {
  shirley: "#ff269d",
  nadieh: "#4c50a9",
  guest: "#6d8f6b"
}

const htmlAnnotationRules = (annotation) => {

  console.log("annotation", annotation)
  const { screenCoordinates, d } = annotation
  const pop =  parseInt(depthScale(d.pop))
  console.log("pop", pop)
  return (<div
  style={{
    position: "absolute",
    left: `${parseInt(screenCoordinates[0] - 20)}px`,
    top: `${parseInt(screenCoordinates[1] - 20)}px`,
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#55b9f3",
    boxShadow: `inset ${pop}px ${pop}px ${pop * 2}px #489dcf, inset -${pop}px -${pop}px ${pop * 2}px #62d5ff`

  }} />)
}

const speciousDataset = [
  {
    who: "guest",
    name: "Voices that Care",
    meaningfulFrivolous: 0.5,
    accessibleShowingOff: -0.1,
    pop: 100,
    month: "April"
  },
  {
    who: "nadieh",
    name: "A Breathing Earth",
    meaningfulFrivolous: -0.5,
    accessibleShowingOff: -0.65,
    pop: 50,
    month: "April"
  },
  {
    who: "nadieh",
    name: "Beautiful in English",
    meaningfulFrivolous: -0.2,
    accessibleShowingOff: 0.8,
    pop: 50,
    month: "March"
  },
  {
    who: "shirley",
    name: "Explore Adventure",
    meaningfulFrivolous: 0.45,
    accessibleShowingOff: 0.5,
    pop: 70,
    month: "March"
  },
  {
    who: "nadieh",
    name: "Marble Butterflies",
    meaningfulFrivolous: -0.9,
    accessibleShowingOff: 1,
    pop: 20,
    month: "February"
  },
  {
    who: "shirley",
    name: "The Most Popular of Them All",
    meaningfulFrivolous: 1,
    accessibleShowingOff: -0.4,
    pop: 100,
    month: "January"
  },
  {
    who: "nadieh",
    name: "All fights from DRAGON BALL Z",
    meaningfulFrivolous: 1,
    accessibleShowingOff: 0.3,
    pop: 100,
    month: "January"
  },
  {
    who: "guest",
    name: "A Year of Scrabble",
    meaningfulFrivolous: 0.8,
    accessibleShowingOff: 0.5,
    pop: 30,
    month: "January"
  },
  {
    who: "nadieh",
    name: "TOP 2000 ❤ the 70's & 80's",
    meaningfulFrivolous: 0.75,
    accessibleShowingOff: 0.75,
    pop: 10,
    month: "December"
  },
  {
    who: "shirley",
    name: "DATA DRIVEN REVOLUTIONS",
    meaningfulFrivolous: 0.5,
    accessibleShowingOff: 0.95,
    pop: 0,
    month: "December"
  },
  {
    who: "nadieh",
    name: "DATA DRIVEN REVOLUTIONS",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: -0.2,
    pop: 50,
    month: "November"
  },
  {
    who: "shirley",
    name: "An Interactive Visualization of Every Line in Hamilton",
    meaningfulFrivolous: -0.75,
    accessibleShowingOff: -0.4,
    pop: 20,
    month: "November"
  },
  {
    who: "nadieh",
    name: "Royal Constellations",
    meaningfulFrivolous: -0.3,
    accessibleShowingOff: 0,
    pop: 10,
    month: "October"
  },
  {
    who: "shirley",
    name: "Putting :Ds on the President’s Face",
    meaningfulFrivolous: 0.6,
    accessibleShowingOff: -0.8,
    pop: 100,
    month: "October"
  },
  {
    who: "nadieh",
    name: "My Life in Vacations",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: -0.8,
    pop: 60,
    month: "September"
  },
  {
    who: "shirley",
    name: "Four Years of Vacations in 20,000 Colors",
    meaningfulFrivolous: -0.8,
    accessibleShowingOff: 0,
    pop: 70,
    month: "September"
  },
  {
    who: "nadieh",
    name: "ALL OLYMPIC GOLD MEDAL WINNERS",
    meaningfulFrivolous: -0.25,
    accessibleShowingOff: 0.6,
    pop: 55,
    month: "August"
  },
  {
    who: "shirley",
    name: "dive fractals: synchronized diving in the olympics",
    meaningfulFrivolous: -0.1,
    accessibleShowingOff: 1,
    pop: 30,
    month: "August"
  },
  {
    who: "nadieh",
    name: "Who's speaking in Middle Earth",
    meaningfulFrivolous: 0.1,
    accessibleShowingOff: 0.4,
    pop: 100,
    month: "July"
  },
  {
    who: "shirley",
    name: "untitled",
    meaningfulFrivolous: -0.5,
    accessibleShowingOff: 0.7,
    pop: 10,
    month: "July"
  }
]

const datasketchesChart = {
  size: [750, 750],
  xExtent: { includeAnnotations: true },
  yExtent: { includeAnnotations: true },
  points: speciousDataset,
  annotations: speciousDataset,
  customPointMark: ({ d }) => (
    <Mark markType="g" opacity={0.75}>
      <text
        fontSize={10}
        y={32}
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
        y={32}
        textAnchor="middle"
        fill={speciousColors[d.who]}
      >
        {d.name}
      </text>

    </Mark>
  ),
  hoverAnnotation: true,
  tooltipContent: d => (
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
  ),
  xAccessor: "meaningfulFrivolous",
  yAccessor: "accessibleShowingOff",
  margin: { left: 100, bottom: 100, right: 100, top: 100 },
  htmlAnnotationRules: htmlAnnotationRules,
  backgroundGraphics: (
    <rect
      width={1000}
      height={1000}
      fill="#55b9f3"
    />
  ),
  axes: [
    {
      orient: "left",
      center: true,
//      label: "← Accessible - Showing Off →",
      tickFormat: () => "",
      tickValues: [-1, -0.5, 0.5, 1]
    },
    {
      orient: "bottom",
      center: true,
      //label: "← Meaningful - Frivolous →",
      tickFormat: () => "",
      tickValues: [-1, -0.5, 0.5, 1]
    }
  ]
}

export default (
  <div>
    <XYFrame {...datasketchesChart} />
  </div>
)
