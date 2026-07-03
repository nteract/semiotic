import { unitize } from "semiotic/recipes"

export const DATA_CENTER_AS_OF = "2026-07-03"
export const CHATGPT_RELEASE = "2022-11-30"

export const STATUS_META = {
  legacy: {
    label: "Operating before ChatGPT",
    shortLabel: "Pre-2022 operating",
    color: "#34383b",
  },
  new: {
    label: "Opened after ChatGPT",
    shortLabel: "Post-2022 operating",
    color: "#4f8999",
  },
  construction: {
    label: "Under construction",
    shortLabel: "Building now",
    color: "#d72f3f",
  },
  planned: {
    label: "Announced or selected",
    shortLabel: "Planned",
    color: "#d8ad43",
  },
}

const CBRE_SOURCE =
  "https://www.cbre.com/insights/reports/global-data-center-trends-2024"

export const DATA_CENTER_SITES = [
  {
    id: "northern-virginia",
    label: "Northern Virginia",
    operator: "Multi-operator market",
    lon: -77.48,
    lat: 39.04,
    status: "legacy",
    milestone: "Established hyperscale market before 2022",
    powerMW: null,
    powerLabel: "Virginia’s 2024 fleet: ~5 GW across ~340 buildings",
    computeLabel: "Operator and accelerator totals are not disclosed",
    jobsLabel: "Statewide economic impact is not a facility headcount",
    waterLabel: "Virginia data centers used ~2.1B gal in 2023; about one-third reclaimed",
    sourceLabel: "Virginia JLARC, 2024",
    source:
      "https://rga.lis.virginia.gov/Published/2025/RD206/PDF",
    caveat:
      "The 5 GW figure is statewide 2024 demand, not Northern Virginia-only capacity and not all pre-2022.",
  },
  {
    id: "silicon-valley",
    label: "Silicon Valley",
    operator: "Multi-operator market",
    lon: -121.89,
    lat: 37.34,
    status: "legacy",
    milestone: "Established colocation and cloud market before 2022",
    powerMW: null,
    powerLabel: "No single public market-wide MW denominator",
    computeLabel: "Not disclosed across operators",
    jobsLabel: "Not comparable across operators",
    waterLabel: "No audited market-wide total used here",
    sourceLabel: "CBRE Global Data Center Trends, 2024",
    source: CBRE_SOURCE,
  },
  {
    id: "dallas",
    label: "Dallas–Fort Worth",
    operator: "Multi-operator market",
    lon: -96.8,
    lat: 32.78,
    status: "legacy",
    milestone: "Established colocation and cloud market before 2022",
    powerMW: null,
    powerLabel: "No single public market-wide MW denominator",
    computeLabel: "Not disclosed across operators",
    jobsLabel: "Not comparable across operators",
    waterLabel: "No audited market-wide total used here",
    sourceLabel: "CBRE Global Data Center Trends, 2024",
    source: CBRE_SOURCE,
  },
  {
    id: "chicago",
    label: "Chicago",
    operator: "Multi-operator market",
    lon: -87.63,
    lat: 41.88,
    status: "legacy",
    milestone: "Established colocation and cloud market before 2022",
    powerMW: null,
    powerLabel: "No single public market-wide MW denominator",
    computeLabel: "Not disclosed across operators",
    jobsLabel: "Not comparable across operators",
    waterLabel: "No audited market-wide total used here",
    sourceLabel: "CBRE Global Data Center Trends, 2024",
    source: CBRE_SOURCE,
  },
  {
    id: "phoenix",
    label: "Phoenix",
    operator: "Multi-operator market",
    lon: -112.07,
    lat: 33.45,
    status: "legacy",
    milestone: "Established data-center market before 2022",
    powerMW: null,
    powerLabel: "No single public market-wide MW denominator",
    computeLabel: "Not disclosed across operators",
    jobsLabel: "Not comparable across operators",
    waterLabel: "No audited market-wide total used here",
    sourceLabel: "CBRE Global Data Center Trends, 2024",
    source: CBRE_SOURCE,
  },
  {
    id: "colossus",
    label: "Colossus 1 · Memphis",
    operator: "xAI",
    lon: -90.05,
    lat: 35.05,
    status: "new",
    milestone: "Operating; first workloads in 2024",
    powerMW: 150,
    powerLabel: "150 MW utility service disclosed by MLGW",
    computeLabel: "Over 220,000 H100/H200/GB200 GPUs reported in May 2026",
    jobsLabel: "xAI says hundreds of permanent jobs; exact count not disclosed",
    waterLabel: "Facility consumption not disclosed; a shared recycled-water plant is proposed",
    sourceLabel: "xAI + MLGW",
    source: "https://x.ai/colossus",
    secondarySource:
      "https://www.mlgw.com/images/content/files/pdf/new/xAI%202025%20Update.pdf",
    caveat:
      "GPU and grid-service numbers come from separate disclosures and should not be read as simultaneous peak load.",
  },
  {
    id: "fairwater",
    label: "Fairwater · Wisconsin",
    operator: "Microsoft",
    lon: -87.91,
    lat: 42.73,
    status: "new",
    milestone: "Fully operational June 23, 2026",
    powerMW: null,
    powerLabel: "Site MW capacity not publicly disclosed",
    computeLabel: "Microsoft says hundreds of thousands of NVIDIA GPUs",
    jobsLabel: "Nearly 550 full-time onsite; nearly 10,000 construction workers",
    waterLabel: "Closed-loop liquid cooling; 90% of capacity has no evaporation loss",
    sourceLabel: "Microsoft, June 2026",
    source:
      "https://news.microsoft.com/source/2026/06/23/microsoft-completes-construction-on-first-datacenter-facility-in-mount-pleasant-wisconsin/",
  },
  {
    id: "abilene",
    label: "Stargate · Abilene",
    operator: "OpenAI / Oracle / Crusoe",
    lon: -99.73,
    lat: 32.45,
    status: "new",
    milestone: "Operating and expanding; first workloads in 2025",
    powerMW: 206,
    powerLabel: "206 MW initial building; campus planned for 1.2 GW",
    computeLabel: "GB200 racks delivered; rack count not disclosed",
    jobsLabel: "Site-specific permanent headcount not disclosed",
    waterLabel: "Site water consumption not publicly disclosed",
    sourceLabel: "Crusoe Impact Report + OpenAI",
    source: "https://crusoe.ai/pdfs/Crusoe_Impact_Report_2024.pdf",
    secondarySource: "https://openai.com/index/five-new-stargate-sites/",
    caveat:
      "Only the initial 206 MW is encoded on the map; 1.2 GW is the campus buildout figure.",
  },
  {
    id: "hyperion",
    label: "Hyperion · Richland Parish",
    operator: "Meta",
    lon: -91.76,
    lat: 32.42,
    status: "construction",
    milestone: "Under construction since December 2024",
    powerMW: null,
    powerLabel: "Described by Meta as multi-gigawatt; exact site capacity not disclosed",
    computeLabel: "Planned as Meta’s largest AI training cluster",
    jobsLabel: "5,000 peak construction; more than 500 operational jobs",
    waterLabel: "Consumption not disclosed; Meta pledges watershed restoration equal to use",
    sourceLabel: "Meta, December 2025",
    source:
      "https://about.fb.com/news/2025/12/metas-richland-parish-data-center-supports-louisiana-economy-875-million-in-contracts/",
  },
  {
    id: "milam",
    label: "Stargate · Milam County",
    operator: "OpenAI / SB Energy",
    lon: -97.0,
    lat: 30.83,
    status: "construction",
    milestone: "Initial facilities under construction; service expected from 2026",
    powerMW: 1200,
    powerLabel: "1.2 GW lease disclosed January 2026",
    computeLabel: "GPU count not disclosed",
    jobsLabel: "Thousands of construction jobs; permanent count not disclosed",
    waterLabel: "Site water demand not publicly disclosed",
    sourceLabel: "OpenAI / SB Energy, January 2026",
    source: "https://openai.com/index/stargate-sb-energy-partnership/",
  },
  {
    id: "lordstown",
    label: "Stargate · Lordstown",
    operator: "OpenAI / SoftBank",
    lon: -80.86,
    lat: 41.17,
    status: "construction",
    milestone: "Ground broken; under development as of January 2026",
    powerMW: null,
    powerLabel: "Only a combined 1.5 GW scale figure was disclosed for two SoftBank sites",
    computeLabel: "GPU count not disclosed",
    jobsLabel: "Site-specific counts not disclosed",
    waterLabel: "Site water demand not publicly disclosed",
    sourceLabel: "OpenAI, September 2025",
    source: "https://openai.com/index/five-new-stargate-sites/",
  },
  {
    id: "shackelford",
    label: "Stargate · Shackelford County",
    operator: "OpenAI / Oracle",
    lon: -99.35,
    lat: 32.74,
    status: "planned",
    milestone: "Selected and announced; site-level operation not confirmed",
    powerMW: null,
    powerLabel: "Part of a combined >5.5 GW group; no site allocation disclosed",
    computeLabel: "GPU count not disclosed",
    jobsLabel: "Only a five-site combined jobs estimate was disclosed",
    waterLabel: "Site water demand not publicly disclosed",
    sourceLabel: "OpenAI, September 2025",
    source: "https://openai.com/index/five-new-stargate-sites/",
  },
  {
    id: "dona-ana",
    label: "Stargate · Doña Ana County",
    operator: "OpenAI / Oracle",
    lon: -106.76,
    lat: 32.35,
    status: "planned",
    milestone: "Selected and announced; site-level operation not confirmed",
    powerMW: null,
    powerLabel: "Part of a combined >5.5 GW group; no site allocation disclosed",
    computeLabel: "GPU count not disclosed",
    jobsLabel: "Only a five-site combined jobs estimate was disclosed",
    waterLabel: "Site water demand not publicly disclosed",
    sourceLabel: "OpenAI, September 2025",
    source: "https://openai.com/index/five-new-stargate-sites/",
  },
]

