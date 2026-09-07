import assert from "node:assert/strict"
import { mkdir, writeFile, mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import {
  calculateResponseCost,
  extractOutputText,
  publicRequestRecord,
  requestUpperBoundCost,
  retryDelayMs,
  runEvalRun,
  validateFilterValues,
} from "./run-openai-ai-evals.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("calculateResponseCost applies standard, cached, cache-write, and output rates", () => {
  assert.equal(
    calculateResponseCost("gpt-5.6-sol", {
      input_tokens: 1_000_000,
      input_tokens_details: {
        cached_tokens: 200_000,
        cache_write_tokens: 100_000,
      },
      output_tokens: 10_000,
    }),
    4.525
  )
})

test("requestUpperBoundCost reserves image and output capacity", () => {
  const textOnly = requestUpperBoundCost("gpt-5.6-luna", {
    input: "hello",
    max_output_tokens: 20,
  })
  const withImage = requestUpperBoundCost("gpt-5.6-luna", {
    input: [{ type: "input_image", image_url: "data:image/png;base64,AA==" }],
    max_output_tokens: 20,
  })
  assert.ok(withImage > textOnly)
})

test("extractOutputText returns output text and rejects refusals", () => {
  assert.equal(
    extractOutputText({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "{\"ok\":true}" }],
        },
      ],
    }),
    "{\"ok\":true}"
  )
  assert.throws(
    () =>
      extractOutputText({
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "No" }],
          },
        ],
      }),
    /Model refusal/
  )
})

test("retryDelayMs honors headers and token-limit reset messages", () => {
  const headers = (values) => ({
    get: (name) => values[name] ?? null,
  })
  assert.equal(
    retryDelayMs({
      headers: headers({ "retry-after": "2" }),
      errorText: "",
      attempt: 0,
    }),
    2_500
  )
  assert.equal(
    retryDelayMs({
      headers: headers({}),
      errorText: "Please try again in 7.923s.",
      attempt: 3,
    }),
    8_423
  )
  assert.equal(
    retryDelayMs({
      headers: headers({}),
      errorText: "",
      attempt: 2,
    }),
    4_500
  )
})

test("public request records never include credentials, prompts, or project IDs", () => {
  const record = publicRequestRecord({
    model: "gpt-5.6-luna",
    suite: "grounding",
    fixtureId: "chart/question/png-only",
    response: {
      id: "resp_1",
      model: "gpt-5.6-luna",
      status: "completed",
      usage: { input_tokens: 10, output_tokens: 5 },
    },
    rawOutput: "{\"answer\":\"North\"}",
    latencyMs: 12,
  })
  const serialized = JSON.stringify(record)
  assert.doesNotMatch(serialized, /api[_-]?key|project|prompt/i)
  assert.doesNotMatch(serialized, /North/)
  assert.match(record.rawOutputSha256, /^[a-f0-9]{64}$/)
})

test("validateFilterValues rejects typos before a paid run", () => {
  assert.doesNotThrow(() =>
    validateFilterValues(
      "suite",
      new Set(["first-try"]),
      new Set(["first-try", "grounding"])
    )
  )
  assert.throws(
    () =>
      validateFilterValues(
        "suite",
        new Set(["firsttry"]),
        new Set(["first-try", "grounding"])
      ),
    /Unknown suite: firsttry/
  )
})

test("provider registry registers orcarouter as an OpenAI-compatible provider", () => {
  assert.ok(AI_EVAL_PROVIDERS.orcarouter)
  assert.equal(
    AI_EVAL_PROVIDERS.orcarouter.apiUrl,
    "https://api.orcarouter.ai/v1/responses"
  )
  assert.equal(AI_EVAL_PROVIDERS.orcarouter.apiKeyEnv, "ORCAROUTER_API_KEY")
  assert.equal(AI_EVAL_PROVIDERS.orcarouter.projectEnv, null)
  assert.ok(AI_EVAL_PROVIDERS.orcarouter.defaultModels.includes("orcarouter/auto"))
  assert.equal(AI_EVAL_PROVIDERS.orcarouter.hasPriceTable, false)
  assert.equal(AI_EVAL_PROVIDERS.openai.hasPriceTable, true)
})

