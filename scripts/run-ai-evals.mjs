#!/usr/bin/env node
/** Run deterministic, release-comparable AI fixture checks and score submissions. */
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { prepareChart } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"
import Ajv2020 from "ajv/dist/2020.js"
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

const discovery = await readJson(
  join(root, "evals/tool-discovery/golden-prompts.json")
)
const firstTry = await readJson(join(root, "evals/first-try/fixtures.json"))
const firstTryJobs = await readJson(join(root, "evals/first-try/jobs.json"))
const grounding = await readJson(join(root, "evals/grounding/fixtures.json"))
const groundingManifest = await readJson(
  join(root, "evals/grounding/manifest.json")
)
const firstTryResultSchema = await readJson(
  join(root, "evals/first-try/result-schema.json")
)
const groundingResultSchema = await readJson(
  join(root, "evals/grounding/result-schema.json")
)
const publicTools = new Set([
  "createChart",
  "improveChart",
  "explainChart",
  "auditChart",
  "getChartSchema",
])

const generationFixtureIds = firstTry.fixtures
  .filter(({ kind }) => kind === "generation")
  .map(({ id }) => id)
const firstTryJobIds = firstTryJobs.jobs.map(({ fixtureId }) => fixtureId)
if (
  firstTryJobs.fixtureRevision !== firstTry.fixtureRevision ||
  JSON.stringify(firstTryJobIds) !== JSON.stringify(generationFixtureIds)
) {
  throw new Error(
    "First-try jobs drifted from fixtures; run npm run prepare:ai-evals"
  )
}

const invalidTools = discovery.cases.flatMap((entry) =>
  entry.expectedTools
    .filter((tool) => !publicTools.has(tool))
    .map((tool) => `${entry.id}: ${tool}`)
)
if (invalidTools.length) {
  throw new Error(
    `Golden prompts reference unknown public tool(s): ${invalidTools.join(", ")}`
  )
}

function validateMetadata(submission, fixtureRevision, label) {
  for (const field of ["modelId", "clientVersion", "fixtureRevision", "date"]) {
    if (!submission?.metadata?.[field]) {
      throw new Error(`${label} submission metadata is missing ${field}`)
    }
  }
  if (submission.metadata.fixtureRevision !== fixtureRevision) {
    throw new Error(
      `${label} fixture revision mismatch: expected ${fixtureRevision}, got ${submission.metadata.fixtureRevision}`
    )
  }
}

function validateSubmission(schema, submission, label) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  })
  const validate = ajv.compile(schema)
  if (validate(submission)) return
  throw new Error(
    `${label} submission does not match its result schema: ${ajv.errorsText(
      validate.errors
    )}`
  )
}

function uniqueSubmissionMap(entries, idFor, knownIds, label) {
  const result = new Map()
  for (const entry of entries) {
    const id = idFor(entry)
    if (!knownIds.has(id)) {
      throw new Error(`${label} submission references unknown fixture ${id}`)
    }
    if (result.has(id)) {
      throw new Error(`${label} submission repeats fixture ${id}`)
    }
    result.set(id, entry)
  }
  return result
}

function mergedProposal(fixture, proposal) {
  if (fixture.mode !== "push" || !fixture.push?.rows?.length) return proposal
  const data = proposal?.props?.data
  if (!Array.isArray(data)) return proposal
  return {
    ...proposal,
    props: {
      ...proposal.props,
      data: [...data, ...fixture.push.rows],
    },
  }
}

