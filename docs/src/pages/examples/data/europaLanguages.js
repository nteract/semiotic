/**
 * Illustrative language-family coloring of modern Natural Earth countries,
 * inspired by Karl von Ausfeld's 1840 "Europa nach den lebenden Sprachen".
 *
 * This is not a philological authority and deliberately simplifies 1840
 * ethno-linguistic claims onto today's borders so the rough choropleth can
 * read as a hand-tinted historical plate rather than a census product.
 */

/** Major Stamm groups + leaf colors drawn from the 1840 plate. */
export const LANGUAGE_GROUPS = Object.freeze([
  {
    id: "germanic",
    roman: "I",
    label: "Teutsch / Germanic",
    color: "#c24b6e",
    entries: [
      { id: "german-main", label: "Hauptstamm (German)", color: "#c24b6e" },
      { id: "scandinavian", label: "Scandinavisch", color: "#e59ab0" },
      { id: "english", label: "Englisch", color: "#d17c96" },
    ],
  },
  {
    id: "slavic",
    roman: "II",
    label: "Slawisch / Slavic",
    color: "#6fbfa8",
    entries: [
      { id: "east-slavic", label: "Russisch / Ostslawisch", color: "#7fcfba" },
      { id: "west-slavic", label: "Polnisch / Westslawisch", color: "#4d649c" },
      { id: "south-slavic", label: "Südslawisch", color: "#5f8f7d" },
    ],
  },
  {
    id: "finnic",
    roman: "III",
    label: "Tschudisch / Finnic",
    color: "#efe6d2",
    entries: [{ id: "finnic", label: "Finnisch-Estnisch", color: "#efe6d2" }],
  },
  {
    id: "celtic",
    roman: "V",
    label: "Keltisch / Celtic",
    color: "#b89462",
    entries: [{ id: "celtic", label: "Keltisch", color: "#b89462" }],
  },
  {
    id: "basque",
    roman: "VI",
    label: "Baskisch / Basque",
    color: "#c07a42",
    entries: [{ id: "basque", label: "Baskisch", color: "#c07a42" }],
  },
  {
    id: "albanian",
    roman: "VII",
    label: "Albanisch",
    color: "#7a4a3a",
    entries: [{ id: "albanian", label: "Albanisch", color: "#7a4a3a" }],
  },
  {
    id: "baltic",
    roman: "VIII",
    label: "Lettisch / Baltic",
    color: "#5a8f62",
    entries: [{ id: "baltic", label: "Baltisch", color: "#5a8f62" }],
  },
  {
    id: "hungarian",
    roman: "IX",
    label: "Ungarisch",
    color: "#8e8e8e",
    entries: [{ id: "hungarian", label: "Ungarisch", color: "#8e8e8e" }],
  },
  {
    id: "romanian",
    roman: "X",
    label: "Wallachisch / Romanian",
    color: "#6d8f6c",
    entries: [{ id: "romanian", label: "Rumänisch", color: "#6d8f6c" }],
  },
  {
    id: "greek",
    roman: "XI",
    label: "Neu Griechisch",
    color: "#d0bc90",
    entries: [{ id: "greek", label: "Griechisch", color: "#d0bc90" }],
  },
  {
    id: "romance",
    roman: "XII",
    label: "Lateinische Töchter / Romance",
    color: "#d0a84a",
    entries: [
      { id: "romance-italian", label: "Italienisch", color: "#e2cd86" },
      { id: "romance-iberian", label: "Spanisch und Portugiesisch", color: "#a88c42" },
      { id: "romance-french", label: "Französisch", color: "#d0a84a" },
    ],
  },
  {
    id: "turkic",
    roman: "XIII",
    label: "Türkisch",
    color: "#1f1f1f",
    entries: [{ id: "turkic", label: "Türkisch", color: "#1f1f1f" }],
  },
  {
    id: "other",
    roman: "—",
    label: "Unmapped / outside plate",
    color: "#e8dfcc",
    entries: [{ id: "other", label: "Outside the plate focus", color: "#e8dfcc" }],
  },
])

