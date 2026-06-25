import React, { useMemo, useState } from "react"
import { NetworkCustomChart } from "../../../../src/components/charts/custom/NetworkCustomChart"
import {
  EXPERIMENTAL_GOFISH_ADAPTER_NAME,
  unstable_fromGofishIR,
  unstable_gofishIRExamples as gofishIRExamples,
} from "../../../../src/components/semiotic-experimental"
import {
  buildTooltipEntries,
  extractTooltipDatum,
  formatTooltipValue,
} from "semiotic/recipes"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

// Each demo is a *baked GoFish DisplayList* — the flat, viewport-locked list of
// absolute-pixel primitives that `gofish-graphics`' toDisplayList({ w, h })
// emits after its layout solve. The page runs each through
// `unstable_fromGofishIR` to obtain a NetworkCustomChart layout + the node rows.
const demoOrder = gofishIRExamples.map((e) => e.key)
const exampleByKey = Object.fromEntries(gofishIRExamples.map((e) => [e.key, e]))

function initialDemoKey() {
  if (typeof window === "undefined") return demoOrder[0]
  const key = window.location.hash.replace(/^#/, "")
  return demoOrder.includes(key) ? key : demoOrder[0]
}

// The DisplayList JSON can be long (a treemap is one item per passenger). Show
// the viewport + a leading slice of items so the spec stays readable.
function irForDisplay(doc) {
  const head = doc.items.slice(0, 6)
  const shown = {
    irVersion: doc.irVersion,
    ir: doc.ir,
    viewport: doc.viewport,
    items:
      doc.items.length > head.length
        ? [...head, `…and ${doc.items.length - head.length} more items`]
        : head,
  }
  return JSON.stringify(shown, null, 2)
}

function summariseKinds(doc) {
  const kinds = {}
  let nodes = 0
  for (const it of doc.items) {
    kinds[it.kind] = (kinds[it.kind] ?? 0) + 1
    if ((it.role ?? "node") === "node" && it.datum) nodes += 1
  }
  return { kinds, nodes }
}

function GoFishTooltip(hover) {
  const entries = buildTooltipEntries(hover, { maxEntries: 8 })
  if (!entries.length) return null
  return (
    <div
      className="semiotic-tooltip"
      style={{
        background: "var(--semiotic-tooltip-bg, var(--surface-1, #fff))",
        color: "var(--semiotic-tooltip-color, var(--text-primary, #222))",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--semiotic-tooltip-border, var(--border-color, #d8dee4))",
        borderRadius: 6,
        boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 10px rgba(0,0,0,0.16))",
        padding: "8px 10px",
        fontSize: 12,
        maxWidth: 260,
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.key}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(62px, auto) 1fr",
            columnGap: 8,
            rowGap: 4,
            overflowWrap: "anywhere",
          }}
        >
          <strong>{entry.label}</strong>
          <span>{entry.formatted}</span>
        </div>
      ))}
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--semiotic-primary, #4e79a7)" : "var(--border-color, #d8dee4)",
        background: active ? "var(--semiotic-primary, #4e79a7)" : "var(--surface-1, #fff)",
        color: active ? "#fff" : "var(--text-primary, #222)",
        borderRadius: 8,
        padding: "8px 11px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

