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
 * @property {string} publishedAt RFC3339 timestamp used for canonical newest-first ordering.
 * @property {string} preview Overview-card preview identifier.
 * @property {readonly string[]} [badges] Overview-card capability labels.
 * @property {readonly string[]} frames Frame-family filters.
 * @property {readonly string[]} topics Topic filters.
 * @property {boolean} isPilot Whether this definition drives the incremental registry migration.
 * @property {string} sourceFile Page source file used by the lazy Full Code loader.
 * @property {readonly string[]} [sourceFiles] Complete multi-file source bundle, relative to the examples directory.
 * @property {ExampleContract} contract Public experience and maintenance contract.
 *
 * @typedef {{ status: "not-assessed" }} UnassessedExampleContractField
 *
 * @typedef {object} ExampleContract
 * @property {"declared" | "not-assessed"} assessment Whether the record is route-specific or explicitly unassessed.
 * @property {readonly string[] | UnassessedExampleContractField} publicImports Public Semiotic entry points used by the page.
 * @property {{ states: readonly ExampleDataState[], fixture: { kind: string, replay: boolean, schemaVersion: string, inventory?: Record<string, number> } } | UnassessedExampleContractField} data
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
    id: "machine-semiosphere",
    path: "/examples/machine-semiosphere",
    sourceFile: "MachineSemiosphereExamplePage.jsx",
    sourceFiles: [
      "MachineSemiosphereExamplePage.jsx",
      "MachineSemiosphereExamplePage.css",
      "machine-semiosphere/story.js",
      "machine-semiosphere/data.js",
      "machine-semiosphere/MachineSemiosphereCharts.jsx",
    ],
    isPilot: true,
    title: "The Machine Semiosphere",
    eyebrow: "July 2026 incident · cross-run traces",
    description:
      "Follow six scroll chapters through the reported July 2026 Hugging Face incident, using one vertical evidence map and fixed inline visuals to show how information crossed otherwise separate agent runs.",
    contract: {
      publicImports: ["semiotic/network", "semiotic/ordinal", "semiotic/recipes", "semiotic/utils"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-reported-incident-story-and-authored-evidence-map",
          replay: false,
          schemaVersion: "2",
          inventory: { chapters: 6, maps: 1, inlineVisuals: 6 },
        },
      },
      provenance: {
        source:
          "Public reports from Hugging Face, METR and Redwood Research, and OpenAI about the reported July 2026 Hugging Face incident",
        capturedAt: "2026-08-27",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source report, chapter, evidence label, or map revision",
      },
      accessibility: {
        summary:
          "Six linear chapters pair one vertical transit-style evidence map with fixed inline visuals, plain-language evidence labels, limitations, sources, and accessible chart tables",
        navigation:
          "The complete account follows ordinary document scroll order; hover adds optional detail but no chapter, claim, source, or table requires chart interaction",
        keyboard:
          "Native source links, chart navigation, and accessible tables expose the same evidence in document order",
        forcedColors:
          "Map stations, routes, inline chart marks, evidence notes, links, and tables retain boundaries and redundant text labels in forced-colors mode",
      },
      motion: {
        reducedMotion:
          "The authored map and inline visuals are fixed; reduced-motion users receive the same settled charts and reading order without timed transitions",
        visibility:
          "All fixtures are local, with no replay, polling, streaming, workers, or hidden-page activity",
      },
      responsive: {
        status: "container-responsive-vertical-map-and-inline-visuals",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable chapter, station, route, fact, and source identities across desktop and mobile layouts",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "Checked-in chapter data, authored station positions, fixed inline visuals, and static prose render deterministically before responsive sizing and optional hover begin after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using public network, ordinal, recipes, and utility entry points with compact local story and evidence fixtures",
          interaction:
            "six scroll chapters, one authored transit map, six fixed inline visuals, and optional local hover details",
          memory:
            "one immutable story, source registry, authored station-and-route map, and bounded inline chart fixtures",
          hiddenPage:
            "no requests, timers, streams, workers, persistent telemetry, or remote writes",
        },
      },
    },
  },
  {
    id: "lines-of-thought",
    path: "/examples/lines-of-thought",
    sourceFile: "TransitDiagramExamplePage.jsx",
    sourceFiles: [
      "TransitDiagramExamplePage.jsx",
      "TransitDiagramExamplePage.css",
      "data/transitDiagramExamples.js",
    ],
    isPilot: true,
    title: "Lines of Thought",
    eyebrow: "Transit diagrams · authored geometry → topology fallback",
    description:
      "Follow the subway diagram from Beckian wayfinding to abstract networks, then compare an art-directed system with a coordinate-free watershed laid out from topology alone.",
    contract: {
      publicImports: ["semiotic/network", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-authored-transit-and-coordinate-free-watershed-comparison",
          replay: true,
          schemaVersion: "1",
          inventory: { charts: 2, transitStations: 12, watershedNodes: 9, lines: 7 },
        },
      },
      provenance: {
        source:
          "Synthetic networks designed to demonstrate the recipe's authored and automatic geometry contracts",
        capturedAt: "2026-08-26",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "transit-diagram recipe or example-contract change",
      },
      accessibility: {
        summary:
          "Both diagrams include descriptions, summaries, labels, and accessible tables; the historical and interpretive claims remain available as prose",
        navigation:
          "History, authored, automatic watershed, and option sections provide a complete linear reading independent of chart interaction",
        keyboard:
          "Native buttons, range and checkbox controls, links, and built-in network navigation expose the complete comparison",
        forcedColors:
          "Plate boundaries, controls, line labels, stations, and prose retain explicit text or system-color separation",
      },
      motion: {
        reducedMotion: "The layouts are deterministic and contain no timed or looping motion",
        visibility: "No polling, observers, workers, streams, or hidden-page processes run",
      },
      responsive: {
        status: "container-responsive-with-bounded-horizontal-chart-floor",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable station, segment, and line identities across layout modes",
      },
      ssr: {
        status: "Vite-build-and-custom-network-scene-compatible",
        hydration:
          "Both fixtures and fallback positions are deterministic; chart widths resolve after mount without changing topology",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public network and recipes entry points",
          interaction: "two small bounded graphs and local control updates",
          memory: "twenty-one nodes, thirteen authored edge rows, and eight watershed edge rows",
          hiddenPage: "no timers, requests, observers, streams, or workers",
        },
      },
    },
  },
  {
    id: "aesthetic-policy-studio",
    path: "/examples/aesthetic-policy-studio",
    sourceFile: "AestheticPolicyStudioExamplePage.jsx",
    sourceFiles: [
      "AestheticPolicyStudioExamplePage.jsx",
      "AestheticPolicyStudioExamplePage.css",
      "aestheticPolicyStudio.js",
    ],
    isPilot: true,
    title: "Aesthetic Policy Studio",
    eyebrow: "Design governance · weights → evidence → visual voice",
    description:
      "See Semiotic's balanced default, then watch two opposing organizational aesthetic policies select different chart treatments without compromising the shared trust floor.",
    contract: {
      publicImports: [
        "semiotic/ai",
        "semiotic/ordinal",
        "semiotic/themes",
        "semiotic/themes/react",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-organizational-aesthetic-policy-comparison",
          replay: true,
          schemaVersion: "1",
          inventory: { rows: 5, charts: 3, profiles: 3, candidates: 2 },
        },
      },
      provenance: {
        source:
          "Synthetic public-service performance fixture designed to compare organizational aesthetic policies without changing evidence",
        capturedAt: "2026-08-25",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "aesthetic-policy contract change",
      },
      accessibility: {
        summary:
          "Every chart carries the same exact data, descriptive copy, summary, labels, and accessible table; policy scores and selection reasons are also available as text",
        navigation:
          "Semantic default, invariant, organization, decision-matrix, and research sections provide a complete linear reading without pointer-dependent disclosure",
        keyboard:
          "Built-in chart navigation and native research links preserve the full briefing for keyboard readers",
        forcedColors:
          "Chart marks, institutional panels, score states, selection cells, and policy boundaries retain system-color separation",
      },
      motion: {
        reducedMotion: "The comparison is settled and contains no timed or looping motion",
        visibility: "No polling, observers, streams, workers, or hidden-page processes run",
      },
      responsive: {
        status: "container-responsive-with-stacked-policy-comparison",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable profile, candidate, feature, and invariant identities",
      },
      ssr: {
        status: "Vite-build-and-deterministic-chart-compatible",
        hydration:
          "Policy selection and scores are deterministic; chart widths resolve after mount without changing data, profile, or chosen treatment",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy route using public ordinal, theme, and AI entry points",
          interaction: "three five-row charts and two bounded two-candidate scoring passes",
          memory: "one immutable five-row fixture, three profiles, and two candidate specs",
          hiddenPage: "no timers, requests, observers, streams, or workers",
        },
      },
    },
  },
  {
    id: "bad-chart-autopsy",
    path: "/examples/bad-chart-autopsy",
    sourceFile: "BadChartAutopsyExamplePage.jsx",
    sourceFiles: [
      "BadChartAutopsyExamplePage.jsx",
      "BadChartAutopsyExamplePage.css",
      "badChartAutopsy.js",
    ],
    isPilot: true,
    title: "Bad Chart Autopsy",
    eyebrow: "Chart evaluation · reject → repair → prove",
    description:
      "Take apart a persuasive but misleading benchmark chart, then preserve its data while Semiotic diagnoses, repairs, and proves a defensible replacement.",
    contract: {
      publicImports: ["semiotic/ai", "semiotic/ordinal", "semiotic/server"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-chart-evaluation-case",
          replay: true,
          schemaVersion: "1",
          inventory: { rows: 5, charts: 2, repairSteps: 3 },
        },
      },
      provenance: {
        source: "Synthetic benchmark fixture designed to expose known chart-deception patterns",
        capturedAt: "2026-08-24",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "evaluation-contract change",
      },
      accessibility: {
        summary:
          "The before-and-after charts are paired with ranked textual findings, exact repair steps, scene evidence, and an accessible table on the released chart",
        navigation:
          "Four native-button stages expose intake, diagnosis, evidence, and repair without making animation or pointer input the only reading path",
        keyboard:
          "Native stage buttons and built-in BarChart navigation preserve the complete workflow for keyboard readers",
        forcedColors:
          "Specimen boundaries, verdicts, controls, finding labels, and chart marks retain system-color boundaries and text labels",
      },
      motion: {
        reducedMotion:
          "The example uses discrete reader-controlled stages and no timed or looping motion",
        visibility:
          "No polling, observer, worker, or hidden-page process runs; both reports are deterministic bounded computations",
      },
      responsive: {
        status: "container-responsive-with-stacked-phone-comparison",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable stage, finding, chart, and repair-code identities",
      },
      ssr: {
        status: "Vite-build-and-static-render-evidence-compatible",
        hydration:
          "The initial intake stage and deterministic evaluation results are stable; responsive widths resolve after mount without changing the case",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route importing public ordinal and AI surfaces plus the server evidence renderer",
          interaction: "four local stage transitions with no data mutation or background work",
          memory: "two five-row configurations and two bounded evaluation reports",
          hiddenPage: "no timers, streams, observers, or workers",
        },
      },
    },
  },
  {
    id: "how-a-hit-travels",
    path: "/examples/how-a-hit-travels",
    sourceFile: "HowAHitTravelsExamplePage.jsx",
    sourceFiles: [
      "HowAHitTravelsExamplePage.jsx",
      "HowAHitTravelsExamplePage.css",
      "how-a-hit-travels/SimilarityConstellation.jsx",
      "how-a-hit-travels/JourneyFingerprint.jsx",
      "how-a-hit-travels/similarityConstellationRecipe.js",
      "how-a-hit-travels/buildHitTravelsData.mjs",
      "how-a-hit-travels/hitTravelsData.generated.js",
    ],
    isPilot: true,
    title: "How a Hit Travels",
    eyebrow: "Data journalism · global streaming",
    description:
      "Compare 266 weeks of Netflix Top 10 rankings across 24 countries to see simultaneous arrivals become durable regional hits in linked country-chart neighborhoods.",
    contract: {
      publicImports: ["semiotic/ai", "semiotic/network", "semiotic/recipes", "semiotic/xy"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-derived-netflix-weekly-top-10-story-snapshot",
          replay: true,
          schemaVersion: "1",
          inventory: {
            weeks: 266,
            countries: 24,
            titles: 10,
            omittedTitles: 18,
            claims: 3,
          },
        },
      },
      provenance: {
        source:
          "Netflix public weekly Top 10 country and global files, reduced to a checked-in generated story snapshot with source URLs, checksums, and derivation metadata",
        capturedAt: "2026-08-09",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source refresh",
      },
      accessibility: {
        summary:
          "The story pairs every constellation state with plain-language counts, title fingerprints, exact country histories, evidence notes, and accessible chart tables",
        navigation:
          "Semantic story sections, mode and week controls, title and country selection, chart navigation, evidence disclosure, and a settled mobile reading",
        keyboard:
          "Native buttons, range controls, chart navigation, accessible tables, and stable title, country, relationship, and claim identities",
        forcedColors:
          "Constellation marks, selection states, fingerprints, controls, evidence boundaries, and focus rings retain system-color contrast",
      },
      motion: {
        reducedMotion:
          "The system preference or reader control replaces animated travel with complete stepped states while preserving every exact value",
        visibility:
          "The checked-in snapshot makes no live requests; any reader-controlled replay is bounded and stops when it is no longer active",
      },
      responsive: {
        status: "container-responsive-and-breakpoint-designed",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable title, country, relationship, week, and claim IDs across geographic, constellation, desktop, and mobile views",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "Checked-in data, fixed similarity coordinates, deterministic initial selection, and stable entity IDs preserve the server-rendered settled view",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using four public Semiotic entry points and a compact generated story snapshot",
          interaction:
            "twenty-four reference countries, a sparse fixed edge set, ten title profiles, and memoized selection projections",
          memory:
            "one immutable 266-week derived manifest, ten bounded title journeys, eighteen omitted-title records, and three claim records",
          hiddenPage:
            "no polling, streaming, external fetch, or persistent telemetry; replay state remains bounded",
        },
      },
    },
  },
  {
    id: "living-ledger",
    path: "/examples/living-ledger",
    sourceFile: "LivingLedgerExamplePage.jsx",
    isPilot: true,
    title: "The Living Ledger",
    eyebrow: "Evidence lineage · ecosystem services",
    description:
      "Trace three ecosystem claims—coral threshold, forest disturbance, and modeled pollination gap—through deterministic replay from source evidence to affected people.",
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
    id: "the-last-scarcity",
    path: "/examples/the-last-scarcity",
    sourceFile: "TheLastScarcityExamplePage.jsx",
    sourceFiles: [
      "TheLastScarcityExamplePage.jsx",
      "TheLastScarcityExamplePage.css",
      "last-scarcity/AbundanceConstitution.jsx",
      "last-scarcity/CapabilityFlood.jsx",
      "last-scarcity/EvidenceLayer.jsx",
      "last-scarcity/FreedTimeWheel.jsx",
      "last-scarcity/MimeticCourt.jsx",
      "last-scarcity/NarrativeInstruments.jsx",
      "last-scarcity/PalaceMap.jsx",
      "last-scarcity/ReciprocityPath.jsx",
      "last-scarcity/ScarcityMigration.jsx",
      "last-scarcity/atusProfiles.js",
      "last-scarcity/lastScarcityData.js",
      "last-scarcity/useLocalReadingTelemetry.js",
    ],
    isPilot: true,
    title: "The Last Scarcity",
    eyebrow: "Interactive essay · AI abundance",
    description:
      "When intelligence gets cheap, scarcity moves. An interactive essay comparing competition before and after with a Sankey and a promise-versus-data DifferenceChart.",
    contract: {
      publicImports: [
        "semiotic",
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
          kind: "checked-in-nine-source-evidence-ledger-and-deterministic-palace-scenarios",
          replay: true,
          schemaVersion: "1",
          inventory: {
            chapters: 9,
            sources: 9,
            claims: 19,
            recipes: 9,
          },
        },
      },
      provenance: {
        source:
          "Authored deterministic argument grounded in a bundled nine-source manifest, nineteen-claim ledger, transparent 100-unit model, and nine semantic recipe manifests",
        capturedAt: "2026-08-05",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source or argument revision",
      },
      accessibility: {
        summary:
          "Nine linear chapters pair chart descriptions and tables with a Palace transcript, claim-class badges, source caveats, recipe inspections, and a complete evidence drawer",
        navigation:
          "Skip link, semantic chapter sequence, persistent room rail, Palace room transcript, native scenario controls, chart navigation, and focus-managed evidence drawer",
        keyboard:
          "Native buttons, ranges, details, links, chapter focus targets, custom-chart mark navigation, accessible tables, and stable room, claim, node, and edge identities",
        forcedColors:
          "Palace surfaces, chart shells, evidence badges, controls, selection states, allocation marks, telemetry traces, and focus rings retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The system preference or reader control resolves the capability replay to its final state, disables chart and CSS animation, replaces smooth scrolling, and collapses scenario trails",
        visibility:
          "The capability timer exists only while its chapter is active and replaying; local telemetry is opt-in, skips hidden-page dwell, and clears its interval and ephemeral trace on disable or unmount",
      },
      responsive: {
        status: "container-responsive-and-breakpoint-designed",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable chapter, room, claim, source, recipe, scenario-datum, modeled-edge, and reader-choice IDs across inline and sticky layouts",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "Checked-in snapshots, scenario defaults, and the nine-chapter transcript are deterministic; hash navigation, observation, replay, and opt-in telemetry begin only after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using seven public Semiotic entry points and locally split narrative, evidence, telemetry, and chart instruments",
          interaction:
            "nine chapter states, ten Palace rooms, fifteen Palace edges, ten replay events, eleven Court agents, and memoized responsive scenario layouts",
          memory:
            "nine source records, nineteen claims, nine recipe manifests, bounded 40-event realtime windows, an 18-point constitution trail, and at most 40 ephemeral chapter transitions",
          hiddenPage:
            "no external requests or persistent storage; replay work stops outside its active chapter and telemetry does not accumulate hidden-page dwell",
        },
      },
    },
  },
  {
    id: "hellhole-changed-addresses",
    path: "/examples/hellhole-changed-addresses",
    sourceFile: "HellholeChangedAddressesExamplePage.jsx",
    sourceFiles: [
      "HellholeChangedAddressesExamplePage.jsx",
      "HellholeChangedAddressesExamplePage.css",
      "hellhole-changed-addresses/HellholeCharts.jsx",
      "hellhole-changed-addresses/hellholeData.js",
    ],
    isPilot: true,
    title: "The Hellhole Changed Addresses",
    eyebrow: "First the city · then the suburb",
    description:
      "Move a birth-year observer through metropolitan migration while Census flows, local conditions, and preference data show how concern shifted from city to suburb.",
    contract: {
      publicImports: [
        "semiotic/geo",
        "semiotic/network",
        "semiotic/ordinal",
        "semiotic/recipes",
        "semiotic/utils",
        "semiotic/xy",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-unscored-seed-source-backed-evidence-and-acs-county-flows",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Unscored illustrative cultural stations, published condition and resident estimates, and aggregated 2006–2010 / 2016–2020 U.S. Census Bureau ACS county-to-county flow estimates",
        capturedAt: "2026-08-07",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source, method, or narrative revision",
      },
      accessibility: {
        summary:
          "A linear narrative pairs culture, conditions, and residents with chart descriptions, data tables, provenance labels, and explicit release-year-coverage-is-not-exposure-or-belief cautions",
        navigation:
          "Semantic chapters, persistent scene controls, URL-serialized lens, birth-year, and comparison-cut controls, chart navigation, evidence details, and tabular alternatives",
        keyboard:
          "Native buttons, ranges, links, details, chapter targets, custom-chart mark navigation, accessible tables, and stable evidence, observer, and comparison identities",
        forcedColors:
          "Page and chart shells, controls, source links, the missing-data callout, and focus indicators use system colors; direct labels and tabular alternatives keep the evidence readable without relying on mark color",
      },
      motion: {
        reducedMotion:
          "The system preference removes scroll and chart transitions, presents the HELL transfer as labeled static states, and changes cohort cuts without animated morphing",
        visibility:
          "No polling, streaming, runtime network activity, or retained reader telemetry; visibility does not alter the checked-in evidence state",
      },
      responsive: {
        status: "container-responsive-and-breakpoint-designed",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable evidence-point, source, birth-year, comparison-cut, lane, and narrative-scene IDs across inline and sticky layouts",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "Checked-in evidence and the default culture lens render deterministically; URL state and viewport-enhanced presentation resolve without replacing chart identities after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using six public family entry points and a local page, chart, style, and evidence bundle",
          interaction:
            "bounded checked-in evidence lanes, a derived cohort field, local URL state, and memoized chart projections",
          memory:
            "bounded authored evidence and source records with no retained animation, request, or reader-history buffers",
          hiddenPage: "no requests, polling, streams, timers, or background mutation",
        },
      },
    },
  },
  {
    id: "parataxis-machine",
    path: "/examples/parataxis-machine",
    sourceFile: "ParataxisMachineExamplePage.jsx",
    sourceFiles: [
      "ParataxisMachineExamplePage.jsx",
      "ParataxisMachineExamplePage.css",
      "parataxis-machine/ParataxisCharts.jsx",
      "parataxis-machine/parataxisData.js",
    ],
    isPilot: true,
    title: "Parataxis Machine",
    eyebrow: "How implied connections work",
    description:
      "Inspect six clause pairs to compare stated syntax with reader-inferred links and see why parataxis recurs in AI-generated prose.",
    contract: {
      publicImports: [
        "semiotic/network",
        "semiotic/ordinal",
        "semiotic/recipes",
        "semiotic/utils",
        "semiotic/xy",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-synthetic-clause-specimens-and-editorial-rhetorical-annotations",
          replay: false,
          schemaVersion: "1",
          inventory: {
            clausePairs: 6,
            relationTypes: 8,
            spectrumStops: 5,
            aphorismEntries: 5,
            genreSignatures: 6,
          },
        },
      },
      provenance: {
        source: "Bundled public example fixture",
        capturedAt: "2026-08-09",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "narrative, annotation, or interaction revision",
      },
      accessibility: {
        summary:
          "Every Semiotic view supplies a description, dynamic summary, and accessible table; prose labels distinguish synthetic text, editorial annotation, and reader inference",
        navigation:
          "Semantic scenes, a sticky scene rail, native connector, specimen, syntax, reader, ledger, metric, and machine controls, plus chart mark navigation",
        keyboard:
          "Native links, buttons, details, ranges, and Semiotic chart navigation retain stable clause, relation, ledger, and genre identities",
        forcedColors:
          "Panels, controls, selected states, chart shells, and focus rings retain system-color boundaries while text and accessible tables preserve every relation",
      },
      motion: {
        reducedMotion:
          "The system preference or page-level motion control removes connector drift, clause arrival, dashboard paths, and chart transitions without hiding state",
        visibility:
          "No requests, timers, persistent telemetry, continuous simulations, or hidden-page mutation",
      },
      responsive: {
        status: "container-responsive-and-breakpoint-designed",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable clause-pair, relation, syntax-mode, spectrum, aphorism, genre, and sandbox-register IDs across chart and stacked layouts",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "Purpose-written fixtures and default reader states render deterministically; measured chart widths enhance after mount without replacing semantic identities",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using five public family entry points and a local page, chart, data, and style bundle",
          interaction:
            "six clause specimens, forty-eight matrix cells, five ledger points, six genre bars, and bounded local control state",
          memory:
            "fixed synthetic fixtures and scalar reader choices with no history, request cache, stream window, or telemetry buffer",
          hiddenPage: "no polling, streams, timers, requests, simulation, or background mutation",
        },
      },
    },
  },
  {
    id: "equal-places-atlas",
    path: "/examples/equal-places-atlas",
    sourceFile: "EqualPlacesAtlasExamplePage.jsx",
    isPilot: true,
    title: "The Equal Places Atlas",
    eyebrow: "Gridified geography · sampled land",
    description:
      "Resample U.S. and world land into projected dot fields, then compare each equal-place lattice with conventional geography and tile cartograms.",
    contract: {
      publicImports: ["semiotic/geo"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-2020-census-state-grid-and-bundled-natural-earth",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "U.S. Census Bureau 2020 resident population; Natural Earth country geometry via world-atlas; authored U.S. state grid",
        capturedAt: "2026-07-24",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Dynamic chart summaries state the geography, representation, mark, and density; place-tile marks also appear in an accessible table",
        navigation:
          "Native segmented controls; place tiles add GeoCustomChart spatial keyboard navigation, touch selection, tooltips, and a persistent field note",
        keyboard:
          "Tab and native button activation for controls; place tiles add Arrow keys, Home, End, Enter, and Space for chart marks",
        forcedColors:
          "Controls, editorial panels, chart shell, detail card, and focus states retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "StreamGeoFrame resolves transitions immediately and the CSS loading indicator stops under prefers-reduced-motion",
        visibility:
          "No timers or continuous simulation; Natural Earth resolves once and layouts update only from reader input or resize",
      },
      responsive: {
        status: "browser-tested",
        viewports: [390, 1440],
        selectionIdentity:
          "stable lattice row/column for land samples; state abbreviation or Natural Earth feature id for place tiles",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "The authored U.S. fixture is deterministic on first render; optional Natural Earth geometry resolves after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route; the optional 110m world reference is dynamically imported",
          interaction:
            "bounded projected lattice or 50 authored U.S. cells / 177 Natural Earth centroids with memoized responsive layout configuration",
          memory:
            "one bounded state table, one cached 110m feature collection, and no retained sampling history",
          hiddenPage: "no background work after the one-time geography resolution",
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
      "Solve one deterministic case by reading five chart rooms: timeline, categorical ledger, map, suspect network, and physics-driven sequence.",
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
        source: "Bundled public example fixture",
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
    eyebrow: "Linked linguistic views · natural-language controls",
    description:
      "Select words once and follow them through grammar, ambiguity, meaning, rhetoric, corpus paths, phrase relations, and textual variants in linked linguistic views.",
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
        source: "Bundled public example fixture",
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
    id: "rhetorical-crucible",
    path: "/examples/rhetorical-crucible",
    sourceFile: "DebateConceptCrucibleExamplePage.jsx",
    isPilot: true,
    title: "The Rhetorical Crucible",
    eyebrow: "Word Trails × physics · three debate assays",
    description:
      "Track one word through three debate assays to compare its isolated use, temporal context, and physical trajectory without inferring motive.",
    contract: {
      publicImports: ["semiotic/ordinal", "semiotic/physics", "semiotic/recipes", "semiotic/utils"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-real-debate-transcript-three-assay-snapshot",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Commission on Presidential Debates transcripts for 2012 and 2016, and the m-arg 2020 presidential-debate dataset",
        capturedAt: "2026-07-21",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "An accessible ledger records every admitted word's count, temporal company, product, or unalloyed disposition",
        navigation:
          "Native debate, word, pace, replay, and ledger controls with a complete terminal projection",
        keyboard: "Native buttons, select controls, disclosure controls, and ledger navigation",
        forcedColors:
          "Retorts, word slugs, product molds, ledger states, controls, and focus rings retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The assay opens on its terminal product and unalloyed projection; autoplay is unavailable",
        visibility: "Deterministic replay and physics work suspend while the document is hidden",
      },
      responsive: {
        status: "verified",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable debate, speaker, word-profile, temporal-alloy, product, and disposition IDs",
      },
      ssr: {
        status: "deterministic-SSR-and-build-verified",
        hydration:
          "Checked-in transcript snapshots, stable token identities, terminal physics chrome, and projection survive the server/client boundary",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using public ordinal, physics, recipes, and utility entry points",
          interaction:
            "memoized word trails, temporal-company windows, concept assays, products, and ledger projections",
          memory:
            "three bounded transcript snapshots with a finite authored vocabulary and deterministic assay replay",
          hiddenPage: "physics and replay work suspend while hidden",
        },
      },
    },
  },
  {
    id: "latent-crucible",
    path: "/examples/latent-crucible",
    sourceFile: "LDATopicCrucibleExamplePage.jsx",
    isPilot: true,
    title: "The Latent Crucible",
    eyebrow: "LDA Topic Modeling × Word Trails",
    description:
      "Run a seeded Gibbs sampler over an inspectable corpus and watch anonymous topics stabilize as word tokens are reassigned step by step.",
    contract: {
      publicImports: ["semiotic/ordinal", "semiotic/physics", "semiotic/recipes", "semiotic/utils"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "seeded-collapsed-gibbs-didactic-corpus-trace",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Purpose-written miniature corpus and seeded collapsed-Gibbs trace, framed by Journal of Digital Humanities 2.1 and the original LDA literature",
        capturedAt: "2026-07-21",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Model assumptions, current token assignments, one exact sampling conditional, topic-word probabilities, document-topic mixtures, and the terminal projection are available as text",
        navigation:
          "Native iteration, playback, pace, restart, step, and terminal-settle controls with linked chart explanations",
        keyboard: "Native buttons, a select, a range control, links, and chart navigation",
        forcedColors:
          "Topic columns, traces, controls, cards, focus rings, and probability bars retain system-color boundaries and labels",
      },
      motion: {
        reducedMotion:
          "The example opens on a deterministic terminal model state; autoplay and animated transport are unavailable",
        visibility: "Iteration timers and physics work suspend while the document is hidden",
      },
      responsive: {
        status: "implementation-verified",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable corpus-document, token, vocabulary-term, iteration, anonymous-topic, and topic-word allocation IDs",
      },
      ssr: {
        status: "deterministic-SSR-and-build-verified",
        hydration:
          "Seeded snapshots, stable topic identities within one chain, terminal Crucible chrome, and textual model evidence survive the server/client boundary",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using public ordinal, physics, recipes, and utility entry points",
          interaction:
            "eight retained checkpoints, memoized chart projections, and a bounded deterministic token trace",
          memory:
            "small purpose-written corpus with finite vocabulary, four topics, and a 64-sweep recorded chain",
          hiddenPage: "animation and physics inherit hidden-document suspension",
        },
      },
    },
  },
  {
    id: "chain-reaction",
    path: "/examples/chain-reaction",
    sourceFile: "ChainReactionExamplePage.jsx",
    isPilot: true,
    title: "The Release Machine",
    eyebrow: "Which blocker is really costing you?",
    description:
      "Compare two equally late 90% blockers: the swimlane shows schedule and ownership, while the dependency machine shows which one prevents nine tasks from starting.",
    contract: {
      publicImports: ["semiotic", "semiotic/ordinal", "semiotic/physics", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "deterministic-local-scenarios",
          replay: true,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Purpose-written 20-task release plan across five work lanes; dependency edges and blockers are authored, not inferred",
        capturedAt: "2026-07-24",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary: "Blocker-amplification comparison, settled task table, and a live observation log",
        navigation:
          "Selected task drives both views; keyboard-reachable task marks in the swimlane and the machine",
        keyboard: "Native buttons plus canvas keyboard navigation in both charts",
        forcedColors: "not-reviewed",
      },
      motion: {
        reducedMotion:
          "prefers-reduced-motion switches the machine to its derived settled state; no replay animation runs",
        visibility: "Physics work suspends while the document is hidden",
      },
      responsive: {
        status: "declared-not-measured",
        viewports: [320, 768, 1440],
        selectionIdentity: "selected task ID",
      },
      ssr: {
        status: "not-assessed",
        hydration: "not-assessed",
      },
      performance: {
        status: "unmeasured",
        budgets: {
          bundle:
            "lazy example route using public root, ordinal, physics, and recipes entry points",
          interaction: "unmeasured",
          memory: "20-task dependency machine with a bounded 6-event observation log",
          hiddenPage: "physics suspendWhenHidden inherited from the frame",
        },
      },
    },
  },
  {
    id: "watermarks",
    path: "/examples/watermarks",
    sourceFile: "WatermarksExamplePage.jsx",
    sourceFiles: [
      "WatermarksExamplePage.jsx",
      "WatermarksExamplePage.css",
      "watermarksClaimContracts.js",
      "watermarksTemporalRecord.js",
    ],
    isPilot: true,
    title: "Watermarks, Made Physical",
    eyebrow: "Late events, closing windows",
    description:
      "Push out-of-order events through closing windows and watch the watermark separate accepted history from visibly quarantined late arrivals.",
    contract: {
      publicImports: ["semiotic/artifact", "semiotic/physics"],
      data: {
        states: ["live", "snapshot"],
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
        summary: "Narrative explanation, audited time-and-claim cards, and inspectable JSON",
        navigation: "Scenario controls, selected-event detail, and an expandable time payload",
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
    eyebrow: "From first use to real contribution",
    description:
      "Replay the same people through two community designs and compare whether invitation after habit formation creates a path to contribution or private usage.",
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
    eyebrow: "Review queues under AI throughput",
    description:
      "Route AI-era pull requests through finite review capacity and repeated CI passes to expose queue pressure that completion percentage hides.",
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
  {
    id: "ukraine-war-history",
    path: "/examples/ukraine-war-history",
    sourceFile: "UkraineWarHistoryExamplePage.jsx",
    isPilot: true,
    title: "Ukraine: Four Clocks of a Long War",
    eyebrow: "FlowMap · TemporalHistogram · history",
    description:
      "Cross-filter yearly military, civilian, and unspecified-use aid against documented equipment losses, economic shocks, and coalition change on linked maps and timelines.",
    contract: {
      publicImports: [
        "semiotic",
        "semiotic/geo",
        "semiotic/ordinal",
        "semiotic/utils",
        "semiotic/xy",
      ],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-oryx-kiel-world-bank-un-snapshots",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Oryx-derived public archive, Kiel Ukraine Support Tracker release 29, World Bank WDI, and official UN General Assembly records",
        capturedAt: "2026-07-20",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "quarterly",
      },
      accessibility: {
        summary:
          "Chart descriptions, summaries, accessible flow scenes, explicit source limits, and a labelled temporal histogram",
        navigation:
          "Native chapter, aid-type, aid-year, motion, country, time-window, donor, and source controls",
        keyboard:
          "Native buttons and checkbox, keyboard-navigable FlowMap marks, chart legends, and accessible tables",
        forcedColors:
          "Dashboard panels, controls, chart shells, focus rings, and source cards retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "Aid particles and frame transitions stop; the animation checkbox is disabled while the media preference is active",
        visibility: "FlowMap suspends particle work while the page is hidden",
      },
      responsive: {
        status: "browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable chapter, donor, aid type, allocation year, country, equipment category, and resolution IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-tested",
        hydration: "deterministic checked-in snapshots and stable responsive minimum widths",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public frame-family entry points",
          interaction:
            "memoized yearly aid flows, rankings, filtered Oryx bins, and stable style callbacks",
          memory:
            "282 monthly loss records, 84 donor-year rollups, at most 17 visible flows, and small annual series",
          hiddenPage: "FlowMap suspendWhenHidden default retained",
        },
      },
    },
  },
  {
    id: "the-benchmark-is-a-chart-too",
    path: "/examples/the-benchmark-is-a-chart-too",
    sourceFile: "ModelEvaluationExamplePage.jsx",
    isPilot: true,
    title: "The Benchmark Is a Chart, Too",
    eyebrow: "Model evaluation · scorer audit",
    description:
      "Audit one model-compatibility run by separating answers from abstentions, inspecting repaired contracts and residual failures, and checking the scorer before trusting its total.",
    contract: {
      publicImports: ["semiotic/ordinal"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-openai-gpt-5.6-baseline-and-repeat",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Semiotic prove-track OpenAI Responses baseline, repeated targeted trials, corrected score reports, and request ledgers",
        capturedAt: "2026-07-27",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "fixture revision",
      },
      accessibility: {
        summary:
          "Chart tables, explicit denominators, a text failure matrix, scorer audit cards, and a prose reading of every result",
        navigation:
          "Native score switches, chart navigation, an accessible failure table, and collapsed methods",
        keyboard:
          "Native buttons and details, keyboard-navigable charts and legends, and semantic tables",
        forcedColors:
          "System-color boundaries preserve controls, chart shells, audit cards, focus rings, and failure states",
      },
      motion: {
        reducedMotion: "No essential motion; decorative transitions are disabled",
        visibility: "No timers, animation loops, network requests, or hidden-page work",
      },
      responsive: {
        status: "designed-and-component-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable model, evidence-condition, score, and fixture IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration: "deterministic checked-in snapshot with an overall-score default",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy route using the public ordinal entry point",
          interaction: "nine grounding rows and three local score switches",
          memory: "small checked-in score, failure, and scorer-audit arrays",
          hiddenPage: "no background work",
        },
      },
    },
  },
  {
    id: "apollo-lunar-choreography",
    path: "/examples/apollo-lunar-choreography",
    sourceFile: "ApolloLunarChoreographyExamplePage.jsx",
    isPilot: true,
    title: "The Third Seat: Apollo’s Lunar Choreography",
    eyebrow: "ProcessSankey · NASA mission chronology",
    description:
      "Align nine lunar voyages at launch and trace 27 crew-seats through separation, waiting, reunion, lifeboat diversion, and verified return.",
    contract: {
      publicImports: ["semiotic", "semiotic/recipes", "semiotic/utils"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-nasa-apollo-ground-elapsed-time-transcription",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "NASA Apollo by the Numbers, Apollo Lunar Surface Journal mission summaries, and Apollo 13 mission chronology",
        capturedAt: "2026-08-01",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source revision",
      },
      accessibility: {
        summary:
          "ProcessSankey description and table, an explicit reading key, mission dossiers, prose conclusions, and a published-milestones table",
        navigation:
          "Native story-lens, mission, motion, placement, telemetry, argument, duration-bar, and source-link controls",
        keyboard:
          "Every authored control is a native button or link; ProcessSankey retains keyboard mark navigation and accessible table output",
        forcedColors:
          "Chart shell, controls, story cards, sources, focus states, and selection states retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The media preference disables ProcessSankey particles and authored CSS transitions while preserving the complete process view",
        visibility:
          "ProcessSankey retains its hidden-page suspension; the page has no timers or network requests",
      },
      responsive: {
        status: "container-responsive-and-browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable story-lens, mission, phase, and edge IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "deterministic checked-in mission chronology and stable default all-missions lens",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using public semiotic, semiotic/recipes, and semiotic/utils entry points",
          interaction:
            "nine missions, 32 bounded process edges, six phases, and memoized focus slices",
          memory:
            "one checked-in chronology with no duplicate chart snapshots or retained animation history",
          hiddenPage: "no timers, requests, observers, or authored background work",
        },
      },
    },
  },
  {
    id: "ballot-transfer-ledger",
    path: "/examples/ballot-transfer-ledger",
    sourceFile: "BallotTransferLedgerExamplePage.jsx",
    isPilot: true,
    title: "The 7,197-Vote Corridor",
    eyebrow: "ProcessSankey · certified ranked-choice transfers",
    description:
      "Audit certified ranked-choice transfers to show how three elimination pools moved 96,725 votes and erased a six-figure primary lead.",
    contract: {
      publicImports: ["semiotic", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-nyc-boe-certified-ranked-choice-rounds-transcription",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source: "NYC Board of Elections Official Ranked Choice Rounds, contest 024306",
        capturedAt: "2026-08-02",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source revision",
      },
      accessibility: {
        summary:
          "ProcessSankey description and table, a prose reading rule, transfer-pool inspector, endpoint ledger, and explicit conservation check",
        navigation: "Native transfer-pool, finding, accessible-table, and official-source controls",
        keyboard:
          "Every authored control is a native button or link; ProcessSankey retains keyboard mark navigation and accessible table output",
        forcedColors:
          "Chart shell, selectors, inspection panel, finding cards, source link, focus states, and selection states retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The example has no animated particles and disables authored CSS motion under the media preference",
        visibility:
          "ProcessSankey retains its hidden-page suspension; the page has no timers or network requests",
      },
      responsive: {
        status: "container-responsive-and-browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable certified pool, account, and edge IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "deterministic checked-in certified transfer ledger and stable Wiley-pool default",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public semiotic and semiotic/recipes entry points",
          interaction:
            "seven accounts, 18 bounded process edges, and three local inspector selections",
          memory: "one checked-in ledger with no duplicate snapshots or retained animation history",
          hiddenPage: "no timers, requests, observers, or authored background work",
        },
      },
    },
  },
  {
    id: "germany-still-becoming",
    path: "/examples/germany-still-becoming",
    sourceFile: "GermanyStillBecomingExamplePage.jsx",
    isPilot: true,
    title: "Germany, Still Becoming",
    eyebrow: "Vertical ProcessSankey · a constitutional history river",
    description:
      "Read twelve German constitutional stages downward while twenty-six territorial contributions split, merge, disappear into larger states, and return as Länder.",
    contract: {
      publicImports: ["semiotic", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-source-audited-mass-conserving-germany-history-river",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Official German state statistics, German History in Documents and Images, Bundesarchiv, Bundeszentrale für politische Bildung, and the United States Holocaust Memorial Museum",
        capturedAt: "2026-08-02",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source revision",
      },
      accessibility: {
        summary:
          "ProcessSankey description and table, conserved-width explanation, stage reader, metric controls, external-flow caveats, and source-linked interpretation",
        navigation: "Native metric, finding, accessible-table, source-link, and code-copy controls",
        keyboard:
          "Every authored control is a native button or link; ProcessSankey retains keyboard mark navigation and accessible table output",
        forcedColors:
          "Chart shell, width selector, stage reader, warning, sources, focus states, and pressed states retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The example has no animated particles and disables authored CSS motion under the media preference",
        visibility:
          "ProcessSankey retains its hidden-page suspension; the page has no timers or network requests",
      },
      responsive: {
        status: "container-responsive-and-browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable stage, historical-container, endpoint-atom, and link IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration: "deterministic checked-in river topology and stable c. 750 reader opening",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public semiotic and semiotic/recipes entry points",
          interaction:
            "98 containers, 130 conserved links, four local width metrics, and three finding shortcuts",
          memory:
            "one checked-in source dataset with no duplicate snapshots or retained animation history",
          hiddenPage: "no timers, requests, observers, or authored background work",
        },
      },
    },
  },
  {
    id: "good-earth-lying-flat",
    path: "/examples/good-earth-lying-flat",
    sourceFile: "GoodEarthLyingFlatExamplePage.jsx",
    isPilot: true,
    title: "From The Good Earth to Lying Flat",
    eyebrow: "ProcessSankey · a causal model of security and withdrawal",
    description:
      "Trace an explicitly interpretive causal Sankey from inherited insecurity through housing, credentials, work, and consumption to involution and forms of retreat.",
    contract: {
      publicImports: ["semiotic", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-authored-interpretive-causal-sankey",
          replay: false,
          schemaVersion: "1",
        },
      },
      provenance: {
        source:
          "Authored argument dataset: good-earth-to-lying-flat-process-sankey.json; weights are explicitly interpretive causal-emphasis units, not population estimates",
        capturedAt: "2026-08-03",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "argument or source revision",
      },
      accessibility: {
        summary:
          "ProcessSankey description and table, six authored-stage headings, family color key, confidence readout, claim lens, inspector, caveat, and visible uncertainty semantics",
        navigation:
          "Native claim-lens buttons, ProcessSankey keyboard mark navigation, accessible table, inspector, and code-copy control",
        keyboard:
          "Every authored control is a native button; the ProcessSankey preserves its keyboard mark navigation and accessible-table output",
        forcedColors:
          "Claim-lens states, chart shell, family key, inspector, warning, and focus rings retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The example has no animated particles; claim lenses restyle existing claims without a topology animation",
        visibility:
          "ProcessSankey retains hidden-page suspension; the page has no timers or network requests",
      },
      responsive: {
        status: "container-responsive-and-browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable authored concept and causal-claim IDs with stable claim-lens categories",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "deterministic local JSON adapter, fixed stage extents, and an all-claims default lens",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public semiotic and semiotic/recipes entry points",
          interaction: "20 fixed concepts, 35 bounded causal claims, and five local lens states",
          memory:
            "one checked-in source dataset and no retained animation history or duplicated stage snapshots",
          hiddenPage: "no timers, requests, observers, or authored background work",
        },
      },
    },
  },
  {
    id: "united-states-drawn-together",
    path: "/examples/united-states-drawn-together",
    sourceFile: "UnitedStatesHistoryRiverExamplePage.jsx",
    isPilot: true,
    title: "The United States, Drawn Together",
    eyebrow: "Vertical ProcessSankey · an institutional history river",
    description:
      "Follow U.S. jurisdiction routes across acquisitions, statehood, Civil War rupture and restoration, and lifecycle exits while three institutions persist.",
    contract: {
      publicImports: ["semiotic", "semiotic/recipes"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-source-audited-united-states-process-event-ledger",
          replay: false,
          schemaVersion: "2",
        },
      },
      provenance: {
        source:
          "U.S. Census Bureau, Bureau of Economic Analysis, National Archives, U.S. Senate, Department of the Interior, and source-specific territorial histories bundled with the research dataset",
        capturedAt: "2026-08-02",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "source revision",
      },
      accessibility: {
        summary:
          "ProcessSankey description and table, jurisdiction-route width explanation, event reader, lifecycle-exit caveats, external-administration ledger, and official sources",
        navigation: "Native event, accessible-table, source-link, and code-copy controls",
        keyboard:
          "Every authored control is native; ProcessSankey retains keyboard mark navigation and accessible table output",
        forcedColors:
          "Chart shell, institution key, event reader, warnings, source links, and focus states retain system-color boundaries",
      },
      motion: {
        reducedMotion:
          "The example has no animated particles and disables authored CSS motion under the media preference",
        visibility:
          "ProcessSankey retains hidden-page suspension; the page has no timers or network requests",
      },
      responsive: {
        status: "container-responsive-and-browser-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity:
          "stable milestone, institution, jurisdiction-route, holding, and transaction IDs",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration: "deterministic checked-in event topology and stable 1776 reader opening",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle: "lazy example route using public semiotic and semiotic/recipes entry points",
          interaction:
            "28 nodes, 64 dated transactions, three persistent institutions, seven lifecycle exits, and one local event reader",
          memory:
            "one checked-in research dataset compiled into an event ledger with no retained stage snapshots or animation history",
          hiddenPage: "no timers, requests, or authored background work",
        },
      },
    },
  },
  {
    id: "digital-humanities-thunderdome",
    path: "/examples/digital-humanities-thunderdome",
    sourceFile: "DigitalHumanitiesThunderdomeExamplePage.jsx",
    isPilot: true,
    title: "Thunderdome Has Rounded Corners",
    eyebrow: "Scrollytelling · AI-age digital humanities",
    description:
      "Scroll eight DHQ-data scenes to compare a 2011 digital-humanities argument with current publication patterns, method claims, and AI-era questions.",
    contract: {
      publicImports: ["semiotic", "semiotic/utils", "semiotic/xy"],
      data: {
        states: ["snapshot"],
        fixture: {
          kind: "checked-in-pinned-dhq-published-record-snapshot",
          replay: false,
          schemaVersion: "3",
        },
      },
      provenance: {
        source:
          "Official DHQ XML corpus plus the public dhq-journal repository pinned at acda567f6b46d43f709449e8f71392a51e5286df; compact browser aggregates generated from capture dhq-2007-to-2025-20260729",
        capturedAt: "2026-07-29",
        freshnessOwner: "Semiotic maintainers",
        reviewCadence: "release",
      },
      accessibility: {
        summary:
          "Eight Semiotic chart summaries and accessible tables pair every visual claim with a prose reading in document order",
        navigation:
          "Semantic article landmarks and observer-enhanced current-scene state preserve a complete linear reading without scroll choreography",
        keyboard:
          "Scrolling never traps focus; native links and buttons, chart mark navigation, and keyboard-triggered tooltips remain available",
        forcedColors:
          "Chapter state, focus rings, chart shells, marks, and tooltips retain system-color boundaries and non-color labels",
      },
      motion: {
        reducedMotion:
          "prefers-reduced-motion removes smooth scrolling and scene transforms, reveals every scene immediately, and disables chart transitions",
        visibility:
          "One IntersectionObserver limits active scene work to the reading viewport and disconnects on cleanup; there are no timers or continuous streams",
      },
      responsive: {
        status: "container-responsive-and-breakpoint-tested",
        viewports: [320, 390, 768, 1280],
        selectionIdentity: "stable scene and chart-datum IDs across stacked and sticky layouts",
      },
      ssr: {
        status: "Vite-build-and-component-SSR-compatible",
        hydration:
          "The deterministic inline scene sequence renders on the server; the measured desktop sticky stage and IntersectionObserver begin only after mount",
      },
      performance: {
        status: "bounded-and-route-split",
        budgets: {
          bundle:
            "lazy example route using public semiotic, semiotic/xy, and semiotic/utils entry points",
          interaction:
            "one shared IntersectionObserver updates only at scene boundaries; desktop mounts one active chart with no local data mutation controls",
          memory:
            "eight bounded chart scenes over compact cohort aggregates, one issue profile, and no retained reader telemetry",
          hiddenPage:
            "no polling, streaming, or timers; observer and force work are scoped to mounted, visible scenes",
        },
      },
    },
  },
])

