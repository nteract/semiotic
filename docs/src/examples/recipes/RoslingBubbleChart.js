import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  BubbleChart,
  CategoryColorProvider,
} from "semiotic"

// ── Synthetic Gapminder-style data ──────────────────────────────────
// Key countries across 7 decades. GDP per capita (PPP, 2017$) and
// life expectancy. Population in millions.
// Patterns are historically grounded but values are approximations.

const RAW = [
  // United States
  { country: "United States", continent: "Americas", year: 1950, gdp: 15000, life: 68, pop: 152 },
  { country: "United States", continent: "Americas", year: 1960, gdp: 18000, life: 70, pop: 180 },
  { country: "United States", continent: "Americas", year: 1970, gdp: 23000, life: 71, pop: 205 },
  { country: "United States", continent: "Americas", year: 1980, gdp: 28000, life: 74, pop: 227 },
  { country: "United States", continent: "Americas", year: 1990, gdp: 35000, life: 75, pop: 250 },
  { country: "United States", continent: "Americas", year: 2000, gdp: 45000, life: 77, pop: 282 },
  { country: "United States", continent: "Americas", year: 2010, gdp: 50000, life: 79, pop: 309 },
  { country: "United States", continent: "Americas", year: 2020, gdp: 55000, life: 77, pop: 331 },
  // China
  { country: "China", continent: "Asia", year: 1950, gdp: 450, life: 41, pop: 552 },
  { country: "China", continent: "Asia", year: 1960, gdp: 500, life: 44, pop: 660 },
  { country: "China", continent: "Asia", year: 1970, gdp: 680, life: 59, pop: 818 },
  { country: "China", continent: "Asia", year: 1980, gdp: 1100, life: 66, pop: 981 },
  { country: "China", continent: "Asia", year: 1990, gdp: 2000, life: 69, pop: 1135 },
  { country: "China", continent: "Asia", year: 2000, gdp: 4500, life: 72, pop: 1263 },
  { country: "China", continent: "Asia", year: 2010, gdp: 10000, life: 75, pop: 1338 },
  { country: "China", continent: "Asia", year: 2020, gdp: 17000, life: 77, pop: 1412 },
  // India
  { country: "India", continent: "Asia", year: 1950, gdp: 600, life: 36, pop: 376 },
  { country: "India", continent: "Asia", year: 1960, gdp: 700, life: 42, pop: 449 },
  { country: "India", continent: "Asia", year: 1970, gdp: 850, life: 48, pop: 555 },
  { country: "India", continent: "Asia", year: 1980, gdp: 1100, life: 54, pop: 697 },
  { country: "India", continent: "Asia", year: 1990, gdp: 1600, life: 58, pop: 873 },
  { country: "India", continent: "Asia", year: 2000, gdp: 2500, life: 63, pop: 1053 },
  { country: "India", continent: "Asia", year: 2010, gdp: 4800, life: 66, pop: 1234 },
  { country: "India", continent: "Asia", year: 2020, gdp: 6500, life: 70, pop: 1380 },
  // Nigeria
  { country: "Nigeria", continent: "Africa", year: 1950, gdp: 1100, life: 34, pop: 38 },
  { country: "Nigeria", continent: "Africa", year: 1960, gdp: 1200, life: 38, pop: 45 },
  { country: "Nigeria", continent: "Africa", year: 1970, gdp: 1800, life: 42, pop: 56 },
  { country: "Nigeria", continent: "Africa", year: 1980, gdp: 2400, life: 45, pop: 74 },
  { country: "Nigeria", continent: "Africa", year: 1990, gdp: 1700, life: 46, pop: 96 },
  { country: "Nigeria", continent: "Africa", year: 2000, gdp: 1900, life: 47, pop: 122 },
  { country: "Nigeria", continent: "Africa", year: 2010, gdp: 4800, life: 52, pop: 159 },
  { country: "Nigeria", continent: "Africa", year: 2020, gdp: 4900, life: 55, pop: 206 },
  // Brazil
  { country: "Brazil", continent: "Americas", year: 1950, gdp: 2400, life: 51, pop: 54 },
  { country: "Brazil", continent: "Americas", year: 1960, gdp: 3200, life: 55, pop: 72 },
  { country: "Brazil", continent: "Americas", year: 1970, gdp: 4800, life: 58, pop: 96 },
  { country: "Brazil", continent: "Americas", year: 1980, gdp: 7500, life: 62, pop: 121 },
  { country: "Brazil", continent: "Americas", year: 1990, gdp: 8200, life: 66, pop: 149 },
  { country: "Brazil", continent: "Americas", year: 2000, gdp: 9800, life: 70, pop: 175 },
  { country: "Brazil", continent: "Americas", year: 2010, gdp: 14000, life: 73, pop: 196 },
  { country: "Brazil", continent: "Americas", year: 2020, gdp: 14000, life: 74, pop: 213 },
  // Japan
  { country: "Japan", continent: "Asia", year: 1950, gdp: 3800, life: 61, pop: 84 },
  { country: "Japan", continent: "Asia", year: 1960, gdp: 7200, life: 68, pop: 94 },
  { country: "Japan", continent: "Asia", year: 1970, gdp: 14000, life: 72, pop: 104 },
  { country: "Japan", continent: "Asia", year: 1980, gdp: 20000, life: 76, pop: 117 },
  { country: "Japan", continent: "Asia", year: 1990, gdp: 30000, life: 79, pop: 124 },
  { country: "Japan", continent: "Asia", year: 2000, gdp: 33000, life: 81, pop: 127 },
  { country: "Japan", continent: "Asia", year: 2010, gdp: 36000, life: 83, pop: 128 },
  { country: "Japan", continent: "Asia", year: 2020, gdp: 40000, life: 85, pop: 126 },
  // South Africa
  { country: "South Africa", continent: "Africa", year: 1950, gdp: 4000, life: 45, pop: 14 },
  { country: "South Africa", continent: "Africa", year: 1960, gdp: 4800, life: 49, pop: 18 },
  { country: "South Africa", continent: "Africa", year: 1970, gdp: 6200, life: 53, pop: 23 },
  { country: "South Africa", continent: "Africa", year: 1980, gdp: 7500, life: 57, pop: 29 },
  { country: "South Africa", continent: "Africa", year: 1990, gdp: 7800, life: 62, pop: 37 },
  { country: "South Africa", continent: "Africa", year: 2000, gdp: 7400, life: 55, pop: 45 },
  { country: "South Africa", continent: "Africa", year: 2010, gdp: 11000, life: 56, pop: 52 },
  { country: "South Africa", continent: "Africa", year: 2020, gdp: 12000, life: 64, pop: 59 },
  // Sweden
  { country: "Sweden", continent: "Europe", year: 1950, gdp: 10000, life: 72, pop: 7 },
  { country: "Sweden", continent: "Europe", year: 1960, gdp: 14000, life: 73, pop: 8 },
  { country: "Sweden", continent: "Europe", year: 1970, gdp: 20000, life: 75, pop: 8 },
  { country: "Sweden", continent: "Europe", year: 1980, gdp: 24000, life: 76, pop: 8 },
  { country: "Sweden", continent: "Europe", year: 1990, gdp: 30000, life: 78, pop: 9 },
  { country: "Sweden", continent: "Europe", year: 2000, gdp: 36000, life: 80, pop: 9 },
  { country: "Sweden", continent: "Europe", year: 2010, gdp: 44000, life: 82, pop: 9 },
  { country: "Sweden", continent: "Europe", year: 2020, gdp: 52000, life: 83, pop: 10 },
]

