import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { cpus, platform, arch } from "node:os"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { prepareNetworkAtlas } from "../../src/components/recipes/atlas/prepare"
import { prepareDependencyForest } from "../../src/components/recipes/atlas/dependencyForest"
import { matchMotifs } from "../../src/components/recipes/atlas/motifs"
import { atlasWorkload } from "./workloads"
import { atlasMotifWorkloads } from "../../benchmarks/setup/network-atlas-motif-workloads"
import type { MotifMatchIndex } from "semiotic/atlas/core"

const args = process.argv.slice(2)
const output = args[args.indexOf("--out") + 1]
if (!args.includes("--out") || !output)
  throw new Error("Supply --out <report.json>")
const iterations = args.includes("--iterations")
  ? Number(args[args.indexOf("--iterations") + 1])
  : 5
if (!Number.isInteger(iterations) || iterations < 1)
  throw new Error("Iterations must be a positive integer")
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")
const sourceFiles = readdirSync("src/components/recipes/atlas")
  .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
  .sort()
const sourceDigest = digest(
  sourceFiles.map((file) => [
    file,
    readFileSync(`src/components/recipes/atlas/${file}`, "utf8")
  ])
)
const samples = (run: () => unknown) => {
  run() // Separate warm-up; fixture construction and hashing are never timed.
  const timings = Array.from({ length: iterations }, () => {
    const start = performance.now()
    run()
    return performance.now() - start
  }).sort((a, b) => a - b)
  return {
    samples: iterations,
    medianMs:
      (timings[Math.floor((iterations - 1) / 2)] +
        timings[Math.floor(iterations / 2)]) /
      2,
    p95Ms: timings[Math.ceil(iterations * 0.95) - 1]
  }
}
const matchCounts = (motifs: MotifMatchIndex) =>
  Object.fromEntries(
    ["serial-chain", "fan-out", "fan-in", "repeated-state-episode"].map(
      (template) => [
        template,
        motifs.matches.filter((match) => match.template === template).length
      ]
    )
  )
const workloads = ([1000, 10000] as const).map((size) => {
  const { spec, source } = atlasWorkload({ size, witnessLimit: 5 })
  const prepared = prepareNetworkAtlas(spec, source)
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
  console.log(`Measuring ${size} vertices / ${source.edges.length} edges`)
  return {
    nodes: size,
    edges: source.edges.length,
    sections: 20,
    fixtureDigest: digest({ spec, source }),
    evidenceDigest: digest(prepared.atlas),
    matchesByTemplate: matchCounts(prepared.atlas.motifs),
    matchOutputBytes: Buffer.byteLength(JSON.stringify(prepared.atlas.motifs)),
    preparation: samples(() => prepareNetworkAtlas(spec, source)),
    motifMatching: samples(() => matchMotifs(spec, source)),
    dependencyProjection: samples(() => prepareDependencyForest(prepared.atlas))
  }
})
const motifWorkloads = atlasMotifWorkloads().map(({ name, spec, source }) => {
  const matches = matchMotifs(spec, source)
  return {
    name,
    nodes: source.nodes.length,
    edges: source.edges.length,
    occurrences: source.occurrences?.length ?? 0,
    witnessLimit: spec.motifs.matchBudget,
    fixtureDigest: digest({ spec, source }),
    evidenceDigest: digest(matches),
    matchesByTemplate: matchCounts(matches),
    truncatedMatches: matches.matches.filter((match) => match.truncation)
      .length,
    matchOutputBytes: Buffer.byteLength(JSON.stringify(matches)),
    motifMatching: samples(() => matchMotifs(spec, source))
  }
})
let baseline: unknown
if (args.includes("--compare")) {
  const previous = JSON.parse(
    readFileSync(args[args.indexOf("--compare") + 1], "utf8")
  )
  for (const workload of workloads) {
    const before = previous.workloads.find(
      (candidate: { nodes: number }) => candidate.nodes === workload.nodes
    )
    if (
      !before ||
      before.fixtureDigest !== workload.fixtureDigest ||
      before.evidenceDigest !== workload.evidenceDigest
    )
      throw new Error(
        `Baseline must use identical inputs and prepared evidence for ${workload.nodes} vertices`
      )
  }
  baseline = previous
}
const report = {
  schemaVersion: 1,
  synthetic: true,
  recordedAt: new Date().toISOString(),
  source: {
    kind: "worktree-at-recording",
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim(),
    sourceDigest
  },
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model
  },
  method:
    "One warm-up, then independent samples on the same generated input. Node synchronous kernel and projection, no rendering or browser scheduling. Matching runs the supported catalog; counts and output bytes are reported separately from timing. No reader-benefit measurement.",
  workloads,
  motifWorkloads,
  ...(args.includes("--selection-report")
    ? {
        browserSelection: JSON.parse(
          readFileSync(args[args.indexOf("--selection-report") + 1], "utf8")
        )
      }
    : {}),
  ...(baseline ? { baseline } : {})
}
writeFileSync(output, JSON.stringify(report, null, 2) + "\n")
console.log(`Wrote ${output}`)