export const HYPERSCALE_CAPACITY = [
  {
    id: "united-states",
    label: "United States",
    share: 54,
    note: "54% of worldwide operational hyperscale critical IT load",
    exactness: "reported",
  },
  {
    id: "china",
    label: "China",
    share: 15,
    note: "Rounded from roughly one-third of the 46% balance after the United States",
    exactness: "approximate",
  },
  {
    id: "europe",
    label: "Europe",
    share: 15,
    note: "Approximately one-third of the 46% balance after the United States",
    exactness: "approximate",
  },
  {
    id: "other",
    label: "Other regions",
    share: 16,
    note: "Remainder after the published rounded shares",
    exactness: "derived remainder",
  },
]

export const MODEL_COMPUTE = [
  {
    id: "gpt-3",
    model: "GPT-3",
    year: 2020,
    compute: 3.14e23,
    computeLabel: "3.14 × 10²³ FLOP",
    mmlu: 43.9,
    relative: 1,
    era: "before",
    sourceLabel: "Brown et al., 2020",
    source: "https://arxiv.org/abs/2005.14165",
  },
  {
    id: "palm",
    model: "PaLM 540B",
    year: 2022,
    compute: 2.527e24,
    computeLabel: "2.53 × 10²⁴ FLOP",
    mmlu: 69.3,
    relative: 8.05,
    era: "before",
    sourceLabel: "Chowdhery et al., 2022",
    source: "https://arxiv.org/abs/2204.02311",
  },
  {
    id: "llama-3-1",
    model: "Llama 3.1 405B",
    year: 2024,
    compute: 3.8e25,
    computeLabel: "≈3.8 × 10²⁵ FLOP",
    mmlu: 88.6,
    relative: 121,
    era: "after",
    sourceLabel: "Meta model card and training configuration",
    source: "https://huggingface.co/meta-llama/Llama-3.1-405B",
    caveat: "Training FLOP is an estimate from the published training configuration.",
  },
]