const CONTINENT_COLORS = {
  "Americas": "#5DA5DA",
  "Asia": "#F15854",
  "Africa": "#B276B2",
  "Europe": "#FAA43A",
}

// ── Narration steps ─────────────────────────────────────────────────
// Each step: year, highlights, narration, and optional callout annotation
// anchored to a specific country's data point on the chart.

const STEPS = [
  {
    year: 1950,
    highlight: [],
    title: "1950: The Great Divide",
    narration:
      "In 1950, the world looks like two clusters. Rich countries in the upper-right live long and earn well. Everyone else is in the lower-left \u2014 poor and dying young. This is the \u2018us and them\u2019 Hans Rosling wanted to demolish.",
    callouts: [
      { country: "Sweden", label: "Rich, long-lived", dx: -10, dy: -30 },
      { country: "Nigeria", label: "Poor, short-lived", dx: 10, dy: 20 },
    ],
  },
  {
    year: 1960,
    highlight: ["Japan"],
    title: "1960: Japan Begins Its Climb",
    narration:
      "Watch Japan. Already richer than its Asian neighbors in 1950, by 1960 it is pulling away fast \u2014 GDP doubling in a decade. Its life expectancy jumps seven years. This is the postwar economic miracle in two numbers.",
    callouts: [
      { country: "Japan", label: "GDP doubled\nin one decade", dx: -20, dy: -35 },
    ],
  },
  {
    year: 1970,
    highlight: ["China"],
    title: "1970: China\u2019s Health Leap",
    narration:
      "China is still desperately poor \u2014 under $700 per person \u2014 but life expectancy has surged from 41 to 59. Public health campaigns (barefoot doctors, vaccination) moved the needle on mortality even without economic growth. Health can improve before wealth.",
    callouts: [
      { country: "China", label: "Life exp. +18 yrs\nGDP barely moved", dx: 20, dy: -30 },
    ],
  },
  {
    year: 1990,
    highlight: ["Brazil", "South Africa"],
    title: "1990: Two Middle-Income Stories",
    narration:
      "Brazil and South Africa sit at similar GDP levels in 1990. But Brazil\u2019s life expectancy is 66 while South Africa\u2019s is 62. In 10 years, their paths will diverge dramatically \u2014 the HIV/AIDS epidemic is about to rewrite South Africa\u2019s trajectory.",
    callouts: [
      { country: "Brazil", label: "Life exp. 66", dx: 15, dy: -25 },
      { country: "South Africa", label: "Life exp. 62\n\u2014 about to fall", dx: 15, dy: 20 },
    ],
  },
  {
    year: 2000,
    highlight: ["South Africa"],
    title: "2000: South Africa Falls Back",
    narration:
      "South Africa\u2019s life expectancy has dropped from 62 to 55 \u2014 one of the sharpest declines in modern history. GDP barely moved. The HIV/AIDS crisis did what no economic downturn could: pushed a country backward on the most fundamental measure of human welfare.",
    callouts: [
      { country: "South Africa", label: "Life exp. dropped\n62 \u2192 55 (HIV/AIDS)", dx: 15, dy: -30 },
    ],
  },
  {
    year: 2010,
    highlight: ["China", "India"],
    title: "2010: The Asian Giants Diverge",
    narration:
      "China has reached $10,000 GDP per capita. India, starting from a similar place in 1950, is at $4,800. But look at life expectancy \u2014 China 75, India 66. Same starting point, radically different paths.",
    callouts: [
      { country: "China", label: "$10k GDP, 75 yrs", dx: 15, dy: -25 },
      { country: "India", label: "$4.8k GDP, 66 yrs", dx: 15, dy: 20 },
    ],
  },
  {
    year: 2020,
    highlight: [],
    title: "2020: The Clusters Have Dissolved",
    narration:
      "The two-cluster world of 1950 is gone. Countries are spread across the space \u2014 there is no clean line between \u2018developed\u2019 and \u2018developing\u2019. China sits where Western Europe was in the 1990s. India is where Brazil was in the 1970s. Every country is on its own path.",
    callouts: [],
  },
]