function scoreProposal(fixture, proposal) {
  try {
    const candidate = mergedProposal(fixture, proposal)
    const result = prepareChart(candidate, {
      data: candidate?.props?.data,
      render: (component, props) =>
        renderChartWithEvidence(component, props),
    })
    const actual = {
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
      markCount: result.evidence?.markCount ?? 0,
      empty: result.evidence?.empty ?? null,
      diagnostics: result.diagnostics.map(({ code, severity }) => ({
        code,
        severity,
      })),
      repairStatus: result.repair?.status ?? null,
    }
    const checks = Object.entries(fixture.expect)
      .filter(([key]) =>
        ["validated", "renderProven", "noErrorDiagnostics"].includes(key)
      )
      .map(([key, expected]) => actual[key] === expected)
    return { ...actual, passed: checks.every(Boolean) }
  } catch (error) {
    return {
      validated: false,
      renderProven: false,
      noErrorDiagnostics: false,
      markCount: 0,
      empty: null,
      diagnostics: [],
      repairStatus: null,
      error: error instanceof Error ? error.message : String(error),
      passed: fixture.expect.validated === false,
    }
  }
}

const firstTryResultsPath = argValue("first-try-results")
const firstTrySubmission = firstTryResultsPath
  ? await readJson(resolve(firstTryResultsPath))
  : null
if (firstTrySubmission) {
  validateSubmission(
    firstTryResultSchema,
    firstTrySubmission,
    "First-try"
  )
  validateMetadata(
    firstTrySubmission,
    firstTry.fixtureRevision,
    "First-try"
  )
}
const submittedProposals = uniqueSubmissionMap(
  firstTrySubmission?.results ?? [],
  (entry) => entry.fixtureId,
  new Set(generationFixtureIds),
  "First-try"
)
const firstTryRaw = firstTry.fixtures.map((fixture) => {
  const submitted = submittedProposals.get(fixture.id)
  const modelFixture = firstTrySubmission && fixture.kind === "generation"
  const firstAttempt =
    modelFixture && !submitted
      ? {
          validated: false,
          renderProven: false,
          noErrorDiagnostics: false,
          markCount: 0,
          empty: null,
          diagnostics: [],
          repairStatus: null,
          error: "Missing model submission",
          passed: false,
        }
      : scoreProposal(fixture, submitted?.proposal ?? fixture.proposal)
  const postRepair = submitted?.repairProposal
    ? scoreProposal(fixture, submitted.repairProposal)
    : null
  return {
    id: fixture.id,
    kind: fixture.kind,
    family: fixture.family,
    mode: fixture.mode,
    source: submitted ? "model-submission" : "committed-reference",
    firstAttempt,
    postRepair,
  }
})
const generationRows = firstTryRaw.filter(({ kind }) => kind === "generation")
if (!firstTrySubmission) {
  const failedReferences = firstTryRaw.filter(
    ({ firstAttempt }) => !firstAttempt.passed
  )
  if (failedReferences.length) {
    throw new Error(
      `First-try reference oracle failed: ${failedReferences
        .map(({ id }) => id)
        .join(", ")}`
    )
  }
}

const manifestById = new Map(
  groundingManifest.entries.map((entry) => [entry.id, entry])
)
const groundingCases = grounding.charts.flatMap((chart) =>
  chart.questions.flatMap((question) =>
    grounding.conditions.map((condition) => ({
      fixtureId: `${chart.id}/${question.id}`,
      chartId: chart.id,
      questionId: question.id,
      condition,
      expected: question.expected,
    }))
  )
)

for (const chart of grounding.charts) {
  const entry = manifestById.get(chart.id)
  if (!entry) throw new Error(`Grounding manifest is missing ${chart.id}`)
  for (const artifact of [entry.png, entry.grounding]) {
    const bytes = await readFile(join(root, "evals/grounding", artifact.path))
    const hash = createHash("sha256").update(bytes).digest("hex")
    if (bytes.byteLength !== artifact.bytes || hash !== artifact.sha256) {
      throw new Error(`Grounding artifact drift: ${artifact.path}`)
    }
  }
}
{
  const bytes = await readFile(
    join(root, "evals/grounding", groundingManifest.jobs.path)
  )
  const hash = createHash("sha256").update(bytes).digest("hex")
  if (
    bytes.byteLength !== groundingManifest.jobs.bytes ||
    hash !== groundingManifest.jobs.sha256
  ) {
    throw new Error(
      `Grounding artifact drift: ${groundingManifest.jobs.path}`
    )
  }
}

