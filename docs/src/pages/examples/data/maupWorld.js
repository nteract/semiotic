export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 610
export const GRID_COLUMNS = 48
export const GRID_ROWS = 32
export const DAY_COUNT = 28

export const CITY_PATH =
  "M74,159 C91,83 176,53 280,70 C356,29 450,55 521,88 C621,44 743,67 824,126 C923,154 959,239 925,313 C967,385 910,476 824,507 C752,566 637,556 549,522 C448,566 352,546 274,520 C162,545 78,482 86,405 C38,334 39,235 74,159 Z"

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const CEDAR_LON_MIN = -122.62
const CEDAR_LON_SPAN = 1.44
const CEDAR_LAT_MIN = 37.04
const CEDAR_LAT_SPAN = 1.08

export function toCedarBendCoordinate(x, y) {
  return [CEDAR_LON_MIN + x * CEDAR_LON_SPAN, CEDAR_LAT_MIN + (1 - y) * CEDAR_LAT_SPAN]
}

export function fromCedarBendCoordinate([lon, lat]) {
  return [(lon - CEDAR_LON_MIN) / CEDAR_LON_SPAN, 1 - (lat - CEDAR_LAT_MIN) / CEDAR_LAT_SPAN]
}

const CEDAR_BEND_BOUNDARY = [
  [0.075, 0.26], [0.12, 0.13], [0.28, 0.115], [0.4, 0.07], [0.55, 0.14], [0.7, 0.105],
  [0.87, 0.19], [0.94, 0.34], [0.9, 0.51], [0.95, 0.63], [0.86, 0.81], [0.72, 0.9],
  [0.56, 0.855], [0.43, 0.92], [0.27, 0.85], [0.11, 0.88], [0.07, 0.68], [0.045, 0.5],
  [0.075, 0.26],
]

export const CEDAR_BEND_AREA = {
  type: "Feature",
  properties: { id: "cedar-bend", name: "Cedar Bend" },
  geometry: {
    type: "Polygon",
    coordinates: [CEDAR_BEND_BOUNDARY.map(([x, y]) => toCedarBendCoordinate(x, y))],
  },
}

function gaussian(x, y, cx, cy, spread) {
  const distanceSquared = (x - cx) ** 2 + (y - cy) ** 2
  return Math.exp(-distanceSquared / (2 * spread ** 2))
}

function isInCity(x, y) {
  const dx = (x - 0.5) / 0.52
  const dy = (y - 0.5) / 0.48
  const ripple = 0.11 * Math.sin(y * Math.PI * 3.2) - 0.055 * Math.cos(x * Math.PI * 4.5)
  return dx ** 2 + dy ** 2 < 0.94 + ripple
}

export function populationAt(x, y) {
  const northBank = gaussian(x, y, 0.3, 0.33, 0.13)
  const market = gaussian(x, y, 0.68, 0.59, 0.17)
  const outer = gaussian(x, y, 0.51, 0.26, 0.3)
  return 0.26 + northBank * 1.2 + market * 1.65 + outer * 0.25
}

export function heatAt(x, y, day = 0) {
  const broadGradient = 46 + x * 22 + y * 5
  const industrial = gaussian(x, y, 0.77, 0.32, 0.13) * 18
  const southRoof = gaussian(x, y, 0.55, 0.72, 0.18) * 10
  const riverCooling = gaussian(x, y, 0.42, 0.55, 0.075) * 13
  const parkCooling = gaussian(x, y, 0.23, 0.74, 0.15) * 8
  const texture = Math.sin(x * 15 + y * 4) * 2.2 + Math.cos(y * 12 - x * 3) * 1.5
  const episodeCenterX = 0.22 + (day / (DAY_COUNT - 1)) * 0.57
  const episodeCenterY = 0.66 - Math.sin((day / (DAY_COUNT - 1)) * Math.PI) * 0.29
  const episodeStrength = 3 + Math.sin((day / (DAY_COUNT - 1)) * Math.PI) * 13
  const movingEpisode = gaussian(x, y, episodeCenterX, episodeCenterY, 0.12) * episodeStrength
  const dayPulse = Math.sin(((day + 2) / DAY_COUNT) * Math.PI * 2) * 2
  return clamp(
    broadGradient + industrial + southRoof - riverCooling - parkCooling + texture + movingEpisode + dayPulse,
    35,
    92,
  )
}

export const MAP_CELLS = Array.from({ length: GRID_COLUMNS * GRID_ROWS }, (_, index) => {
  const column = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)
  const x = (column + 0.5) / GRID_COLUMNS
  const y = (row + 0.5) / GRID_ROWS
  const [lon, lat] = toCedarBendCoordinate(x, y)
  return {
    id: `cell-${column}-${row}`,
    column,
    row,
    x,
    y,
    lon,
    lat,
    weight: populationAt(x, y),
    inCity: isInCity(x, y),
  }
}).filter((cell) => cell.inCity)

export const LINE_SAMPLES = Array.from({ length: 240 }, (_, index) => {
  const x = (index + 0.5) / 240
  const y = 0.53 + Math.sin(x * Math.PI * 3) * 0.015
  return {
    x,
    value: heatAt(x, y, 0),
    weight: populationAt(x, y),
  }
})

