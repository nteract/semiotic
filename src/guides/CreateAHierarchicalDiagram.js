import React from "react"
import MarkdownText from "../MarkdownText"
import DocumentFrame from "../DocumentFrame"
import { NetworkFrame } from "semiotic"
import theme from "../theme"

const ROOT = process.env.PUBLIC_URL
const nodeStyle = d => ({
  fill: theme[d.depth],
  stroke: theme[d.depth],
  fillOpacity: 0.6
})
const sunburst = {
  size: [700, 700],
  nodeStyle,
  nodeIDAccessor: "name",
  hoverAnnotation: [
    { type: "desaturation-layer", style: { fill: "white", fillOpacity: 0.25 } },
    {
      type: "highlight",
      style: nodeStyle
    },
    { type: "frame-hover" }
  ],
  networkType: {
    type: "partition",
    projection: "radial"
  },
  tooltipContent: d => (
    <div className="tooltip-content">
      {d.parent ? <p>{d.parent.data.name}</p> : undefined}
      <p>{d.data.name}</p>
    </div>
  ),
  nodeLabels: d => {
    return d.x1 - d.x0 < 8 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    )
  },
  margin: 10,
  filterRenderedNodes: d => d.depth !== 0
}

const overrideProps = {
  tooltipContent: `d => (
    <div className="tooltip-content">
      {d.parent ? <p>{d.parent.data.name}</p> : undefined}
      <p>{d.data.name}</p>
    </div>`,
  filterRenderedNodes: `d => d.depth !== 0`,
  hoverAnnotation: `[
    { type: "desaturation-layer", style: { fill: "white", fillOpacity: 0.25 } },
    {
      type: "highlight",
      style: d => ({
        fill: theme[d.depth],
        stroke: theme[d.depth],
        fillOpacity: 0.6
      })
    },
    { type: "frame-hover" }
  ]`,
  nodeLabels: `d => {
    return d.x1 - d.x0 < 8 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  }`,
  nodeStyle: `d => ({
    fill: theme[d.depth],
    stroke: theme[d.depth],
    fillOpacity: 0.6
  })`,
  edgeStyle: `d => ({
    fill: theme[d.source.depth],
    stroke: theme[d.source.depth],
    opacity: 0.5
  })`
}

const partition = {
  ...sunburst,
  networkType: "partition",
  size: [900, 300],
  nodeLabels: d => {
    return d.x1 - d.x0 < 20 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    )
  }
}

const partitionOverrideProps = {
  ...overrideProps,
  nodeLabels: `d => {
    return d.x1 - d.x0 < 20 ? null : (
      <g transform="translate(0,5)">
        <text textAnchor="middle" strokeWidth={2} stroke="white" fill="white">
          {d.id}
        </text>
        <text textAnchor="middle">{d.id}</text>
      </g>
    );
  }`
}

const tree = {
  ...sunburst,
  networkType: "tree",
  edgeStyle: d => ({
    fill: theme[d.source.depth],
    stroke: theme[d.source.depth],
    opacity: 0.5
  }),
  nodeLabels: d => {
    return d.depth > 1 ? null : (
      <g transform="translate(0,-15)">
        <text
          fontSize="12"
          textAnchor="middle"
          strokeWidth={2}
          stroke="white"
          fill="white"
        >
          {d.id}
        </text>
        <text fontSize="12" textAnchor="middle" fill={theme[d.depth]}>
          {d.id}
        </text>
      </g>
    )
  },
  size: [700, 400]
}

const circlepack = {
  ...sunburst,
  networkType: "circlepack",
  nodeStyle: d => ({
    fill: "none",
    stroke: theme[d.depth]
  }),
  nodeLabels: d => {
    return d.depth > 1 ? null : (
      <g transform="translate(0,5)">
        <text
          fontSize="12"
          textAnchor="middle"
          strokeWidth={2}
          stroke="white"
          fill="white"
        >
          {d.id}
        </text>
        <text fontSize="12" textAnchor="middle" fill={theme[d.depth]}>
          {d.id}
        </text>
      </g>
    )
  },
  size: [700, 400]
}

const circlepackOverrideProps = {
  ...overrideProps,
  nodeStyle: `d => ({
    fill: "none",
    stroke: theme[d.depth]
  })`
}

const treemap = {
  ...circlepack,
  nodeLabels: d => {
    return d.depth > 1 ? null : (
      <g transform="translate(0,5)">
        <text
          fontSize="18"
          textAnchor="middle"
          strokeWidth={2}
          stroke="white"
          fill="white"
        >
          {d.id}
        </text>
        <text fontSize="18" textAnchor="middle" fill={theme[d.depth]}>
          {d.id}
        </text>
      </g>
    )
  },
  nodeStyle: d => ({
    fill: d.height === 0 ? theme[d.depth] : "none",
    fillOpacity: 1,
    stroke: theme[d.depth]
  }),
  networkType: { type: "treemap", padding: 2 }
}

export default class HierarchicalDiagrams extends React.Component {
  constructor(props) {
    super(props)

    fetch(`${ROOT}/data/flare.json`)
      .then(response => response.json())
      .then(data => {
        this.setState({ data })
      })
  }

