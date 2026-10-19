import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const id = { type: "string", minLength: 1 }
const string = { type: "string" }
const ref = name => ({ $ref: `#/$defs/${name}` })
const array = items => ({ type: "array", items })
const object = (properties, required) => ({ type: "object", properties, required, additionalProperties: false })
const common = { id, kind: string, label: string, data: ref("json") }
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://semiotic.nteract.io/spec/v0.1/compositional-graph.schema.json",
  title: "Semiotic compositional graph v0.1",
  description: "Portable semantics only. Runtime preparation additionally validates identity uniqueness, containment, endpoint resolution and port directions.",
  ...object({ schemaVersion: { const: "semiotic.compositional-graph.v0.1" }, graphId: id, revision: id,
    nodes: array(ref("node")), edges: array(ref("connection")), transfers: array(ref("transfer")) }, ["schemaVersion", "graphId", "revision", "nodes", "edges"]),
  $defs: {
    json: { anyOf: [...["null", "boolean", "number", "string"].map(type => ({ type })), array(ref("json")), { type: "object", additionalProperties: ref("json") }] },
    endpoint: { oneOf: [object({ kind: { const: "node" }, portId: id }, ["kind"]), object({ kind: { const: "part" }, partId: id, portId: id }, ["kind", "partId"])] },
    port: object({ id, label: string, direction: { enum: ["in", "out", "inout"] }, channel: string, valueType: string }, ["id", "direction"]),
    part: object({ ...common, parentPartId: id, ports: array(ref("port")) }, ["id"]),
    node: object({ ...common, parentId: id, ports: array(ref("port")), parts: array(ref("part")), tracePolicy: { enum: ["atomic", "explicit", "opaque"] } }, ["id"]),
    evidence: object({ basis: { enum: ["declared", "observed", "inferred", "illustrative", "unknown"] }, precision: { enum: ["exact", "conservative", "unknown"] }, runId: id, snapshotId: id, referenceIds: array(id) }, ["basis", "precision"]),
    connection: object({ id, source: id, target: id, sourceEndpoint: ref("endpoint"), targetEndpoint: ref("endpoint"), kind: string, data: ref("json"), evidence: ref("evidence") }, ["id", "source", "target"]),
    transfer: { ...object({ id, nodeId: id, sources: { ...array(ref("endpoint")), minItems: 1, uniqueItems: true }, target: ref("endpoint"),
      combination: { enum: ["identity", "all", "any", "unspecified"] }, kind: string, evidence: ref("evidence") }, ["id", "nodeId", "sources", "target", "combination"]),
      allOf: [{ if: { properties: { combination: { const: "identity" } } }, then: { properties: { sources: { type: "array", maxItems: 1 } } } }] }
  }
}
const path = fileURLToPath(new URL("../spec/v0.1/compositional-graph.schema.json", import.meta.url))
const content = JSON.stringify(schema, null, 2) + "\n"
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== content) throw new Error("Compositional schema is stale; run node scripts/generate-compositional-schema.mjs")
} else writeFileSync(path, content)
