import React from "react";
import DocumentFrame from "../DocumentFrame";
import { OrdinalFrame } from "semiotic";
import theme from "../theme";
import MarkdownText from "../MarkdownText";

const data = [
  {
    name: "Pikachu",
    color: theme[3],
    attribute: "attack",
    value: 55,
    defense: 40,
    speed: 90,
    hp: 35
  },
  { name: "Pikachu", color: theme[3], attribute: "defense", value: 40 },
  { name: "Pikachu", color: theme[3], attribute: "speed", value: 90 },
  { name: "Pikachu", color: theme[3], attribute: "hp", value: 35 },
  { name: "Pikachu", color: theme[3], attribute: "special attack", value: 50 },
  { name: "Pikachu", color: theme[3], attribute: "attack", value: 55 },
  { name: "Bulbasaur", color: theme[2], attribute: "attack", value: 49 },
  { name: "Bulbasaur", color: theme[2], attribute: "defense", value: 49 },
  {
    name: "Bulbasaur",
    color: theme[2],
    attribute: "special attack",
    value: 65
  },
  { name: "Bulbasaur", color: theme[2], attribute: "speed", value: 45 },
  { name: "Bulbasaur", color: theme[2], attribute: "hp", value: 45 },
  { name: "Squirtle", color: theme[4], attribute: "attack", value: 48 },
  { name: "Squirtle", color: theme[4], attribute: "defense", value: 65 },
  {
    name: "Squirtle",
    color: theme[4],
    attribute: "special attack",
    value: 50
  },
  { name: "Squirtle", color: theme[4], attribute: "speed", value: 43 },
  { name: "Squirtle", color: theme[4], attribute: "hp", value: 44 },

  { name: "Charmander", color: theme[1], attribute: "attack", value: 52 },
  { name: "Charmander", color: theme[1], attribute: "defense", value: 43 },
  {
    name: "Charmander",
    color: theme[1],
    attribute: "special attack",
    value: 60
  },
  { name: "Charmander", color: theme[1], attribute: "speed", value: 65 },
  { name: "Charmander", color: theme[1], attribute: "hp", value: 39 }
];

const frameProps = {
  size: [500, 450],
  oAccessor: "attribute",
  rAccessor: "value",
  rExtent: [0],
  margin: { left: 40, top: 50, bottom: 75, right: 120 },
  title: "Pokemon Base Stats",
  axis: true,
  data,
  // axis: [
  //   {
  //     label: { name: "Windiness", locationDistance: 15 }
  //   }
  // ],
  style: d => ({
    fill: d.color,
    stroke: "white",
    strokeOpacity: 0.5
  }),
  connectorStyle: d => {
    return {
      fill: d.source.color,
      stroke: d.source.color,
      strokeOpacity: 0.5,
      fillOpacity: 0.5
    };
  },
  oLabel: true,
  type: "point",
  projection: "radial",
  pieceHoverAnnotation: true,
  connectorType: d => d.name,
  foregroundGraphics: [
    <g transform="translate(400, 73)" key="legend">
      <text key={1} fill={theme[3]}>
        Pikachu
      </text>
      <text key={1} y={20} fill={theme[2]}>
        Bulbasaur
      </text>
      <text key={1} y={40} fill={theme[1]}>
        Charmander
      </text>
      <text key={1} y={60} fill={theme[4]}>
        Squirtle
      </text>
    </g>
  ]
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
  foregroundGraphics: ` [
    <g transform="translate(440, 73)" key="legend">
      <text key={1} fill={theme[0]}>
        New York
      </text>
      <text key={1} y={20} fill={theme[1]}>
        Las Vegas
      </text>
      <text key={1} y={40} fill={theme[2]}>
        San Diego
      </text>
      <text key={1} y={60} fill={theme[3]}>
        Denver
      </text>
      <text key={1} y={80} fill={theme[4]}>
        Oakland
      </text>
    </g>
  ]`
};

export default function SwarmPlot() {
  return (
    <div>
      <MarkdownText
        text={`

A comparison of attributes across multiple attributes. This data is taken from [Pokemon Database](https://pokemondb.net/pokedex/all)
`}
      />
      <DocumentFrame
        frameProps={frameProps}
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
