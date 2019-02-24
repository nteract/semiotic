import React from "react"
import DocumentFrame from "../DocumentFrame"
import { NetworkFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import flextree from "d3-flextree-v4"

const tree = {
  name: "root",
  height: 25,
  width: 100,
  children: [
    {
      name: "a",
      height: 40,
      width: 40,
      children: [
        {
          name: "b",
          height: 80,
          width: 40,
          children: [
            {
              name: "c",
              height: 40,
              width: 100,
              children: [{ name: "d", height: 200, width: 40 }]
            }
          ]
        }
      ]
    },
    {
      name: "e",
      height: 40,
      width: 40,
      children: [
        {
          name: "f",
          height: 40,
          width: 40,
          children: [
            {
              name: "g",
              height: 40,
              width: 200,
              children: [
                { name: "h", height: 60, width: 30 },
                { name: "h1", height: 80, width: 30 },
                { name: "h2", height: 40, width: 30 }
              ]
            }
          ]
        }
      ]
    },
    {
      name: "i",
      height: 40,
      width: 40,
      children: [
        {
          name: "j",
          height: 40,
          width: 100,
          children: [{ name: "k", height: 200, width: 40 }]
        }
      ]
    }
  ]
}

const flexLayoutSize = [700, 700]
//Because flextree returns nodes spaced in a way unlike the standard d3-hierarchy layouts, we need to pass a custom function to the networkType zoom prop. That function is passed (nodes, size) and you can adjust the position of the nodes accordingly
const flextreeZoom = (nodes, size) => {
  const minX = Math.min(...nodes.map(node => node.x - node.width / 2))
  const maxX = Math.max(...nodes.map(node => node.x + node.width / 2))
  const minY = Math.min(...nodes.map(node => node.y))
  const maxY = Math.max(...nodes.map(node => node.y + node.height))

  const xScalingFactor = size[0] / (maxX - minX)
  const yScalingFactor = size[1] / (maxY - minY)

  nodes.forEach(node => {
    //This is enough to display on screen
    node.x = node.x + Math.abs(minX)
    //But if you wanted to zoom-to-fit you can do this:
    node.x = node.x * xScalingFactor
    node.data.width = node.data.width * xScalingFactor
    node.y = node.y * yScalingFactor
    node.data.height = node.data.height * yScalingFactor
  })
}

const frameProps = {
  size: flexLayoutSize,
  edges: tree,
  edgeStyle: d => ({
    fill: theme[d.source.depth],
    stroke: theme[d.source.depth],
    strokeWidth: 5,
    opacity: 0.5
  }),
  nodeIDAccessor: "name",
  hoverAnnotation: true,
  customNodeIcon: ({ d }) => {
    return (
      <rect
        x={d.x - d.data.width / 2}
        y={d.y - 10}
        height={d.data.height - 10}
        width={d.data.width}
        fill={theme[2]}
      />
    )
  },
  networkType: {
    zoom: flextreeZoom,
    type: "tree",
    layout: flextree,
    nodeSize: d => [d.data.width, d.data.height],
    spacing: () => 10
  },
  margin: 50
}

const overrideProps = {
  edgeStyle: `d => ({
    fill: theme[d.source.depth],
    stroke: theme[d.source.depth],
    strokeWidth: 5,
    opacity: 0.5
  })`,
  customNodeIcon: `({ d }) => {
    return (
      <rect
        x={d.x - d.data.width / 2}
        y={d.y - 10}
        height={d.data.height - 10}
        width={d.data.width}
        fill="orange"
        stroke="gold"
      />
    )
  }`,
  networkType: `{
    zoom: flextreeZoom,
    type: "tree",
    layout: flextree,
    nodeSize: d => [d.data.width, d.data.height],
    spacing: 10
  }`
}

export default function CustomLayout() {
  return (
    <div>
      <MarkdownText
        text={`

A way to show change between two points in time. 

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={NetworkFrame}
        useExpanded
      />
    </div>
  )
}