const groundingResultsPath = argValue("grounding-results")
const groundingSubmission = groundingResultsPath
  ? await readJson(resolve(groundingResultsPath))
  : null
if (groundingSubmission) {
  validateSubmission(
    groundingResultSchema,
    groundingSubmission,
    "Grounding"
  )
  validateMetadata(
    groundingSubmission,
    grounding.fixtureRevision,
    "Grounding"
  )
}
const groundingCaseIds = new Set(
  groundingCases.map(
    ({ fixtureId, condition }) => `${fixtureId}/${condition}`
  )
)
const submittedAnswers = uniqueSubmissionMap(
  groundingSubmission?.responses ?? [],
  (entry) => `${entry.fixtureId}/${entry.condition}`,
  groundingCaseIds,
  "Grounding"
)
const groundingRaw = groundingCases.map((entry) => {
  const answer = submittedAnswers.get(
    `${entry.fixtureId}/${entry.condition}`
  )?.answer
  return {
    fixtureId: entry.fixtureId,
    condition: entry.condition,
    answerable: !entry.expected.abstain,
    ...scoreGroundingAnswer(
      entry.expected,
      answer,
      Boolean(groundingSubmission)
    ),
  }
})

const conditionSummary = Object.fromEntries(
  grounding.conditions.map((condition) => {
    const rows = groundingRaw.filter((entry) => entry.condition === condition)
    const scored = rows.filter((entry) => entry.status !== "pending")
    return [
      condition,
      {
        trials: rows.length,
        scored: scored.length,
        passed: scored.filter(({ passed }) => passed).length,
        accuracy:
          scored.length > 0
            ? scored.filter(({ passed }) => passed).length / scored.length
            : null,
        unanswerableTrials: rows.filter(({ answerable }) => !answerable).length,
      },
    ]
  })
)

const report = {
  version: 2,
  generatedAt: new Date().toISOString(),
  toolDiscovery: {
    summary: {
      cases: discovery.cases.length,
      positiveCases: discovery.cases.filter(
        (entry) => entry.expectedTools.length > 0
      ).length,
      negativeCases: discovery.cases.filter(
        (entry) => entry.expectedTools.length === 0
      ).length,
      publicTools: [...publicTools],
    },
    raw: discovery.cases,
  },
  firstTry: {
    metadata: firstTrySubmission?.metadata ?? {
      fixtureRevision: firstTry.fixtureRevision,
      source: "committed-reference",
    },
    summary: {
      generationFixtures: generationRows.length,
      guardFixtures: firstTryRaw.length - generationRows.length,
      staticFixtures: generationRows.filter(({ mode }) => mode === "static")
        .length,
      pushFixtures: generationRows.filter(({ mode }) => mode === "push")
        .length,
      firstAttemptPassed: generationRows.filter(
        ({ firstAttempt }) => firstAttempt.passed
      ).length,
      postRepairAttempted: generationRows.filter(({ postRepair }) => postRepair)
        .length,
      postRepairPassed: generationRows.filter(
        ({ postRepair }) => postRepair?.passed
      ).length,
    },
    raw: firstTryRaw,
  },
  grounding: {
    metadata: {
      ...(groundingSubmission?.metadata ?? {
        fixtureRevision: grounding.fixtureRevision,
        status: "awaiting-model-results",
      }),
      scoringRevision: groundingScoringRevision,
    },
    summary: {
      charts: grounding.charts.length,
      questions: grounding.charts.reduce(
        (total, chart) => total + chart.questions.length,
        0
      ),
      trials: groundingRaw.length,
      conditions: conditionSummary,
    },
    raw: groundingRaw,
  },
}

const outputPath = argValue("output")
if (outputPath) {
  await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`)
}
process.stderr.write(
  [
    `first-try ${report.firstTry.summary.firstAttemptPassed}/${report.firstTry.summary.generationFixtures}`,
    `grounding ${report.grounding.summary.trials} trials`,
    groundingSubmission ? "scored" : "awaiting model results",
  ].join(" · ") + "\n"
)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
