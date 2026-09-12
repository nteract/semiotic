import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { prepareNetworkAtlas } from "./prepare"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"
import { measuresAreComparable, validateAtlas } from "./validate"

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/network-atlas/fixtures"
)

function loadJson(name: string): {
  spec: NetworkAtlasSpec
  source: NetworkAtlasSource
} {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"))
}

describe("validateAtlas", () => {
  it("accepts etl-snapshot-v1", () => {
    const fixture = loadJson("etl-snapshot-v1.json")
    const result = validateAtlas(fixture.spec, fixture.source)
    expect(result.ok).toBe(true)
    expect(result.issues.filter((issue) => issue.severity === "fatal")).toEqual([])
  })

  it("rejects a missing edge id and a dangling endpoint as fatal", () => {
    const { spec, source } = loadJson("etl-snapshot-v1.json")
    const missingId = {
      ...source,
      edges: [...source.edges, { id: "", source: "ingest", target: "enrich" }]
    }
    expect(validateAtlas(spec, missingId).ok).toBe(false)
    const dangling = {
      ...source,
      edges: [...source.edges, { id: "e-bad", source: "ingest", target: "nobody" }]
    }
    const result = validateAtlas(spec, dangling)
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.kind === "dangling-target")).toBe(true)
  })

  it("does not require inbound mass to equal outbound mass at enrich", () => {
    const { spec, source } = loadJson("etl-snapshot-v1.json")
    const expanded: NetworkAtlasSource = {
      ...source,
      measureValues: [
        ...source.measureValues,
        { measureId: "work-items", subjectId: "enrich", value: 120, status: "exact" }
      ]
    }
    expect(validateAtlas(spec, expanded).ok).toBe(true)
  })

  it("treats prototype-named ids as ordinary keys", () => {
    const { spec, source } = loadJson("edge-coverage.json")
    expect(validateAtlas(spec, source).ok).toBe(true)
    expect(source.nodes.some((node) => node.id === "__proto__")).toBe(true)
    expect(source.edges.some((edge) => edge.id === "constructor")).toBe(true)
  })

  it("refuses to compare a stock queue to a rate without a time denominator", () => {
    const { spec } = loadJson("etl-snapshot-v1.json")
    expect(measuresAreComparable("queued", "ingest_arrival_rate", spec)).toEqual({
      ok: false,
      reason: "stock-or-capacity-cannot-compare-to-rate"
    })
    expect(measuresAreComparable("queued", "work-items", spec)).toEqual({ ok: true })
    expect(measuresAreComparable("capacity", "queued", spec)).toEqual({ ok: true })
  })

  it("does not turn an unknown upstream into independent or complete", () => {
    const { spec, source } = loadJson("etl-snapshot-v1.json")
    const prepared = prepareNetworkAtlas(spec, source)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.atlas.completeness.nodes.upstream).toBe("unknown")
    expect(prepared.atlas.completeness.nodes.upstream).not.toBe("known")
  })
})
