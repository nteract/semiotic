/**
 * @typedef {"representation" | "conditions" | "residents"} EvidenceLane
 * @typedef {"core" | "suburb" | "metropolitan" | "spread-out" | "compact"} PlaceFamily
 * @typedef {"illustrative-seed" | "observed-condition" | "observed-attitude" | "missing" | "mixed-evidence"} EvidenceKind
 * @typedef {"none" | "episode-only" | "within-comparability-group"} ConnectionPolicy
 *
 * @typedef {Object} EvidencePoint
 * @property {string} id
 * @property {number | null} year
 * @property {number} startYear
 * @property {number} endYear
 * @property {EvidenceLane} lane
 * @property {PlaceFamily} place
 * @property {string} measureId
 * @property {number | null} estimate
 * @property {string} unit
 * @property {EvidenceKind} evidenceKind
 * @property {string} comparabilityGroup
 * @property {ConnectionPolicy} connectionPolicy
 * @property {string[]} sourceIds
 * @property {string} limitation
 */

export const PERIODS = Object.freeze([
  { id: "postwar", label: "1945–1964", startYear: 1945, endYear: 1964 },
  { id: "urban-crisis", label: "1965–1993", startYear: 1965, endYear: 1993 },
  { id: "cultural-crossover", label: "1994–2008", startYear: 1994, endYear: 2008 },
  { id: "uneven-recovery", label: "2009–2019", startYear: 2009, endYear: 2019 },
  { id: "analytical-fracture", label: "2020–2026", startYear: 2020, endYear: 2026 },
])

