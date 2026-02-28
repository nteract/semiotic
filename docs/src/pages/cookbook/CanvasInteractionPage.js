import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

import CanvasInteraction from "../../examples/CanvasInteraction"

export default function CanvasInteractionPage() {
  return (
    <PageLayout
      title="Canvas Interaction"
      breadcrumbs={[
        { label: "Cookbook", path: "/cookbook" },
        { label: "Canvas Interaction", path: "/cookbook/canvas-interaction" },
      ]}
      prevPage={{ title: "Homerun Map", path: "/cookbook/homerun-map" }}
      nextPage={{
        title: "Uncertainty Visualization",
        path: "/cookbook/uncertainty-visualization",
      }}
    >
      <p>
        When your dataset has tens of thousands of points, SVG rendering becomes
        slow and the DOM balloons in size. This recipe shows how to render
        nearly 54,000 diamond data points on a canvas element while still
        retaining full hover interactivity through Semiotic's Voronoi-based
        interaction layer.
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
        <CanvasInteraction />
      </div>

      <h2 id="how-it-works">How It Works</h2>
      <p>
        The entire trick is the <code>canvasPoints</code> prop. When set to{" "}
        <code>true</code>, XYFrame draws points to a canvas element instead of
        creating individual SVG circles. The interaction layer still uses an SVG
        overlay with a Voronoi tessellation, so hover and click behaviors work
        seamlessly:
      </p>
      <CodeBlock
        code={`const frameProps = {
  size: [700, 500],
  points: parsedDiamonds, // ~54,000 points
  xAccessor: "x",
  yAccessor: "y",
  canvasPoints: true,
  hoverAnnotation: true,
  pointStyle: d => ({
    fill: d.color,
    fillOpacity: 0.9
  })
}`}
        language="jsx"
      />
      <p>
        The tooltip uses <code>coincidentPoints</code> to show when multiple
        diamonds overlap at the same location, since with this many data points
        collisions are inevitable:
      </p>
      <CodeBlock
        code={`tooltipContent: d => (
  <div className="tooltip-content">
    <p>Price: \${d.y}</p>
    <p>Carat: {d.x}</p>
    <p>
      {d.coincidentPoints.length > 1 &&
        \`+\${d.coincidentPoints.length - 1} more\`}
    </p>
  </div>
)`}
        language="jsx"
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Use <code>canvasPoints</code> (or <code>canvasLines</code>,{" "}
          <code>canvasAreas</code>) to switch from SVG to canvas rendering for
          large datasets.
        </li>
        <li>
          Hover interactions work the same way regardless of render mode --
          Semiotic's Voronoi layer operates independently of the rendering
          target.
        </li>
        <li>
          The <code>coincidentPoints</code> property on hover data helps you
          handle overlapping points gracefully.
        </li>
        <li>
          Loading data asynchronously (via fetch/CSV parse) keeps the component
          responsive during initial render.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying frame
          with canvas rendering support
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — point-based
          visualization at smaller scales
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — customizing tooltip
          content and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