export function boundaryX(index, y, columns, seam) {
  const base = index / columns
  const bend = 0.62 + Math.sin(y * Math.PI * 2.3 + index * 1.7) * 0.25
  const room = Math.min(base - (index - 1) / columns, (index + 1) / columns - base, 0.18)
  return clamp(base + seam * bend * room * 0.83, (index - 0.34) / columns, (index + 0.34) / columns)
}

export function boundaryY(x, seam) {
  return clamp(0.5 + Math.sin(x * Math.PI * 2.4 + seam * 1.5) * 0.045, 0.4, 0.6)
}

function districtForCell(cell, columns, seam) {
  let column = columns - 1
  for (let index = 1; index < columns; index += 1) {
    if (cell.x < boundaryX(index, cell.y, columns, seam)) {
      column = index - 1
      break
    }
  }
  const row = cell.y < boundaryY(cell.x, seam) ? 0 : 1
  return `${row}-${column}`
}

function aggregateRecords(records, threshold) {
  const zones = new Map()
  let totalWeight = 0
  let totalValue = 0
  let rawHighWeight = 0

  records.forEach((record) => {
    const zone = zones.get(record.zoneId) ?? {
      id: record.zoneId,
      weight: 0,
      weightedValue: 0,
      weightedX: 0,
      weightedY: 0,
      records: 0,
    }
    zone.weight += record.weight
    zone.weightedValue += record.value * record.weight
    zone.weightedX += record.x * record.weight
    zone.weightedY += record.y * record.weight
    zone.records += 1
    zones.set(record.zoneId, zone)
    totalWeight += record.weight
    totalValue += record.value * record.weight
    if (record.value >= threshold) rawHighWeight += record.weight
  })

  const zoneList = Array.from(zones.values())
    .map((zone) => ({
      ...zone,
      mean: zone.weightedValue / zone.weight,
      x: zone.weightedX / zone.weight,
      y: zone.weightedY / zone.weight,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const zoneById = new Map(zoneList.map((zone) => [zone.id, zone]))
  const assignedHighWeight = zoneList.reduce(
    (sum, zone) => sum + (zone.mean >= threshold ? zone.weight : 0),
    0,
  )

  return {
    zones: zoneList,
    zoneById,
    totalWeight,
    globalMean: totalValue / totalWeight,
    rawShare: rawHighWeight / totalWeight,
    assignedShare: assignedHighWeight / totalWeight,
  }
}

export function calculateMap({ scale, seam, threshold, day = 0 }) {
  const columns = scale / 2
  const records = MAP_CELLS.map((cell) => {
    const value = heatAt(cell.x, cell.y, day)
    return {
      ...cell,
      value,
      zoneId: districtForCell(cell, columns, seam),
    }
  })
  const aggregate = aggregateRecords(records, threshold)
  return {
    ...aggregate,
    cells: records,
    columns,
    day,
    seam,
  }
}

export function calculateLine({ cut, bins, threshold }) {
  const clampedCut = clamp(cut, 0.2, 0.58)
  const secondCut = 0.73
  const cuts =
    bins === 3
      ? [0, clampedCut, secondCut, 1]
      : [
          0,
          clampedCut / 2,
          clampedCut,
          clampedCut + (secondCut - clampedCut) * 0.34,
          clampedCut + (secondCut - clampedCut) * 0.67,
          secondCut,
          1,
        ]
  const records = LINE_SAMPLES.map((sample) => {
    const segment = cuts.findIndex((right, index) => index > 0 && sample.x < right)
    return {
      ...sample,
      zoneId: `interval-${segment === -1 ? cuts.length - 2 : segment - 1}`,
    }
  })
  const aggregate = aggregateRecords(records, threshold)
  return {
    ...aggregate,
    cuts,
    samples: records,
    cut: clampedCut,
    bins,
  }
}

export function calculateSpaceTime({ scale, seam, threshold, timeWindow, timePhase }) {
  const columns = scale / 2
  const records = []
  for (let day = 0; day < DAY_COUNT; day += 1) {
    const rotatedDay = (day - timePhase + DAY_COUNT) % DAY_COUNT
    const windowIndex = Math.floor(rotatedDay / timeWindow)
    MAP_CELLS.forEach((cell) => {
      const spatialZone = districtForCell(cell, columns, seam)
      records.push({
        ...cell,
        day,
        value: heatAt(cell.x, cell.y, day),
        zoneId: `${spatialZone}-window-${windowIndex}`,
      })
    })
  }
  const aggregate = aggregateRecords(records, threshold)
  return {
    ...aggregate,
    columns,
    windowCount: DAY_COUNT / timeWindow,
    timeWindow,
    timePhase,
  }
}

export const DAILY_GLOBAL_MEANS = Array.from({ length: DAY_COUNT }, (_, day) => {
  const total = MAP_CELLS.reduce(
    (sum, cell) => sum + heatAt(cell.x, cell.y, day) * cell.weight,
    0,
  )
  const totalWeight = MAP_CELLS.reduce((sum, cell) => sum + cell.weight, 0)
  return total / totalWeight
})

export function checksum() {
  const value = MAP_CELLS.reduce(
    (sum, cell) => sum + Math.round(cell.weight * 1000) + Math.round(heatAt(cell.x, cell.y, 0) * 10),
    0,
  )
  return `CB-${value.toString(16).toUpperCase()}`
}
