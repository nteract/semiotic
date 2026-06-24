// Procedurally-generated stand-in for a satellite catalog, shaped to echo the
// real distribution behind Nadieh Bremer's "Satellites in Space": the U.S. and
// low Earth orbit dominate, geosynchronous orbit skews to communications,
// medium Earth orbit skews to navigation, and the launch-date channel skews
// recent (the Starlink era). Deterministic (seeded) so SSR, re-renders, and the
// recipe's packing cache all stay stable.

export const REGIONS = ["U.S.", "Western Europe", "China", "Russia", "Japan", "India", "Other"]

// Orbit rows, ordered bottom → top for the matrix (matches the print piece).
export const ORBITS = ["LEO", "MEO", "GEO", "Other"]
export const ORBIT_LABELS = {
  LEO: "Low Earth",
  MEO: "Medium Earth",
  GEO: "Geosynchronous",
  Other: "Other orbits",
}

export const CATEGORIES = [
  "Test and training",
  "Communications",
  "Imaging, surveillance & meteorology",
  "Navigation",
  "Research",
]

// Hues echo the original: amber / purple / green / red / blue.
export const CATEGORY_COLORS = {
  "Test and training": "#f4b223",
  Communications: "#7b52c9",
  "Imaging, surveillance & meteorology": "#33c08d",
  Navigation: "#e8425f",
  Research: "#3f74e6",
}

export const CLASSES = ["Business/commercial", "Civil", "Amateur/academic", "Defense"]

// Shape per class — the per-datum glyph channel.
export const CLASS_SYMBOLS = {
  "Business/commercial": "circle",
  Civil: "star",
  "Amateur/academic": "triangle",
  Defense: "chevron",
}

// Inner-icon per class for the composite-glyph model: most satellites are plain
// filled circles (Business/commercial, the majority); only these classes carry a
// stroked icon inside the circle. Business/commercial is intentionally absent.
export const CLASS_ICONS = {
  Civil: "star",
  "Amateur/academic": "triangle",
  Defense: "chevron",
}

// A few real, named satellites the demo points callouts at. Injected into
// plausible region/orbit cells so the leader lines have something to anchor to.
const NOTABLE = [
  { name: "X-37B OTV-6", region: "U.S.", orbit: "LEO", category: "Test and training", klass: "Defense", mass: 4990 },
  { name: "USA 245", region: "U.S.", orbit: "LEO", category: "Imaging, surveillance & meteorology", klass: "Defense", mass: 13000 },
  { name: "Hubble Space Telescope", region: "U.S.", orbit: "LEO", category: "Research", klass: "Civil", mass: 11110 },
  { name: "Cosmos 2542", region: "Russia", orbit: "LEO", category: "Imaging, surveillance & meteorology", klass: "Defense", mass: 3960 },
  { name: "Cosmos 2543", region: "Russia", orbit: "LEO", category: "Imaging, surveillance & meteorology", klass: "Defense", mass: 720 },
]

// Mass legend stops (kg) and the launch-date window.
export const MASS_STOPS = [100, 1000, 5000]
export const LAUNCH_START = "1974-11-15"
export const LAUNCH_END = "2020-08-31"

// Approximate per-region totals (sum ≈ 2,956).
const REGION_TOTALS = {
  "U.S.": 1400,
  "Western Europe": 330,
  China: 380,
  Russia: 170,
  Japan: 80,
  India: 96,
  Other: 500,
}

// Per-region orbit mix.
const ORBIT_WEIGHTS = {
  "U.S.": { LEO: 0.74, MEO: 0.03, GEO: 0.16, Other: 0.07 },
  "Western Europe": { LEO: 0.55, MEO: 0.05, GEO: 0.33, Other: 0.07 },
  China: { LEO: 0.55, MEO: 0.1, GEO: 0.28, Other: 0.07 },
  Russia: { LEO: 0.45, MEO: 0.18, GEO: 0.25, Other: 0.12 },
  Japan: { LEO: 0.5, MEO: 0.03, GEO: 0.4, Other: 0.07 },
  India: { LEO: 0.45, MEO: 0.05, GEO: 0.4, Other: 0.1 },
  Other: { LEO: 0.7, MEO: 0.05, GEO: 0.2, Other: 0.05 },
}

// Category mix per orbit.
const CATEGORY_WEIGHTS = {
  GEO: { "Test and training": 0.03, Communications: 0.75, "Imaging, surveillance & meteorology": 0.12, Navigation: 0.05, Research: 0.05 },
  MEO: { "Test and training": 0.05, Communications: 0.2, "Imaging, surveillance & meteorology": 0.05, Navigation: 0.6, Research: 0.1 },
  LEO: { "Test and training": 0.08, Communications: 0.45, "Imaging, surveillance & meteorology": 0.3, Navigation: 0.05, Research: 0.12 },
  Other: { "Test and training": 0.1, Communications: 0.4, "Imaging, surveillance & meteorology": 0.2, Navigation: 0.1, Research: 0.2 },
}

