import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { OrdinalCustomChart } from "../../../../src/components/charts/custom/OrdinalCustomChart"
import { bobaLayout } from "../../../../src/components/recipes/boba"

// Krist Wongsuphasawat's "Boba Science" menu: each drink's tea + tapioca + ice
// volumes (cm³). The layout solves a drink height from total volume and packs
// pearls / ice into the cup. Cup-size params fall back to the recipe defaults.
const bobaData = [
  { name: "Classic", teaVolume: 470, bobaVolume: 95, iceVolume: 60 },
  { name: "Extra Boba", teaVolume: 360, bobaVolume: 240, iceVolume: 45 },
  { name: "Light Ice", teaVolume: 500, bobaVolume: 95, iceVolume: 12 },
  { name: "Mega", teaVolume: 660, bobaVolume: 150, iceVolume: 120 },
]

const bobaCode = `import { OrdinalCustomChart } from "semiotic/ordinal"
import { bobaLayout } from "semiotic/recipes"

const drinks = [
  { name: "Classic",    teaVolume: 470, bobaVolume: 95,  iceVolume: 60 },
  { name: "Extra Boba", teaVolume: 360, bobaVolume: 240, iceVolume: 45 },
  { name: "Light Ice",  teaVolume: 500, bobaVolume: 95,  iceVolume: 12 },
  { name: "Mega",       teaVolume: 660, bobaVolume: 150, iceVolume: 120 },
]

<OrdinalCustomChart
  data={drinks}
  categoryAccessor="name"           // one cup per drink, on the band scale
  layout={bobaLayout}         // emits a transparent hit-rect per cup
  layoutConfig={{ categoryAccessor: "name" }}  // + the cup, tea, pearls, ice, straw as overlays
  width={760}
  height={420}
/>`

export default function CustomChartsExamplesPage() {
  return (
    <PageLayout
      title="Examples"
      subtitle="Worked custom-chart recipes, end to end"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Examples", path: "/custom-charts/examples" },
      ]}
      prevPage={{ title: "Recipe Chrome Kit", path: "/custom-charts/recipe-kit" }}
    >
      <section>
        <p>
          The escape-hatch HOCs (<code>XYCustomChart</code>, <code>OrdinalCustomChart</code>,{" "}
          <code>NetworkCustomChart</code>, <code>GeoCustomChart</code>) are at their best on charts the catalog can't draw. This
          page collects complete, copyable examples — a layout function plus the chart that hosts it.
        </p>
      </section>

      <section>
        <h2>Paris isometric landmarks</h2>
        <p>
          The full-bleed <Link to="/examples/paris-isometric-landmarks">Paris, Tile by Tile</Link>{" "}
          example uses <code>GeoCustomChart</code> and <code>isometricLandmarkLayout</code> to turn
          live geographic landmark candidates into a strategy-game board with replaceable pixel
          sprites and a deterministic offline fallback.
        </p>
      </section>

      <section>
        <h2>Boba cups</h2>
        <p>
          A pictorial bubble-tea chart from Krist Wongsuphasawat's{" "}
          <a href="https://observablehq.com/@kristw/boba-science" target="_blank" rel="noreferrer">
            Boba Science
          </a>
          . Each drink is one ordinal item on the band scale; its tea, tapioca, and ice volumes solve
          a drink height inside a conical-frustum cup. <code>bobaLayout</code> emits a
          transparent hit-rect per cup carrying the volumes and pearl/ice counts (so hover, tooltips,
          selection, SSR evidence, and transitions all work), and draws the cup silhouette, tea fill,
          tapioca pearls, ice cubes, lid, and straw as pointer-events-none SVG overlays keyed by drink.
        </p>
        <div style={{ margin: "1.5rem 0" }}>
          <OrdinalCustomChart
            data={bobaData}
            categoryAccessor="name"
            layout={bobaLayout}
            layoutConfig={{ categoryAccessor: "name" }}
            width={760}
            height={420}
            margin={{ top: 20, right: 20, bottom: 44, left: 20 }}
            enableHover
          />
        </div>
        <CodeBlock language="jsx">{bobaCode}</CodeBlock>
      </section>

      <section>
        <h2>The same chart, two ways</h2>
        <p>
          This boba chart also appears in the{" "}
          <Link to="/interoperability/gofish">GoFish DisplayList gallery</Link>, where it is{" "}
          <strong>hand-written as a DisplayList document</strong> — no Semiotic layout function at
          all, just emitted render-IR primitives that the GoFish adapter maps onto the same custom-layout
          surface. The two are worth comparing:
        </p>
        <ul>
          <li>
            <strong>Here (a Semiotic custom layout):</strong> you write a <code>layout(ctx)</code> that
            reads <code>ctx.scales</code> / <code>ctx.dimensions</code> and returns scene nodes +
            overlays. Semiotic owns the band scale, sizing, and re-layout; the cup geometry is yours.
          </li>
          <li>
            <strong>There (a hand-emitted DisplayList):</strong> you (or another tool) emit absolute-pixel
            primitives directly and the adapter renders them. No layout callback, no Semiotic scales —
            the document <em>is</em> the chart.
          </li>
        </ul>
        <p>
          Both land on the same runtime — hit-testing, tooltips, accessibility, SSR — which is the
          point: the custom-layout surface accepts either a layout function or a baked document.
        </p>
      </section>
    </PageLayout>
  )
}