// Publication timestamps, not insertion position, own the public sequence.
// New examples can be added anywhere and still appear first when their RFC3339
// timestamp is newer; paths make same-instant imports deterministic. Existing
// timestamps were backfilled from the commit that first added each page source.
const EXAMPLE_REGISTRY_METADATA = [
  {
    title: "The Machine Semiosphere",
    path: "/examples/machine-semiosphere",
    publishedAt: "2026-08-27T12:00:00-07:00",
    eyebrow: "July 2026 incident · cross-run traces",
    description:
      "Follow six scroll chapters through the reported July 2026 Hugging Face incident, using one vertical evidence map and fixed inline visuals to show how information crossed otherwise separate agent runs.",
    preview: "machine-semiosphere",
    badges: ["July 2026 incident", "Vertical evidence map", "Cross-run traces", "Accessible"],
    frames: ["ordinal", "network", "custom"],
    topics: ["process", "uncertainty", "ai", "design", "accessibility"],
  },
  {
    title: "Lines of Thought",
    path: "/examples/lines-of-thought",
    publishedAt: "2026-08-26T01:00:00-07:00",
    eyebrow: "Transit diagrams · authored geometry → topology fallback",
    description:
      "Follow the subway diagram from Beckian wayfinding to abstract networks, then compare an art-directed system with a coordinate-free watershed laid out from topology alone.",
    preview: "transit-diagram",
    badges: ["NetworkCustomChart", "Automatic fallback", "Octilinear recipe"],
    frames: ["network", "custom"],
    topics: ["history", "design", "accessibility"],
  },
  {
    title: "Aesthetic Policy Studio",
    path: "/examples/aesthetic-policy-studio",
    publishedAt: "2026-08-25T21:00:00-07:00",
    eyebrow: "Design governance · weights → evidence → visual voice",
    description:
      "See Semiotic's balanced default, then watch two opposing organizational aesthetic policies select different chart treatments without compromising the shared trust floor.",
    preview: "aesthetic-policy-studio",
    badges: ["Weighted policy", "Theme governance", "Candidate selection", "Accessible"],
    frames: ["ordinal"],
    topics: ["design", "ai", "accessibility"],
  },
  {
    title: "Bad Chart Autopsy",
    path: "/examples/bad-chart-autopsy",
    publishedAt: "2026-08-24T21:00:00-07:00",
    eyebrow: "Chart evaluation · reject → repair → prove",
    description:
      "Take apart a persuasive but misleading benchmark chart, then preserve its data while Semiotic diagnoses, repairs, and proves a defensible replacement.",
    preview: "bad-chart-autopsy",
    badges: ["Unified evaluation", "Render evidence", "Repair ledger", "Accessible"],
    frames: ["ordinal"],
    topics: ["ai", "design", "accessibility"],
  },
  {
    title: "How a Hit Travels",
    path: "/examples/how-a-hit-travels",
    publishedAt: "2026-08-09T23:01:36-07:00",
    eyebrow: "Data journalism · global streaming",
    description:
      "Compare 266 weeks of Netflix Top 10 rankings across 24 countries to see simultaneous arrivals become durable regional hits in linked country-chart neighborhoods.",
    preview: "how-a-hit-travels",
    badges: ["266 weeks", "24-country settled view", "Evidence ledger", "Accessible explorer"],
    frames: ["network", "custom"],
    topics: ["culture", "geography", "uncertainty", "design", "accessibility"],
  },
  {
    title: "The Living Ledger",
    path: "/examples/living-ledger",
    publishedAt: "2026-07-15T22:04:41-07:00",
    eyebrow: "Evidence lineage · ecosystem services",
    description:
      "Trace three ecosystem claims—coral threshold, forest disturbance, and modeled pollination gap—through deterministic replay from source evidence to affected people.",
    preview: "living-ledger",
    badges: ["Deterministic replay", "Evidence lineage", "SentenceFilter", "Physics pipeline"],
    frames: ["xy", "ordinal", "network", "geo", "stream-physics", "custom"],
    topics: ["climate", "uncertainty", "realtime", "design", "accessibility"],
  },
  {
    title: "The Last Scarcity",
    path: "/examples/the-last-scarcity",
    publishedAt: "2026-08-05T20:22:58-07:00",
    eyebrow: "Interactive essay · AI abundance",
    description:
      "Compare an AI-abundance scenario before and after cheap intelligence using a competition Sankey and a promise-versus-data DifferenceChart in one interactive essay.",
    preview: "last-scarcity",
    badges: ["Before/after Sankey", "Competition model", "DifferenceChart", "Evidence ledger"],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: [
      "ai",
      "culture",
      "civic",
      "process",
      "realtime",
      "uncertainty",
      "design",
      "accessibility",
    ],
  },
  {
    title: "The Hellhole Changed Addresses",
    path: "/examples/hellhole-changed-addresses",
    publishedAt: "2026-08-09T19:00:55-07:00",
    eyebrow: "First the city · then the suburb",
    description:
      "Move a birth-year observer through metropolitan migration while Census flows, local conditions, and preference data show concern shifting from city to suburb.",
    preview: "hellhole-changed-addresses",
    badges: ["Three evidence lanes", "Paired FlowMaps", "Cohort cuts", "Source registry"],
    frames: ["geo", "xy", "network", "ordinal", "custom"],
    topics: ["history", "culture", "geography", "civic", "design", "uncertainty", "accessibility"],
  },
  {
    title: "Parataxis Machine",
    path: "/examples/parataxis-machine",
    publishedAt: "2026-08-09T19:00:55-07:00",
    eyebrow: "How implied connections work",
    description:
      "Inspect six clause pairs to compare stated syntax with reader-inferred links and see why parataxis recurs in AI-generated prose.",
    preview: "parataxis-machine",
    badges: ["Clause constellation", "Ambiguity field", "Aphorism debt", "Sentence machine"],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: ["culture", "ai", "uncertainty", "design", "accessibility"],
  },
  {
    title: "Ukraine: Four Clocks of a Long War",
    path: "/examples/ukraine-war-history",
    publishedAt: "2026-07-21T21:03:16-07:00",
    eyebrow: "FlowMap · TemporalHistogram · history",
    description:
      "Cross-filter yearly military, civilian, and unspecified-use aid against documented equipment losses, economic shocks, and coalition change on linked maps and timelines.",
    preview: "ukraine-war-history",
    badges: ["FlowMap", "TemporalHistogram", "Oryx rollups", "Evidence boundaries"],
    frames: ["geo", "xy", "ordinal"],
    topics: ["history", "geography", "civic", "design", "accessibility"],
  },
  {
    title: "The Insight Forge",
    path: "/examples/insight-forge",
    publishedAt: "2026-07-12T09:00:38-07:00",
    eyebrow: "Portable evidence · packaging failure",
    description:
      "Investigate a packaging failure room by room. Evidence you accept becomes a portable artifact that can filter and annotate the next view.",
    preview: "insight-forge",
    badges: ["Portable artifacts", "Deterministic recipes", "Audited lineage"],
    frames: ["xy", "ordinal", "network"],
    topics: ["process", "design", "accessibility", "ai"],
  },
  {
    title: "Analyst Adventure: The Case of the Vanishing Visionary",
    path: "/examples/analyst-adventure",
    publishedAt: "2026-07-14T10:53:40-07:00",
    eyebrow: "Five Stream Frames · analytical adventure",
    description:
      "Solve one deterministic case by reading five chart rooms: timeline, categorical ledger, map, suspect network, and physics-driven sequence.",
    preview: "analyst-adventure",
    badges: ["Deterministic story", "Keyboard playable", "Agent-readable"],
    frames: ["xy", "ordinal", "geo", "network", "stream-physics"],
    topics: ["process", "uncertainty", "ai", "design", "accessibility"],
  },
  {
    title: "The Sentence Is Not the Words",
    path: "/examples/sentence-structure",
    publishedAt: "2026-07-14T10:53:40-07:00",
    eyebrow: "Linked linguistic views · natural-language controls",
    description:
      "Select words once and follow them through grammar, ambiguity, meaning, rhetoric, corpus paths, phrase relations, and textual variants in linked linguistic views.",
    preview: "sentence-structure",
    badges: ["SentenceFilter", "Shared selection", "Authored fixtures", "Accessible structure"],
    frames: ["xy", "network", "custom"],
    topics: ["culture", "design", "accessibility"],
  },
  {
    title: "The Rhetorical Crucible",
    path: "/examples/rhetorical-crucible",
    publishedAt: "2026-07-21T21:03:16-07:00",
    eyebrow: "Word Trails × physics · three debate assays",
    description:
      "Track one word through three debate assays to compare its isolated use, temporal context, and physical trajectory without inferring motive.",
    preview: "rhetorical-crucible",
    badges: ["Word Trails", "StreamPhysicsFrame", "Deterministic assay", "Audited lineage"],
    frames: ["ordinal", "stream-physics", "custom"],
    topics: ["culture", "civic", "process", "design", "accessibility"],
  },
  {
    title: "The Latent Crucible",
    path: "/examples/latent-crucible",
    publishedAt: "2026-07-21T21:03:16-07:00",
    eyebrow: "LDA Topic Modeling × Word Trails",
    description:
      "Run a seeded Gibbs sampler over an inspectable corpus and watch anonymous topics stabilize as word tokens are reassigned step by step.",
    preview: "latent-crucible",
    badges: ["Word Trails", "Collapsed Gibbs", "CrucibleChart", "Audited assumptions"],
    frames: ["ordinal", "stream-physics", "custom"],
    topics: ["culture", "ai", "uncertainty", "process", "design", "accessibility"],
  },
  {
    title: "The Release Machine",
    path: "/examples/chain-reaction",
    publishedAt: "2026-07-12T09:00:38-07:00",
    eyebrow: "Which blocker is really costing you?",
    description:
      "Compare two equally late 90% blockers: the swimlane shows schedule and ownership, while the dependency machine shows which one prevents nine tasks from starting.",
    preview: "chain-reaction",
    badges: ["ChainReactionChart", "intervalLanesLayout", "Blocker amplification"],
    frames: ["ordinal", "stream-physics", "custom"],
    topics: ["process", "design", "accessibility"],
  },
  {
    title: "Watermarks, Made Physical",
    path: "/examples/watermarks",
    publishedAt: "2026-07-07T18:19:32-07:00",
    eyebrow: "Late events, closing windows",
    description:
      "Push out-of-order events through closing windows and watch the watermark separate accepted history from visibly quarantined late arrivals.",
    preview: "watermarks",
    badges: ["EventDropChart", "Physics", "Agent-readable"],
    frames: ["stream-physics", "xy"],
    topics: ["process", "realtime"],
  },
  {
    title: "The Stakeholder Journey",
    path: "/examples/stakeholder-journey",
    publishedAt: "2026-07-09T07:26:39-07:00",
    eyebrow: "From first use to real contribution",
    description:
      "Replay the same people through two community designs and compare whether invitation after habit formation creates a path to contribution or private usage.",
    preview: "stakeholder-journey",
    badges: ["StreamPhysicsFrame", "Stage ledger", "Live geometry"],
    frames: ["stream-physics"],
    topics: ["process", "civic"],
  },
  {
    title: "Merge Pressure",
    path: "/examples/merge-pressure",
    publishedAt: "2026-07-09T07:26:39-07:00",
    eyebrow: "Review queues under AI throughput",
    description:
      "Route AI-era pull requests through finite review capacity and repeated CI passes to expose queue pressure that completion percentage hides.",
    preview: "merge-pressure",
    badges: ["GauntletChart", "Shared capacity", "Weighted groups"],
    frames: ["gauntlet"],
    topics: ["process", "ai"],
  },
  {
    title: "Not in MY Backyard",
    path: "/examples/not-in-my-backyard",
    publishedAt: "2026-07-09T07:26:39-07:00",
    eyebrow: "Housing plan vs cumulative drag",
    description:
      "Simulate one housing plan through civic gates as it loses features and gains drag, showing how approval can coexist with no new homes.",
    preview: "nimby",
    badges: ["GauntletChart", "bodyForces", "Compound glyphs"],
    frames: ["gauntlet"],
    topics: ["process", "civic"],
  },
  {
    title: "Brushable Weather Rings",
    path: "/examples/climate-radial-weather",
    publishedAt: "2026-06-27T19:24:36-07:00",
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
    publishedAt: "2026-07-03T13:48:30-07:00",
    eyebrow: "Four custom frames · ISOTYPE",
    description:
      "Rebuild a lake-level and weather dashboard as repeated pictograms across streaming XY, ordinal, network, and geographic custom layouts.",
    preview: "lake-isotype",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["xy", "ordinal", "network", "geo", "custom"],
    topics: ["climate", "geography", "accessibility"],
  },
  {
    title: "Nathan's Hot Dog Contest, Recounted",
    path: "/examples/hot-dog-contest-variations",
    publishedAt: "2026-07-06T14:27:10-07:00",
    eyebrow: "TemporalHistogram · ISOTYPE · source audit",
    description:
      "Compare annual winners in repeated units while inspecting rule changes and separating eating pace from total contest duration.",
    preview: "hotdog-variations",
    badges: ["TemporalHistogram", "ISOTYPE", "Source-audited"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["culture", "design"],
  },
  {
    title: "The Buildings Behind AI",
    path: "/examples/data-centers-isotype",
    publishedAt: "2026-07-03T13:48:30-07:00",
    eyebrow: "Altitude sections · evidence ledger",
    description:
      "Count AI infrastructure’s power, water, capacity, and compute in repeated physical units, with every claim carrying its denominator and source.",
    preview: "data-centers-isotype",
    badges: ["Custom chart", "Local", "Agent-readable"],
    frames: ["geo", "custom"],
    topics: ["ai", "geography", "climate"],
  },
  {
    title: "The Grid Is the Real AI Infrastructure",
    path: "/examples/the-grid",
    publishedAt: "2026-07-17T20:46:46-07:00",
    eyebrow: "Fuel mix · demand vs forecast · spare capacity",
    description:
      "Compare fuel mix, demand against forecast, and remaining spare capacity for grid regions serving AI data centers; pairs with The Buildings Behind AI.",
    preview: "the-grid",
    badges: ["DifferenceChart", "styleRules", "BigNumber", "Agent-readable"],
    frames: ["xy", "ordinal"],
    topics: ["ai", "climate", "realtime"],
  },
  {
    title: "Creative Gravity of America",
    path: "/examples/creative-contours",
    publishedAt: "2026-07-06T11:42:28-07:00",
    eyebrow: "Isometric creative-industry terrain",
    description:
      "Stack metro creative industries—screen, sound, games, design, and research—as isometric contour shelves over the United States rather than as topography.",
    preview: "creative-contours",
    badges: ["GeoCustomChart", "Contours", "Isometric", "Custom layout"],
    frames: ["geo", "custom"],
    topics: ["culture", "geography", "design"],
  },
  {
    title: "Sometimes it's better to be discrete",
    path: "/examples/sometimes-better-discrete",
    publishedAt: "2026-07-05T13:34:05-07:00",
    eyebrow: "TokenLayer · task-aware ISOTYPE",
    description:
      "Estimate a bus-waiting probability, reveal the exact count, and compare density curves, quantile dots, hypothetical outcomes, and commuter icons by reader task.",
    preview: "discrete",
    badges: ["TokenLayer", "Quantile dotplot", "HOPs", "Design critic"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["uncertainty", "design", "accessibility"],
  },
  {
    title: "Where You Draw the Line",
    path: "/examples/where-you-draw-the-line",
    publishedAt: "2026-07-12T16:30:00-07:00",
    eyebrow: "Explorable MAUP laboratory",
    description:
      "Move one boundary across an unchanged field and compare aggregate answers through a 1D transect, constructed city, and 2D-plus-time reporting stack.",
    preview: "maup",
    badges: ["Direct manipulation", "Continuous field", "Sensitivity analysis"],
    frames: ["xy", "geo", "custom"],
    topics: ["geography", "uncertainty", "design", "accessibility"],
  },
  {
    title: "All the Wars of the United States",
    path: "/examples/us-war-timeline",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Custom ordinal timeline",
    description:
      "Inspect a layered timeline of U.S. conflicts by geopolitical sphere, historical period, concurrency, and the comparatively rare years of peace.",
    preview: "wars",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["ordinal", "custom"],
    topics: ["history", "geography", "accessibility"],
  },
  {
    title: "A Genealogy of Cubism and Abstract Art",
    path: "/examples/art-movement-genealogy",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Automatic chronological network",
    description:
      "Generate a chronologically constrained influence graph styled after Alfred H. Barr Jr.'s 1936 Cubism and Abstract Art cover.",
    preview: "art",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["network", "custom"],
    topics: ["history", "culture", "accessibility"],
  },
  {
    title: "Paris, Isometric City of Lights",
    path: "/examples/paris-isometric-landmarks",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Custom isometric GeoFrame",
    description:
      "Explore five-by-five strategy-game views of Paris, Austin, San Francisco, and Tokyo, populated from DBpedia landmarks and resilient local snapshots.",
    preview: "isometric",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["geo", "custom"],
    topics: ["geography", "culture", "accessibility"],
  },
  {
    title: "The Wheel of Urines",
    path: "/examples/urine-wheel",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Custom radial network",
    description:
      "Inspect a medieval uroscopy wheel redrawn as a radial node-link diagram: twenty named colors connect to the digestion stages they were thought to signify.",
    preview: "urine",
    badges: ["Custom recipe", "Local", "Intent-aware", "Accessible navigation", "Agent-readable"],
    frames: ["network", "custom"],
    topics: ["history", "culture", "accessibility"],
  },
  {
    title: "The New York & Erie Railroad",
    path: "/examples/erie-railroad-organization",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Custom botanical hierarchy",
    description:
      "Rebuild McCallum and Henshaw’s 1855 railroad diagram as computed trunks, workforce branches, and keyboard-navigable organizational roles.",
    preview: "erie",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["network", "custom"],
    topics: ["history", "accessibility"],
  },
  {
    title: "Wikipedia, as it happens",
    path: "/examples/wikipedia-realtime",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Five coordinated realtime swarms",
    description:
      "Filter live English Wikipedia edits across five coordinated swarms, with actor classification, signed-change encoding, aggregation, and revision-level drilldown.",
    preview: "wikipedia",
    badges: ["Custom chart", "Local", "Intent-aware"],
    frames: ["xy", "network", "custom"],
    topics: ["realtime", "culture", "design"],
  },
  {
    title: "Your Local Government Explorer",
    path: "/examples/local-government-explorer",
    publishedAt: "2026-06-27T21:13:03-07:00",
    eyebrow: "ZIP-driven civic data + networks",
    description:
      "Resolve a postal place to its county’s disaster record and spending, live 311 requests, municipal law, and a network of bodies, sponsors, meetings, and active legislation.",
    preview: "local-government",
    frames: ["network", "geo", "custom"],
    topics: ["civic", "geography", "realtime"],
  },
  {
    title: "The Long Way Around",
    path: "/examples/port-congestion-replay",
    publishedAt: "2026-06-30T12:43:52-07:00",
    eyebrow: "Real chokepoint data, four-frame replay",
    description:
      "Replay quiet spring, Ever Given blockage, and Red Sea detour traffic from IMF PortWatch across four linked views of routes and transit-time divergence.",
    preview: "port-replay",
    frames: ["xy", "ordinal", "geo", "custom"],
    topics: ["realtime", "geography", "history", "process"],
  },
  {
    title: "The Third Seat: Apollo’s Lunar Choreography",
    path: "/examples/apollo-lunar-choreography",
    publishedAt: "2026-08-03T14:11:10-07:00",
    eyebrow: "ProcessSankey · NASA mission chronology",
    description:
      "Align nine lunar voyages at launch and trace 27 crew-seats through separation, waiting, reunion, lifeboat diversion, and verified return.",
    preview: "apollo-third-seat",
    badges: ["ProcessSankey", "NASA GET", "Source-audited", "Accessible"],
    frames: ["network"],
    topics: ["history", "process", "design", "accessibility"],
  },
  {
    title: "The 7,197-Vote Corridor",
    path: "/examples/ballot-transfer-ledger",
    publishedAt: "2026-08-03T14:11:10-07:00",
    eyebrow: "ProcessSankey · certified ranked-choice transfers",
    description:
      "Audit certified ranked-choice transfers to show how three elimination pools moved 96,725 votes and erased a six-figure primary lead.",
    preview: "ballot-transfer-ledger",
    badges: ["ProcessSankey", "NYC BOE", "Conserved flows", "Accessible"],
    frames: ["network"],
    topics: ["civic", "process", "design", "accessibility"],
  },
  {
    title: "Germany, Still Becoming",
    path: "/examples/germany-still-becoming",
    publishedAt: "2026-08-03T14:11:10-07:00",
    eyebrow: "Vertical ProcessSankey · a constitutional history river",
    description:
      "Read twelve German constitutional stages downward while twenty-six territorial contributions split, merge, disappear into larger states, and return as Länder.",
    preview: "germany-still-becoming",
    badges: ["Vertical ProcessSankey", "12 stages", "Conserved widths", "Accessible"],
    frames: ["network"],
    topics: ["history", "culture", "civic", "process", "accessibility"],
  },
  {
    title: "From The Good Earth to Lying Flat",
    path: "/examples/good-earth-lying-flat",
    publishedAt: "2026-08-03T23:13:28-07:00",
    eyebrow: "ProcessSankey · a causal model of security and withdrawal",
    description:
      "Trace an explicitly interpretive causal Sankey from inherited insecurity through housing, credentials, work, and consumption to involution and forms of retreat.",
    preview: "good-earth-lying-flat",
    badges: ["ProcessSankey", "6 authored stages", "Claim lens", "Accessible"],
    frames: ["network"],
    topics: ["culture", "history", "process", "design", "accessibility"],
  },
  {
    title: "The United States, Drawn Together",
    path: "/examples/united-states-drawn-together",
    publishedAt: "2026-08-03T14:11:10-07:00",
    eyebrow: "Vertical ProcessSankey · an institutional history river",
    description:
      "Follow U.S. jurisdiction routes across acquisitions, statehood, Civil War rupture and restoration, and lifecycle exits while three institutions persist.",
    preview: "united-states-drawn-together",
    badges: ["Vertical ProcessSankey", "Persistent inventory", "Lifecycle exits", "Accessible"],
    frames: ["network"],
    topics: ["history", "geography", "civic", "process", "accessibility"],
  },
  {
    title: "The Scroll You're Telling",
    path: "/examples/scroll-youre-telling",
    publishedAt: "2026-06-30T12:43:52-07:00",
    eyebrow: "Realtime reader telemetry",
    description:
      "Read a short history of data journalism while linked charts plot your own scroll position, velocity, and dwell time beside the essay.",
    preview: "scroll-tell",
    badges: ["Custom chart", "Local", "Intent-aware"],
    frames: ["xy", "custom"],
    topics: ["realtime", "culture", "design", "accessibility"],
  },
  {
    title: "Thunderdome Has Rounded Corners",
    path: "/examples/digital-humanities-thunderdome",
    publishedAt: "2026-08-03T14:11:10-07:00",
    eyebrow: "Scrollytelling · AI-age digital humanities",
    description:
      "Scroll eight DHQ-data scenes to compare a 2011 digital-humanities argument with current publication patterns, method claims, and AI-era questions.",
    preview: "thunderdome",
    badges: ["Eight charts", "Scrollytelling", "DHQ repository"],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: ["ai", "history", "culture", "design", "accessibility"],
  },
  {
    title: "The 12 Kinds of Data Visualization People",
    path: "/examples/dataviz-people",
    publishedAt: "2026-07-04T17:45:51-07:00",
    eyebrow: "Twelve personas · twelve chart grammars",
    description:
      "Compare twelve visualization personas through twelve chart grammars, from spreadsheet brute force and BI dashboards to studios, science, journalism, operations, and procedural art.",
    preview: "dataviz-people",
    badges: ["Custom chart", "Sankey", "Candlestick", "Local"],
    frames: ["xy", "ordinal", "network", "custom"],
    topics: ["culture", "design"],
  },
  {
    title: "Can You Know a Book Better Without Reading It?",
    path: "/examples/distant-reading",
    publishedAt: "2026-07-04T17:45:51-07:00",
    eyebrow: "Distant reading · literary signals",
    description:
      "Compare four public-domain novels through chapter signal fields, phase summaries, corpus fingerprints, and narrative-flow Sankeys in one distant-reading room.",
    preview: "distant-reading",
    badges: ["LineChart", "BarChart", "Sankey", "Local"],
    frames: ["xy", "ordinal", "network"],
    topics: ["culture", "design"],
  },
  {
    title: "We Live in a World of Funnels",
    path: "/examples/world-of-funnels",
    publishedAt: "2026-07-04T17:45:51-07:00",
    eyebrow: "Funnel analysis · Pop Art flows",
    description:
      "Compare classic conversion funnels with A/B testing, branching Sankey paths, and temporal path motifs to separate precision from accuracy in funnel analysis.",
    preview: "funnels",
    badges: ["FunnelChart", "Sankey", "ProcessSankey"],
    frames: ["ordinal", "network", "custom"],
    topics: ["process", "design"],
  },
  {
    title: "What the Machine Sees",
    path: "/examples/what-the-machine-sees",
    publishedAt: "2026-06-30T12:43:52-07:00",
    eyebrow: "The intelligence layer, end to end",
    description:
      "Profile real World Bank data without a model call, then inspect ranked chart capabilities and Semiotic’s description, audit, navigation tree, and chosen chart.",
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
    title: "The Benchmark Is a Chart, Too",
    path: "/examples/the-benchmark-is-a-chart-too",
    publishedAt: "2026-07-26T22:11:36-07:00",
    eyebrow: "Answer vs abstain · scorer audit",
    description:
      "Audit one model-compatibility run by separating answers from abstentions, inspecting first-attempt failures, and checking the scorer before trusting its total.",
    preview: "model-evaluation",
    badges: ["Grouped scorecard", "Scorer audit", "Agent-readable"],
    frames: ["ordinal"],
    topics: ["ai", "uncertainty", "design", "accessibility"],
  },
  {
    title: "The Living System of Semiotic",
    path: "/examples/semiotic-architecture",
    publishedAt: "2026-06-30T12:43:52-07:00",
    eyebrow: "Interactive architecture map",
    description:
      "Trace any example from its visible charts and controls to the four frame models, data inputs, and shared implementation that produces them.",
    preview: "architecture",
    frames: ["network", "custom"],
    topics: ["design", "process", "accessibility"],
  },
  {
    title: "The Octopus: It has its tentacles in everything",
    path: "/examples/octopus-metaphor",
    publishedAt: "2026-07-04T17:45:51-07:00",
    eyebrow: "Network + GeoCustomChart metaphor",
    description:
      "Compare moral networks, imperial octopus maps, and a final Semiotic-as-octopus diagram while tracing the octopus metaphor across visualization history.",
    preview: "octopus",
    badges: ["Custom chart", "GeoCustomChart", "NetworkCustomChart"],
    frames: ["network", "geo", "custom"],
    topics: ["history", "geography", "design"],
  },
  {
    title: "Point Climate Anomaly",
    path: "/examples/climate-anomaly",
    publishedAt: "2026-06-27T19:24:36-07:00",
    eyebrow: "Difference chart + uncertainty band",
    description:
      "Compare this year's daily temperature against an adjusted historical mean and its 5th–95th percentile range in one uncertainty-banded DifferenceChart.",
    preview: "climate",
    frames: ["xy"],
    topics: ["climate", "uncertainty"],
  },
  {
    title: "The Gestalt of Data Visualization",
    path: "/examples/gestalt-principles",
    publishedAt: "2026-06-30T18:44:51-07:00",
    eyebrow: "Five chapters · perception → Semiotic",
    description:
      "Move through five perception chapters—similarity, common fate, proximity, figure/ground, and continuity—each demonstrated on a live Semiotic chart.",
    preview: "gestalt",
    frames: ["xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Semiotic Standard: Chart Deployment Codes",
    path: "/examples/semiotic-standard",
    publishedAt: "2026-07-19T13:55:31-07:00",
    eyebrow: "16 charts · context → sparkline",
    description:
      "Switch between context and sparkline modes to decide when 16 chart types fit XY, ordinal, network, geographic, or physics tasks—and when they should compress.",
    preview: "semiotic-standard",
    badges: ["Context mode", "Sparkline mode", "Real World Bank data"],
    frames: ["xy", "ordinal", "network", "geo", "stream-physics"],
    topics: ["design", "process", "accessibility"],
  },
  {
    title: "Data Viz for Dummies",
    path: "/examples/data-viz-for-dummies",
    publishedAt: "2026-07-22T11:15:56-07:00",
    eyebrow: "Chart families · data and task taxonomy",
    description:
      "Organize chart families by data and task, then use one fictional season to choose forms for ranking, comparison, change, distribution, relationship, flow, and hierarchy.",
    preview: "data-viz-for-dummies",
    badges: ["Scrollytelling", "Dual taxonomy", "Accessible charts", "Semiotic-only"],
    frames: ["xy", "ordinal", "network"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Data Viz for Dummies II",
    path: "/examples/data-viz-for-dummies-2",
    publishedAt: "2026-07-23T07:55:44-07:00",
    eyebrow: "Composition, spread, attrition, and networks",
    description:
      "Match composition, volume, spread, two-dimensional patterns, attrition, reciprocal exchange, and network topology to specialist charts through one fictional arena.",
    preview: "data-viz-for-dummies-2",
    badges: ["Scrollytelling", "Chart selection", "Accessible charts", "Semiotic-only"],
    frames: ["xy", "ordinal", "network"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Data Viz for Dummies III",
    path: "/examples/data-viz-for-dummies-3",
    publishedAt: "2026-07-23T07:55:44-07:00",
    eyebrow: "Chart substitutions · tradeoff lab",
    description:
      "Substitute dot, violin, ridgeline, difference, connected scatter, tree, and circle-pack charts for familiar starters while naming each switch’s accepted tradeoff.",
    preview: "data-viz-for-dummies-3",
    badges: ["Scrollytelling", "Chart comparison", "Accessible charts", "Semiotic-only"],
    frames: ["xy", "ordinal", "network"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Data Viz for Dummies IV",
    path: "/examples/data-viz-for-dummies-4",
    publishedAt: "2026-07-23T07:55:44-07:00",
    eyebrow: "Specialist charts · decision-led rotation",
    description:
      "Match specialist charts—pie, donut, gauge, Likert, swarm, bubble, multivariate, layered-time, navigation, orbit, and temporal flow—to the questions that justify their extra ink.",
    preview: "data-viz-for-dummies-4",
    badges: ["Scrollytelling", "Complete chart roster", "Accessible charts", "Semiotic-only"],
    frames: ["xy", "ordinal", "network"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Data Viz for Dummies V",
    path: "/examples/data-viz-for-dummies-5",
    publishedAt: "2026-07-23T07:55:44-07:00",
    eyebrow: "Geographic charts · location earns its ink",
    description:
      "Take Rookie City on the road and test when regional color, located magnitude, geographic flow, experienced distance, tiled context, or projected geometry earns map ink.",
    preview: "data-viz-for-dummies-5",
    badges: ["Scrollytelling", "Geo charts", "Accessible maps", "Semiotic-only"],
    frames: ["geo"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Data Viz for Dummies VI",
    path: "/examples/data-viz-for-dummies-6",
    publishedAt: "2026-07-23T07:55:44-07:00",
    eyebrow: "Physics instruments · mechanisms earn their motion",
    description:
      "Use seven physics instruments to compare settling, arrival, capacity, compound bodies, transformation, dependency, and custom mechanisms under bounded simulation.",
    preview: "data-viz-for-dummies-6",
    badges: ["Scrollytelling", "Physics charts", "Accessible simulation", "Semiotic-only"],
    frames: ["stream-physics"],
    topics: ["design", "accessibility", "culture"],
  },
  {
    title: "Mobile Data Visualization That Works",
    path: "/examples/mobile-data-visualization",
    publishedAt: "2026-07-05T10:36:35-07:00",
    eyebrow: "Mobile-first review · Semiotic demos",
    description:
      "Apply mobile research through live Semiotic demos: density budgets, small multiples, touch-first controls, constraint breakpoints, and source-led design choices.",
    preview: "mobilevis",
    badges: ["Responsive", "Research-backed", "Touch-first"],
    frames: ["xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Drawing Networks",
    path: "/examples/network-visualization",
    publishedAt: "2026-06-30T18:44:51-07:00",
    eyebrow: "Network forms + an interactive toy",
    description:
      "Compare arc diagrams, matrices, community layouts, Sankeys, and chords, then use one playground for pathfinding, centrality, and ego-network inspection.",
    preview: "networkviz",
    frames: ["network", "xy", "ordinal", "custom"],
    topics: ["design", "accessibility"],
  },
  {
    title: "Map of the Oregon Trail",
    path: "/examples/oregon-trail",
    publishedAt: "2026-06-30T18:44:51-07:00",
    eyebrow: "Retro cartography · real geography",
    description:
      "Recreate the 1985 Oregon Trail end-game map on real Washington, Oregon, and Idaho geography with period-limited colors, landmarks, and an animated START-to-FINISH wagon.",
    preview: "oregontrail",
    badges: ["Custom chart", "Local", "Accessible navigation"],
    frames: ["geo", "custom"],
    topics: ["history", "geography", "accessibility"],
  },
  {
    title: "The Equal Places Atlas",
    path: "/examples/equal-places-atlas",
    publishedAt: "2026-07-24T17:15:42-07:00",
    eyebrow: "Gridified geography · sampled land",
    description:
      "Resample U.S. and world land into projected dot fields, then compare each equal-place lattice with conventional geography and tile cartograms.",
    preview: "equal-places-atlas",
    badges: ["GeoCustomChart", "Dot fields", "Grid cartograms"],
    frames: ["geo", "custom"],
    topics: ["geography", "design", "accessibility"],
  },
  {
    title: "Earthquakes",
    path: "/examples/earthquakes",
    publishedAt: "2026-07-17T11:16:36-07:00",
    eyebrow: "Spin the globe to filter · M6+ 2021–2025",
    description:
      "Drag-rotate an orthographic globe to filter M6+ earthquakes while linked KPI tiles, magnitude bars, regional ranks, and quarterly lines recount only visible events.",
    preview: "earthquakes",
    badges: ["ProportionalSymbolMap", "dragRotate", "Linked summary"],
    frames: ["geo", "xy"],
    topics: ["geography", "climate", "design"],
  },
  {
    title: "Europa nach den lebenden Sprachen",
    path: "/examples/europa-languages",
    publishedAt: "2026-07-17T11:16:36-07:00",
    eyebrow: "Rough hachure · Ausfeld 1840",
    description:
      "Rebuild Ausfeld’s 1840 language plate over exact Natural Earth areas: rough rendering supplies historical ink while geometry preserves hit testing and accessibility.",
    preview: "europa-languages",
    badges: ["semiotic/rough", "StreamGeoFrame", "Historical plate"],
    frames: ["geo"],
    topics: ["geography", "history", "culture", "design"],
  },
]

const EXAMPLE_SOURCE_FILES_BY_PATH = Object.freeze({
  "/examples/lines-of-thought": "TransitDiagramExamplePage.jsx",
  "/examples/aesthetic-policy-studio": "AestheticPolicyStudioExamplePage.jsx",
  "/examples/bad-chart-autopsy": "BadChartAutopsyExamplePage.jsx",
  "/examples/how-a-hit-travels": "HowAHitTravelsExamplePage.jsx",
  "/examples/living-ledger": "LivingLedgerExamplePage.jsx",
  "/examples/the-last-scarcity": "TheLastScarcityExamplePage.jsx",
  "/examples/hellhole-changed-addresses": "HellholeChangedAddressesExamplePage.jsx",
  "/examples/ukraine-war-history": "UkraineWarHistoryExamplePage.jsx",
  "/examples/analyst-adventure": "AnalystAdventureExamplePage.jsx",
  "/examples/art-movement-genealogy": "ArtMovementGenealogyExamplePage.jsx",
  "/examples/climate-anomaly": "ClimateAnomalyExamplePage.jsx",
  "/examples/climate-radial-weather": "ClimateRadialWeatherExamplePage.jsx",
  "/examples/creative-contours": "CreativeContoursExamplePage.jsx",
  "/examples/data-centers-isotype": "DataCentersIsotypeExamplePage.jsx",
  "/examples/the-grid": "TheGridExamplePage.jsx",
  "/examples/dataviz-people": "DatavizPeopleExamplePage.jsx",
  "/examples/distant-reading": "DistantReadingExamplePage.jsx",
  "/examples/erie-railroad-organization": "ErieRailroadOrganizationExamplePage.jsx",
  "/examples/gestalt-principles": "GestaltPrinciplesExamplePage.jsx",
  "/examples/semiotic-standard": "SemioticStandardExamplePage.jsx",
  "/examples/data-viz-for-dummies": "DataVizForDummiesExamplePage.jsx",
  "/examples/data-viz-for-dummies-2": "DataVizForDummiesTwoExamplePage.jsx",
  "/examples/data-viz-for-dummies-3": "DataVizForDummiesThreeExamplePage.jsx",
  "/examples/data-viz-for-dummies-4": "DataVizForDummiesFourExamplePage.jsx",
  "/examples/data-viz-for-dummies-5": "DataVizForDummiesFiveExamplePage.jsx",
  "/examples/data-viz-for-dummies-6": "DataVizForDummiesSixExamplePage.jsx",
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
  "/examples/apollo-lunar-choreography": "ApolloLunarChoreographyExamplePage.jsx",
  "/examples/ballot-transfer-ledger": "BallotTransferLedgerExamplePage.jsx",
  "/examples/germany-still-becoming": "GermanyStillBecomingExamplePage.jsx",
  "/examples/good-earth-lying-flat": "GoodEarthLyingFlatExamplePage.jsx",
  "/examples/united-states-drawn-together": "UnitedStatesHistoryRiverExamplePage.jsx",
  "/examples/rhetorical-crucible": "DebateConceptCrucibleExamplePage.jsx",
  "/examples/latent-crucible": "LDATopicCrucibleExamplePage.jsx",
  "/examples/scroll-youre-telling": "ScrollYoureTellingExamplePage.jsx",
  "/examples/digital-humanities-thunderdome": "DigitalHumanitiesThunderdomeExamplePage.jsx",
  "/examples/sentence-structure": "SentenceStructureExamplePage.jsx",
  "/examples/semiotic-architecture": "SemioticArchitectureExamplePage.jsx",
  "/examples/sometimes-better-discrete": "SometimesDiscreteExamplePage.jsx",
  "/examples/where-you-draw-the-line": "WhereYouDrawTheLineExamplePage.jsx",
  "/examples/urine-wheel": "UrineWheelExamplePage.jsx",
  "/examples/us-war-timeline": "USWarTimelineExamplePage.jsx",
  "/examples/what-the-machine-sees": "WhatTheMachineSeesExamplePage.jsx",
  "/examples/the-benchmark-is-a-chart-too": "ModelEvaluationExamplePage.jsx",
  "/examples/wikipedia-realtime": "WikipediaRealtimeExamplePage.jsx",
  "/examples/world-of-funnels": "WorldOfFunnelsExamplePage.jsx",
  "/examples/earthquakes": "EarthquakesExamplePage.jsx",
  "/examples/europa-languages": "EuropaLanguagesExamplePage.jsx",
  "/examples/equal-places-atlas": "EqualPlacesAtlasExamplePage.jsx",
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
    const sourceFile = EXAMPLE_SOURCE_FILES_BY_PATH[example.path] ?? pilot?.sourceFile
    return Object.freeze({
      id: example.path.slice("/examples/".length),
      ...example,
      sourceFile,
      sourceFiles: pilot?.sourceFiles ?? (sourceFile ? [sourceFile] : undefined),
      isPilot: Boolean(pilot),
      contract: pilot
        ? Object.freeze({
            ...pilot.contract,
            assessment: DECLARED_EXAMPLE_CONTRACT_STATUS,
          })
        : UNASSESSED_EXAMPLE_CONTRACT,
    })
  }).sort(compareExampleDefinitionsNewestFirst),
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
const REQUIRED_DEFINITION_FIELDS = ["id", "path", "title", "eyebrow", "description", "publishedAt"]

const OPTIONAL_DEFINITION_FIELDS = [
  "isPilot",
  "sourceFile",
  "sourceFiles",
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

const RFC3339_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/

export function isValidRfc3339Timestamp(value) {
  if (!isNonEmptyString(value)) return false
  const match = RFC3339_TIMESTAMP_PATTERN.exec(value)
  if (!match) return false

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText)
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText)
  const daysInMonth =
    month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0

  return (
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59 &&
    Number.isFinite(Date.parse(value))
  )
}

export function compareExampleDefinitionsNewestFirst(left, right) {
  const publishedDifference = Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
  if (publishedDifference !== 0) return publishedDifference
  if (left.path < right.path) return -1
  if (left.path > right.path) return 1
  return 0
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
  if (fixture?.inventory !== undefined) {
    const inventory = fixture.inventory
    if (
      !isRecord(inventory) ||
      Object.keys(inventory).length === 0 ||
      !Object.entries(inventory).every(
        ([name, count]) => isNonEmptyString(name) && Number.isInteger(count) && count >= 0,
      )
    ) {
      errors.push(
        `ExampleDefinition contract data.fixture.inventory for "${label}" must use non-negative integer counts`,
      )
    }
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

    const { id, path, sourceFile, sourceFiles } = definition ?? {}
    if (
      isNonEmptyString(definition?.publishedAt) &&
      !isValidRfc3339Timestamp(definition.publishedAt)
    ) {
      errors.push(
        `ExampleDefinition publishedAt for "${id ?? `index ${index}`}" must be a valid RFC3339 timestamp`,
      )
    }
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

    if (sourceFiles !== undefined) {
      if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) {
        errors.push(
          `ExampleDefinition sourceFiles for "${id ?? `index ${index}`}" must be a non-empty array`,
        )
      } else {
        const localFiles = new Set()
        sourceFiles.forEach((file) => {
          const valid =
            isNonEmptyString(file) &&
            /\.(?:js|jsx|mjs|ts|tsx|css)$/.test(file) &&
            !file.startsWith("/") &&
            !file.split("/").includes("..")
          if (!valid) {
            errors.push(
              `ExampleDefinition sourceFiles entry "${file}" for "${id ?? `index ${index}`}" must be a safe relative source path`,
            )
          } else if (localFiles.has(file)) {
            errors.push(`Duplicate sourceFiles entry "${file}" for ExampleDefinition "${id}"`)
          }
          localFiles.add(file)
        })
        if (isNonEmptyString(sourceFile) && !localFiles.has(sourceFile)) {
          errors.push(`ExampleDefinition sourceFiles for "${id}" must include its sourceFile`)
        }
      }
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
