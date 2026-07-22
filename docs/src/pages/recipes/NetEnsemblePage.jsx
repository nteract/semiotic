import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import NetEnsemble from "../../examples/recipes/NetEnsemble"

const fullSourceCode = `import { NetworkCustomChart } from "semiotic/network"
import { netEnsembleLayout, analyzeNetEnsemble } from "semiotic/recipes"

// nodes: [{ id }], edges: [{ source, target }] — a bag of small,
// mostly-disconnected DAGs (workflow fragments, lineage subgraphs, motifs…).

// Headless census — the diagnostics without drawing:
const { components, motifs, directedCount, branchingCount } =
  analyzeNetEnsemble(nodes, edges)
// motifs → [{ descriptor: "chain of 3", count: 16, directed: true }, …]

// The layout, on NetworkCustomChart:
<NetworkCustomChart
  nodes={nodes}
  edges={edges}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  layout={netEnsembleLayout}
  layoutConfig={{
    colorMode: "directedness",   // "directedness" | "motif" | "category"
    groupByMotif: true,          // group order-isomorphic components into bands
    sort: "frequency",           // band order: "frequency" | "size" | "directedness"
  }}
  width={880}
  height={580}
/>`

export default function NetEnsemblePage() {
  return (
    <RecipeLayout
      title="Net Ensemble"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Net Ensemble", path: "/recipes/net-ensemble" },
      ]}
      prevPage={{ title: "Word Trails", path: "/recipes/word-trails" }}
      dependencies={["semiotic", "react"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        Some networks aren&rsquo;t one graph — they&rsquo;re a <em>bag of little graphs</em>. Every repo in an
        org contributes a small CI dependency DAG; every dataset a small lineage subgraph; a biological
        network is riddled with recurring wiring patterns. Laid side by side these are mostly{" "}
        <strong>disconnected</strong>, or joined only by a thread or two. Force-directed layout has nothing
        to pull on between components, so it scatters them into a meaningless spray of blobs. Hierarchical
        layouts (dagre, flextree) can&rsquo;t place them at all — they assume one connected root.
      </p>
      <p>
        <code>netEnsembleLayout</code> is built for exactly this case. It borrows an idea from the
        mathematical notion of a <strong>net</strong> to answer a different question: not &ldquo;how are these
        connected&rdquo; but &ldquo;<strong>what shapes recur, and which ones cohere?</strong>&rdquo;
      </p>

      <h2 id="preview">Preview</h2>
      <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--surface-3)" }}>
        <NetEnsemble />
      </div>

      <h2 id="the-net-idea">The idea: a net, in plain terms</h2>
      <p>
        In topology, a <a href="https://en.wikipedia.org/wiki/Net_(mathematics)" target="_blank" rel="noreferrer">net</a>{" "}
        is a generalization of a sequence: a collection of points indexed by a <strong>directed set</strong>. A
        directed set is just a partial order with one extra promise — <em>any two elements have a common
        element &ldquo;above&rdquo; them</em>. Informally: no matter which two things you pick, they eventually
        flow to a shared point. That&rsquo;s what makes a net <em>converge</em>.
      </p>
      <p>
        A DAG hands you a partial order for free. Read each arrow as &ldquo;comes before&rdquo;: node{" "}
        <code>u</code> is &ldquo;below&rdquo; node <code>v</code> if you can reach <code>v</code> from{" "}
        <code>u</code>. So the natural question to ask of a little DAG is: <strong>is it a net?</strong> Does
        everything in it flow to a common place — or does it split into rival endpoints that never
        reconcile?
      </p>

      <h2 id="count-the-sinks">The one-line test: count the sinks</h2>
      <p>
        Here&rsquo;s the useful part. A finite directed set always has a single <em>greatest</em> element —
        one thing that everything is below. In a weakly-connected DAG, a &ldquo;greatest element&rdquo; is a{" "}
        <strong>sink</strong>: a node with no outgoing arrows, that every path eventually reaches. So the
        whole test collapses to something you can do by eye:
      </p>
      <ul>
        <li>
          <strong>Exactly one sink</strong> ⟹ the component <em>is</em> a net. Everything converges to a
          single outcome; every pair of nodes shares a common descendant. Drawn here in{" "}
          <span style={{ color: "#3b7dd8", fontWeight: 700 }}>blue</span>.
        </li>
        <li>
          <strong>Two or more sinks</strong> ⟹ it is <em>not</em> a net. Some pair of nodes has no common
          descendant at all — the graph branches to endpoints that never meet. Drawn in{" "}
          <span style={{ color: "#e8853a", fontWeight: 700 }}>amber</span>.
        </li>
      </ul>
      <p>
        That&rsquo;s an O(nodes + edges) check — no heavy math — yet it captures a real semantic distinction. A
        &ldquo;fan-in funnel&rdquo; (many sources, one sink) is a net: work converges. A &ldquo;fan-out
        fork&rdquo; (one source, many sinks) is not: work diverges and never rejoins. The layout colors every
        component by this test, so <strong>convergence vs. divergence is legible at a glance across hundreds
        of graphs at once</strong>.
      </p>

      <h2 id="motifs">Motifs: the same shape, twice</h2>
      <p>
        The second idea is <strong>motifs</strong> — structural shapes that recur. Two components are the
        &ldquo;same shape&rdquo; if you could relabel one to get the other (they&rsquo;re{" "}
        <em>order-isomorphic</em>). Checking that exactly is expensive in general, so the recipe uses a
        near-linear <strong>fingerprint</strong>: <a href="https://en.wikipedia.org/wiki/Weisfeiler_Leman_graph_isomorphism_test" target="_blank" rel="noreferrer">Weisfeiler&ndash;Leman color refinement</a>.
        Each node starts labeled by how many arrows come in and out; every round, a node&rsquo;s label is
        replaced by a hash of its neighbors&rsquo; labels. After a few rounds, components that are the same
        shape land on the same fingerprint, and different shapes separate.
      </p>
      <p>
        The layout groups components by fingerprint into labelled <strong>bands</strong> — one band per motif,
        the most common first, with the shape drawn once as an <em>exemplar</em> at the band&rsquo;s left. A
        hairball of blobs becomes a <strong>census</strong>: <em>16 chains, 11 diamonds, 8 fan-in funnels, 6
        branching forks, 4 isolates&hellip;</em> Gestalt similarity does the rest — identical shapes look
        identical, and the one weird component pops.
      </p>

      <h2 id="what-you-cant-do">What you can&rsquo;t do with force or hierarchy</h2>
      <p>
        Toggle the demo to <strong>Force scatter</strong> to see the alternative. Everything the ensemble view
        makes obvious is invisible there:
      </p>
      <ul>
        <li>
          <strong>The census.</strong> Force layout can never tell you &ldquo;you have twelve chains and three
          branching forks.&rdquo; Position encodes nothing when components don&rsquo;t touch. The ensemble
          view makes the motif distribution the primary read.
        </li>
        <li>
          <strong>Convergence at a glance.</strong> Coloring by the sink-count test surfaces which workflows
          cohere to a single outcome and which fork to rival endpoints — a semantic property, not a layout
          artifact.
        </li>
        <li>
          <strong>Placement at all.</strong> dagre and flextree need one connected root; a bag of 54 tiny
          graphs simply isn&rsquo;t their input. The ensemble view is designed around disconnection instead of
          fighting it.
        </li>
        <li>
          <strong>Scale.</strong> When cells get too small to interact with individually, each component
          collapses to a single glyph (still colored by convergence, still one keyboard-navigable mark) — so
          the census stays readable from dozens to hundreds of components.
        </li>
      </ul>

      <h2 id="headless">The headless census API</h2>
      <p>
        The diagnostics are a pure function you can call without rendering anything —{" "}
        <code>analyzeNetEnsemble(nodes, edges)</code>. It returns every component with its sink/source counts,
        its <code>directed</code> flag (the net test), and its motif fingerprint, plus the motif census and
        the converge/branch totals. Use it to drive a summary readout (as the stat tiles above do), gate a
        data-quality check (&ldquo;why does this pipeline have three sinks?&rdquo;), or feed the numbers into a
        report — the visualization is optional.
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
            <td>Node fill encoding</td>
            <td><code>layoutConfig.colorMode</code></td>
            <td><code>"directedness"</code> (converge/branch), <code>"motif"</code>, or <code>"category"</code> (a node field).</td>
          </tr>
          <tr>
            <td>Group into motif bands</td>
            <td><code>layoutConfig.groupByMotif</code></td>
            <td><code>true</code> (default) bands by shape; <code>false</code> places every component in one size-ordered grid.</td>
          </tr>
          <tr>
            <td>Band order</td>
            <td><code>layoutConfig.sort</code></td>
            <td><code>"frequency"</code> (default), <code>"size"</code>, or <code>"directedness"</code>.</td>
          </tr>
          <tr>
            <td>Motif sensitivity</td>
            <td><code>layoutConfig.fingerprintRounds</code></td>
            <td>Weisfeiler&ndash;Leman rounds (default 3). More rounds distinguish subtler structural differences.</td>
          </tr>
          <tr>
            <td>Collapse threshold</td>
            <td><code>layoutConfig.minCellForFull</code></td>
            <td>Cell size (px) below which a component collapses to a single census glyph. Default 46.</td>
          </tr>
          <tr>
            <td>Convergence colors</td>
            <td><code>convergeColor</code> / <code>branchColor</code> / <code>edgeColor</code></td>
            <td>Override the palette; defaults track the active theme&rsquo;s semantic colors.</td>
          </tr>
          <tr>
            <td>Chrome</td>
            <td><code>showBandLabels</code> / <code>showExemplars</code> / <code>showLegend</code></td>
            <td>Toggle the band labels, per-band exemplar drawings, and the directedness legend.</td>
          </tr>
          <tr>
            <td>Edge fields</td>
            <td><code>sourceAccessor</code> / <code>targetAccessor</code> / <code>labelAccessor</code></td>
            <td>Name the edge endpoint fields and the node label field.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="accessibility">Accessibility</h2>
      <p>
        Each drawn mark is a hit-testable, keyboard-navigable scene node carrying a stable id and datum —
        individual nodes at full detail, one glyph per component in the collapsed census view. That means the
        layout inherits keyboard navigation, focus rings, the data-table fallback, annotation anchoring, and
        shared cross-chart selection from the framework, exactly like a built-in chart. Pass{" "}
        <code>description</code> and <code>summary</code> to describe the ensemble for screen readers.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/recipes/satellites-in-space">Satellites in Space</Link> — the sibling{" "}
          <code>packedClusterMatrix</code> recipe, which bins <em>records</em> (not whole graphs) into a matrix
          of packed clusters.
        </li>
        <li>
          <Link to="/recipes/kstreams">Kafka Streams</Link> — <code>lineageDagLayout</code>, for one large
          connected lineage DAG rather than an ensemble of small ones.
        </li>
        <li>
          <Link to="/features/style-rules">Style Rules</Link> — declarative threshold styling that composes
          with custom network layouts.
        </li>
      </ul>
    </RecipeLayout>
  )
}
