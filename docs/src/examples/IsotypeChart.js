import React, { useRef, useState, useEffect } from "react"
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

// Simple person silhouette SVG path (head + body)
// Viewbox roughly 0,0 to 18,40
const personPath =
  "M 9.12,3.34 C 8.28,3.29 7.44,3.40 6.64,3.69 4.17,3.63 1.97,5.37 0.91,7.51 -1.32,11.80 2.55,17.76 8.19,16.55 11.62,16.13 15.55,14.04 16.17,10.33 16.38,6.53 12.77,3.52 9.12,3.34 Z M 9.35,19.86 C 8.89,19.84 8.41,19.92 7.92,20.11 5.12,21.55 3.72,24.68 2.79,27.54 2.32,29.86 0.87,32.04 1.36,34.49 1.63,37.60 8.04,38.95 8.04,38.95 8.04,38.95 14.67,39.65 16.50,36.33 17.16,31.95 16.34,27.23 14.01,23.42 13.07,21.69 11.36,19.92 9.35,19.86 Z"

const colorHash = {
  journalist: theme[2],
  viz: theme[1]
}

// Sort data by writeviz ascending (left = more viz, right = more writing)
const sortedData = [...vizzers].sort((a, b) => a.writeviz - b.writeviz)

export default function IsotypeChart() {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const totalWidth = containerWidth || 700
  const margin = { top: 60, bottom: 70, left: 10, right: 80 }
  const chartWidth = totalWidth - margin.left - margin.right
  const chartHeight = 240
  const totalHeight = chartHeight + margin.top + margin.bottom

  const numColumns = sortedData.length
  const colWidth = chartWidth / numColumns
  const maxNumber = Math.max(...sortedData.map(d => d.number))

  // Person icon sizing: fit within column, leave padding
  const iconWidth = Math.min(colWidth - 2, 14)
  const iconScale = iconWidth / 18 // original path is ~18 wide
  const iconHeight = 40 * iconScale

  return (
    <div ref={containerRef}>
      <MarkdownText
        text={`
Based on a [beautiful icon chart by Lisa Charlotte Rost](https://lisacharlotterost.github.io/2017/10/24/Frustrating-Data-Vis/). I called her little icons Rostos in her honor.
`}
      />
      {containerWidth && (
        <svg width={totalWidth} height={totalHeight}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Person icons for each column */}
            {sortedData.map((d, colIndex) => {
              const color = colorHash[d.type]
              if (!color || d.number === 0) return null
              const cx = colIndex * colWidth + colWidth / 2
              const icons = []
              for (let i = 0; i < d.number; i++) {
                const iy = chartHeight - (i + 1) * (iconHeight + 2)
                icons.push(
                  <g
                    key={`${colIndex}-${i}`}
                    transform={`translate(${cx - iconWidth / 2},${iy}) scale(${iconScale})`}
                  >
                    <path
                      d={personPath}
                      fill={color}
                      stroke={color}
                      strokeWidth={1.5}
                    />
                  </g>
                )
              }
              return <g key={colIndex}>{icons}</g>
            })}

            {/* Baseline */}
            <line
              x1={0}
              x2={chartWidth}
              y1={chartHeight}
              y2={chartHeight}
              stroke="darkgray"
              strokeWidth={2}
            />

            {/* Labels: DATA VIZ EXPERTS (left) */}
            <g transform="translate(10,105)">
              <rect fill={theme[1]} x={-10} y={-10} width={93} height={55} />
              <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
                DATA VIZ
              </text>
              <text fontWeight="700" fill="white" x={5} y={30} style={{ fontSize: "13px" }}>
                EXPERTS
              </text>
            </g>

            {/* Labels: JOURNALISTS (right) */}
            <g transform={`translate(${chartWidth - 115},-50)`}>
              <rect fill={theme[2]} x={-10} y={-10} width={123} height={40} />
              <text fontWeight="700" fill="white" x={5} y={15} style={{ fontSize: "13px" }}>
                JOURNALISTS
              </text>
            </g>

            {/* Bottom axis labels */}
            <g fill="darkgray" transform={`translate(-5,${chartHeight + 5})`}>
              <text fontWeight="700" x={5} y={15} style={{ fontSize: "12px" }}>
                CREATE MORE
              </text>
              <text fontWeight="700" x={5} y={30} style={{ fontSize: "12px" }}>
                DATA VIZ EACH DAY
              </text>
            </g>
            <g fill="darkgray" textAnchor="end" transform={`translate(${chartWidth + 5},${chartHeight + 5})`}>
              <text fontWeight="700" x={5} y={15} style={{ fontSize: "12px" }}>
                WRITE MORE
              </text>
              <text fontWeight="700" x={5} y={30} style={{ fontSize: "12px" }}>
                EACH DAY
              </text>
            </g>
          </g>
        </svg>
      )}
    </div>
  )
}
