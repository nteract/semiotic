import assert from "node:assert/strict"
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { ANTHROPIC_THINKING_HEADROOM_TOKENS } from "./lib/ai-eval-anthropic-messages.mjs"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import {
  requestEstimatedCost,
  runEvalRun
} from "./run-openai-ai-evals.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const jobs = await readJson(join(root, "evals/first-try/jobs.json"))
const fixtures = await readJson(join(root, "evals/first-try/fixtures.json"))
const groundingJobs = await readJson(join(root, "evals/grounding/jobs.json"))
const fixtureId = jobs.jobs[0].fixtureId
const referenceComponent = fixtures.fixtures.find(({ id }) => id === fixtureId)
  .proposal.component

function messagesResponse(model, text) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      id: `msg_${model}`,
      type: "message",
      role: "assistant",
      model,
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "" },
        { type: "text", text }
      ],
      usage: {
        input_tokens: 40,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 60,
        output_tokens: 12
      }
    })
  }
}

const noNetwork = async () => {
  throw new Error("a dry run must not call the network")
}
const capture = () => {
  const chunks = []
  return { stream: { write: (chunk) => chunks.push(String(chunk)) }, chunks }
}

test("provider registry registers anthropic as a Messages-API provider with a price table", () => {
  const provider = AI_EVAL_PROVIDERS.anthropic
  assert.equal(provider.api, "anthropic-messages")
  assert.equal(provider.apiUrl, "https://api.anthropic.com/v1/messages")
  assert.equal(provider.apiKeyEnv, "ANTHROPIC_API_KEY")
  assert.equal(provider.hasPriceTable, true)
  assert.deepEqual(provider.defaultModels, ["claude-opus-5-5"])
  for (const model of provider.defaultModels) {
    assert.ok(provider.pricesPerMillion[model])
  }
  // Every other provider keeps speaking the Responses API.
  for (const [id, other] of Object.entries(AI_EVAL_PROVIDERS)) {
    if (id !== "anthropic") assert.equal(other.api, undefined, id)
  }
})

test("anthropic validation sends a Messages request with its own credential", async () => {
  const calls = []
  const out = capture()
  await runEvalRun({
    argv: ["node", "run", "--provider=anthropic", "--validate-only"],
    env: { ANTHROPIC_API_KEY: "sk-ant-test", OPENAI_API_KEY: "sk-openai" },
    fetchImpl: async (url, options) => {
      calls.push({ url, headers: options.headers, body: JSON.parse(options.body) })
      return messagesResponse("claude-opus-5-5", '{"ok":true}')
    },
    stdout: out.stream
  })
  assert.equal(calls.length, 1)
  const [{ url, headers, body }] = calls
  assert.equal(url, "https://api.anthropic.com/v1/messages")
  assert.equal(headers["x-api-key"], "sk-ant-test")
  assert.equal(headers["anthropic-version"], "2026-10-21")
  assert.equal(headers.Authorization, undefined)
  assert.equal(body.model, "claude-opus-5-5")
  assert.equal(body.max_tokens, 32 + ANTHROPIC_THINKING_HEADROOM_TOKENS)
  assert.equal(body.output_config.effort, "low")
  assert.equal(body.output_config.format.type, "json_schema")
  for (const field of ["store", "reasoning", "text", "input", "temperature"]) {
    assert.equal(field in body, false, field)
  }
  const result = JSON.parse(out.chunks.join(""))
  assert.equal(result.resolvedModel, "claude-opus-5-5")
  // 40 uncached, 60 cache-read, and 12 output tokens at Opus 5.5 rates.
  assert.equal(result.estimatedUsd, (40 * 4 + 60 * 0.2 + 12 * 20) / 1_000_000)
})

test("anthropic accepts an OAuth access token when no API key is set", async () => {
  const calls = []
  await runEvalRun({
    argv: ["node", "run", "--provider=anthropic", "--validate-only"],
    env: { ANTHROPIC_AUTH_TOKEN: "oauth-token" },
    fetchImpl: async (url, options) => {
      calls.push(options.headers)
      return messagesResponse("claude-opus-5-5", '{"ok":true}')
    },
    stdout: capture().stream
  })
  assert.equal(calls[0].Authorization, "Bearer oauth-token")
  assert.equal(calls[0]["anthropic-beta"], "oauth-2025-04-20")
  assert.equal(calls[0]["x-api-key"], undefined)
})

test("anthropic paid runs require confirmation, a ceiling, and a priced model", async () => {
  const base = {
    env: { ANTHROPIC_API_KEY: "sk-ant-test" },
    fetchImpl: noNetwork,
    stdout: capture().stream
  }
  const argv = ["node", "run", "--provider=anthropic", "--trial-id=guards"]
  await assert.rejects(
    runEvalRun({ ...base, argv }),
    /requires --confirm-spend/
  )
  await assert.rejects(
    runEvalRun({ ...base, argv: [...argv, "--confirm-spend"] }),
    /positive --max-usd is required/
  )
  await assert.rejects(
    runEvalRun({
      ...base,
      argv: [...argv, "--models=claude-unknown", "--validate-only"]
    }),
    /locked price table/
  )
})