const LEAF_BY_ID = Object.freeze(
  Object.fromEntries(
    LANGUAGE_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.id, { ...entry, group }])),
  ),
)

/**
 * Natural Earth country name → leaf language id.
 * Names must match `world-atlas` / Natural Earth `properties.name`.
 */
export const COUNTRY_LANGUAGE = Object.freeze({
  // Germanic main
  Germany: "german-main",
  Austria: "german-main",
  Switzerland: "german-main",
  Netherlands: "german-main",
  Belgium: "german-main",
  Luxembourg: "german-main",
  Liechtenstein: "german-main",
  // Scandinavian
  Norway: "scandinavian",
  Sweden: "scandinavian",
  Denmark: "scandinavian",
  Iceland: "scandinavian",
  // English
  "United Kingdom": "english",
  Ireland: "celtic",
  // East Slavic
  Russia: "east-slavic",
  Ukraine: "east-slavic",
  Belarus: "east-slavic",
  // West Slavic
  Poland: "west-slavic",
  Czechia: "west-slavic",
  Slovakia: "west-slavic",
  // South Slavic
  Serbia: "south-slavic",
  Croatia: "south-slavic",
  Slovenia: "south-slavic",
  "Bosnia and Herz.": "south-slavic",
  Montenegro: "south-slavic",
  Macedonia: "south-slavic",
  Bulgaria: "south-slavic",
  Kosovo: "south-slavic",
  // Finnic
  Finland: "finnic",
  Estonia: "finnic",
  // Baltic
  Latvia: "baltic",
  Lithuania: "baltic",
  // Hungarian
  Hungary: "hungarian",
  // Romanian
  Romania: "romanian",
  Moldova: "romanian",
  // Greek
  Greece: "greek",
  Cyprus: "greek",
  "N. Cyprus": "greek",
  // Albanian
  Albania: "albanian",
  // Romance
  Italy: "romance-italian",
  "San Marino": "romance-italian",
  Malta: "romance-italian",
  France: "romance-french",
  Monaco: "romance-french",
  Spain: "romance-iberian",
  Portugal: "romance-iberian",
  Andorra: "romance-iberian",
  // Turkic / Ottoman plate
  Turkey: "turkic",
  // Caucasus / Near East shown on the 1840 plate as green or dark
  Georgia: "east-slavic",
  Armenia: "other",
})

/** Bounding box used for a Europe-centered equirectangular plate. */
export const EUROPE_EXTENT = Object.freeze([
  [-12, 34],
  [42, 71],
])

export const AUSFELD_SOURCE = Object.freeze({
  title: "Europa nach den lebenden Sprachen",
  author: "Karl von Ausfeld",
  year: 1840,
  note: "Hand-colored ethno-linguistic plate; modern borders are an illustrative proxy.",
})

export function languageForCountry(name) {
  return COUNTRY_LANGUAGE[name] || "other"
}

export function leafForId(id) {
  return LEAF_BY_ID[id] || LEAF_BY_ID.other
}

export function colorForCountry(name) {
  return leafForId(languageForCountry(name)).color
}

/**
 * Filter world features to the plate focus and attach language properties.
 * @param {GeoJSON.Feature[]} worldFeatures
 */
/** Countries that expand the plate far beyond the historical frame. */
const EXCLUDED_FROM_PLATE = new Set([
  "Greenland",
  "Kazakhstan",
  "Canada",
  "United States of America",
  "China",
  "India",
  "Mongolia",
  "Japan",
  "Saudi Arabia",
  "Yemen",
  "Iraq",
  "Iran",
  "Egypt",
  "Libya",
  "Algeria",
  "Morocco",
  "Tunisia",
])

