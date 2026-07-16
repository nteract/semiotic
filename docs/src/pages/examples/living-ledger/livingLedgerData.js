/**
 * The Living Ledger's bundled replay.
 *
 * The values in this file are authored illustrations. Public sources supply
 * methods, vocabulary and provenance, but these are not downloaded records.
 * Keeping that line bright is part of the example.
 */

export const DAY_MS = 24 * 60 * 60 * 1000

export const ILLUSTRATIVE_DATA_NOTICE =
  "Authored illustrative replay. Public sources anchor the methods; these values are not live observations."

export const REPLAY_WINDOW = Object.freeze({
  start: "2026-01-14",
  end: "2026-07-12",
  days: 180,
  generatedAt: "2026-07-12T00:00:00.000Z",
})

function parseDate(date) {
  return Date.parse(`${date}T00:00:00.000Z`)
}

function addDays(date, days) {
  return new Date(parseDate(date) + days * DAY_MS).toISOString().slice(0, 10)
}

function isoAtDay(dayIndex, hour = 0) {
  return `${addDays(REPLAY_WINDOW.start, dayIndex)}T${String(hour).padStart(2, "0")}:00:00.000Z`
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function assertDayIndex(dayIndex) {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= REPLAY_WINDOW.days) {
    throw new RangeError(`dayIndex must be an integer from 0 through ${REPLAY_WINDOW.days - 1}`)
  }
}

export const REPLAY_DATES = Object.freeze(
  Array.from({ length: REPLAY_WINDOW.days }, (_, dayIndex) =>
    addDays(REPLAY_WINDOW.start, dayIndex),
  ),
)

export function dayIndexForDate(date) {
  const dayIndex = Math.round((parseDate(date) - parseDate(REPLAY_WINDOW.start)) / DAY_MS)
  assertDayIndex(dayIndex)
  return dayIndex
}

/**
 * @typedef {"driver" | "pressure" | "ecosystem-extent" | "ecosystem-condition" | "ecological-capacity" | "service-flow" | "demand" | "use" | "benefit" | "value"} EvidenceRole
 */

/** @typedef {"low" | "medium" | "high"} Confidence */
/** @typedef {"current" | "aging" | "stale" | "unknown"} Freshness */
/** @typedef {"observed" | "modeled" | "reported" | "expert-assessed"} EstimateMethod */
/** @typedef {"Observe" | "Watch" | "Warning" | "Action" | "Critical"} AlertLevel */

/**
 * One estimate, including the epistemic details needed to render it honestly.
 * `value` and `qualitative` are both optional because absent evidence is not zero.
 *
 * @typedef {object} Estimate
 * @property {number=} value
 * @property {string=} unit
 * @property {number=} lower
 * @property {number=} upper
 * @property {string=} qualitative
 * @property {Confidence} confidence
 * @property {string} observedAt
 * @property {string} publishedAt
 * @property {EstimateMethod} method
 * @property {EvidenceRole} evidenceRole
 * @property {string[]} sourceIds
 * @property {Freshness} freshness
 * @property {boolean} authoredIllustration
 * @property {string=} note
 */

/**
 * Provenance belongs to the threshold, not a tooltip assembled later.
 *
 * @typedef {object} ThresholdProvenance
 * @property {string} authority
 * @property {string} basis
 * @property {string} url
 * @property {string} effectiveDate
 * @property {string} reviewRequiredAfter
 * @property {Confidence} confidence
 * @property {boolean} nonTransferable
 * @property {boolean} geographicRollupPermitted
 * @property {string[]} supersedes
 */

/**
 * @typedef {object} ThresholdLevel
 * @property {"warning" | "action"} level
 * @property {number} value
 * @property {"single-observation" | "persistent"} persistence
 */

/**
 * @typedef {object} ThresholdDefinition
 * @property {string} id
 * @property {string} indicatorId
 * @property {"validated-operational" | "governance"} kind
 * @property {string} unit
 * @property {"above" | "below"} direction
 * @property {ThresholdLevel[]} levels
 * @property {{ ecosystemType: string, spatialScope: string, temporalAggregation: string }} scope
 * @property {{ spatial: string, temporal: string, transferableAcrossEcosystems: boolean }} aggregation
 * @property {ThresholdProvenance} provenance
 */

/**
 * A warning is a bounded claim. `serviceFailure` is explicit so a pressure
 * event cannot quietly turn into an outcome.
 *
 * @typedef {object} AlertClaim
 * @property {string} id
 * @property {string} serviceSystemId
 * @property {AlertLevel} level
 * @property {"validated-threshold" | "governance-threshold" | "reference-anomaly" | "trend-change" | "forecast-crossing" | "data-observability"} warningKind
 * @property {EvidenceRole} evidenceRole
 * @property {string} title
 * @property {string} claim
 * @property {string} caution
 * @property {Confidence} confidence
 * @property {Freshness} freshness
 * @property {boolean} serviceFailure
 * @property {boolean} outcomeClaim
 * @property {string | null} thresholdId
 * @property {string | null} triggeredAt
 * @property {string} updatedAt
 * @property {AlertLevel} maximumLevel
 * @property {Array<object>} lifecycle
 */

/**
 * @typedef {object} ServiceRiskState
 * @property {0 | 1 | 2 | 3 | 4} ecologicalSeverity
 * @property {0 | 1 | 2 | 3 | 4} serviceDeficit
 * @property {Estimate} exposure
 * @property {Estimate} velocity
 * @property {Confidence} confidence
 * @property {Freshness} freshness
 * @property {"known" | "unknown"} evidenceStatus
 */

/**
 * @typedef {object} ObservationGateStep
 * @property {string} gateId
 * @property {string} at
 * @property {"passed" | "late" | "review" | "resolved" | "failed"} status
 * @property {string=} note
 */

export const EVIDENCE_ROLES = Object.freeze([
  "driver",
  "pressure",
  "ecosystem-extent",
  "ecosystem-condition",
  "ecological-capacity",
  "service-flow",
  "demand",
  "use",
  "benefit",
  "value",
])

export const ALERT_LEVELS = Object.freeze(["Observe", "Watch", "Warning", "Action", "Critical"])

export const ALERT_LEVEL_RANK = Object.freeze(
  Object.fromEntries(ALERT_LEVELS.map((level, rank) => [level, rank])),
)

/** @type {ThresholdDefinition[]} */
export const THRESHOLDS = deepFreeze([
  {
    id: "coral-heat-dhw",
    indicatorId: "degreeHeatingWeeks",
    kind: "validated-operational",
    unit: "degC-week",
    direction: "above",
    levels: [
      { level: "warning", value: 4, persistence: "single-observation" },
      { level: "action", value: 8, persistence: "single-observation" },
    ],
    scope: {
      ecosystemType: "coral-reef",
      spatialScope: "Reef 14, Mesoamerican Caribbean",
      temporalAggregation: "rolling-12-week",
    },
    aggregation: {
      spatial: "none",
      temporal: "rolling-window",
      transferableAcrossEcosystems: false,
    },
    provenance: {
      authority: "NOAA Coral Reef Watch",
      basis: "Daily 5 km Degree Heating Week operational product",
      url: "https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php",
      effectiveDate: "2026-01-01",
      reviewRequiredAfter: "2028-01-01",
      confidence: "high",
      nonTransferable: true,
      geographicRollupPermitted: false,
      supersedes: [],
    },
  },
])

export const THRESHOLD_BY_ID = Object.freeze(
  Object.fromEntries(THRESHOLDS.map((threshold) => [threshold.id, threshold])),
)

export const SERVICE_DEFINITIONS = deepFreeze([
  {
    id: "climate-biomass-regulation",
    cices52Code: "2.2.6.1",
    plainName: "Climate and biomass regulation",
    section: "regulation-maintenance",
    spatialRelation: "global",
    supplyDemandComparable: false,
  },
  {
    id: "coastal-protection",
    cices52Code: "2.2.1.3",
    plainName: "Coastal protection",
    section: "regulation-maintenance",
    spatialRelation: "directional",
    supplyDemandComparable: true,
  },
  {
    id: "flood-attenuation",
    cices52Code: "2.2.1.3",
    plainName: "Flood attenuation",
    section: "regulation-maintenance",
    spatialRelation: "directional",
    supplyDemandComparable: true,
  },
  {
    id: "pollination",
    cices52Code: "2.2.2.1",
    plainName: "Crop pollination",
    section: "regulation-maintenance",
    spatialRelation: "networked",
    supplyDemandComparable: true,
  },
  {
    id: "water-purification",
    cices52Code: "2.1.1.2",
    plainName: "Water purification",
    section: "regulation-maintenance",
    spatialRelation: "directional",
    supplyDemandComparable: false,
  },
  {
    id: "wild-food-fisheries",
    cices52Code: "1.1.6.1",
    plainName: "Wild food and fisheries",
    section: "provisioning",
    spatialRelation: "networked",
    supplyDemandComparable: true,
  },
  {
    id: "urban-cooling",
    cices52Code: "2.2.6.2",
    plainName: "Urban cooling",
    section: "regulation-maintenance",
    spatialRelation: "local",
    supplyDemandComparable: true,
  },
  {
    id: "relational-contributions",
    plainName: "Relational contributions",
    section: "non-material",
    spatialRelation: "local",
    supplyDemandComparable: false,
  },
])

export const SERVICE_DEFINITION_BY_ID = Object.freeze(
  Object.fromEntries(SERVICE_DEFINITIONS.map((service) => [service.id, service])),
)

function serviceSystemId(serviceId, providingAreaId, benefitingAreaId) {
  return `${serviceId}::${providingAreaId}::${benefitingAreaId}`
}

export const SERVICE_SYSTEM_IDS = deepFreeze({
  coral: serviceSystemId("coastal-protection", "reef-14", "mesoamerican-caribbean-coast"),
  forest: serviceSystemId(
    "climate-biomass-regulation",
    "central-congo-forest",
    "congo-basin-communities",
  ),
  pollination: serviceSystemId("pollination", "central-valley-habitat", "central-valley-crops"),
  mangrove: serviceSystemId("coastal-protection", "sundarbans-mangroves", "lower-ganges-coast"),
  flood: serviceSystemId("flood-attenuation", "lower-danube-wetlands", "danube-delta-settlements"),
  water: serviceSystemId(
    "water-purification",
    "chesapeake-tidal-wetlands",
    "chesapeake-water-users",
  ),
  fisheries: serviceSystemId("wild-food-fisheries", "humboldt-current", "peru-coastal-fisheries"),
  cooling: serviceSystemId(
    "urban-cooling",
    "los-angeles-tree-canopy",
    "los-angeles-heat-exposed-blocks",
  ),
  relational: serviceSystemId(
    "relational-contributions",
    "whanganui-river-corridor",
    "whanganui-river-communities",
  ),
})

