import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalCustomChart } from "semiotic"
import { hitTargetRect, tokenLayer } from "semiotic/recipes"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const vizzers = [
  { type: "journalist", writeviz: 1, number: 9 },
  { type: "journalist", writeviz: 0.95, number: 9 },
  { type: "journalist", writeviz: 0.9, number: 8 },
  { type: "journalist", writeviz: 0.85, number: 8 },
  { type: "journalist", writeviz: 0.8, number: 8 },
  { type: "journalist", writeviz: 0.75, number: 7 },
  { type: "journalist", writeviz: 0.7, number: 7 },
  { type: "journalist", writeviz: 0.65, number: 6 },
  { type: "journalist", writeviz: 0.6, number: 5 },
  { type: "journalist", writeviz: 0.55, number: 5 },
  { type: "journalist", writeviz: 0.45, number: 4 },
  { type: "journalist", writeviz: 0.4, number: 3 },
  { type: "journalist", writeviz: 0.35, number: 3 },
  { type: "journalist", writeviz: 0.3, number: 2 },
  { type: "journalist", writeviz: 0.25, number: 1 },
  { type: "viz", writeviz: 0.25, number: 1 },
  { type: "journalist", writeviz: 0.2, number: 2 },
  { type: "journalist", writeviz: 0.15, number: 2 },
  { type: "journalist", writeviz: 0.1, number: 2 },
  { type: "journalist", writeviz: 0.05, number: 1 },
  { type: "journalist", writeviz: 0, number: 1 },
  { type: "none", writeviz: -0.05, number: 0 },
  { type: "journalist", writeviz: -0.1, number: 1 },
  { type: "none", writeviz: -0.15, number: 0 },
  { type: "none", writeviz: -0.2, number: 0 },
  { type: "viz", writeviz: -0.25, number: 1 },
  { type: "none", writeviz: -0.3, number: 0 },
  { type: "viz", writeviz: -0.35, number: 1 },
  { type: "journalist", writeviz: -0.4, number: 1 },
  { type: "journalist", writeviz: -0.45, number: 1 },
  { type: "none", writeviz: -0.5, number: 0 },
  { type: "viz", writeviz: -0.55, number: 1 },
  { type: "none", writeviz: -0.6, number: 0 },
  { type: "viz", writeviz: -0.65, number: 1 },
  { type: "viz", writeviz: -0.7, number: 1 },
  { type: "viz", writeviz: -0.75, number: 2 },
  { type: "viz", writeviz: -0.8, number: 2 },
  { type: "viz", writeviz: -0.85, number: 2 },
  { type: "viz", writeviz: -0.9, number: 2 },
  { type: "viz", writeviz: -0.95, number: 1 }
]

const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}

// Sort by writeviz ascending (left = more viz, right = more writing)
const sortedData = [...vizzers].sort((a, b) => a.writeviz - b.writeviz)

// Deduplicated bin labels in sorted order
const allBins = [...new Set(sortedData.map(d => d.writeviz.toFixed(2)))]

const binPersons = {} // bin → [{type}...] for icon rendering
for (const d of sortedData) {
  const bin = d.writeviz.toFixed(2)
  if (!binPersons[bin]) binPersons[bin] = []
  if (d.type === "none" || d.number === 0) continue
  for (let i = 0; i < d.number; i++) {
    binPersons[bin].push({ type: d.type })
  }
}

const maxCount = Math.max(...Object.values(binPersons).map(arr => arr.length), 0)

const columnData = allBins.map((bin) => {
  const writeviz = Number(bin)
  const persons = binPersons[bin] || []
  const journalistCount = persons.filter((person) => person.type === "journalist").length
  const vizCount = persons.filter((person) => person.type === "viz").length
  return {
    bin,
    writeviz,
    people: persons,
    count: persons.length,
    journalistCount,
    vizCount,
    label: `${persons.length} respondent${persons.length === 1 ? "" : "s"} at ${bin}`,
  }
})