export function prepareEuropaFeatures(worldFeatures) {
  if (!Array.isArray(worldFeatures)) return []
  const prepared = []
  for (const feature of worldFeatures) {
    const name = feature?.properties?.name
    if (!name || EXCLUDED_FROM_PLATE.has(name)) continue
    const listed = Object.prototype.hasOwnProperty.call(COUNTRY_LANGUAGE, name)
    if (!listed && !isInEuropeBox(feature)) continue

    const languageId = languageForCountry(name)
    const leaf = leafForId(languageId)
    const props = {
      ...feature.properties,
      languageId,
      languageLabel: leaf.label,
      languageGroup: leaf.group?.label,
      languageColor: leaf.color,
      languageRoman: leaf.group?.roman,
    }

    // Russia spans to the Pacific and wrecks auto-fit; keep a European-Russia
    // stand-in box so the plate matches the 1840 frame even without extent.
    if (name === "Russia") {
      prepared.push({
        type: "Feature",
        properties: props,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [27.5, 70.5],
              [42, 70.5],
              [42, 50],
              [37, 44.5],
              [30, 46],
              [27.5, 52],
              [27.5, 70.5],
            ],
          ],
        },
      })
      continue
    }

    // Drop overseas departments / exclaves (e.g. French Guiana, Canaries)
    // so Natural Earth multipolygons cannot stretch the plate to the tropics.
    const clipped = clipFeatureToPlate(feature)
    if (!clipped) continue

    prepared.push({
      ...clipped,
      properties: props,
    })
  }
  return prepared
}

function clipFeatureToPlate(feature) {
  const geometry = feature?.geometry
  if (!geometry) return null
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates.filter((ring) => ringInPlate(ring))
    if (!rings.length) return null
    return { type: "Feature", properties: feature.properties, geometry: { type: "Polygon", coordinates: rings } }
  }
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates
      .map((poly) => poly.filter((ring) => ringInPlate(ring)))
      .filter((poly) => poly.length > 0)
    if (!polys.length) return null
    if (polys.length === 1) {
      return {
        type: "Feature",
        properties: feature.properties,
        geometry: { type: "Polygon", coordinates: polys[0] },
      }
    }
    return {
      type: "Feature",
      properties: feature.properties,
      geometry: { type: "MultiPolygon", coordinates: polys },
    }
  }
  return feature
}

function ringInPlate(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false
  let sumLon = 0
  let sumLat = 0
  let n = 0
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue
    sumLon += pt[0]
    sumLat += pt[1]
    n += 1
  }
  if (!n) return false
  const lon = sumLon / n
  const lat = sumLat / n
  const [[lon0, lat0], [lon1, lat1]] = EUROPE_EXTENT
  // Slightly padded so Iceland and Cyprus still qualify.
  return lon >= lon0 - 14 && lon <= lon1 + 10 && lat >= lat0 - 6 && lat <= lat1 + 4
}

function isInEuropeBox(feature) {
  // Cheap centroid check against the plate extent.
  const coords = feature?.geometry?.coordinates
  if (!coords) return false
  const [[lon0, lat0], [lon1, lat1]] = EUROPE_EXTENT
  const sample = samplePoints(feature.geometry, 8)
  return sample.some(([lon, lat]) => lon >= lon0 && lon <= lon1 && lat >= lat0 && lat <= lat1)
}

function samplePoints(geometry, limit = 8) {
  const out = []
  const walk = (node) => {
    if (!node || out.length >= limit) return
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      out.push([node[0], node[1]])
      return
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child)
        if (out.length >= limit) return
      }
    }
  }
  if (geometry?.type === "GeometryCollection") {
    for (const g of geometry.geometries || []) walk(g.coordinates)
  } else {
    walk(geometry?.coordinates)
  }
  return out
}

export function legendSwatches() {
  return LANGUAGE_GROUPS.filter((g) => g.id !== "other").flatMap((group) =>
    group.entries.map((entry) => ({
      groupId: group.id,
      groupLabel: group.label,
      roman: group.roman,
      ...entry,
    })),
  )
}