export const FLAGSHIP_SYSTEM_IDS = deepFreeze({
  coral: SERVICE_SYSTEM_IDS.coral,
  forest: SERVICE_SYSTEM_IDS.forest,
  pollination: SERVICE_SYSTEM_IDS.pollination,
})

export const SERVICE_SYSTEMS = deepFreeze([
  {
    id: SERVICE_SYSTEM_IDS.coral,
    stationId: "REEF 14",
    serviceId: "coastal-protection",
    name: "Reef 14 thermal stress and coastal protection",
    shortName: "Reef 14",
    serviceName: "Reef-backed coastal protection",
    serviceProvidingAreaId: "reef-14",
    serviceBenefitingAreaId: "mesoamerican-caribbean-coast",
    bioregionId: "mesoamerican-caribbean",
    bioregionName: "Mesoamerican Caribbean",
    serviceFamily: "Coastal protection",
    coordinates: [-87.02, 19.28],
    beneficiaries: { value: 186000, unit: "people", label: "coastal residents" },
    evidenceMaturity: "operational threshold; modeled service link",
    deepCase: "coral",
    note: "Heat is measured. Protection loss is modeled.",
  },
  {
    id: SERVICE_SYSTEM_IDS.forest,
    stationId: "FOREST 03",
    serviceId: "climate-biomass-regulation",
    name: "Central Congo forest disturbance and climate regulation",
    shortName: "Central Congo forest",
    serviceName: "Canopy retention and climate regulation",
    serviceProvidingAreaId: "central-congo-forest",
    serviceBenefitingAreaId: "congo-basin-communities",
    bioregionId: "congo-basin",
    bioregionName: "Congo Basin",
    serviceFamily: "Climate and biomass regulation",
    coordinates: [21.5, -1.8],
    beneficiaries: { value: 4200000, unit: "people", label: "forest-linked livelihoods" },
    evidenceMaturity: "high-confidence event; service implication unresolved",
    deepCase: "forest",
    note: "A disturbance alert is pressure, not a failed service.",
  },
  {
    id: SERVICE_SYSTEM_IDS.pollination,
    stationId: "FIELD 07",
    serviceId: "pollination",
    name: "Central Valley habitat capacity and crop pollination",
    shortName: "Central Valley pollination",
    serviceName: "Crop pollination",
    serviceProvidingAreaId: "central-valley-habitat",
    serviceBenefitingAreaId: "central-valley-crops",
    bioregionId: "california-central-valley",
    bioregionName: "California Central Valley",
    serviceFamily: "Pollination",
    coordinates: [-120.52, 37.16],
    beneficiaries: { value: 890000, unit: "hectares", label: "pollinator-dependent crops" },
    evidenceMaturity: "model-heavy",
    deepCase: "pollination",
    note: "Managed hives are doing part of the work.",
  },
  {
    id: SERVICE_SYSTEM_IDS.mangrove,
    stationId: "COAST 22",
    serviceId: "coastal-protection",
    name: "Sundarbans mangroves and lower-delta protection",
    shortName: "Sundarbans mangroves",
    serviceName: "Mangrove coastal protection",
    serviceProvidingAreaId: "sundarbans-mangroves",
    serviceBenefitingAreaId: "lower-ganges-coast",
    bioregionId: "ganges-brahmaputra-delta",
    bioregionName: "Ganges–Brahmaputra Delta",
    serviceFamily: "Coastal protection",
    coordinates: [89.32, 21.82],
    beneficiaries: { value: 1700000, unit: "people", label: "delta residents" },
    evidenceMaturity: "medium",
    note: "Extent is not the same thing as protection delivered.",
  },
  {
    id: SERVICE_SYSTEM_IDS.flood,
    stationId: "BASIN 11",
    serviceId: "flood-attenuation",
    name: "Lower Danube wetlands and downstream flood attenuation",
    shortName: "Lower Danube wetlands",
    serviceName: "Flood attenuation",
    serviceProvidingAreaId: "lower-danube-wetlands",
    serviceBenefitingAreaId: "danube-delta-settlements",
    bioregionId: "lower-danube",
    bioregionName: "Lower Danube",
    serviceFamily: "Flood attenuation",
    coordinates: [28.2, 45.18],
    beneficiaries: { value: 312000, unit: "people", label: "downstream residents" },
    evidenceMaturity: "medium",
    note: "The forecast is a warning about the next two weeks, not today.",
  },
  {
    id: SERVICE_SYSTEM_IDS.water,
    stationId: "ESTUARY 09",
    serviceId: "water-purification",
    name: "Chesapeake tidal wetlands and water filtration",
    shortName: "Chesapeake wetlands",
    serviceName: "Water purification",
    serviceProvidingAreaId: "chesapeake-tidal-wetlands",
    serviceBenefitingAreaId: "chesapeake-water-users",
    bioregionId: "chesapeake-bay",
    bioregionName: "Chesapeake Bay",
    serviceFamily: "Water purification",
    coordinates: [-76.31, 38.31],
    beneficiaries: { value: 940000, unit: "people", label: "estuary water users" },
    evidenceMaturity: "spatially uneven",
    note: "Filtration capacity and realized water quality stay separate.",
  },
  {
    id: SERVICE_SYSTEM_IDS.fisheries,
    stationId: "CURRENT 04",
    serviceId: "wild-food-fisheries",
    name: "Humboldt Current stock condition and apparent fishing effort",
    shortName: "Humboldt Current fisheries",
    serviceName: "Wild food and fisheries",
    serviceProvidingAreaId: "humboldt-current",
    serviceBenefitingAreaId: "peru-coastal-fisheries",
    bioregionId: "humboldt-current",
    bioregionName: "Humboldt Current",
    serviceFamily: "Wild food and fisheries",
    coordinates: [-76, -14],
    beneficiaries: { value: 74000, unit: "livelihoods", label: "coastal fishing livelihoods" },
    evidenceMaturity: "mixed cadence",
    note: "Apparent fishing activity is use and pressure, not stock condition.",
  },
  {
    id: SERVICE_SYSTEM_IDS.cooling,
    stationId: "CITY 18",
    serviceId: "urban-cooling",
    name: "Los Angeles tree canopy and neighborhood cooling",
    shortName: "Los Angeles cooling",
    serviceName: "Urban cooling",
    serviceProvidingAreaId: "los-angeles-tree-canopy",
    serviceBenefitingAreaId: "los-angeles-heat-exposed-blocks",
    bioregionId: "southern-california-urban",
    bioregionName: "Southern California urban region",
    serviceFamily: "Urban cooling",
    coordinates: [-118.25, 34.05],
    beneficiaries: { value: 628000, unit: "people", label: "heat-exposed residents" },
    evidenceMaturity: "locally strong; currently stale",
    note: "The feed went quiet. Gray does not mean fine.",
  },
  {
    id: SERVICE_SYSTEM_IDS.relational,
    stationId: "RIVER 02",
    serviceId: "relational-contributions",
    name: "Whanganui River corridor relational contributions",
    shortName: "Whanganui River corridor",
    serviceName: "Relational contributions",
    serviceProvidingAreaId: "whanganui-river-corridor",
    serviceBenefitingAreaId: "whanganui-river-communities",
    bioregionId: "te-awa-tupua",
    bioregionName: "Whanganui River corridor",
    serviceFamily: "Cultural and relational contributions",
    coordinates: [175.1, -39.5],
    beneficiaries: { qualitative: "community-governed record", label: "river communities" },
    evidenceMaturity: "context-specific",
    note: "This record stays qualitative and community governed.",
  },
])

export const SERVICE_SYSTEM_BY_ID = Object.freeze(
  Object.fromEntries(SERVICE_SYSTEMS.map((system) => [system.id, system])),
)

const SOURCE_ENTRIES = [
  {
    id: "noaa-coral-reef-watch-dhw",
    name: "NOAA Coral Reef Watch Degree Heating Week",
    sourceType: "satellite-model",
    url: "https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php",
    cadence: "daily",
    latency: "near real time",
    evidenceRoles: ["driver", "ecosystem-condition"],
    license: "See source terms",
    valuesInReplay: "authored illustration",
  },
  {
    id: "umd-glad-forest-alerts",
    name: "University of Maryland GLAD forest alerts",
    sourceType: "satellite",
    url: "https://www.glad.umd.edu/index.php/dataset/glad-forest-alerts",
    cadence: "event driven",
    latency: "near real time when clear observations are available",
    evidenceRoles: ["pressure"],
    license: "See source terms",
    valuesInReplay: "authored illustration",
  },
  {
    id: "nasa-modis-gpp",
    name: "NASA MODIS MOD17A2H gross primary productivity",
    sourceType: "satellite-model",
    url: "https://lpdaac.usgs.gov/products/mod17a2hv061/",
    cadence: "8-day",
    latency: "product dependent",
    evidenceRoles: ["ecosystem-condition", "ecological-capacity"],
    license: "NASA Earth observation data policy",
    valuesInReplay: "authored illustration",
  },
  {
    id: "copernicus-glofas",
    name: "Copernicus Global Flood Awareness System",
    sourceType: "model",
    url: "https://global-flood.emergency.copernicus.eu/react/technical-information/products/",
    cadence: "daily",
    latency: "operational",
    evidenceRoles: ["driver", "pressure"],
    license: "Copernicus terms",
    valuesInReplay: "authored illustration",
  },
  {
    id: "global-mangrove-watch",
    name: "Global Mangrove Watch",
    sourceType: "satellite",
    url: "https://www.globalmangrovewatch.org/",
    cadence: "annual and product dependent",
    latency: "product dependent",
    evidenceRoles: ["ecosystem-extent", "ecosystem-condition"],
    license: "See dataset terms",
    valuesInReplay: "authored illustration",
  },
  {
    id: "global-fishing-watch-effort",
    name: "Global Fishing Watch apparent fishing effort",
    sourceType: "administrative-satellite-model",
    url: "https://globalfishingwatch.org/dataset-and-code-fishing-effort/",
    cadence: "daily archive",
    latency: "dataset dependent",
    evidenceRoles: ["pressure", "use"],
    license: "See dataset terms",
    valuesInReplay: "authored illustration",
  },
  {
    id: "authored-pollination-model-inputs",
    name: "Illustrative habitat, crop acreage and managed-hive inputs",
    sourceType: "authored-model-input",
    cadence: "14-day replay",
    latency: "bundled",
    evidenceRoles: ["ecological-capacity", "demand", "service-flow"],
    valuesInReplay: "authored illustration",
  },
  {
    id: "authored-service-system-inputs",
    name: "Illustrative service demand, use, beneficiary and model inputs",
    sourceType: "authored-model-input",
    cadence: "replay dependent",
    latency: "bundled",
    evidenceRoles: [
      "ecosystem-condition",
      "ecological-capacity",
      "service-flow",
      "demand",
      "use",
      "benefit",
      "value",
    ],
    valuesInReplay: "authored illustration",
  },
  {
    id: "authored-wetland-observations",
    name: "Illustrative wetland condition observations",
    sourceType: "authored-observation",
    cadence: "8-day replay",
    latency: "bundled",
    evidenceRoles: ["ecosystem-condition", "ecological-capacity"],
    valuesInReplay: "authored illustration",
  },
  {
    id: "authored-urban-canopy-observations",
    name: "Illustrative urban canopy and surface-temperature observations",
    sourceType: "authored-observation",
    cadence: "8-day replay until the feed gap",
    latency: "bundled",
    evidenceRoles: ["ecosystem-condition", "service-flow", "demand"],
    valuesInReplay: "authored illustration",
  },
  {
    id: "community-ledger-demonstration",
    name: "Fictional, consented community-ledger demonstration",
    sourceType: "community",
    cadence: "community governed",
    latency: "community governed",
    evidenceRoles: ["benefit", "value"],
    restricted: true,
    revocable: true,
    valuesInReplay: "fictional demonstration",
  },
]