export default function GoFishLayoutsPage() {
  const [active, setActive] = useState(initialDemoKey)
  const [observed, setObserved] = useState(null)

  const example = exampleByKey[active] ?? gofishIRExamples[0]
  const doc = example.doc
  const cfg = useMemo(() => unstable_fromGofishIR(doc), [doc])
  const irText = useMemo(() => irForDisplay(doc), [doc])
  const { kinds, nodes } = useMemo(() => summariseKinds(doc), [doc])

  return (
    <PageLayout
      title="Experimental GoFish DisplayList Adapter"
      subtitle="Temporary PR preview for rendering GoFish's baked DisplayList render IR through a Semiotic custom layout"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "GoFish DisplayList Adapter", path: "/interoperability/gofish" },
      ]}
      prevPage={{ title: "Mermaid Adapter", path: "/interoperability/mermaid" }}
      nextPage={{ title: "Apache Arrow Adapter", path: "/interoperability/arrow" }}
    >
      <section>
        <p>
          GoFish’s <code>toDisplayList(&#123; w, h &#125;)</code> is the{" "}
          <strong>render IR</strong>: the output of GoFish’s layout solve, captured one step before
          backend emission, as a <em>flat, ordered list of positioned primitives in absolute
          pixels</em>. The operators, constraints, channels, and coordinate transforms are all
          already consumed — a polar petal arrives as a baked <code>path</code>, a treemap cell as a
          baked <code>rect</code>. GoFish’s developer shipped this stage specifically for this
          adapter, and it makes the integration small and faithful: GoFish owns the geometry, and{" "}
          <code>unstable_fromGofishIR</code> maps each item onto a Semiotic{" "}
          <Link to="/custom-charts/overview">custom layout</Link> by its <code>role</code> — exactly
          as GoFish’s own reference <code>displayListToSVG</code> backend emits SVG tags, but
          emitting scene-nodes and overlays instead.
        </p>
        <ul>
          <li>
            <strong>
              <code>role: {"\"overlay\""}</code> → overlay.
            </strong>{" "}
            Chrome (axis ticks, labels, glyph detail) renders verbatim into one ordered SVG overlay
            layer — a JSX port of GoFish’s reference renderer — so painter order and every{" "}
            <code>kind</code> (warped <code>path</code>s, <code>image</code>s, Porter-Duff{" "}
            <code>composite</code>/<code>mask</code> graphs) stay pixel-faithful.
          </li>
          <li>
            <strong>
              <code>role: {"\"node\""}</code> → scene node.
            </strong>{" "}
            Each data-bearing mark renders into that same SVG layer <em>and</em> gets a transparent
            hit-rect scene node carrying its <code>datum</code>, so Semiotic stays authoritative for
            hover, tooltips, <code>onObservation</code>, cross-chart selection, keyboard a11y, and
            SSR mark-count evidence. Chrome without a <code>datum</code> (legend swatches, axis
            ticks) stays overlay-only.
          </li>
        </ul>
        <p>
          Because a display list is <strong>viewport-baked</strong> — solved at one{" "}
          <code>&#123; w, h &#125;</code>, not cacheable — the result always mounts on{" "}
          <code>NetworkCustomChart</code>, the scale-free family (plot-relative pixels, no data
          scales to fight the baked geometry). The adapter surfaces the document’s{" "}
          <code>viewport</code> as <code>width</code>/<code>height</code>; on resize or data change a
          host re-calls <code>toDisplayList</code> and re-runs the adapter rather than rescaling an
          old document.
        </p>
        <p>
          This adapter is named <code>{EXPERIMENTAL_GOFISH_ADAPTER_NAME}</code>, exposed as an{" "}
          <code>unstable_</code> preview from <code>semiotic/experimental</code>. It is not a runtime
          dependency on GoFish — it consumes GoFish’s published render IR, not its renderer. The
          examples below are <em>real</em> baked documents, generated by{" "}
          <code>scripts/gen-gofish-fixtures.ts</code> from <code>gofish-graphics</code> and checked
          in so the gallery never depends on the nightly at runtime.
        </p>
      </section>

      <section>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {demoOrder.map((key) => (
            <TabButton
              key={key}
              active={key === active}
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = key
                setActive(key)
                setObserved(null)
              }}
            >
              {exampleByKey[key].label}
            </TabButton>
          ))}
        </div>

        <div
          style={{
            background: "var(--surface-2, #f8f8f8)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border-color, #e0e0e0)",
            borderRadius: 8,
            padding: 16,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <NetworkCustomChart
            nodes={cfg.nodes}
            layout={cfg.networkLayout}
            layoutConfig={cfg.layoutConfig}
            width={cfg.width}
            height={cfg.height}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            enableHover
            emptyContent={false}
            onObservation={(obs) => {
              if (obs.type === "hover" || obs.type === "click") {
                const datum = extractTooltipDatum(obs)
                if (datum) setObserved(datum)
              }
            }}
            frameProps={{
              background: "#ffffff",
              tooltipContent: GoFishTooltip,
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--border-color, #e0e0e0)",
              borderRadius: 8,
              padding: 14,
              minWidth: 0,
            }}
          >
            <h3 style={{ marginTop: 0 }}>This baked frame</h3>
            <p style={{ marginTop: 0 }}>{example.blurb}</p>
            {example.key === "boba" ? (
              <p style={{ marginTop: 0, fontSize: 13 }}>
                Compare the Semiotic-native version, built with a custom <code>layout</code> function
                instead of a hand-emitted document, on the{" "}
                <Link to="/custom-charts/examples">Custom Charts → Examples</Link> page.
              </p>
            ) : null}
            <p style={{ marginBottom: 6, fontSize: 13 }}>
              Viewport <code>{cfg.width} × {cfg.height}</code> · {doc.items.length} items ·{" "}
              {nodes} data nodes
            </p>
            <p style={{ marginBottom: 0, fontSize: 13, color: "var(--text-secondary, #666)" }}>
              Primitive kinds:{" "}
              <code>
                {Object.entries(kinds)
                  .map(([k, n]) => `${k}×${n}`)
                  .join(", ")}
              </code>
            </p>
          </div>

          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--border-color, #e0e0e0)",
              borderRadius: 8,
              padding: 14,
              minWidth: 0,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Selected mark</h3>
            {observed ? (
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(70px, 0.45fr) 1fr",
                  gap: "6px 10px",
                  margin: 0,
                }}
              >
                {Object.entries(observed).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{key}</dt>
                    <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                      {formatTooltipValue(value)}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : (
              <p style={{ marginBottom: 0 }}>
                Hover a bar, flower stem, passenger circle, or bottle — the transparent hit-rect over
                each <code>role: {"\"node\""}</code> item carries its source <code>datum</code>.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2>The DisplayList driving this chart</h2>
        {example.handWritten ? (
          <p>
            This one is <strong>hand-written</strong> — no <code>gofish-graphics</code>, no GoFish
            layout solve. The JSON below is a DisplayList document emitted directly in plain code (the
            stack geometry is just arithmetic), proving the render IR is an open format any host can
            produce. <code>role</code> is still the mapping switch and <code>datum</code> the
            provenance Semiotic hit-tests against. (Items are abridged for display.)
          </p>
        ) : (
          <p>
            This is not hand-wired. The JSON below is a GoFish DisplayList document — the post-layout
            render IR. Every <code>item</code> is absolute pixels with its coordinate transform
            already folded in; <code>role</code> is the mapping switch and <code>datum</code> is the
            provenance Semiotic hit-tests against. (Items are abridged for display.)
          </p>
        )}
        {cfg.warnings && cfg.warnings.length > 0 ? (
          <p style={{ color: "var(--semiotic-warning, #b26a00)" }}>
            <strong>Adapter warnings:</strong> {cfg.warnings.join(" ")}
          </p>
        ) : null}
        <CodeBlock language="json">{irText}</CodeBlock>
      </section>

      <section>
        <h2>Why this is not ad hoc</h2>
        <ul>
          <li>
            <strong>GoFish owns layout; Semiotic owns interaction.</strong> The adapter does no
            geometry — it forwards baked primitives and attaches hit targets, accessibility, and SSR
            evidence to the data-bearing ones.
          </li>
          <li>
            <strong>Role is the contract.</strong> <code>node</code> vs <code>overlay</code> is the
            single switch; nothing is recognized or special-cased per chart type. A bar chart, a
            polar flower, and a packed circle treemap all flow through the same mapping.
          </li>
          <li>
            <strong>Provenance survives the solve.</strong> Data-bearing primitives carry the source
            row(s) they were elaborated from, so a hovered flower stem still answers “which lake, and
            what was the catch?” — even though the petals atop it are baked geometry.
          </li>
        </ul>
      </section>

      <section>
        <h2>Targets</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>GoFish example</th>
              <th style={thStyle}>Baked primitives</th>
              <th style={thStyle}>Node contract</th>
            </tr>
          </thead>
          <tbody>
            <TargetRow
              label="Flower meadow"
              href={exampleByKey.flower?.source}
              primitives="rect (stems) + path (polar petals) + rect/text (legend)"
              contract="layer([stems, flowers]): each green stem is a data node carrying its lake's catch rows; the polar petals atop it are baked paths (chrome) with no per-row datum."
            />
            <TargetRow
              label="Polar ribbon chart"
              href={exampleByKey.polarribbon?.source}
              primitives="path (clock-projected radial bars + bumped species ribbons) + rect/text (legend)"
              contract="layer({ coord: clock() }, [bars, ribbons]): each radial bar is a data node; the per-species area ribbons that selectAll the bars are baked paths (chrome). Wrap, gap, and bumps are all in absolute-pixel paths."
            />
            <TargetRow
              label="Fare circle treemap"
              href={exampleByKey.treemap?.source}
              primitives="ellipse (one circle per passenger, faceted by class) + rect/text (facet + legend chrome)"
              contract="facet by pclass (dir x) → squarify-circle treemap per class, fare-sized, sorted desc. Every circle is a data node coloured by survival; the three class blocks and legend are chrome."
            />
            <TargetRow
              label="Bottle fill pictorial"
              href={exampleByKey.bottle?.source}
              primitives="composite (paint blendMode: silhouette image + fill rect) + text (label)"
              contract="A paint composite per stage tints the fill inside the silhouette; the adapter harvests the composite's child datum so each bottle is one hit node."
            />
            <TargetRow
              label="Boba cups (hand-written)"
              href={exampleByKey.boba?.source}
              primitives="path (cup, tea/ice slabs, straw) + ellipse (pearls) + rect (ice cubes, lid) + text (labels)"
              contract="Hand-emitted DisplayList — no gofish-graphics, no GoFish solve; all the cup geometry is plain arithmetic. Proof the render IR is an open, host-emittable format. The three volume bands per drink are data nodes carrying drink + volume; cup, straw, pearls, and labels are chrome."
            />
            <TargetRow
              label="Python memory diagram"
              href={exampleByKey.python?.source}
              primitives="rect + text (frame + tuple cells) + path/ellipse (pointer arrows)"
              contract="Best-effort reconstruction from primitives (the real example needs unpublished GoFish helpers). Built from literal values, so no mark carries a datum — every item is chrome, zero hit targets. Bakes vertically flipped vs the live render (toDisplayList y-orientation, GoFish #143/#16)."
            />
          </tbody>
        </table>
      </section>

      <section>
        <h2>Using the adapter</h2>
        <p>
          In a host, the document comes from GoFish’s layout pass. Build a spec exactly as you would
          to render it, but stop at <code>toDisplayList</code> instead of painting to SVG, then feed
          the result to <code>unstable_fromGofishIR</code>:
        </p>
        <CodeBlock language="jsx">{`import { useEffect, useState } from "react"
import { chart, spread, stack, rect, field } from "gofish-graphics"
import { NetworkCustomChart } from "semiotic/network"
import { unstable_fromGofishIR } from "semiotic/experimental"

function LiveGoFish({ data, width, height }) {
  const [cfg, setCfg] = useState(null)

  // The display list is viewport-baked and async — re-bake on size/data change
  // rather than rescaling an old document.
  useEffect(() => {
    let live = true
    chart(data)
      .flow(spread({ by: "lake", dir: "x" }), stack({ dir: "y", by: "species" }))
      .mark(rect({ w: 34, h: field("count"), fill: field("species") }))
      .toDisplayList({ w: width, h: height })
      .then((doc) => {
        if (live) setCfg(unstable_fromGofishIR(doc))
      })
    return () => {
      live = false
    }
  }, [data, width, height])

  if (!cfg) return null
  return (
    <NetworkCustomChart
      nodes={cfg.nodes}
      layout={cfg.networkLayout}
      layoutConfig={cfg.layoutConfig}
      width={cfg.width}
      height={cfg.height}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      enableHover
      emptyContent={false}
    />
  )
}`}</CodeBlock>
      </section>
    </PageLayout>
  )
}

function TargetRow({ label, href, primitives, contract }) {
  return (
    <tr>
      <td style={tdStyle}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer">
            {label}
          </a>
        ) : (
          label
        )}
      </td>
      <td style={tdStyle}>
        <code>{primitives}</code>
      </td>
      <td style={tdStyle}>{contract}</td>
    </tr>
  )
}

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--border-color, #e0e0e0)",
}

const tdStyle = {
  padding: "9px 10px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--border-color, #e0e0e0)",
  verticalAlign: "top",
}
