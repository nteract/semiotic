import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
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

// Person silhouette SVG path (viewbox ~0,0 to 18,40)
const personPath =
  "M 9.12,3.34 C 8.28,3.29 7.44,3.40 6.64,3.69 4.17,3.63 1.97,5.37 0.91,7.51 -1.32,11.80 2.55,17.76 8.19,16.55 11.62,16.13 15.55,14.04 16.17,10.33 16.38,6.53 12.77,3.52 9.12,3.34 Z M 9.35,19.86 C 8.89,19.84 8.41,19.92 7.92,20.11 5.12,21.55 3.72,24.68 2.79,27.54 2.32,29.86 0.87,32.04 1.36,34.49 1.63,37.60 8.04,38.95 8.04,38.95 8.04,38.95 14.67,39.65 16.50,36.33 17.16,31.95 16.34,27.23 14.01,23.42 13.07,21.69 11.36,19.92 9.35,19.86 Z"

const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}

// Sort by writeviz ascending (left = more viz, right = more writing)
const sortedData = [...vizzers].sort((a, b) => a.writeviz - b.writeviz)

// All bin labels in sorted order
const allBins = sortedData.map(d => d.writeviz.toFixed(2))

// Expand to one row per person, with unique stack keys so each person
// gets its own bar segment. Sort types within each bin so they group visually.
const expandedData = []
const binPersons = {} // bin → [{type, color}...] for icon rendering
for (const d of sortedData) {
  const bin = d.writeviz.toFixed(2)
  if (!binPersons[bin]) binPersons[bin] = []
  if (d.type === "none" || d.number === 0) continue
  for (let i = 0; i < d.number; i++) {
    const id = `${d.type}-${bin}-${i}`
    expandedData.push({ bin, type: d.type, count: 1, personId: id })
    binPersons[bin].push({ type: d.type })
  }
}

const maxCount = Math.max(...Object.values(binPersons).map(arr => arr.length), 0)

// Build person icons as foregroundGraphics (SVG overlay)
function buildIcons({ size, margin }) {
  const chartWidth = size[0] - margin.left - margin.right
  const chartHeight = size[1] - margin.top - margin.bottom
  const bandWidth = chartWidth / allBins.length
  const iconWidth = Math.min(bandWidth * 0.7, 14)
  const iconScale = iconWidth / 18
  const iconHeight = 40 * iconScale + 2

  const icons = []
  for (let bi = 0; bi < allBins.length; bi++) {
    const bin = allBins[bi]
    const persons = binPersons[bin] || []
    const cx = bi * bandWidth + bandWidth / 2

    for (let i = 0; i < persons.length; i++) {
      const color = colorHash[persons[i].type]
      if (!color) continue
      const iy = chartHeight - (i + 1) * iconHeight
      icons.push(
        <g
          key={`${bin}-${i}`}
          transform={`translate(${cx - iconWidth / 2},${iy}) scale(${iconScale})`}
        >
          <path d={personPath} fill={color} stroke={color} strokeWidth={1.5} />
        </g>
      )
    }
  }

  // Category labels
  icons.push(
    <g key="label-viz" transform="translate(10,105)">
      <rect fill={theme[1]} x={-10} y={-10} width={93} height={55} />
      <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
        DATA VIZ
      </text>
      <text fontWeight="700" fill="white" x={5} y={30} style={{ fontSize: "13px" }}>
        EXPERTS
      </text>
    </g>
  )
  icons.push(
    <g key="label-journalist" transform={`translate(${chartWidth - 115},-50)`}>
      <rect fill={theme[2]} x={-10} y={-10} width={123} height={40} />
      <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
        JOURNALISTS
      </text>
    </g>
  )

  // Bottom axis labels
  icons.push(
    <g key="label-bottom-left" fill="darkgray" transform={`translate(-5,${chartHeight + 5})`}>
      <text fontWeight="700" x={5} y={15} style={{ fontSize: "12px" }}>
        CREATE MORE
      </text>
      <text fontWeight="700" x={5} y={30} style={{ fontSize: "12px" }}>
        DATA VIZ EACH DAY
      </text>
    </g>
  )
  icons.push(
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
    </g>
  )

  return <g>{icons}</g>
}

const frameProps = {
  size: [700, 370],
  data: expandedData,
  oAccessor: "bin",
  rAccessor: "count",
  rExtent: [0, maxCount],
  oExtent: allBins,
  margin: { top: 60, bottom: 70, left: 10, right: 80 },
  chartType: "bar",
  stackBy: "personId",
  pieceStyle: () => ({ fillOpacity: 0, strokeOpacity: 0 }),
  showAxes: false,
  foregroundGraphics: buildIcons
}

const overrideProps = {
  foregroundGraphics: `function({ size, margin }) {
    // Renders person silhouette icons at computed
    // positions, using the OrdinalFrame's layout
    // to determine column spacing and chart bounds.
    // Each icon is colored by respondent type.
    return <g>{/* person icons + labels */}</g>
  }`
}

export default function IsotypeChart() {
  return (
    <div>
      <MarkdownText
        text={`
Based on a [beautiful icon chart by Lisa Charlotte Rost](https://lisacharlotterost.github.io/2017/10/24/Frustrating-Data-Vis/). This isotype chart uses StreamOrdinalFrame with stacked bars — each person is a separate bar segment rendered as a silhouette icon via foregroundGraphics.
`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={StreamOrdinalFrame}
        useExpanded
      />
    </div>
  )
}
