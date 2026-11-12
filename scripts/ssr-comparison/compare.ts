import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "esbuild"
import { digest, json } from "./artifacts"
import { comparableEvidence, normalizeSvg, stableJson } from "./normalize"
import type { Fixture, FixtureResult, SideResult } from "./types"

export function runRenderer(
  consumer: string,
  fixtures: Fixture[],
  workerSource: string
) {
  const worker = transformSync(readFileSync(workerSource, "utf8"), {
    loader: "ts",
    format: "esm",
    target: "node22"
  }).code
  writeFileSync(join(consumer, "render.mjs"), worker)
  writeFileSync(join(consumer, "fixtures.json"), JSON.stringify(fixtures))
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    TZ: "UTC",
    LANG: "en_US.UTF-8"
  }
  delete env.NODE_PATH
  delete env.NODE_OPTIONS
  const result = spawnSync(process.execPath, [join(consumer, "render.mjs")], {
    cwd: consumer,
    env,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024
  })
  writeFileSync(
    join(consumer, "render.log"),
    `${result.stdout || ""}\n${result.stderr || ""}`
  )
  if (result.error || result.status !== 0)
    throw new Error(
      `Isolated renderer failed: ${result.error || result.stderr || result.stdout}`
    )
  const output = json(join(consumer, "results.json"))
  for (const fixture of fixtures) {
    if (!output.results?.[fixture.id])
      throw new Error(`Renderer omitted fixture ${fixture.id}`)
  }
  return output as {
    runtime: Record<string, string>
    entry: string
    packageRoot: string
    evidenceAvailable: boolean
    results: Record<string, SideResult>
  }
}

export function validateResult(
  side: SideResult,
  precision?: number,
  generatedScope = true
): SideResult {
  if (side.status !== "rendered") return side
  try {
    if (side.renders?.length !== 2)
      throw new Error("Expected two renders for determinism checking")
    const [first, second] = side.renders
    const normalized = normalizeSvg(first.svg, precision, generatedScope)
    if (
      normalized !== normalizeSvg(second.svg, precision, generatedScope) ||
      stableJson(comparableEvidence(first.evidence)) !==
        stableJson(comparableEvidence(second.evidence))
    )
      throw new Error(
        "Repeated renders of this artifact are nondeterministic after normalization"
      )
    return { ...side, normalized, svgHash: digest(normalized) }
  } catch (error) {
    return { ...side, status: "error", error: String(error) }
  }
}

export function compareFixture(
  fixture: Fixture,
  previous: SideResult,
  current: SideResult,
  precision?: number
): FixtureResult {
  const callerPrefix = fixture.props._idPrefix ?? fixture.props.chartId
  const generatedScope = callerPrefix == null || callerPrefix === ""
  previous = validateResult(previous, precision, generatedScope)
  current = validateResult(current, precision, generatedScope)
  const common = {
    id: fixture.id,
    component: fixture.component,
    inputSha256: fixture.sha256,
    previous,
    current
  }
  if (
    previous.status === "error" ||
    current.status === "error" ||
    current.status === "unsupported"
  )
    return { ...common, status: "error" }
  if (previous.status === "unsupported")
    return { ...common, status: "unsupported" }
  const before = comparableEvidence(previous.renders![0].evidence)
  const after = comparableEvidence(current.renders![0].evidence)
  const svgChanged = previous.normalized !== current.normalized
  const evidenceChanged =
    before !== null &&
    after !== null &&
    stableJson(before) !== stableJson(after)
  return {
    ...common,
    status: svgChanged || evidenceChanged ? "different" : "equal",
    svgChanged,
    evidenceChanged,
    evidenceComparison:
      before !== null && after !== null ? "compared" : "unavailable"
  }
}
