import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import SatellitesInSpace from "../../examples/recipes/SatellitesInSpace"

const fullSourceCode = `import { NetworkCustomChart } from "semiotic/network"
import { packedClusterMatrix } from "semiotic/recipes"
import { generateSatellites, CATEGORY_COLORS, CLASS_ICONS, REGIONS, ORBITS } from "./satellites"

const data = generateSatellites() // [{ id, region, orbit, mass, category, klass, launch, uk }]

// One composite glyph per record, four data channels at once:
//   color = category   size = mass   shade = launch date
//   icon  = class  (most marks are plain circles; a few carry a stroked icon)
<NetworkCustomChart
  nodes={data}
  nodeIDAccessor="id"
  layout={packedClusterMatrix}
  width={1040}
  height={660}
  layoutConfig={{
    columnAccessor: "region",   // matrix columns
    rowAccessor: "orbit",       // stacked cells within a column
    sizeAccessor: "mass",       // glyph area
    colorAccessor: "category",  // glyph hue
    colorMap: CATEGORY_COLORS,
    iconAccessor: "klass",      // stroked icon INSIDE the filled circle ...
    iconMap: CLASS_ICONS,       // ... only for mapped classes (rest stay plain)
    shadeAccessor: "launch",    // glyph lightness (perceptual Lab shade)
    markerAccessor: "uk",       // white center dot for a flagged subset
    columnOrder: REGIONS,
    rowOrder: ORBITS,           // bottom -> top
    rowMode: "banded",          // aligned orbit bands: labels align, one border per band
    proportionExponent: 0.85,
    callouts: [{ field: "name", value: "Hubble Space Telescope", label: "Hubble" }],
  }}
  frameProps={{ background: "#0a1330", tooltipContent: (d) => /* ... */ null }}
/>`

