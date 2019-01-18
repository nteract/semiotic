import React from "react";
import { OrdinalFrame } from "semiotic";
import DocumentFrame from "../DocumentFrame";
import theme from "../theme";
import MarkdownText from "../MarkdownText";

// Add your component proptype data here
// multiple component proptype documentation supported
const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];

const inflatedBarChartData = [
  { user: "Jason", action: "tweets", value: 10 },
  { user: "Susie", action: "tweets", value: 5 },
  { user: "Susie", action: "tweets", value: 1 },
  { user: "Matt", action: "tweets", value: 20 },
  { user: "Betty", action: "tweets", value: 30 },
  { user: "Jason", action: "retweets", value: 5 },
  { user: "Susie", action: "retweets", value: 100 },
  { user: "Matt", action: "retweets", value: 25 },
  { user: "Betty", action: "retweets", value: 20 },
  { user: "Jason", action: "favorites", value: 15 },
  { user: "Susie", action: "favorites", value: 100 },
  { user: "Matt", action: "favorites", value: 50 },
  { user: "Betty", action: "favorites", value: 10 }
];

const colorHash = {
  tweets: theme[0],
  retweets: theme[2],
  favorites: theme[1]
};

const frameProps = {
  size: [200, 200],
  data: barChartData,
  oAccessor: "user",
  rAccessor: "tweets",
  style: { fill: theme[0], stroke: "white" },
  type: "bar",
  oLabel: true,
  title: "Tweets"
};

const titleAndSpacing = {
  oPadding: 5,
  rAccessor: d => d.tweets + d.retweets,
  title: "Tweets & Retweets",
  axis: true
};

const diffBar = {
  ...titleAndSpacing,
  rAccessor: ["tweets", d => -d.retweets],
  title: "Tweets vs. Retweets",
  axis: {
    tickFormat: d => Math.abs(d),
    label: "<- Retweets vs. Tweets -> "
  }
};

const rAccessor = ["tweets", "retweets", "favorites"];
const stackedFrameProps = {
  ...frameProps,
  size: [280, 300],
  rAccessor,
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
  style: (d, i) => {
    return { fill: colorHash[rAccessor[d.rIndex]], stroke: "white" };
  }
};

const stackedFramePropsFlattened = {
  ...stackedFrameProps,
  data: inflatedBarChartData,
  rAccessor: "value",
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
  style: d => ({ fill: colorHash[d.action], stroke: "white" })
};

export default function CreateABarChart() {
  return (
    <div>
      <MarkdownText
        text={`      
Creating a bar chart and stacked bar chart with tooltips, labels, and
an axis in Semiotic.

## Basic Bar Chart
      `}
      />

      <DocumentFrame frameProps={frameProps} type={OrdinalFrame} useExpanded />
      <MarkdownText
        text={`
      
## Bar Chart with Custom Function, Bar Padding, and Title

By using a function as the \`rAccessor\` the bar height now represents the sum of tweets and
retweets \`rAcessor= {d => d.tweets + d.retweets}\` <br/>
Adding the property \`oPadding = {5}\` gives spacing between
bars.<br/>
You can pass a \`title\` as either a string or a JSX element.
You can also send an \`axis=true\`
  
      `}
      />

      <DocumentFrame
        frameProps={{ ...frameProps, ...titleAndSpacing }}
        type={OrdinalFrame}
        startHidden
      />
      <MarkdownText
        text={`
      
## Diverging Bar

The bar type also handles negative values. In this example the \`rAccessor={["tweets", d => -d.retweets ]}\`. It also sends down an axis with settings \`axis={{
tickFormat: d => Math.abs(d),
label: "<- Retweets vs. Tweets -> " }}\`

  
      `}
      />

      <DocumentFrame
        frameProps={{ ...frameProps, ...diffBar }}
        type={OrdinalFrame}
        startHidden
      />

      <MarkdownText
        text={`
        
## Stacked Bar Chart using the Same Data Model 

Instead of adding the tweets and retweets you can easily use that same
dataset and create a stacked bar. Change the rAccessor into an array of data properties: \`rAcessor:{["tweets", "retweets", "favorites"]}\` 
    
        `}
      />

      <DocumentFrame
        frameProps={stackedFrameProps}
        type={OrdinalFrame}
        startHidden
      />
      <MarkdownText
        text={`
## Stacked Bar Chart using a flattened Data Model

Another approach is flattening your data so that you have a property called action with the activity type, i.e. tweet, retweet, or favorite. And a property called value. In this case your rAccessor changes to \`rAccessor="value"\` 
      `}
      />

      <DocumentFrame
        frameProps={stackedFramePropsFlattened}
        type={OrdinalFrame}
      />
      <MarkdownText
        text={`
## Adding Tooltips to the Columns

Adding the property \`hoverAnnotation\` gives tooltips to each of the columns. This represents the value for all of the stacked pieces combined.
    `}
      />

      <h3 />
      <p />
      <DocumentFrame
        frameProps={{ ...stackedFramePropsFlattened, hoverAnnotation: true }}
        type={OrdinalFrame}
        startHidden
      />
      <MarkdownText
        text={`
## Adding Tooltips to the Pieces

Adding the property \`pieceHoverAnnotation\` gives tooltips to each of the individual pieces within a column.
    `}
      />

      <DocumentFrame
        frameProps={{
          ...stackedFramePropsFlattened,
          pieceHoverAnnotation: true
        }}
        type={OrdinalFrame}
        startHidden
      />
    </div>
  );
}
