import {
  PARIS_CENTER,
  PARIS_LANDMARK_FIXTURE,
} from "./parisLandmarks"

export const CITY_LANDMARKS = {
  paris: {
    key: "paris",
    label: "Paris",
    region: "Île-de-France",
    center: PARIS_CENTER,
    fixture: PARIS_LANDMARK_FIXTURE,
    terrainByGrid: {},
    terrainSeeds: [
      terrainSeed("cropland", 0.16, 0.08),
      terrainSeed("grassland", 0.52, 0.12),
      terrainSeed("forest", 0.86, 0.28),
      terrainSeed("grassland", 0.22, 0.45),
      terrainSeed("cropland", 0.72, 0.48),
      terrainSeed("forest", 0.16, 0.84),
      terrainSeed("grassland", 0.48, 0.78),
      terrainSeed("cropland", 0.88, 0.9),
    ],
  },
  austin: {
    key: "austin",
    label: "Austin",
    region: "Central Texas",
    center: {
      id: "http://dbpedia.org/resource/Austin,_Texas",
      name: "Austin",
      kind: "city",
      lon: -97.7431,
      lat: 30.2672,
      uri: "http://dbpedia.org/resource/Austin,_Texas",
    },
    fixture: [],
    terrainByGrid: {},
    terrainSeeds: [
      terrainSeed("scrub", 0.08, 0.22),
      terrainSeed("grassland", 0.42, 0.12),
      terrainSeed("cropland", 0.82, 0.16),
      terrainSeed("scrub", 0.18, 0.62),
      terrainSeed("grassland", 0.5, 0.48),
      terrainSeed("forest", 0.84, 0.52),
      terrainSeed("scrub", 0.12, 0.92),
      terrainSeed("cropland", 0.56, 0.86),
      terrainSeed("forest", 0.9, 0.88),
    ],
  },
  sanFrancisco: {
    key: "sanFrancisco",
    label: "San Francisco",
    region: "Bay Area",
    center: {
      id: "http://dbpedia.org/resource/San_Francisco",
      name: "San Francisco",
      kind: "city",
      lon: -122.4194,
      lat: 37.7749,
      uri: "http://dbpedia.org/resource/San_Francisco",
    },
    fixture: [],
    // Natural Earth 1:50m coastline, sampled on a 7×7 grid per cell.
    terrainByGrid: {
      3: oceanTerrain([
        ["tile-1-0", 0.98],
        ["tile-1-1", 0.55],
        ["tile-2-0", 1],
        ["tile-2-1", 0.51],
      ]),
      5: oceanTerrain([
        ["tile-0-0", 0.57],
        ["tile-1-0", 0.86],
        ["tile-1-2", 0.57],
        ["tile-2-0", 1],
        ["tile-2-1", 0.98],
        ["tile-2-2", 0.63],
        ["tile-3-0", 1],
        ["tile-3-1", 1],
        ["tile-4-0", 1],
        ["tile-4-1", 1],
        ["tile-4-2", 0.55],
      ]),
      7: oceanTerrain([
        ["tile-0-0", 0.73],
        ["tile-1-0", 0.86],
        ["tile-1-3", 0.51],
        ["tile-2-0", 0.98],
        ["tile-2-1", 0.8],
        ["tile-2-3", 0.67],
        ["tile-3-0", 1],
        ["tile-3-1", 1],
        ["tile-3-2", 0.98],
        ["tile-3-3", 0.61],
        ["tile-4-0", 1],
        ["tile-4-1", 1],
        ["tile-4-2", 1],
        ["tile-4-4", 0.61],
        ["tile-5-0", 1],
        ["tile-5-1", 1],
        ["tile-5-2", 1],
        ["tile-6-0", 1],
        ["tile-6-1", 1],
        ["tile-6-2", 1],
        ["tile-6-3", 0.59],
      ]),
      9: oceanTerrain([
        ["tile-0-0", 0.82],
        ["tile-1-0", 1],
        ["tile-2-0", 1],
        ["tile-2-4", 0.9],
        ["tile-3-0", 1],
        ["tile-3-1", 1],
        ["tile-3-2", 0.76],
        ["tile-3-4", 0.8],
        ["tile-4-0", 1],
        ["tile-4-1", 1],
        ["tile-4-2", 1],
        ["tile-4-3", 0.98],
        ["tile-4-4", 0.55],
        ["tile-5-0", 1],
        ["tile-5-1", 1],
        ["tile-5-2", 1],
        ["tile-5-3", 1],
        ["tile-5-5", 0.9],
        ["tile-6-0", 1],
        ["tile-6-1", 1],
        ["tile-6-2", 1],
        ["tile-6-3", 1],
        ["tile-7-0", 1],
        ["tile-7-1", 1],
        ["tile-7-2", 1],
        ["tile-7-3", 1],
        ["tile-8-0", 1],
        ["tile-8-1", 1],
        ["tile-8-2", 1],
        ["tile-8-3", 1],
        ["tile-8-4", 0.59],
      ]),
    },
    terrainSeeds: [
      terrainSeed("forest", 0.08, 0.12),
      terrainSeed("forest", 0.4, 0.1),
      terrainSeed("grassland", 0.76, 0.12),
      terrainSeed("forest", 0.16, 0.46),
      terrainSeed("wetland", 0.68, 0.44),
      terrainSeed("grassland", 0.92, 0.52),
      terrainSeed("scrub", 0.2, 0.88),
      terrainSeed("grassland", 0.54, 0.82),
      terrainSeed("wetland", 0.88, 0.86),
    ],
  },
  tokyo: {
    key: "tokyo",
    label: "Tokyo",
    region: "Kantō",
    center: {
      id: "http://dbpedia.org/resource/Tokyo",
      name: "Tokyo",
      kind: "city",
      lon: 139.6917,
      lat: 35.6895,
      uri: "http://dbpedia.org/resource/Tokyo",
    },
    fixture: [],
    // Tokyo Bay, Sagami Bay, and Pacific cells from the same coastline sampler.
    terrainByGrid: {
      3: oceanTerrain([
        ["tile-2-1", 0.55],
      ]),
      5: oceanTerrain([
        ["tile-3-3", 0.57],
        ["tile-4-1", 0.82],
        ["tile-4-2", 0.63],
      ]),
      7: oceanTerrain([
        ["tile-4-4", 0.98],
        ["tile-5-3", 0.61],
        ["tile-6-1", 0.96],
        ["tile-6-2", 0.94],
        ["tile-6-3", 0.61],
      ]),
      9: oceanTerrain([
        ["tile-5-5", 0.96],
        ["tile-5-6", 0.92],
        ["tile-6-4", 0.51],
        ["tile-6-5", 0.98],
        ["tile-7-2", 0.51],
        ["tile-7-4", 0.51],
        ["tile-7-5", 0.53],
        ["tile-8-1", 0.92],
        ["tile-8-2", 1],
        ["tile-8-3", 0.96],
        ["tile-8-4", 0.61],
        ["tile-8-8", 0.53],
      ]),
    },
    terrainSeeds: [
      terrainSeed("forest", 0.08, 0.14),
      terrainSeed("cropland", 0.48, 0.08),
      terrainSeed("cropland", 0.88, 0.18),
      terrainSeed("forest", 0.14, 0.52),
      terrainSeed("grassland", 0.52, 0.42),
      terrainSeed("wetland", 0.88, 0.5),
      terrainSeed("forest", 0.16, 0.88),
      terrainSeed("grassland", 0.5, 0.82),
      terrainSeed("wetland", 0.88, 0.86),
    ],
  },
}