test("an anthropic run records proposals, usage, and release metadata", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "anthropic-run-"))
  const bodies = []
  const err = capture()
  await runEvalRun({
    argv: [
      "node",
      "run",
      "--provider=anthropic",
      "--suites=first-try",
      `--first-try-fixtures=${fixtureId}`,
      `--output-dir=${outputDirectory}`,
      "--trial-id=test-anthropic",
      "--effort=medium",
      "--max-usd=1",
      "--confirm-spend"
    ],
    env: { ANTHROPIC_API_KEY: "sk-ant-test" },
    fetchImpl: async (url, options) => {
      bodies.push(JSON.parse(options.body))
      // A fenced reply, which the Responses providers' JSON mode never sends.
      return messagesResponse(
        "claude-opus-5-5",
        '```json\n{"component":"BarChart","props":{"data":[]}}\n```'
      )
    },
    stdout: capture().stream,
    stderr: err.stream
  })
  assert.equal(bodies.length, 1)
  assert.equal(bodies[0].output_config.effort, "medium")
  assert.equal(bodies[0].output_config.format, undefined)
  assert.equal(bodies[0].system[0].cache_control.type, "ephemeral")
  assert.match(bodies[0].system[0].text, /# ai\/reference\.md/)

  const manifest = await readJson(join(outputDirectory, "run-manifest.json"))
  const packageVersion = (await readJson(join(root, "package.json"))).version
  assert.equal(manifest.provider, "anthropic")
  assert.equal(manifest.packageVersion, packageVersion)
  assert.deepEqual(manifest.fixtureRevisions, {
    firstTry: jobs.fixtureRevision,
    grounding: groundingJobs.fixtureRevision
  })
  assert.match(manifest.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(manifest.effort, "medium")
  assert.deepEqual(manifest.models, ["claude-opus-5-5"])
  assert.deepEqual(manifest.resolvedModels, ["claude-opus-5-5"])
  assert.equal(manifest.requestCount, 1)
  assert.ok(manifest.estimatedUsd > 0)
  assert.deepEqual(manifest.requests[0].usage.input_tokens_details, {
    cached_tokens: 60,
    cache_write_tokens: 0
  })
  const submission = await readJson(
    join(outputDirectory, "claude-opus-5-5", "first-try-results.json")
  )
  assert.deepEqual(submission.results[0].proposal, {
    component: "BarChart",
    props: { data: [] }
  })
  // Neither the credential nor a prompt reaches a report.
  const written = JSON.stringify({ manifest, submission })
  assert.ok(!written.includes("sk-ant-test"))
  assert.ok(!written.includes("Return JSON only"))
})

test("resuming rejects changed evaluation settings before sending requests", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "anthropic-resume-"))
  const argv = [
    "node",
    "run",
    "--provider=anthropic",
    "--suites=first-try",
    `--first-try-fixtures=${fixtureId}`,
    `--output-dir=${outputDirectory}`,
    "--trial-id=resume",
    "--max-usd=1",
    "--confirm-spend"
  ]
  const options = {
    argv,
    env: { ANTHROPIC_API_KEY: "sk-ant-test" },
    stdout: capture().stream,
    stderr: capture().stream
  }
  await runEvalRun({
    ...options,
    fetchImpl: async () => messagesResponse("claude-opus-5-5", "{}")
  })
  const manifestPath = join(outputDirectory, "run-manifest.json")
  const original = await readJson(manifestPath)
  let networkCalls = 0
  const fetchImpl = async () => {
    networkCalls += 1
    return messagesResponse("claude-opus-5-5", "{}")
  }
  // Identical settings resume without repeating a completed request.
  await runEvalRun({ ...options, fetchImpl })
  await assert.rejects(
    runEvalRun({ ...options, argv: [...argv, "--effort=high"], fetchImpl }),
    /Existing output directory belongs to another run/
  )
  for (const change of [
    { packageVersion: "0.0.0-old" },
    { models: ["claude-sonnet-5-5"] },
    { filters: { ...original.filters, suites: ["grounding"] } },
    { filters: { ...original.filters, firstTryFixtureIds: ["different-fixture"] } },
    { fixtureRevisions: { ...original.fixtureRevisions, firstTry: "old" } },
    { fixtureRevisions: { ...original.fixtureRevisions, grounding: "old" } }
  ]) {
    await writeFile(manifestPath, JSON.stringify({ ...original, ...change }))
    await assert.rejects(
      runEvalRun({ ...options, fetchImpl }),
      /Existing output directory belongs to another run/
    )
  }
  assert.equal(networkCalls, 0)
})