export const SOURCE_REGISTRY = Object.freeze([
  {
    id: "editorial-cultural-stations",
    title: "Illustrative cultural works used in this example",
    organization: "Semiotic documentation example",
    sourceType: "editorial-selection",
    grade: "D",
    supports: ["Illustrative seed-work title, release year, medium, and editorial grouping"],
    limitations: [
      "The seed list is not a statistically representative corpus",
      "The listed works have not yet been scored or reviewed under the proposed coding protocol",
      "A work station demonstrates that a representation existed, not how widespread it was",
    ],
  },
  {
    id: "R1",
    title: "The Urban Crisis",
    organization: "American Archive of Public Broadcasting",
    href: "https://americanarchive.org/primary_source_sets/urban-crisis",
    sourceType: "primary-source-collection",
    grade: "A",
    supports: ["The late-1970s and early-1980s dangerous-city frame"],
    limitations: ["Documents an influential frame, not every resident's experience"],
  },
  {
    id: "R2",
    title: "U.S. Urban Decline and Growth, 1950 to 2000",
    organization: "Federal Reserve Bank of Kansas City",
    href: "https://ideas.repec.org/a/fip/fedker/y2003iqiiip15-44nv.88no.3.html",
    sourceType: "research-synthesis",
    grade: "B",
    supports: ["Severe losses in several large cities and failure of one national template"],
    limitations: ["City trajectories differ substantially by metropolitan region"],
  },
  {
    id: "R3",
    title: "What the data says about crime in the U.S.",
    organization: "Pew Research Center",
    href: "https://www.pewresearch.org/short-reads/2024/04/24/what-the-data-says-about-crime-in-the-us/",
    sourceType: "official-series-synthesis",
    grade: "A",
    supports: ["Long-run FBI and BJS crime decline after the early 1990s"],
    limitations: ["National offense trends do not describe every city or perception of safety"],
  },
  {
    id: "R19",
    title: "How we plan to report on generations moving forward",
    organization: "Pew Research Center",
    href: "https://www.pewresearch.org/short-reads/2023/05/22/how-pew-research-center-will-report-on-generations-moving-forward/",
    sourceType: "method-guidance",
    grade: "A",
    supports: ["Comparing cohorts at similar life stages and avoiding generation essentialism"],
    limitations: ["Method guidance is not direct evidence of a city/suburb attitude"],
  },
  {
    id: "R20",
    title:
      "What drives the gap? Applying the Blinder–Oaxaca decomposition method to examine generational differences in transportation-related attitudes",
    organization: "Transportation",
    href: "https://escholarship.org/content/qt24q688wg/qt24q688wg.pdf",
    sourceType: "peer-reviewed-study",
    grade: "B",
    supports: ["Small California Gen X–Millennial attitude differences and life-stage caveats"],
    limitations: ["California-specific, cross-sectional, and not nationally representative"],
  },
  {
    id: "R21",
    title:
      "Back to the suburbs? Millennial residential locations from the Great Recession to the pandemic",
    organization: "Urban Studies / Harvard Joint Center for Housing Studies",
    href: "https://www.jchs.harvard.edu/research-areas/journal-article/back-suburbs-millennial-residential-locations-great-recession",
    sourceType: "peer-reviewed-study",
    grade: "B",
    supports: ["Millennial residential change from 2011 to 2021"],
    limitations: ["Residential location is observed behavior, not stated affection for suburbia"],
  },
  {
    id: "brookings-who-lives-downtown",
    citationId: "R5",
    title: "Who Lives Downtown",
    organization: "Brookings Institution",
    href: "https://www.brookings.edu/articles/who-lives-downtown/",
    sourceType: "research-synthesis",
    grade: "B",
    supports: ["A documented downtown sample grew 10 percent in the 1990s"],
    limitations: ["The documented sample does not represent every downtown or every central city"],
  },
  {
    id: "brookings-suburban-poverty-2008",
    citationId: "R12",
    title: "The Suburbanization of Poverty: Trends in Metropolitan America, 2000 to 2008",
    organization: "Brookings Institution",
    href: "https://www.brookings.edu/articles/the-suburbanization-of-poverty-trends-in-metropolitan-america-2000-to-2008/",
    sourceType: "research-synthesis",
    grade: "B",
    supports: [
      "The poor population in suburbs of the largest metro areas grew 25 percent from 2000 to 2008",
      "Those suburbs contained 1.5 million more poor residents than their primary cities in 2008",
    ],
    limitations: ["A population count and a poverty rate answer different questions"],
  },
  {
    id: "brookings-post-pandemic-poverty",
    citationId: "R13",
    title: "Post-pandemic poverty is rising in America's suburbs",
    organization: "Brookings Institution",
    href: "https://www.brookings.edu/articles/post-pandemic-poverty-is-rising-in-americas-suburbs/",
    sourceType: "research-synthesis",
    grade: "B",
    supports: ["2022 poverty rates of 9.6 percent in suburbs and 16.2 percent in primary cities"],
    limitations: ["Place definitions and rates must remain attached to the reported episode"],
  },
  {
    id: "brookings-suburban-diversity-2020",
    citationId: "R14",
    title: "Today's suburbs are symbolic of America's rising diversity: A 2020 census portrait",
    organization: "Brookings Institution",
    href: "https://www.brookings.edu/articles/todays-suburbs-are-symbolic-of-americas-rising-diversity-a-2020-census-portrait/",
    sourceType: "research-synthesis",
    grade: "B",
    supports: [
      "People of color were roughly 20 percent of the large-metro suburban population in 1990 and about 45 percent in 2020",
    ],
    limitations: ["The design brief reports both shares as approximate"],
  },
  {
    id: "gallup-country-living-2020",
    citationId: "R9",
    title: "Country Living Enjoys Renewed Appeal in U.S.",
    organization: "Gallup",
    href: "https://news.gallup.com/poll/328268/country-living-enjoys-renewed-appeal.aspx",
    sourceType: "survey-report",
    grade: "A",
    supports: [
      "In 2001, 53 percent of city residents preferred city living and 67 percent of suburban residents preferred suburbia",
    ],
    limitations: [
      "The design brief does not reproduce the exact question wording, sample size, or margin of error",
      "These estimates cannot be connected to differently worded Pew instruments",
    ],
  },
  {
    id: "pew-density-preference-2026",
    citationId: "R11",
    title: "Most in US prefer big houses, even if community is farther away",
    organization: "Pew Research Center",
    href: "https://www.pewresearch.org/short-reads/2026/03/19/majority-of-americans-prefer-spread-out-communities-with-big-houses/",
    sourceType: "survey-report",
    grade: "A",
    supports: [
      "In January 2026, 55 percent preferred larger, farther-apart homes and 44 percent preferred smaller homes near services",
    ],
    limitations: [
      "The reported percentages sum to 99 because published survey estimates are rounded",
      "A density-and-services tradeoff is not the same instrument as current-place attachment",
      "The design brief does not reproduce the exact question wording, sample size, or margin of error",
    ],
  },
  {
    id: "census-county-flows-2006-2010",
    citationId: "ACS 06–10",
    title: "County-to-County Migration Flows: 2006–2010 ACS",
    organization: "U.S. Census Bureau",
    href: "https://www.census.gov/data/tables/2010/demo/geographic-mobility/county-to-county-migration-2006-2010.html",
    sourceType: "official-flow-estimates",
    grade: "A",
    supports: [
      "County-pair estimates based on current residence and residence one year earlier",
      "Gross movement in both directions between New York City's five counties and a fixed suburban ring",
    ],
    limitations: [
      "ACS five-year estimates pool one-year residence responses; they are period estimates, not a count of every move made during five years",
      "Displayed regional routes sum county-pair estimates; component margins of error remain in the source file and are not recombined here",
      "Residence change does not measure motive, attachment, fear, or cultural exposure",
    ],
  },
  {
    id: "census-county-flows-2016-2020",
    citationId: "ACS 16–20",
    title: "County-to-County Migration Flows: 2016–2020 ACS",
    organization: "U.S. Census Bureau",
    href: "https://www.census.gov/data/tables/2020/demo/geographic-mobility/county-to-county-migration-2016-2020.html",
    sourceType: "official-flow-estimates",
    grade: "A",
    supports: [
      "County-pair estimates based on current residence and residence one year earlier",
      "A method-matched later comparison for the same New York City core and suburban ring",
    ],
    limitations: [
      "The 2016–2020 period includes the first pandemic year and should not be read as a post-pandemic result",
      "Displayed regional routes sum county-pair estimates; component margins of error remain in the source workbook and are not recombined here",
      "A later inbound counterflow is not evidence of a metropolitan migration reversal",
    ],
  },
])