CITY_LANDMARKS.austin.fixture = [
  CITY_LANDMARKS.austin.center,
  landmark("Burnet Municipal Airport", "transport", -98.238609, 30.73889, "Burnet_Municipal_Airport"),
  landmark("Berry Springs Park", "nature", -97.641998, 30.684, "Berry_Springs_Park"),
  landmark("Bartlett Commercial Historic District", "monument", -97.426941, 30.795, "Bartlett_Commercial_Historic_District"),
  landmark("Texas Tech University at Highland Lakes", "knowledge", -98.273781, 30.557467, "Texas_Tech_University_at_Highland_Lakes"),
  landmark("Rusty Allen Airport", "transport", -97.969475, 30.498583, "Lago_Vista_TX_-_Rusty_Allen_Airport"),
  landmark("Texas Museum of Science and Technology", "culture", -97.776138, 30.541603, "Texas_Museum_of_Science_and_Technology"),
  landmark("Taylor Municipal Airport", "transport", -97.443336, 30.572779, "Taylor_Municipal_Airport"),
  landmark("LSU Soccer Stadium", "arena", -97.178055, 30.43111, "LSU_Soccer_Stadium"),
  landmark("Blanco County Courthouse", "monument", -98.411469, 30.27796, "Blanco_County_Courthouse_(Texas)"),
  landmark("LifeAustin Church", "faith", -97.903488, 30.249857, "LifeAustin_Church"),
  landmark("Fischer Historic District", "monument", -98.265831, 29.976944, "Fischer,_Texas"),
  landmark("Michaelis Ranch", "monument", -97.923332, 30.028334, "Michaelis_Ranch"),
  landmark("Downtown Buda Historic District", "monument", -97.84333, 30.081667, "Downtown_Buda_Historic_District"),
  landmark("Wat Buddhananachat of Austin", "faith", -97.583717, 30.137831, "Wat_Buddhananachat_of_Austin"),
  landmark("Bastrop State Park", "nature", -97.273613, 30.110834, "Bastrop_State_Park"),
  landmark("Central Texas Museum of Automotive History", "culture", -97.965385, 29.864756, "Dick's_Classic_Garage"),
  landmark("San Marcos Regional Airport", "transport", -97.863052, 29.892778, "San_Marcos_Regional_Airport"),
]

