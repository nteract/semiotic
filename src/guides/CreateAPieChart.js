import React from "react";
import { OrdinalFrame } from "semiotic";
import DocumentFrame from "../DocumentFrame";
import theme from "../theme";
import MarkdownText from "../MarkdownText";
import { scaleSqrt } from "d3-scale";

// Add your component proptype data here
// multiple component proptype documentation supported
const pieChartData = [
  { user: "Jason", tweets: 40, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 25, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];

const longPieChartData = [
  ...pieChartData,
  { user: "Ian", tweets: 5, retweets: 45, favorites: 100 },
  { user: "Noah", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Shirley", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Rachel", tweets: 30, retweets: 20, favorites: 10 },
  { user: "Nadieh", tweets: 30, retweets: 20, favorites: 15 },
  { user: "Jim", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Zan", tweets: 5, retweets: 32, favorites: 100 },
  { user: "Shelby", tweets: 30, retweets: 20, favorites: 10 }
];

const colorHash = {
  Susie: theme[0],
  retweets: theme[2],
  favorites: theme[1]
};

const frameProps = {
  size: [300, 300],
  data: pieChartData,
  oAccessor: "user",
  dynamicColumnWidth: "tweets",
  style: { fill: theme[0], stroke: "white" },
  type: "bar",
  projection: "radial",
  oLabel: true,
  title: "Tweets",
  margin: 70
};
//oLabel options
//oSort option

//            oLabel={{ label: true, orient: "stem", padding: -5 }}
//Can this take a function??
const titleAndSpacing = {
  dynamicColumnWidth: d => d.tweets + d.retweets,
  title: "Tweets & Retweets"
};

const donut = {
  ...frameProps,
  type: { type: "bar", innerRadius: 50 }
};

const windRose = {
  ...frameProps,
  dynamicColumnWidth: null,
  rAccessor: "tweets",
  data: longPieChartData,
  axis: true,
  rScaleType: scaleSqrt
};

const deaths1855 = [
  { month: "Jan", type: "Wounds & injuries", casualties: 83 },
  { month: "Feb", type: "Wounds & injuries", casualties: 42 },
  { month: "Mar", type: "Wounds & injuries", casualties: 32 },
  { month: "Apr", type: "Wounds & injuries", casualties: 48 },
  { month: "May", type: "Wounds & injuries", casualties: 49 },
  { month: "Jun", type: "Wounds & injuries", casualties: 209 },
  { month: "Jul", type: "Wounds & injuries", casualties: 134 },
  { month: "Aug", type: "Wounds & injuries", casualties: 164 },
  { month: "Sep", type: "Wounds & injuries", casualties: 276 },
  { month: "Oct", type: "Wounds & injuries", casualties: 53 },
  { month: "Nov", type: "Wounds & injuries", casualties: 33 },
  { month: "Dec", type: "Wounds & injuries", casualties: 18 },
  { month: "Jan", type: "All other causes", casualties: 324 },
  { month: "Feb", type: "All other causes", casualties: 361 },
  { month: "Mar", type: "All other causes", casualties: 172 },
  { month: "Apr", type: "All other causes", casualties: 57 },
  { month: "May", type: "All other causes", casualties: 37 },
  { month: "Jun", type: "All other causes", casualties: 31 },
  { month: "Jul", type: "All other causes", casualties: 33 },
  { month: "Aug", type: "All other causes", casualties: 25 },
  { month: "Sep", type: "All other causes", casualties: 20 },
  { month: "Oct", type: "All other causes", casualties: 18 },
  { month: "Nov", type: "All other causes", casualties: 32 },
  { month: "Dec", type: "All other causes", casualties: 28 },
  { month: "Jan", type: "Zymotic diseases", casualties: 2761 },
  { month: "Feb", type: "Zymotic diseases", casualties: 2120 },
  { month: "Mar", type: "Zymotic diseases", casualties: 1205 },
  { month: "Apr", type: "Zymotic diseases", casualties: 477 },
  { month: "May", type: "Zymotic diseases", casualties: 508 },
  { month: "Jun", type: "Zymotic diseases", casualties: 802 },
  { month: "Jul", type: "Zymotic diseases", casualties: 382 },
  { month: "Aug", type: "Zymotic diseases", casualties: 483 },
  { month: "Sep", type: "Zymotic diseases", casualties: 189 },
  { month: "Oct", type: "Zymotic diseases", casualties: 128 },
  { month: "Nov", type: "Zymotic diseases", casualties: 178 },
  { month: "Dec", type: "Zymotic diseases", casualties: 91 }
];

//but with changing the rScaleType to scale Sqrt and haivng the extent match the data properly
// const rAccessor = ["tweets", "retweets", "favorites"]

//radial axes

const nightingale = {
  ...frameProps,
  dynamicColumnWidth: null,
  size: [400, 400],
  data: longPieChartData,
  rAccessor: ["tweets", "retweets", "favorites"],
  style: d => {
    return {
      fill: theme[d.rIndex],
      stroke: "white"
    };
  },
  rScaleType: scaleSqrt,

  axis: true
};

//better story for this type of sorting
const sortednightingale = {
  ...nightingale,
  sortO: (a, b, c, d) => {
    return (
      c[0].tweets +
      c[0].retweets +
      c[0].favorites -
      d[0].tweets -
      d[0].retweets -
      d[0].favorites
    );
  }
};

const stackedFrameProps = {
  ...frameProps,
  size: [280, 300],
  rAccessor: ["tweets", "retweets", "favorites"],
  axis: {
    orient: "left",
    label: (
      <text textAnchor="middle">
        <tspan fill={colorHash.tweets}>Tweets</tspan> +{" "}
        <tspan fill={colorHash.retweets}>Retweets</tspan> +{" "}
        <tspan fill={colorHash.favorites}>Favorites</tspan>
      </text>
    )
  },
  style: d => {
    return { fill: colorHash[d.action], stroke: "white" };
  }
};

const overrideProps = {
  rScaleType: "scaleSqrt(), // import {scaleSqrt} from d3-scale",
  style: `d => {
    return {
      fill: theme[0],
      stroke: "white"
    }
  }`
};

// const stackedFramePropsFlattened = {
//   ...stackedFrameProps,
//   data: inflatedBarChartData,
//   rAccessor: "value",
//   axis: {
//     orient: "left",
//     label: (
//       <text textAnchor="middle">
//         <tspan fill={colorHash.tweets}>Tweets</tspan> +{" "}
//         <tspan fill={colorHash.retweets}>Retweets</tspan> +{" "}
//         <tspan fill={colorHash.favorites}>Favorites</tspan>
//       </text>
//     )
//   },
//   style: d => ({ fill: colorHash[d.action], stroke: "white" })
// }

export default function CreateABarChart() {
  return (
    <div>
      <MarkdownText
        text={`
      
## Creating a Pie Chart

Creating a pie chart, donut chart, nightingale chart, tooltips, and labels using OridinalFrame in Semiotic.
      `}
      />

      <DocumentFrame frameProps={frameProps} type={OrdinalFrame} useExpanded />

      <MarkdownText
        text={`
    
### Donut Chart

Change your \`type: "bar"\` to an object \`type: {"type": "bar", innerRadius: 50 }\` to OrdinalFrame to make a donut chart. 

    `}
      />
      <DocumentFrame frameProps={donut} type={OrdinalFrame} startHidden />
      <MarkdownText
        text={`
  
### Wind Rose

Instead of using your pie slice with for your data you can also map the r-size your \`type: "bar"\` to an object \`type: {"type": "bar", innerRadius: 50 }\` to OrdinalFrame to make a donut chart. 

  `}
      />
      <DocumentFrame
        frameProps={windRose}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />
      <MarkdownText
        text={`
    
### Nightingale Chart using the Same Data Model

Change your \`type: "bar"\` to an object \`type: {"type": "bar", innerRadius: 50 }\` to OrdinalFrame to make a donut chart. 

    `}
      />
      <DocumentFrame
        frameProps={nightingale}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
    
### Nightingale Chart with Flattened Data Model

Change your \`type: "bar"\` to an object \`type: {"type": "bar", innerRadius: 50 }\` to OrdinalFrame to make a donut chart. 

    `}
      />
      <DocumentFrame
        frameProps={nightingale}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
    
### Sorted Nightingale

Change your \`type: "bar"\` to an object \`type: {"type": "bar", innerRadius: 50 }\` to OrdinalFrame to make a donut chart. 

    `}
      />
      <DocumentFrame
        frameProps={sortednightingale}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
### Adding Tooltips to the Columns

Adding the property \`hoverAnnotation\` gives tooltips to each of the columns. This represents the value for all of the stacked pieces combined.
    `}
      />

      <h3 />
      <p />
      <DocumentFrame
        frameProps={{ ...nightingale, hoverAnnotation: true }}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
### Adding Tooltips to the Pieces

Adding the property \`pieceHoverAnnotation\` gives tooltips to each of the individual pieces within a column.
    `}
      />
      <DocumentFrame
        frameProps={{
          ...nightingale,
          pieceHoverAnnotation: true
        }}
        type={OrdinalFrame}
        startHidden
        overrideProps={overrideProps}
      />
    </div>
  );
}
