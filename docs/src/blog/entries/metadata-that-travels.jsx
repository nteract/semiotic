/* eslint-disable react/no-unescaped-entities */
import React, { useMemo } from "react"
import { Link } from "react-router-dom"
import { BarChart } from "semiotic"
import { fromVegaLite } from "semiotic/data"
import {
  unstable_toVegaLiteResult as toVegaLiteResult,
  unstable_attachIDID as attachIDID,
  unstable_attachIDIDAnnotations as attachIDIDAnnotations,
} from "semiotic/experimental"

// ---------------------------------------------------------------------------
// Demo data + frame
// ---------------------------------------------------------------------------

const VEGA_SPEC = {
  mark: "bar",
  data: {
    values: [
      { region: "North", revenue: 128 },
      { region: "South", revenue: 92 },
      { region: "East", revenue: 145 },
      { region: "West", revenue: 71 },
    ],
  },
  encoding: {
    x: { field: "region", type: "nominal" },
    y: { field: "revenue", type: "quantitative" },
  },
}

const CAPABILITY = {
  component: "BarChart",
  family: "ordinal",
  importPath: "semiotic/ordinal",
  rubric: { familiarity: 5, accuracy: 5, precision: 4 },
  intentScores: { "compare-categories": 5, rank: 4 },
}

const AUDIENCE = {
  name: "Quarterly exec review",
  targets: {
    PieChart: { direction: "decrease", weight: 2, reason: "exact comparison, not slices" },
  },
  receptionModality: "visual",
}

const NOTE = {
  type: "y-threshold",
  value: 100,
  label: "Plan target",
  provenance: {
    authorKind: "watcher",
    source: "ai",
    basis: "statistical-test",
    confidence: 0.72,
    createdAt: "2026-06-20T14:00:00Z",
  },
  lifecycle: { ttlHint: "P7D", status: "proposed", anchor: "semantic" },
}

const chartFrame = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 12,
  margin: "20px 0",
  background: "var(--surface-1)",
}

const preStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: "14px 16px",
  overflowX: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  margin: "16px 0",
}

function supportedVegaLiteSpec(config) {
  const result = toVegaLiteResult(config)
  if (!result.spec) throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(" "))
  return result.spec
}

function RoundTripDemo() {
  const config = useMemo(() => fromVegaLite(VEGA_SPEC), [])
  return (
    <div style={chartFrame}>
      <BarChart {...config.props} title="Revenue by region" width={560} height={280} />
      <p style={{ fontSize: 12, color: "var(--text-2)", margin: "4px 6px 0" }}>
        This chart was built from a Vega-Lite bar spec via <code>fromVegaLite()</code>. Run{" "}
        <code>toVegaLiteResult()</code> on the result and you get the spec back for the
        tested supported single-view subset; unsupported semantics return a typed refusal.
      </p>
    </div>
  )
}

