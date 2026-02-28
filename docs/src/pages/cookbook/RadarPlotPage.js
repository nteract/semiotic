import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import RadarPlot from "../../examples/RadarPlot"

export default function RadarPlotPage() {
  return (
    <PageLayout
      title="Radar Plot"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Radar Plot", path: "/cookbook/radar-plot" },
      ]}
      prevPage={{ title: "Timeline", path: "/cookbook/timeline" }}
      nextPage={{ title: "Isotype Chart", path: "/cookbook/isotype-chart" }}
    >
      <p>
        Radar charts (also called spider or star charts) compare multiple
        quantitative attributes across several entities, making it easy to spot
        which entity excels in which dimension. This recipe uses OrdinalFrame's
        radial projection with connectors to create a Pokemon stat comparison
        chart.
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
        <RadarPlot />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The radar chart is simply an OrdinalFrame with{" "}
        <code>projection: "radial"</code>. Each attribute (attack, defense,
        speed, etc.) becomes an ordinal category arranged around the circle,
        and each Pokemon's stats become connected points:
      </p>
      <CodeBlock
        code={`oAccessor: "attribute",
rAccessor: "value",
rExtent: [0],
type: "point",
projection: "radial",
connectorType: d => d.name,
connectorStyle: d => ({
  fill: d.source.color,
  stroke: d.source.color,
  strokeOpacity: 0.5,
  fillOpacity: 0.5
}),
pieceHoverAnnotation: true`}
        language="jsx"
      />
      <p>
        The <code>connectorType</code> function returns the Pokemon name,
        linking the same Pokemon's stats across attributes into a filled
        polygon. Each connector is styled with the entity's color at half
        opacity so overlapping shapes remain visible:
      </p>
      <CodeBlock
        code={`style: d => ({
  fill: d.color,
  stroke: "white",
  strokeOpacity: 0.5
}),
oLabel: true,
foregroundGraphics: [
  <g transform="translate(400, 73)" key="legend">
    <text fill={theme[3]}>Pikachu</text>
    <text y={20} fill={theme[2]}>Bulbasaur</text>
    <text y={40} fill={theme[1]}>Charmander</text>
    <text y={60} fill={theme[4]}>Squirtle</text>
  </g>
]`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Setting <code>projection: "radial"</code> on OrdinalFrame turns any
          ordinal layout into a circular (radar) chart.
        </li>
        <li>
          <code>connectorType</code> with a grouping key creates filled
          polygons connecting an entity's values across all axes.
        </li>
        <li>
          Radar charts work best when all attributes share the same scale
          (all starting from zero with comparable ranges).
        </li>
        <li>
          <code>pieceHoverAnnotation</code> enables hover tooltips on
          individual data points within the radar.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          frame with radial projection
        </li>
        <li>
          <Link to="/cookbook/slope-chart">Slope Chart</Link> — another
          multi-entity comparison using connectors
        </li>
        <li>
          <Link to="/cookbook/bar-to-parallel">Bar to Parallel</Link> — shows
          radial projection as the final step in iterative design
        </li>
      </ul>
    </PageLayout>
  )
}
