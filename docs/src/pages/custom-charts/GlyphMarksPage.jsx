import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Glyph, symbolPathString, makeShade, generateTokens } from "semiotic/recipes"

// A multi-part pictogram definition: parts declare role paints ("color" /
// "accent") and every stamp supplies the actual inks.
const FACTORY_SIGN = {
  viewBox: [40, 40],
  anchor: [0.5, 1],
  parts: [
    { d: "M7 4h6v16H7zM4 37V22l10-7v7l10-7v7l10-7v22z", fill: "color" },
    { d: "M9 28h5v5H9zM19 28h5v5h-5z", fill: "accent" },
  ],
}

const SHAPES = ["circle", "square", "triangle", "diamond", "star", "cross", "wye", "chevron"]
const HUE = "#7b52c9"
const ICONS = [
  { shape: null, label: "Business/​commercial" },
  { shape: "star", label: "Civil" },
  { shape: "triangle", label: "Amateur" },
  { shape: "chevron", label: "Defense" },
]

function ShapeSwatch({ shape, fill = HUE, stroke, size = 150, cell = 44 }) {
  const c = cell / 2
  return (
    <svg width={cell} height={cell} aria-hidden>
      <path
        d={symbolPathString(shape, size)}
        transform={`translate(${c},${c})`}
        fill={stroke ? "none" : fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.4 : 0}
      />
    </svg>
  )
}

function CompositeSwatch({ icon, cell = 44 }) {
  const c = cell / 2
  return (
    <svg width={cell} height={cell} aria-hidden>
      <circle cx={c} cy={c} r={cell * 0.34} fill={HUE} />
      {icon && (
        <path
          d={symbolPathString(icon, 90)}
          transform={`translate(${c},${c})`}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={1.2}
        />
      )}
    </svg>
  )
}

const swatchCol = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  color: "var(--text-2)",
  width: 64,
  textAlign: "center",
}

