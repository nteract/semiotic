// TEMPLATE — narrative / case study
//
// Replace every TODO before publishing. Narrative posts are the
// most flexible shape; the skeleton below is a recommendation, not
// a contract. Move sections around as the story needs.
//
// Naming: slug = the story's hook in kebab-case. Titles like
//   "ProcessSankey vs Classic Sankey"
//   "Minard's March, rebuilt in Semiotic"
//   "When your dashboard lies about temporal data"

import React from "react"
import { Link } from "react-router-dom"
// TODO: import the chart components used in the demos.
// import { CHART_A, CHART_B } from "semiotic/<family>" // e.g. "semiotic/network"
// import { ThemeProvider } from "semiotic/themes/react"

// TODO: inline data or import from a shared example module. If the
// post compares two approaches with the same data, share the
// dataset (don't duplicate it).
const DEMO_DATA = [
  // ...
]

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
      {/* OPENING — state the comparison or recreation in the first
          paragraph. Include the punchline. Don't bury it. */}
      <p>
        {/* TODO: the post's thesis in 3–5 sentences. Name the
            chart-or-charts. Say what makes the question
            interesting. Hint at where the answer lands. */}
      </p>

      <h2 id="why-care">Why this matters</h2>
      {/* WHY-CARE — the reader is here because the topic is
          interesting independently of Semiotic. Lean into that.
          If it's a recreation: what makes the original chart
          canonical? If it's a comparison: what makes the choice
          hard? */}
      <p>
        {/* TODO: 3–6 sentences on the broader data-viz interest. */}
      </p>
      <p>
        {/* Optional second paragraph: connect to Semiotic. What
            Semiotic capability is this story exercising? */}
      </p>

      {/* THE MEAT — comparative posts ideally show two charts
          side-by-side or stacked. Recreations show the rebuilt
          chart prominently. Walkthroughs go step-by-step. */}

      <h2 id="approach-a">TODO Approach A / First chart</h2>
      <p>{/* TODO: setup paragraph. */}</p>
      <div style={chartFrame}>
        {/* TODO: <CHART_A ... /> */}
      </div>
      <p>{/* TODO: what to notice in this chart. */}</p>

      <h2 id="approach-b">TODO Approach B / Second chart (if comparative)</h2>
      <p>{/* TODO: setup paragraph. */}</p>
      <div style={chartFrame}>
        {/* TODO: <CHART_B ... /> */}
      </div>
      <p>{/* TODO: what to notice in this chart. */}</p>

      <h2 id="how-it-works">How it works</h2>
      {/* HOW-IT-WORKS — the under-the-hood section. Useful for
          recreations (which Semiotic features compose); shorter
          or absent for pure comparisons. */}
      <p>{/* TODO */}</p>

      <h2 id="when-to-reach-for-it">When to reach for {/* TODO */}</h2>
      {/* For comparison posts, this section says "reach for A
          when…, reach for B when…". For recreations, this section
          generalizes ("Minard-style compositions work whenever
          you have…"). */}
      <table className="recipe-customization-table">
        <thead>
          <tr>
            <th>Reach for</th>
            <th>When the question is</th>
            <th>When the data is</th>
          </tr>
        </thead>
        <tbody>
          {/* TODO: row per chart family with the guidance. */}
        </tbody>
      </table>

      <h2 id="other-domains">Other domains where this pattern plays out</h2>
      {/* GENERALIZATION — required. The reader probably isn't in
          the example domain. Cross-references make the post
          useful beyond the specific case. */}
      <p>{/* TODO: opening sentence. */}</p>
      <ul>
        <li>
          <strong>TODO domain.</strong> Brief 1–2 sentence
          translation.
        </li>
        {/* TODO: 3–5 cross-domain examples. */}
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        {/* TODO: links to the chart reference pages, related
            features, related blog entries. */}
        <li>
          <Link to="/charts/TODO">CHART_A — reference</Link>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "TODO-slug",
  title: "TODO Title",
  subtitle: "TODO one-or-two sentence orientation.",
  author: "TODO ASK USER",
  date: "TODO YYYY-MM-DD",
  tags: ["case-study", "TODO family"],
  excerpt: "TODO 2–3 sentence preview.",
  component: Body,
  ogChart: {
    component: "TODO CHART_NAME",       // pick the most visually striking chart in the post
  },
}

// REMEMBER:
//   1. Add to docs/src/blog/entries.js.
//   2. Add metadata-only copy to docs/src/blog/entries-meta.js.
//   3. Run `npm run generate:blog-og-cards`.
//   4. Verify at http://localhost:3000/blog/<slug>/.