CITY_LANDMARKS.sanFrancisco.fixture = [
  CITY_LANDMARKS.sanFrancisco.center,
  landmark("Oakland", "city", -122.2712, 37.8044, "Oakland,_California"),
  landmark("Petaluma Wildlife & Natural Science Museum", "culture", -122.646111, 38.227779, "Petaluma_Wildlife_&_Natural_Science_Museum"),
  landmark("Sonoma Valley Woman's Club", "monument", -122.456947, 38.290554, "Sonoma_Valley_Woman's_Club"),
  landmark("Peña Adobe", "monument", -122.014168, 38.337223, "Peña_Adobe"),
  landmark("Western Railway Museum", "culture", -121.874443, 38.203335, "Western_Railway_Museum"),
  landmark("Point Reyes Lifeboat Station", "monument", -122.973892, 37.993889, "Point_Reyes_Lifeboat_Station"),
  landmark("Kule Loklo", "culture", -122.804077, 38.0457, "Kule_Loklo"),
  landmark("China Camp State Park", "nature", -122.461388, 38.000832, "China_Camp_State_Park"),
  landmark("First Presbyterian Church of Vallejo", "faith", -122.268333, 38.113609, "First_Presbyterian_Church_(Vallejo,_California)"),
  landmark("Riverview Union High School Building", "monument", -121.826569, 38.016308, "Riverview_Union_High_School_Building"),
  landmark("Kehilla Community Synagogue", "faith", -122.244102, 37.82019, "Kehilla_Community_Synagogue"),
  landmark("Cornerstone Fellowship", "faith", -121.81031, 37.703919, "Cornerstone_Fellowship"),
  landmark("Kohl Mansion", "monument", -122.383194, 37.583504, "Kohl_Mansion"),
  landmark("St. Thomas Aquinas Church", "faith", -122.157463, 37.44503, "St._Thomas_Aquinas_Church_(Palo_Alto,_California)"),
  landmark("Mission San José", "culture", -121.919441, 37.532776, "Mission_San_José_(California)"),
  landmark("First Congregational Church of Pescadero", "faith", -122.383499, 37.254421, "First_Congregational_Church_of_Pescadero"),
  landmark("Le Petit Trianon", "monument", -122.046631, 37.321609, "Le_Petit_Trianon"),
  landmark("California Trolley and Railroad Corporation", "transport", -121.857277, 37.319519, "California_Trolley_and_Railroad_Corporation"),
]

