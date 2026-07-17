/**
 * Yellowstone trophic cascade fixtures — illustrative ecological indices, not animal counts.
 * Teaching contract: there is no direct wolf → river edge.
 */

export const SCENARIOS = [
  {
    id: "absent",
    year: "pre-1995",
    short: "Before",
    title: "Wolves absent",
    claim: "Elk browsing is high. The river has not been “unwritten” — it is already a product of history.",
    values: {
      wolves: 0,
      elk: 100,
      coyotes: 84,
      scavengers: 34,
      woody: 25,
      beavers: 18,
      wetlands: 30,
      biodiversity: 38,
      harvest: 55,
      climate: 42,
      bison: 28,
    },
  },
  {
    id: "return",
    year: "1995–96",
    short: "Return",
    title: "Wolves restored",
    claim: "Direct edges light first: elk, coyotes, carrion. Nothing jumps from wolves to the river.",
    values: {
      wolves: 24,
      elk: 82,
      coyotes: 63,
      scavengers: 48,
      woody: 28,
      beavers: 20,
      wetlands: 31,
      biodiversity: 40,
      harvest: 52,
      climate: 45,
      bison: 30,
    },
  },
  {
    id: "early",
    year: "~2005",
    short: "Early lag",
    title: "Fast trophic, slow vegetation",
    claim: "Canids and scavengers move first. Willow, beaver, and wetlands still carry multi-year lags.",
    values: {
      wolves: 44,
      elk: 63,
      coyotes: 45,
      scavengers: 66,
      woody: 44,
      beavers: 31,
      wetlands: 39,
      biodiversity: 54,
      harvest: 47,
      climate: 54,
      bison: 36,
    },
  },
  {
    id: "later",
    year: "~2020s",
    short: "Later",
    title: "Changed, not reset",
    claim: "Some riparian sites recover; others do not. Full mode shows harvest, climate, and bison as co-authors.",
    values: {
      wolves: 58,
      elk: 52,
      coyotes: 36,
      scavengers: 72,
      woody: 68,
      beavers: 56,
      wetlands: 70,
      biodiversity: 74,
      harvest: 43,
      climate: 68,
      bison: 48,
    },
  },
]

/** Core cascade plates — habitat-anchored layout in normalized plot space. */
export const CORE_NODES = [
  {
    id: "wolves",
    label: "Wolves",
    role: "Apex predator",
    habitat: "Upland",
    x: 0.14,
    y: 0.18,
    color: "#9d4f3d",
    evidence: "NPS wolf restoration monitoring",
    caveat: "Pack size, disease, and management still move the index.",
  },
  {
    id: "elk",
    label: "Elk pressure",
    role: "Primary browser",
    habitat: "Valley",
    x: 0.38,
    y: 0.28,
    color: "#b77b37",
    evidence: "Ungulate counts + browsing studies",
    caveat: "Not only wolves — harvest and climate also act.",
  },
  {
    id: "coyotes",
    label: "Coyotes",
    role: "Mesopredator",
    habitat: "Upland",
    x: 0.14,
    y: 0.52,
    color: "#a98b58",
    evidence: "Canid interaction studies",
    caveat: "Responses vary by pack and season.",
  },
  {
    id: "scavengers",
    label: "Scavengers",
    role: "Carrion guild",
    habitat: "Valley",
    x: 0.38,
    y: 0.55,
    color: "#5f6759",
    evidence: "Kill-site and scavenger observations",
    caveat: "Benefits are seasonal and species-specific.",
  },
  {
    id: "woody",
    label: "Willow & aspen",
    role: "Woody recovery",
    habitat: "Riparian",
    x: 0.62,
    y: 0.28,
    color: "#668447",
    evidence: "Exclosures and riparian monitoring",
    caveat: "Recovery is patchy; hydrology can dominate.",
  },
  {
    id: "beavers",
    label: "Beavers",
    role: "Ecosystem engineer",
    habitat: "Riparian",
    x: 0.62,
    y: 0.56,
    color: "#6c5139",
    evidence: "Colony surveys",
    caveat: "Need both food and suitable hydrology.",
  },
  {
    id: "wetlands",
    label: "Wetland structure",
    role: "Water storage & form",
    habitat: "Water",
    x: 0.84,
    y: 0.42,
    color: "#3f7f87",
    evidence: "Channel and wetland field studies",
    caveat: "Long lags and historical incision matter.",
  },
  {
    id: "biodiversity",
    label: "Biodiversity",
    role: "Multi-taxa outcome",
    habitat: "Mosaic",
    x: 0.84,
    y: 0.72,
    color: "#b8942f",
    evidence: "Riparian multi-taxa synthesis",
    caveat: "A summary index hides winners and losers.",
  },
]

