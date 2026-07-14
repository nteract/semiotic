import { createLiveDataAdapter, createLiveDataProvenance } from "./liveDataAdapter"

export const DBPEDIA_LANDMARK_DATA_ADAPTER = createLiveDataAdapter({
  defaultMessage: "A checked-in landmark snapshot is ready to explore.",
})

export function createDbpediaSnapshotProvenance(city) {
  return createLiveDataProvenance({
    kind: "snapshot",
    source: "Checked-in " + city.label + " landmark snapshot",
    freshness: "Bundled fixture",
  })
}

export function createDbpediaLiveProvenance() {
  return createLiveDataProvenance({
    kind: "live",
    source: "DBpedia SPARQL endpoint",
    sourceUrl: "https://dbpedia.org/sparql",
    freshness: "Current browser response",
  })
}

export function createDbpediaMixedProvenance(city) {
  return [createDbpediaLiveProvenance(), createDbpediaSnapshotProvenance(city)]
}