/**
 * County-flow geography used by the paired FlowMaps. New York City is the
 * five-county core (Bronx, Kings, New York, Queens, and Richmond). The ring is
 * held constant across periods. Coordinates are display anchors only; route
 * width is the sole quantitative geographic encoding.
 */
export const NYC_MIGRATION_NODES = Object.freeze([
  {
    id: "nyc-core",
    name: "New York City · five-county core",
    shortLabel: "NYC CORE",
    lon: -74.006,
    lat: 40.7128,
    placeType: "core",
    countyFips: ["36005", "36047", "36061", "36081", "36085"],
    annotation: { dx: -12, dy: 36 },
  },
  {
    id: "nassau",
    name: "Nassau County · Long Island",
    shortLabel: "NASSAU",
    lon: -73.6407,
    lat: 40.7493,
    placeType: "suburb",
    countyFips: ["36059"],
    annotation: { dx: 18, dy: -24 },
  },
  {
    id: "suffolk",
    name: "Suffolk County · Long Island",
    shortLabel: "SUFFOLK",
    lon: -72.662,
    lat: 40.917,
    placeType: "suburb",
    countyFips: ["36103"],
    annotation: { dx: -18, dy: -25 },
  },
  {
    id: "westchester",
    name: "Westchester County · Lower Hudson",
    shortLabel: "WESTCHESTER",
    lon: -73.7629,
    lat: 41.034,
    placeType: "suburb",
    countyFips: ["36119"],
    annotation: { dx: 35, dy: -28 },
  },
  {
    id: "rockland",
    name: "Rockland County · Lower Hudson",
    shortLabel: "ROCKLAND",
    lon: -73.9893,
    lat: 41.1476,
    placeType: "suburb",
    countyFips: ["36087"],
    annotation: { dx: -36, dy: 24 },
  },
  {
    id: "north-jersey",
    name: "North Jersey ring · six counties",
    shortLabel: "NORTH JERSEY",
    lon: -74.1724,
    lat: 40.7357,
    placeType: "suburb",
    countyFips: ["34003", "34013", "34017", "34023", "34031", "34039"],
    annotation: { dx: -24, dy: -28 },
  },
])

/**
 * Each record sums every five-county-core × destination-county pair in the
 * cited Census files. `outbound` means NYC core → ring; `inbound` means ring →
 * NYC core. The 2006–2010 text file's flow estimate is the final estimate
 * field for current Geography A / previous Geography B. The 2016–2020
 * ins-outs-nets-gross workbook supplies the matched flow and counterflow
 * estimates. Within-state reciprocal workbook rows are counted once by
 * canonical county pair.
 */
export const NYC_MIGRATION_ROUTE_RECORDS = Object.freeze([
  {
    id: "nassau",
    label: "Nassau County",
    nodeId: "nassau",
    countyFips: ["36059"],
    periods: {
      "2006-2010": { outbound: 16417, inbound: 11239 },
      "2016-2020": { outbound: 24804, inbound: 11475 },
    },
  },
  {
    id: "suffolk",
    label: "Suffolk County",
    nodeId: "suffolk",
    countyFips: ["36103"],
    periods: {
      "2006-2010": { outbound: 8912, inbound: 5990 },
      "2016-2020": { outbound: 12953, inbound: 6101 },
    },
  },
  {
    id: "westchester",
    label: "Westchester County",
    nodeId: "westchester",
    countyFips: ["36119"],
    periods: {
      "2006-2010": { outbound: 13785, inbound: 6578 },
      "2016-2020": { outbound: 17975, inbound: 7922 },
    },
  },
  {
    id: "rockland",
    label: "Rockland County",
    nodeId: "rockland",
    countyFips: ["36087"],
    periods: {
      "2006-2010": { outbound: 2768, inbound: 1803 },
      "2016-2020": { outbound: 3693, inbound: 1548 },
    },
  },
  {
    id: "north-jersey",
    label: "North Jersey ring",
    nodeId: "north-jersey",
    countyFips: ["34003", "34013", "34017", "34023", "34031", "34039"],
    periods: {
      "2006-2010": { outbound: 25101, inbound: 16257 },
      "2016-2020": { outbound: 33834, inbound: 13026 },
    },
  },
])

