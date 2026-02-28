import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import HomerunMap from "../../examples/HomerunMap"

export default function HomerunMapPage() {
  return (
    <PageLayout
      title="Homerun Map"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Homerun Map", path: "/cookbook/homerun-map" },
      ]}
      prevPage={{
        title: "Candlestick Chart",
        path: "/cookbook/candlestick-chart",
      }}
      nextPage={{
        title: "Canvas Interaction",
        path: "/cookbook/canvas-interaction",
      }}
    >
      <p>
        Sometimes your scatter plot data lives in a spatial context -- a
        baseball field, a floor plan, or a geographic region. This recipe shows
        how to overlay XYFrame point data on a custom background graphic,
        creating a spatial data visualization of Giancarlo Stanton's home runs
        plotted on a baseball diamond.
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
        <HomerunMap />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The <code>backgroundGraphics</code> prop on XYFrame accepts any React
        node and renders it behind the data layer. Here it is an SVG group
        containing the baseball field outline. Points are then positioned using
        their spatial coordinates (<code>bx</code> and <code>by</code>):
      </p>
      <CodeBlock
        code={`const frameProps = {
  points: data,
  xAccessor: "bx",
  yAccessor: "by",
  yExtent: [-50],
  backgroundGraphics: fieldGraphic,
  hoverAnnotation: true,
  pointStyle: d => ({
    fill: velocityScale(d.exit_velocity),
    r: 6
  })
}`}
        language="jsx"
      />
      <p>
        The point color is driven by a continuous scale mapping exit velocity to
        a color range, making it easy to see which home runs were hit hardest.
        Annotations use the <code>enclose</code> type to circle groups of
        interesting points:
      </p>
      <CodeBlock
        code={`annotations: [{
  type: "enclose",
  dy: -120,
  dx: -1,
  note: {
    padding: 10,
    align: "middle",
    label: "Shortest distance home runs."
  },
  connector: { end: "dot" },
  coordinates: [{ bx: 235, by: 250 }, { bx: 235, by: 275 }]
}]`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use <code>backgroundGraphics</code> to place any SVG or HTML content
          behind your data layer, enabling spatial visualizations.
        </li>
        <li>
          Continuous color scales (via d3-scale) can encode a quantitative
          dimension on each point beyond x and y position.
        </li>
        <li>
          The <code>enclose</code> annotation type automatically draws a hull
          around a set of coordinates, useful for calling out clusters.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying frame for
          point and line data
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — simpler point-based
          XY visualization
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding callouts,
          highlights, and enclosures
        </li>
      </ul>
    </PageLayout>
  )
}
