import { PARIS_CENTER } from "./data/parisLandmarks"

const ENDPOINT = "https://dbpedia.org/sparql"
const RADIUS_KM = 100
const TYPE_MAP = new Map([
  ["http://dbpedia.org/ontology/Museum", "culture"],
  ["http://dbpedia.org/ontology/Monument", "monument"],
  ["http://dbpedia.org/ontology/HistoricPlace", "monument"],
  ["http://dbpedia.org/ontology/ReligiousBuilding", "faith"],
  ["http://dbpedia.org/ontology/Park", "nature"],
  ["http://dbpedia.org/ontology/University", "knowledge"],
  ["http://dbpedia.org/ontology/Castle", "defense"],
  ["http://dbpedia.org/ontology/Stadium", "arena"],
  ["http://dbpedia.org/ontology/Airport", "transport"],
])

export function buildDbpediaLandmarkQuery(center) {
  return `
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?place ?label ?lat ?lon ?type WHERE {
  VALUES ?type {
    ${[...TYPE_MAP.keys()].map((type) => `<${type}>`).join("\n    ")}
  }
  ?place a ?type ;
    geo:geometry ?geometry ;
    geo:lat ?lat ;
    geo:long ?lon ;
    rdfs:label ?label .
  FILTER(lang(?label) = "en")
  FILTER(bif:st_intersects(
    ?geometry,
    bif:st_point(${center.lon}, ${center.lat}),
    ${RADIUS_KM}
  ))
}
LIMIT 900`
}

export const PARIS_DBPEDIA_QUERY = buildDbpediaLandmarkQuery(PARIS_CENTER)

export async function fetchDbpediaLandmarks(center, signal) {
  const params = new URLSearchParams({
    query: buildDbpediaLandmarkQuery(center),
    format: "application/sparql-results+json",
  })
  const response = await fetch(`${ENDPOINT}?${params}`, {
    signal,
    headers: { Accept: "application/sparql-results+json" },
  })
  if (!response.ok) {
    throw new Error(`DBpedia request failed with ${response.status}`)
  }

  const json = await response.json()
  const byPlace = new Map()
  for (const binding of json.results?.bindings ?? []) {
    const uri = binding.place?.value
    const type = binding.type?.value
    const kind = TYPE_MAP.get(type)
    const lon = Number(binding.lon?.value)
    const lat = Number(binding.lat?.value)
    if (!uri || !kind || !Number.isFinite(lon) || !Number.isFinite(lat)) continue

    const candidate = {
      id: uri,
      uri,
      name: binding.label?.value || uri.split("/").pop().replaceAll("_", " "),
      lon,
      lat,
      kind,
      dbpediaType: type,
      source: "DBpedia endpoint",
    }
    const previous = byPlace.get(uri)
    if (!previous || typePriority(type) < typePriority(previous.dbpediaType)) {
      byPlace.set(uri, candidate)
    }
  }
  return [center, ...byPlace.values()]
}

export function fetchDbpediaParisLandmarks(signal) {
  return fetchDbpediaLandmarks(PARIS_CENTER, signal)
}

function typePriority(type) {
  return [...TYPE_MAP.keys()].indexOf(type)
}