function EnrichedDemo() {
  const enriched = useMemo(() => {
    const config = fromVegaLite(VEGA_SPEC)
    let spec = supportedVegaLiteSpec(config)
    spec = attachIDID(spec, { capability: CAPABILITY, audience: AUDIENCE })
    spec = attachIDIDAnnotations(spec, [NOTE])
    return spec
  }, [])
  return <pre style={preStyle}>{JSON.stringify({ usermeta: enriched.usermeta }, null, 2)}</pre>
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function Body() {
  return (
    <>
      <p>
        A chart that an AI can pick correctly, that a screen-reader user can actually receive, and
        that carries its own provenance is worth more than one that merely looks right. Those three
        properties aren't pixels — they're metadata. And metadata is portable in a way a rendering
        engine never is. The IDID portability spec writes three of them down as plain JSON Schemas,
        so the ideas can travel into tools that have never heard of Semiotic.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        Most chart "interoperability" stops at appearance: a converter reads one format's marks and
        emits another's. That's a parser, and a parser only ever reproduces what the source already
        had. The more interesting question is what the source <em>didn't</em> have. A Vega-Lite spec
        doesn't know which intents its chart serves, who's going to read it, or where a callout came
        from. Neither does a Mermaid diagram or a notebook plot. Those gaps are exactly where a
        non-expert reader and an LLM both get misled — and exactly the metadata that makes a chart
        legible to an agent and receivable by a real audience.
      </p>
      <p>
        So the framing shifts. An adapter shouldn't just reproduce a format; it should be an{" "}
        <em>export mechanism for the ideas the format is missing</em>. For that to work, the ideas
        have to exist as something library-neutral — not a TypeScript interface buried in one
        renderer, but a schema any tool can implement. That's what the spec is: three versioned JSON
        Schemas, each implementable without reading a line of Semiotic source.
      </p>

      <h2 id="primitives">Three primitives</h2>
      <p>
        <strong>Chart capability</strong> answers <em>what is this chart good at?</em> —
        declaratively, with a familiarity/accuracy/precision rubric and per-intent scores, so a
        heuristic or an LLM can rank a chart against a dataset and a goal without executing a chart
        library. <strong>Audience profile</strong> answers{" "}
        <em>who is reading, and what is the org trying to grow?</em> — per-chart familiarity,
        adoption targets, and a reception modality (a screen reader can't receive an eight-slice pie
        no matter how familiar it is). <strong>Annotation provenance &amp; lifecycle</strong>{" "}
        answers{" "}
        <em>where did this note come from, how much do we trust it, and how does it age?</em> —
        author, basis, confidence, and a two-axis lifecycle that keeps a fresh-but-disputed note
        distinct from a stale-but-accepted one.
      </p>
      <p>
        Public domain fields are labelled with <code>x-idid-status</code> so a reader can tell what's real
        today from what the spec reserves for later. Open string unions (an annotation's{" "}
        <code>source</code>) stay open with a recognized-values list; genuinely closed unions (
        <code>freshness</code>, <code>status</code>, <code>anchor</code>) use a strict enum. The
        schemas are the stable artifact; they ship in the npm package under <code>/spec/v0.1</code>{" "}
        and live in the repository at the same path.
      </p>

      <h2 id="bidirectional">Bidirectional Vega-Lite — the proof</h2>
      <p>
        Vega-Lite is the closest thing the ecosystem has to a neutral chart interchange format.
        Semiotic already reads it (<code>fromVegaLite</code>); the spec adds the inverse (
        <code>toVegaLiteResult</code>), so the tested supported single-view subset can round-trip
        through the dominant format. Unsupported semantics refuse with structured diagnostics.
        Here's a chart built from a Vega-Lite spec — and it converts straight back to one:
      </p>
      <RoundTripDemo />
      <pre style={preStyle}>{`import { fromVegaLite } from "semiotic/data"
import { unstable_toVegaLiteResult as toVegaLiteResult } from "semiotic/experimental"

const config = fromVegaLite(vegaSpec)   // Vega-Lite  -> Semiotic ChartConfig
const result = toVegaLiteResult(config)  // ChartConfig -> Vega-Lite
if (result.status === "refused") throw new Error(result.diagnostics[0].message)
const back = result.spec                 // supported subset`}</pre>

      <h2 id="carrying">Carrying the metadata on the spec</h2>
      <p>
        The tested supported round trip preserves its mark, data, and encoding subset — but plain Vega-Lite has no place for
        capability, audience, or provenance. The binding rides them under <code>usermeta.idid</code>
        , a key every Vega-Lite renderer ignores, so the spec and its meaning travel together.
        Attach a capability, an audience, and a provenanced annotation, and the metadata appears
        alongside the chart:
      </p>
      <pre style={preStyle}>{`import {
  unstable_toVegaLiteResult as toVegaLiteResult,
  unstable_attachIDID as attachIDID,
  unstable_attachIDIDAnnotations as attachIDIDAnnotations,
} from "semiotic/experimental"

const result = toVegaLiteResult(config)
if (result.status === "refused") throw new Error(result.diagnostics[0].message)
let spec = result.spec
spec = attachIDID(spec, { capability, audience })       // ride under usermeta.idid
spec = attachIDIDAnnotations(spec, [provenancedNote])   // + a note with its evidence`}</pre>
      <p>The enriched spec's metadata block, computed live:</p>
      <EnrichedDemo />
      <p>
        A plain Vega-Lite renderer draws the chart and ignores all of it. An IDID-aware host reads
        it back — and acts on it. Because the audience profile travels on the spec, any tool can
        feed it straight into a suggestion engine: the same audience that shipped with the chart now
        calibrates what else to recommend. The metadata is actionable, not decorative.
      </p>

      <h2 id="when">When to reach for it</h2>
      <p>
        Reach for the spec when you're building an adapter — Vega-Lite, Mermaid, a dbt test, a
        notebook export — and you want it to carry more than appearance. Reach for it when chart
        metadata has to cross a tool boundary: a Python service that emits capability descriptors a
        React frontend consumes, a BI portal that stamps annotations with provenance another system
        reads. Validate against the published JSON Schemas with any compliant validator — no library
        dependency required, which is the whole point.
      </p>
      <p>
        Don't reach for it as a chart-rendering format; it isn't one. It describes metadata{" "}
        <em>about</em> charts, not their geometry — the geometry stays in Vega-Lite, in a{" "}
        <code>ChartConfig</code>, or in your renderer of choice. And don't expect a 100% format
        translation: an adapter that can't faithfully represent a source construct should refuse
        with a reason, not emit a plausible-but-wrong chart. A 70%-faithful adapter that announces
        its 30% gap is an asset; a 95%-faithful one that hides its 5% is a liability.
      </p>

      <h2 id="where-this-goes">Where this goes</h2>
      <p>
        The same shape recurs anywhere chart metadata outlives the tool that made it. A model emits
        a chart spec that a downstream agent has to interpret faithfully. A design system needs
        charts whose audience calibration survives being handed to a different team. A research
        figure travels into a paper stripped of its context, and a provenanced caveat is what
        survives the trip. In each case the durable value isn't the picture — it's the metadata
        riding alongside it. The leading sign this is working won't be downloads; it'll be someone
        implementing these schemas in a stack that isn't Semiotic at all.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/interoperability/portability-spec">Portability Spec</Link> — the interactive
          round-trip playground, schema viewer, and the live route-through-suggestions demo.
        </li>
        <li>
          <Link to="/interoperability/vega-lite">Vega-Lite Translator</Link> — the inbound{" "}
          <code>fromVegaLite</code> adapter this builds on.
        </li>
        <li>
          <Link to="/intelligence/capabilities">Capability Matrix</Link> and{" "}
          <Link to="/intelligence/audience-profiles">Audience Profiles</Link> — the two primitives,
          as they work inside the library.
        </li>
        <li>
          <Link to="/annotations/provenance-lifecycle">Provenance &amp; Lifecycle</Link> — the
          annotation metadata the third schema standardizes.
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "metadata-that-travels",
  title: "Metadata That Travels",
  subtitle:
    "An adapter shouldn't just reproduce a format — it should export the ideas the format is missing. The IDID portability spec writes three of them (chart capability, audience profile, annotation provenance) as library-neutral JSON Schemas, with a strict Vega-Lite supported-subset round trip as the proof.",
  author: "Elijah Meeks",
  date: "2026-06-21",
  tags: ["case-study"],
  excerpt:
    "A chart an AI can pick correctly, a screen reader can receive, and that carries its own provenance is worth more than one that merely looks right — and those properties are metadata, portable in a way a renderer is not. The portability spec standardizes three of them as JSON Schemas, with a strict Vega-Lite supported-subset round trip and typed refusals for unsupported semantics.",
  component: Body,
  ogChart: { component: "BarChart" },
  draft: true,
}
