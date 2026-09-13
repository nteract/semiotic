import checkout from "../fixtures/checkout-ab-v1.json"
import search from "../fixtures/search-no-result-v1.json"
import { prepareNetworkAtlas, readCircuitEdition } from "semiotic/atlas/core"
import type { NetworkAtlasSpec, NetworkAtlasSource } from "semiotic/atlas/core"
import { supplierStory } from "./supplierStory"
import { flowCircuitStory } from "./flowCircuitStories"

export const atlasStoryNames = {
  checkout: "Mobile checkout A/B",
  search: "Repeated no-result search",
  supplier: "False supplier redundancy",
  etl: "Hot-partition ETL",
  retry: "Retry incident"
} as const
export type AtlasStoryId = keyof typeof atlasStoryNames

/** Authored synthetic inputs, shared by docs and the packed consumer check. */
export function atlasStory(id: AtlasStoryId) {
  if (id === "checkout" || id === "search") {
    const fixture = id === "checkout" ? checkout : search
    const result = prepareNetworkAtlas(
      fixture.spec as NetworkAtlasSpec,
      fixture.source as NetworkAtlasSource
    )
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    return {
      id,
      component: "MotifBraidChart" as const,
      props: { atlas: result.atlas, width: 900, height: 560 },
      question:
        id === "checkout"
          ? "Can an overall conversion gain hide a mobile regression?"
          : "Which repeated searches merit investigation?",
      takeaway:
        id === "checkout"
          ? "Mobile loops rise from 8% to 30% and conversion falls from 10% to 6%, while overall conversion rises from 10% to 10.8%."
          : "10,000 sessions loop; 6,000 have catalog-eligible stock. Purchase rates are 5% for looping sessions, 20% for others and 17% overall.",
      fixture,
      limitations: fixture.expected.limitations
    }
  }
  if (id === "supplier") {
    const story = supplierStory()
    return {
      id,
      component: "DependencyForestChart" as const,
      props: {
        forest: story.projection,
        reading: "required-paths" as const,
        width: 920,
        height: 440
      },
      question: "Do three suppliers provide three independent paths?",
      takeaway:
        "75% of allocation depends on X. Losing X creates a 70% shortfall; the independent-capacity target is 4,000 units/week.",
      fixture: story.fixture,
      limitations: [
        "Reachability and required paths do not establish usable transport capacity. A zero-capacity bypass changes topology, not supply."
      ]
    }
  }
  const story = flowCircuitStory(id)
  return {
    id,
    component: "FlowCircuitChart" as const,
    modeledEdition: story.modeled,
    props: {
      circuit: story.circuit,
      edition: story.observed,
      reading: readCircuitEdition(story.observed, "observed-snapshot", 60),
      width: 980,
      height: id === "etl" ? 860 : 620
    },
    question:
      id === "etl"
        ? "Why does a queue grow below installed capacity?"
        : "How much traffic is retry amplification?",
    takeaway:
      id === "etl"
        ? "80,000 records/s capacity, 60,000 arrivals/s and 40,000 completions/s leave 1.2 million records queued per minute."
        : "10,000 roots/s generate 30,000 attempts/s, including 20,000 retries/s. Queue growth is unmeasured.",
    fixture: story.fixture,
    limitations: story.observed.assumptions
  }
}