export const SOURCE_MANIFEST = deepFreeze({
  snapshot: "living-ledger-2026-07",
  generatedAt: REPLAY_WINDOW.generatedAt,
  replayWindow: REPLAY_WINDOW,
  mode: "curated-replay",
  valuesAreIllustrative: true,
  notice: ILLUSTRATIVE_DATA_NOTICE,
  sources: SOURCE_ENTRIES,
  models: [
    {
      id: "reef-service-translation-v1",
      version: "1.0.0-illustrative",
      method: "Translates heat stress into a bounded coastal-protection capacity estimate",
      confidence: "medium",
      caution: "Heat stress is direct evidence; protection loss is not.",
    },
    {
      id: "forest-pressure-context-v1",
      version: "1.0.0-illustrative",
      method: "Places disturbance events beside canopy and productivity context",
      confidence: "medium",
      caution: "It does not infer service failure from an event alert.",
    },
    {
      id: "pollination-adequacy-v1",
      version: "1.0.0-illustrative",
      method: "Compares habitat capacity and crop demand while keeping managed hives visible",
      confidence: "medium",
      caution: "There is no universal hard threshold in this replay.",
    },
  ],
  thresholdRegistries: [
    {
      id: "living-ledger-thresholds-2026-07",
      thresholdIds: THRESHOLDS.map((threshold) => threshold.id),
    },
  ],
  knownGaps: [
    "Replay values are authored illustrations, not source extracts.",
    "Service translation models are intentionally simpler than operational models.",
    "The Los Angeles cooling feed stops on replay day 132 to demonstrate stale evidence.",
    "The relational record is fictional, qualitative, restricted and revocable.",
  ],
})

export const sourceManifest = SOURCE_MANIFEST

function valueAt(keyframes, dayIndex) {
  if (dayIndex <= keyframes[0][0]) return keyframes[0][1]
  for (let index = 1; index < keyframes.length; index += 1) {
    const [rightDay, rightValue] = keyframes[index]
    const [leftDay, leftValue] = keyframes[index - 1]
    if (dayIndex <= rightDay) {
      const progress = (dayIndex - leftDay) / (rightDay - leftDay)
      return round(leftValue + progress * (rightValue - leftValue), 3)
    }
  }
  return keyframes.at(-1)[1]
}

const SYSTEM_CONFIG = deepFreeze({
  [SERVICE_SYSTEM_IDS.coral]: {
    cadence: 3,
    latency: 0,
    currentAfter: 4,
    staleAfter: 12,
    metric: {
      indicatorId: "degreeHeatingWeeks",
      label: "Degree Heating Weeks",
      unit: "degC-week",
      evidenceRole: "driver",
      method: "modeled",
      confidence: "high",
      sourceIds: ["noaa-coral-reef-watch-dhw"],
      direction: "above",
      curve: [
        [0, 0.3],
        [50, 0.8],
        [82, 1.8],
        [98, 3.6],
        [102, 4],
        [120, 5.8],
        [139, 7.8],
        [141, 8],
        [160, 9.1],
        [179, 9.6],
      ],
      referenceLow: [
        [0, 0],
        [179, 0.2],
      ],
      referenceHigh: [
        [0, 1.1],
        [179, 1.8],
      ],
      uncertainty: 0.18,
    },
    condition: [
      [0, 91],
      [98, 87],
      [120, 75],
      [141, 62],
      [179, 51],
    ],
    supply: [
      [0, 92],
      [102, 88],
      [141, 77],
      [179, 66],
    ],
    contribution: [
      [0, 4],
      [179, 6],
    ],
    demand: [
      [0, 78],
      [179, 83],
    ],
    use: [
      [0, 91],
      [179, 72],
    ],
    instrumental: "Homes, roads and tourism depend on wave attenuation.",
    relational: "Reef relationships are acknowledged; no public assessment is bundled.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.forest]: {
    cadence: 7,
    latency: 1,
    currentAfter: 8,
    staleAfter: 24,
    metric: {
      indicatorId: "disturbanceAlertPixels",
      label: "Disturbance alert pixels",
      unit: "alert pixels / 7d",
      evidenceRole: "pressure",
      method: "observed",
      confidence: "high",
      sourceIds: ["umd-glad-forest-alerts"],
      direction: "above",
      curve: [
        [0, 3],
        [90, 5],
        [115, 6],
        [118, 24],
        [122, 47],
        [131, 68],
        [145, 36],
        [179, 14],
      ],
      referenceLow: [
        [0, 1],
        [179, 2],
      ],
      referenceHigh: [
        [0, 9],
        [179, 11],
      ],
      uncertainty: 2,
    },
    condition: [
      [0, 84],
      [117, 82],
      [145, 77],
      [179, 76],
    ],
    supply: [
      [0, 88],
      [179, 82],
    ],
    contribution: [
      [0, 2],
      [179, 2],
    ],
    demand: [
      [0, 70],
      [179, 73],
    ],
    use: [
      [0, 78],
      [179, 77],
    ],
    instrumental: "Biomass retention, local livelihoods and regional rainfall are exposed.",
    relational: "Not assessed in this public replay.",
    exposureConfidence: "low",
  },
  [SERVICE_SYSTEM_IDS.pollination]: {
    cadence: 14,
    latency: 2,
    currentAfter: 15,
    staleAfter: 35,
    metric: {
      indicatorId: "modeledWildPollinationAdequacy",
      label: "Wild capacity / crop demand",
      unit: "ratio",
      evidenceRole: "ecological-capacity",
      method: "modeled",
      confidence: "medium",
      sourceIds: ["authored-pollination-model-inputs"],
      direction: "below",
      curve: [
        [0, 1.31],
        [75, 1.11],
        [105, 0.93],
        [140, 0.78],
        [179, 0.68],
      ],
      referenceLow: [
        [0, 0.98],
        [179, 0.98],
      ],
      referenceHigh: [
        [0, 1.22],
        [179, 1.22],
      ],
      uncertainty: 0.11,
    },
    condition: [
      [0, 81],
      [75, 74],
      [105, 67],
      [140, 61],
      [179, 58],
    ],
    supply: [
      [0, 88],
      [75, 78],
      [105, 69],
      [140, 61],
      [179, 56],
    ],
    contribution: [
      [0, 5],
      [75, 8],
      [105, 11],
      [140, 16],
      [179, 21],
    ],
    demand: [
      [0, 67],
      [75, 70],
      [105, 74],
      [140, 78],
      [179, 82],
    ],
    use: [
      [0, 99],
      [179, 94],
    ],
    instrumental: "High crop dependence; the model does not price avoided yield loss.",
    relational: "Not assessed.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.mangrove]: {
    cadence: 30,
    latency: 3,
    currentAfter: 14,
    staleAfter: 45,
    metric: {
      indicatorId: "mangroveExtentIndex",
      label: "Mangrove extent index",
      unit: "index, opening day = 100",
      evidenceRole: "ecosystem-extent",
      method: "observed",
      confidence: "medium",
      sourceIds: ["global-mangrove-watch"],
      direction: "below",
      curve: [
        [0, 100],
        [90, 98.4],
        [179, 96.8],
      ],
      referenceLow: [
        [0, 98],
        [179, 96],
      ],
      referenceHigh: [
        [0, 101],
        [179, 100],
      ],
      uncertainty: 0.8,
    },
    condition: [
      [0, 85],
      [179, 78],
    ],
    supply: [
      [0, 89],
      [179, 81],
    ],
    contribution: [
      [0, 10],
      [179, 12],
    ],
    demand: [
      [0, 83],
      [179, 91],
    ],
    use: [
      [0, 96],
      [179, 88],
    ],
    instrumental: "Settlements, embankments and fisheries sit behind the forest edge.",
    relational: "Public evidence is incomplete.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.flood]: {
    cadence: 2,
    latency: 0,
    currentAfter: 3,
    staleAfter: 8,
    metric: {
      indicatorId: "forecastExceedanceProbability",
      label: "14-day flood exceedance probability",
      unit: "probability",
      evidenceRole: "driver",
      method: "modeled",
      confidence: "medium",
      sourceIds: ["copernicus-glofas", "authored-wetland-observations"],
      direction: "above",
      curve: [
        [0, 0.12],
        [90, 0.19],
        [120, 0.36],
        [129, 0.58],
        [150, 0.66],
        [179, 0.48],
      ],
      referenceLow: [
        [0, 0.05],
        [179, 0.08],
      ],
      referenceHigh: [
        [0, 0.3],
        [179, 0.34],
      ],
      uncertainty: 0.09,
    },
    condition: [
      [0, 79],
      [179, 72],
    ],
    supply: [
      [0, 80],
      [179, 70],
    ],
    contribution: [
      [0, 17],
      [179, 19],
    ],
    demand: [
      [0, 72],
      [179, 78],
    ],
    use: [
      [0, 100],
      [179, 91],
    ],
    instrumental: "Downstream homes, farms and road links are exposed.",
    relational: "Not assessed.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.water]: {
    cadence: 8,
    latency: 2,
    currentAfter: 10,
    staleAfter: 28,
    metric: {
      indicatorId: "wetlandFiltrationCapacity",
      label: "Wetland filtration capacity",
      unit: "reference index",
      evidenceRole: "ecological-capacity",
      method: "modeled",
      confidence: "medium",
      sourceIds: ["authored-wetland-observations"],
      direction: "below",
      curve: [
        [0, 78],
        [90, 75],
        [179, 73],
      ],
      referenceLow: [
        [0, 70],
        [179, 69],
      ],
      referenceHigh: [
        [0, 85],
        [179, 84],
      ],
      uncertainty: 5,
    },
    condition: [
      [0, 78],
      [179, 74],
    ],
    supply: [
      [0, 81],
      [179, 76],
    ],
    contribution: [
      [0, 24],
      [179, 27],
    ],
    demand: [
      [0, 80],
      [179, 84],
    ],
    use: [
      [0, 97],
      [179, 96],
    ],
    instrumental: "Water users benefit from both wetlands and treatment infrastructure.",
    relational: "Not assessed.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.fisheries]: {
    cadence: 7,
    latency: 2,
    currentAfter: 9,
    staleAfter: 24,
    metric: {
      indicatorId: "apparentFishingEffort",
      label: "Apparent fishing effort",
      unit: "hours / grid cell",
      evidenceRole: "pressure",
      method: "modeled",
      confidence: "medium",
      sourceIds: ["global-fishing-watch-effort"],
      direction: "above",
      curve: [
        [0, 31],
        [80, 35],
        [120, 48],
        [150, 57],
        [179, 54],
      ],
      referenceLow: [
        [0, 24],
        [179, 26],
      ],
      referenceHigh: [
        [0, 42],
        [179, 44],
      ],
      uncertainty: 7,
    },
    condition: [
      [0, 76],
      [120, 69],
      [179, 64],
    ],
    supply: [
      [0, 82],
      [179, 67],
    ],
    contribution: [
      [0, 8],
      [179, 9],
    ],
    demand: [
      [0, 77],
      [179, 86],
    ],
    use: [
      [0, 72],
      [179, 91],
    ],
    instrumental: "Food supply and coastal livelihoods are exposed.",
    relational: "Small-scale fishing ties are acknowledged but not quantified.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.cooling]: {
    cadence: 8,
    latency: 1,
    currentAfter: 10,
    staleAfter: 24,
    dataEndDay: 132,
    metric: {
      indicatorId: "canopyCoolingDelta",
      label: "Canopy cooling delta",
      unit: "degC",
      evidenceRole: "service-flow",
      method: "modeled",
      confidence: "medium",
      sourceIds: ["authored-urban-canopy-observations"],
      direction: "below",
      curve: [
        [0, 2.8],
        [80, 2.7],
        [132, 2.5],
        [179, 2.45],
      ],
      referenceLow: [
        [0, 2.3],
        [179, 2.3],
      ],
      referenceHigh: [
        [0, 3.2],
        [179, 3.2],
      ],
      uncertainty: 0.3,
    },
    condition: [
      [0, 72],
      [132, 68],
      [179, 66],
    ],
    supply: [
      [0, 76],
      [179, 69],
    ],
    contribution: [
      [0, 12],
      [179, 14],
    ],
    demand: [
      [0, 81],
      [179, 89],
    ],
    use: [
      [0, 92],
      [179, 88],
    ],
    instrumental: "Heat-exposed residents and public health systems depend on local cooling.",
    relational: "Neighborhood shade preferences are not assessed.",
    exposureConfidence: "medium",
  },
  [SERVICE_SYSTEM_IDS.relational]: {
    cadence: 30,
    latency: 4,
    currentAfter: 20,
    staleAfter: 50,
    metric: {
      indicatorId: "communityAccessAssessment",
      label: "Community access assessment",
      unit: "community category",
      evidenceRole: "value",
      method: "reported",
      confidence: "medium",
      sourceIds: ["community-ledger-demonstration"],
      direction: "none",
      curve: [
        [0, 3],
        [179, 3],
      ],
      referenceLow: [
        [0, 2],
        [179, 2],
      ],
      referenceHigh: [
        [0, 4],
        [179, 4],
      ],
      uncertainty: 0,
    },
    condition: [
      [0, 78],
      [179, 77],
    ],
    supply: [
      [0, 76],
      [179, 76],
    ],
    contribution: [
      [0, 15],
      [179, 15],
    ],
    demand: null,
    use: null,
    instrumental: "Not reduced to a monetary estimate.",
    relational:
      "Access and stewardship recorded as steady in a fictional, consented demonstration.",
    exposureConfidence: "low",
  },
})

