import { describe, expect, it } from "vitest"
import {
  SEMIOTIC_ARCHITECTURE_EDGES,
  SEMIOTIC_ARCHITECTURE_NODES,
  SEMIOTIC_EXAMPLE_PROFILES,
  architectureHighlight,
} from "./semioticArchitecture"

describe("Semiotic architecture example data", () => {
  const ids = new Set(SEMIOTIC_ARCHITECTURE_NODES.map((node) => node.id))

  it("has unique nodes and no dangling relationships", () => {
    expect(ids.size).toBe(SEMIOTIC_ARCHITECTURE_NODES.length)

    for (const edge of SEMIOTIC_ARCHITECTURE_EDGES) {
      expect(ids.has(edge.source), `missing edge source ${edge.source}`).toBe(true)
      expect(ids.has(edge.target), `missing edge target ${edge.target}`).toBe(true)
    }

    for (const profile of SEMIOTIC_EXAMPLE_PROFILES) {
      for (const id of profile.uses) {
        expect(ids.has(id), `${profile.id} uses missing node ${id}`).toBe(true)
      }
    }
  })

  it("maps the public chart leaves through the five frame models", () => {
    const frames = new Set(
      SEMIOTIC_ARCHITECTURE_NODES
        .filter((node) => node.layer === "frame")
        .map((node) => node.id)
    )
    expect(frames).toEqual(
      new Set(["frame-xy", "frame-ordinal", "frame-network", "frame-geo", "frame-physics"])
    )

    const profilesById = new Map(
      SEMIOTIC_EXAMPLE_PROFILES.map((profile) => [profile.id, profile])
    )
    expect(architectureHighlight(profilesById.get("climate-anomaly"))).toContain("frame-xy")
    expect(architectureHighlight(profilesById.get("us-war-timeline"))).toContain("frame-ordinal")
    expect(architectureHighlight(profilesById.get("art-movement-genealogy"))).toContain("frame-network")
    expect(architectureHighlight(profilesById.get("paris-isometric-landmarks"))).toContain("frame-geo")
    expect(architectureHighlight(profilesById.get("watermarks"))).toContain("frame-physics")
  })

  it("maps the Wikipedia realtime example to the imperative Push API", () => {
    const wikipedia = SEMIOTIC_EXAMPLE_PROFILES.find(
      (profile) => profile.id === "wikipedia-realtime"
    )
    const highlighted = architectureHighlight(wikipedia)

    expect(highlighted).toContain("input-push")
    expect(highlighted).toContain("feature-stream-windows")
    expect(highlighted).not.toContain("input-static")
  })

  it("maps the Lake Travis ISOTYPE example across every custom frame", () => {
    const profile = SEMIOTIC_EXAMPLE_PROFILES.find(
      (candidate) => candidate.id === "lake-travis-isotype"
    )
    const highlighted = architectureHighlight(profile)

    expect(highlighted).toContain("frame-xy")
    expect(highlighted).toContain("frame-ordinal")
    expect(highlighted).toContain("frame-network")
    expect(highlighted).toContain("frame-geo")
    expect(highlighted).toContain("input-push")
  })

  it("maps the data-center ISOTYPE ledger across every custom frame", () => {
    const profile = SEMIOTIC_EXAMPLE_PROFILES.find(
      (candidate) => candidate.id === "data-centers-isotype"
    )
    const highlighted = architectureHighlight(profile)

    expect(highlighted).toContain("frame-xy")
    expect(highlighted).toContain("frame-ordinal")
    expect(highlighted).toContain("frame-network")
    expect(highlighted).toContain("frame-geo")
    expect(highlighted).toContain("feature-accessibility")
  })

  it("maps the discrete tokenization example through custom XY layouts", () => {
    const profile = SEMIOTIC_EXAMPLE_PROFILES.find(
      (candidate) => candidate.id === "sometimes-better-discrete"
    )
    const highlighted = architectureHighlight(profile)

    expect(highlighted).toContain("frame-xy")
    expect(highlighted).toContain("hoc-xy-custom")
    expect(highlighted).toContain("feature-custom-layout")
    expect(highlighted).toContain("feature-accessibility")
  })

  it("uses the port replay to connect four previously dark chart families", () => {
    const portReplay = SEMIOTIC_EXAMPLE_PROFILES.find(
      (profile) => profile.id === "port-congestion-replay"
    )
    const highlighted = architectureHighlight(portReplay)

    expect(highlighted).toContain("hoc-geo-movement")
    expect(highlighted).toContain("hoc-network-flow")
    expect(highlighted).toContain("hoc-realtime-waterfall")
    expect(highlighted).toContain("hoc-xy-compound")
    expect(highlighted).toContain("input-static")
    expect(highlighted).toContain("input-push")
  })

  it("expands direct choices into branch, trunk, and relevant roots", () => {
    for (const profile of SEMIOTIC_EXAMPLE_PROFILES) {
      const highlighted = architectureHighlight(profile)
      expect(highlighted).toContain("semiotic-core")
      expect(highlighted).toContain("root-data")
      expect(highlighted).toContain("root-pipelines")
      expect(highlighted).toContain("root-scene")
      expect(highlighted.size).toBeGreaterThan(profile.uses.length)
    }
  })
})