test("providers without a price table report unknown (null) cost", () => {
  assert.equal(calculateResponseCost("orcarouter/auto", {}, null), null)
  assert.equal(requestUpperBoundCost("orcarouter/auto", {}, null), null)
  const record = publicRequestRecord({
    model: "orcarouter/auto",
    suite: "first-try",
    fixtureId: "line/static",
    response: {
      id: "resp_1",
      model: "orcarouter/auto",
      status: "completed",
      usage: { input_tokens: 10, output_tokens: 5 },
    },
    rawOutput: "{\"component\":\"LineChart\",\"props\":{}}",
    latencyMs: 12,
    prices: null,
  })
  assert.equal(record.estimatedUsd, null)
})

function jsonResponse(model, outputText) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      id: `resp_${model}`,
      model,
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: outputText }],
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
  }
}

test("runner requests omit reasoning for the orcarouter provider and need no price table", async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return jsonResponse("orcarouter/auto", "{\"ok\":true}")
  }
  const outputDirectory = await mkdtemp(join(tmpdir(), "orcarouter-validate-"))
  const stdoutChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=orcarouter",
      "--models=orcarouter/auto",
      "--validate-only",
      `--output-dir=${outputDirectory}`,
    ],
    env: { ORCAROUTER_API_KEY: "sk-test" },
    fetchImpl,
    stdout: { write: (chunk) => stdoutChunks.push(String(chunk)) },
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://api.orcarouter.ai/v1/responses")
  assert.equal(calls[0].body.model, "orcarouter/auto")
  assert.equal(calls[0].body.reasoning, undefined)
  const output = JSON.parse(stdoutChunks.join(""))
  assert.equal(output.ok, true)
  assert.equal(output.estimatedUsd, null)
})

test("runner sends reasoning and enforces the price table for the openai provider", async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return jsonResponse("gpt-5.6-sol", "{\"ok\":true}")
  }
  const outputDirectory = await mkdtemp(join(tmpdir(), "openai-validate-"))
  const stdoutChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=openai",
      "--models=gpt-5.6-sol",
      "--project=proj_test",
      "--validate-only",
      `--output-dir=${outputDirectory}`,
    ],
    env: { OPENAI_API_KEY: "sk-test" },
    fetchImpl,
    stdout: { write: (chunk) => stdoutChunks.push(String(chunk)) },
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://api.openai.com/v1/responses")
  assert.deepEqual(calls[0].body.reasoning, { effort: "none" })
  const output = JSON.parse(stdoutChunks.join(""))
  assert.ok(output.estimatedUsd > 0)
})

test("orcarouter default manifests do not require --project or a price table", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "orcarouter-default-"))
  const jobs = JSON.parse(
    await readFile(join(root, "evals/first-try/jobs.json"), "utf8")
  )
  const manifestPath = join(outputDirectory, "run-manifest.json")
  const requests = []
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body)
    requests.push(body)
    return jsonResponse(
      "orcarouter/auto",
      "{\"component\":\"LineChart\",\"props\":{}}"
    )
  }
  const stderrChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=orcarouter",
      "--models=orcarouter/auto",
      "--suites=first-try",
      `--first-try-fixtures=${jobs.jobs[0].fixtureId}`,
      `--output-dir=${outputDirectory}`,
      "--trial-id=test-default-run",
      "--confirm-spend",
    ],
    env: { ORCAROUTER_API_KEY: "sk-test" },
    fetchImpl,
    stdout: { write: () => {} },
    stderr: { write: (chunk) => stderrChunks.push(String(chunk)) },
  })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].reasoning, undefined)
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  assert.equal(manifest.provider, "orcarouter")
  assert.equal(manifest.priceRevision, null)
  assert.equal(manifest.estimatedUsd, null)
  assert.equal(manifest.requestCount, 1)
})

