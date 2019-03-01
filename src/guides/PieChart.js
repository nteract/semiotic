import React from "react"
import { OrdinalFrame } from "semiotic"
import DocumentFrame from "../DocumentFrame"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { scaleSqrt } from "d3-scale"

// Add your component proptype data here
// multiple component proptype documentation supported
const pieChartData = [
  { user: "Jason", tweets: 40, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 25, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
]

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
]

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
}

const donut = {
  ...frameProps,
  type: { type: "bar", innerRadius: 50 }
}

const windRose = {
  ...frameProps,
  dynamicColumnWidth: null,
  rAccessor: "tweets",
  data: longPieChartData,
  axis: true,
  rScaleType: scaleSqrt
}

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
    }
  },
  rScaleType: scaleSqrt,

  axis: true
}

//better story for this type of sorting
const sortednightingale = {
  ...nightingale,
  oSort: (a, b, c, d) => {
    return (
      c[0].tweets +
      c[0].retweets +
      c[0].favorites -
      d[0].tweets -
      d[0].retweets -
      d[0].favorites
    )
  }
}

const overrideProps = {
  rScaleType: "scaleSqrt()",
  style: `{ fill: theme[0], stroke: "white" }`
}

const nightingaleOverrideProps = {
  ...overrideProps,
  style: `d => {
    return {
      fill: theme[d.rIndex],
      stroke: "white"
    }
  }`
}

const pre = `import { scaleSqrt} from "d3-scale"`

export default function CreateABarChart() {
  return (
    <div>
      <MarkdownText
        text={`
Creating a pie chart, donut chart, nightingale chart, tooltips, and labels using OridinalFrame in Semiotic.  

## Basic Pie Chart

\`OrdinalFrame\` takes \`data\` as an array of objects. The \`oAccessor\` prop defines which property on the object to use as categorical data, the \`dynamicColumnWidth\` defines which property to use for numerical data, and for pie charts you must also set your \`projection="radial"\`.  

      `}
      />

      <DocumentFrame frameProps={frameProps} type={OrdinalFrame} useExpanded />

      <MarkdownText
        text={`
    
### Donut Chart

Change your \`type="bar"\` to an object \`type={{"type": "bar", innerRadius: 50 }}\` to OrdinalFrame to make a donut chart. 

    `}
      />
      <DocumentFrame frameProps={donut} type={OrdinalFrame} startHidden />
      <MarkdownText
        text={`
  
### Wind Rose

Instead of using your pie slice angle for your numerical data you could instead set \`rAcccessor="tweets"\` and your \`rScaleType={scaleSqrt()}\` to use create a wind rose. 

  `}
      />
      <DocumentFrame
        frameProps={windRose}
        type={OrdinalFrame}
        startHidden
        pre={pre}
        overrideProps={overrideProps}
      />
      <MarkdownText
        text={`
    
### Nightingale Chart using the Same Data Model

Instead of just showing tweet count, you can change your wind rose into a nightingale. Change the rAccessor into an array of data properties: \`rAcessor:{["tweets", "retweets", "favorites"]}\` 

    `}
      />
      <DocumentFrame
        frameProps={nightingale}
        type={OrdinalFrame}
        startHidden
        pre={pre}
        overrideProps={nightingaleOverrideProps}
      />

      <MarkdownText
        text={`
    
### Nightingale Chart with Flattened Data Model

Another approach is flattening your data so that you have a property called action with the activity type, i.e. tweet, retweet, or favorite. And a property called value. In this case your rAccessor changes to \`rAccessor="value"\` 

    `}
      />
      <DocumentFrame
        frameProps={nightingale}
        type={OrdinalFrame}
        startHidden
        pre={`import { scaleSqrt} from "d3-scale"`}
        overrideProps={nightingaleOverrideProps}
      />

      <MarkdownText
        text={`
    
### Sorted Nightingale

You can also pass a \`sortO\` property to change the order for your ordinal data.

\`oSort={(a, b, c, d) => {
  return (
    c[0].tweets +
    c[0].retweets +
    c[0].favorites -
    d[0].tweets -
    d[0].retweets -
    d[0].favorites
  )
}}\`
    `}
      />
      <DocumentFrame
        frameProps={sortednightingale}
        type={OrdinalFrame}
        startHidden
        pre={pre}
        overrideProps={nightingaleOverrideProps}
      />

      <MarkdownText
        text={`
### Adding Tooltips to the Columns

Adding the property \`hoverAnnotation\` gives tooltips to each of the columns. This represents the value for all of the stacked pieces combined.
    `}
      />

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
        pre={pre}
        startHidden
        overrideProps={nightingaleOverrideProps}
      />
    </div>
  )
}
