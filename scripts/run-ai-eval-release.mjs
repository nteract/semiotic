#!/usr/bin/env node
/**
 * One command for a release-tracked evaluation run.
 *
 * It plans one provider run per provider, trial, and first-try context, hands
 * each to the provider runner (`run-openai-ai-evals.mjs`), then scores every
 * result and writes `release-report.json`: pass rates per model with their
 * spread across trials, the outcome variance of every fixture, and the
 * package version, fixture revisions, model ids, and date the numbers belong
 * to.
 *
 *   npm run eval:ai:release -- --dry-run
 *   npm run eval:ai:release -- --project=proj_... --max-usd=25 --confirm-spend
 *
 * `--dry-run` prints the plan, the request counts, and cost figures. It reads
 * no credential and makes no network call. A paid run needs `--confirm-spend`
 * and, for providers with a price table, one `--max-usd` ceiling for the whole
 * run. Every provider run is resumable, so rerunning the same command
 * continues an interrupted run.
 *
 * Scoring renders each proposal with the built library; run `npm run dist`
 * first. A dry run needs no build.
 */
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import {
  summarizeFixtures,
  summarizeGroups
} from "./lib/ai-eval-release-summary.mjs"
import { FIRST_TRY_CONTEXTS, runEvalRun } from "./run-openai-ai-evals.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const argValue = (argv, name) =>
  argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
const hasArg = (argv, name) => argv.includes(`--${name}`)
const list = (value) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
const safeModelName = (model) => model.replace(/[^a-zA-Z0-9._-]/g, "-")
const round = (value, places = 8) => Number(value.toFixed(places))

// Selection flags handed unchanged to every provider run.
const PASS_THROUGH = [
  "first-try-fixtures",
  "grounding-fixtures",
  "grounding-conditions",
  "concurrency",
  "project",
  "keychain-account"
]

/** Read the options and lay out one provider run per provider, trial, context. */
export function planReleaseRuns(argv, { packageVersion, today }) {
  const providers = list(argValue(argv, "providers") ?? "openai,anthropic")
  for (const provider of providers) {
    if (!AI_EVAL_PROVIDERS[provider]) {
      throw new Error(
        `Unknown provider "${provider}"; expected one of: ${Object.keys(
          AI_EVAL_PROVIDERS
        ).join(", ")}`
      )
    }
  }
  if (providers.length === 0) throw new Error("--providers must name a provider")
  const trials = Number(argValue(argv, "trials") ?? 3)
  if (!Number.isInteger(trials) || trials < 1 || trials > 20) {
    throw new Error("--trials must be an integer from 1 to 20")
  }
  const contexts = list(argValue(argv, "contexts") ?? "llms,minimal")
  for (const context of contexts) {
    if (!FIRST_TRY_CONTEXTS[context]) {
      throw new Error(
        `Unknown context "${context}"; expected one of: ${Object.keys(
          FIRST_TRY_CONTEXTS
        ).join(", ")}`
      )
    }
  }
  if (contexts.length === 0) throw new Error("--contexts must name a context")
  const suites = list(argValue(argv, "suites") ?? "first-try,grounding")
  for (const suite of suites) {
    if (suite !== "first-try" && suite !== "grounding") {
      throw new Error(`Unknown suite "${suite}"; expected first-try or grounding`)
    }
  }
  const outputDirectory = resolve(
    argValue(argv, "output-dir") ??
      join(root, "evals/reports", `release-${packageVersion}-${today}`)
  )
  const runs = []
  for (const provider of providers) {
    const models = list(argValue(argv, `${provider}-models`))
    for (let trial = 1; trial <= trials; trial += 1) {
      // Context only changes first-try requests. Grounding runs once per
      // trial, with the first context's run.
      const runContexts = suites.includes("first-try") ? contexts : [contexts[0]]
      runContexts.forEach((context, index) => {
        const runSuites =
          index === 0 ? suites : suites.filter((suite) => suite === "first-try")
        if (runSuites.length === 0) return
        runs.push({
          provider,
          models: models.length ? models : AI_EVAL_PROVIDERS[provider].defaultModels,
          trial,
          context,
          suites: runSuites,
          // The trial id is part of each request's idempotency key, so a
          // context needs its own id as well as its own directory.
          trialId: `trial-${trial}-${context}`,
          outputDirectory: join(
            outputDirectory,
            provider,
            `trial-${trial}`,
            context
          )
        })
      })
    }
  }
  return { providers, trials, contexts, suites, outputDirectory, runs }
}

function runnerArguments(run, argv, extra = []) {
  return [
    "node",
    "run-openai-ai-evals.mjs",
    `--provider=${run.provider}`,
    `--models=${run.models.join(",")}`,
    `--suites=${run.suites.join(",")}`,
    `--first-try-context=${run.context}`,
    `--trial-id=${run.trialId}`,
    `--output-dir=${run.outputDirectory}`,
    ...PASS_THROUGH.flatMap((name) => {
      const value = argValue(argv, name)
      return value === undefined ? [] : [`--${name}=${value}`]
    }),
    // --effort applies to providers that take an effort level.
    ...(argValue(argv, "effort") && AI_EVAL_PROVIDERS[run.provider].effort
      ? [`--effort=${argValue(argv, "effort")}`]
      : []),
    ...extra
  ]
}