// ── Trail data builder ──────────────────────────────────────────────

function buildTrail(country, upToYear) {
  return RAW
    .filter(d => d.country === country && d.year <= upToYear)
    .sort((a, b) => a.year - b.year)
}

// ── Component ───────────────────────────────────────────────────────

export default function RoslingBubbleChart({ width = 800 }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef(null)

  const step = STEPS[stepIdx]
  const year = step.year

  // Data for current year
  const currentData = useMemo(
    () => RAW.filter(d => d.year === year),
    [year]
  )

  // Annotations: combine country labels, callouts, and trail year markers
  const annotations = useMemo(() => {
    const result = []

    // 1. Country name labels on highlighted (or all, if none highlighted) bubbles
    for (const d of currentData) {
      const isHighlighted = step.highlight.length === 0 || step.highlight.includes(d.country)
      if (isHighlighted) {
        result.push({
          type: "widget",
          gdp: d.gdp,
          life: d.life,
          dx: d.pop > 500 ? 25 : 15,
          dy: -6,
          content: (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: CONTINENT_COLORS[d.continent],
              whiteSpace: "nowrap",
              textShadow:
                "0 0 4px var(--surface-1, white), 0 0 4px var(--surface-1, white), 0 0 4px var(--surface-1, white)",
            }}>
              {d.country}
            </span>
          ),
        })
      }
    }

    // 2. Callout annotations — editorial notes anchored to specific bubbles
    for (const callout of (step.callouts || [])) {
      const d = currentData.find(r => r.country === callout.country)
      if (!d) continue
      result.push({
        type: "widget",
        gdp: d.gdp,
        life: d.life,
        dx: callout.dx || 0,
        dy: callout.dy || 0,
        content: (
          <div style={{
            background: "var(--surface-2, #f0f1f3)",
            border: "1px solid var(--surface-3, #e2e4e8)",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 10,
            lineHeight: 1.35,
            color: "var(--text-primary, #1a1a2e)",
            whiteSpace: "pre-line",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            maxWidth: 140,
          }}>
            {callout.label}
          </div>
        ),
      })
    }

    // 3. Trail year markers — small year labels along each highlighted country's path
    for (const country of step.highlight) {
      const trail = buildTrail(country, year)
      for (const d of trail) {
        // Skip the current year (already labeled above)
        if (d.year === year) continue
        result.push({
          type: "widget",
          gdp: d.gdp,
          life: d.life,
          dx: 0,
          dy: -10,
          content: (
            <span style={{
              fontSize: 8,
              color: "var(--text-secondary, #6b7280)",
              fontWeight: 500,
              textShadow:
                "0 0 3px var(--surface-1, white), 0 0 3px var(--surface-1, white)",
            }}>
              {d.year}
            </span>
          ),
        })
      }
    }

    return result
  }, [currentData, step.highlight, step.callouts, year])

  // Canvas pre-renderer: draw trail lines for highlighted countries on the main chart
  const canvasPreRenderers = useMemo(() => {
    if (step.highlight.length === 0) return undefined
    return [
      (ctx, nodes, scales) => {
        if (!scales) return
        const xScale = scales.x
        const yScale = scales.y
        if (!xScale || !yScale) return

        for (const country of step.highlight) {
          const trail = buildTrail(country, year)
          if (trail.length < 2) continue
          const color = CONTINENT_COLORS[trail[0].continent] || "#999"

          // Draw the trail line
          ctx.beginPath()
          const x0 = xScale(trail[0].gdp)
          const y0 = yScale(trail[0].life)
          ctx.moveTo(x0, y0)
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(xScale(trail[i].gdp), yScale(trail[i].life))
          }
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.4
          ctx.setLineDash([4, 3])
          ctx.stroke()
          ctx.setLineDash([])

          // Draw small dots at each trail point
          for (let i = 0; i < trail.length - 1; i++) {
            const px = xScale(trail[i].gdp)
            const py = yScale(trail[i].life)
            ctx.beginPath()
            ctx.arc(px, py, 3, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.globalAlpha = 0.5
            ctx.fill()
          }
        }
        ctx.globalAlpha = 1
      },
    ]
  }, [step.highlight, year])

  // Playback
  const advance = useCallback(() => {
    setStepIdx(prev => {
      if (prev >= STEPS.length - 1) {
        setPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, 3500)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, advance])

  const chartHeight = Math.min(500, Math.round(width * 0.65))

  // Point style: dim non-highlighted countries
  const pointStyle = useMemo(() => {
    return (d) => {
      const highlighted = step.highlight.length === 0 || step.highlight.includes(d.country)
      return {
        fill: CONTINENT_COLORS[d.continent] || "#999",
        fillOpacity: highlighted ? 0.75 : 0.12,
        stroke: highlighted ? "var(--surface-0, white)" : "transparent",
        strokeWidth: highlighted ? 1.5 : 0,
      }
    }
  }, [step.highlight])

  return (
    <div>
      {/* Controls — uses CSS vars for dark mode */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 12,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            padding: "6px 16px", borderRadius: 4,
            border: "1px solid var(--surface-3, #e2e4e8)",
            background: playing ? "var(--surface-2, #f0f1f3)" : "var(--accent, #4f46e5)",
            color: playing ? "var(--text-primary, #1a1a2e)" : "white",
            fontWeight: 600, cursor: "pointer", fontSize: 13,
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        {STEPS.map((s, i) => (
          <button
            key={s.year}
            onClick={() => { setStepIdx(i); setPlaying(false) }}
            style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer",
              border: i === stepIdx
                ? "2px solid var(--accent, #4f46e5)"
                : "1px solid var(--surface-3, #e2e4e8)",
              background: i === stepIdx
                ? "var(--surface-2, #f0f1f3)"
                : "var(--surface-1, #f8f9fa)",
              fontWeight: i === stepIdx ? 700 : 400,
              color: i === stepIdx
                ? "var(--accent, #4f46e5)"
                : "var(--text-secondary, #6b7280)",
            }}
          >
            {s.year}
          </button>
        ))}
      </div>

      {/* Narration card */}
      <div style={{
        background: "var(--surface-2, #f0f1f3)",
        borderLeft: "4px solid var(--accent, #4f46e5)",
        padding: "12px 16px",
        marginBottom: 16,
        borderRadius: "0 6px 6px 0",
      }}>
        <div style={{
          fontWeight: 700, fontSize: 15, marginBottom: 4,
          color: "var(--accent, #4f46e5)",
        }}>
          {step.title}
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.55,
          color: "var(--text-primary, #1a1a2e)",
        }}>
          {step.narration}
        </div>
      </div>

      {/* Year indicator — large watermark behind chart */}
      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute",
          top: 20, right: 40,
          fontSize: Math.max(48, width * 0.08),
          fontWeight: 800,
          color: "var(--text-secondary, #6b7280)",
          opacity: 0.12,
          pointerEvents: "none",
          zIndex: 0,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}>
          {year}
        </div>

        {/* Main bubble chart */}
        <CategoryColorProvider colors={CONTINENT_COLORS}>
          <BubbleChart
            data={currentData}
            xAccessor="gdp"
            yAccessor="life"
            sizeBy="pop"
            sizeRange={[6, 50]}
            colorBy="continent"
            bubbleOpacity={0.75}
            xLabel="GDP per Capita (PPP, 2017$)"
            yLabel="Life Expectancy"
            width={width}
            height={chartHeight}
            margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
            showLegend
            legendInteraction="highlight"
            enableHover
            annotations={annotations}
            tooltip={(d) => (
              <div style={{
                background: "var(--surface-2, rgba(0,0,0,0.85))",
                color: "var(--text-primary, white)",
                border: "1px solid var(--surface-3, transparent)",
                padding: "8px 12px", borderRadius: 6, fontSize: 12,
                maxWidth: 200,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.country}</div>
                <div style={{ opacity: 0.8 }}>
                  GDP: ${d.gdp?.toLocaleString()}/capita
                </div>
                <div style={{ opacity: 0.8 }}>
                  Life expectancy: {d.life} years
                </div>
                <div style={{ opacity: 0.8 }}>
                  Population: {d.pop}M
                </div>
              </div>
            )}
            frameProps={{
              pointStyle,
              xScaleType: "log",
              ...(canvasPreRenderers && { canvasPreRenderers }),
            }}
          />
        </CategoryColorProvider>
      </div>
    </div>
  )
}