export const CORAL_ALERT_DAYS = Object.freeze({ warning: 102, action: 141 })
export const FOREST_EVENT_DAY = 118
export const POLLINATION_WATCH_DAY = 101

function lastEvidenceDay(config, dayIndex) {
  if (config.dataEndDay !== undefined && dayIndex >= config.dataEndDay) {
    return config.dataEndDay
  }
  const availableDay = Math.min(dayIndex, config.dataEndDay ?? dayIndex)
  return Math.max(0, Math.floor(availableDay / config.cadence) * config.cadence)
}

function freshnessFor(config, dayIndex) {
  const observedDay = lastEvidenceDay(config, dayIndex)
  const ageDays = dayIndex - observedDay
  const freshness =
    ageDays <= config.currentAfter ? "current" : ageDays <= config.staleAfter ? "aging" : "stale"
  return { freshness, observedDay, ageDays }
}

function makeEstimate({
  value,
  unit,
  lower,
  upper,
  qualitative,
  confidence,
  observedDay,
  publishedDay,
  method,
  evidenceRole,
  sourceIds,
  freshness,
  note,
}) {
  /** @type {Estimate} */
  const estimate = {
    confidence,
    observedAt: isoAtDay(observedDay),
    publishedAt: isoAtDay(publishedDay),
    method,
    evidenceRole,
    sourceIds: [...sourceIds],
    freshness,
    authoredIllustration: true,
  }
  if (value !== undefined) estimate.value = round(value)
  if (unit) estimate.unit = unit
  if (lower !== undefined) estimate.lower = round(lower)
  if (upper !== undefined) estimate.upper = round(upper)
  if (qualitative) estimate.qualitative = qualitative
  if (note) estimate.note = note
  return estimate
}

function sourceForDimension(systemId, dimension) {
  if (systemId === SERVICE_SYSTEM_IDS.pollination) {
    return ["authored-pollination-model-inputs"]
  }
  if (systemId === SERVICE_SYSTEM_IDS.relational) {
    return ["community-ledger-demonstration"]
  }
  if (dimension === "demand" || dimension === "contribution") {
    return ["authored-service-system-inputs"]
  }
  if (dimension === "use") {
    return systemId === SERVICE_SYSTEM_IDS.fisheries
      ? ["global-fishing-watch-effort"]
      : ["authored-service-system-inputs"]
  }
  if (systemId === SERVICE_SYSTEM_IDS.coral) {
    return ["noaa-coral-reef-watch-dhw"]
  }
  if (systemId === SERVICE_SYSTEM_IDS.forest) {
    return dimension === "ecosystemCondition"
      ? ["umd-glad-forest-alerts", "nasa-modis-gpp"]
      : ["nasa-modis-gpp"]
  }
  if (systemId === SERVICE_SYSTEM_IDS.flood) {
    return ["authored-wetland-observations"]
  }
  if (systemId === SERVICE_SYSTEM_IDS.fisheries) {
    return ["authored-service-system-inputs"]
  }
  return SYSTEM_CONFIG[systemId].metric.sourceIds
}

function dimensionEstimate(system, dimension, dayIndex) {
  const config = SYSTEM_CONFIG[system.id]
  const curve = config[dimension]
  if (!curve) return undefined
  const { freshness, observedDay } = freshnessFor(config, dayIndex)
  const publishedDay = Math.min(dayIndex, observedDay + config.latency)
  const roleByDimension = {
    condition: "ecosystem-condition",
    supply: "ecological-capacity",
    contribution: "service-flow",
    demand: "demand",
    use: "use",
  }
  const noteByDimension = {
    contribution:
      system.id === SERVICE_SYSTEM_IDS.pollination
        ? "Managed hive supplementation; kept separate from wild-pollinator capacity."
        : "Engineered or managed contribution; not ecosystem supply.",
  }
  const valueDay = Math.min(dayIndex, config.dataEndDay ?? dayIndex)
  return makeEstimate({
    value: valueAt(curve, valueDay),
    unit: "reference index",
    lower: valueAt(curve, valueDay) - (dimension === "contribution" ? 2 : 4),
    upper: valueAt(curve, valueDay) + (dimension === "contribution" ? 2 : 4),
    confidence:
      system.id === SERVICE_SYSTEM_IDS.pollination && dimension !== "contribution"
        ? "medium"
        : config.metric.confidence,
    observedDay,
    publishedDay,
    method:
      dimension === "demand" || dimension === "use"
        ? "reported"
        : dimension === "condition" && system.id === SERVICE_SYSTEM_IDS.forest
          ? "modeled"
          : "modeled",
    evidenceRole: roleByDimension[dimension],
    sourceIds: sourceForDimension(
      system.id,
      dimension === "condition" ? "ecosystemCondition" : dimension,
    ),
    freshness,
    note: noteByDimension[dimension],
  })
}

function qualitativeEstimate(system, dimension, dayIndex) {
  const config = SYSTEM_CONFIG[system.id]
  const { freshness, observedDay } = freshnessFor(config, dayIndex)
  const qualitative = config[dimension]
  if (!qualitative) return undefined
  return makeEstimate({
    qualitative,
    confidence: dimension === "relational" ? "low" : "medium",
    observedDay,
    publishedDay: Math.min(dayIndex, observedDay + config.latency),
    method: system.id === SERVICE_SYSTEM_IDS.relational ? "reported" : "expert-assessed",
    evidenceRole: dimension === "relational" ? "value" : "benefit",
    sourceIds:
      system.id === SERVICE_SYSTEM_IDS.relational
        ? ["community-ledger-demonstration"]
        : ["authored-service-system-inputs"],
    freshness,
  })
}

function metricValueAt(systemId, dayIndex) {
  const config = SYSTEM_CONFIG[systemId]
  const valueDay = Math.min(dayIndex, config.dataEndDay ?? dayIndex)
  return valueAt(config.metric.curve, valueDay)
}