// Class mix per category. Business/commercial dominates (the Starlink/OneWeb
// era), so most marks are plain filled circles and only ~15-20% carry an icon.
const CLASS_WEIGHTS = {
  Communications: { "Business/commercial": 0.93, Civil: 0.03, "Amateur/academic": 0.01, Defense: 0.03 },
  "Imaging, surveillance & meteorology": { "Business/commercial": 0.74, Civil: 0.08, "Amateur/academic": 0.02, Defense: 0.16 },
  Navigation: { "Business/commercial": 0.5, Civil: 0.28, "Amateur/academic": 0.01, Defense: 0.21 },
  Research: { "Business/commercial": 0.55, Civil: 0.22, "Amateur/academic": 0.16, Defense: 0.07 },
  "Test and training": { "Business/commercial": 0.55, Civil: 0.2, "Amateur/academic": 0.2, Defense: 0.05 },
}

// Mass median (kg) per category — GEO comms and navigation are heavy, LEO comms
// (Starlink-class) and research are light.
const MASS_MEDIAN = {
  Communications: { GEO: 3200, MEO: 1200, LEO: 270, Other: 900 },
  Navigation: { GEO: 2000, MEO: 1500, LEO: 600, Other: 800 },
  "Imaging, surveillance & meteorology": { GEO: 1800, MEO: 700, LEO: 720, Other: 600 },
  Research: { GEO: 900, MEO: 500, LEO: 240, Other: 280 },
  "Test and training": { GEO: 700, MEO: 400, LEO: 160, Other: 180 },
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function weightedPick(rng, weights) {
  const entries = Object.entries(weights)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [k, w] of entries) {
    r -= w
    if (r <= 0) return k
  }
  return entries[entries.length - 1][0]
}

function gaussian(rng) {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function lognormal(rng, median, sigma) {
  return median * Math.exp(sigma * gaussian(rng))
}

const START_MS = Date.parse(LAUNCH_START)
const END_MS = Date.parse(LAUNCH_END)

function launchDate(rng, recencyBias) {
  // recencyBias < 1 skews toward the recent end of the window.
  const t = Math.pow(rng(), recencyBias)
  const ms = START_MS + (END_MS - START_MS) * t
  return new Date(ms).toISOString().slice(0, 10)
}

const NAV_NAMES = { "U.S.": "GPS", Russia: "Cosmos", China: "Beidou", "Western Europe": "Galileo", India: "NavIC", Japan: "QZSS" }
const REGION_PREFIX = { "U.S.": "USA", "Western Europe": "EU", China: "CZ", Russia: "Cosmos", Japan: "JAXA", India: "ISRO", Other: "OBJ" }

function satelliteName(rng, region, orbit, category, klass, idn) {
  if (category === "Communications" && klass === "Business/commercial" && orbit === "LEO") {
    return region === "U.S." ? `Starlink-${1000 + (idn % 1900)}` : region === "Western Europe" ? `OneWeb-${100 + (idn % 600)}` : `${REGION_PREFIX[region]}-Comm-${idn}`
  }
  if (category === "Navigation") return `${NAV_NAMES[region] ?? "Nav"} ${10 + (idn % 60)}`
  if (category === "Imaging, surveillance & meteorology") {
    const fam = region === "Western Europe" ? "Sentinel" : region === "U.S." ? "WorldView" : "EO-Sat"
    return `${fam}-${1 + (idn % 9)}`
  }
  return `${REGION_PREFIX[region] ?? "OBJ"} ${10000 + idn}`
}

/**
 * Generate the satellite catalog. Returns one record per satellite:
 * `{ id, name, region, orbit, mass, category, klass, launch, uk }`.
 */
export function generateSatellites(seed = 42) {
  const rng = mulberry32(seed)
  const out = []
  let idn = 0
  for (const region of REGIONS) {
    const target = REGION_TOTALS[region]
    for (let i = 0; i < target; i++) {
      idn++
      const orbit = weightedPick(rng, ORBIT_WEIGHTS[region])
      const category = weightedPick(rng, CATEGORY_WEIGHTS[orbit])
      const klass = weightedPick(rng, CLASS_WEIGHTS[category])

      const median = (MASS_MEDIAN[category] && MASS_MEDIAN[category][orbit]) || 400
      const mass = Math.round(Math.min(6000, Math.max(30, lognormal(rng, median, 0.5))))

      // Starlink-class swarms launched very recently; everything else skews
      // recent but spreads back across the window.
      const recencyBias =
        category === "Communications" && klass === "Business/commercial" && orbit === "LEO" ? 0.08 : 0.4
      const launch = launchDate(rng, recencyBias)

      const uk = region === "Western Europe" && rng() < 0.12

      out.push({
        id: `sat-${idn}`,
        name: satelliteName(rng, region, orbit, category, klass, idn),
        region,
        orbit,
        mass,
        category,
        klass,
        launch,
        uk,
      })
    }
  }

  // Inject the named, callout-able satellites with recent launch dates.
  for (const sat of NOTABLE) {
    idn++
    out.push({
      id: `sat-${idn}`,
      name: sat.name,
      region: sat.region,
      orbit: sat.orbit,
      mass: sat.mass,
      category: sat.category,
      klass: sat.klass,
      launch: launchDate(rng, 0.3),
      uk: false,
    })
  }
  return out
}