export const NATIONAL_RESOURCES = {
  electricityTWh: 176,
  electricityShare: 4.4,
  acceleratedServerTWh: 40,
  directWaterBillionGallons: 17,
  indirectWaterBillionGallons: 211,
  projected2028LowTWh: 325,
  projected2028HighTWh: 580,
  typicalFacilityJobs: 50,
  source:
    "https://energyanalysis.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report",
  jobsSource:
    "https://rga.lis.virginia.gov/Published/2025/RD206/PDF",
}

export const US_OUTLINE = {
  type: "Feature",
  properties: { name: "Contiguous United States (schematic)" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-124.7, 48.5], [-110.0, 49.0], [-96.0, 49.0], [-89.0, 48.0],
      [-83.0, 46.0], [-72.0, 47.0], [-67.0, 45.0], [-75.0, 38.0],
      [-77.0, 34.5], [-80.0, 31.0], [-80.0, 27.0], [-82.0, 25.3],
      [-85.0, 29.5], [-90.0, 29.0], [-97.0, 26.0], [-103.0, 29.0],
      [-106.5, 31.8], [-111.0, 31.3], [-117.0, 32.5], [-122.3, 37.2],
      [-124.3, 40.5], [-124.0, 42.0], [-122.5, 46.0], [-124.7, 48.5],
    ]],
  },
}

