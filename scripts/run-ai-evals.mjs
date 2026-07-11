#!/usr/bin/env node
/** Run deterministic, release-comparable AI fixture checks. */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const discovery = JSON.parse(fs.readFileSync(path.join(root, "evals/tool-discovery/golden-prompts.json"), "utf8"))
const firstTry = JSON.parse(fs.readFileSync(path.join(root, "evals/first-try/fixtures.json"), "utf8"))
const publicTools = new Set(["createChart", "improveChart", "explainChart", "auditChart", "getChartSchema"])

const invalid = discovery.cases.flatMap((entry) => entry.expectedTools.filter((tool) => !publicTools.has(tool)).map((tool) => `${entry.id}: ${tool}`))
if (invalid.length) throw new Error(`Golden prompts reference unknown public tool(s): ${invalid.join(", ")}`)
const fixtureFailures = firstTry.fixtures.filter((fixture) => !fixture.id || !fixture.proposal?.component || typeof fixture.expect?.validated !== "boolean")
if (fixtureFailures.length) throw new Error(`Invalid first-try fixture(s): ${fixtureFailures.map((fixture) => fixture.id || "unnamed").join(", ")}`)

const report = {
  version: 1,
  toolDiscovery: {
    cases: discovery.cases.length,
    positiveCases: discovery.cases.filter((entry) => entry.expectedTools.length > 0).length,
    negativeCases: discovery.cases.filter((entry) => entry.expectedTools.length === 0).length,
    publicTools: [...publicTools],
  },
  firstTry: { fixtures: firstTry.fixtures.length, renderProvenExpectations: firstTry.fixtures.filter((fixture) => fixture.expect.renderProven).length },
}
console.log(JSON.stringify(report, null, 2))