  render() {
    if (!this.state) return "Loading..."

    return (
      <div>
        <MarkdownText
          text={`
\`NetworkFrame\` allows you to render several hierarchical data visualizations. For these examples you just pass an \`edges\` list and no \`nodes\`. Edges should be an object with an array of \`children\` containing objects with \`children\` all the way down the hierarchy. The assumption is that each child's \`id\` property is unique. These types of hierarchies can be created easily from a parent/child  list with d3's [stratify](https://github.com/d3/d3-hierarchy#stratify) functionality.  The built in hierarchical types are \`tree\`, \`cluster\`, \`circlepack\`, \`treemap\`, and \`partition\`


## Dendrogram

The dendrogram uses [d3-hierarchy's tree layout](https://github.com/d3/d3-hierarchy#tree) for placing nodes. 

In this example, we pass a hierarchical edge object and set \`networkType: "tree" \`. You can also use \`networkType: "cluster"\` to align the children nodes, mirroring [d3-hierarchy's cluster layout](https://github.com/d3/d3-hierarchy#cluster)
`}
        />
        <DocumentFrame
          frameProps={{ ...tree, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          pre={`
const theme = ${JSON.stringify(theme)}          
    `}
        />
        <MarkdownText
          text={`
### Dendrogram Settings

In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options. 

You can also pass any parameters for [d3-hierarchy's tree layout](https://github.com/d3/d3-hierarchy#tree)

\`\`\`jsx
networkType={{ 
  type: "tree", 
  zoom: true, //zoom the laid out nodes in or out so that they fit exactly in the specified size
  padding: 0, // pixel value to separate individual nodes from each other
  projection: "vertical", // accepts (vertical|horizontal|radial) whether to display the chart with steps laid out on the y axis (vertical) or the x axis (horizontal)
  hierarchyChildre: d => d.children // function describing how children are defined in the hierarchical dataset, which will be passed as the second value to d3-hierarchy’s hierarchy function,
}}\`\`\`
`}
        />

        <MarkdownText
          text={`

## Circle Pack

This example is the same as the dendrogram except we are passing \`networkType="circlepack"\`.

`}
        />
        <DocumentFrame
          frameProps={{ ...circlepack, edges: this.state.data }}
          overrideProps={circlepackOverrideProps}
          type={NetworkFrame}
          startHidden
          pre={`
const theme = ${JSON.stringify(theme)}          
  `}
        />

        <MarkdownText
          text={`

### Circle Pack Settings

In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

You can also pass any parameters for [d3-hierarchy's pack layout](https://github.com/d3/d3-hierarchy#pack)

\`\`\`jsx
networkType={{ 
  type: "circlepack", 
  zoom: true, //zoom the laid out nodes in or out so that they fit exactly in the specified size
  padding: 0, // pixel value to separate individual nodes from each other
  hierarchyChildren: d => d.children // function describing how children are defined in the hierarchical dataset, which will be passed as the second value to d3-hierarchy’s hierarchy function,
}}\`\`\`
`}
        />

        <MarkdownText
          text={`

## Treemap

This example is the same as the dendrogram except we are passing \`networkType="treemap"\`.
`}
        />

        <DocumentFrame
          frameProps={{ ...treemap, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          startHidden
          pre={`
const theme = ${JSON.stringify(theme)}          
`}
        />

        <MarkdownText
          text={`

### Treemap Settings

In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

You can also pass any parameters for [d3-hierarchy's treemap layout](https://github.com/d3/d3-hierarchy#treemap)

\`\`\`jsx
networkType={{
  type: "treemap", 
  zoom: true, //zoom the laid out nodes in or out so that they fit exactly in the specified size
  padding: 0, // pixel value to separate individual nodes from each other
  projection: "vertical", // accepts (vertical|horizontal) whether to display the chart with steps laid out on the y axis (vertical) or the x axis (horizontal)
  hierarchyChildren: d => d.children // function describing how children are defined in the hierarchical dataset, which will be passed as the second value to d3-hierarchy’s hierarchy function,
}}
\`\`\`
`}
        />

        <MarkdownText
          text={`

## Partition

This example is the same as the dendrogram except we are passing \`networkType="partition"\`.
    `}
        />

        <DocumentFrame
          frameProps={{ ...partition, edges: this.state.data }}
          overrideProps={partitionOverrideProps}
          type={NetworkFrame}
          startHidden
          pre={`
const theme = ${JSON.stringify(theme)}          
        `}
        />
        <MarkdownText
          text={`

### Partition Settings

In addition to just sending \`networkType\` as a string, you could pass an object with additional layout options.

You can also pass any parameters for [d3-hierarchy's partition layout](https://github.com/d3/d3-hierarchy#partition)

\`\`\`jsx
networkType={{
  type: "partition",
  zoom: true, //zoom the laid out nodes in or out so that they fit exactly in the specified size 
  padding: 0, // pixel value to separate individual nodes from each other
  projection: "vertical", // accepts (vertical|horizontal|radial) whether to display the chart with steps laid out on the y axis (vertical) or the x axis (horizontal)
  hierarchyChildren: d => d.children // function describing how children are defined in the hierarchical dataset, which will be passed as the second value to d3-hierarchy’s hierarchy function,
}}
\`\`\`
      
  `}
        />
        <MarkdownText
          text={`

## Sunburst

This uses the same settings as the parition above but instead of just sending \`networkType="partition"\` it passes an additional \`projection\` parameter to create a radial layout \`networkType={{ type: "partition", projection: "radial" }}\`
        
    `}
        />

        <DocumentFrame
          frameProps={{ ...sunburst, edges: this.state.data }}
          overrideProps={overrideProps}
          type={NetworkFrame}
          startHidden
          pre={`
const theme = ${JSON.stringify(theme)}          
        `}
        />
        <MarkdownText
          text={`
## What next?

For technical specifications on all of NetworkFrames's features, reference the [NetworkFrame API](#api/networkframe) docs.

`}
        />
      </div>
    )
  }
}