test("the minimal context sends the system prompt and one signature card", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "anthropic-minimal-"))
  const bodies = []
  await runEvalRun({
    argv: [
      "node",
      "run",
      "--provider=anthropic",
      "--suites=first-try",
      `--first-try-fixtures=${fixtureId}`,
      "--first-try-context=minimal",
      `--output-dir=${outputDirectory}`,
      "--trial-id=test-minimal",
      "--max-usd=1",
      "--confirm-spend"
    ],
    env: { ANTHROPIC_API_KEY: "sk-ant-test" },
    fetchImpl: async (url, options) => {
      bodies.push(JSON.parse(options.body))
      return messagesResponse("claude-opus-5-5", '{"component":"BarChart","props":{}}')
    },
    stdout: capture().stream,
    stderr: capture().stream
  })
  const system = bodies[0].system[0].text
  assert.match(system, /# ai\/system-prompt\.md/)
  assert.ok(system.includes(`# Component signature\n## ${referenceComponent}\n`))
  assert.ok(!system.includes("# ai/reference.md"))
  const full = await readFile(join(root, "ai/reference.md"), "utf8")
  assert.ok(
    system.length < full.length / 4,
    `minimal context ${system.length} chars vs reference ${full.length}`
  )
  const submission = await readJson(
    join(outputDirectory, "claude-opus-5-5", "first-try-results.json")
  )
  assert.deepEqual(submission.metadata.context, [
    "ai/system-prompt.md",
    "ai/schema.json#reference-component-signature"
  ])
  await assert.rejects(
    runEvalRun({
      argv: ["node", "run", "--provider=anthropic", "--first-try-context=tiny", "--dry-run"],
      env: {},
      fetchImpl: noNetwork,
      stdout: capture().stream
    }),
    /--first-try-context must be one of: llms, skill, minimal/
  )
})

test("a dry run counts requests and bounds cost without a credential or a request", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "dry-run-"))
  const dryRun = async (argv) => {
    const out = capture()
    await runEvalRun({
      argv: ["node", "run", `--output-dir=${outputDirectory}`, "--dry-run", ...argv],
      // No key, no project, and no Keychain lookup.
      env: {},
      fetchImpl: noNetwork,
      stdout: out.stream
    })
    return JSON.parse(out.chunks.join(""))
  }
  const anthropic = await dryRun(["--provider=anthropic"])
  assert.equal(anthropic.dryRun, true)
  assert.deepEqual(anthropic.requests, {
    total: jobs.jobs.length + groundingJobs.jobs.length,
    bySuite: {
      grounding: groundingJobs.jobs.length,
      "first-try": jobs.jobs.length
    },
    byModel: { "claude-opus-5-5": jobs.jobs.length + groundingJobs.jobs.length }
  })
  assert.equal(anthropic.effort, "low")
  assert.equal(anthropic.priceRevision, AI_EVAL_PROVIDERS.anthropic.priceRevision)
  assert.ok(anthropic.estimatedUsd > 0)
  assert.ok(anthropic.upperBoundUsd > anthropic.estimatedUsd)

  const openai = await dryRun([
    "--provider=openai",
    "--models=gpt-5.6-luna",
    "--suites=first-try",
    "--first-try-context=minimal"
  ])
  assert.equal(openai.requests.total, jobs.jobs.length)
  assert.equal(openai.firstTryContext, "minimal")

  // Providers without a price table report unknown cost, not zero.
  const unpriced = await dryRun(["--provider=orcarouter", "--suites=first-try"])
  assert.equal(unpriced.estimatedUsd, null)
  assert.equal(unpriced.upperBoundUsd, null)
  // A self-hosted gateway is not contacted for prices either.
  const litellm = await dryRun([
    "--provider=litellm",
    "--models=local-model",
    "--suites=first-try"
  ])
  assert.equal(litellm.requests.total, jobs.jobs.length)
  assert.equal(litellm.upperBoundUsd, null)
  assert.deepEqual(await readdir(outputDirectory), [])
})

test("the planning estimate discounts instructions an earlier request cached", () => {
  const prices = {
    model: { input: 4, cachedInput: 0.2, cacheWriteInput: 5, output: 20 }
  }
  const request = {
    instructions: "x".repeat(4_000),
    input: "hello",
    max_output_tokens: 100
  }
  const other = Math.ceil(
    JSON.stringify({ input: "hello", max_output_tokens: 100 }).length / 4
  )
  assert.equal(
    requestEstimatedCost("model", request, prices),
    (1_000 * 5 + other * 4 + 50 * 20) / 1_000_000
  )
  assert.equal(
    requestEstimatedCost("model", request, prices, { instructionsCached: true }),
    (1_000 * 0.2 + other * 4 + 50 * 20) / 1_000_000
  )
  assert.equal(requestEstimatedCost("model", request, null), null)
})