CITY_LANDMARKS.tokyo.fixture = [
  CITY_LANDMARKS.tokyo.center,
  landmark("Hachigata Castle", "defense", 139.195984, 36.109734, "Hachigata_Castle"),
  landmark("Kanto Junior College", "knowledge", 139.499527, 36.244804, "Kanto_Junior_College"),
  landmark("Kanamura Wake Ikazuchi Shrine", "faith", 139.999496, 36.087971, "Kanamura_Wake_Ikazuchi_Shrine"),
  landmark("Tsukuba Heliport", "transport", 140.131104, 36.1175, "Tsukuba_Heliport"),
  landmark("Chichibu Shrine", "faith", 139.084167, 35.997501, "Chichibu_Shrine"),
  landmark("Nihon Institute of Medical Science", "knowledge", 139.343445, 35.932083, "Nihon_Institute_of_Medical_Science"),
  landmark("Saitama Gakuen University", "knowledge", 139.714188, 35.857071, "Saitama_Gakuen_University"),
  landmark("University Art Museum", "culture", 140.115616, 35.884205, "The_University_Art_Museum,_Tokyo_University_of_the_Arts"),
  landmark("Ushiku Daibutsu", "monument", 140.220276, 35.982498, "Ushiku_Daibutsu"),
  landmark("Ōme Plum Park", "nature", 139.219513, 35.785374, "Ōme_Plum_Park"),
  landmark("Tachikawa Airfield", "transport", 139.403061, 35.710835, "Tachikawa_Airfield"),
  landmark("Kasai Rinkai Park", "nature", 139.860001, 35.641998, "Kasai_Rinkai_Park"),
  landmark("National Museum of Japanese History", "culture", 140.219086, 35.724499, "National_Museum_of_Japanese_History"),
  landmark("Tamanawa Castle", "defense", 139.514999, 35.353333, "Tamanawa_Castle"),
  landmark("Sankei-en", "nature", 139.660049, 35.41695, "Sankei-en"),
  landmark("Kisarazu Air Field", "transport", 139.913055, 35.395, "Kisarazu_Air_Field"),
  landmark("Nyoirin-ji", "faith", 140.250092, 35.444729, "Nyoirin-ji"),
  landmark("Kamakura Museum of Literature", "culture", 139.53894, 35.315601, "Kamakura_Museum_of_Literature"),
  landmark("Kamakura's Seven Entrances", "monument", 139.550003, 35.319401, "Kamakura's_Seven_Entrances"),
  landmark("Enmyō-in", "faith", 140.050003, 35.333332, "Enmyō-in"),
  landmark("Myōhōshō-ji", "faith", 140.16687, 35.17461, "Myōhōshō-ji"),
]

export const CITY_OPTIONS = Object.values(CITY_LANDMARKS)

/**
 * Build a complete, zoom-stable terrain classification. The seed points form
 * broad stylized land-cover regions; sampled coastline cells then override
 * them with measured ocean coverage.
 */
export function buildTerrainGrid(city, gridSize) {
  const middle = Math.floor(gridSize / 2)
  const seeds = city.terrainSeeds ?? [terrainSeed("grassland", 0.5, 0.5)]
  const cells = {}

  for (let row = 0; row < gridSize; row++) {
    for (let column = 0; column < gridSize; column++) {
      const id = `tile-${row}-${column}`
      if (row === middle && column === middle) {
        cells[id] = { kind: "urban", coverage: 1 }
        continue
      }

      const x = (column + 0.5) / gridSize
      const y = (row + 0.5) / gridSize
      const nearest = seeds.reduce((best, seed) => {
        const distance = (x - seed.x) ** 2 + (y - seed.y) ** 2
        return !best || distance < best.distance
          ? { seed, distance }
          : best
      }, null)
      cells[id] = { kind: nearest.seed.kind }
    }
  }

  return {
    ...cells,
    ...(city.terrainByGrid?.[gridSize] ?? {}),
  }
}

function landmark(name, kind, lon, lat, slug) {
  const uri = `http://dbpedia.org/resource/${slug}`
  return { id: uri, name, kind, lon, lat, uri, source: "fixture" }
}

function terrainSeed(kind, x, y) {
  return { kind, x, y }
}

function oceanTerrain(cells) {
  return Object.fromEntries(cells.map(([id, coverage]) => [
    id,
    { kind: "ocean", coverage },
  ]))
}
