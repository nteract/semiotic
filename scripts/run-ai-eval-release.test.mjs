import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { planReleaseRuns, runReleaseEval } from "./run-ai-eval-release.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const fixtures = await readJson(join(root, "evals/first-try/fixtures.json"))
const jobs = await readJson(join(root, "evals/first-try/jobs.json"))
const groundingJobs = await readJson(join(root, "evals/grounding/jobs.json"))
const packageVersion = (await readJson(join(root, "package.json"))).version
const fixtureId = "bar-static-custom-fields"
const referenceProposal = fixtures.fixtures.find(({ id }) => id === fixtureId)
  .proposal
const groundingFixture = groundingJobs.jobs[0].fixtureId

const capture = () => {
  const chunks = []
  return { stream: { write: (chunk) => chunks.push(String(chunk)) }, chunks }
}
const reply = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => payload
})

/**
 * A stub transport for both wire formats. `answer` receives the provider and
 * the request body and returns the model's text.
 */
function stubTransport(answer) {
  const calls = []
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body)
    if (url === "https://api.anthropic.com/v1/messages") {
      calls.push({ provider: "anthropic", body })
      return reply({
        id: "msg_stub",
        model: `${body.model}-resolved`,
        stop_reason: "end_turn",
        content: [{ type: "text", text: answer("anthropic", body, calls.length) }],
        usage: { input_tokens: 100, output_tokens: 10 }
      })
    }
    assert.equal(url, "https://api.openai.com/v1/responses")
    calls.push({ provider: "openai", body })
    return reply({
      id: "resp_stub",
      model: `${body.model}-resolved`,
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            { type: "output_text", text: answer("openai", body, calls.length) }
          ]
        }
      ],
      usage: { input_tokens: 100, output_tokens: 10 }
    })
  }
  return { fetchImpl, calls }
}

test("the default plan runs two providers for three trials in two contexts", () => {
  const plan = planReleaseRuns(["node", "release"], {
    packageVersion: "9.9.9",
    today: "2026-01-02"
  })
  assert.deepEqual(plan.providers, ["openai", "anthropic"])
  assert.equal(plan.trials, 3)
  assert.deepEqual(plan.contexts, ["llms", "minimal"])
  assert.ok(plan.outputDirectory.endsWith("evals/reports/release-9.9.9-2026-01-02"))
  assert.equal(plan.runs.length, 12)
  // Grounding runs once per trial; the second context repeats first-try only.
  assert.deepEqual(
    plan.runs.slice(0, 2).map(({ provider, trial, context, suites, trialId }) => ({
      provider,
      trial,
      context,
      suites,
      trialId
    })),
    [
      {
        provider: "openai",
        trial: 1,
        context: "llms",
        suites: ["first-try", "grounding"],
        trialId: "trial-1-llms"
      },
      {
        provider: "openai",
        trial: 1,
        context: "minimal",
        suites: ["first-try"],
        trialId: "trial-1-minimal"
      }
    ]
  )
  assert.equal(new Set(plan.runs.map((run) => run.outputDirectory)).size, 12)
  assert.deepEqual(plan.runs.at(-1).models, ["claude-opus-5-5"])
})

test("plan options select providers, models, trials, contexts, and suites", () => {
  const options = { packageVersion: "9.9.9", today: "2026-01-02" }
  const plan = planReleaseRuns(
    [
      "node",
      "release",
      "--providers=anthropic",
      "--anthropic-models=claude-sonnet-5-5,claude-haiku-5-5",
      "--trials=2",
      "--contexts=minimal",
      "--suites=grounding"
    ],
    options
  )
  // Context only changes first-try requests, so grounding alone runs once.
  assert.equal(plan.runs.length, 2)
  assert.deepEqual(plan.runs[0].models, ["claude-sonnet-5-5", "claude-haiku-5-5"])
  assert.deepEqual(plan.runs[0].suites, ["grounding"])
  for (const [argument, message] of [
    ["--providers=nobody", /Unknown provider "nobody"/],
    ["--trials=0", /--trials must be an integer/],
    ["--contexts=tiny", /Unknown context "tiny"/],
    ["--suites=vibes", /Unknown suite "vibes"/]
  ]) {
    assert.throws(
      () => planReleaseRuns(["node", "release", argument], options),
      message
    )
  }
})

test("a dry run reports the whole plan without a credential or a request", async () => {
  const out = capture()
  await runReleaseEval({
    argv: ["node", "release", "--dry-run"],
    env: {},
    fetchImpl: async () => {
      throw new Error("a dry run must not call the network")
    },
    stdout: out.stream
  })
  const plan = JSON.parse(out.chunks.join(""))
  const perTrial =
    groundingJobs.jobs.length + jobs.jobs.length * plan.contexts.length
  assert.equal(plan.dryRun, true)
  assert.equal(plan.packageVersion, packageVersion)
  assert.equal(plan.totals.providerRuns, 12)
  // Three default OpenAI models and one default Anthropic model.
  assert.equal(plan.totals.requests, perTrial * 3 * 4)
  assert.deepEqual(
    plan.byProvider.map(({ provider, requests }) => [provider, requests]),
    [
      ["openai", perTrial * 3 * 3],
      ["anthropic", perTrial * 3]
    ]
  )
  assert.ok(plan.totals.estimatedUsd > 0)
  assert.ok(plan.totals.upperBoundUsd > plan.totals.estimatedUsd)
})

