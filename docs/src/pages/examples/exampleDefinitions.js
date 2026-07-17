export const EXAMPLE_DATA_STATES = Object.freeze(["live", "snapshot", "fallback", "error"])

const EXAMPLE_DATA_STATE_SET = new Set(EXAMPLE_DATA_STATES)
const EXAMPLE_CONTRACT_FIELDS = [
  "publicImports",
  "data",
  "provenance",
  "accessibility",
  "motion",
  "responsive",
  "ssr",
  "performance",
]

const DECLARED_EXAMPLE_CONTRACT_STATUS = "declared"
const NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS = "not-assessed"
const UNMEASURED_EXAMPLE_PERFORMANCE_STATUS = "unmeasured"
const EXAMPLE_PERFORMANCE_BUDGET_FIELDS = ["bundle", "interaction", "memory", "hiddenPage"]
const UNASSESSED_CONTRACT_FIELD = Object.freeze({
  status: NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS,
})
const UNMEASURED_EXAMPLE_PERFORMANCE_BUDGETS = Object.freeze(
  Object.fromEntries(
    EXAMPLE_PERFORMANCE_BUDGET_FIELDS.map((field) => [
      field,
      UNMEASURED_EXAMPLE_PERFORMANCE_STATUS,
    ]),
  ),
)

// This is a declaration of missing assessment, not a claim about a route's
// behavior. Route-specific contracts replace it as they are reviewed.
const UNASSESSED_EXAMPLE_CONTRACT = Object.freeze({
  assessment: NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS,
  publicImports: UNASSESSED_CONTRACT_FIELD,
  data: UNASSESSED_CONTRACT_FIELD,
  provenance: UNASSESSED_CONTRACT_FIELD,
  accessibility: UNASSESSED_CONTRACT_FIELD,
  motion: UNASSESSED_CONTRACT_FIELD,
  responsive: UNASSESSED_CONTRACT_FIELD,
  ssr: Object.freeze({
    status: NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS,
    hydration: NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS,
  }),
  performance: Object.freeze({
    status: UNMEASURED_EXAMPLE_PERFORMANCE_STATUS,
    budgets: UNMEASURED_EXAMPLE_PERFORMANCE_BUDGETS,
  }),
})

/**
 * @typedef {"live" | "snapshot" | "fallback" | "error"} ExampleDataState
 *
 * @typedef {object} ExampleDefinition
 * @property {string} id Stable machine-readable example identifier.
 * @property {string} path Public docs route, rooted at `/examples/`.
 * @property {string} title Reader-facing title.
 * @property {string} eyebrow Short chart/family label.
 * @property {string} description Overview-card copy.
 * @property {string} preview Overview-card preview identifier.
 * @property {readonly string[]} [badges] Overview-card capability labels.
 * @property {readonly string[]} frames Frame-family filters.
 * @property {readonly string[]} topics Topic filters.
 * @property {boolean} isPilot Whether this definition drives the incremental registry migration.
 * @property {string} sourceFile Page source file used by the lazy Full Code loader.
 * @property {ExampleContract} contract Public experience and maintenance contract.
 *
 * @typedef {{ status: "not-assessed" }} UnassessedExampleContractField
 *
 * @typedef {object} ExampleContract
 * @property {"declared" | "not-assessed"} assessment Whether the record is route-specific or explicitly unassessed.
 * @property {readonly string[] | UnassessedExampleContractField} publicImports Public Semiotic entry points used by the page.
 * @property {{ states: readonly ExampleDataState[], fixture: { kind: string, replay: boolean, schemaVersion: string } } | UnassessedExampleContractField} data
 * @property {{ source: string, capturedAt: string, freshnessOwner: string, reviewCadence: string } | UnassessedExampleContractField} provenance
 * @property {{ summary: string, navigation: string, keyboard: string, forcedColors: string } | UnassessedExampleContractField} accessibility
 * @property {{ reducedMotion: string, visibility: string } | UnassessedExampleContractField} motion
 * @property {{ status: string, viewports: readonly number[], selectionIdentity: string } | UnassessedExampleContractField} responsive
 * @property {{ status: string, hydration: string }} ssr
 * @property {{ status: string, budgets: Record<string, string> }} performance
 */

