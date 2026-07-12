// Single source of truth for the examples section: narrative order, titles,
// paths, and overview-card copy. The overview grid renders from it and
// ExamplePageLayout derives every page's prev/next from it — reordering the
// section means editing this file only. (App.jsx route registrations still
// name each path; the check:docs-routes gate catches drift.)
export const EXAMPLE_FILTERS = {
  frames: [
    { id: "stream-physics", label: "Stream physics" },
    { id: "gauntlet", label: "Gauntlet" },
    { id: "xy", label: "XY" },
    { id: "ordinal", label: "Ordinal" },
    { id: "network", label: "Network" },
    { id: "geo", label: "Geographic" },
    { id: "custom", label: "Custom" },
  ],
  topics: [
    { id: "process", label: "Processes" },
    { id: "realtime", label: "Realtime" },
    { id: "uncertainty", label: "Uncertainty" },
    { id: "climate", label: "Climate" },
    { id: "civic", label: "Civic" },
    { id: "history", label: "History" },
    { id: "culture", label: "Culture" },
    { id: "geography", label: "Geography" },
    { id: "ai", label: "AI" },
    { id: "design", label: "Design" },
    { id: "accessibility", label: "Accessibility" },
  ],
}

export const EXAMPLES = [
  {
    title: "The Insight Forge",
    path: "/examples/insight-forge",
    eyebrow: "Portable analytical artifacts · five chart rooms",
    description:
      "Collect semantic clues from time, category, flow, and cohort views; craft filters, test a carrier hypothesis, preserve a false positive, and bind the accepted packaging insight to a durable knowledge view.",
    preview: "insight-forge",
    badges: ["Portable artifacts", "Deterministic recipes", "Audited lineage"],
    frames: ["xy", "ordinal", "network"],
    topics: ["process", "design", "accessibility", "ai"],
  },
  {
    title: "Watermarks, Made Physical",
    path: "/examples/watermarks",
    eyebrow: "EventDropChart · streaming lateness",
    description:
      "A physics-backed remake of the flink-watermarks mechanic: event-time windows become bins, the watermark closes old windows, and late arrivals collect in a visible gutter.",
    preview: "watermarks",
    badges: ["EventDropChart", "Physics", "Agent-readable"],
    frames: ["stream-physics", "xy"],
    topics: ["process", "realtime"],
  },
  {
    title: "The Stakeholder Journey",
    path: "/examples/stakeholder-journey",
    eyebrow: "StreamPhysicsFrame · controlled process comparison",
    description:
      "One deterministic cohort begins from the same path through Habit; a stage ledger measures the invitation relay and feeds Leadership reach back into synchronized process geometry.",
    preview: "stakeholder-journey",
    badges: ["StreamPhysicsFrame", "Stage ledger", "Live geometry"],
    frames: ["stream-physics"],
    topics: ["process", "civic"],
  },
  {
    title: "Merge Pressure",
    path: "/examples/merge-pressure",
    eyebrow: "GauntletChart · compound PR stream",
    description:
      "Staggered compound PRs share finite human review, recirculate through CI, transform attached risks, and accumulate merged points into a Feature.",
    preview: "merge-pressure",
    badges: ["GauntletChart", "Shared capacity", "Weighted groups"],
    frames: ["gauntlet"],
    topics: ["process", "ai"],
  },
  {
    title: "Not in MY Backyard",
    path: "/examples/not-in-my-backyard",
    eyebrow: "GauntletChart · compound process physics",
    description:
      "A housing approval simulator where a plan enters as a compound glyph, loses features at civic gates, gains dollar-weight burden, loops through procedural review, and may reach approval without becoming housing.",
    preview: "nimby",
    badges: ["GauntletChart", "bodyForces", "Compound glyphs"],
    frames: ["gauntlet"],
    topics: ["process", "civic"],
  },
  {
    title: "Brushable Weather Rings",
    path: "/examples/climate-radial-weather",
    eyebrow: "Point controls + radial weather",
    description:
      "Combines point climate controls with a radial custom ordinal chart and stacked temporal detail.",
    preview: "combined",
    badges: ["Custom chart", "Accessible navigation"],
    frames: ["ordinal", "custom"],
    topics: ["climate", "design", "accessibility"],
  },
  {
    title: "Lake Travis, in Signs",
    path: "/examples/lake-travis-isotype",
    eyebrow: "Four custom frames · ISOTYPE",
    description:
      "A lake-level and weather dashboard rebuilt with repeated pictograms across streaming XY, ordinal, network, and geographic custom layouts.",
    preview: "lake-isotype",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["xy", "ordinal", "network", "geo", "custom"],
    topics: ["climate", "geography", "accessibility"],
  },
  {
    title: "Nathan's Hot Dog Contest, Four Ways",
    path: "/examples/hot-dog-contest-variations",
    eyebrow: "TemporalHistogram · ISOTYPE · source audit",
    description:
      "A source-audited remake of the classic Nathan's winning-count chart as a streaming temporal histogram, annual ISOTYPE ledger, event-banded line chart, and duration-normalized pace mirror.",
    preview: "hotdog-variations",
    badges: ["TemporalHistogram", "ISOTYPE", "Source-audited"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["culture", "design"],
  },
  {
    title: "The Buildings Behind AI",
    path: "/examples/data-centers-isotype",
    eyebrow: "Altitude sections · evidence ledger",
    description:
      "An ISOTYPE account of the AI build-out: relief sections carry data centers across the U.S. map, arrow units trace power and water, unit grids count capacity and compute—and every claim keeps its denominator and source.",
    preview: "data-centers-isotype",
    badges: ["Custom chart", "Local", "Agent-readable"],
    frames: ["geo", "custom"],
    topics: ["ai", "geography", "climate"],
  },
  {
    title: "Creative Gravity of America",
    path: "/examples/creative-contours",
    eyebrow: "Isometric GeoCustomChart - contours",
    description:
      "Metro creative-industry signals become contour shelves on a stacked isometric view of the United States: screen, sound, games, design, and research are sampled into a non-topographic terrain.",
    preview: "creative-contours",
    badges: ["GeoCustomChart", "Contours", "Isometric", "Custom layout"],
    frames: ["geo", "custom"],
    topics: ["culture", "geography", "design"],
  },
  {
    title: "Sometimes it's better to be discrete",
    path: "/examples/sometimes-better-discrete",
    eyebrow: "TokenLayer · task-aware ISOTYPE",
    description:
      "Guess the area, then count the buses: a bus-waiting decision rebuilt as a density curve, a Kay/Hullman quantile dotplot, animated hypothetical outcomes, a 100-commuter risk array, and a hybrid tokenized bar — with IDID recommending the encoding for the reader's task and a live design critic flagging sabotaged versions.",
    preview: "discrete",
    badges: ["TokenLayer", "Quantile dotplot", "HOPs", "Design critic"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["uncertainty", "design", "accessibility"],
  },
  {
    title: "All the Wars of the United States",
    path: "/examples/us-war-timeline",
    eyebrow: "Custom ordinal timeline",
    description:
      "A layered timeline of conflicts, geopolitical spheres, historical periods, concurrency, and the comparatively rare years of peace.",
    preview: "wars",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["ordinal", "custom"],
    topics: ["history", "geography", "accessibility"],
  },
  {
    title: "A Genealogy of Cubism and Abstract Art",
    path: "/examples/art-movement-genealogy",
    eyebrow: "Automatic chronological network",
    description:
      "A constraint-laid influence graph styled after Alfred H. Barr Jr.'s iconic 1936 Cubism and Abstract Art cover.",
    preview: "art",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["network", "custom"],
    topics: ["history", "culture", "accessibility"],
  },
  {
    title: "Paris, Isometric City of Lights",
    path: "/examples/paris-isometric-landmarks",
    eyebrow: "Custom isometric GeoFrame",
    description:
      "Five-by-five strategy-game views of Paris, Austin, San Francisco, and Tokyo, populated from DBpedia landmarks with resilient local snapshots.",
    preview: "isometric",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["geo", "custom"],
    topics: ["geography", "culture", "accessibility"],
  },
  {
    title: "The Wheel of Urines",
    path: "/examples/urine-wheel",
    eyebrow: "Custom radial network",
    description:
      "A medieval uroscopy diagnostic redrawn as a node-link diagram in a ring — twenty named urine colors, each spoked to the stage of digestion it signifies.",
    preview: "urine",
    badges: ["Custom recipe", "Local", "Intent-aware", "Accessible navigation", "Agent-readable"],
    frames: ["network", "custom"],
    topics: ["history", "culture", "accessibility"],
  },
  {
    title: "The New York & Erie Railroad",
    path: "/examples/erie-railroad-organization",
    eyebrow: "Custom botanical hierarchy",
    description:
      "McCallum and Henshaw's landmark 1855 organization diagram rebuilt as computed railroad trunks, workforce boughs, and navigable roles.",
    preview: "erie",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["network", "custom"],
    topics: ["history", "accessibility"],
  },
  {
    title: "Wikipedia, as it happens",
    path: "/examples/wikipedia-realtime",
    eyebrow: "Five coordinated realtime swarms",
    description:
      "A live, filterable view of English Wikipedia edits with actor classification, signed change encodings, aggregation, and revision-level drilldown.",
    preview: "wikipedia",
    badges: ["Custom chart", "Local", "Intent-aware"],
    frames: ["xy", "network", "custom"],
    topics: ["realtime", "culture", "design"],
  },
  {
    title: "Your Local Government Explorer",
    path: "/examples/local-government-explorer",
    eyebrow: "ZIP-driven civic data + networks",
    description:
      "Resolve any postal place into its county's federal disaster record and spending, live 311 service requests, LOCUS municipal law, and a network of bodies, sponsors, meetings, and active legislation.",
    preview: "local-government",
    frames: ["network", "geo", "custom"],
    topics: ["civic", "geography", "realtime"],
  },
  {
    title: "The Long Way Around",
    path: "/examples/port-congestion-replay",
    eyebrow: "Real chokepoint data, four-frame replay",
    description:
      "Real IMF PortWatch container transits replay three seasons of the global ocean — a quiet spring, the Ever Given blockage, and the Red Sea detour — across a flow map, a temporal process flow, a push-driven deviation waterfall, and a cross-scenario scatterplot matrix.",
    preview: "port-replay",
    frames: ["xy", "ordinal", "geo", "custom"],
    topics: ["realtime", "geography", "history", "process"],
  },
  {
    title: "The Scroll You're Telling",
    path: "/examples/scroll-youre-telling",
    eyebrow: "Realtime reader telemetry",
    description:
      "A scrollytelling essay on the evolution of data journalism that records your own scroll, velocity, and dwell as a live stream and plots it back — the reader as the data source.",
    preview: "scroll-tell",
    badges: ["Custom chart", "Local", "Intent-aware"],
    frames: ["xy", "custom"],
    topics: ["realtime", "culture", "design", "accessibility"],
  },
  {
    title: "The 12 Kinds of Data Visualization People",
    path: "/examples/dataviz-people",
    eyebrow: "Twelve personas · twelve chart grammars",
    description:
      "An expanded remake of the Nightingale essay: Excel brute forcers, Tableau zen masters, Accurat-style studios, news orgs, scientists, industry oracles, fun freelancers, procedural artists, finance annotators, DevOps terminal wizards, workshop nomads, and academic dissectors each get a chart body.",
    preview: "dataviz-people",
    badges: ["Custom chart", "Sankey", "Candlestick", "Local"],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: ["culture", "design"],
  },
  {
    title: "Can You Know a Book Better Without Reading It?",
    path: "/examples/distant-reading",
    eyebrow: "Distant reading · literary signals",
    description:
      "A rich remake of the Nightingale essay as an interactive distant-reading room: chapter signal fields, phase summaries, corpus fingerprints, and narrative-flow Sankeys for four public-domain novels.",
    preview: "distant-reading",
    badges: ["LineChart", "BarChart", "Sankey", "Local"],
    frames: ["xy", "ordinal", "network"],
    topics: ["culture", "design"],
  },
  {
    title: "We Live in a World of Funnels",
    path: "/examples/world-of-funnels",
    eyebrow: "Funnel analysis · Pop Art flows",
    description:
      "An interactive remake of the funnel essay: classic conversion funnels, A/B testing, branching Sankey paths, and temporal path motifs argue through precision and accuracy.",
    preview: "funnels",
    badges: ["FunnelChart", "Sankey", "ProcessSankey"],
    frames: ["ordinal", "network", "custom"],
    topics: ["process", "design"],
  },
  {
    title: "What the Machine Sees",
    path: "/examples/what-the-machine-sees",
    eyebrow: "The intelligence layer, end to end",
    description:
      "Watch Semiotic read real World Bank data with no model call: profile it, rank chart capabilities, then describe, audit, and lay out a navigable structure for the chart it chooses.",
    preview: "machine",
    badges: [
      "Custom recipe",
      "Portable",
      "Intent-aware",
      "Scene-audited",
      "Accessible navigation",
      "Agent-readable",
    ],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: ["ai", "design", "accessibility"],
  },
  {
    title: "The Living System of Semiotic",
    path: "/examples/semiotic-architecture",
    eyebrow: "Interactive architecture map",
    description:
      "Trace each example from its visible charts and settings through the four frame models, data inputs, and the rhizomatic implementation beneath them.",
    preview: "architecture",
    frames: ["network", "custom"],
    topics: ["design", "process", "accessibility"],
  },
  {
    title: "The Octopus: It has its tentacles in everything",
    path: "/examples/octopus-metaphor",
    eyebrow: "Network + GeoCustomChart metaphor",
    description:
      "A history of the octopus as an information-visualization metaphor: moral networks, imperial octopus maps, and a final Semiotic-as-octopus frame diagram.",
    preview: "octopus",
    badges: ["Custom chart", "GeoCustomChart", "NetworkCustomChart"],
    frames: ["network", "geo", "custom"],
    topics: ["history", "geography", "design"],
  },
  {
    title: "Point Climate Anomaly",
    path: "/examples/climate-anomaly",
    eyebrow: "Difference chart + uncertainty band",
    description:
      "A polished climate readout comparing this year's daily temperature with an adjusted historical mean and the 5th-95th percentile range.",
    preview: "climate",
    frames: ["xy"],
    topics: ["climate", "uncertainty"],
  },
  {
    title: "The Gestalt of Data Visualization",
    path: "/examples/gestalt-principles",
    eyebrow: "Five chapters · perception → Semiotic",
    description:
      "A chapterized remake of the 2015 Gestalt Principles essays — similarity, common fate, proximity, figure/ground, continuity — each demonstrated on a live Semiotic chart, in a Bauhaus 'perception lab' look.",
    preview: "gestalt",
    frames: ["xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Mobile Data Visualization That Works",
    path: "/examples/mobile-data-visualization",
    eyebrow: "Mobile-first review · Semiotic demos",
    description:
      "A research-backed field guide for phone-sized visualization: density budgets, small multiples, touch-first controls, constraint breakpoints, and source-led design choices built as live Semiotic demos.",
    preview: "mobilevis",
    badges: ["Responsive", "Research-backed", "Touch-first"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Drawing Networks",
    path: "/examples/network-visualization",
    eyebrow: "Eight chapters + an interactive toy",
    description:
      "A mid-century 'visual primer' that rebuilds a 2015 network-visualization workshop on Semiotic — arc diagrams, adjacency matrices, the force-directed hairball, edge and node encodings, communities, Sankey and chord — and ends with a hands-on network-analysis toy (pathfinding, centrality, ego networks, the spatial problem).",
    preview: "networkviz",
    frames: ["network", "xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Map of the Oregon Trail",
    path: "/examples/oregon-trail",
    eyebrow: "Retro cartography · GeoCustomChart",
    description:
      "The 1985 Oregon Trail end-game map, rebuilt with GeoCustomChart over real Washington/Oregon/Idaho geography — gray land, CGA-blue rivers, caret mountains, forts, and a wagon you can drive from START to FINISH.",
    preview: "oregontrail",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["geo", "custom"],
    topics: ["history", "geography", "accessibility"],
  },
]
