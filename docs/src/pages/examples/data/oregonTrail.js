// "Map of the Oregon Trail" — data for a GeoCustomChart rendering of the
// Pacific Northwest, styled after the 1985 MECC Oregon Trail end-game map.
//
// The land is real (WA/OR/ID outlines); the forts, landmarks, river paths,
// and trail route are placed at their real longitude/latitude so the projected
// map is genuinely geographic — then dressed in the CGA/EGA palette of the game.

import { PNW_FEATURES } from "./pacificNorthwest"

export { PNW_FEATURES }

// --- CGA / EGA palette ------------------------------------------------------
export const SCREEN_BLUE = "#1a1ae0"
export const LAND_GRAY = "#b9b9b9"
export const RIVER_BLUE = "#2b3bff"
export const INK = "#101010"
export const PAPER_WHITE = "#f2f2f2"
export const START_ORANGE = "#c26a12"

// --- The trail --------------------------------------------------------------
// Forts are drawn as hollow squares; landmarks as small filled squares.
export const FORTS = [
  { id: "Fort Hall", lon: -112.43, lat: 43.03 },
  { id: "Fort Boise", lon: -117.0, lat: 43.8 },
  { id: "Fort Walla Walla", lon: -118.34, lat: 46.07 },
  { id: "Fort Vancouver", lon: -122.66, lat: 45.63 },
]

export const LANDMARKS = [
  { id: "Three Island Crossing", lon: -115.3, lat: 42.95 },
  { id: "Farewell Bend", lon: -117.23, lat: 44.3 },
  { id: "Blue Mountains", lon: -118.3, lat: 45.4 },
  { id: "The Dalles", lon: -121.18, lat: 45.6 },
]

// The route the wagon travels, in order from START (SE) to FINISH (W).
export const ROUTE_STOPS = [
  { id: "Fort Hall", lon: -112.43, lat: 43.03 },
  { id: "Three Island Crossing", lon: -115.3, lat: 42.95 },
  { id: "Fort Boise", lon: -117.0, lat: 43.8 },
  { id: "Farewell Bend", lon: -117.23, lat: 44.3 },
  { id: "Blue Mountains", lon: -118.3, lat: 45.4 },
  { id: "Fort Walla Walla", lon: -118.34, lat: 46.07 },
  { id: "The Dalles", lon: -121.18, lat: 45.6 },
  { id: "Fort Vancouver", lon: -122.66, lat: 45.63 },
  { id: "Oregon City", lon: -122.6, lat: 45.35 },
]

export const START = ROUTE_STOPS[0]
export const FINISH = ROUTE_STOPS[ROUTE_STOPS.length - 1]

// A denser polyline for drawing the route smoothly.
export const ROUTE_PATH = ROUTE_STOPS.map((s) => [s.lon, s.lat])

// --- Rivers (stylized but real-ish paths) -----------------------------------
export const RIVERS = [
  // Columbia — the big northern loop down to the Pacific
  [
    [-117.0, 49.0], [-118.2, 48.2], [-119.7, 47.6], [-120.0, 46.9],
    [-119.5, 46.3], [-119.0, 46.0], [-120.7, 45.7], [-121.5, 45.6],
    [-122.2, 45.6], [-122.76, 45.65], [-123.4, 46.2], [-123.9, 46.25],
  ],
  // Snake — across southern Idaho, then north along the OR/ID border
  [
    [-112.43, 43.0], [-113.5, 42.9], [-114.8, 42.9], [-115.9, 43.2],
    [-116.9, 43.9], [-117.03, 44.9], [-117.05, 45.9], [-118.95, 46.0],
  ],
  // Willamette — up the valley into the Columbia
  [
    [-123.1, 44.4], [-123.05, 44.9], [-122.9, 45.2], [-122.7, 45.5], [-122.76, 45.6],
  ],
  // Deschutes / John Day — into the Columbia at The Dalles
  [
    [-120.9, 44.2], [-121.0, 44.9], [-121.1, 45.4], [-121.18, 45.6],
  ],
  // Puget Sound water
  [
    [-122.5, 47.0], [-122.5, 47.5], [-122.4, 47.9], [-122.7, 48.3],
  ],
]