/** @type {readonly ExampleDefinition[]} */
const PILOT_EXAMPLE_DEFINITIONS = Object.freeze([
  {
    id: "living-ledger",
    path: "/examples/living-ledger",
    sourceFile: "LivingLedgerExamplePage.jsx",
    isPilot: true,
    title: "The Living Ledger",
    eyebrow: "Six views · one evidence chain",
    description:
      "Trace a coral threshold, a forest disturbance, and a modeled pollination gap backward to evidence and forward to people.",
    contract: {
      publicImports: [
        "semiotic/controls",
        "semiotic/geo",
        "semiotic/network",
        "semiotic/ordinal",
        "semiotic/physics",
        "semiotic/recipes",
        "semiotic/utils",
        "semiotic/xy",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-illustrative-180-day-ecosystem-service-replay",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Authored deterministic replay grounded in the bundled source and method manifest",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Six chart-level tables, a complete service-system projection, evidence logs, alert explanations, and polite selection announcements",
        navigation:
          "SentenceFilter, guided scene rail, alert desk, synchronized chart selection, network modes, provenance, and full tabular projection",
        keyboard:
          "Native buttons, range input, SentenceFilter popovers, chart navigation, tables, details, Enter, Space, Escape, and Arrow keys",
        forcedColors:
          "Atlas panels, status shapes, selected systems, chart controls, tables, and focus rings retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "Replay jumps to a discrete end state; frame transitions stop and the physics pipeline opens on a static projection",
        visibility:
          "Physics suspends while hidden and the deterministic replay interval exists only while explicitly playing",
      },
      responsive: {
        status: "browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable serviceSystemId, evidence ID, threshold ID, and observation-event ID",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-tested",
        hydration:
          "deterministic replay and filters; optional world reference geography resolves after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route with public frame-family entry points and asynchronously loaded reference geography",
          interaction:
            "memoized snapshot, pulse, ledger, network, filtering, and threshold projections",
          memory:
            "180 bounded replay days, nine service systems, and a bounded 72-particle observation stream",
          hiddenPage: "physics suspendWhenHidden enabled and replay interval cleaned up",
        },
      },
    },
  },
  {
    id: "analyst-adventure",
    path: "/examples/analyst-adventure",
    sourceFile: "AnalystAdventureExamplePage.jsx",
    isPilot: true,
    title: "Analyst Adventure: The Case of the Vanishing Visionary",
    eyebrow: "Five Stream Frames · analytical adventure",
    description:
      "Investigate a missing CEO across temporal, categorical, geographic, network, and physics rooms where reading each chart determines the story.",
    contract: {
      publicImports: [
        "semiotic",
        "semiotic/ai",
        "semiotic/utils",
        "semiotic/xy",
        "semiotic/ordinal",
        "semiotic/geo",
        "semiotic/network",
        "semiotic/physics",
        "semiotic/rough",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-seed-1984-story-and-chart-fixtures",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Deterministic fictional Zorkcorp fixtures derived from docs/strategy/example-cyoa.md",
        capturedAt: "2026-07-13",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Visible generated descriptions, complete data tables, and a settled physics ledger",
        navigation:
          "Synchronized AccessibleNavTree data and annotations branches in every chart room",
        keyboard:
          "Native choices and annotations; 1–4, H, D, R, Enter, Space, Escape, and chart arrow navigation",
        forcedColors:
          "CGA panels, choices, focus rings, and chart controls retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "Particles and chart animation stop; physics opens on its deterministic settled projection",
        visibility:
          "Stream physics suspends while hidden and ordinary chart transitions are room-scoped",
      },
      responsive: {
        status: "browser-tested",
        viewports: [320, 390, 430, 768, 1280],
        selectionIdentity: "stable fixture datum ID and annotation stableId",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-tested",
        hydration: "deterministic seed and browser-only effects deferred until mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route and tree-shakeable public entry points",
          interaction: "memoized datasets, reader analyses, layouts, and annotations",
          memory: "180-event conversation arc and bounded 31-body physics scene",
          hiddenPage: "physics suspendWhenHidden enabled",
        },
      },
    },
  },
  {
    id: "sentence-structure",
    path: "/examples/sentence-structure",
    sourceFile: "SentenceStructureExamplePage.jsx",
    isPilot: true,
    title: "The Sentence Is Not the Words",
    eyebrow: "Nine linked linguistic views · natural-language controls",
    description:
      "Follow one sentence through grammar, ambiguity, meaning, rhetoric, corpus paths, phrase relationships, and textual variants without losing the words you selected.",
    contract: {
      publicImports: ["semiotic/controls", "semiotic/network", "semiotic/xy", "semiotic/utils"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-authored-linguistic-specimens-and-corpus-excerpts",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Curated deterministic fixtures derived from docs/strategy/example-sentence.md",
        capturedAt: "2026-07-14",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Continuous sentence names, view-specific structural summaries, source recovery, and accessible relationship tables",
        navigation:
          "Native sentence-filter controls, view rail, specimen cards, token ribbon, and related-entity summaries",
        keyboard: "Enter, Space, Escape, Arrow keys, Home, End, and native form controls",
        forcedColors:
          "Editorial controls, selected tokens, diagrams, and focus rings retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "Cross-view fades and path drawing stop while persistent selections remain visible",
        visibility:
          "No timers or background simulation; authored diagrams update only from reader input",
      },
      responsive: {
        status: "browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable specimen, token, phrase, dependency, concept, and variant IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-tested",
        hydration: "deterministic fixtures and measurement-free initial sentence control output",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route with public controls, XY, network, and utility entry points",
          interaction: "memoized fixture projections and bounded authored structures",
          memory: "six sentence specimens and a small checked-in corpus",
          hiddenPage: "no background work",
        },
      },
    },
  },
  {
    id: "watermarks",
    path: "/examples/watermarks",
    sourceFile: "WatermarksExamplePage.jsx",
    isPilot: true,
    title: "Watermarks, Made Physical",
    eyebrow: "EventDropChart · streaming lateness",
    description:
      "A physics-backed remake of the flink-watermarks mechanic with event-time and arrival-time as separate axes.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-scenarios",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Flink watermark mechanics, recreated with deterministic local scenarios",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative explanation and settled-window readouts",
        navigation: "Scenario controls and selected-event detail",
        keyboard: "Native buttons, range inputs, and select controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "selected event ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
  {
    id: "stakeholder-journey",
    path: "/examples/stakeholder-journey",
    sourceFile: "StakeholderJourneyExamplePage.jsx",
    isPilot: true,
    title: "The Stakeholder Journey",
    eyebrow: "StreamPhysicsFrame · controlled process comparison",
    description:
      "One deterministic cohort tracks the invitation relay and feeds leadership reach back into synchronized process geometry.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-simulation",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Stakeholder Journey and Open Source Ecosystem Canvas essays",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative comparison and stage ledger",
        navigation: "System selector and selected-stage detail",
        keyboard: "Native buttons and controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "stage ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
  {
    id: "merge-pressure",
    path: "/examples/merge-pressure",
    sourceFile: "MergePressureExamplePage.jsx",
    isPilot: true,
    title: "Merge Pressure",
    eyebrow: "GauntletChart · compound PR stream",
    description:
      "Compound PRs share finite review capacity, recirculate through CI, and accumulate merged points into a compound artifact.",
    contract: {
      publicImports: ["semiotic/physics"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-simulation",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "Illustrative deterministic pull-request workflow model",
        capturedAt: "2026-07-12",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Narrative workflow explanation and capacity readouts",
        navigation: "Scenario controls and project-state detail",
        keyboard: "Native buttons and controls",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion: "not-reviewed",
        visibility: "not-reviewed",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "project ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle: "unmeasured",
          interaction: "unmeasured",
          memory: "unmeasured",
          hiddenPage: "unmeasured",
        },
      },
    },
  },
])