test("openai runs require --project, a price-table model, and a positive --max-usd", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "openai-guards-"))
  const base = [
    "node",
    "run-openai-ai-evals.mjs",
    "--provider=openai",
    "--models=gpt-5.6-sol",
    `--output-dir=${outputDirectory}`,
    "--trial-id=test-openai-guards",
    "--confirm-spend",
  ]
  await assert.rejects(
    runEvalRun({
      argv: base,
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => {
        throw new Error("must not be called")
      },
      stdout: { write: () => {} },
    }),
    /--project or OPENAI_PROJECT_ID is required/
  )
  await assert.rejects(
    runEvalRun({
      argv: [...base, "--project=proj_test"],
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => {
        throw new Error("must not be called")
      },
      stdout: { write: () => {} },
    }),
    /positive --max-usd is required/
  )
})

test("openai rejects a legacy manifest without a provider field", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "openai-legacy-"))
  const manifestPath = join(outputDirectory, "run-manifest.json")
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        version: 1,
        clientVersion: "semiotic-openai-eval/1",
        priceRevision: AI_EVAL_PROVIDERS.openai.priceRevision,
        models: ["gpt-5.6-sol"],
        projectFingerprint: "0".repeat(12),
        maxUsd: 1,
        startedAt: "2026-07-27T04:00:59.598Z",
        completedAt: null,
        requests: [],
      },
      null,
      2
    )}\n`
  )
  await assert.rejects(
    runEvalRun({
      argv: [
        "node",
        "run-openai-ai-evals.mjs",
        "--provider=openai",
        "--models=gpt-5.6-sol",
        "--project=proj_test",
        `--output-dir=${outputDirectory}`,
        "--trial-id=primary",
        "--max-usd=1",
        "--confirm-spend",
      ],
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => {
        throw new Error("must not be called")
      },
      stdout: { write: () => {} },
    }),
    /belongs to another run/
  )
})

test("a matching legacy OpenAI manifest without a provider field resumes as openai", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "openai-legacy-compat-"))
  const manifestPath = join(outputDirectory, "run-manifest.json")
  const jobs = JSON.parse(
    await readFile(join(root, "evals/first-try/jobs.json"), "utf8")
  )
  const fixtureId = jobs.jobs[0].fixtureId
  const modelDirectory = join(outputDirectory, "gpt-5.6-sol")
  await mkdir(modelDirectory, { recursive: true })
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        version: 1,
        clientVersion: "semiotic-openai-eval/1",
        priceRevision: AI_EVAL_PROVIDERS.openai.priceRevision,
        models: ["gpt-5.6-sol"],
        trialId: "primary",
        firstTryContext: "llms",
        filters: { suites: ["first-try"] },
        projectFingerprint: "d753d30dff55",
        maxUsd: 1,
        startedAt: "2026-07-27T04:00:59.598Z",
        completedAt: null,
        requests: [],
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(modelDirectory, "first-try-results.json"),
    `${JSON.stringify(
      {
        metadata: {
          modelId: "gpt-5.6-sol",
          clientVersion: "semiotic-openai-eval/1",
          fixtureRevision: jobs.fixtureRevision,
          date: "2026-07-27",
          context: ["ai/reference.md", "docs/public/llms.txt"],
        },
        results: [],
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(modelDirectory, "grounding-results.json"),
    `${JSON.stringify(
      {
        metadata: {
          modelId: "gpt-5.6-sol",
          clientVersion: "semiotic-openai-eval/1",
          fixtureRevision: "unused",
          date: "2026-07-27",
        },
        responses: [],
      },
      null,
      2
    )}\n`
  )
  let calls = 0
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=openai",
      "--models=gpt-5.6-sol",
      "--project=proj_test",
      "--suites=first-try",
      `--first-try-fixtures=${fixtureId}`,
      `--output-dir=${outputDirectory}`,
      "--trial-id=primary",
      "--max-usd=1",
      "--confirm-spend",
    ],
    env: { OPENAI_API_KEY: "sk-test" },
    fetchImpl: async () => {
      calls += 1
      return jsonResponse(
        "gpt-5.6-sol",
        "{\"component\":\"LineChart\",\"props\":{}}"
      )
    },
    stdout: { write: () => {} },
    stderr: { write: () => {} },
  })
  assert.equal(calls, 1)
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  assert.equal(manifest.provider, "openai")
  assert.equal(manifest.requestCount, 1)
})
