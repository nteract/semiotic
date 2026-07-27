#!/usr/bin/env node
import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { buildReaderGrounding } from "semiotic/ai"
import { renderChartWithEvidence, renderToImage } from "semiotic/server"
import sharp from "sharp"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const groundingDirectory = join(root, "evals/grounding")
const fixturePath = join(groundingDirectory, "fixtures.json")
const firstTryDirectory = join(root, "evals/first-try")
const assetsDirectory = join(groundingDirectory, "assets")
const payloadDirectory = join(groundingDirectory, "payloads")
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"))
const firstTry = JSON.parse(
  await readFile(join(firstTryDirectory, "fixtures.json"), "utf8")
)

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex")

await mkdir(assetsDirectory, { recursive: true })
await mkdir(payloadDirectory, { recursive: true })

const entries = []
for (const chart of fixtures.charts) {
  const { evidence } = renderChartWithEvidence(chart.component, chart.props)
  if (evidence.empty || evidence.markCount <= 0) {
    throw new Error(
      `${chart.id} rendered an empty scene (${evidence.markCount} marks)`
    )
  }

  const transparentPng = await renderToImage(chart.component, chart.props, {
    format: "png",
  })
  const png = await sharp(transparentPng)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
  const grounding = buildReaderGrounding(chart.component, chart.props)
  if (!grounding.text || !grounding.structure) {
    throw new Error(`${chart.id} produced incomplete reader grounding`)
  }

  const pngName = `${chart.id}.png`
  const payloadName = `${chart.id}.json`
  const payloadBytes = Buffer.from(`${JSON.stringify(grounding, null, 2)}\n`)
  await writeFile(join(assetsDirectory, pngName), png)
  await writeFile(join(payloadDirectory, payloadName), payloadBytes)
  entries.push({
    id: chart.id,
    component: chart.component,
    questions: chart.questions.length,
    renderEvidence: {
      markCount: evidence.markCount,
      empty: evidence.empty,
      warnings: evidence.warnings,
    },
    png: {
      path: `assets/${pngName}`,
      bytes: png.byteLength,
      sha256: digest(png),
    },
    grounding: {
      path: `payloads/${payloadName}`,
      bytes: payloadBytes.byteLength,
      sha256: digest(payloadBytes),
    },
  })
}

const groundingJobs = fixtures.charts.flatMap((chart) =>
  chart.questions.flatMap((question) =>
    fixtures.conditions.map((condition) => ({
      fixtureId: `${chart.id}/${question.id}`,
      chartId: chart.id,
      condition,
      question: question.prompt,
      inputs: {
        png:
          condition === "grounding-only"
            ? null
            : `assets/${chart.id}.png`,
        grounding:
          condition === "png-only"
            ? null
            : `payloads/${chart.id}.json`,
      },
    }))
  )
)
const groundingJobBytes = Buffer.from(
  `${JSON.stringify(
    {
      version: 1,
      fixtureRevision: fixtures.fixtureRevision,
      jobs: groundingJobs,
    },
    null,
    2
  )}\n`
)
await writeFile(join(groundingDirectory, "jobs.json"), groundingJobBytes)

const firstTryJobs = firstTry.fixtures
  .filter(({ kind }) => kind === "generation")
  .map((fixture) => {
    const inputKeys = [
      "data",
      "points",
      "nodes",
      "edges",
      "links",
      "windows",
      "value",
      "min",
      "max",
      "thresholds",
    ]
    const input = Object.fromEntries(
      inputKeys
        .filter((key) => fixture.proposal.props[key] !== undefined)
        .map((key) => [key, fixture.proposal.props[key]])
    )
    return {
      fixtureId: fixture.id,
      prompt: fixture.prompt,
      family: fixture.family,
      mode: fixture.mode,
      context: firstTry.context,
      input,
      output: "Return one JSON object with component and props.",
      ...(fixture.mode === "push"
        ? {
            pushRows: fixture.push.rows,
            pushRequirement:
              "Choose a chart that supports ref-based push for the supplied pushRows; the returned value remains a component/props JSON object.",
          }
        : {}),
    }
  })
await writeFile(
  join(firstTryDirectory, "jobs.json"),
  `${JSON.stringify(
    {
      version: 1,
      fixtureRevision: firstTry.fixtureRevision,
      jobs: firstTryJobs,
    },
    null,
    2
  )}\n`
)

const manifest = {
  version: 1,
  fixtureRevision: fixtures.fixtureRevision,
  chartCount: entries.length,
  questionCount: entries.reduce((total, entry) => total + entry.questions, 0),
  trialCount:
    entries.reduce((total, entry) => total + entry.questions, 0) *
    fixtures.conditions.length,
  conditions: fixtures.conditions,
  jobs: {
    path: "jobs.json",
    bytes: groundingJobBytes.byteLength,
    sha256: digest(groundingJobBytes),
  },
  entries,
}
await writeFile(
  join(groundingDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
)
process.stdout.write(
  `Prepared ${firstTryJobs.length} first-try jobs, ${manifest.chartCount} grounding charts, ${manifest.questionCount} questions, and ${manifest.trialCount} condition trials.\n`
)
