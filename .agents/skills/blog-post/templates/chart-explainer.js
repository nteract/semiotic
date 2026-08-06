// TEMPLATE — chart explainer
//
// Replace every TODO before publishing. Don't ship with TODOs in
// the live entry; the skill review checks for them.
//
// Naming convention: file/slug = lower-kebab-case of the chart's
// HOC name. Title format: "<ChartName>, explained".

import React, { useRef } from "react"
import { Link } from "react-router-dom"
// TODO: import the chart HOC and any other chart components used in the demo.
// import { CHART_NAME, ThemeProvider } from "semiotic"
import BlogPushDemo from "../components/BlogPushDemo.js"

// TODO: inline demo data. Keep small (5–15 rows) so the reader can
// imagine the underlying shape. Use realistic categorical names
// when possible — "team-A / team-B" > "x1 / x2".
const DEMO_DATA = [
  // { x: ..., y: ... },
]

const chartFrame = {
  background: "var(--surface-1)",
  borderRadius: 8,
  padding: 16,
  border: "1px solid var(--surface-3)",
  margin: "20px 0",
}

function PushDemo() {
  const chartRef = useRef(null)
  return (
    <div style={chartFrame}>
      {/* TODO: <ThemeProvider theme="..."> if needed */}
      <BlogPushDemo
        chartRef={chartRef}
        frames={DEMO_DATA}
        pushAt={(ref, row) => ref?.push?.(row)}
        resetAt={(ref) => ref?.clear?.()}
      >
        {/* TODO: same chart as the static demo, minus `data`,
            plus a `ref={chartRef}` and the right *IdAccessor. */}
        {/* <CHART_NAME ref={chartRef} ... /> */}
      </BlogPushDemo>
    </div>
  )
}

