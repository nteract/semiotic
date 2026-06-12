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

// Same shape as `entries.js`'s `allBlogEntries`. Drafts (entries with
// `draft: true`) are included here so the sync check and per-entry
// inspection still work; the build scripts filter at consumption time.
export const allBlogEntriesMeta = [
  {
    slug: "release-3-7-2",
    title: "Semiotic 3.7.2",
    subtitle:
      "A deployment and docs-polish patch: stateless MCP HTTP for serverless connectors, a Cloud Run wrapper, dark-mode accessibility fixes, and restored annotation callouts in the contested-annotations blog demo.",
    author: "AI-Generated",
    date: "2026-06-12",
    tags: ["release"],
    excerpt:
      "3.7.2 makes the MCP HTTP server easier to host: stateless Streamable HTTP, JSON responses, health endpoints, host allowlisting, and a Cloud Run wrapper. It also fixes dark-mode misses in the accessibility navigation demos and restores visible callouts in the contested-annotations blog chart.",
  },
  {
    slug: "release-3-7-1",
    title: "Semiotic 3.7.1",
    subtitle:
      "The verification release: render evidence for agent loops, misleading-design diagnostics, WCAG contrast gates on every theme, an experimental ChatGPT Apps widget, and honest top-1 scorecard numbers.",
    author: "AI-Generated",
    date: "2026-06-11",
    tags: ["release"],
    excerpt:
      "3.7.1 makes charts checkable: renderChartWithEvidence() returns scene-graph ground truth so agents can verify marks actually drew, diagnoseConfig() flags deceptive designs like cherry-picked windows and over-sliced pies, every theme preset is gated against WCAG contrast floors, and the MCP server ships an experimental ChatGPT Apps chart widget.",
  },
  {
    slug: "release-3-7-0",
    title: "Semiotic 3.7.0",
    subtitle:
      "The receivability release: reader-grounded charts, structured navigation, annotation lifecycle, conversation-arc persistence, variant repair, and a new BigNumber value entry point.",
    author: "AI-Generated",
    date: "2026-06-07",
    tags: ["release"],
    excerpt:
      "3.7.0 makes Semiotic's AI and annotation work receivable: charts can describe themselves, expose structured navigation, carry annotation provenance, persist authoring context, repair or vary agent proposals, and render focal values through the new BigNumber entry point.",
  },
  {
    slug: "release-gates-for-fast-prs",
    title: "How Semiotic Keeps Fast PRs Clean",
    subtitle:
      "The CI and release gate behind Semiotic's current PR pace: registry drift checks, docs freshness, AI-facing contracts, visual diffs, performance comparison, pack smoke tests, and publish verification.",
    author: "Elijah Meeks",
    date: "2026-06-08",
    tags: ["case-study", "release", "process"],
    excerpt:
      "Semiotic can move through a high volume of PRs because review is backed by a stack of specific gates: builds, types, registry drift checks, docs and AI freshness, visual baselines, performance comparison, package smoke tests, and release verification. Humans review the rendered changes and the code that actually needs judgment.",
    draft: true,
  },
  {
    slug: "annotations-that-get-contested-and-heard",
    title: "Annotations That Get Contested, and Heard",
    subtitle:
      "Editorial status makes a note something a team can dispute, supersede, and retract to become the natural-language bridge that makes every note something a non-visual reader actually encounters, in the description and in the navigation tree.",
    author: "Elijah Meeks",
    date: "2026-06-10",
    tags: ["case-study", "roadmap", "accessibility"],
    excerpt:
      "Annotations need to be well-placed, un-crowded, legibly associated, responsive, and defensible. But they also need to know where they are in the annotation lifecycle: proposed / accepted / disputed / retracted, supersession chains, and conversation-arc events. This way, a note becomes the durable node that captures conversation and meaning-making. Annotations lead the chart description and get their own branch in the navigation tree, so a screen-reader user meets the author's intent head-on.",
    ogChart: { component: "LineChart" },
  },
  {
    slug: "annotations-that-adapt-and-travel",
    title: "Annotations That Adapt and Travel",
    subtitle:
      "Make the annotation layer responsive to its container and its reader, and let a note defend itself once the chart leaves the page: responsive shedding, cohesion modes, audience-scaled amount, and defensive traveling notes that carry their provenance visibly.",
    author: "Elijah Meeks",
    date: "2026-06-09",
    tags: ["case-study", "roadmap"],
    excerpt:
      "Make annotations adapt to space and house style. It sheds secondary notes as the plot narrows, and chooses whether notes blend into the chart or read as a distinct editorial layer. M6 adapts to the reader and to reuse: scale annotation amount by audience familiarity, and mark a note defensive so it survives every export with its source and confidence baked in.",
    ogChart: { component: "Scatterplot" },
  },
  {
    slug: "annotations-that-make-room-and-make-sense",
    title: "Annotations That Make Room and Make Sense",
    subtitle:
      "Keep the annotation layer legible: a density budget sheds the lowest-priority notes when a chart gets crowded, and a redundant-cue default ties a colored note to its target with a spatial line instead of color alone.",
    author: "Elijah Meeks",
    date: "2026-06-08",
    tags: ["case-study", "roadmap"],
    excerpt:
      "After hierarchy and placement, the next two annotation milestones handle the failure modes that show up at scale: too many notes, and notes that only connect to their target by color. This is achieved via an opt-in density budget with progressive disclosure and an accessibility audit for color-only association and an opt-in redundant leader-line cue.",
    ogChart: { component: "Scatterplot" },
    draft: true,
  },
  {
    slug: "annotations-that-lead-and-land",
    title: "Annotations That Lead and Land",
    subtitle:
      "Move annotations from first-class objects toward design assistance: hierarchy gives notes a reading order, and opt-in placement chooses sensible offsets without taking control away from authors.",
    author: "Elijah Meeks",
    date: "2026-06-07",
    tags: ["case-study", "roadmap"],
    excerpt:
      "Semiotic already treated annotations as data-bound objects. Now it helps authors make design decisions with those objects: primary and secondary notes, inferred reading order from confidence, an accessibility audit hook, and an opt-in annotationLayout recipe that places notes near their targets while avoiding obvious collisions.",
    ogChart: { component: "Scatterplot" },
  },
  {
    slug: "what-an-annotation-should-carry",
    title: "What an Annotation Should Carry",
    subtitle:
      "Annotations become first-class objects: a hierarchy token, curved connectors, and — the real change — provenance and a two-axis lifecycle so a note records who made it, on what basis, and whether it still holds.",
    author: "Elijah Meeks",
    date: "2026-06-02",
    tags: ["case-study"],
    excerpt:
      "Once a chart is a surface that agents, watchers, and humans all write to, the annotation becomes the unit of the conversation. This is the release that gives annotations what that role requires: emphasis hierarchy, swoopy connectors, and provenance + lifecycle metadata aligned with the IDID conversational substrate.",
    ogChart: { component: "Scatterplot" },
    draft: true,
  },
  {
    slug: "navigating-a-chart-you-cant-see",
    title: "Navigating a Chart You Can't See",
    subtitle:
      "Structured navigation exposes a chart as a screen-reader-traversable tree — chart → series → data point — following the Olli / Data Navigator model, uncoupled from the canvas it's drawn on.",
    author: "Elijah Meeks",
    date: "2026-06-15",
    tags: ["case-study", "accessibility"],
    excerpt:
      "A flat table of 200 rows is technically accessible and practically unusable. Structured navigation gives a non-visual reader the path a sighted reader takes — overview, then detail — as an ARIA tree built from the chart config and mounted as an opt-in ChartContainer layer, decoupled from how the chart renders.",
    ogChart: { component: "LineChart" },
    draft: true,
  },
  {
    slug: "what-a-screen-reader-should-hear",
    title: "What a Screen Reader Should Hear",
    subtitle:
      "describeChart() turns a chart config into a layered natural-language description: encoding, statistics, and trend which research says blind and low-vision readers actually want.",
    author: "Elijah Meeks",
    date: "2026-06-15",
    tags: ["case-study", "accessibility"],
    excerpt:
      'A screen reader announces "line chart, nine points" which is both accurate and useless. Research on accessible visualization says readers want statistics and trends, not chart types. describeChart() generates exactly that, deterministically, from the chart\'s config, and ChartContainer makes it an opt-in layer.',
    ogChart: { component: "LineChart" },
    draft: true,
  },
  {
    slug: "auditing-what-you-cant-see",
    title: "Auditing What You Can't See",
    subtitle:
      "A static accessibility audit for Semiotic charts, organized by Chartability (POUR-CAF) and the design decision at its center: being honest about what a static check can't know.",
    author: "Elijah Meeks",
    date: "2026-06-05",
    tags: ["case-study", "accessibility"],
    excerpt:
      "A canvas chart is an opaque image to a screen reader, and automated checkers can't see it. auditAccessibility() grades a chart config against Chartability's heuristics crediting the built-ins every chart ships, flagging the author-actionable gaps, and, most importantly, marking what it cannot know as 'manual' instead of manufacturing a false green checkmark.",
  },
  {
    slug: "scale-aware-suggestions",
    title: "Your sample lies about your data",
    subtitle:
      "Scale-aware chart suggestions: declare what the production dataset actually looks like, and get back recommendations that work at that scale instead of at the size of the sample you happened to pass.",
    author: "Elijah Meeks",
    date: "2026-05-29",
    tags: ["case-study", "ai"],
    excerpt:
      "Hand `suggestCharts()` a hundred rows and it'll pick the right chart for the hundred. The production dataset is a million rows and the choice is wrong. Scale-aware suggestions close the gap by accepting a declared `DataScaleProfile` — what scale the data actually has, not what the sample looked like. With the design decisions behind it: split scale from quality, breakpoints per-chart not global, and the single-value gap the work surfaced.",
    draft: true,
  },
  {
    slug: "release-3-6-0",
    title: "Semiotic 3.6.0",
    subtitle:
      "The AI release. A heuristic chart recommender, audience-aware ranking, focus + interrogation hooks for two-way anchored conversation, an MCP server, and a per-chart capability layer that makes the library itself a structured catalog.",
    author: "AI-Generated",
    date: "2026-05-26",
    tags: ["release"],
    excerpt:
      "3.6.0 turns Semiotic's observation hooks, native annotations, and streaming runtime into an explicit AI-facing surface. Charts declare what they're for; datasets get profiled and ranked; audiences get calibrated; conversations anchor back to the chart instead of stopping at a chat bubble. Three case-study posts published alongside the release walk through what the new shape makes possible.",
  },
  {
    slug: "from-spec-to-runtime",
    title: "From spec to runtime",
    subtitle:
      "What landed after the M1 trio: annotations that actually age, a conversation-arc hook with auto-instrumentation, and a shared classifier that ties the three age-as-encoding systems together.",
    author: "Elijah Meeks",
    date: "2026-05-28",
    tags: ["case-study", "ai", "roadmap"],
    excerpt:
      "The previous post introduced three AI-facing surfaces as types and stubs. This one is what shipped to make them real — applyAnnotationLifecycle as a one-line opacity-and-dashing pass, useConversationArc as the React entry point, auto-instrumentation on the existing AI hooks so an arc captures itself, and the shared bandFromAge primitive that lets decay, staleness, and freshness compose instead of competing.",
    draft: true,
  },
  {
    slug: "talk-track-intelligence",
    title: "The arc, the annotation, and the variant",
    subtitle:
      "Three composable AI surfaces: conversation-arc telemetry, annotation provenance + lifecycle, and a variant discovery plug point. Two are runnable inline.",
    author: "Elijah Meeks",
    date: "2026-05-27",
    tags: ["case-study", "ai", "roadmap"],
    excerpt:
      "AI-assisted chart authoring is a session, not a single call. The spine for treating that session as a first-class thing — an event vocabulary for the arc itself, provenance + lifecycle on every annotation, and an extension surface for variant proposers.",
    draft: true,
  },
  {
    slug: "live-conversational-dashboard",
    title: "Live conversational dashboards",
    subtitle:
      "Streaming data + an AI watching alongside you + anchored annotations + a conversational follow-up surface. The class of product Semiotic's streaming-first runtime makes possible.",
    author: "Elijah Meeks",
    date: "2026-05-31",
    tags: ["case-study", "realtime"],
    excerpt:
      "Static dashboards show the past; chat-with-chart makes the past interrogable. Live conversational dashboards add what's missing: an AI watching the stream as it arrives, narrating events anchored to the chart, with a chat surface for human follow-ups. Draft post on composing Semiotic's streaming runtime, interrogation hook, and annotation model into a single product.",
    draft: true,
  },
  {
    slug: "anchored-conversations",
    title: "Anchored conversations: when the AI knows which point you're asking about",
    subtitle:
      "Two-way point-anchored AI conversation: the user clicks, the AI answers about that specific point, and the answer lives on the chart as a clickable note.",
    author: "Elijah Meeks",
    date: "2026-06-01",
    tags: ["case-study"],
    excerpt:
      "Chat-with-chart works, but the user has to verbalize which point they care about and the AI has to verbalize where the answer applies. Both steps lose the spatial information that's already on screen. Bidirectional point-anchored AI conversation, with useChartFocus + useChartInterrogation as the building blocks.",
  },
  {
    slug: "multimodal-response",
    title: "Multimodal response: chart as output channel",
    subtitle:
      "Text is half the answer. The other half — callouts, thresholds, bands, selections — lives on the chart, and LLMs already know how to ask for it.",
    author: "Elijah Meeks",
    date: "2026-05-24",
    tags: ["case-study"],
    excerpt:
      "Modern LLM assistants treat text as the only output channel. When the question is about a chart, charts give us a parallel surface — callouts, threshold lines, bands, selections — that's both more honest and easier to read. Drafted exploration of what multimodal response means in practice.",
    draft: true,
  },
  {
    slug: "charts-that-know-what-theyre-for",
    title: "Charts that know what they're for",
    subtitle:
      "A heuristic-first chart recommendation engine with per-audience calibration, a literacy-growth surface, and ready-to-render props.",
    author: "Elijah Meeks",
    date: "2026-05-25",
    tags: ["case-study"],
    excerpt:
      "Semiotic 3.6.0 ships a chart recommendation engine that's heuristic-first, LLM-optional, and audience-aware. Charts now carry descriptors that declare what data shapes they serve and which questions they answer; an AudienceProfile layers per-org familiarity and adoption targets on top; a separate 'stretch' surface grows literacy without forcing it.",
  },
  {
    slug: "release-3-5-4",
    title: "Semiotic 3.5.4",
    subtitle:
      "Asymmetric bands and percentile fans on LineChart/AreaChart, edge-anchored ticks, theme-driven CSS font-size variables, per-axis class names, loadingContent on every HOC, and one unified ribbon primitive for bounds and band.",
    author: "AI-Generated",
    date: "2026-05-21",
    tags: ["release"],
    excerpt:
      "3.5.4 adds a first-class asymmetric band encoding (with percentile fans) to LineChart and AreaChart, sharpens the axis surface with edge-anchored ticks, CSS-variable font sizes, and per-axis class names, ships loadingContent across every HOC, and collapses bounds + band into a single shared ribbon primitive.",
  },
  {
    slug: "release-3-5-3",
    title: "Semiotic 3.5.3",
    subtitle:
      "DifferenceChart, exact axis ticks, Swimlane rounded ends, ProcessSankey lifecycle timing, the new blog pipeline, and refreshed 45-chart AI capabilities.",
    author: "AI-Generated",
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
    author: "AI-Generated",
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

// Published-only mirror — what RSS, prerender, and OG-card emit. Anything
// marked `draft: true` in `allBlogEntriesMeta` is dropped.
export const blogEntriesMeta = allBlogEntriesMeta.filter((entry) => !entry.draft)
