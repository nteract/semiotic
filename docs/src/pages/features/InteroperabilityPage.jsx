import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"

// ── Adapter catalog (grouped by direction / what they do) ───────────────────

const GROUPS = [
  {
    heading: "The schema at the center",
    blurb:
      "Three library-neutral JSON Schemas for the metadata that makes a chart agent-legible and audience-aware — chart capability, audience profile, annotation provenance & lifecycle. This is what turns an adapter from a parser into an export of the ideas.",
    items: [
      {
        title: "Portability Spec",
        path: "/interoperability/portability-spec",
        what: "The standard itself + bidirectional Vega-Lite (toVegaLite) and the IDID-over-Vega-Lite binding.",
      },
    ],
  },
  {
    heading: "Inbound spec adapters — a format becomes a chart",
    blurb:
      "Parse another tool's chart description and compile it to a Semiotic ChartConfig. The chart arrives with the accessibility, navigation, theming, and provenance the source never had.",
    items: [
      { title: "Vega-Lite", path: "/interoperability/vega-lite", what: "fromVegaLite — the dominant declarative grammar (stable)." },
      { title: "Observable Plot", path: "/interoperability/observable-plot", what: "fromObservablePlot — the notebook→production handoff." },
      { title: "Flint Chart", path: "/interoperability/flint-chart", what: "unstable_fromFlintChart — agent-authored semantic chart requests into Semiotic ChartConfig." },
      { title: "Mermaid", path: "/interoperability/mermaid", what: "fromMermaid — text-to-graph, compiled to a layered, accessible DAG." },
      { title: "GoFish DisplayList", path: "/interoperability/gofish", what: "unstable_fromGofishIR — maps GoFish's baked render IR (toDisplayList) onto a custom layout by role." },
    ],
  },
  {
    heading: "Inbound data adapter — a data runtime becomes marks",
    blurb: "Feed an in-browser analytics engine straight into the chart accessor path.",
    items: [
      { title: "Apache Arrow", path: "/interoperability/arrow", what: "fromArrow — Arrow / DuckDB-Wasm result sets into Semiotic rows." },
    ],
  },
  {
    heading: "Inbound semantics — metadata becomes meaning on the chart",
    blurb:
      "Ingest a data-quality or data-truth signal and put it on the chart as a provenanced, lifecycled annotation — flipping the chart's communicative act from report to alert.",
    items: [
      { title: "Data-Truth Bridge", path: "/interoperability/data-quality-bridge", what: "fromDbtArtifacts / fromGreatExpectations → provenanced annotations." },
    ],
  },
  {
    heading: "Agent integration — an LLM ↔ a trustworthy chart",
    blurb:
      "Wrap chart generation in a deterministic loop so an agent ships a guaranteed-renderable chart or precise reasons to retry — never a broken one.",
    items: [
      { title: "Generative-UI Trust Layer", path: "/interoperability/generative-ui", what: "prepareChart + framework-agnostic tool definitions (no vendor SDK)." },
    ],
  },
]

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
  marginBottom: 16,
}

export default function InteroperabilityPage() {
  return (
    <PageLayout
      title="Interoperability"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "Overview", path: "/interoperability/overview" },
      ]}
      nextPage={{ title: "Portability Spec", path: "/interoperability/portability-spec" }}
    >
      <p>
        An adapter, here, is not "support for format X." It is a{" "}
        <strong>vector that carries Semiotic's ideas into an ecosystem that
        doesn't have them.</strong> A chart that an AI can pick correctly, that a
        screen-reader user can receive, and that carries its own provenance is
        worth more than one that merely renders — and those properties are
        metadata, portable in a way a rendering engine is not. Each adapter on
        this page reproduces a source's <em>analytical logic</em>, then hands the
        result the legibility, accessibility, and provenance the source format
        never had.
      </p>

      <h2>The strategy in one paragraph</h2>
      <p>
        Breadth must not cost coherence. Every adapter here compiles to the same
        small set of gate-defended public artifacts — a serializable{" "}
        <Link to="/intelligence/serialization">ChartConfig</Link>, a provenanced{" "}
        <Link to="/annotations/provenance-lifecycle">annotation array</Link>, or
        the generate→validate→repair→prove trust loop — so reaching a new
        ecosystem never widens the surface that has to be maintained. The library
        takes on <em>no</em> new dependency for any single adapter: heavy parsers
        and engines (a Mermaid grammar, an Arrow table, an LLM SDK) are
        user-supplied or duck-typed, never folded into the core. And an adapter
        that can't faithfully represent a source construct{" "}
        <strong>refuses with a reason</strong> rather than emit a
        plausible-but-wrong chart — because the failures are exactly where a
        non-expert reader and an LLM are both deceived.
      </p>

      <h2>Inbound and outbound</h2>
      <p>
        Most adapters are <em>inbound</em> — a foreign spec, dataset, or quality
        signal comes in and becomes a Semiotic chart or annotation. The{" "}
        <Link to="/interoperability/portability-spec">portability spec</Link> also
        goes <em>outbound</em>: <code>toVegaLite</code> round-trips a chart back
        through the dominant interchange format with its metadata intact, which
        is the portability claim in runnable form. New formats slot into the same
        framework — each is a pure function returning an inspectable object, so it
        is testable, SSR-safe, and usable server-side and in notebooks.
      </p>

      <h2>The adapters</h2>
      {GROUPS.map((group) => (
        <div key={group.heading} style={panelStyle}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: 16 }}>{group.heading}</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 0 }}>{group.blurb}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {group.items.map((item) => (
              <li key={item.path} style={{ marginBottom: 6 }}>
                <Link to={item.path}>
                  <strong>{item.title}</strong>
                </Link>{" "}
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>— {item.what}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Status &amp; staging</h2>
      <p>
        New grammar adapters ship behind an <code>unstable_</code> prefix in{" "}
        <code>semiotic/experimental</code> while they're proven against real
        inputs (Observable Plot, Mermaid, GoFish, and the portability runtime
        surface live there today); the stable, lower-ambiguity adapters
        (<code>fromVegaLite</code>, <code>fromArrow</code>) ship in{" "}
        <code>semiotic/data</code>, and the agent + data-truth surfaces ride{" "}
        <code>semiotic/ai</code>. The JSON Schemas themselves are the durable,
        versioned artifact. Every adapter ships proportional to its surface: a
        docs page, a fixture suite that doubles as a regression target, and — for
        the config-producing ones — a round-trip test through{" "}
        <code>fromConfig</code> that proves it emits only props the schema knows.
      </p>
    </PageLayout>
  )
}
