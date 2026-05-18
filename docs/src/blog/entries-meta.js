/**
 * Metadata-only mirror of the blog entries registry.
 *
 * The full registry in `./entries.js` imports the entry-body
 * components, which pull in React, semiotic charts, and other code
 * that can't run inside the bare-Node OG-card build script (no JSX
 * transform there). This file is the build-time read-only view that
 * the OG card generator + prerender script can consume without
 * touching React.
 *
 * KEEP IN SYNC with `./entries.js`. The blog-post skill enforces
 * adding entries to BOTH places when registering a new post; the
 * size + position of this file is small enough that a stale entry
 * here is a CI fail away from being caught (see
 * scripts/check-blog-entry-sync.mjs).
 */

export const blogEntriesMeta = [
  {
    slug: "release-3-5-3",
    title: "Semiotic 3.5.3",
    subtitle:
      "DifferenceChart, exact axis ticks, Swimlane rounded ends, ProcessSankey lifecycle timing, the new blog pipeline, and refreshed 45-chart AI capabilities.",
    author: "Elijah Meeks",
    date: "2026-05-18",
    tags: ["release"],
    excerpt:
      "3.5.3 adds DifferenceChart, exact axis ticks, Swimlane rounded ends, and ProcessSankey lifecycle timing; it also launches the docs blog, refreshes AI capabilities to 45 chart schemas, and wires new release gates for capability and blog metadata drift.",
  },
  {
    slug: "process-sankey-vs-classic-sankey",
    title: "Process Sankey vs Classic Sankey",
    subtitle:
      "Two flow datasets — one already aggregated, one event-stamped — and the diagram that fits each. With four-panel Anscombe's-quartet demo.",
    author: "Elijah Meeks",
    date: "2026-05-16",
    tags: ["case-study", "chart-explainer", "network"],
    excerpt:
      "Same flow data, two layouts, two stories. The classic Sankey is unbeatable for part-to-whole at aggregate scale; the Process Sankey paints discrete events at their actual times and makes surges, cycles, and lingering patients visible. With an Anscombe's-quartet section: four scenarios that produce a byte-identical aggregate Sankey and four operationally distinct ProcessSankey timelines.",
    ogChart: { component: "AnscombesSankey" },
  },
  {
    slug: "minards-march",
    title: "Minard's March, rebuilt in Semiotic",
    subtitle:
      "A faithful recreation of the 1869 flow map of Napoleon's Russian campaign — FlowMap with tile basemap and particles, cross-linked with a ConnectedScatterplot temperature strip.",
    author: "Elijah Meeks",
    date: "2026-04-22",
    tags: ["case-study", "geo", "tutorial"],
    excerpt:
      "Tufte called Minard's chart \"the best statistical graphic ever drawn.\" Rebuilding it is the cleanest way to learn Semiotic's composition primitives — FlowMap with tiles, particles, a linked ConnectedScatterplot, and shared categorical colors all in one page.",
    ogChart: { component: "MinardsMarch" },
  },
  {
    slug: "release-3-5-2",
    title: "Semiotic 3.5.2",
    subtitle:
      "Shared HOC hooks, ProcessSankey + SankeyDiagram particle unification, regression sugar on five more charts, FlowMap push API, and a capability matrix the MCP server can filter against.",
    author: "Elijah Meeks",
    date: "2026-05-10",
    tags: ["release"],
    excerpt:
      "3.5.2 is mostly a factor-and-extend release: useSeriesFeatures / useEncodingDomain / useStreamStatus / useXYLineStyle hooks land, ProcessSankey inherits SankeyDiagram's canvas particle pipeline, regression-line sugar extends to five more charts, FlowMap joins the push family, and ai/capabilities.json indexes all 44 charts.",
  },
  {
    slug: "difference-chart",
    title: "DifferenceChart, explained",
    subtitle:
      "Two series, one chart, two-color crossover fill. When the gap between A and B is the story, this is the diagram that makes it readable without arithmetic.",
    author: "Elijah Meeks",
    date: "2026-05-14",
    tags: ["chart-explainer", "xy"],
    excerpt:
      "A two-line chart leaves the difference implicit; DifferenceChart fills it in. Plot A and B as overlay lines, color the area between with one color where A leads and the other where B leads, and let the chart interpolate the crossovers so the fills kiss at zero. Forecast vs actual, YoY, temperature anomaly — the classic uses.",
    ogChart: { component: "DifferenceChart" },
  },
  {
    slug: "quadrant-chart",
    title: "QuadrantChart, explained",
    subtitle:
      "A 2×2 scatterplot with labeled, tinted cells. The chart of strategy frameworks, prioritization matrices, and any decision that asks 'which quadrant is this in?'",
    author: "Elijah Meeks",
    date: "2026-04-03",
    tags: ["chart-explainer", "xy"],
    excerpt:
      "Most strategic frameworks are 2×2 grids — quick wins vs strategic bets vs fill-in vs money pits. QuadrantChart bakes the threshold lines and quadrant labels into a scatterplot so 'which quadrant is this in?' answers itself.",
    ogChart: { component: "QuadrantChart" },
  },
  {
    slug: "funnel-chart",
    title: "FunnelChart, explained",
    subtitle:
      "Five trapezoids stacked vertically; the slope of each connector tells you which stage is leaking the most.",
    author: "Elijah Meeks",
    date: "2026-03-08",
    tags: ["chart-explainer", "ordinal"],
    excerpt:
      "A FunnelChart is a bar chart with the geometry tweaked so stage-to-stage drop-off is the visual headline. Sales funnels, signup conversion, recruiting pipelines, manufacturing yield — anywhere monotonically-shrinking ordered stages need a chart that shows where the lake drains.",
    ogChart: { component: "FunnelChart" },
  },
  {
    slug: "orbit-diagram",
    title: "OrbitDiagram, explained",
    subtitle:
      "A hierarchy rendered as concentric rotating orbits — more landing-page than analytics. When the goal is to make structure feel like something worth looking at.",
    author: "Elijah Meeks",
    date: "2026-02-18",
    tags: ["chart-explainer", "network", "hierarchy"],
    excerpt:
      "OrbitDiagram is the chart for when the audience needs to feel oriented, not make a decision. Concentric rings, slow rotation, depth-as-radius. The animation isn't gratuitous — it tells the eye that ring membership is the encoding and angular position is decorative.",
    ogChart: { component: "OrbitDiagram" },
  },
]
