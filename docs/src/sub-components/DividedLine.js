import React from "react"
import { DividedLine } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { curveBasis } from "d3-shape"

export default () => {
  function randomLineGenerator(width, height, points) {
    const pointDataSet = []
    let curY = 0.5
    for (let x = 0; x < points; x++) {
      curY += Math.random() * 0.3 - 0.15
      curY = Math.max(curY, 0.05)
      curY = Math.min(curY, 0.95)
      pointDataSet.push({ x: (x / points) * width, y: curY * height })
    }
    return pointDataSet
  }

  function parameters(point) {
    if (point.x < 100)
      return {
        fill: "none",
        stroke: theme[0],
        strokeWidth: 6,
        strokeOpacity: 1
      }

    if (point.x > 400)
      return {
        fill: "none",
        stroke: theme[0],
        strokeWidth: 2,
        strokeDasharray: "5 5"
      }

    if (point.y < 150) return { fill: "none", strokeWidth: 2, stroke: theme[1] }

    if (point.y > 350) return { fill: "none", strokeWidth: 2, stroke: theme[2] }

    return { fill: "none", stroke: "black", strokeWidth: 1 }
  }

  const data = randomLineGenerator(500, 500, 100)

  return (
    <div>
      <MarkdownText
        text={`

The \`DividedLine\` lets you create a line that is split based on a parameters function. See the [annotations page](/guides/annotations#built-in-annotation-types) for an example.


- \`parameters\`: Function, //checks each point and applies a different style object to line segments that fall into the declared parameters
- \`className\`: String,
- \`interpolate\`: Function, 
- \`data\`: Array or Object,
- \`lineDataAccessor\`: Fuction,
- \`customAccessors\`: Object({x: , y: }), //declaring x and y accessor 
- \`searchIterations\`: Number // Used to improve the accuracy of the interpolated cut between the parameterized sections of the line at a cost of performance

`}
      />
      <svg height="500" width="500">
        <DividedLine
          parameters={parameters}
          data={[data]}
          lineDataAccessor={d => d}
          customAccessors={{ x: d => d.x, y: d => d.y }}
          interpolate={curveBasis}
          searchIterations={20}
        />
      </svg>
      <MarkdownText
        text={`
\`\`\`jsx
import { DividedLine } from "semiotic"
import { curveBasis } from "d3-shape"

function randomLineGenerator(width, height, points) {
  const pointDataSet = []
  let curY = 0.5
  for (let x = 0; x < points; x++) {
    curY += Math.random() * 0.3 - 0.15
    curY = Math.max(curY, 0.05)
    curY = Math.min(curY, 0.95)
    pointDataSet.push({ x: (x / points) * width, y: curY * height })
  }
  return pointDataSet
}

function parameters(point) {
  if (point.x < 100)
    return {
      fill: "none",
      stroke: theme[0],
      strokeWidth: 6,
      strokeOpacity: 1
    }

  if (point.x > 400)
    return {
      fill: "none",
      stroke: theme[0],
      strokeWidth: 2,
      strokeDasharray: "5 5"
    }

  if (point.y < 150) return { fill: "none", strokeWidth: 2, stroke: theme[1] }

  if (point.y > 350) return { fill: "none", strokeWidth: 2, stroke: theme[2] }

  return { fill: "none", stroke: "black", strokeWidth: 1 }
}

const data = randomLineGenerator(500, 500, 100)


export default () => {
  return <svg height="500" width="500">
    <DividedLine
      parameters={parameters}
      data={[data]}
      lineDataAccessor={d => d}
      customAccessors={{ x: d => d.x, y: d => d.y }}
      interpolate={curveBasis}
      searchIterations={20}
    />
  </svg>
}
    \`\`\``}
      />
    </div>
  )
}