// --- Mountains (caret glyphs) ----------------------------------------------
// Clusters over the real ranges, spread deterministically.
const RANGES = [
  { lon: -121.6, lat: 44.5, spanLon: 0.5, spanLat: 3.4, count: 9 }, // Cascades
  { lon: -123.5, lat: 47.8, spanLon: 0.6, spanLat: 0.5, count: 3 }, // Olympics
  { lon: -118.1, lat: 45.2, spanLon: 0.9, spanLat: 0.6, count: 4 }, // Blue Mtns
  { lon: -117.3, lat: 45.1, spanLon: 0.4, spanLat: 0.4, count: 2 }, // Wallowas
  { lon: -114.7, lat: 44.6, spanLon: 1.6, spanLat: 1.8, count: 9 }, // Idaho Rockies
  { lon: -115.3, lat: 46.6, spanLon: 1.2, spanLat: 0.9, count: 4 }, // N Idaho
  { lon: -122.6, lat: 42.3, spanLon: 1.2, spanLat: 0.4, count: 3 }, // Klamath / Siskiyou
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildMountains() {
  const rand = mulberry32(7)
  const out = []
  for (const r of RANGES) {
    for (let i = 0; i < r.count; i += 1) {
      out.push({
        lon: r.lon + (rand() - 0.5) * r.spanLon,
        lat: r.lat + (rand() - 0.5) * r.spanLat,
        big: rand() > 0.6,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// The trail as a decision graph — deconstructed from the game's branch points.
//
// The trail looks like a line, but the game is a sequence of forks that split
// and rejoin: how you cross each river (ford / ferry / caulk & float), which
// route you take at South Pass (Fort Bridger or the Sublette Cutoff), and the
// famous last call at The Dalles (raft the Columbia, or the Barlow Toll Road).
// Values follow a representative cohort of 400 wagon parties; attrition bleeds
// off to "Perished" at the deadliest points. 295 arrive, 105 do not.
// ---------------------------------------------------------------------------
export const PERISHED_RED = "#a2331f"
export const TRAIL_GREEN = "#2f7d3a"
export const SANKEY_START_COUNT = 400
export const SANKEY_ARRIVED = 295
export const SANKEY_PERISHED = 105

export const SANKEY_NODES = [
  { id: "independence", label: "Independence", kind: "start" },
  { id: "kansas", label: "Kansas River", kind: "fork" },
  { id: "k-ford", label: "Ford", kind: "method" },
  { id: "k-ferry", label: "Ferry", kind: "method" },
  { id: "k-float", label: "Caulk & float", kind: "method" },
  { id: "kearney", label: "Fort Kearney", kind: "stop" },
  { id: "laramie", label: "Fort Laramie", kind: "stop" },
  { id: "southpass", label: "South Pass", kind: "fork" },
  { id: "bridger", label: "Fort Bridger", kind: "stop" },
  { id: "sublette", label: "Sublette Cutoff", kind: "method" },
  { id: "hall", label: "Fort Hall", kind: "stop" },
  { id: "snake", label: "Snake River", kind: "fork" },
  { id: "s-ford", label: "Ford", kind: "method" },
  { id: "s-ferry", label: "Ferry", kind: "method" },
  { id: "boise", label: "Fort Boise", kind: "stop" },
  { id: "bluemtns", label: "Blue Mountains", kind: "stop" },
  { id: "dalles", label: "The Dalles", kind: "fork" },
  { id: "columbia", label: "Float the Columbia", kind: "method" },
  { id: "barlow", label: "Barlow Toll Road", kind: "method" },
  { id: "oregoncity", label: "Oregon City", kind: "end" },
  { id: "perished", label: "Perished", kind: "perished" },
]

// An explicit { kind: color } map — no array ordering to keep in sync with
// node insertion order (Semiotic's colorScheme accepts an object map).
export const SANKEY_KIND_COLOR_MAP = {
  start: "#c26a12", // Independence (orange)
  fork: "#101010", // river crossings & route decisions (black)
  method: "#6a6a6a", // the branch you pick (gray)
  stop: "#101010", // forts & landmarks (black)
  end: "#2f7d3a", // Oregon City (green: you made it)
  perished: "#a2331f", // brick red
}

const S = (source, target, value, perished) => ({ source, target, value, perished: !!perished })

export const SANKEY_EDGES = [
  S("independence", "kansas", 400),
  S("kansas", "k-ford", 180),
  S("kansas", "k-ferry", 130),
  S("kansas", "k-float", 90),
  S("k-ford", "kearney", 165),
  S("k-ford", "perished", 15, true),
  S("k-ferry", "kearney", 130),
  S("k-float", "kearney", 90),
  S("kearney", "laramie", 385),
  S("laramie", "southpass", 385),
  S("southpass", "bridger", 235),
  S("southpass", "sublette", 150),
  S("bridger", "hall", 235),
  S("sublette", "hall", 150),
  S("hall", "snake", 385),
  S("snake", "s-ford", 210),
  S("snake", "s-ferry", 175),
  S("s-ford", "boise", 185),
  S("s-ford", "perished", 25, true),
  S("s-ferry", "boise", 175),
  S("boise", "bluemtns", 360),
  S("bluemtns", "dalles", 330),
  S("bluemtns", "perished", 30, true),
  S("dalles", "columbia", 175),
  S("dalles", "barlow", 155),
  S("columbia", "oregoncity", 140),
  S("columbia", "perished", 35, true),
  S("barlow", "oregoncity", 155),
]