function adequacyFor(system, eesv) {
  const definition = SERVICE_DEFINITION_BY_ID[system.serviceId]
  if (!definition.supplyDemandComparable || !eesv.demand?.value) return null
  return round(
    (eesv.ecologicalSupply.value + (eesv.anthropogenicContribution?.value ?? 0)) /
      eesv.demand.value,
    3,
  )
}

function triageQuadrant(condition, adequacy, supplementation, freshness) {
  if (freshness === "stale" || freshness === "unknown") return "Unobserved"
  if (adequacy === null) return "Not comparable"
  if (condition >= 70 && adequacy >= 1) return "Resilient"
  if (condition >= 70 && adequacy < 1) return "Overdrawn"
  if (condition < 70 && adequacy >= 0.9 && supplementation >= 0.12) return "Subsidized"
  return "Failing"
}

function serviceDeficitFor(adequacy) {
  if (adequacy === null || adequacy >= 1) return 0
  if (adequacy >= 0.9) return 1
  if (adequacy >= 0.75) return 2
  if (adequacy >= 0.6) return 3
  return 4
}

function alertBase(system, dayIndex, freshness) {
  return {
    id: `${system.id}:observe`,
    serviceSystemId: system.id,
    level: "Observe",
    warningKind: "trend-change",
    evidenceRole: SYSTEM_CONFIG[system.id].metric.evidenceRole,
    title: "No active service warning",
    claim: "The replay has not crossed this system's authored alert rule.",
    caution: "Observe is not a claim of health.",
    confidence: SYSTEM_CONFIG[system.id].metric.confidence,
    freshness,
    serviceFailure: false,
    outcomeClaim: false,
    thresholdId: null,
    triggeredAt: null,
    updatedAt: isoAtDay(dayIndex),
    maximumLevel: "Observe",
    lifecycle: [],
  }
}

function coralAlert(system, dayIndex, freshness) {
  if (dayIndex < CORAL_ALERT_DAYS.warning) return alertBase(system, dayIndex, freshness)
  const action = dayIndex >= CORAL_ALERT_DAYS.action
  const value = metricValueAt(system.id, dayIndex)
  const lifecycle = [
    {
      id: `${system.id}:warning-issued`,
      type: "issued",
      level: "Warning",
      dayIndex: CORAL_ALERT_DAYS.warning,
      at: isoAtDay(CORAL_ALERT_DAYS.warning),
      reason: "Degree Heating Weeks reached 4.",
    },
  ]
  if (action) {
    lifecycle.push({
      id: `${system.id}:action-escalated`,
      type: "escalated",
      level: "Action",
      dayIndex: CORAL_ALERT_DAYS.action,
      at: isoAtDay(CORAL_ALERT_DAYS.action),
      reason: "Degree Heating Weeks reached 8.",
    })
  }
  return {
    id: `${system.id}:coral-heat-dhw`,
    serviceSystemId: system.id,
    level: action ? "Action" : "Warning",
    warningKind: "validated-threshold",
    evidenceRole: "driver",
    title: action ? "Severe reef heat stress" : "Reef heat threshold crossed",
    claim: `Reef 14 reached ${round(value, 1)} °C-weeks of accumulated heat stress.`,
    caution: "This threshold supports a heat-stress claim. Coastal-protection loss is modeled.",
    confidence: "high",
    freshness,
    serviceFailure: false,
    outcomeClaim: false,
    thresholdId: "coral-heat-dhw",
    triggeredAt: isoAtDay(CORAL_ALERT_DAYS.warning),
    updatedAt: isoAtDay(dayIndex),
    maximumLevel: "Action",
    lifecycle,
  }
}

function forestAlert(system, dayIndex, freshness) {
  if (dayIndex < FOREST_EVENT_DAY) return alertBase(system, dayIndex, freshness)
  return {
    id: `${system.id}:disturbance-event`,
    serviceSystemId: system.id,
    level: "Watch",
    warningKind: "reference-anomaly",
    evidenceRole: "pressure",
    title: "Canopy disturbance cluster",
    claim: "High-confidence disturbance events appeared in the Central Congo observation area.",
    caution: "Pressure observed. Service implication not yet directly observed.",
    confidence: "high",
    freshness,
    serviceFailure: false,
    outcomeClaim: false,
    thresholdId: null,
    triggeredAt: isoAtDay(FOREST_EVENT_DAY),
    updatedAt: isoAtDay(dayIndex),
    maximumLevel: "Warning",
    lifecycle: [
      {
        id: `${system.id}:disturbance-issued`,
        type: "issued",
        level: "Watch",
        dayIndex: FOREST_EVENT_DAY,
        at: isoAtDay(FOREST_EVENT_DAY),
        reason: "A corroborated cluster left the reference envelope.",
      },
    ],
  }
}

function pollinationAlert(system, dayIndex, freshness) {
  if (dayIndex < POLLINATION_WATCH_DAY) return alertBase(system, dayIndex, freshness)
  const config = SYSTEM_CONFIG[system.id]
  const supply = valueAt(config.supply, dayIndex)
  const contribution = valueAt(config.contribution, dayIndex)
  const demand = valueAt(config.demand, dayIndex)
  return {
    id: `${system.id}:modeled-service-gap`,
    serviceSystemId: system.id,
    level: "Watch",
    warningKind: "trend-change",
    evidenceRole: "ecological-capacity",
    title: "Wild pollination capacity is trailing demand",
    claim: `Wild capacity is ${round((supply / demand) * 100, 0)}% of modeled crop demand; managed hives add ${round(contribution)} index points.`,
    caution:
      "Model Watch, not a universal threshold. Managed hives are part of delivery, not wild supply.",
    confidence: "medium",
    freshness,
    serviceFailure: false,
    outcomeClaim: true,
    thresholdId: null,
    triggeredAt: isoAtDay(POLLINATION_WATCH_DAY),
    updatedAt: isoAtDay(dayIndex),
    maximumLevel: "Watch",
    lifecycle: [
      {
        id: `${system.id}:model-watch-issued`,
        type: "issued",
        level: "Watch",
        dayIndex: POLLINATION_WATCH_DAY,
        at: isoAtDay(POLLINATION_WATCH_DAY),
        reason: "The modeled wild-capacity gap persisted across two updates.",
      },
    ],
  }
}

function otherAlert(system, dayIndex, freshness) {
  const base = alertBase(system, dayIndex, freshness)
  if (system.id === SERVICE_SYSTEM_IDS.mangrove && dayIndex >= 135) {
    return {
      ...base,
      id: `${system.id}:extent-trend`,
      level: "Watch",
      warningKind: "trend-change",
      evidenceRole: "ecosystem-extent",
      title: "Mangrove extent is edging down",
      claim: "The authored extent series carries a persistent decline.",
      caution: "Extent change does not directly measure wave attenuation.",
      triggeredAt: isoAtDay(135),
      maximumLevel: "Warning",
      lifecycle: [
        {
          id: `${system.id}:watch-issued`,
          type: "issued",
          level: "Watch",
          dayIndex: 135,
          at: isoAtDay(135),
          reason: "The decline persisted across updates.",
        },
      ],
    }
  }
  if (system.id === SERVICE_SYSTEM_IDS.flood && dayIndex >= 129) {
    return {
      ...base,
      id: `${system.id}:forecast-crossing`,
      level: "Warning",
      warningKind: "forecast-crossing",
      evidenceRole: "driver",
      title: "Flood forecast deserves attention",
      claim: "The 14-day exceedance forecast moved above the system-specific watch band.",
      caution: "This is a forecast, not an observed flood or a failed wetland service.",
      triggeredAt: isoAtDay(129),
      maximumLevel: "Warning",
      lifecycle: [
        {
          id: `${system.id}:forecast-warning`,
          type: "issued",
          level: "Warning",
          dayIndex: 129,
          at: isoAtDay(129),
          reason: "Forecast probability persisted across two model runs.",
        },
      ],
    }
  }
  if (system.id === SERVICE_SYSTEM_IDS.fisheries && dayIndex >= 120) {
    return {
      ...base,
      id: `${system.id}:effort-and-stock-trend`,
      level: "Warning",
      warningKind: "trend-change",
      evidenceRole: "pressure",
      title: "Fishing pressure is rising as stock condition falls",
      claim: "Two unlike signals are moving in the wrong directions together.",
      caution: "Apparent fishing effort is not a catch record or a stock estimate.",
      confidence: "medium",
      triggeredAt: isoAtDay(120),
      maximumLevel: "Warning",
      lifecycle: [
        {
          id: `${system.id}:trend-warning`,
          type: "issued",
          level: "Warning",
          dayIndex: 120,
          at: isoAtDay(120),
          reason: "Pressure and condition trends were corroborated.",
        },
      ],
    }
  }
  if (system.id === SERVICE_SYSTEM_IDS.cooling && freshness === "stale") {
    const staleDay = SYSTEM_CONFIG[system.id].dataEndDay + SYSTEM_CONFIG[system.id].staleAfter + 1
    return {
      ...base,
      id: `${system.id}:stale-feed`,
      level: "Watch",
      warningKind: "data-observability",
      evidenceRole: "service-flow",
      title: "Cooling evidence is stale",
      claim: "The canopy-cooling feed stopped updating.",
      caution: "No new evidence is not evidence of normal conditions.",
      confidence: "low",
      triggeredAt: isoAtDay(staleDay),
      maximumLevel: "Watch",
      lifecycle: [
        {
          id: `${system.id}:stale-watch`,
          type: "issued",
          level: "Watch",
          dayIndex: staleDay,
          at: isoAtDay(staleDay),
          reason: "The source passed its stale-after interval.",
        },
      ],
    }
  }
  return base
}

function alertFor(system, dayIndex, freshness) {
  if (system.id === SERVICE_SYSTEM_IDS.coral) return coralAlert(system, dayIndex, freshness)
  if (system.id === SERVICE_SYSTEM_IDS.forest) return forestAlert(system, dayIndex, freshness)
  if (system.id === SERVICE_SYSTEM_IDS.pollination) {
    return pollinationAlert(system, dayIndex, freshness)
  }
  return otherAlert(system, dayIndex, freshness)
}