// Schematic Great Lakes lobes for the hatched-water base map. Rings follow
// the same winding as US_OUTLINE (eastward along their north edge) — d3-geo
// polygons are spherical, and a backwards ring claims the whole globe.
export const GREAT_LAKES = {
  type: "Feature",
  properties: { name: "Great Lakes (schematic)" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [[[-92.1, 46.7], [-89.6, 47.9], [-87.4, 47.2], [-84.9, 46.5], [-88.5, 46.0], [-92.1, 46.7]]],
      [[[-87.8, 45.9], [-86.9, 45.8], [-86.1, 44.2], [-86.4, 41.9], [-87.3, 43.0], [-87.8, 45.9]]],
      [[[-84.6, 45.9], [-83.4, 45.3], [-82.2, 44.3], [-82.5, 43.0], [-83.9, 43.9], [-84.9, 45.4], [-84.6, 45.9]]],
      [[[-83.1, 42.1], [-83.1, 42.6], [-79.6, 43.9], [-75.9, 44.0], [-76.4, 43.5], [-79.2, 43.3], [-78.9, 42.8], [-80.5, 42.4], [-83.1, 42.1]]],
    ],
  },
}

// Five schematic west-to-east relief sections, after the 1943 ISOTYPE
// spread "Altitude and Vegetation, United States." Each profile is a
// normalized polyline: t runs 0→1 across the section's west-to-east land
// extent at that latitude, elevation is a fraction of PROFILE_MAX_FEET.
// They exist to give the buildings a landscape to stand on — they are
// generalized relief, not survey data.
export const PROFILE_MAX_FEET = 14000

