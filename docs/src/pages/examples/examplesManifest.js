// Single source of truth for the examples section: narrative order, titles,
// paths, and overview-card copy. The overview grid renders from it and
// ExamplePageLayout derives every page's prev/next from it — reordering the
// section means editing this file only. (App.js route registrations still
// name each path; the check:docs-routes gate catches drift.)
export const EXAMPLES = [
  {
    title: "Point Climate Radial",
    path: "/examples/climate-radial-weather",
    eyebrow: "Point controls + radial weather",
    description:
      "Combines point climate controls with a radial custom ordinal chart and stacked temporal detail.",
    preview: "combined",
  },
  {
    title: "All the Wars of the United States",
    path: "/examples/us-war-timeline",
    eyebrow: "Custom ordinal timeline",
    description:
      "A layered timeline of conflicts, geopolitical spheres, historical periods, concurrency, and the comparatively rare years of peace.",
    preview: "wars",
  },
  {
    title: "A Genealogy of Cubism and Abstract Art",
    path: "/examples/art-movement-genealogy",
    eyebrow: "Automatic chronological network",
    description:
      "A constraint-laid influence graph styled after Alfred H. Barr Jr.'s iconic 1936 Cubism and Abstract Art cover.",
    preview: "art",
  },
  {
    title: "Cities, Tile by Tile",
    path: "/examples/paris-isometric-landmarks",
    eyebrow: "Custom isometric GeoFrame",
    description:
      "Five-by-five strategy-game views of Paris, Austin, San Francisco, and Tokyo, populated from DBpedia landmarks with resilient local snapshots.",
    preview: "isometric",
  },
  {
    title: "The Wheel of Urines",
    path: "/examples/urine-wheel",
    eyebrow: "Custom radial network",
    description:
      "A medieval uroscopy diagnostic redrawn as a node-link diagram in a ring — twenty named urine colors, each spoked to the stage of digestion it signifies.",
    preview: "urine",
  },
  {
    title: "The New York & Erie Railroad",
    path: "/examples/erie-railroad-organization",
    eyebrow: "Custom botanical hierarchy",
    description:
      "McCallum and Henshaw's landmark 1855 organization diagram rebuilt as computed railroad trunks, workforce boughs, and navigable roles.",
    preview: "erie",
  },
  {
    title: "Wikipedia, as it happens",
    path: "/examples/wikipedia-realtime",
    eyebrow: "Five coordinated realtime swarms",
    description:
      "A live, filterable view of English Wikipedia edits with actor classification, signed change encodings, aggregation, and revision-level drilldown.",
    preview: "wikipedia",
  },
  {
    title: "Your Local Government Explorer",
    path: "/examples/local-government-explorer",
    eyebrow: "ZIP-driven civic data + networks",
    description:
      "Resolve any postal place into its county's federal disaster record and spending, live 311 service requests, LOCUS municipal law, and a network of bodies, sponsors, meetings, and active legislation.",
    preview: "local-government",
  },
  {
    title: "Where the Boxes Wait",
    path: "/examples/port-congestion-replay",
    eyebrow: "Four-frame logistics replay",
    description:
      "A night-shift port control room tracing container cohorts through five global maritime corridors, a temporal process flow, a push-driven backlog, and route comparison.",
    preview: "port-replay",
  },
  {
    title: "The Scroll You're Telling",
    path: "/examples/scroll-youre-telling",
    eyebrow: "Realtime reader telemetry",
    description:
      "A scrollytelling essay on the evolution of data journalism that records your own scroll, velocity, and dwell as a live stream and plots it back — the reader as the data source.",
    preview: "scroll-tell",
  },
  {
    title: "What the Machine Sees",
    path: "/examples/what-the-machine-sees",
    eyebrow: "The intelligence layer, end to end",
    description:
      "Watch Semiotic read real World Bank data with no model call: profile it, rank chart capabilities, then describe, audit, and lay out a navigable structure for the chart it chooses.",
    preview: "machine",
  },
  {
    title: "The Living System of Semiotic",
    path: "/examples/semiotic-architecture",
    eyebrow: "Interactive architecture map",
    description:
      "Trace each example from its visible charts and settings through the four frame models, data inputs, and the rhizomatic implementation beneath them.",
    preview: "architecture",
  },
  {
    title: "Point Climate Anomaly",
    path: "/examples/climate-anomaly",
    eyebrow: "Difference chart + uncertainty band",
    description:
      "A polished climate readout comparing this year's daily temperature with an adjusted historical mean and the 5th-95th percentile range.",
    preview: "climate",
  },
  {
    title: "The Gestalt of Data Visualization",
    path: "/examples/gestalt-principles",
    eyebrow: "Five chapters · perception → Semiotic",
    description:
      "A chapterized remake of the 2015 Gestalt Principles essays — similarity, common fate, proximity, figure/ground, continuity — each demonstrated on a live Semiotic chart, in a Bauhaus 'perception lab' look.",
    preview: "gestalt",
  },
  {
    title: "Drawing Networks",
    path: "/examples/network-visualization",
    eyebrow: "Eight chapters + an interactive toy",
    description:
      "A mid-century 'visual primer' that rebuilds a 2015 network-visualization workshop on Semiotic — arc diagrams, adjacency matrices, the force-directed hairball, edge and node encodings, communities, Sankey and chord — and ends with a hands-on network-analysis toy (pathfinding, centrality, ego networks, the spatial problem).",
    preview: "networkviz",
  },
  {
    title: "Map of the Oregon Trail",
    path: "/examples/oregon-trail",
    eyebrow: "Retro cartography · GeoCustomChart",
    description:
      "The 1985 Oregon Trail end-game map, rebuilt with GeoCustomChart over real Washington/Oregon/Idaho geography — gray land, CGA-blue rivers, caret mountains, forts, and a wagon you can drive from START to FINISH.",
    preview: "oregontrail",
  },
]
