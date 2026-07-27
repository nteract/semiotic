#!/usr/bin/env node
/**
 * Aggregate repeated, targeted OpenAI eval runs without pretending that
 * untouched fixtures were rerun. Per-trial result files remain the source of
 * truth for proposals and answers; this report contains scored outcomes and
 * request-ledger totals only.
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { prepareChart } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"
import {
  groundingScoringRevision,
  scoreGroundingAnswer,
} from "./ai-eval-scoring.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const argValue = (name) =>
  process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
const round = (value, places = 4) => Number(value.toFixed(places))

function mergedProposal(fixture, proposal) {
  if (fixture.mode !== "push" || !fixture.push?.rows?.length) return proposal
  if (!Array.isArray(proposal?.props?.data)) return proposal
  return {
    ...proposal,
    props: {
      ...proposal.props,
      data: [...proposal.props.data, ...fixture.push.rows],
    },
  }
}

export function scoreFirstTryProposal(fixture, proposal) {
  try {
    const candidate = mergedProposal(fixture, proposal)
    const result = prepareChart(candidate, {
      data: candidate?.props?.data,
      render: (component, props) =>
        renderChartWithEvidence(component, props),
    })
    const checks = {
      validated: result.validation.valid,
      renderProven: Boolean(
        result.validation.valid &&
          result.evidence &&
          !result.evidence.empty &&
          result.evidence.markCount > 0
      ),
      noErrorDiagnostics: !result.diagnostics.some(
        ({ severity }) => severity === "error"
      ),
    }
    return {
      ...checks,
      markCount: result.evidence?.markCount ?? 0,
      passed: Object.entries(fixture.expect)
        .filter(([key]) => key in checks)
        .every(([key, expected]) => checks[key] === expected),
    }
  } catch (error) {
    return {
      validated: false,
      renderProven: false,
      noErrorDiagnostics: false,
      markCount: 0,
      passed: fixture.expect.validated === false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function summarizeOutcomes(rows, dimensions) {
  const groups = new Map()
  for (const row of rows) {
    const key = dimensions.map((dimension) => row[dimension]).join("\u0000")
    const group = groups.get(key) ?? {
      ...Object.fromEntries(
        dimensions.map((dimension) => [dimension, row[dimension]])
      ),
      trials: 0,
      passed: 0,
    }
    group.trials += 1
    if (row.passed) group.passed += 1
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    passRate: group.trials > 0 ? round(group.passed / group.trials) : null,
  }))
}

function assertEqual(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} differs across trials: expected ${JSON.stringify(
        expected
      )}, got ${JSON.stringify(actual)}`
    )
  }
}

async function buildSummary(runDirectories) {
  const firstTry = await readJson(join(root, "evals/first-try/fixtures.json"))
  const grounding = await readJson(join(root, "evals/grounding/fixtures.json"))
  const firstTryById = new Map(
    firstTry.fixtures.map((fixture) => [fixture.id, fixture])
  )
  const groundingById = new Map(
    grounding.charts.flatMap((chart) =>
      chart.questions.map((question) => [
        `${chart.id}/${question.id}`,
        question,
      ])
    )
  )

  const trialRows = []
  const firstTryRows = []
  const groundingRows = []
  let expectedModels
  let expectedFilters

  for (const runDirectory of runDirectories) {
    const manifest = await readJson(join(runDirectory, "run-manifest.json"))
    if (!manifest.completedAt) {
      throw new Error(`Trial ${runDirectory} is not complete`)
    }
    if (expectedModels) assertEqual("Model list", manifest.models, expectedModels)
    else expectedModels = manifest.models
    if (expectedFilters) assertEqual("Target filters", manifest.filters, expectedFilters)
    else expectedFilters = manifest.filters

    const trialId = manifest.trialId
    if (trialRows.some((row) => row.trialId === trialId)) {
      throw new Error(`Repeated trial id: ${trialId}`)
    }
    trialRows.push({
      trialId,
      completedAt: manifest.completedAt,
      requests: manifest.requestCount,
      estimatedUsd: manifest.estimatedUsd,
    })

    for (const model of manifest.models) {
      const modelDirectory = join(
        runDirectory,
        model.replace(/[^a-zA-Z0-9._-]/g, "-")
      )
      if (manifest.filters?.suites?.includes("first-try")) {
        const submission = await readJson(
          join(modelDirectory, "first-try-results.json")
        )
        if (submission.metadata.fixtureRevision !== firstTry.fixtureRevision) {
          throw new Error(
            `${trialId}/${model} first-try revision is ${submission.metadata.fixtureRevision}; expected ${firstTry.fixtureRevision}`
          )
        }
        for (const result of submission.results) {
          const fixture = firstTryById.get(result.fixtureId)
          if (!fixture) {
            throw new Error(`Unknown first-try fixture ${result.fixtureId}`)
          }
          firstTryRows.push({
            trialId,
            model,
            fixtureId: result.fixtureId,
            ...scoreFirstTryProposal(fixture, result.proposal),
          })
        }
      }

      if (manifest.filters?.suites?.includes("grounding")) {
        const submission = await readJson(
          join(modelDirectory, "grounding-results.json")
        )
        if (submission.metadata.fixtureRevision !== grounding.fixtureRevision) {
          throw new Error(
            `${trialId}/${model} grounding revision is ${submission.metadata.fixtureRevision}; expected ${grounding.fixtureRevision}`
          )
        }
        for (const response of submission.responses) {
          const question = groundingById.get(response.fixtureId)
          if (!question) {
            throw new Error(`Unknown grounding fixture ${response.fixtureId}`)
          }
          groundingRows.push({
            trialId,
            model,
            fixtureId: response.fixtureId,
            condition: response.condition,
            answerable: !question.expected.abstain,
            ...scoreGroundingAnswer(question.expected, response.answer, true),
          })
        }
      }
    }
  }

  const expectedFirstTryCount =
    (expectedFilters?.firstTryFixtureIds?.length ?? 0) *
    expectedModels.length *
    runDirectories.length
  const expectedGroundingCount =
    (expectedFilters?.groundingFixtureIds?.length ?? 0) *
    (expectedFilters?.groundingConditions?.length ?? 0) *
    expectedModels.length *
    runDirectories.length
  if (firstTryRows.length !== expectedFirstTryCount) {
    throw new Error(
      `Expected ${expectedFirstTryCount} first-try outcomes, found ${firstTryRows.length}`
    )
  }
  if (groundingRows.length !== expectedGroundingCount) {
    throw new Error(
      `Expected ${expectedGroundingCount} grounding outcomes, found ${groundingRows.length}`
    )
  }

  const totalCost = trialRows.reduce(
    (sum, trial) => sum + trial.estimatedUsd,
    0
  )
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    fixtureRevisions: {
      firstTry: firstTry.fixtureRevision,
      grounding: grounding.fixtureRevision,
      groundingScoring: groundingScoringRevision,
    },
    models: expectedModels,
    filters: expectedFilters,
    summary: {
      trials: trialRows.length,
      requests: trialRows.reduce((sum, trial) => sum + trial.requests, 0),
      estimatedUsd: round(totalCost, 8),
      firstTryOutcomes: firstTryRows.length,
      groundingOutcomes: groundingRows.length,
    },
    trials: trialRows,
    firstTry: {
      byModel: summarizeOutcomes(firstTryRows, ["model"]),
      byFixture: summarizeOutcomes(firstTryRows, ["fixtureId"]),
      byModelAndFixture: summarizeOutcomes(firstTryRows, [
        "model",
        "fixtureId",
      ]),
      outcomes: firstTryRows,
    },
    grounding: {
      byModel: summarizeOutcomes(groundingRows, ["model"]),
      byModelAndCondition: summarizeOutcomes(groundingRows, [
        "model",
        "condition",
      ]),
      byFixtureAndCondition: summarizeOutcomes(groundingRows, [
        "fixtureId",
        "condition",
      ]),
      outcomes: groundingRows,
    },
  }
}

async function main() {
  const runDirectories = (argValue("runs") ?? "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => resolve(path))
  if (runDirectories.length < 2) {
    throw new Error(
      "--runs requires at least two comma-separated trial directories"
    )
  }
  const outputPath = argValue("output")
  if (!outputPath) throw new Error("--output is required")
  const summary = await buildSummary(runDirectories)
  await writeFile(resolve(outputPath), `${JSON.stringify(summary, null, 2)}\n`)
  process.stdout.write(
    `summarized ${summary.summary.trials} trials, ${summary.summary.requests} requests, $${summary.summary.estimatedUsd.toFixed(4)}\n`
  )
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  })
}
