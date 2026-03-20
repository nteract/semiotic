import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import RoslingBubbleChart from "../../examples/recipes/RoslingBubbleChart"

const fullSourceCode = `import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { BubbleChart, CategoryColorProvider } from "semiotic"

// ── Data (8 countries x 8 decades) ──────────────────────────────────
const RAW = [
  { country: "United States", continent: "Americas", year: 1950, gdp: 15000, life: 68, pop: 152 },
  { country: "China", continent: "Asia", year: 1950, gdp: 450, life: 41, pop: 552 },
  // ... see full source for all 64 rows
]

const CONTINENT_COLORS = {
  "Americas": "#5DA5DA", "Asia": "#F15854",
  "Africa": "#B276B2", "Europe": "#FAA43A",
}

// Each step: year, highlights, narration text, and callout annotations
const STEPS = [
  {
    year: 1950, highlight: [],
    title: "1950: The Great Divide",
    narration: "Rich countries upper-right, everyone else lower-left...",
    callouts: [
      { country: "Sweden", label: "Rich, long-lived", dx: -10, dy: -30 },
      { country: "Nigeria", label: "Poor, short-lived", dx: 10, dy: 20 },
    ],
  },
  // ... 7 steps total (see full source)
]

function buildTrail(country, upToYear) {
  return RAW.filter(d => d.country === country && d.year <= upToYear)
}

export default function RoslingBubbleChart({ width = 800 }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const step = STEPS[stepIdx]
  const currentData = RAW.filter(d => d.year === step.year)

  // Three layers of annotations on a single chart:
  const annotations = useMemo(() => {
    const result = []

    // 1. Country name labels (widget annotations at data coordinates)
    for (const d of currentData) {
      if (step.highlight.length === 0 || step.highlight.includes(d.country)) {
        result.push({
          type: "widget", gdp: d.gdp, life: d.life, dx: 15, dy: -6,
          content: <span style={{ fontSize: 11, fontWeight: 600,
            color: CONTINENT_COLORS[d.continent] }}>{d.country}</span>
        })
      }
    }

    // 2. Callout cards (editorial notes anchored to bubbles)
    for (const c of (step.callouts || [])) {
      const d = currentData.find(r => r.country === c.country)
      if (!d) continue
      result.push({
        type: "widget", gdp: d.gdp, life: d.life, dx: c.dx, dy: c.dy,
        content: (
          <div style={{
            background: "var(--surface-2)", border: "1px solid var(--surface-3)",
            borderRadius: 4, padding: "4px 8px", fontSize: 10, whiteSpace: "pre-line",
            color: "var(--text-primary)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}>{c.label}</div>
        ),
      })
    }

    // 3. Trail year markers (small dots with year labels along the path)
    for (const country of step.highlight) {
      const trail = buildTrail(country, step.year)
      for (const d of trail) {
        if (d.year === step.year) continue
        result.push({
          type: "widget", gdp: d.gdp, life: d.life, dx: 0, dy: -10,
          content: <span style={{ fontSize: 8, color: "var(--text-secondary)" }}>{d.year}</span>
        })
      }
    }
    return result
  }, [currentData, step])

  // Trail lines drawn via canvasPreRenderers (dashed path through GDP/life space)
  const canvasPreRenderers = useMemo(() => {
    if (step.highlight.length === 0) return undefined
    return [(ctx, nodes, scales) => {
      if (!scales?.xScale || !scales?.yScale) return
      for (const country of step.highlight) {
        const trail = buildTrail(country, step.year)
        if (trail.length < 2) continue
        const color = CONTINENT_COLORS[trail[0].continent]
        ctx.beginPath()
        ctx.moveTo(scales.xScale(trail[0].gdp), scales.yScale(trail[0].life))
        for (let i = 1; i < trail.length; i++)
          ctx.lineTo(scales.xScale(trail[i].gdp), scales.yScale(trail[i].life))
        ctx.strokeStyle = color; ctx.lineWidth = 2
        ctx.globalAlpha = 0.4; ctx.setLineDash([4, 3]); ctx.stroke()
        ctx.setLineDash([])
        // Small dots at each historical position
        for (let i = 0; i < trail.length - 1; i++) {
          ctx.beginPath()
          ctx.arc(scales.xScale(trail[i].gdp), scales.yScale(trail[i].life), 3, 0, Math.PI * 2)
          ctx.fillStyle = color; ctx.globalAlpha = 0.5; ctx.fill()
        }
      }
    }]
  }, [step])

  // Dim non-highlighted bubbles
  const pointStyle = (d) => ({
    fill: CONTINENT_COLORS[d.continent],
    fillOpacity: step.highlight.length === 0 || step.highlight.includes(d.country)
      ? 0.75 : 0.12,
    stroke: (step.highlight.length === 0 || step.highlight.includes(d.country))
      ? "var(--surface-0)" : "transparent",
  })

  return (
    <div>
      {/* Step controls + narration card + BubbleChart with all annotations */}
      <CategoryColorProvider colors={CONTINENT_COLORS}>
        <BubbleChart
          data={currentData} xAccessor="gdp" yAccessor="life" sizeBy="pop"
          sizeRange={[6, 50]} colorBy="continent" showLegend
          xLabel="GDP per Capita (PPP)" yLabel="Life Expectancy"
          width={width} height={500}
          annotations={annotations}
          frameProps={{ pointStyle, xScaleType: "log",
            ...(canvasPreRenderers && { canvasPreRenderers }) }}
        />
      </CategoryColorProvider>
    </div>
  )
}`