function isotypeGlyphLayout(ctx) {
  const chartWidth = ctx.dimensions.width
  const chartHeight = ctx.dimensions.height
  const unitHeight = Math.abs(ctx.scales.r(0) - ctx.scales.r(1))
  const gap = 2
  const glyphSize = Math.max(
    1,
    Math.min(unitHeight - gap, ctx.scales.o.bandwidth() * 0.8 * (40 / 18)),
  )

  const hitTargets = ctx.data.map((column) => {
    const x = ctx.scales.o(column.bin) || 0
    return hitTargetRect({
      x,
      y: 0,
      width: ctx.scales.o.bandwidth(),
      height: chartHeight,
      datum: column,
      id: column.bin,
      group: "writeviz-bin",
    })
  })

  const glyphs = []
  ctx.data.forEach((column) => {
    const x0 = ctx.scales.o(column.bin) || 0
    const personLayer = tokenLayer({
      input: { data: column.people },
      encoding: {
        tokenType: "glyph",
        tokenSemantics: "observed-unit",
        countStrategy: "actual",
        icon: "person",
        labelPolicy: "text-plus-token",
      },
      options: {
        tokenSize: glyphSize,
        color: (unit) => colorHash[unit.datum.type],
        accent: "#ffffff",
        style: {},
        // Hover/focus should resolve to the column hit target, not the unit.
        datum: null,
        include: (unit) => Boolean(colorHash[unit.datum.type]),
        pointId: (unit) => `${column.bin}-${unit.index}`,
        positionToken: (unit) => {
          const cellTop = ctx.scales.r(unit.index + 1)
          return {
            x: x0 + ctx.scales.o.bandwidth() / 2,
            y: cellTop + (unitHeight - glyphSize) / 2 + glyphSize,
            row: unit.index,
            column: 0,
          }
        },
      },
    })
    glyphs.push(...personLayer.nodes)
  })

  // Category labels
  const labels = [
    <g key="label-viz" transform="translate(10,105)">
      <rect fill={theme[1]} x={-10} y={-10} width={93} height={55} />
      <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
        DATA VIZ
      </text>
      <text fontWeight="700" fill="white" x={5} y={30} style={{ fontSize: "13px" }}>
        EXPERTS
      </text>
    </g>,
    <g key="label-journalist" transform={`translate(${chartWidth - 115},-50)`}>
      <rect fill={theme[2]} x={-10} y={-10} width={123} height={40} />
      <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
        JOURNALISTS
      </text>
    </g>,
    <g key="label-bottom-left" fill="darkgray" transform={`translate(-5,${chartHeight + 5})`}>
      <text fontWeight="700" x={5} y={15} style={{ fontSize: "12px" }}>
        CREATE MORE
      </text>
      <text fontWeight="700" x={5} y={30} style={{ fontSize: "12px" }}>
        DATA VIZ EACH DAY
      </text>
    </g>,
    <g
      key="label-bottom-right"
      fill="darkgray"
      textAnchor="end"
      transform={`translate(${chartWidth + 5},${chartHeight + 5})`}
    >
      <text fontWeight="700" x={5} y={15} style={{ fontSize: "12px" }}>
        WRITE MORE
      </text>
      <text fontWeight="700" x={5} y={30} style={{ fontSize: "12px" }}>
        EACH DAY
      </text>
    </g>,
    <line
      key="baseline"
      x1={0}
      x2={chartWidth}
      y1={chartHeight}
      y2={chartHeight}
      stroke="darkgray"
      strokeWidth={2}
    />,
  ]

  return {
    nodes: [...hitTargets, ...glyphs],
    overlays: <g pointerEvents="none">{labels}</g>,
  }
}

const frameProps = {
  width: 700,
  height: 370,
  data: columnData,
  layout: isotypeGlyphLayout,
  categoryAccessor: "bin",
  valueAccessor: "count",
  rExtent: [0, maxCount],
  oExtent: allBins,
  margin: { top: 60, bottom: 70, left: 10, right: 80 },
  showAxes: false,
  enableHover: true,
  title: "Survey respondents by daily writing-vs-visualization balance",
  description:
    "An isotype chart where each column is a writing-versus-visualization balance bin and each person glyph represents one respondent.",
}

const overrideProps = {
  layout: `function isotypeGlyphLayout(ctx) {
    // Emits one transparent hit target per column plus
    // tokenLayer({ tokenSemantics: "observed-unit", icon: "person" })
    // as datum-less glyph scene nodes.
    return { nodes: [...columnHitTargets, ...personGlyphs], overlays }
  }`,
}

const pre = `import { hitTargetRect, tokenLayer } from "semiotic/recipes"

// The layout emits:
// tokenLayer({ icon: "person", tokenSemantics: "observed-unit" })
// as datum-less glyph scene nodes for the visible signs
// plus one hitTargetRect(...) per column for grouped hover/focus.`

export default function IsotypeChart() {
  return (
    <div>
      <MarkdownText
        text={`
Based on a [beautiful icon chart by Lisa Charlotte Rost](https://lisacharlotterost.github.io/2017/10/24/Frustrating-Data-Vis/). This isotype chart uses \`OrdinalCustomChart\`: \`tokenLayer\` marks each visible person as an \`observed-unit\` and turns those tokens into reusable Semiotic glyph scene nodes, while each column has one transparent hit target so hover and keyboard focus read the bin as a whole.
`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalCustomChart}
        pre={pre}
        hiddenProps={{ description: true }}
        useExpanded
      />
    </div>
  )
}