const migrationFlowsFor = (period, direction, sourceId) =>
  NYC_MIGRATION_ROUTE_RECORDS.map((route) => {
    const isOutbound = direction === "outbound"
    const balance = route.periods[period]
    return Object.freeze({
      id: `${period}-${direction}-${route.id}`,
      routeId: route.id,
      routeLabel: route.label,
      source: isOutbound ? "nyc-core" : route.nodeId,
      target: isOutbound ? route.nodeId : "nyc-core",
      sourceName: isOutbound ? "New York City core" : route.label,
      targetName: isOutbound ? route.label : "New York City core",
      value: balance[direction],
      counterflow: balance[isOutbound ? "inbound" : "outbound"],
      netTowardCore: balance.inbound - balance.outbound,
      direction,
      period,
      unit: "ACS one-year residence-change estimate",
      sourceIds: [sourceId],
    })
  })

export const NYC_MIGRATION_SNAPSHOTS = Object.freeze([
  Object.freeze({
    id: "outbound-2006-2010",
    period: "2006-2010",
    periodLabel: "2006–2010 ACS",
    direction: "outbound",
    title: "Out from the core",
    routeLabel: "NYC core → suburban ring",
    sourceId: "census-county-flows-2006-2010",
    flows: Object.freeze(
      migrationFlowsFor("2006-2010", "outbound", "census-county-flows-2006-2010"),
    ),
  }),
  Object.freeze({
    id: "inbound-2016-2020",
    period: "2016-2020",
    periodLabel: "2016–2020 ACS",
    direction: "inbound",
    title: "Into the core",
    routeLabel: "Suburban ring → NYC core",
    sourceId: "census-county-flows-2016-2020",
    flows: Object.freeze(
      migrationFlowsFor("2016-2020", "inbound", "census-county-flows-2016-2020"),
    ),
  }),
])

export const NYC_MIGRATION_MAX_FLOW = Math.max(
  ...NYC_MIGRATION_SNAPSHOTS.flatMap((snapshot) => snapshot.flows.map((flow) => flow.value)),
)

export function migrationTotals(period) {
  return NYC_MIGRATION_ROUTE_RECORDS.reduce(
    (totals, route) => {
      const values = route.periods[period]
      if (!values) return totals
      totals.outbound += values.outbound
      totals.inbound += values.inbound
      totals.netTowardCore += values.inbound - values.outbound
      return totals
    },
    { outbound: 0, inbound: 0, netTowardCore: 0 },
  )
}

/**
 * Illustrative editorial stations. Their role is a narrative grouping, not a
 * scored annotation. Start year is used for a series.
 */