function thresholdEvaluationsFor(system, dayIndex) {
  if (system.id !== SERVICE_SYSTEM_IDS.coral) return []
  const observedValue = metricValueAt(system.id, dayIndex)
  return THRESHOLD_BY_ID["coral-heat-dhw"].levels.map((level) => ({
    thresholdId: "coral-heat-dhw",
    indicatorId: "degreeHeatingWeeks",
    level: level.level,
    thresholdValue: level.value,
    observedValue: round(observedValue),
    unit: "degC-week",
    crossed: observedValue >= level.value,
    firstCrossedAt:
      observedValue >= level.value
        ? isoAtDay(level.level === "warning" ? CORAL_ALERT_DAYS.warning : CORAL_ALERT_DAYS.action)
        : null,
    directIndicatorClaim: true,
    serviceFailureClaim: false,
    provenance: THRESHOLD_BY_ID["coral-heat-dhw"].provenance,
  }))
}

function exposureEstimate(system, dayIndex, freshness) {
  const config = SYSTEM_CONFIG[system.id]
  const { observedDay } = freshnessFor(config, dayIndex)
  if (system.beneficiaries.value === undefined) {
    return makeEstimate({
      qualitative: system.beneficiaries.qualitative,
      confidence: config.exposureConfidence,
      observedDay,
      publishedDay: observedDay,
      method: "reported",
      evidenceRole: "benefit",
      sourceIds: ["community-ledger-demonstration"],
      freshness,
    })
  }
  return makeEstimate({
    value: system.beneficiaries.value,
    unit: system.beneficiaries.unit,
    confidence: config.exposureConfidence,
    observedDay,
    publishedDay: observedDay,
    method: "reported",
    evidenceRole: "benefit",
    sourceIds: ["authored-service-system-inputs"],
    freshness,
  })
}

function deriveSystemState(system, dayIndex) {
  const config = SYSTEM_CONFIG[system.id]
  const { freshness, observedDay, ageDays } = freshnessFor(config, dayIndex)
  const ecosystemCondition = dimensionEstimate(system, "condition", dayIndex)
  const eesv = {
    ecologicalSupply: dimensionEstimate(system, "supply", dayIndex),
    anthropogenicContribution: dimensionEstimate(system, "contribution", dayIndex),
    demand: dimensionEstimate(system, "demand", dayIndex),
    use: dimensionEstimate(system, "use", dayIndex),
    instrumentalValue: qualitativeEstimate(system, "instrumental", dayIndex),
    relationalValue: qualitativeEstimate(system, "relational", dayIndex),
  }
  const adequacy = adequacyFor(system, eesv)
  const totalDelivery =
    (eesv.ecologicalSupply?.value ?? 0) + (eesv.anthropogenicContribution?.value ?? 0)
  const supplementation = totalDelivery
    ? round((eesv.anthropogenicContribution?.value ?? 0) / totalDelivery, 3)
    : 0
  const condition = ecosystemCondition.value
  const alert = alertFor(system, dayIndex, freshness)
  const previousDay = Math.max(0, dayIndex - 30)
  const velocity = round(
    (valueAt(config.condition, Math.min(dayIndex, config.dataEndDay ?? dayIndex)) -
      valueAt(config.condition, Math.min(previousDay, config.dataEndDay ?? previousDay))) /
      Math.max(1, dayIndex - previousDay),
    3,
  )
  let ecologicalSeverity = condition >= 80 ? 0 : condition >= 70 ? 1 : condition >= 55 ? 2 : 3
  if (system.id === SERVICE_SYSTEM_IDS.coral && dayIndex >= CORAL_ALERT_DAYS.action) {
    ecologicalSeverity = Math.max(ecologicalSeverity, 3)
  }
  /** @type {ServiceRiskState} */
  const risk = {
    ecologicalSeverity,
    serviceDeficit: serviceDeficitFor(adequacy),
    exposure: exposureEstimate(system, dayIndex, freshness),
    velocity: makeEstimate({
      value: velocity,
      unit: "condition index points / day",
      confidence: config.metric.confidence,
      observedDay,
      publishedDay: Math.min(dayIndex, observedDay + config.latency),
      method: "modeled",
      evidenceRole: "ecosystem-condition",
      sourceIds: config.metric.sourceIds,
      freshness,
    }),
    confidence: alert.confidence,
    freshness,
    evidenceStatus: freshness === "stale" || freshness === "unknown" ? "unknown" : "known",
  }
  const definition = SERVICE_DEFINITION_BY_ID[system.serviceId]
  return {
    ...system,
    serviceDefinition: definition,
    timestamp: isoAtDay(dayIndex),
    dayIndex,
    freshness,
    evidenceAgeDays: ageDays,
    lastObservedAt: isoAtDay(observedDay),
    currentStatus: freshness === "stale" || freshness === "unknown" ? "unknown" : alert.level,
    ecosystemCondition,
    eesv,
    serviceAdequacy: adequacy,
    supplyDemandComparable: definition.supplyDemandComparable,
    anthropogenicSupplementation: supplementation,
    triage: {
      condition,
      adequacy,
      quadrant: triageQuadrant(condition, adequacy, supplementation, freshness),
      exposure: risk.exposure,
      supplementation,
      evidenceShape: alert.warningKind,
      tail: {
        fromDayIndex: previousDay,
        fromCondition: valueAt(config.condition, previousDay),
        toCondition: condition,
      },
    },
    thresholdEvaluations: thresholdEvaluationsFor(system, dayIndex),
    alert,
    risk,
  }
}

export const PIPELINE_GATES = deepFreeze([
  { id: "receive", label: "receive", order: 0 },
  { id: "geolocate", label: "geolocate", order: 1 },
  { id: "normalize", label: "normalize units", order: 2 },
  { id: "validate", label: "validate", order: 3 },
  { id: "freshness", label: "freshness check", order: 4 },
  { id: "corroborate", label: "corroborate", order: 5 },
  { id: "update-indicator", label: "update indicator", order: 6 },
  { id: "evaluate-threshold", label: "evaluate threshold", order: 7 },
])

const GATE_OFFSETS = [0, 0, 0, 0, 1, 1, 2, 2]

function makeObservationEvent(seed) {
  const config = SYSTEM_CONFIG[seed.serviceSystemId]
  const metric = config.metric
  const late = seed.arrivalDay > seed.observedDay + config.latency + 1
  const journey = []
  for (let index = 0; index < PIPELINE_GATES.length; index += 1) {
    const gate = PIPELINE_GATES[index]
    const atDay = seed.arrivalDay + GATE_OFFSETS[index]
    if (seed.failGateId === gate.id) {
      journey.push({
        gateId: gate.id,
        at: isoAtDay(atDay, 10),
        dayIndex: atDay,
        status: "failed",
        note: seed.failureNote,
      })
      break
    }
    let status = gate.id === "receive" && late ? "late" : "passed"
    if (seed.reviewAt === gate.id) status = "review"
    journey.push({ gateId: gate.id, at: isoAtDay(atDay, 10), dayIndex: atDay, status })
    if (seed.reviewAt === gate.id) {
      journey.push({
        gateId: gate.id,
        at: isoAtDay(atDay + 1, 10),
        dayIndex: atDay + 1,
        status: "resolved",
        note: seed.reviewNote,
      })
    }
  }
  const lastStep = journey.at(-1)
  return {
    id: seed.id,
    serviceSystemId: seed.serviceSystemId,
    sourceId: seed.sourceId ?? metric.sourceIds[0],
    sourceType:
      SOURCE_ENTRIES.find((source) => source.id === (seed.sourceId ?? metric.sourceIds[0]))
        ?.sourceType ?? "authored-observation",
    label: seed.label ?? metric.label,
    evidenceRole: seed.evidenceRole ?? metric.evidenceRole,
    indicatorId: metric.indicatorId,
    value: seed.value ?? metricValueAt(seed.serviceSystemId, seed.observedDay),
    unit: seed.unit ?? metric.unit,
    observedDay: seed.observedDay,
    arrivalDay: seed.arrivalDay,
    observedAt: isoAtDay(seed.observedDay, 6),
    arrivedAt: isoAtDay(seed.arrivalDay, 8),
    late,
    outcome: seed.failGateId
      ? "quarantine"
      : seed.reviewAt
        ? "accepted-after-review"
        : late
          ? "late-accepted"
          : "accepted",
    finalDay: lastStep.dayIndex,
    journey,
    authoredIllustration: true,
  }
}

const EVENT_SEEDS = [
  ...[12, 54, 96, 102, 141, 177].map((day) => ({
    id: `reef-14-dhw-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.coral,
    observedDay: day,
    arrivalDay: day,
  })),
  ...[35, 84, 117, 125, 175].map((day) => ({
    id: `congo-context-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.forest,
    sourceId: day === 84 ? "nasa-modis-gpp" : "umd-glad-forest-alerts",
    observedDay: day,
    arrivalDay: day + 1,
  })),
  {
    id: "congo-disturbance-cluster-118",
    serviceSystemId: SERVICE_SYSTEM_IDS.forest,
    observedDay: 118,
    arrivalDay: 119,
    evidenceRole: "pressure",
    reviewAt: "corroborate",
    reviewNote: "A second clear observation confirmed the event cluster.",
  },
  ...[20, 76, 104, 140, 168].map((day) => ({
    id: `central-valley-pollination-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.pollination,
    observedDay: day,
    arrivalDay: day + 2,
  })),
  ...[30, 150].map((day) => ({
    id: `sundarbans-extent-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.mangrove,
    observedDay: day,
    arrivalDay: day + 3,
  })),
  {
    id: "sundarbans-extent-90-late",
    serviceSystemId: SERVICE_SYSTEM_IDS.mangrove,
    observedDay: 90,
    arrivalDay: 98,
    label: "Late mangrove extent tile",
  },
  ...[40, 129, 176].map((day) => ({
    id: `danube-flood-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.flood,
    observedDay: day,
    arrivalDay: day,
  })),
  {
    id: "danube-discharge-88-bad-unit",
    serviceSystemId: SERVICE_SYSTEM_IDS.flood,
    observedDay: 88,
    arrivalDay: 88,
    unit: "feet",
    failGateId: "validate",
    failureNote: "Unexpected unit for a probability field.",
  },
  {
    id: "danube-discharge-90-correction",
    serviceSystemId: SERVICE_SYSTEM_IDS.flood,
    observedDay: 90,
    arrivalDay: 90,
    label: "Corrected flood probability",
  },
  ...[16, 64, 112, 176].map((day) => ({
    id: `chesapeake-wetland-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.water,
    observedDay: day,
    arrivalDay: day + 2,
  })),
  ...[42, 98, 126, 175].map((day) => ({
    id: `humboldt-effort-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.fisheries,
    observedDay: day,
    arrivalDay: day + 2,
  })),
  ...[24, 88, 132].map((day) => ({
    id: `los-angeles-cooling-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.cooling,
    observedDay: day,
    arrivalDay: day + 1,
  })),
  ...[30, 90, 150].map((day) => ({
    id: `whanganui-community-${day}`,
    serviceSystemId: SERVICE_SYSTEM_IDS.relational,
    observedDay: day,
    arrivalDay: day + 4,
  })),
]