function Body() {
  return (
    <>
      {/* OPENING — one paragraph, no heading.
          State the chart in concrete terms. Don't start with "In
          this post we will…". Start with what the chart IS and
          what question it answers. */}
      <p>
        {/* TODO: elevator pitch (1 sentence) + 1–2 sentences of
            context. Mention the Semiotic HOC name with a Link to
            its reference docs. */}
      </p>

      <h2 id="why-care">Why this exists</h2>
      {/* WHY-CARE — the section that earns the data-viz audience's
          attention. Cover the general problem the chart solves
          (without Semiotic-specific API), then a paragraph
          relating it to Semiotic's implementation. */}
      <p>
        {/* TODO: 2–4 sentences on the chart-type's general role in
            data visualization. What's it good at that other charts
            aren't? */}
      </p>
      <p>
        {/* TODO: 2–3 sentences on Semiotic-specific aspects —
            anything unique about the implementation, the props
            shape, the related primitives. */}
      </p>
      {/* Optional: a short list of canonical use cases. */}
      <ul>
        <li><strong>Use case 1.</strong> Brief description.</li>
        <li><strong>Use case 2.</strong> Brief description.</li>
        {/* TODO: 3–5 short bullets. */}
      </ul>

      <h2 id="demo">Live demo</h2>
      {/* THE THING ITSELF — one chart, inline data, brief
          orientation. The reader should be able to read the chart
          based on the paragraph and what they see. */}
      <p>
        {/* TODO: 1–2 sentences setting up the demo. What's being
            plotted, what's the dataset, what should the reader
            look for. */}
      </p>
      <div style={chartFrame}>
        {/* TODO: render the chart. Wrap in <ThemeProvider> only if
            the chart depends on a specific theme variable that
            differs from the docs site default. */}
        {/* <CHART_NAME data={DEMO_DATA} ... width={680} height={360} /> */}
      </div>

      <h2 id="how-to-read">How to read it</h2>
      {/* HOW TO READ — walk the visual encoding. List per channel.
          Use <strong> for the channel name. */}
      <ul>
        <li><strong>Encoding 1</strong> — what it means.</li>
        <li><strong>Encoding 2</strong> — what it means.</li>
        {/* TODO: cover position, color, size, shape, etc., for
            channels the chart uses. */}
      </ul>

      <h2 id="when-to-reach-for-it">When to reach for it</h2>
      <p>Reach for {/* TODO chart name */} when:</p>
      <ul>
        {/* TODO: 3–5 bullets describing situations where this is
            the right chart. */}
        <li>TODO.</li>
      </ul>
      <p>Reach for something else when:</p>
      <ul>
        {/* TODO: 2–3 bullets describing situations where another
            chart is better. NAME THE ALTERNATIVE chart with a
            Link to its docs. */}
        <li>TODO.</li>
      </ul>

      <h2 id="wiring">Wiring it up</h2>
      {/* WIRING — minimal code snippet. Strip everything optional.
          Use <pre> with explicit styling so dark mode reads. */}
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`import { CHART_NAME } from "semiotic"

<CHART_NAME
  data={rows}
  // TODO required props
/>`}
      </pre>
      <p>
        {/* TODO: 1–2 sentences on common knobs (theme, axes,
            tooltip). Link to the full prop reference. */}
      </p>

      <h2 id="streaming">Streaming / push mode</h2>
      {/* PUSH MODE — required section for every chart explainer.
          For charts that support push (all XY, ordinal, network
          with explicit edges, geo, realtime): live demo + wiring
          snippet + "why push helps here" paragraph specific to
          THIS chart's nature. For hierarchy HOCs (Orbit, Tree,
          Treemap, CirclePack) push does not apply; instead
          explain why and document the set-`data`-to-new-tree
          pattern. */}
      <p>
        {/* TODO: 2–3 sentences introducing push mode in the
            context of THIS chart. Connect to real use cases —
            server-sent events, WebSocket ticks, periodic polls,
            dashboard updates. */}
      </p>
      <PushDemo />
      <p>
        {/* TODO: lead-in to the wiring snippet. */}
      </p>
      <pre style={{ background: "var(--surface-1)", padding: 12, borderRadius: 6, fontSize: 13, overflowX: "auto" }}>
{`const ref = useRef()

// Push as data arrives —
ref.current.push({ ... })

// Update in place when an existing row changes —
ref.current.update("some-id", (d) => ({ ...d, value: 99 }))

<CHART_NAME
  ref={ref}
  pointIdAccessor="id"   // or dataIdAccessor / nodeIDAccessor
  // ... other props minus \`data\`
/>`}
      </pre>
      <p>
        {/* TODO — "Why push helps here" paragraph. SPECIFIC to
            this chart's nature. Generic boilerplate is worthless;
            the story has to land on a property the reader can
            map back to their own code. Examples:
              - "segment recomputation is cheap and in-buffer"
              - "update() mutates one point without re-keying"
              - "size deltas animate cleanly between pushes"
              - "the chart's hover state survives push, unlike a
                 full data reset" */}
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li>
          <Link to="/charts/TODO">
            CHART_NAME — full prop reference
          </Link>
        </li>
        {/* TODO: 2–3 neighbor charts with Links. */}
      </ul>
    </>
  )
}

export default {
  slug: "TODO-slug",                    // kebab-case
  title: "TODO ChartName, explained",
  subtitle: "TODO one-or-two-sentence elevator pitch.",
  author: "TODO ASK USER",              // skill prompts for this
  date: "TODO YYYY-MM-DD",
  tags: ["chart-explainer", "TODO family"],  // xy | network | geo | ordinal | realtime | hierarchy
  excerpt: "TODO 2–3 sentence preview for the index card.",
  component: Body,
  ogChart: {
    component: "TODO CHART_NAME",       // omit if no SSR support
  },
}

// REMEMBER:
//   1. Add to docs/src/blog/entries.js (import + push into blogEntries).
//   2. Add metadata-only copy to docs/src/blog/entries-meta.js.
//   3. Run `npm run generate:blog-og-cards`.
//   4. Verify at http://localhost:3000/blog/<slug>/ via `npm run docs:dev`.