export const CULTURAL_WORKS = Object.freeze([
  {
    id: "father-knows-best",
    title: "Father Knows Best",
    year: 1954,
    endYear: 1960,
    medium: "television",
    placeFamily: "suburb",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "man-gray-flannel-suit",
    title: "The Man in the Gray Flannel Suit",
    year: 1956,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "leave-it-to-beaver",
    title: "Leave It to Beaver",
    year: 1957,
    endYear: 1963,
    medium: "television",
    placeFamily: "suburb",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "naked-city",
    title: "Naked City",
    year: 1958,
    endYear: 1963,
    medium: "television",
    placeFamily: "core",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "breakfast-at-tiffanys",
    title: "Breakfast at Tiffany's",
    year: 1961,
    medium: "film",
    placeFamily: "core",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "graduate",
    title: "The Graduate",
    year: 1967,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "brady-bunch",
    title: "The Brady Bunch",
    year: 1969,
    endYear: 1974,
    medium: "television",
    placeFamily: "suburb",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "mary-tyler-moore-show",
    title: "The Mary Tyler Moore Show",
    year: 1970,
    endYear: 1977,
    medium: "television",
    placeFamily: "core",
    role: "positive-or-ordinary",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "death-wish",
    title: "Death Wish",
    year: 1974,
    medium: "film",
    placeFamily: "core",
    role: "urban-crisis",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "stepford-wives",
    title: "The Stepford Wives",
    year: 1975,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "taxi-driver",
    title: "Taxi Driver",
    year: 1976,
    medium: "film",
    placeFamily: "core",
    role: "urban-crisis",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "halloween",
    title: "Halloween",
    year: 1978,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "warriors",
    title: "The Warriors",
    year: 1979,
    medium: "film",
    placeFamily: "core",
    role: "urban-crisis",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "escape-from-new-york",
    title: "Escape from New York",
    year: 1981,
    medium: "film",
    placeFamily: "core",
    role: "urban-crisis",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "poltergeist",
    title: "Poltergeist",
    year: 1982,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "blue-velvet",
    title: "Blue Velvet",
    year: 1986,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "the-burbs",
    title: "The 'Burbs",
    year: 1989,
    medium: "film",
    placeFamily: "suburb",
    role: "early-critique",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "new-jack-city",
    title: "New Jack City",
    year: 1991,
    medium: "film",
    placeFamily: "core",
    role: "urban-crisis",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "safe",
    title: "Safe",
    year: 1995,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "ice-storm",
    title: "The Ice Storm",
    year: 1997,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "truman-show",
    title: "The Truman Show",
    year: 1998,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "pleasantville",
    title: "Pleasantville",
    year: 1998,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "american-beauty",
    title: "American Beauty",
    year: 1999,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "virgin-suicides",
    title: "The Virgin Suicides",
    year: 1999,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "donnie-darko",
    title: "Donnie Darko",
    year: 2001,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "desperate-housewives",
    title: "Desperate Housewives",
    year: 2004,
    endYear: 2012,
    medium: "television",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "little-children",
    title: "Little Children",
    year: 2006,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
  {
    id: "revolutionary-road",
    title: "Revolutionary Road",
    year: 2008,
    medium: "film",
    placeFamily: "suburb",
    role: "late-1990s-cluster",
    sourceIds: ["editorial-cultural-stations"],
  },
])

/** @type {ReadonlyArray<EvidencePoint & { workId: string, role: string }>} */
export const REPRESENTATION_POINTS = Object.freeze(
  CULTURAL_WORKS.map((work) => ({
    id: `representation-${work.id}`,
    year: work.year,
    startYear: work.year,
    endYear: work.year,
    lane: "representation",
    place: work.placeFamily,
    measureId: "illustrative-cultural-station",
    estimate: null,
    unit: "unscored station",
    evidenceKind: "illustrative-seed",
    comparabilityGroup: "illustrative-seed-no-prevalence-inference",
    connectionPolicy: "none",
    sourceIds: work.sourceIds,
    limitation:
      "This station is unscored, is not public opinion, and cannot establish a crossover or prevalence.",
    workId: work.id,
    role: work.role,
  })),
)

export const REPRESENTATION_WINDOWS = Object.freeze(
  PERIODS.map((period) => {
    const stations = REPRESENTATION_POINTS.filter(
      (point) => point.year >= period.startYear && point.year <= period.endYear,
    )
    const placeCounts = stations.reduce(
      (counts, station) => ({ ...counts, [station.place]: counts[station.place] + 1 }),
      { core: 0, suburb: 0, metropolitan: 0 },
    )

    return {
      ...period,
      lane: "representation",
      estimate: null,
      evidenceKind: stations.length > 0 ? "illustrative-seed" : "missing",
      stationCount: stations.length,
      workIds: stations.map((station) => station.workId),
      placeCounts,
      aggregation: "coverage count only; no score, weighting, smoothing, or interpolation",
      limitation:
        "Station counts describe this authored seed list and must not be interpreted as cultural prevalence.",
    }
  }),
)

/** @type {ReadonlyArray<EvidencePoint & Record<string, unknown>>} */
export const CONDITION_EPISODES = Object.freeze([
  {
    id: "downtown-sample-growth-1990s",
    year: null,
    startYear: 1990,
    endYear: 1999,
    lane: "conditions",
    place: "core",
    measureId: "downtown-population-change",
    estimate: 10,
    unit: "percent change",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-downtown-sample-1990s",
    connectionPolicy: "episode-only",
    sourceIds: ["brookings-who-lives-downtown"],
    geographyDefinition: "documented downtown sample",
    isApproximate: false,
    limitation: "The sample does not represent every downtown or central city.",
  },
  {
    id: "suburban-poor-population-growth-2000-2008",
    year: null,
    startYear: 2000,
    endYear: 2008,
    lane: "conditions",
    place: "suburb",
    measureId: "poor-population-change",
    estimate: 25,
    unit: "percent change",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-large-metro-poverty-2000-2008",
    connectionPolicy: "episode-only",
    sourceIds: ["brookings-suburban-poverty-2008"],
    geographyDefinition: "suburbs of the largest metropolitan areas",
    isApproximate: false,
    limitation: "A growth rate does not report either the poverty rate or the population level.",
  },
  {
    id: "suburban-poor-count-lead-2008",
    year: 2008,
    startYear: 2008,
    endYear: 2008,
    lane: "conditions",
    place: "suburb",
    measureId: "poor-population-count-difference-from-primary-city",
    estimate: 1.5,
    unit: "million more people",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-large-metro-poverty-count-2008",
    connectionPolicy: "episode-only",
    sourceIds: ["brookings-suburban-poverty-2008"],
    geographyDefinition: "suburbs versus primary cities in the largest metropolitan areas",
    isApproximate: false,
    limitation: "A larger count does not mean a higher poverty rate.",
  },
  {
    id: "suburban-poverty-rate-2022",
    year: 2022,
    startYear: 2022,
    endYear: 2022,
    lane: "conditions",
    place: "suburb",
    measureId: "poverty-rate",
    estimate: 9.6,
    unit: "percent",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-place-poverty-rate-2022",
    connectionPolicy: "episode-only",
    sourceIds: ["brookings-post-pandemic-poverty"],
    geographyDefinition: "Brookings suburban classification",
    isApproximate: false,
    limitation: "This rate should be compared only within its reported place definition and year.",
  },
  {
    id: "primary-city-poverty-rate-2022",
    year: 2022,
    startYear: 2022,
    endYear: 2022,
    lane: "conditions",
    place: "core",
    measureId: "poverty-rate",
    estimate: 16.2,
    unit: "percent",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-place-poverty-rate-2022",
    connectionPolicy: "episode-only",
    sourceIds: ["brookings-post-pandemic-poverty"],
    geographyDefinition: "Brookings primary-city classification",
    isApproximate: false,
    limitation: "This rate should be compared only within its reported place definition and year.",
  },
  {
    id: "suburban-people-of-color-share-1990",
    year: 1990,
    startYear: 1990,
    endYear: 1990,
    lane: "conditions",
    place: "suburb",
    measureId: "people-of-color-population-share",
    estimate: 20,
    unit: "percent",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-large-metro-suburban-diversity",
    connectionPolicy: "within-comparability-group",
    sourceIds: ["brookings-suburban-diversity-2020"],
    geographyDefinition: "suburbs of large metropolitan areas",
    isApproximate: true,
    limitation: "The design brief reports this value as roughly 20 percent.",
  },
  {
    id: "suburban-people-of-color-share-2020",
    year: 2020,
    startYear: 2020,
    endYear: 2020,
    lane: "conditions",
    place: "suburb",
    measureId: "people-of-color-population-share",
    estimate: 45,
    unit: "percent",
    evidenceKind: "observed-condition",
    comparabilityGroup: "brookings-large-metro-suburban-diversity",
    connectionPolicy: "within-comparability-group",
    sourceIds: ["brookings-suburban-diversity-2020"],
    geographyDefinition: "suburbs of large metropolitan areas",
    isApproximate: true,
    limitation: "The design brief reports this value as about 45 percent.",
  },
])

/** @type {ReadonlyArray<EvidencePoint & Record<string, unknown>>} */
export const RESIDENT_EPISODES = Object.freeze([
  {
    id: "gallup-2001-city-residents-prefer-city",
    year: 2001,
    startYear: 2001,
    endYear: 2001,
    lane: "residents",
    place: "core",
    measureId: "current-place-residents-preferring-same-place",
    estimate: 53,
    unit: "percent",
    evidenceKind: "observed-attitude",
    comparabilityGroup: "gallup-current-place-preference-2001",
    connectionPolicy: "episode-only",
    sourceIds: ["gallup-country-living-2020"],
    instrumentId: "gallup-current-place-preference-2001",
    currentPlace: "city",
    preferredPlace: "city",
    questionWording: null,
    limitation:
      "The design brief supplies the estimate but not exact wording, sample size, or margin of error.",
  },
  {
    id: "gallup-2001-suburban-residents-prefer-suburb",
    year: 2001,
    startYear: 2001,
    endYear: 2001,
    lane: "residents",
    place: "suburb",
    measureId: "current-place-residents-preferring-same-place",
    estimate: 67,
    unit: "percent",
    evidenceKind: "observed-attitude",
    comparabilityGroup: "gallup-current-place-preference-2001",
    connectionPolicy: "episode-only",
    sourceIds: ["gallup-country-living-2020"],
    instrumentId: "gallup-current-place-preference-2001",
    currentPlace: "suburb",
    preferredPlace: "suburb",
    questionWording: null,
    limitation:
      "The design brief supplies the estimate but not exact wording, sample size, or margin of error.",
  },
  {
    id: "pew-2026-prefers-spread-out",
    year: 2026,
    startYear: 2026,
    endYear: 2026,
    lane: "residents",
    place: "spread-out",
    measureId: "density-and-services-tradeoff",
    estimate: 55,
    unit: "percent",
    evidenceKind: "observed-attitude",
    comparabilityGroup: "pew-density-tradeoff-2026",
    connectionPolicy: "episode-only",
    sourceIds: ["pew-density-preference-2026"],
    instrumentId: "pew-density-tradeoff-2026",
    currentPlace: null,
    preferredPlace: "larger, farther-apart houses with services several miles away",
    questionWording: null,
    limitation:
      "This tradeoff is not a city/suburb attachment question; published estimates are rounded.",
  },
  {
    id: "pew-2026-prefers-compact",
    year: 2026,
    startYear: 2026,
    endYear: 2026,
    lane: "residents",
    place: "compact",
    measureId: "density-and-services-tradeoff",
    estimate: 44,
    unit: "percent",
    evidenceKind: "observed-attitude",
    comparabilityGroup: "pew-density-tradeoff-2026",
    connectionPolicy: "episode-only",
    sourceIds: ["pew-density-preference-2026"],
    instrumentId: "pew-density-tradeoff-2026",
    currentPlace: null,
    preferredPlace: "smaller, closer homes near services",
    questionWording: null,
    limitation:
      "This tradeoff is not a city/suburb attachment question; published estimates are rounded.",
  },
])

export const LENS_META = Object.freeze({
  representation: {
    id: "representation",
    label: "Culture",
    headline: "The seed works stage an outward move; they do not measure one.",
    evidenceKind: "illustrative-seed",
    carries: "Where the design brief places selected cultural stations in time and place.",
    drops: "Prevalence, audience reception, public opinion, and a calculated crossover.",
  },
  conditions: {
    id: "conditions",
    label: "Conditions",
    headline: "Counts, rates, and composition change on different schedules.",
    evidenceKind: "observed-condition",
    carries: "A few exact, source-backed episodes stated in the design brief.",
    drops: "A continuous national series or a composite measure of place quality.",
  },
  residents: {
    id: "residents",
    label: "Residents",
    headline: "There is no mass suburban rejection in these survey episodes.",
    evidenceKind: "observed-attitude",
    carries: "Stated preference under each named survey instrument.",
    drops: "Feasible housing choice and continuity across differently worded questions.",
  },
  all: {
    id: "all",
    label: "All three",
    headline: "One timeline, three non-equivalent kinds of evidence.",
    evidenceKind: "mixed-evidence",
    carries: "The timing and disagreement among representation, conditions, and residents.",
    drops: "Any claim that the lanes share a unit or combine into one hellhole score.",
  },
})

export const COMPARISON_CUTS = Object.freeze([
  {
    id: "same-year",
    label: "Same year",
    geometry: "vertical",
    holdsConstant: "calendar year",
    canEstablish: "A shared period environment for people at different ages.",
    cannotEstablish: "A causal age or cohort effect.",
  },
  {
    id: "same-age",
    label: "Same age",
    geometry: "horizontal",
    holdsConstant: "age",
    canEstablish: "How evidence coverage differs at one life stage across calendar years.",
    cannotEstablish: "That the evidence environment produced a durable belief.",
  },
  {
    id: "same-cohort",
    label: "Same cohort",
    geometry: "diagonal",
    holdsConstant: "birth year",
    canEstablish: "Which checked-in evidence dates intersect one birth year's age path.",
    cannotEstablish: "A uniquely identified causal generation effect.",
  },
])

export const AGE_WINDOWS = Object.freeze([
  {
    id: "danger",
    label: "First map of danger",
    startAge: 8,
    endAge: 17,
    weighting: "flat",
  },
  {
    id: "desire",
    label: "First map of desire",
    startAge: 18,
    endAge: 29,
    weighting: "flat",
  },
  {
    id: "custom",
    label: "Custom",
    startAge: null,
    endAge: null,
    weighting: "flat",
  },
])

const ALL_POINTS = Object.freeze([
  ...REPRESENTATION_POINTS,
  ...CONDITION_EPISODES,
  ...RESIDENT_EPISODES,
])

function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`)
  }
}

function evidenceKindFor(points) {
  if (points.length === 0) return "missing"
  const kinds = new Set(points.map((point) => point.evidenceKind))
  return kinds.size === 1 ? [...kinds][0] : "mixed-evidence"
}

function resolveAgeWindow(window) {
  const resolved =
    typeof window === "string" ? AGE_WINDOWS.find((candidate) => candidate.id === window) : window

  if (!resolved) throw new RangeError(`Unknown age window: ${String(window)}`)
  if (!Number.isInteger(resolved.startAge) || !Number.isInteger(resolved.endAge)) {
    throw new TypeError("A custom age window requires integer startAge and endAge")
  }
  if (resolved.startAge < 0 || resolved.endAge < resolved.startAge) {
    throw new RangeError("Age windows require 0 <= startAge <= endAge")
  }

  return resolved
}

/**
 * Creates a point on the Lexis identity surface.
 * @param {number} birthYear
 * @param {number} age
 */
export function agePeriodCohortPoint(birthYear, age) {
  assertInteger(birthYear, "birthYear")
  assertInteger(age, "age")
  if (age < 0) throw new RangeError("age must be nonnegative")

  return Object.freeze({ birthYear, age, calendarYear: birthYear + age })
}

/**
 * Returns only evidence recorded for the exact calendar year. Multi-year
 * condition episodes report coverage across their stated interval, but no
 * values are interpolated and no survey instrument is carried between years.
 * @param {number} birthYear
 * @param {number} age
 * @param {EvidenceLane | "all"} [lens="representation"]
 */
export function cohortEvidenceAtAge(birthYear, age, lens = "representation") {
  if (!Object.hasOwn(LENS_META, lens)) throw new RangeError(`Unknown lens: ${lens}`)

  const identity = agePeriodCohortPoint(birthYear, age)
  const points = ALL_POINTS.filter(
    (point) =>
      (lens === "all" || point.lane === lens) &&
      identity.calendarYear >= point.startYear &&
      identity.calendarYear <= point.endYear,
  )
  const stations = points.filter((point) => point.lane === "representation")
  const episodes = points.filter((point) => point.lane !== "representation")
  const sourceIds = [...new Set(points.flatMap((point) => point.sourceIds))]

  return Object.freeze({
    ...identity,
    lens,
    evidenceKind: evidenceKindFor(points),
    coverage: points.length > 0 ? "available" : "missing",
    representationContrast: null,
    stations,
    episodes,
    sourceIds,
    limitation:
      "Coverage identifies dated stations or episodes in this evidence spine. It does not measure exposure, attention, belief, or preference outside a named survey.",
  })
}

/**
 * Summarizes exact-year coverage across an inclusive, flat-weight age window.
 * @param {number} birthYear
 * @param {string | { id?: string, label?: string, startAge: number, endAge: number }} window
 * @param {EvidenceLane | "all"} [lens="representation"]
 */
export function summarizeAgeWindow(birthYear, window, lens = "representation") {
  assertInteger(birthYear, "birthYear")
  const resolved = resolveAgeWindow(window)
  const records = Array.from({ length: resolved.endAge - resolved.startAge + 1 }, (_, offset) =>
    cohortEvidenceAtAge(birthYear, resolved.startAge + offset, lens),
  )
  const coveredRecords = records.filter((record) => record.coverage === "available")
  const stations = [
    ...new Map(
      records.flatMap((record) => record.stations).map((point) => [point.id, point]),
    ).values(),
  ]
  const episodes = [
    ...new Map(
      records.flatMap((record) => record.episodes).map((point) => [point.id, point]),
    ).values(),
  ]

  return Object.freeze({
    birthYear,
    lens,
    windowId: resolved.id ?? "custom",
    label: resolved.label ?? "Custom",
    startAge: resolved.startAge,
    endAge: resolved.endAge,
    startYear: birthYear + resolved.startAge,
    endYear: birthYear + resolved.endAge,
    weighting: "flat",
    ageCount: records.length,
    coveredAgeCount: coveredRecords.length,
    coverageRatio: coveredRecords.length / records.length,
    coveredYears: coveredRecords.map((record) => record.calendarYear),
    missingYears: records
      .filter((record) => record.coverage === "missing")
      .map((record) => record.calendarYear),
    evidenceKind: evidenceKindFor([...stations, ...episodes]),
    representationContrast: null,
    stationCount: stations.length,
    episodeCount: episodes.length,
    stations,
    episodes,
    records,
    limitation:
      "This is a flat-weight coverage summary, not a causal formative-exposure estimate or a belief score.",
  })
}

/**
 * Continuous line segments are legal only for points that explicitly opt into
 * them and share a comparability group. Survey episodes never opt in.
 * @param {EvidencePoint} first
 * @param {EvidencePoint} second
 */
export function canConnectEvidencePoints(first, second) {
  return (
    first.connectionPolicy === "within-comparability-group" &&
    second.connectionPolicy === "within-comparability-group" &&
    first.comparabilityGroup === second.comparabilityGroup &&
    first.measureId === second.measureId
  )
}

export function headlineForLens(lens) {
  const metadata = LENS_META[lens]
  if (!metadata) throw new RangeError(`Unknown lens: ${lens}`)
  return metadata.headline
}