export default function RoslingBubbleChartPage() {
  return (
    <RecipeLayout
      title="Rosling Bubble Chart"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Rosling Bubble Chart", path: "/recipes/rosling-bubble-chart" },
      ]}
      prevPage={{ title: "Streaming Migration Map", path: "/recipes/streaming-migration-map" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        Hans Rosling's animated bubble charts are among the most celebrated data
        presentations ever made. But research consistently shows that the animation
        itself wasn't what made them work — <strong>Rosling's narration was</strong>.
        He directed attention, provided context, and created a story arc. Without
        him, viewers track 2-3 bubbles and miss everything else.
      </p>
      <p>
        This recipe reproduces the <em>value</em> of Rosling's presentation using
        Semiotic's annotation system directly on the chart — no live narrator
        required. Each step layers three annotation types on a single BubbleChart:
        country labels, editorial callout cards, and historical trail paths with
        year markers.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{
        background: "var(--surface-1)",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--surface-3)",
      }}>
        <RoslingBubbleChart />
      </div>

      <h2 id="why-animation-isnt-enough">Why Animation Isn't Enough</h2>
      <p>
        Robertson et al. (2008, IEEE InfoVis) found that participants were
        more accurate with <strong>small multiples</strong> than animation for trend analysis.
        Animation was rated as more "fun" but produced worse analytical performance. Tversky,
        Morrison & Betrancourt (2002) found that animation rarely improves understanding —
        and when it does, the benefit comes from <em>interactivity</em>, not motion.
      </p>
      <p>
        The core problem is <strong>change blindness</strong>: with 200 bubbles moving
        simultaneously, viewers can track at most 3-4 objects (Simons & Chabris, 1999).
        Everything else is lost. Rosling solved this by telling you exactly where to look —
        "Watch Bangladesh!" — turning an attention-overwhelmed animation into a guided experience.
      </p>

      <h2 id="anatomy">Anatomy</h2>
      <p>
        Everything lives on a single <code>BubbleChart</code>. The recipe layers four
        Semiotic features to replace what Rosling did with his voice:
      </p>
      <ol>
        <li>
          <strong>Widget annotations for country labels</strong> — <code>type: "widget"</code> annotations
          anchored to each bubble's data coordinates. These are the country names that appear
          next to highlighted bubbles, styled with the continent color and
          a <code>textShadow</code> halo for readability. Rosling pointed and said a name;
          the annotation does the same.
        </li>
        <li>
          <strong>Callout card annotations (editorial notes)</strong> — A second layer
          of <code>type: "widget"</code> annotations that render styled <code>&lt;div&gt;</code> cards
          with interpretation ("Life exp. +18 yrs / GDP barely moved"). These are the key
          insight Rosling would deliver verbally at each pause — now persistent and re-readable.
        </li>
        <li>
          <strong>Trail paths via <code>canvasPreRenderers</code></strong> — When countries are
          highlighted, a dashed line traces their historical path through GDP/life-expectancy space,
          drawn on the canvas layer <em>under</em> the bubbles. Small dots mark each decade.
          This converts ephemeral temporal data into a persistent spatial mark — the single
          most valuable analytical feature in Gapminder.
        </li>
        <li>
          <strong>Trail year markers</strong> — A third layer of widget annotations places
          tiny year labels at each historical position along the trail, so readers can see
          exactly when each shift happened without scrubbing.
        </li>
      </ol>
      <p>
        The narration card above the chart and the <code>pointStyle</code> function (which
        dims non-highlighted bubbles to 12% opacity) complete the picture. Together, these
        five elements do what Rosling did with his voice, laser pointer, and dramatic pauses.
      </p>

      <h2 id="what-rosling-did">What Rosling Actually Did</h2>
      <p>
        Rosling's presentations followed a precise rhetorical structure:
      </p>
      <ol>
        <li><strong>Setup:</strong> Establish a misconception ("You think of it as 'us and them'")</li>
        <li><strong>Complication:</strong> Show data that seems to confirm it (1950 clusters)</li>
        <li><strong>Turning point:</strong> "But then watch what happens..." (China's health leap, HIV crisis)</li>
        <li><strong>Resolution:</strong> Present-day reality that contradicts the opening (clusters dissolved)</li>
      </ol>
      <p>
        Crucially, he <strong>paused constantly</strong>. He never let the animation play
        straight through. Each pause was a moment to provide context, highlight a country,
        or foreshadow what was coming. The step-through controls in this recipe give readers
        the same editorial pacing — and the callout annotations deliver the interpretation
        he would have spoken aloud.
      </p>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr><th>What</th><th>Where</th><th>How</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Narration steps</td>
            <td><code>STEPS</code> array</td>
            <td>Add/edit steps with <code>year</code>, <code>highlight</code>, <code>callouts</code>, <code>narration</code></td>
          </tr>
          <tr>
            <td>Callout content</td>
            <td><code>step.callouts</code></td>
            <td>Each callout has <code>country</code>, <code>label</code>, <code>dx</code>/<code>dy</code> offset</td>
          </tr>
          <tr>
            <td>Trail appearance</td>
            <td><code>canvasPreRenderers</code></td>
            <td>Change dash pattern, line width, dot radius, or add gradient coloring</td>
          </tr>
          <tr>
            <td>Countries & data</td>
            <td><code>RAW</code> array</td>
            <td>Add more countries/years. Use real Gapminder data for production.</td>
          </tr>
          <tr>
            <td>Continent colors</td>
            <td><code>CONTINENT_COLORS</code></td>
            <td>Map of continent name to hex color</td>
          </tr>
          <tr>
            <td>Dim opacity</td>
            <td><code>pointStyle</code></td>
            <td>Change <code>0.12</code> to adjust non-highlighted bubble fade</td>
          </tr>
          <tr>
            <td>Log scale</td>
            <td><code>frameProps.xScaleType</code></td>
            <td>Rosling used log income — change to <code>"linear"</code> for linear GDP</td>
          </tr>
          <tr>
            <td>Playback speed</td>
            <td><code>setInterval</code> duration</td>
            <td>Change <code>3500</code> ms per step (longer = more reading time)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="extending">Extending This Pattern</h2>
      <ul>
        <li>
          <strong>Push API for smooth transitions:</strong> Instead of swapping <code>data</code> per
          step, use <code>ref.current.pushMany()</code> with <code>animate</code> to smoothly tween
          bubbles between positions. Add <code>pointIdAccessor="country"</code> so the chart tracks
          identity across frames.
        </li>
        <li>
          <strong>LinkedCharts + ContextLayout:</strong> Put the main bubble chart in the primary
          panel and a sparkline showing one country's GDP or life-expectancy trend in the context
          panel. Cross-link them with <code>linkedHover</code>.
        </li>
        <li>
          <strong>onObservation:</strong> Capture hover events to dynamically update the narration
          panel with country-specific facts — bringing the interactive dimension closer to
          Rosling's responsive commentary.
        </li>
      </ul>
      <p>
        The deeper lesson from Rosling: the chart is not the story. The chart is a
        stage. Annotations, highlighting, narration, and pacing are the performance.
        Semiotic gives you the stage and the spotlight — you provide the script.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/bubble-chart">Bubble Chart</Link> — size-encoded scatterplot</li>
        <li><Link to="/charts/scatterplot">Scatterplot</Link> — simpler point chart</li>
        <li><Link to="/features/linked-charts">Linked Charts</Link> — coordinated views</li>
        <li><Link to="/recipes/minards-map">Minard's Map</Link> — another narrative visualization recipe</li>
      </ul>
    </RecipeLayout>
  )
}
