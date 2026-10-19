import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import Ajv from "ajv/dist/2020"
import { prepareCompositionalGraph } from "./prepare"

describe("portable compositional schema", () => {
  const validate = new Ajv({ strict: true }).compile(
    JSON.parse(
      readFileSync("spec/v0.1/compositional-graph.schema.json", "utf8")
    )
  )
  const graph = {
    schemaVersion: "semiotic.compositional-graph.v0.1" as const,
    graphId: "g",
    revision: "1",
    nodes: [
      {
        id: "a",
        parts: [{ id: "x", ports: [{ id: "out", direction: "out" as const }] }]
      },
      { id: "b" }
    ],
    edges: [
      {
        id: "e",
        source: "a",
        sourceEndpoint: { kind: "part" as const, partId: "x", portId: "out" },
        target: "b"
      }
    ]
  }
  it("accepts portable runtime snapshots and rejects malformed DTOs", () => {
    expect(
      validate(prepareCompositionalGraph(graph).graph),
      JSON.stringify(validate.errors)
    ).toBe(true)
    expect(
      validate({ ...graph, edges: [{ ...graph.edges[0], id: undefined }] })
    ).toBe(false)
    expect(
      validate({
        ...graph,
        edges: [{ ...graph.edges[0], sourceEndpoint: { kind: "part" } }]
      })
    ).toBe(false)
  })
  it("rejects non-JSON payloads before freezing or dropping values", () => {
    expect(() =>
      prepareCompositionalGraph({
        ...graph,
        nodes: [{ id: "a", data: NaN }, { id: "b" }]
      })
    ).toThrow()
    expect(() =>
      prepareCompositionalGraph({
        ...graph,
        nodes: graph.nodes.map((n) => ({ ...n, data: { value: Infinity } }))
      })
    ).toThrow("NONPORTABLE")
  })
})