test("a paid run needs explicit confirmation and one ceiling for the whole run", async () => {
  const base = {
    env: { OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "sk-ant-test" },
    fetchImpl: async () => {
      throw new Error("must not be called")
    },
    stdout: capture().stream
  }
  await assert.rejects(
    runReleaseEval({ ...base, argv: ["node", "release"] }),
    /requires --confirm-spend/
  )
  await assert.rejects(
    runReleaseEval({ ...base, argv: ["node", "release", "--confirm-spend"] }),
    /positive --max-usd is required/
  )
})

test("a stubbed run scores both providers and reports per-fixture variance", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "release-eval-"))
  // The Anthropic model answers the first-try fixture correctly only in its
  // first llms-context trial, so that fixture is unstable for it.
  let anthropicFullContextReplies = 0
  const { fetchImpl, calls } = stubTransport((provider, body) => {
    const firstTry =
      body.text?.format?.type === "json_object" ||
      (provider === "anthropic" && !body.output_config.format)
    if (!firstTry) return JSON.stringify({ answer: "cannot determine" })
    const system = provider === "anthropic" ? body.system[0].text : body.instructions
    const fullContext = system.includes("# ai/reference.md")
    if (provider === "anthropic" && fullContext) {
      anthropicFullContextReplies += 1
      if (anthropicFullContextReplies > 1) {
        return JSON.stringify({ component: "BarChart", props: {} })
      }
    }
    return JSON.stringify(referenceProposal)
  })
  const out = capture()
  const fixedNow = () => new Date("2026-03-04T05:06:07.000Z")
  const report = await runReleaseEval({
    argv: [
      "node",
      "release",
      "--trials=2",
      "--openai-models=gpt-5.6-luna",
      `--first-try-fixtures=${fixtureId}`,
      `--grounding-fixtures=${groundingFixture}`,
      "--grounding-conditions=grounding-only",
      "--project=proj_test",
      `--output-dir=${outputDirectory}`,
      "--max-usd=5",
      "--confirm-spend"
    ],
    env: { OPENAI_API_KEY: "sk-test", ANTHROPIC_API_KEY: "sk-ant-test" },
    fetchImpl,
    stdout: out.stream,
    stderr: capture().stream,
    now: fixedNow
  })

  // Per provider and trial: one grounding and one first-try request in the
  // first context, one first-try request in the second.
  assert.equal(calls.length, 2 * 2 * 3)
  assert.equal(report.totals.requests, 12)
  assert.equal(report.packageVersion, packageVersion)
  assert.equal(report.date, "2026-03-04")
  assert.equal(report.trials, 2)
  assert.equal(report.fixtureRevisions.firstTry, fixtures.fixtureRevision)
  assert.equal(report.fixtureRevisions.grounding, groundingJobs.fixtureRevision)
  assert.ok(report.fixtureRevisions.groundingScoring)
  assert.deepEqual(
    report.providers.map(({ id, models, resolvedModels, requests, effort }) => ({
      id,
      models,
      resolvedModels,
      requests,
      effort
    })),
    [
      {
        id: "openai",
        models: ["gpt-5.6-luna"],
        resolvedModels: ["gpt-5.6-luna-resolved"],
        requests: 6,
        effort: undefined
      },
      {
        id: "anthropic",
        models: ["claude-opus-5-5"],
        resolvedModels: ["claude-opus-5-5-resolved"],
        requests: 6,
        effort: "low"
      }
    ]
  )
  assert.ok(report.totals.estimatedUsd > 0)

  const fixture = (provider, context) =>
    report.firstTry.byFixture.find(
      (row) => row.provider === provider && row.context === context
    )
  assert.deepEqual(fixture("anthropic", "llms"), {
    provider: "anthropic",
    model: "claude-opus-5-5",
    context: "llms",
    fixtureId,
    trials: 2,
    passed: 1,
    passRate: 0.5,
    variance: 0.5,
    unstable: true
  })
  for (const [provider, context] of [
    ["anthropic", "minimal"],
    ["openai", "llms"],
    ["openai", "minimal"]
  ]) {
    assert.deepEqual(
      (({ passed, variance, unstable }) => ({ passed, variance, unstable }))(
        fixture(provider, context)
      ),
      { passed: 2, variance: 0, unstable: false },
      `${provider}/${context}`
    )
  }
  const group = report.firstTry.byModelAndContext.find(
    (row) => row.provider === "anthropic" && row.context === "llms"
  )
  assert.equal(group.passRate, 0.5)
  assert.equal(group.minPassRate, 0)
  assert.equal(group.maxPassRate, 1)
  assert.equal(group.unstableFixtures, 1)
  assert.deepEqual(
    report.grounding.byModelAndCondition.map(({ provider, condition, trials }) => [
      provider,
      condition,
      trials
    ]),
    [
      ["openai", "grounding-only", 2],
      ["anthropic", "grounding-only", 2]
    ]
  )

  assert.deepEqual(
    await readJson(join(outputDirectory, "release-report.json")),
    JSON.parse(JSON.stringify(report))
  )
  const summary = out.chunks.join("")
  assert.match(summary, new RegExp(`semiotic ${packageVersion.replace(/\./g, "\\.")}`))
  assert.match(summary, /first-try anthropic\/claude-opus-5-5 \[llms\] 50\.0%/)
  assert.ok(!JSON.stringify(report).includes("sk-"))
})