async function capture(run, argv, extra, { env, fetchImpl, stderr }) {
  const chunks = []
  await runEvalRun({
    argv: runnerArguments(run, argv, extra),
    env,
    fetchImpl,
    stdout: { write: (chunk) => chunks.push(String(chunk)) },
    stderr
  })
  return JSON.parse(chunks.join(""))
}

async function scoreRuns(plan) {
  // Loaded here so a dry run does not need the built library.
  const { scoreFirstTryProposal } = await import(
    "./summarize-openai-ai-eval-trials.mjs"
  )
  const { groundingScoringRevision, scoreGroundingAnswer } = await import(
    "./ai-eval-scoring.mjs"
  )
  const firstTry = await readJson(join(root, "evals/first-try/fixtures.json"))
  const grounding = await readJson(join(root, "evals/grounding/fixtures.json"))
  const firstTryById = new Map(
    firstTry.fixtures.map((fixture) => [fixture.id, fixture])
  )
  const groundingById = new Map(
    grounding.charts.flatMap((chart) =>
      chart.questions.map((question) => [`${chart.id}/${question.id}`, question])
    )
  )
  const firstTryRows = []
  const groundingRows = []
  const manifests = []
  for (const run of plan.runs) {
    const manifest = await readJson(
      join(run.outputDirectory, "run-manifest.json")
    )
    if (!manifest.completedAt) {
      throw new Error(`Run ${run.outputDirectory} is not complete`)
    }
    manifests.push({ run, manifest })
    for (const model of manifest.models) {
      const modelDirectory = join(run.outputDirectory, safeModelName(model))
      const dimensions = { provider: run.provider, model, trial: run.trial }
      if (run.suites.includes("first-try")) {
        const submission = await readJson(
          join(modelDirectory, "first-try-results.json")
        )
        for (const result of submission.results) {
          const fixture = firstTryById.get(result.fixtureId)
          if (!fixture) {
            throw new Error(`Unknown first-try fixture ${result.fixtureId}`)
          }
          firstTryRows.push({
            ...dimensions,
            context: run.context,
            fixtureId: result.fixtureId,
            passed: scoreFirstTryProposal(fixture, result.proposal).passed
          })
        }
      }
      if (run.suites.includes("grounding")) {
        const submission = await readJson(
          join(modelDirectory, "grounding-results.json")
        )
        for (const response of submission.responses) {
          const question = groundingById.get(response.fixtureId)
          if (!question) {
            throw new Error(`Unknown grounding fixture ${response.fixtureId}`)
          }
          groundingRows.push({
            ...dimensions,
            condition: response.condition,
            fixtureId: response.fixtureId,
            passed: scoreGroundingAnswer(question.expected, response.answer, true)
              .passed
          })
        }
      }
    }
  }
  return {
    firstTryRows,
    groundingRows,
    manifests,
    fixtureRevisions: {
      firstTry: firstTry.fixtureRevision,
      grounding: grounding.fixtureRevision,
      groundingScoring: groundingScoringRevision
    }
  }
}

function providerRecords(plan, manifests) {
  return plan.providers.map((id) => {
    const own = manifests.filter(({ run }) => run.provider === id)
    const unique = (values) => [...new Set(values.flat().filter(Boolean))].sort()
    const usd = own.map(({ manifest }) => manifest.estimatedUsd)
    return {
      id,
      clientVersion: AI_EVAL_PROVIDERS[id].clientVersion,
      priceRevision: own[0]?.manifest.priceRevision ?? null,
      ...(own[0]?.manifest.effort ? { effort: own[0].manifest.effort } : {}),
      models: unique(own.map(({ manifest }) => manifest.models)),
      resolvedModels: unique(
        own.map(({ manifest }) => manifest.resolvedModels ?? [])
      ),
      requests: own.reduce(
        (sum, { manifest }) => sum + (manifest.requestCount ?? 0),
        0
      ),
      // Null when any run of this provider had no price table.
      estimatedUsd: usd.some((value) => value == null)
        ? null
        : round(usd.reduce((sum, value) => sum + value, 0))
    }
  })
}