const EXAMPLE_REGISTRY_METADATA = [
  {
    title: "The Living Ledger",
    path: "/examples/living-ledger",
    eyebrow: "Six views · one evidence chain",
    description:
      "Trace a coral threshold, a forest disturbance, and a modeled pollination gap backward to evidence and forward to people.",
    preview: "living-ledger",
    badges: ["Deterministic replay", "Evidence lineage", "SentenceFilter", "Physics pipeline"],
    frames: ["xy", "ordinal", "network", "geo", "stream-physics", "custom"],
    topics: ["climate", "uncertainty", "realtime", "design", "accessibility"],
  },
  {
    title: "The Insight Forge",
    path: "/examples/insight-forge",
    eyebrow: "Portable analytical artifacts · five chart rooms",
    description:
      "Investigate a packaging failure across five chart rooms. Evidence you accept becomes a portable artifact that can filter and annotate the next view.",
    preview: "insight-forge",
    badges: ["Portable artifacts", "Deterministic recipes", "Audited lineage"],
    frames: ["xy", "ordinal", "network"],
    topics: ["process", "design", "accessibility", "ai"],
  },
  {
    title: "Analyst Adventure: The Case of the Vanishing Visionary",
    path: "/examples/analyst-adventure",
    eyebrow: "Five Stream Frames · analytical adventure",
    description:
      "Investigate a missing CEO across temporal, categorical, geographic, network, and physics rooms where reading each chart determines the story.",
    preview: "analyst-adventure",
    badges: ["Deterministic story", "Keyboard playable", "Agent-readable"],
    frames: ["xy", "ordinal", "geo", "network", "stream-physics"],
    topics: ["process", "uncertainty", "ai", "design", "accessibility"],
  },
  {
    title: "The Sentence Is Not the Words",
    path: "/examples/sentence-structure",
    eyebrow: "Nine linked linguistic views · natural-language controls",
    description:
      "Follow one sentence through grammar, ambiguity, meaning, rhetoric, corpus paths, phrase relationships, and textual variants without losing the words you selected.",
    preview: "sentence-structure",
    badges: ["SentenceFilter", "Shared selection", "Authored fixtures", "Accessible structure"],
    frames: ["xy", "network", "custom"],
    topics: ["culture", "design", "accessibility"],
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
      "Compare how two systems move the same cohort from first use to leadership. A stage ledger drives the width of each process corridor.",
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
      "Align daily weather around annual rings, brush a seasonal interval, and inspect the selected days on a straight timeline.",
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
      "Read Nathan's winning counts four ways, then use the pace view to see how contest-duration changes alter the historical comparison.",
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
      "Count the physical scale of AI infrastructure through relief maps and repeated units for power, water, capacity, and compute. Every claim keeps its denominator and source.",
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
      "Estimate a bus-waiting probability, reveal the count, and compare how density curves, quantile dots, hypothetical outcomes, and commuter icons support different tasks.",
    preview: "discrete",
    badges: ["TokenLayer", "Quantile dotplot", "HOPs", "Design critic"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["uncertainty", "design", "accessibility"],
  },
  {
    title: "Where You Draw the Line",
    path: "/examples/where-you-draw-the-line",
    eyebrow: "Explorable MAUP laboratory",
    description:
      "Move one border across an unchanged field, then watch the aggregate answer move through a 1D transect, a constructed city, and a 2D-plus-time reporting stack.",
    preview: "maup",
    badges: ["Direct manipulation", "Continuous field", "Sensitivity analysis"],
    frames: ["xy", "geo", "custom"],
    topics: ["geography", "uncertainty", "design", "accessibility"],
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
      "Replay three periods of IMF PortWatch traffic: a quiet spring, the Ever Given blockage, and the Red Sea detour. Four linked views show where routes and transit times diverged.",
    preview: "port-replay",
    frames: ["xy", "ordinal", "geo", "custom"],
    topics: ["realtime", "geography", "history", "process"],
  },
  {
    title: "The Scroll You're Telling",
    path: "/examples/scroll-youre-telling",
    eyebrow: "Realtime reader telemetry",
    description:
      "Read a short history of data journalism while the page plots your scroll position, velocity, and dwell time alongside the essay.",
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
      "Work through eight ways to draw and inspect a network, from arc diagrams and matrices to communities, Sankey, and chord. The final playground adds pathfinding, centrality, and ego-network tools.",
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

const EXAMPLE_SOURCE_FILES_BY_PATH = Object.freeze({
  "/examples/living-ledger": "LivingLedgerExamplePage.jsx",
  "/examples/analyst-adventure": "AnalystAdventureExamplePage.jsx",
  "/examples/art-movement-genealogy": "ArtMovementGenealogyExamplePage.jsx",
  "/examples/climate-anomaly": "ClimateAnomalyExamplePage.jsx",
  "/examples/climate-radial-weather": "ClimateRadialWeatherExamplePage.jsx",
  "/examples/creative-contours": "CreativeContoursExamplePage.jsx",
  "/examples/data-centers-isotype": "DataCentersIsotypeExamplePage.jsx",
  "/examples/dataviz-people": "DatavizPeopleExamplePage.jsx",
  "/examples/distant-reading": "DistantReadingExamplePage.jsx",
  "/examples/erie-railroad-organization": "ErieRailroadOrganizationExamplePage.jsx",
  "/examples/gestalt-principles": "GestaltPrinciplesExamplePage.jsx",
  "/examples/hot-dog-contest-variations": "HotDogContestVariationsExamplePage.jsx",
  "/examples/insight-forge": "InsightForgeExamplePage.jsx",
  "/examples/lake-travis-isotype": "LakeTravisIsotypeExamplePage.jsx",
  "/examples/not-in-my-backyard": "NimbyExamplePage.jsx",
  "/examples/local-government-explorer": "LocalGovernmentExplorerExamplePage.jsx",
  "/examples/mobile-data-visualization": "MobileDataVisualizationExamplePage.jsx",
  "/examples/network-visualization": "NetworkVizExamplePage.jsx",
  "/examples/octopus-metaphor": "OctopusMetaphorExamplePage.jsx",
  "/examples/oregon-trail": "OregonTrailExamplePage.jsx",
  "/examples/paris-isometric-landmarks": "ParisIsometricLandmarksExamplePage.jsx",
  "/examples/port-congestion-replay": "PortCongestionReplayExamplePage.jsx",
  "/examples/scroll-youre-telling": "ScrollYoureTellingExamplePage.jsx",
  "/examples/sentence-structure": "SentenceStructureExamplePage.jsx",
  "/examples/semiotic-architecture": "SemioticArchitectureExamplePage.jsx",
  "/examples/sometimes-better-discrete": "SometimesDiscreteExamplePage.jsx",
  "/examples/where-you-draw-the-line": "WhereYouDrawTheLineExamplePage.jsx",
  "/examples/urine-wheel": "UrineWheelExamplePage.jsx",
  "/examples/us-war-timeline": "USWarTimelineExamplePage.jsx",
  "/examples/what-the-machine-sees": "WhatTheMachineSeesExamplePage.jsx",
  "/examples/wikipedia-realtime": "WikipediaRealtimeExamplePage.jsx",
  "/examples/world-of-funnels": "WorldOfFunnelsExamplePage.jsx",
})

const PILOT_EXAMPLE_DEFINITIONS_BY_PATH = new Map(
  PILOT_EXAMPLE_DEFINITIONS.map((definition) => [definition.path, definition]),
)

/**
 * Full docs example registry. Overview metadata, navigation order, and
 * explicit contract coverage share this list; the overview manifest is a projection.
 */
export const EXAMPLE_DEFINITIONS = Object.freeze(
  EXAMPLE_REGISTRY_METADATA.map((example) => {
    const pilot = PILOT_EXAMPLE_DEFINITIONS_BY_PATH.get(example.path)
    return Object.freeze({
      id: example.path.slice("/examples/".length),
      ...example,
      sourceFile: EXAMPLE_SOURCE_FILES_BY_PATH[example.path] ?? pilot?.sourceFile,
      isPilot: Boolean(pilot),
      contract: pilot
        ? Object.freeze({
            ...pilot.contract,
            assessment: DECLARED_EXAMPLE_CONTRACT_STATUS,
          })
        : UNASSESSED_EXAMPLE_CONTRACT,
    })
  }),
)
export const EXAMPLE_DEFINITIONS_BY_PATH = Object.freeze(
  Object.fromEntries(EXAMPLE_DEFINITIONS.map((definition) => [definition.path, definition])),
)

/**
 * Resolve an example definition from a docs route without making consumers repeat
 * trailing-slash normalization.
 */
export function getExampleDefinition(pathname) {
  if (typeof pathname !== "string") return undefined
  const normalizedPath = pathname.replace(/\/+$/, "") || "/"
  return EXAMPLE_DEFINITIONS_BY_PATH[normalizedPath]
}

export function getPilotExampleDefinitions() {
  return EXAMPLE_DEFINITIONS.filter((definition) => definition.isPilot)
}

/**
 * Example definition schema for the full docs registry. Every route declares
 * either a route-specific contract or an explicit, bounded unassessed record.
 */
const REQUIRED_DEFINITION_FIELDS = ["id", "path", "title", "eyebrow", "description"]

const OPTIONAL_DEFINITION_FIELDS = [
  "isPilot",
  "sourceFile",
  "contract",
  "preview",
  "badges",
  "frames",
  "topics",
]

const ALLOWED_DEFINITION_FIELDS = new Set([
  ...REQUIRED_DEFINITION_FIELDS,
  ...OPTIONAL_DEFINITION_FIELDS,
])

function isBoolean(value) {
  return typeof value === "boolean"
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasExactFields(value, fields) {
  return (
    isRecord(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.prototype.hasOwnProperty.call(value, field))
  )
}

function isUnassessedContractField(value) {
  return hasExactFields(value, ["status"]) && value.status === NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS
}

function isUnmeasuredPerformanceContract(value) {
  return (
    hasExactFields(value, ["status", "budgets"]) &&
    value.status === UNMEASURED_EXAMPLE_PERFORMANCE_STATUS &&
    hasExactFields(value.budgets, EXAMPLE_PERFORMANCE_BUDGET_FIELDS) &&
    EXAMPLE_PERFORMANCE_BUDGET_FIELDS.every(
      (field) => value.budgets[field] === UNMEASURED_EXAMPLE_PERFORMANCE_STATUS,
    )
  )
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value, { minimum = 1 } = {}) {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.every((entry) => isNonEmptyString(entry))
  )
}

function validateUnassessedExampleContract(errors, contract, label) {
  for (const field of EXAMPLE_CONTRACT_FIELDS) {
    if (field === "ssr" || field === "performance") continue
    if (!isUnassessedContractField(contract[field])) {
      errors.push(
        `ExampleDefinition contract ${field} for "${label}" must be an explicit "not-assessed" declaration`,
      )
    }
  }

  const ssr = contract.ssr
  if (
    !hasExactFields(ssr, ["status", "hydration"]) ||
    ssr.status !== NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS ||
    ssr.hydration !== NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS
  ) {
    errors.push(
      `ExampleDefinition contract ssr for "${label}" must preserve explicit "not-assessed" status and hydration`,
    )
  }

  if (!isUnmeasuredPerformanceContract(contract.performance)) {
    errors.push(
      `ExampleDefinition contract performance for "${label}" must preserve explicit "unmeasured" budgets`,
    )
  }
}

function validateExampleContract(errors, definition, index) {
  const label = definition.id ?? `index ${index}`
  const contract = definition.contract
  if (!isRecord(contract)) {
    errors.push(`ExampleDefinition "${label}" must define a contract object`)
    return
  }

  const unknownFields = Object.keys(contract).filter(
    (field) => field !== "assessment" && !EXAMPLE_CONTRACT_FIELDS.includes(field),
  )
  for (const field of unknownFields) {
    errors.push(`Unknown contract field "${field}" on ExampleDefinition "${label}"`)
  }

  if (contract.assessment === NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS) {
    validateUnassessedExampleContract(errors, contract, label)
    return
  }
  if (contract.assessment !== DECLARED_EXAMPLE_CONTRACT_STATUS) {
    errors.push(
      `ExampleDefinition contract assessment for "${label}" must be "${DECLARED_EXAMPLE_CONTRACT_STATUS}" or "${NOT_ASSESSED_EXAMPLE_CONTRACT_STATUS}"`,
    )
    return
  }

  for (const field of EXAMPLE_CONTRACT_FIELDS) {
    if (!contract[field] || typeof contract[field] !== "object") {
      errors.push(`ExampleDefinition contract for "${label}" must define "${field}"`)
    }
  }

  if (!isStringArray(contract.publicImports)) {
    errors.push(
      `ExampleDefinition contract publicImports for "${label}" must be a non-empty string array`,
    )
  } else if (contract.publicImports.some((entry) => !entry.startsWith("semiotic"))) {
    errors.push(
      `ExampleDefinition contract publicImports for "${label}" must use public Semiotic entry points`,
    )
  }

  const states = contract.data?.states
  if (!isStringArray(states)) {
    errors.push(
      `ExampleDefinition contract data.states for "${label}" must be a non-empty string array`,
    )
  } else {
    const seenStates = new Set()
    for (const state of states) {
      if (!EXAMPLE_DATA_STATE_SET.has(state)) {
        errors.push(
          `ExampleDefinition contract data.states for "${label}" has unknown state "${state}"`,
        )
      }
      if (seenStates.has(state)) {
        errors.push(`ExampleDefinition contract data.states for "${label}" repeats "${state}"`)
      }
      seenStates.add(state)
    }
  }

  const fixture = contract.data?.fixture
  if (!fixture || !isNonEmptyString(fixture.kind) || !isNonEmptyString(fixture.schemaVersion)) {
    errors.push(
      `ExampleDefinition contract data.fixture for "${label}" must declare kind and schemaVersion`,
    )
  }
  if (!isBoolean(fixture?.replay)) {
    errors.push(`ExampleDefinition contract data.fixture.replay for "${label}" must be a boolean`)
  }

  const provenance = contract.provenance
  for (const field of ["source", "capturedAt", "freshnessOwner", "reviewCadence"]) {
    if (!isNonEmptyString(provenance?.[field])) {
      errors.push(
        `ExampleDefinition contract provenance.${field} for "${label}" must be a non-empty string`,
      )
    }
  }
  if (
    isNonEmptyString(provenance?.capturedAt) &&
    !/^\d{4}-\d{2}-\d{2}$/.test(provenance.capturedAt)
  ) {
    errors.push(
      `ExampleDefinition contract provenance.capturedAt for "${label}" must be YYYY-MM-DD`,
    )
  }

  for (const field of ["summary", "navigation", "keyboard", "forcedColors"]) {
    if (!isNonEmptyString(contract.accessibility?.[field])) {
      errors.push(
        `ExampleDefinition contract accessibility.${field} for "${label}" must be a non-empty string`,
      )
    }
  }
  for (const field of ["reducedMotion", "visibility"]) {
    if (!isNonEmptyString(contract.motion?.[field])) {
      errors.push(
        `ExampleDefinition contract motion.${field} for "${label}" must be a non-empty string`,
      )
    }
  }

  const viewports = contract.responsive?.viewports
  if (
    !Array.isArray(viewports) ||
    !viewports.every((viewport) => Number.isFinite(viewport) && viewport > 0)
  ) {
    errors.push(
      `ExampleDefinition contract responsive.viewports for "${label}" must be positive numbers`,
    )
  }
  for (const field of ["status", "selectionIdentity"]) {
    if (!isNonEmptyString(contract.responsive?.[field])) {
      errors.push(
        `ExampleDefinition contract responsive.${field} for "${label}" must be a non-empty string`,
      )
    }
  }
  for (const field of ["status", "hydration"]) {
    if (!isNonEmptyString(contract.ssr?.[field])) {
      errors.push(
        `ExampleDefinition contract ssr.${field} for "${label}" must be a non-empty string`,
      )
    }
  }
  if (!isNonEmptyString(contract.performance?.status)) {
    errors.push(
      `ExampleDefinition contract performance.status for "${label}" must be a non-empty string`,
    )
  }
  const budgets = contract.performance?.budgets
  if (
    !budgets ||
    typeof budgets !== "object" ||
    Array.isArray(budgets) ||
    Object.keys(budgets).length === 0
  ) {
    errors.push(
      `ExampleDefinition contract performance.budgets for "${label}" must be a non-empty object`,
    )
  } else if (!Object.values(budgets).every((value) => isNonEmptyString(value))) {
    errors.push(
      `ExampleDefinition contract performance.budgets for "${label}" must use non-empty strings`,
    )
  }
}

export function validateExampleDefinitions(definitions = EXAMPLE_DEFINITIONS) {
  const errors = []

  if (!Array.isArray(definitions)) {
    return { ok: false, definitions, errors: ["ExampleDefinition list must be an array"] }
  }

  const seenPaths = new Set()
  const seenSourceFiles = new Set()
  const seenIds = new Set()

  definitions.forEach((definition, index) => {
    REQUIRED_DEFINITION_FIELDS.forEach((field) => {
      if (!isNonEmptyString(definition?.[field])) {
        errors.push(
          `ExampleDefinition at index ${index} must define "${field}" as a non-empty string`,
        )
      }
    })

    const { id, path, sourceFile } = definition ?? {}
    const isPilot = definition?.isPilot === true
    if (isPilot && !isNonEmptyString(sourceFile)) {
      errors.push(`ExampleDefinition at index ${index} must define "sourceFile" for pilot examples`)
    }
    validateExampleContract(errors, definition, index)
    if (isNonEmptyString(id)) {
      if (seenIds.has(id)) {
        errors.push(`Duplicate ExampleDefinition id "${id}"`)
      }
      seenIds.add(id)
    }

    if (isNonEmptyString(path)) {
      if (!path.startsWith("/examples/")) {
        errors.push(`ExampleDefinition path "${path}" must start with "/examples/"`)
      }
      if (seenPaths.has(path)) {
        errors.push(`Duplicate ExampleDefinition path "${path}"`)
      }
      seenPaths.add(path)
    }

    if (isNonEmptyString(sourceFile)) {
      if (!sourceFile.endsWith(".jsx") || sourceFile.includes("/") || sourceFile.includes("\\")) {
        errors.push(
          `ExampleDefinition sourceFile "${sourceFile}" should be a local JSX source file (e.g. "ExamplePage.jsx")`,
        )
      }
      if (seenSourceFiles.has(sourceFile)) {
        errors.push(`Duplicate ExampleDefinition sourceFile "${sourceFile}"`)
      }
      seenSourceFiles.add(sourceFile)
    }

    if (!isBoolean(definition?.isPilot)) {
      if (definition?.isPilot !== undefined) {
        errors.push(
          `ExampleDefinition field "isPilot" for "${id ?? `index ${index}`}" must be a boolean`,
        )
      }
    }

    const unknownKeys = Object.keys(definition ?? {}).filter(
      (field) => !ALLOWED_DEFINITION_FIELDS.has(field),
    )
    for (const key of unknownKeys) {
      if (key === "" || key.startsWith("__")) {
        continue
      }
      errors.push(`Unknown field "${key}" on ExampleDefinition "${id ?? `index ${index}`}"`)
    }
  })

  return { ok: errors.length === 0, definitions, errors }
}