export default function GlyphMarksPage() {
  const shader = makeShade(HUE, 0.72)
  const ramp = [0, 0.25, 0.5, 0.75, 1]
  const factoryTokens = generateTokens(3.6, {
    tokenType: "glyph",
    tokenSemantics: "unitized-measure",
    countStrategy: "unitized",
    unitValue: 1,
    unitMeaning: "one sign = one factory",
  })
  return (
    <PageLayout
      title="Glyph Marks"
      subtitle="The per-datum shape channel for custom layouts"
      breadcrumbs={[
        { label: "Custom Charts", path: "/custom-charts/overview" },
        { label: "Glyph Marks", path: "/custom-charts/glyph-marks" },
      ]}
      prevPage={{ title: "Custom Layouts", path: "/custom-charts/custom-layouts" }}
      nextPage={{ title: "Recipe Decoration Kit", path: "/custom-charts/recipe-kit" }}
    >
      <section>
        <p>
          Stream marks were circles only. The <code>symbol</code> scene-node adds a{" "}
          <strong>per-datum shape channel</strong>: a glyph drawn from a <code>d3-shape</code>{" "}
          symbol path (or a custom path), painted on canvas <em>and</em> in SSR/SVG, and hit-tested
          + keyboard-navigated as a unit like any other mark. The path generator is exported so
          legends can match the marks exactly.
        </p>
        <p>
          It&rsquo;s a <strong>cross-pipeline primitive</strong>: network, XY, and ordinal custom
          layouts all emit it (one shared <code>symbolPath</code> implementation backs canvas, SVG,
          and hit-testing across every chart family), and{" "}
          <Link to="/charts/scatterplot">Scatterplot</Link> +{" "}
          <Link to="/charts/swarm-plot">SwarmPlot</Link> expose it as the <code>symbolBy</code>{" "}
          encoding — each mark becomes a glyph, with size still tracking <code>sizeBy</code>/
          <code>pointRadius</code>. Network layouts emit <code>{`{ cx, cy }`}</code>; XY/ordinal
          emit <code>{`{ x, y }`}</code>.
        </p>
      </section>

      <section>
        <h2>Named shapes</h2>
        <p>
          Eight named glyphs ship today (seven from <code>d3-shape</code> plus a custom{" "}
          <code>chevron</code>). <code>symbolPathString(name, size)</code> returns an
          origin-centered SVG path for any of them; <code>symbolExtent</code> gives its true radius
          (used by packing so pointy shapes don&rsquo;t overlap).
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "12px 0" }}>
          {SHAPES.map((s) => (
            <div key={s} style={swatchCol}>
              <ShapeSwatch shape={s} />
              <code>{s}</code>
            </div>
          ))}
        </div>
        <CodeBlock language="jsx">{`import { symbolPathString } from "semiotic/recipes"

// inside a network custom layout, emit a symbol scene node:
sceneNodes.push({
  type: "symbol", cx, cy, size: Math.PI * r * r,
  symbolType: "star",            // or a custom \`path\`
  style: { fill, opacity }, datum, id,
})`}</CodeBlock>
      </section>

      <section>
        <h2>Two encoding models</h2>
        <p>There are two ways to use shape, and they answer different design questions:</p>
        <ul>
          <li>
            <strong>Shape replaces the mark</strong> (<code>symbolAccessor</code> /{" "}
            <code>symbolMap</code>): the whole mark <em>is</em> the shape. Use when shape is a
            primary encoding and every datum should read as one of a few categories.
          </li>
          <li>
            <strong>Composite glyph</strong> (<code>iconAccessor</code> / <code>iconMap</code>): the
            base mark stays a filled circle and only mapped values get a stroked icon drawn inside.
            Use when most marks are alike and a minority are flagged — the &ldquo;mostly plain
            circles, a few are marked&rdquo; pattern.
          </li>
        </ul>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "12px 0" }}>
          {ICONS.map((it) => (
            <div key={it.label} style={swatchCol}>
              <CompositeSwatch icon={it.shape} />
              <span>{it.label}</span>
            </div>
          ))}
        </div>
        <p>
          The composite-glyph decorator is drawn in the layout&rsquo;s <code>overlays</code> layer
          (not as a second scene node), so it never becomes a duplicate hit/nav target over its own
          base mark. See it driving ~3,000 satellites on the{" "}
          <Link to="/recipes/satellites-in-space">Satellites in Space</Link> recipe.
        </p>
      </section>

      <section>
        <h2>
          Composite pictograms — the <code>glyph</code> node
        </h2>
        <p>
          Named shapes are single paths. The <code>glyph</code> scene node goes a step further: a{" "}
          <strong>multi-part vector pictogram</strong> — a <code>GlyphDef</code> of paths with{" "}
          <strong>role-token paints</strong> (<code>&quot;color&quot;</code> /{" "}
          <code>&quot;accent&quot;</code>), stamped per datum with each node&rsquo;s actual inks,
          the way a classic pictogram plate reused one cut in many colors. Definitions carry an{" "}
          <code>anchor</code> (feet-down signs stand on baselines and terrain) and a{" "}
          <code>fraction</code>/<code>fractionStart</code> window for <strong>partial fills</strong>{" "}
          with an optional <code>ghostColor</code> silhouette — the ISOTYPE partial-symbol
          convention used by unitized token records.
        </p>
        <p>
          It is a full citizen of the pipeline: canvas <em>and</em> SVG/SSR rendering, hit-testing
          and keyboard navigation over the drawn bounds, annotation anchoring by{" "}
          <code>pointId</code>/<code>id</code>, and enter/move/exit transition identity. All four
          custom-layout families emit it (network uses <code>cx</code>/<code>cy</code>; XY, ordinal,
          and geo use <code>x</code>/<code>y</code>), and the <code>&lt;Glyph&gt;</code> React
          component renders the same definition in overlays, legends, recipe icon callbacks, and
          page decoration — one definition, no drift.
        </p>
        <p>
          For higher-level isotype and icon-array work, <code>tokenLayer</code> adds the semantic
          contract above the tallying math: a token says whether it is an observed unit, a unitized
          measure, a possible outcome, or a risk case, then the layer places and stamps dots, icons,
          or <code>glyph</code> scene nodes.
        </p>
        <div style={{ margin: "12px 0" }}>
          <svg
            width={230}
            height={52}
            aria-label="Three and six-tenths factory signs: three solid, one partial"
          >
            {factoryTokens.tokens.map((sign) => (
              <Glyph
                key={sign.index}
                def={FACTORY_SIGN}
                x={sign.index * 56}
                y={4}
                size={44}
                color={HUE}
                accent="#ffffff"
                fraction={sign.fraction}
                ghostColor={sign.fraction < 1 ? "rgba(123, 82, 201, 0.22)" : undefined}
              />
            ))}
          </svg>
          <div style={{ fontSize: 11, color: "var(--text-2)" }}>
            <code>generateTokens(3.6, {`{ countStrategy: "unitized", unitValue: 1 }`})</code> →
            three solid signs and a 60% sign with a ghost silhouette. Symbols repeat; they do not
            grow.
          </div>
        </div>
        <CodeBlock language="jsx">{`import { tokenLayer } from "semiotic/recipes"

const SERVER_SIGN = {
  viewBox: [40, 40],
  anchor: [0.5, 1],                      // feet land on (x, y)
  parts: [
    { d: "M8 3h24v34H8z", fill: "color" },
    { d: "M12 9h16v5H12z…", fill: "accent" },
  ],
}

// inside any custom layout: describe the token semantics, then stamp glyphs
const serverLayer = tokenLayer({
  input: site.powerMW,
  encoding: {
    tokenType: "glyph",
    tokenSemantics: "unitized-measure",
    countStrategy: "unitized",
    unitValue: 100,
    unitMeaning: "one server sign = 100 MW",
  },
  options: {
    x, y: terrainY - 40, columns: 4, cellWidth: 12, cellHeight: 12, anchor: [0.5, 1],
    tokenSize: 11,
    glyph: SERVER_SIGN,
    color: statusColor,
    accent: "#fff",
    ghostColor: paperDeep,
    datum: site,
    idPrefix: site.id,
  },
})
nodes.push(
  ...serverLayer.nodes,
)

// the same definition, as React decoration (legends, overlays, prose):
import { Glyph } from "semiotic/recipes"
<Glyph def={SERVER_SIGN} size={14} color="#34383b" />`}</CodeBlock>
        <p>
          See the whole system at work on{" "}
          <Link to="/examples/data-centers-isotype">The Buildings Behind AI</Link> and{" "}
          <Link to="/examples/lake-travis-isotype">Lake Travis, in Signs</Link> — relief-section
          maps, unit grids, and process pictures built from one shared sign set.
        </p>
      </section>

      <section>
        <h2>Shade — a continuous channel on a hue</h2>
        <p>
          Pair shape with <code>shade</code> / <code>makeShade</code>, which interpolate a
          hue&rsquo;s lightness in <strong>CIELAB</strong> so the hue stays put while only lightness
          moves — a categorical color can then carry a second continuous channel (age, recency,
          magnitude):
        </p>
        <div
          style={{
            display: "flex",
            gap: 0,
            margin: "12px 0",
            borderRadius: 6,
            overflow: "hidden",
            width: "fit-content",
          }}
        >
          {ramp.map((t) => (
            <div
              key={t}
              style={{ width: 56, height: 28, background: shader(t) }}
              title={`t=${t}`}
            />
          ))}
        </div>
        <CodeBlock language="jsx">{`import { makeShade } from "semiotic/recipes"
const shade = makeShade("#7b52c9")   // capture once per hue
const fill = shade(t)                 // t in [0,1]: 0 lighter, 1 darker`}</CodeBlock>
      </section>
    </PageLayout>
  )
}
