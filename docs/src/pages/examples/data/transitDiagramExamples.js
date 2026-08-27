export const AUTHORED_STATIONS = [
  { id: "Harbor", label: "Harbor", x: 4, y: 82 },
  { id: "Museum", label: "Museum", x: 20, y: 66 },
  { id: "Union", label: "Union", x: 38, y: 48, interchange: true },
  { id: "Market", label: "Market", x: 58, y: 48 },
  { id: "Garden", label: "Garden", x: 78, y: 28 },
  { id: "Observatory", label: "Observatory", x: 94, y: 12 },
  { id: "West End", label: "West End", x: 4, y: 28 },
  { id: "Library", label: "Library", x: 20, y: 48 },
  { id: "Foundry", label: "Foundry", x: 78, y: 66 },
  { id: "Airport", label: "Airport", x: 94, y: 82 },
  { id: "Commons", label: "Commons", x: 38, y: 12 },
  { id: "University", label: "University", x: 58, y: 28 },
]

const COLORS = {
  ember: "#d94a3a",
  blue: "#2775a8",
  green: "#27845e",
}

export const AUTHORED_CONNECTIONS = [
  { source: "Harbor", target: "Museum", line: "ember", color: COLORS.ember },
  { source: "Museum", target: "Union", line: "ember", color: COLORS.ember },
  { source: "Union", target: "Market", line: "ember", color: COLORS.ember },
  { source: "Market", target: "Garden", line: "ember", color: COLORS.ember },
  { source: "Garden", target: "Observatory", line: "ember", color: COLORS.ember },
  { source: "West End", target: "Library", line: "blue", color: COLORS.blue },
  { source: "Library", target: "Union", line: "blue", color: COLORS.blue },
  { source: "Union", target: "Market", line: "blue", color: COLORS.blue },
  { source: "Market", target: "Foundry", line: "blue", color: COLORS.blue },
  { source: "Foundry", target: "Airport", line: "blue", color: COLORS.blue },
  { source: "Commons", target: "University", line: "green", color: COLORS.green },
  { source: "University", target: "Market", line: "green", color: COLORS.green },
  { source: "Market", target: "Foundry", line: "green", color: COLORS.green },
]

// No x/y coordinates: this is deliberately plain graph data.
export const WATERSHED_STATIONS = [
  { id: "Snowfield", label: "Snowfield headwater", kind: "headwater" },
  { id: "Pine Creek", label: "Pine Creek", kind: "headwater" },
  { id: "North Fork", label: "North Fork", kind: "confluence" },
  { id: "Canyon Spring", label: "Canyon Spring", kind: "headwater" },
  { id: "Desert Wash", label: "Desert Wash", kind: "headwater" },
  { id: "South Fork", label: "South Fork", kind: "confluence" },
  { id: "Great Confluence", label: "Great Confluence", kind: "confluence", transfer: true },
  { id: "Reservoir", label: "Reservoir", kind: "storage" },
  { id: "Delta", label: "Delta / ocean", kind: "outlet" },
]

const snow = { id: "snow", label: "Snowfield water", color: "#4c9fd8" }
const pine = { id: "pine", label: "Pine Creek water", color: "#2b7a78" }
const canyon = { id: "canyon", label: "Canyon Spring water", color: "#7157a5" }
const desert = { id: "desert", label: "Desert Wash water", color: "#c77b30" }

export const WATERSHED_CONNECTIONS = [
  { source: "Snowfield", target: "North Fork", lines: [snow] },
  { source: "Pine Creek", target: "North Fork", lines: [pine] },
  { source: "North Fork", target: "Great Confluence", lines: [snow, pine] },
  { source: "Canyon Spring", target: "South Fork", lines: [canyon] },
  { source: "Desert Wash", target: "South Fork", lines: [desert] },
  { source: "South Fork", target: "Great Confluence", lines: [canyon, desert] },
  {
    source: "Great Confluence",
    target: "Reservoir",
    lines: [snow, pine, canyon, desert],
  },
  { source: "Reservoir", target: "Delta", lines: [snow, pine, canyon, desert] },
]

export const TRANSIT_LINE_LEGEND = [
  { id: "ember", label: "Ember Line", color: COLORS.ember },
  { id: "blue", label: "Blue Line", color: COLORS.blue },
  { id: "green", label: "Garden Line", color: COLORS.green },
]

export const WATERSHED_LINE_LEGEND = [snow, pine, canyon, desert]