/** External co-authors revealed in full-ecosystem mode. */
export const PRESSURE_NODES = [
  {
    id: "harvest",
    label: "Human harvest",
    role: "External pressure",
    habitat: "Outside",
    x: 0.3,
    y: 0.82,
    color: "#6f5947",
    evidence: "Management records",
    caveat: "Regulation changes over decades.",
    external: true,
  },
  {
    id: "climate",
    label: "Climate pressure",
    role: "External pressure",
    habitat: "Outside",
    x: 0.55,
    y: 0.86,
    color: "#c16d3d",
    evidence: "Snowpack & drought observations",
    caveat: "Acts through many pathways.",
    external: true,
  },
  {
    id: "bison",
    label: "Bison pressure",
    role: "Other ungulate",
    habitat: "Outside",
    x: 0.78,
    y: 0.88,
    color: "#504538",
    evidence: "Distribution & browsing observations",
    caveat: "Local overlap with elk varies seasonally.",
    external: true,
  },
]

/**
 * Signed relationships. Intentionally no wolves → wetlands edge.
 * That absence is the teaching device.
 */
export const LINKS = [
  { id: "wolf-elk", source: "wolves", target: "elk", relation: "suppresses", sign: -1, confidence: "high", lag: "direct", from: 1 },
  { id: "wolf-coyote", source: "wolves", target: "coyotes", relation: "suppresses", sign: -1, confidence: "high", lag: "direct", from: 1 },
  { id: "wolf-scavenger", source: "wolves", target: "scavengers", relation: "provisions", sign: 1, confidence: "high", lag: "seasonal", from: 1 },
  { id: "elk-woody", source: "elk", target: "woody", relation: "browses", sign: -1, confidence: "high", lag: "seasonal", from: 0 },
  { id: "woody-beaver", source: "woody", target: "beavers", relation: "supports", sign: 1, confidence: "medium", lag: "years", from: 2 },
  { id: "beaver-wetland", source: "beavers", target: "wetlands", relation: "engineers", sign: 1, confidence: "high", lag: "years", from: 2 },
  { id: "woody-bio", source: "woody", target: "biodiversity", relation: "habitats", sign: 1, confidence: "medium", lag: "years", from: 2 },
  { id: "wetland-bio", source: "wetlands", target: "biodiversity", relation: "habitats", sign: 1, confidence: "medium", lag: "years", from: 2 },
  { id: "harvest-elk", source: "harvest", target: "elk", relation: "removes", sign: -1, confidence: "high", lag: "annual", from: 0, external: true },
  { id: "climate-woody", source: "climate", target: "woody", relation: "limits", sign: -1, confidence: "medium", lag: "variable", from: 0, external: true },
  { id: "climate-wetland", source: "climate", target: "wetlands", relation: "limits", sign: -1, confidence: "medium", lag: "variable", from: 0, external: true },
  { id: "bison-woody", source: "bison", target: "woody", relation: "browses", sign: -1, confidence: "medium", lag: "seasonal", from: 0, external: true },
]

export function nodesForMode(mode) {
  return mode === "full" ? [...CORE_NODES, ...PRESSURE_NODES] : CORE_NODES
}

export function linksForChapter(chapterIndex, mode) {
  return LINKS.filter((link) => {
    if (link.from > chapterIndex) return false
    if (link.external && mode !== "full") return false
    return true
  })
}

export function decorateNodes(nodes, scenario, previousScenario) {
  return nodes.map((node) => {
    const value = scenario.values[node.id] ?? 0
    const previous = previousScenario?.values[node.id] ?? value
    return {
      ...node,
      value,
      previous,
      delta: value - previous,
      unit: "index",
    }
  })
}

export function cascadePath() {
  return ["wolves", "elk", "woody", "beavers", "wetlands", "biodiversity"]
}
