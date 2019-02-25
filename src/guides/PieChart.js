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
  sortO: (a, b, c, d) => {
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
        pre={pre}
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
        pre={pre}
        overrideProps={nightingaleOverrideProps}
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
        pre={`import { scaleSqrt} from "d3-scale"`}
        overrideProps={nightingaleOverrideProps}
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