export const MAP_SECTIONS = [
  {
    id: "section-43",
    latitude: 43,
    label: "ALONG 43°N",
    profile: [
      [0, 0.03], [0.03, 0.34], [0.06, 0.6], [0.09, 0.3], [0.13, 0.42],
      [0.18, 0.72], [0.23, 0.58], [0.3, 0.42], [0.42, 0.26], [0.52, 0.12],
      [0.6, 0.05], [0.72, 0.05], [0.8, 0.1], [0.86, 0.3], [0.92, 0.16], [1, 0.04],
    ],
  },
  {
    id: "section-39",
    latitude: 39.5,
    label: "ALONG 39°N",
    profile: [
      [0, 0.04], [0.05, 0.3], [0.08, 0.78], [0.12, 0.5], [0.2, 0.48],
      [0.28, 0.62], [0.34, 1.0], [0.4, 0.6], [0.5, 0.34], [0.62, 0.16],
      [0.7, 0.08], [0.78, 0.07], [0.87, 0.14], [0.91, 0.3], [0.95, 0.12], [1, 0.03],
    ],
  },
  {
    id: "section-36",
    latitude: 36,
    label: "ALONG 36°N",
    profile: [
      [0, 0.05], [0.04, 0.26], [0.07, 0.2], [0.1, 0.86], [0.14, 0.24],
      [0.2, 0.5], [0.3, 0.52], [0.38, 0.36], [0.5, 0.22], [0.62, 0.1],
      [0.69, 0.02], [0.76, 0.12], [0.82, 0.3], [0.9, 0.12], [1, 0.03],
    ],
  },
  {
    id: "section-33",
    latitude: 33,
    label: "ALONG 33°N",
    profile: [
      [0, 0.04], [0.04, 0.36], [0.1, 0.22], [0.19, 0.42], [0.28, 0.52],
      [0.36, 0.32], [0.48, 0.2], [0.58, 0.12], [0.7, 0.03], [0.8, 0.1],
      [0.86, 0.16], [0.93, 0.08], [1, 0.03],
    ],
  },
  {
    id: "section-30",
    latitude: 30.2,
    label: "ALONG 30°N",
    profile: [
      [0, 0.14], [0.06, 0.26], [0.14, 0.18], [0.28, 0.16], [0.34, 0.1],
      [0.45, 0.05], [0.55, 0.02], [0.7, 0.03], [0.85, 0.03], [1, 0.02],
    ],
  },
]

// West-to-east land extent of a schematic outline at a given latitude:
// every polygon edge crossing the parallel contributes a longitude, and the
// section spans the outermost pair (the coarse outline has no Gulf gap).
export function outlineExtentAtLatitude(feature, latitude) {
  const geometry = feature?.geometry
  if (!geometry) return null
  const rings =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates.flat()
        : []
  const crossings = []
  for (const ring of rings) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [lon1, lat1] = ring[index]
      const [lon2, lat2] = ring[index + 1]
      if (lat1 === lat2) continue
      const t = (latitude - lat1) / (lat2 - lat1)
      if (t >= 0 && t <= 1) crossings.push(lon1 + t * (lon2 - lon1))
    }
  }
  if (crossings.length < 2) return null
  return [Math.min(...crossings), Math.max(...crossings)]
}

// Linear interpolation along a normalized [t, elevation] profile polyline.
export function profileElevationAt(profile, t) {
  if (!profile?.length) return 0
  const clamped = Math.max(profile[0][0], Math.min(profile[profile.length - 1][0], t))
  for (let index = 0; index < profile.length - 1; index += 1) {
    const [t1, e1] = profile[index]
    const [t2, e2] = profile[index + 1]
    if (clamped >= t1 && clamped <= t2) {
      if (t2 === t1) return e2
      return e1 + ((clamped - t1) / (t2 - t1)) * (e2 - e1)
    }
  }
  return profile[profile.length - 1][1]
}

// One server sign per 100 disclosed megawatts, with a fractional final sign
// — the library's unitize tally, at this dataset's unit.
export function powerIconUnits(powerMW, unitMW = 100) {
  return unitize(powerMW ?? 0, { unit: unitMW }).units
}

export function sitesByStatus(statuses) {
  const allowed = new Set(statuses)
  return DATA_CENTER_SITES.filter((site) => allowed.has(site.status))
}
