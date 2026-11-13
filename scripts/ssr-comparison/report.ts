import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Artifact, FixtureResult } from "./types"

export interface Report {
  schemaVersion: 1
  startedAt: string
  status: "running" | "equal" | "different" | "unsupported" | "error"
  mode: "report"
  settings: object
  tooling: object
  artifacts: Partial<Record<"previous" | "current", Artifact>>
  runtime: Record<string, unknown>
  fixtures: FixtureResult[]
  errors: { phase: string; message: string }[]
}

export function writeReport(report: Report, outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const fixtures = report.fixtures.map((fixture) => {
    const sides = Object.fromEntries(
      (["previous", "current"] as const).map((name) => {
        const { renders, normalized, ...side } = fixture[name]
        const directory = join(outDir, "fixtures", fixture.id)
        mkdirSync(directory, { recursive: true })
        // A failed repeat must not leave a previous run's successful normalized
        // file beside the new raw failure. These filenames are owned by the report.
        for (const suffix of [
          "raw.svg",
          "normalized.svg",
          "evidence.json",
          "repeat.raw.svg",
          "repeat.evidence.json"
        ])
          rmSync(join(directory, `${name}.${suffix}`), { force: true })
        const files: Record<string, string> = {}
        const save = (label: string, suffix: string, contents: string) => {
          const path = `fixtures/${fixture.id}/${name}.${suffix}`
          writeFileSync(join(outDir, path), contents)
          files[label] = path
        }
        if (renders?.[0]) {
          save("svg", "raw.svg", renders[0].svg)
          save(
            "evidence",
            "evidence.json",
            JSON.stringify(renders[0].evidence, null, 2) + "\n"
          )
        }
        if (normalized !== undefined)
          save("normalized", "normalized.svg", normalized)
        if (side.status === "error" && renders?.[1]) {
          save("repeatSvg", "repeat.raw.svg", renders[1].svg)
          save(
            "repeatEvidence",
            "repeat.evidence.json",
            JSON.stringify(renders[1].evidence, null, 2) + "\n"
          )
        }
        return [name, { ...side, files }]
      })
    )
    const { previous: _before, current: _after, ...metadata } = fixture
    return { ...metadata, ...sides }
  })
  const summary = Object.fromEntries(
    ["equal", "different", "unsupported", "error"].map((status) => [
      status,
      fixtures.filter((fixture) => fixture.status === status).length
    ])
  )
  writeFileSync(
    join(outDir, "report.json"),
    JSON.stringify({ ...report, fixtures, summary }, null, 2) + "\n"
  )
  const escape = (value: unknown) =>
    String(value)
      .replace(/\|/g, "\\|")
      .replace(/[\r\n]+/g, " ")
  const lines = [
    "# SSR release comparison",
    "",
    `Status: **${report.status}**. Output differences are informational; execution, acquisition, and SVG integrity errors fail the command.`,
    "",
    `Fixtures: ${summary.equal} equal, ${summary.different} different, ${summary.unsupported} unsupported by the previous artifact, ${summary.error} errors.`,
    "",
    "## Artifacts",
    "",
    "| Side | Source | Version | SHA-256 | Commit |",
    "| --- | --- | --- | --- | --- |"
  ]
  for (const side of ["previous", "current"] as const) {
    const artifact = report.artifacts[side]
    lines.push(
      artifact
        ? `| ${side} | ${escape(artifact.source)} (${artifact.kind}) | ${artifact.version} | \`${artifact.sha256}\` | ${artifact.gitHead || artifact.checkout?.commit || "not supplied by artifact"}${artifact.checkout?.dirty ? " (dirty checkout)" : ""} |`
        : `| ${side} | unavailable | — | — | — |`
    )
  }
  lines.push(
    "",
    "Exact integrity, runtime versions, inputs, settings and errors: [report.json](report.json), [fixtures.json](fixtures.json).",
    "",
    "## Fixtures",
    "",
    "| Fixture | Result | SVG | Evidence | Before | After |",
    "| --- | --- | --- | --- | --- | --- |"
  )
  const details: string[] = []
  fixtures.forEach((fixture, index) => {
    const result = report.fixtures[index]
    const links = (side: "previous" | "current") => {
      if (!result[side].renders?.[0]) return "—"
      const base = `fixtures/${fixture.id}/${side}`
      return `[raw](${base}.raw.svg)${result[side].normalized === undefined ? "" : ` / [normalized](${base}.normalized.svg)`} / [evidence](${base}.evidence.json)`
    }
    lines.push(
      `| ${fixture.id} | ${fixture.status} | ${fixture.svgChanged === undefined ? "not compared" : fixture.svgChanged ? "changed" : "equal"} | ${fixture.evidenceComparison === "unavailable" ? "unavailable in one/both artifacts" : fixture.evidenceComparison === "compared" ? (fixture.evidenceChanged ? "changed" : "equal") : "not compared"} | ${links("previous")} | ${links("current")} |`
    )
    for (const side of ["previous", "current"] as const) {
      const detail = result[side].error || result[side].reasons?.join("; ")
      if (detail) details.push(`- ${fixture.id} (${side}): ${escape(detail)}`)
    }
  })
  if (details.length) lines.push("", "## Fixture diagnostics", "", ...details)
  if (report.errors.length)
    lines.push(
      "",
      "## Errors",
      "",
      ...report.errors.map(
        (error) => `- ${escape(error.phase)}: ${escape(error.message)}`
      )
    )
  lines.push(
    "",
    "Generated ID scopes and attribute ordering are canonicalized. Child order, text and accessibility content are retained. Derived scene hashes remain in raw evidence; SVG and evidence values determine comparisons. See report.json for exact precision settings.",
    ""
  )
  writeFileSync(join(outDir, "report.md"), lines.join("\n"))
}