export async function runReleaseEval({
  argv,
  env,
  fetchImpl,
  stdout,
  stderr = process.stderr,
  now = () => new Date()
}) {
  const packageVersion = (await readJson(join(root, "package.json"))).version
  const today = now().toISOString().slice(0, 10)
  const plan = planReleaseRuns(argv, { packageVersion, today })
  const context = { env, fetchImpl, stderr }

  if (hasArg(argv, "dry-run")) {
    const runs = []
    for (const run of plan.runs) {
      const result = await capture(run, argv, ["--dry-run"], context)
      runs.push({
        provider: run.provider,
        trial: run.trial,
        context: run.context,
        suites: run.suites,
        models: result.models,
        requests: result.requests.total,
        estimatedUsd: result.estimatedUsd,
        upperBoundUsd: result.upperBoundUsd
      })
    }
    const sum = (key, subset = runs) =>
      subset.some((run) => run[key] == null)
        ? null
        : round(subset.reduce((total, run) => total + run[key], 0), 2)
    stdout.write(
      `${JSON.stringify(
        {
          dryRun: true,
          packageVersion,
          date: today,
          trials: plan.trials,
          contexts: plan.contexts,
          suites: plan.suites,
          outputDirectory: plan.outputDirectory,
          totals: {
            providerRuns: runs.length,
            requests: runs.reduce((total, run) => total + run.requests, 0),
            // A rough planning figure; see requestEstimatedCost.
            estimatedUsd: sum("estimatedUsd"),
            upperBoundUsd: sum("upperBoundUsd")
          },
          byProvider: plan.providers.map((provider) => {
            const own = runs.filter((run) => run.provider === provider)
            return {
              provider,
              models: own[0]?.models ?? [],
              requests: own.reduce((total, run) => total + run.requests, 0),
              estimatedUsd: sum("estimatedUsd", own),
              upperBoundUsd: sum("upperBoundUsd", own)
            }
          }),
          runs
        },
        null,
        2
      )}\n`
    )
    return
  }

  if (!hasArg(argv, "confirm-spend")) {
    throw new Error("Paid evaluation requires --confirm-spend")
  }
  const maxUsdArgument = argValue(argv, "max-usd")
  const maxUsd = Number(maxUsdArgument ?? 0)
  const priced = plan.providers.some(
    (provider) => AI_EVAL_PROVIDERS[provider].hasPriceTable
  )
  if (priced && !(maxUsd > 0)) {
    throw new Error(
      "A positive --max-usd is required: it is the spend ceiling for the whole run"
    )
  }

  // One ceiling for the whole run: each provider run may spend what remains.
  let spentUsd = 0
  for (const [index, run] of plan.runs.entries()) {
    const hasPriceTable = AI_EVAL_PROVIDERS[run.provider].hasPriceTable
    if (hasPriceTable && spentUsd >= maxUsd) {
      throw new Error(
        `Spend ceiling $${maxUsd.toFixed(2)} reached after ${index} of ${plan.runs.length} provider runs; rerun with a higher --max-usd to continue`
      )
    }
    const result = await capture(
      run,
      argv,
      [
        "--confirm-spend",
        ...(hasPriceTable ? [`--max-usd=${round(maxUsd - spentUsd)}`] : [])
      ],
      context
    )
    spentUsd += result.estimatedUsd ?? 0
    stderr.write(
      `release eval ${index + 1}/${plan.runs.length} runs complete · ${run.provider} trial ${run.trial} ${run.context} · $${spentUsd.toFixed(4)}\n`
    )
  }

  const scored = await scoreRuns(plan)
  const firstTryKeys = ["provider", "model", "context"]
  const groundingKeys = ["provider", "model", "condition"]
  const providers = providerRecords(plan, scored.manifests)
  const report = {
    version: 1,
    generatedAt: now().toISOString(),
    date: today,
    packageVersion,
    fixtureRevisions: scored.fixtureRevisions,
    trials: plan.trials,
    contexts: plan.contexts,
    suites: plan.suites,
    providers,
    totals: {
      requests: providers.reduce((sum, provider) => sum + provider.requests, 0),
      estimatedUsd: providers.some((provider) => provider.estimatedUsd == null)
        ? null
        : round(providers.reduce((sum, provider) => sum + provider.estimatedUsd, 0))
    },
    firstTry: {
      byModelAndContext: summarizeGroups(scored.firstTryRows, firstTryKeys),
      byFixture: summarizeFixtures(scored.firstTryRows, firstTryKeys)
    },
    grounding: {
      byModelAndCondition: summarizeGroups(scored.groundingRows, groundingKeys),
      byFixture: summarizeFixtures(scored.groundingRows, groundingKeys)
    }
  }
  const reportPath = join(plan.outputDirectory, "release-report.json")
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  const lines = [
    `semiotic ${packageVersion} · ${today} · ${plan.trials} trial(s) · ${report.totals.requests} requests`,
    ...report.firstTry.byModelAndContext.map(
      (row) =>
        `first-try ${row.provider}/${row.model} [${row.context}] ${(row.passRate * 100).toFixed(1)}% (per trial ${row.minPassRate}–${row.maxPassRate}, ${row.unstableFixtures} unstable fixture(s))`
    ),
    ...report.grounding.byModelAndCondition.map(
      (row) =>
        `grounding ${row.provider}/${row.model} [${row.condition}] ${(row.passRate * 100).toFixed(1)}% (per trial ${row.minPassRate}–${row.maxPassRate})`
    ),
    `report: ${reportPath}`
  ]
  stdout.write(`${lines.join("\n")}\n`)
  return report
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  runReleaseEval({
    argv: process.argv,
    env: process.env,
    fetchImpl: globalThis.fetch,
    stdout: process.stdout
  }).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  })
}
