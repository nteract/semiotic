import React from "react"
import { Link } from "react-router-dom"
import MinardsMarch from "../../examples/recipes/MinardsMarch.js"
import MinardsMarchStreaming from "../../examples/recipes/MinardsMarchStreaming.js"

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function Body() {
  return (
    <>
      <p>
        Charles Joseph Minard's 1869 flow map of Napoleon's Russian campaign is one of the
        most-cited visualizations in the history of statistical graphics. Tufte called it "the best
        statistical graphic ever drawn." It packs six variables into a single image: the path of the
        army, the direction of march, the size of the army at each point, the location of each town,
        temperature on the retreat, and time. The chart is what data visualization can be when every
        line on the page is doing structural work.
      </p>
      <p>
        This entry is a faithful recreation in Semiotic using the{""}
        <Link to="/charts/flow-map">FlowMap</Link> component with a tile basemap and animated
        particles, cross-linked with a{" "}
        <Link to="/charts/connected-scatterplot">ConnectedScatterplot</Link> of temperature vs.
        casualties. The point of recreating Minard isn't nostalgia: doing it forces you to use every
        composition primitive Semiotic ships (linked hover, shared categories, geo + XY in the same
        view, particle systems for direction-on-static-paths) which is exactly the bundle most real
        dashboards need.
      </p>
      <h2 id="why-care">Why this matters</h2>
      <p>
        Minard's map argues that "data visualization" isn't about chart types but rather about chart
        strategies. The encoding doesn't fight the data. The composition isn't "a map plus a line
        chart"; it's a single graphic where the geographic shape carries the spatial story and the
        temperature strip carries the punchline. When you compose Semiotic charts via{" "}
        <Link to="/features/linked-charts">LinkedCharts</Link> and{" "}
        <Link to="/features/category-color-provider">CategoryColorProvider</Link>, you're reaching
        for the same trick: two charts sharing a coordinate system and a categorical encoding so
        they read as one composition.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={chartFrame}>
        <MinardsMarch />
      </div>

      <h2 id="anatomy">Anatomy</h2>
      <p>The recipe layers four Semiotic features:</p>
      <ol>
        <li>
          <strong>FlowMap + tiles</strong> use flow edges with <code>strokeWidth</code> proportional
          to troop survivors (Minard's signature encoding), rendered over an OpenStreetMap basemap
          via <code>tileURL</code>.
        </li>
        <li>
          <strong>Particles</strong> uses <code>showParticles</code> to animate dots flowing along
          each route segment, giving the static map a sense of movement and direction.
        </li>
        <li>
          <strong>ConnectedScatterplot</strong> presents Minard's original (and to be clear
          orientalist) claim that it was the weather that defeated Napoleon and not the Russians.
          The retreat temperature/casualty relationship is rendered as a connected scatterplot
          (viridis-colored by order). The 4:1 aspect ratio echoes Minard's original strip chart
          below the map.
        </li>
        <li>
          <strong>LinkedCharts</strong> means that hovering on a flow segment on the map highlights
          the corresponding city in the scatterplot, and vice versa.
        </li>
      </ol>

      <h2 id="customization">Customization</h2>
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>What</th>
            <th>Where</th>
            <th>How</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Flow thickness</td>
            <td>
              <code>edgeWidthRange</code>
            </td>
            <td>
              Set <code>[min, max]</code> pixel width (default: <code>[1, 8]</code>)
            </td>
          </tr>
          <tr>
            <td>Advance/retreat colors</td>
            <td>
              <code>CategoryColorProvider</code>
            </td>
            <td>
              Change the <code>colors</code> map (default: tan + black)
            </td>
          </tr>
          <tr>
            <td>Particle speed</td>
            <td>
              <code>particleStyle.speedMultiplier</code>
            </td>
            <td>Higher = faster flow animation</td>
          </tr>
          <tr>
            <td>Tile provider</td>
            <td>
              <code>tileURL</code>
            </td>
            <td>Replace with Stadia, CartoDB, or custom tile server</td>
          </tr>
          <tr>
            <td>Scatterplot height</td>
            <td>
              <code>chartHeight</code>
            </td>
            <td>
              Change the ratio (default: <code>width * 0.22</code>)
            </td>
          </tr>
          <tr>
            <td>Cross-highlight fields</td>
            <td>
              <code>linkedHover.fields</code>
            </td>
            <td>Change which fields link the two charts</td>
          </tr>
        </tbody>
      </table>

      <h2 id="how-it-works">How it works</h2>
      <p>
        <code>FlowMap</code> converts node coordinates + flow edges into projected line segments on
        a Mercator tile basemap. The <code>lineStyle</code> function in <code>frameProps</code> maps{" "}
        <code>survivors</code> to <code>strokeWidth</code>, reproducing Minard's proportional-width
        encoding.
      </p>
      <p>
        <code>showParticles</code> enables the geo particle system, which spawns dots that travel
        along each polyline path. Particle color inherits from the line stroke when set to{" "}
        <code>"source"</code>.
      </p>
      <p>
        The <code>ConnectedScatterplot</code> below plots retreat cities ordered by stage, with
        temperature on the x-axis and surviving troops on the y-axis. Viridis coloring encodes the
        progression from Moscow (purple) to Kowno (yellow).
      </p>
      <p>
        Both charts share the <code>"city-hl"</code> selection via <code>LinkedCharts</code>.
        Hovering either chart highlights matching data in the other.
      </p>

      <h2 id="streaming">Streaming version</h2>
      <p>
        The same campaign data can be plotted progressively using <code>StreamGeoFrame</code> and{" "}
        <code>ConnectedScatterplot</code>. Each step adds a march segment to the map using the push
        API. The retreat scatterplot appears once the army turns back from Moscow.
      </p>
      <div style={chartFrame}>
        <MinardsMarchStreaming />
      </div>
      <p>
        Use <strong>Play</strong> for automatic playback (600 ms per segment), <strong>Step</strong>{" "}
        to advance one segment at a time, or <strong>Reset</strong> to start over. The map uses
        bounded <code>lines</code> and <code>points</code> props that grow with each step, while the
        scatterplot accumulates retreat data points as they are revealed.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/flow-map">Flow Map</Link> — geographic flow visualization
        </li>
        <li>
          <Link to="/charts/tile-map">Tile Maps</Link> — raster basemap tiles
        </li>
        <li>
          <Link to="/charts/connected-scatterplot">Connected Scatterplot</Link> — ordered point
          sequences
        </li>
        <li>
          <Link to="/features/linked-charts">Linked Charts</Link> — coordinated views
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "minards-march",
  title: "Minard's March, rebuilt in Semiotic",
  subtitle:
    "A faithful recreation of the 1869 flow map of Napoleon's Russian campaign using FlowMap with tile basemap and particles, cross-linked with a ConnectedScatterplot temperature strip.",
  author: "Elijah Meeks",
  date: "2026-04-22",
  tags: ["case-study", "geo", "tutorial"],
  excerpt:
    "Tufte called Minard's chart \"the best statistical graphic ever drawn.\" Rebuilding it is the cleanest way to learn Semiotic's composition primitives using FlowMap with tiles, particles, a linked ConnectedScatterplot, and shared categorical colors all in one page.",
  component: Body,
  ogChart: {
    component: "MinardsMarch",
  },
}
