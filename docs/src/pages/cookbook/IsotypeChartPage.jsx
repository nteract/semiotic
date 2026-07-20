import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import IsotypeChart from "../../examples/IsotypeChart"

export default function IsotypeChartPage() {
  return (
    <PageLayout
      title="Isotype Chart"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Isotype Chart", path: "/cookbook/isotype-chart" },
      ]}
      prevPage={{ title: "Radar Plot", path: "/cookbook/radar-plot" }}
    >
      <p>
        Isotype charts replace abstract magnitudes with repeated semantic tokens: one visible sign
        can mean one observed person, one bundled unit, one possible outcome, or one case in a risk
        grid. Modern Semiotic isotype work uses reusable <code>glyph</code> scene nodes plus token
        helpers from <code>semiotic/recipes</code>, so those semantics stay explicit instead of
        being hidden inside a drawing overlay.
      </p>

      <h2 id="the-visualization">The Visualization</h2>
      <div
        style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid var(--surface-3)",
        }}
      >
        <IsotypeChart />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The example is an <code>OrdinalCustomChart</code>. The layout emits one transparent
        <code>hitTargetRect</code> per column so hover, focus, and annotations resolve to the
        meaningful bin, then emits datum-less <code>glyph</code> scene nodes for each visible person
        sign. The running example passes the observed people for each bin into{" "}
        <code>tokenLayer</code>, which creates explicit <code>observed-unit</code> tokens before the
        custom layout places them on the ordinal scale:
      </p>
      <CodeBlock
        code={`import {
  hitTargetRect,
  tokenLayer
} from "semiotic/recipes"

function isotypeGlyphLayout(ctx) {
  const bandWidth = ctx.scales.o.bandwidth()
  const chartHeight = ctx.dimensions.plot.height
  const unitHeight = Math.abs(ctx.scales.r(0) - ctx.scales.r(1))
  const glyphSize = Math.max(1, Math.min(unitHeight - 2, bandWidth * 0.8 * (40 / 18)))

  const hitTargets = ctx.data.map((column) => {
    const x = ctx.scales.o(column.bin) || 0
    return hitTargetRect({
      x,
      y: 0,
      width: bandWidth,
      height: chartHeight,
      datum: column,
      id: column.bin,
    })
  })

  const glyphs = ctx.data.flatMap((column) => {
    const x0 = ctx.scales.o(column.bin) || 0
    return tokenLayer({
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
        color: (unit) => ctx.resolveColor(unit.datum.type),
        datum: null,
        idPrefix: column.bin,
        positionToken: (unit) => {
          const cellTop = ctx.scales.r(unit.index + 1)
          return {
            x: x0 + bandWidth / 2,
            y: cellTop + (unitHeight - glyphSize) / 2 + glyphSize,
            row: unit.index,
            column: 0,
          }
        },
      },
    }).nodes
  })

  return { nodes: [...hitTargets, ...glyphs] }
}`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Custom chart as backbone</strong> — the frame provides scales, margins,
          responsiveness, hover/focus plumbing, and annotations; the custom layout controls the
          repeated signs.
        </li>
        <li>
          <strong>Token semantics are explicit</strong> — <code>observed-unit</code>,
          <code>unitized-measure</code>, <code>risk-case</code>, and
          <code>possible-outcome</code> describe what a repeated mark means before it is drawn.
        </li>
        <li>
          <strong>Glyphs are real scene nodes</strong> — they render on canvas and SSR/SVG, carry
          stable transition identity, and share the same <code>GlyphDef</code> used in legends and
          page decoration.
        </li>
        <li>
          <strong>One hit target per logical mark</strong> — repeated signs can be datum-less while
          an invisible target represents the whole bin for accessible interaction.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/custom-charts/glyph-marks">Glyph Marks</Link> — composite pictograms and token
          fills
        </li>
        <li>
          <Link to="/custom-charts/recipe-kit">Recipe Decoration Kit</Link> — token and glyph helpers
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — continuous comparison alternative
        </li>
      </ul>
    </PageLayout>
  )
}