export const observationEvents = deepFreeze(EVENT_SEEDS.map(makeObservationEvent))
export const OBSERVATION_EVENTS = observationEvents

function eventAtDay(event, dayIndex) {
  if (event.arrivalDay > dayIndex) return null
  const completedJourney = event.journey.filter((step) => step.dayIndex <= dayIndex)
  const current = completedJourney.at(-1)
  let pipelineStatus = "processing"
  if (current?.status === "failed") pipelineStatus = "quarantine"
  else if (current?.status === "review") pipelineStatus = "review"
  else if (completedJourney.length === event.journey.length) pipelineStatus = "settled"
  else if (event.late && completedJourney.length === 1) pipelineStatus = "queued"
  return {
    ...event,
    completedJourney,
    currentGateId: current?.gateId ?? "receive",
    pipelineStatus,
  }
}

function asSet(primary, secondary) {
  const value = primary ?? secondary
  if (value === undefined || value === null) return null
  return new Set(Array.isArray(value) ? value : [value])
}

function matchesFilters(state, filters = {}) {
  const systemIds = asSet(filters.systemIds, filters.systemId)
  const families = asSet(filters.serviceFamilies, filters.serviceFamily)
  const sections = asSet(filters.sections, filters.section)
  const levels = asSet(filters.alertLevels, filters.alertLevel)
  const bioregions = asSet(filters.bioregionIds, filters.bioregionId)
  const freshness = asSet(filters.freshnessValues, filters.freshness)
  if (systemIds && !systemIds.has(state.id)) return false
  if (families && !families.has(state.serviceFamily)) return false
  if (sections && !sections.has(state.serviceDefinition.section)) return false
  if (levels && !levels.has(state.alert.level)) return false
  if (bioregions && !bioregions.has(state.bioregionId)) return false
  if (freshness && !freshness.has(state.freshness)) return false
  if (filters.deepCases === true && !state.deepCase) return false
  if (filters.deepCases === false && state.deepCase) return false
  return true
}

export function observationEventsFor(dayIndex = REPLAY_WINDOW.days - 1, filters = {}) {
  assertDayIndex(dayIndex)
  const systemIds = asSet(filters.systemIds, filters.systemId)
  return observationEvents
    .filter((event) => !systemIds || systemIds.has(event.serviceSystemId))
    .map((event) => eventAtDay(event, dayIndex))
    .filter(Boolean)
}

function alertCounts(systems) {
  return Object.fromEntries(
    ALERT_LEVELS.map((level) => [
      level,
      systems.filter((system) => system.alert.level === level).length,
    ]),
  )
}

/**
 * Derive the coordinated state for one replay day. There is deliberately no
 * global health score in this return value; counts retain the kind of claim.
 */
export function deriveSnapshot(dayIndex = REPLAY_WINDOW.days - 1, filters = {}) {
  assertDayIndex(dayIndex)
  const systems = SERVICE_SYSTEMS.map((system) => deriveSystemState(system, dayIndex)).filter(
    (state) => matchesFilters(state, filters),
  )
  const countsByAlertLevel = alertCounts(systems)
  const warningOrHigherCount = systems.filter(
    (system) => ALERT_LEVEL_RANK[system.alert.level] >= ALERT_LEVEL_RANK.Warning,
  ).length
  const activeAlerts = systems
    .filter((system) => system.alert.level !== "Observe")
    .map((system) => system.alert)
    .sort(
      (left, right) =>
        ALERT_LEVEL_RANK[right.level] - ALERT_LEVEL_RANK[left.level] ||
        left.serviceSystemId.localeCompare(right.serviceSystemId),
    )
  const selectedIds = systems.map((system) => system.id)
  const regionCount = new Set(systems.map((system) => system.bioregionId)).size
  return {
    snapshotId: `${SOURCE_MANIFEST.snapshot}:day-${String(dayIndex).padStart(3, "0")}`,
    mode: "curated-replay",
    notice: ILLUSTRATIVE_DATA_NOTICE,
    dayIndex,
    date: REPLAY_DATES[dayIndex],
    timestamp: isoAtDay(dayIndex),
    systems,
    alerts: activeAlerts,
    events: observationEventsFor(dayIndex, { systemIds: selectedIds }),
    summary: {
      monitoredSystemCount: systems.length,
      bioregionCount: regionCount,
      countsByAlertLevel,
      warningOrHigherCount,
      staleSystemCount: systems.filter((system) => system.freshness === "stale").length,
      sentence: `${warningOrHigherCount} service ${warningOrHigherCount === 1 ? "system is" : "systems are"} at Warning or Action across ${regionCount} ${regionCount === 1 ? "bioregion" : "bioregions"}.`,
    },
    aggregationPolicy: {
      globalScorePermitted: false,
      crossUnitAggregationPermitted: false,
      unknownPresentedAsHealthy: false,
      statement: "Count like claims. Do not average unlike services.",
    },
  }
}

/**
 * A daily series with observations, an authored reference envelope,
 * uncertainty and alert lifecycle marks ready for StreamXYFrame.
 */
export function pulseSeriesFor(systemId, dayIndex = REPLAY_WINDOW.days - 1) {
  assertDayIndex(dayIndex)
  const system = SERVICE_SYSTEM_BY_ID[systemId]
  if (!system) throw new Error(`Unknown service system: ${systemId}`)
  const config = SYSTEM_CONFIG[systemId]
  const state = deriveSystemState(system, dayIndex)
  const points = []
  for (let index = 0; index <= dayIndex; index += 1) {
    const valueDay = Math.min(index, config.dataEndDay ?? index)
    const dataGap = config.dataEndDay !== undefined && index > config.dataEndDay
    const { freshness } = freshnessFor(config, index)
    const value = valueAt(config.metric.curve, valueDay)
    const observed = (index % config.cadence === 0 || index === config.dataEndDay) && !dataGap
    points.push({
      id: `${systemId}:pulse:${index}`,
      serviceSystemId: systemId,
      dayIndex: index,
      date: REPLAY_DATES[index],
      timestamp: isoAtDay(index),
      value: dataGap ? null : round(value),
      carriedValue: dataGap ? round(value) : undefined,
      observedValue: observed ? round(value) : undefined,
      lower: dataGap ? null : round(value - config.metric.uncertainty),
      upper: dataGap ? null : round(value + config.metric.uncertainty),
      referenceLow: round(valueAt(config.metric.referenceLow, index)),
      referenceHigh: round(valueAt(config.metric.referenceHigh, index)),
      estimateType: observed ? config.metric.method : "modeled",
      evidenceRole: config.metric.evidenceRole,
      confidence: config.metric.confidence,
      freshness,
      sourceIds: [...config.metric.sourceIds],
      dataGap,
      thresholdState:
        systemId === SERVICE_SYSTEM_IDS.coral
          ? value >= 8
            ? "action"
            : value >= 4
              ? "warning"
              : "below"
          : null,
    })
  }
  return {
    systemId,
    indicatorId: config.metric.indicatorId,
    label: config.metric.label,
    unit: config.metric.unit,
    direction: config.metric.direction,
    evidenceRole: config.metric.evidenceRole,
    points,
    thresholds: systemId === SERVICE_SYSTEM_IDS.coral ? [THRESHOLD_BY_ID["coral-heat-dhw"]] : [],
    alertEvents: state.alert.lifecycle,
    notice: ILLUSTRATIVE_DATA_NOTICE,
  }
}

const LEDGER_DIMENSIONS = Object.freeze([
  ["ecologicalSupply", "Ecological supply"],
  ["anthropogenicContribution", "Human contribution"],
  ["demand", "Demand"],
  ["use", "Use"],
  ["instrumentalValue", "Instrumental value"],
  ["relationalValue", "Relational value"],
])

export function ledgerRowsFor(systemId, dayIndex = REPLAY_WINDOW.days - 1) {
  assertDayIndex(dayIndex)
  const system = SERVICE_SYSTEM_BY_ID[systemId]
  if (!system) throw new Error(`Unknown service system: ${systemId}`)
  const state = deriveSystemState(system, dayIndex)
  return LEDGER_DIMENSIONS.map(([dimension, label]) => {
    const estimate = state.eesv[dimension]
    let note = ""
    if (dimension === "ecologicalSupply" && systemId === SERVICE_SYSTEM_IDS.pollination) {
      note = "Wild habitat capacity only. Managed hives are next door."
    } else if (
      dimension === "anthropogenicContribution" &&
      systemId === SERVICE_SYSTEM_IDS.pollination
    ) {
      note = "Managed hives cover part of the modeled gap."
    } else if (dimension === "relationalValue" && !estimate) {
      note = "Not assessed. Missing is not zero."
    } else if (dimension === "demand" && !state.supplyDemandComparable) {
      note = "Supply and demand do not share a defensible unit."
    }
    return {
      id: `${systemId}:ledger:${dimension}`,
      serviceSystemId: systemId,
      dimension,
      label,
      estimate: estimate ?? null,
      status: estimate ? estimate.freshness : "not-assessed",
      supplyDemandComparable: state.supplyDemandComparable,
      note,
    }
  })
}

function node(id, label, kind, extra = {}) {
  return { id, label, kind, ...extra }
}

function edge(id, source, target, relation, extra = {}) {
  return { id, source, target, relation, ...extra }
}