export default function SatellitesInSpacePage() {
  return (
    <RecipeLayout
      title="Satellites in Space"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Satellites in Space", path: "/recipes/satellites-in-space" },
      ]}
      prevPage={{ title: "Rosling Bubble Chart", path: "/recipes/rosling-bubble-chart" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A recreation of the small-multiples beeswarm genre — in the spirit of Nadieh Bremer's{" "}
        <em>Satellites in Space</em> — built on <code>NetworkCustomChart</code> plus the new{" "}
        <code>packedClusterMatrix</code> recipe. Each of ~3,000 procedurally-generated satellites is
        a single composite glyph encoding <strong>four data channels at once</strong>: an icon
        (class), color (category), size (mass), and lightness shade (launch date). Columns are controlling regions;
        rows are orbital types. Hover any glyph for its details, hover the legend to isolate a
        category or class, and open it full screen.
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--surface-3)" }}>
        <SatellitesInSpace />
      </div>

      <h2 id="four-channels">Four channels on one composite glyph</h2>
      <p>
        The defining move of this graphic is a <strong>composite glyph</strong>: every mark carries
        hue, size, and shade, and a minority also carry a class icon — the &ldquo;most marks are
        plain circles, a few are marked&rdquo; model from the source:
      </p>
      <ul>
        <li>
          <strong>Icon → class.</strong> The base mark is always a filled circle. Only the classes in{" "}
          <code>iconMap</code> get an <em>unfilled, stroked</em> icon drawn inside the circle (Civil →
          star, Amateur → triangle, Defense → chevron); the dominant Business/commercial class stays a
          plain circle, so only ~20% of marks are iconed. The icon is rendered with the shared{" "}
          <code>symbolPathString</code> helper — the same path generator the legend uses.
        </li>
        <li>
          <strong>Color → category.</strong> A fixed semantic palette via{" "}
          <code>layoutConfig.colorMap</code>.
        </li>
        <li>
          <strong>Size → mass.</strong> An area-encoded radius scale (the same scale drives the
          graduated-circle legend).
        </li>
        <li>
          <strong>Shade → launch date.</strong> A continuous channel: the category hue is shaded
          lighter→darker by date. The <code>shade()</code> helper interpolates in{" "}
          <strong>CIELAB</strong>, so the hue stays put while only lightness moves — older satellites
          read as a paler tint, newer ones as a deeper shade.
        </li>
      </ul>
      <p>
        This composite (a hit-testable base mark + a decorator drawn in the overlay) is a pattern
        several recipes share — so the building blocks live in a small <em>recipe chrome kit</em>{" "}
        (<code>roundedEnclosure</code>, <code>bandLabel</code>, <code>markCallout</code>,{" "}
        <code>readField</code>) exported from <code>semiotic/recipes</code> for any custom layout to
        reuse.
      </p>

      <h2 id="mosaic-packing">Banded rows of packed clusters</h2>
      <p>
        <code>packedClusterMatrix</code> bins records into a column-per-<code>region</code>,
        cell-per-<code>orbit</code> matrix, then packs each cell as a beeswarm of variable-radius
        glyphs. In the default <code>rowMode: "banded"</code>, orbit rows are{" "}
        <strong>aligned global bands</strong>: every region shares one y-range per orbit, so the row
        labels line up, a single rounded enclosure spans the columns for each orbit, and a region&rsquo;s
        column is only as tall as its highest occupied orbit (so columns vary in height). Column
        widths track region counts, softened by <code>proportionExponent</code> so small regions like
        Japan stay legible. (<code>rowMode: "stacked"</code> instead sizes each column&rsquo;s cells by
        its own counts — closer to the source&rsquo;s organic mosaic, at the cost of aligned labels.)
      </p>
      <p>
        Packing is <strong>deterministic and self-contained</strong> — a seeded jittered-grid seed
        plus a few spatial-hash relaxation passes (no <code>d3-force</code> in the hot loop, which
        keeps it fast even in non-scope-hoisted bundles). A <code>maxAreaFraction</code> cap scales
        every radius down to a packable density so clusters never overlap, on any canvas size. The
        geometry is <strong>cached by a content signature</strong> of the layout-affecting inputs, so
        hovering the legend, isolating a category, or returning from full screen re-styles the marks
        without re-packing — only a genuine data or dimension change re-packs.
      </p>

      <h2 id="inherited">What the frame provides for free</h2>
      <p>
        The recipe is a pure layout function; everything around it comes from the{" "}
        <code>StreamNetworkFrame</code> the chart wraps. Hover hit-testing across all ~3,000 marks,
        tooltips, an accessible description and summary, reduced-motion / high-contrast handling,
        theming, and server-side SVG/PNG export are inherited — the engineering you'd otherwise
        hand-write around a bespoke D3 graphic. The cluster enclosures, column headers, and row
        labels are drawn in the layout's <code>overlays</code> layer (<code>pointer-events: none</code>),
        so they decorate without intercepting a hover.
      </p>

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
            <td>Class icon (composite glyph)</td>
            <td><code>iconAccessor</code> + <code>iconMap</code></td>
            <td>
              Stroked icon inside the filled circle; unmapped values stay plain. (Or{" "}
              <code>symbolAccessor</code>/<code>symbolMap</code> to make the base mark itself the shape.)
            </td>
          </tr>
          <tr>
            <td>Category hue</td>
            <td><code>layoutConfig.colorMap</code></td>
            <td>A fixed value→color map (wins over the theme palette)</td>
          </tr>
          <tr>
            <td>Shade ramp</td>
            <td><code>shadeAccessor</code> + <code>shadeStrength</code> / <code>shadeReverse</code></td>
            <td>Numeric or date field; CIELAB lightness ramp on the hue</td>
          </tr>
          <tr>
            <td>Row layout</td>
            <td><code>rowMode</code> + <code>cellSizing</code> + <code>proportionExponent</code></td>
            <td><code>"banded"</code> (aligned bands) or <code>"stacked"</code> (per-column heights)</td>
          </tr>
          <tr>
            <td>Packing density</td>
            <td><code>maxAreaFraction</code> + <code>packPadding</code> + <code>iterations</code></td>
            <td>Area cap (radii scale to fit), collision padding, relaxation passes</td>
          </tr>
          <tr>
            <td>Callouts</td>
            <td><code>layoutConfig.callouts</code></td>
            <td>Leader lines to named marks: <code>{`[{ field, value, label }]`}</code></td>
          </tr>
          <tr>
            <td>Legend highlight</td>
            <td><code>layoutConfig.highlight</code></td>
            <td>
              <code>{`{ field, value }`}</code> (or an array AND) dims every glyph that doesn't match
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/custom-charts/overview">Custom Charts</Link> — the customLayout escape hatch
        </li>
        <li>
          <Link to="/recipes/kstreams">Kafka Streams</Link> — another <code>NetworkCustomChart</code>{" "}
          recipe with composite glyphs
        </li>
        <li>
          <Link to="/recipes/rosling-bubble-chart">Rosling Bubble Chart</Link> — narrative,
          multi-channel scatter
        </li>
      </ul>
    </RecipeLayout>
  )
}
