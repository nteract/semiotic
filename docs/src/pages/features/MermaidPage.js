import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { NetworkCustomChart } from "semiotic/network"
import { mermaidDagLayout } from "semiotic/recipes"
import { unstable_fromMermaid as fromMermaid } from "semiotic/experimental"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const SAMPLE = `graph TD
  A[Ingest] --> B{Valid?}
  B -->|Yes| C[Transform]
  B -->|No| D[Quarantine]
  C --> E[(Warehouse)]
  C --> F[Metrics]
  F --> G[Dashboard]
  E --> G`

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

export default function MermaidPage() {
  const [text, setText] = useState(SAMPLE)
  const result = useMemo(() => fromMermaid(text), [text])

  const layers = useMemo(() => {
    const byLayer = new Map()
    for (const n of result.nodes) {
      const list = byLayer.get(n.layer) || []
      list.push(n)
      byLayer.set(n.layer, list)
    }
    return [...byLayer.entries()].sort((a, b) => a[0] - b[0])
  }, [result])

  return (
    <PageLayout
      title="Mermaid Adapter"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Mermaid Adapter", path: "/interoperability/mermaid" },
      ]}
      prevPage={{ title: "Observable Plot Adapter", path: "/interoperability/observable-plot" }}
      nextPage={{ title: "GoFish IR Adapter", path: "/interoperability/gofish" }}
    >
      <p>
        Mermaid is the dominant text-to-graph language — it's all over GitHub,
        Notion, and LLM output. But it renders as flat, hard-to-style,
        non-interactive, <em>inaccessible</em> SVG. <code>fromMermaid</code>{" "}
        parses Mermaid <code>graph</code>/<code>flowchart</code> syntax into a
        topology Semiotic can render with hover, isolation, theme tokens,
        keyboard navigation, and an accessible navigation tree — on a diagram
        class that is almost universally inaccessible today.
      </p>

      <h2>Why this matters</h2>
      <p>
        The crucial design choice is what to <em>reconstruct</em>. A Mermaid
        flowchart is a directed acyclic graph, not a force-of-springs blob — so
        the adapter doesn't just hand back nodes and edges, it computes a{" "}
        <strong>longest-path layering</strong> and stamps each node with a{" "}
        <code>layer</code> and <code>row</code>. Rebuild the analytical logic, not
        the appearance: the layering is what lets the same graph render as a
        proper layered diagram (via the <code>lineageDagLayout</code> recipe) or
        as the interactive force graph below — your choice, same semantics.
      </p>

      <h2>Paste a diagram, get a layered graph</h2>
      <p>
        Edit the Mermaid source; the parsed, layered Semiotic graph updates live —
        shape-appropriate glyphs (diamonds for decisions, cylinders for stores),
        directional arrows, and edge labels, laid out by the computed layering.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mermaid source</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 200,
              fontFamily: "var(--font-code)",
              fontSize: 13,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--surface-3)",
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              resize: "vertical",
            }}
          />
        </div>
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Layered Semiotic graph ({result.nodes.length} nodes, {result.edges.length} edges)
          </div>
          {result.nodes.length > 0 ? (
            <NetworkCustomChart
              nodes={result.nodes}
              edges={result.edges}
              nodeIDAccessor="id"
              sourceAccessor="source"
              targetAccessor="target"
              layout={mermaidDagLayout}
              layoutConfig={{ direction: result.direction }}
              responsiveWidth
              height={300}
            />
          ) : (
            <em style={{ fontSize: 13 }}>No graph parsed.</em>
          )}
        </div>
      </div>

      {result.warnings && result.warnings.length > 0 && (
        <div style={{ ...panelStyle, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Warnings (the adapter is honest about what it can't do)</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--semiotic-warning, #d49a00)" }}>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ ...panelStyle, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>The reconstructed DAG layering</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 0 }}>
          Each node's computed <code>layer</code> (longest path from a source) — the
          structure a layered render uses.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {layers.map(([layer, nodes]) => (
            <div key={layer} style={{ border: "1px solid var(--surface-3)", borderRadius: 8, padding: 8, minWidth: 90 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>layer {layer}</div>
              {nodes.map((n) => (
                <div key={n.id} style={{ fontSize: 12 }}>{n.label}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <h2>Wiring it up</h2>
      <CodeBlock language="ts">
{`import { unstable_fromMermaid } from "semiotic/experimental"
import { mermaidDagLayout } from "semiotic/recipes"   // tree-shaken; pulled in only if used
import { NetworkCustomChart } from "semiotic/network"

const { nodes, edges, direction } = unstable_fromMermaid(\`
  graph TD
    A[Ingest] --> B{Valid?}
    B -->|Yes| C[Transform]
    B -->|No| D[Quarantine]
\`)

// A layered flowchart — shape glyphs, directional arrows, edge labels — from
// the computed layer/row coordinates. No layout engine, no extra dependency.
<NetworkCustomChart
  nodes={nodes} edges={edges}
  nodeIDAccessor="id" sourceAccessor="source" targetAccessor="target"
  layout={mermaidDagLayout} layoutConfig={{ direction }} />`}
      </CodeBlock>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        For large or dense graphs where edge-crossing minimization matters, run a
        real Sugiyama layouter (the BYO <code>dagre</code> recipe, or
        <code> d3-dag</code>) to assign <code>layer</code>/<code>row</code>, then
        render with the same layout — positioning and rendering are separate
        concerns, and the heavy layout engine stays a peer/BYO dependency.
      </p>

      <h2>Faithful, or it refuses</h2>
      <p>
        The risk in a text-to-graph adapter is the parser pretending to
        understand more than it does. <code>fromMermaid</code> handles{" "}
        <code>graph</code>/<code>flowchart</code> with directions, node shapes,
        and labeled edges; other Mermaid diagram types — sequence, class, state,
        ER, gantt, pie, mindmap — are <strong>declined with a reason</strong>,
        not coerced into a wrong graph. Subgraph grouping is flattened (nodes
        kept) with a warning, and a cyclic graph is layered best-effort rather
        than crashing. The parser is a small dedicated one — Mermaid's own
        runtime is never a Semiotic dependency.
      </p>

      <h2>Where this goes</h2>
      <p>
        The headline use is a docs site where a single Mermaid block becomes a
        live, themed, accessible architecture diagram instead of a flat SVG. The
        same shape serves any place Mermaid is the lingua-franca: a microservice
        graph in a runbook, an LLM that emits a flowchart you want to make
        interactive and keyboard-navigable, a Notion export. The accessibility win
        is the differentiator — and because the layout and the node positioning
        are separate concerns, a host that wants cross-node reach-dimming wires it
        through the shared selection store the custom-layout context exposes.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link to="/interoperability">Interoperability overview</Link> — the
          adapter family and the strategy behind it.
        </li>
        <li>
          <Link to="/interoperability/gofish">GoFish IR Adapter</Link> — the other
          custom-layout-targeting adapter.
        </li>
        <li>
          <Link to="/network/force-directed-graph">Force-Directed Graph</Link> and{" "}
          <Link to="/accessibility/navigation">Structured Navigation</Link> — what a
          parsed graph inherits.
        </li>
      </ul>
    </PageLayout>
  )
}