function flagshipNetworks(systemId) {
  if (systemId === SERVICE_SYSTEM_IDS.coral) {
    return {
      dependency: {
        mode: "what-depends-on-it",
        nodes: [
          node("coral:heat", "Accumulated heat", "pressure"),
          node("coral:reef", "Reef 14 condition", "ecosystem-condition"),
          node("coral:rugosity", "Reef structure", "ecological-capacity"),
          node("coral:waves", "Wave attenuation", "service-flow"),
          node("coral:protection", "Coastal protection", "service"),
          node("coral:homes", "Homes and roads", "beneficiary"),
          node("coral:fisheries", "Small-scale fisheries", "beneficiary"),
          node("coral:tourism", "Tourism livelihoods", "beneficiary"),
        ],
        edges: [
          edge("coral:dep:heat", "coral:heat", "coral:reef", "pressures", {
            edgeType: "pressure",
          }),
          edge("coral:dep:structure", "coral:reef", "coral:rugosity", "supports"),
          edge("coral:dep:waves", "coral:rugosity", "coral:waves", "attenuates"),
          edge("coral:dep:protection", "coral:waves", "coral:protection", "delivers"),
          edge("coral:dep:homes", "coral:protection", "coral:homes", "benefits"),
          edge("coral:dep:fish", "coral:reef", "coral:fisheries", "supports"),
          edge("coral:dep:tourism", "coral:reef", "coral:tourism", "supports"),
        ],
        paths: [
          ["coral:reef", "coral:rugosity", "coral:waves", "coral:protection", "coral:homes"],
          ["coral:reef", "coral:fisheries"],
          ["coral:reef", "coral:tourism"],
        ],
      },
      evidence: {
        mode: "how-do-we-know",
        nodes: [
          node("coral:noaa", "NOAA Coral Reef Watch", "source"),
          node("coral:dhw", "Degree Heating Weeks", "indicator"),
          node("coral:threshold", "4 / 8 °C-week registry", "threshold"),
          node("coral:evaluation", "Threshold evaluation", "evaluation"),
          node("coral:alert", "Reef heat alert", "alert"),
          node("coral:model", "Protection translation model", "model"),
          node("coral:estimate", "Protection capacity estimate", "estimate"),
        ],
        edges: [
          edge("coral:evidence:source", "coral:noaa", "coral:dhw", "derives"),
          edge("coral:evidence:value", "coral:dhw", "coral:evaluation", "evaluated by"),
          edge("coral:evidence:threshold", "coral:threshold", "coral:evaluation", "defines"),
          edge("coral:evidence:alert", "coral:evaluation", "coral:alert", "issues"),
          edge("coral:evidence:model", "coral:dhw", "coral:model", "informs"),
          edge("coral:evidence:estimate", "coral:model", "coral:estimate", "estimates"),
        ],
        paths: [
          ["coral:noaa", "coral:dhw", "coral:evaluation", "coral:alert"],
          ["coral:threshold", "coral:evaluation", "coral:alert"],
          ["coral:noaa", "coral:dhw", "coral:model", "coral:estimate"],
        ],
      },
    }
  }
  if (systemId === SERVICE_SYSTEM_IDS.forest) {
    return {
      dependency: {
        mode: "what-depends-on-it",
        nodes: [
          node("forest:disturbance", "Disturbance event", "pressure"),
          node("forest:canopy", "Central Congo canopy", "ecosystem-condition"),
          node("forest:biomass", "Biomass retention", "ecological-capacity"),
          node("forest:climate", "Climate regulation", "service"),
          node("forest:rain", "Regional rainfall pattern", "dependency"),
          node("forest:livelihoods", "Forest-linked livelihoods", "beneficiary"),
        ],
        edges: [
          edge("forest:dep:pressure", "forest:disturbance", "forest:canopy", "pressures", {
            edgeType: "pressure",
          }),
          edge("forest:dep:biomass", "forest:canopy", "forest:biomass", "supports"),
          edge("forest:dep:climate", "forest:biomass", "forest:climate", "contributes to"),
          edge("forest:dep:rain", "forest:climate", "forest:rain", "influences"),
          edge("forest:dep:livelihoods", "forest:canopy", "forest:livelihoods", "supports"),
        ],
        paths: [
          ["forest:canopy", "forest:biomass", "forest:climate", "forest:rain"],
          ["forest:canopy", "forest:livelihoods"],
        ],
      },
      evidence: {
        mode: "how-do-we-know",
        nodes: [
          node("forest:glad", "GLAD alert", "source"),
          node("forest:event", "Disturbance event", "pressure"),
          node("forest:modis", "MODIS GPP context", "source"),
          node("forest:review", "Corroboration gate", "evaluation"),
          node("forest:watch", "Pressure Watch", "alert"),
          node("forest:gap", "Service implication unobserved", "evidence-gap"),
        ],
        edges: [
          edge("forest:evidence:glad", "forest:glad", "forest:event", "detects"),
          edge("forest:evidence:review-a", "forest:event", "forest:review", "enters"),
          edge("forest:evidence:review-b", "forest:modis", "forest:review", "provides context"),
          edge("forest:evidence:watch", "forest:review", "forest:watch", "supports"),
          edge("forest:evidence:gap", "forest:watch", "forest:gap", "does not resolve"),
        ],
        paths: [
          ["forest:glad", "forest:event", "forest:review", "forest:watch"],
          ["forest:modis", "forest:review", "forest:watch"],
          ["forest:watch", "forest:gap"],
        ],
      },
    }
  }
  if (systemId === SERVICE_SYSTEM_IDS.pollination) {
    return {
      dependency: {
        mode: "what-depends-on-it",
        nodes: [
          node("pollination:habitat", "Pollinator habitat", "ecosystem-condition"),
          node("pollination:wild", "Wild pollinator capacity", "ecological-capacity"),
          node("pollination:hives", "Managed hives", "anthropogenic-contribution"),
          node("pollination:demand", "Crop bloom demand", "demand"),
          node("pollination:service", "Realized pollination", "service-flow"),
          node("pollination:crops", "Crop production", "beneficiary"),
          node("pollination:growers", "Grower livelihoods", "beneficiary"),
        ],
        edges: [
          edge("pollination:dep:wild", "pollination:habitat", "pollination:wild", "supports"),
          edge(
            "pollination:dep:wild-service",
            "pollination:wild",
            "pollination:service",
            "supplies",
          ),
          edge("pollination:dep:hives", "pollination:hives", "pollination:service", "supplements"),
          edge("pollination:dep:demand", "pollination:demand", "pollination:service", "draws on"),
          edge("pollination:dep:crops", "pollination:service", "pollination:crops", "supports"),
          edge("pollination:dep:growers", "pollination:crops", "pollination:growers", "supports"),
        ],
        paths: [
          ["pollination:habitat", "pollination:wild", "pollination:service", "pollination:crops"],
          ["pollination:hives", "pollination:service", "pollination:crops", "pollination:growers"],
          ["pollination:demand", "pollination:service"],
        ],
      },
      evidence: {
        mode: "how-do-we-know",
        nodes: [
          node("pollination:habitat-input", "Habitat observations", "source"),
          node("pollination:crop-input", "Crop acreage", "source"),
          node("pollination:hive-input", "Managed hive reports", "source"),
          node("pollination:model", "Pollination adequacy model", "model"),
          node("pollination:watch", "Modeled gap Watch", "alert"),
        ],
        edges: [
          edge(
            "pollination:evidence:habitat",
            "pollination:habitat-input",
            "pollination:model",
            "parameterizes",
          ),
          edge(
            "pollination:evidence:crop",
            "pollination:crop-input",
            "pollination:model",
            "parameterizes",
          ),
          edge(
            "pollination:evidence:hive",
            "pollination:hive-input",
            "pollination:model",
            "parameterizes",
          ),
          edge("pollination:evidence:watch", "pollination:model", "pollination:watch", "supports"),
        ],
        paths: [
          ["pollination:habitat-input", "pollination:model", "pollination:watch"],
          ["pollination:crop-input", "pollination:model", "pollination:watch"],
          ["pollination:hive-input", "pollination:model", "pollination:watch"],
        ],
      },
    }
  }
  return null
}

function genericNetworks(system) {
  const config = SYSTEM_CONFIG[system.id]
  const prefix = system.stationId.toLowerCase().replaceAll(" ", "-")
  const sourceIds = config.metric.sourceIds
  const dependencyNodes = [
    node(`${prefix}:asset`, system.shortName, "ecosystem-condition"),
    node(`${prefix}:capacity`, config.metric.label, "ecological-capacity"),
    node(`${prefix}:service`, system.serviceName, "service"),
    node(`${prefix}:beneficiary`, system.beneficiaries.label, "beneficiary"),
  ]
  const evidenceNodes = [
    ...sourceIds.map((sourceId) =>
      node(
        `${prefix}:source:${sourceId}`,
        SOURCE_ENTRIES.find((source) => source.id === sourceId)?.name ?? sourceId,
        "source",
      ),
    ),
    node(`${prefix}:indicator`, config.metric.label, "indicator"),
    node(`${prefix}:evaluation`, "System-specific evaluation", "evaluation"),
    node(`${prefix}:claim`, "Current claim", "alert"),
  ]
  return {
    dependency: {
      mode: "what-depends-on-it",
      nodes: dependencyNodes,
      edges: [
        edge(`${prefix}:dep:capacity`, `${prefix}:asset`, `${prefix}:capacity`, "supports"),
        edge(`${prefix}:dep:service`, `${prefix}:capacity`, `${prefix}:service`, "delivers"),
        edge(`${prefix}:dep:benefit`, `${prefix}:service`, `${prefix}:beneficiary`, "benefits"),
      ],
      paths: [
        [`${prefix}:asset`, `${prefix}:capacity`, `${prefix}:service`, `${prefix}:beneficiary`],
      ],
    },
    evidence: {
      mode: "how-do-we-know",
      nodes: evidenceNodes,
      edges: [
        ...sourceIds.map((sourceId, index) =>
          edge(
            `${prefix}:evidence:source:${index}`,
            `${prefix}:source:${sourceId}`,
            `${prefix}:indicator`,
            "informs",
          ),
        ),
        edge(
          `${prefix}:evidence:evaluate`,
          `${prefix}:indicator`,
          `${prefix}:evaluation`,
          "evaluated by",
        ),
        edge(`${prefix}:evidence:claim`, `${prefix}:evaluation`, `${prefix}:claim`, "supports"),
      ],
      paths: sourceIds.map((sourceId) => [
        `${prefix}:source:${sourceId}`,
        `${prefix}:indicator`,
        `${prefix}:evaluation`,
        `${prefix}:claim`,
      ]),
    },
  }
}

function cloneNetwork(network) {
  return {
    mode: network.mode,
    nodes: network.nodes.map((entry) => ({ ...entry })),
    edges: network.edges.map((entry) => ({ ...entry })),
    paths: network.paths.map((path) => [...path]),
  }
}

/** Return both forward dependency and backward evidence paths. */
export function networksFor(systemId) {
  const system = SERVICE_SYSTEM_BY_ID[systemId]
  if (!system) throw new Error(`Unknown service system: ${systemId}`)
  const authored = flagshipNetworks(systemId) ?? genericNetworks(system)
  return {
    systemId,
    dependency: cloneNetwork(authored.dependency),
    evidence: cloneNetwork(authored.evidence),
  }
}
