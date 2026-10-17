import assert from "node:assert/strict"
import { mkdir, writeFile, mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import { sanitizedApiError } from "./lib/api-key-redaction.mjs"
import {
  describeUnpricedModels,
  liteLLMPriceTable,
  liteLLMProxyRoot
} from "./lib/litellm-model-prices.mjs"
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

test("provider registry registers cheaperinference as an OpenAI-compatible provider", () => {
  assert.ok(AI_EVAL_PROVIDERS.cheaperinference)
  assert.equal(
    AI_EVAL_PROVIDERS.cheaperinference.apiUrl,
    "https://api.cheaperinference.com/v1/responses"
  )
  assert.equal(
    AI_EVAL_PROVIDERS.cheaperinference.apiKeyEnv,
    "CHEAPER_INFERENCE_API_KEY"
  )
  assert.equal(AI_EVAL_PROVIDERS.cheaperinference.projectEnv, null)
  assert.ok(AI_EVAL_PROVIDERS.cheaperinference.defaultModels.includes("gpt-5.4-mini"))
  assert.equal(AI_EVAL_PROVIDERS.cheaperinference.hasPriceTable, false)
})

test("API Route validation uses strict schema, exact model ID and independent credentials", async () => {
  const calls = []
  const chunks = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) })
    return jsonResponse("gpt-6.1-sol", '{"ok":true}')
  }
  await runEvalRun({
    argv: ["node", "run-openai-ai-evals.mjs", "--provider=apiroute", "--validate-only"],
    env: { API_ROUTE_API_KEY: "apiroute-test-key", OPENAI_API_KEY: "unrelated-key" },
    fetchImpl,
    stdout: { write: (chunk) => chunks.push(String(chunk)) },
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://global.api-route.com/v1/responses")
  assert.equal(calls[0].headers.Authorization, "Bearer apiroute-test-key")
  assert.equal(calls[0].headers["OpenAI-Project"], undefined)
  assert.equal(calls[0].body.model, "gpt-6.1-sol")
  assert.equal(calls[0].body.store, false)
  assert.equal(calls[0].body.reasoning, undefined)
  assert.equal(calls[0].body.max_output_tokens, 64)
  assert.equal(calls[0].body.text.format.type, "json_schema")
  assert.equal(calls[0].body.text.format.strict, true)
  assert.equal(calls[0].body.text.format.schema.additionalProperties, false)
  assert.equal(JSON.parse(chunks.join("")).estimatedUsd, null)
  assert.equal(chunks.join("").includes("apiroute-test-key"), false)
  assert.equal(AI_EVAL_PROVIDERS.apiroute.hasPriceTable, false)
  assert.equal(AI_EVAL_PROVIDERS.apiroute.projectEnv, null)
})

test("API Route does not fall back to OpenAI credentials", async () => {
  let called = false
  await assert.rejects(() => runEvalRun({
    argv: ["node", "run-openai-ai-evals.mjs", "--provider=apiroute", "--validate-only"],
    env: { OPENAI_API_KEY: "unrelated-key" },
    fetchImpl: async () => { called = true },
    stdout: { write: () => {} },
  }), /API_ROUTE_API_KEY/)
  assert.equal(called, false)
})

test("API Route paid queues require explicit spend confirmation", async () => {
  await assert.rejects(() => runEvalRun({
    argv: ["node", "run-openai-ai-evals.mjs", "--provider=apiroute"],
    env: { API_ROUTE_API_KEY: "apiroute-test-key" },
    fetchImpl: async () => { throw new Error("unexpected request") },
    stdout: { write: () => {} },
  }), /--confirm-spend/)
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

test("runner requests omit reasoning for the cheaperinference provider and need no price table", async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    return jsonResponse("gpt-5.4-mini", "{\"ok\":true}")
  }
  const outputDirectory = await mkdtemp(join(tmpdir(), "cheaperinference-validate-"))
  const stdoutChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=cheaperinference",
      "--models=gpt-5.4-mini",
      "--validate-only",
      `--output-dir=${outputDirectory}`,
    ],
    env: { CHEAPER_INFERENCE_API_KEY: "ci_live_test" },
    fetchImpl,
    stdout: { write: (chunk) => stdoutChunks.push(String(chunk)) },
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://api.cheaperinference.com/v1/responses")
  assert.equal(calls[0].body.model, "gpt-5.4-mini")
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

const liteLLMModelInfo = {
  data: [
    {
      model_name: "gpt-4.1-mini",
      model_info: {
        input_cost_per_token: 4e-7,
        output_cost_per_token: 1.6e-6,
        cache_read_input_token_cost: 1e-7
      }
    },
    {
      model_name: "gpt-4.1-mini",
      model_info: {
        input_cost_per_token: 5e-7,
        output_cost_per_token: 1.5e-6
      }
    },
    { model_name: "local-llama", model_info: { mode: "chat" } },
    {
      model_name: "free-model",
      model_info: { input_cost_per_token: 0, output_cost_per_token: 0 }
    },
    { model_name: "openai/*", model_info: { mode: "chat" } },
    {
      model_name: "priced/*",
      model_info: {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 2e-6
      }
    }
  ]
}

function liteLLMFetch(calls, outputText = '{"ok":true}') {
  return async (url, options) => {
    calls.push({
      url,
      authorization: options.headers.Authorization,
      body: options.body ? JSON.parse(options.body) : undefined
    })
    if (url.endsWith("/model/info")) {
      return { ok: true, status: 200, json: async () => liteLLMModelInfo }
    }
    const model = JSON.parse(options.body).model
    return jsonResponse(model, outputText)
  }
}

test("provider registry registers litellm as a self-hosted gateway priced from /model/info", () => {
  const provider = AI_EVAL_PROVIDERS.litellm
  assert.ok(provider)
  assert.equal(provider.apiUrl, null)
  assert.equal(provider.baseUrlEnv, "LITELLM_BASE_URL")
  assert.equal(provider.defaultBaseUrl, "http://localhost:4000")
  assert.equal(provider.apiKeyEnv, "LITELLM_API_KEY")
  assert.equal(provider.projectEnv, null)
  assert.equal(provider.priceSource, "litellm-model-info")
  assert.deepEqual(provider.defaultModels, [])
  assert.equal(provider.requestReasoning, false)
  // hasPriceTable marks a locked table shipped in the registry.
  assert.equal(provider.hasPriceTable, false)
  for (const entry of Object.values(AI_EVAL_PROVIDERS)) {
    assert.equal(entry.hasPriceTable, entry.pricesPerMillion != null, entry.id)
  }
})

test("liteLLMPriceTable resolves wildcard routes and treats a $0 price as priced", () => {
  const discovered = liteLLMPriceTable(liteLLMModelInfo, [
    "free-model",
    "openai/gpt-4o-mini",
    "priced/some-model"
  ])
  assert.deepEqual(discovered.prices["free-model"], {
    input: 0,
    cachedInput: 0,
    cacheWriteInput: 0,
    output: 0
  })
  assert.ok(Math.abs(discovered.prices["priced/some-model"].input - 1) < 1e-9)
  assert.ok(Math.abs(discovered.prices["priced/some-model"].output - 2) < 1e-9)
  assert.deepEqual(discovered.unpriced, ["openai/gpt-4o-mini"])
  assert.deepEqual(discovered.wildcardRoutes, {
    "openai/gpt-4o-mini": "openai/*",
    "priced/some-model": "priced/*"
  })
  assert.equal(
    describeUnpricedModels(discovered),
    "openai/gpt-4o-mini (via wildcard route openai/*)"
  )
  // An exact model_name wins over a wildcard route, and a wildcard does not
  // match across a different prefix.
  assert.deepEqual(
    liteLLMPriceTable(liteLLMModelInfo, ["gpt-4.1-mini", "other/openai/x"])
      .wildcardRoutes,
    {}
  )
})

test("sanitizedApiError redacts the configured key in any format", () => {
  assert.equal(
    sanitizedApiError(
      "bad key lt-custom-key-123 and sk-other",
      "lt-custom-key-123"
    ),
    "bad key [REDACTED_API_KEY] and [REDACTED_API_KEY]"
  )
  assert.equal(
    sanitizedApiError("Received API Key = sk-...-dev"),
    "Received API Key = [REDACTED_API_KEY]"
  )
})

test("liteLLMPriceTable keeps the highest deployment rate and falls back to the input rate", () => {
  assert.equal(liteLLMProxyRoot("http://proxy:4000/v1/"), "http://proxy:4000")
  assert.equal(
    liteLLMProxyRoot("https://gw.example.com/litellm"),
    "https://gw.example.com/litellm"
  )
  const { prices, unpriced } = liteLLMPriceTable(liteLLMModelInfo, [
    "gpt-4.1-mini",
    "local-llama",
    "missing-model"
  ])
  assert.deepEqual(Object.keys(prices), ["gpt-4.1-mini"])
  const rates = prices["gpt-4.1-mini"]
  assert.ok(Math.abs(rates.input - 0.5) < 1e-9)
  assert.ok(Math.abs(rates.output - 1.6) < 1e-9)
  assert.ok(Math.abs(rates.cachedInput - 0.5) < 1e-9)
  assert.ok(Math.abs(rates.cacheWriteInput - 0.5) < 1e-9)
  assert.deepEqual(unpriced, ["local-llama", "missing-model"])
})

test("litellm validate-only reads prices from the proxy and estimates cost", async () => {
  const calls = []
  const stdoutChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=litellm",
      "--models=gpt-4.1-mini",
      "--validate-only"
    ],
    env: {
      LITELLM_API_KEY: "sk-test",
      LITELLM_BASE_URL: "http://proxy.internal:4000/v1"
    },
    fetchImpl: liteLLMFetch(calls),
    stdout: { write: (chunk) => stdoutChunks.push(String(chunk)) },
    stderr: { write: () => {} }
  })
  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      "http://proxy.internal:4000/model/info",
      "http://proxy.internal:4000/v1/responses"
    ]
  )
  assert.equal(calls[0].authorization, "Bearer sk-test")
  assert.equal(calls[1].body.model, "gpt-4.1-mini")
  assert.equal(calls[1].body.reasoning, undefined)
  const output = JSON.parse(stdoutChunks.join(""))
  assert.equal(output.ok, true)
  // 10 input tokens at $0.5/M plus 5 output tokens at $1.6/M.
  assert.equal(output.estimatedUsd, 0.000013)
})

test("litellm --base-url overrides LITELLM_BASE_URL", async () => {
  const calls = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=litellm",
      "--models=gpt-4.1-mini",
      "--base-url=https://gateway.example.com/litellm",
      "--validate-only"
    ],
    env: {
      LITELLM_API_KEY: "sk-test",
      LITELLM_BASE_URL: "http://ignored:4000"
    },
    fetchImpl: liteLLMFetch(calls),
    stdout: { write: () => {} },
    stderr: { write: () => {} }
  })
  assert.equal(calls[1].url, "https://gateway.example.com/litellm/v1/responses")
})

test("litellm runs with priced models require and enforce --max-usd", async () => {
  const jobs = JSON.parse(
    await readFile(join(root, "evals/first-try/jobs.json"), "utf8")
  )
  const argv = (outputDirectory, ...extra) => [
    "node",
    "run-openai-ai-evals.mjs",
    "--provider=litellm",
    "--models=gpt-4.1-mini",
    "--suites=first-try",
    `--first-try-fixtures=${jobs.jobs[0].fixtureId}`,
    `--output-dir=${outputDirectory}`,
    "--trial-id=test-litellm-run",
    "--confirm-spend",
    ...extra
  ]
  const run = (outputDirectory, calls, ...extra) =>
    runEvalRun({
      argv: argv(outputDirectory, ...extra),
      env: { LITELLM_API_KEY: "sk-test" },
      fetchImpl: liteLLMFetch(calls, '{"component":"LineChart","props":{}}'),
      stdout: { write: () => {} },
      stderr: { write: () => {} }
    })

  await assert.rejects(
    run(await mkdtemp(join(tmpdir(), "litellm-no-ceiling-")), []),
    /LiteLLM \/model\/info prices every requested model, so a positive --max-usd is required/
  )

  const tinyCalls = []
  await assert.rejects(
    run(
      await mkdtemp(join(tmpdir(), "litellm-tiny-ceiling-")),
      tinyCalls,
      "--max-usd=0.0000001"
    ),
    /Spend ceiling would be exceeded/
  )
  assert.equal(
    tinyCalls.filter(({ url }) => url.endsWith("/v1/responses")).length,
    0
  )

  const outputDirectory = await mkdtemp(join(tmpdir(), "litellm-run-"))
  const calls = []
  await run(outputDirectory, calls, "--max-usd=1")
  assert.equal(calls[0].url, "http://localhost:4000/model/info")
  const manifest = JSON.parse(
    await readFile(join(outputDirectory, "run-manifest.json"), "utf8")
  )
  assert.equal(manifest.provider, "litellm")
  assert.match(manifest.priceRevision, /^litellm-model-info-[0-9a-f]{12}$/)
  assert.equal(manifest.requestCount, 1)
  assert.equal(manifest.estimatedUsd, 0.000013)
  assert.equal(manifest.requests[0].estimatedUsd, 0.000013)
})

test("litellm models the proxy cannot price fall back to unknown cost", async () => {
  const jobs = JSON.parse(
    await readFile(join(root, "evals/first-try/jobs.json"), "utf8")
  )
  const outputDirectory = await mkdtemp(join(tmpdir(), "litellm-unpriced-"))
  const stderrChunks = []
  await runEvalRun({
    argv: [
      "node",
      "run-openai-ai-evals.mjs",
      "--provider=litellm",
      "--models=local-llama",
      "--suites=first-try",
      `--first-try-fixtures=${jobs.jobs[0].fixtureId}`,
      `--output-dir=${outputDirectory}`,
      "--trial-id=test-litellm-unpriced",
      "--confirm-spend"
    ],
    env: { LITELLM_API_KEY: "sk-test" },
    fetchImpl: liteLLMFetch([], '{"component":"LineChart","props":{}}'),
    stdout: { write: () => {} },
    stderr: { write: (chunk) => stderrChunks.push(String(chunk)) }
  })
  assert.match(
    stderrChunks.join(""),
    /no input and output prices for local-llama/
  )
  const manifest = JSON.parse(
    await readFile(join(outputDirectory, "run-manifest.json"), "utf8")
  )
  assert.equal(manifest.priceRevision, null)
  assert.equal(manifest.estimatedUsd, null)
  assert.equal(manifest.requests[0].estimatedUsd, null)
})

test("litellm --max-usd fails fast when any requested model is unpriced", async () => {
  for (const extra of [[], ["--validate-only"]]) {
    const calls = []
    await assert.rejects(
      runEvalRun({
        argv: [
          "node",
          "run-openai-ai-evals.mjs",
          "--provider=litellm",
          "--models=gpt-4.1-mini,local-llama,openai/gpt-4o-mini",
          "--max-usd=1",
          "--confirm-spend",
          ...extra
        ],
        env: { LITELLM_API_KEY: "sk-test" },
        fetchImpl: liteLLMFetch(calls),
        stdout: { write: () => {} },
        stderr: { write: () => {} }
      }),
      (error) =>
        error.message.startsWith("--max-usd cannot be enforced") &&
        error.message.includes(
          "local-llama, openai/gpt-4o-mini (via wildcard route openai/*)"
        ) &&
        !error.message.includes("gpt-4.1-mini,")
    )
    assert.deepEqual(
      calls.map(({ url }) => url),
      ["http://localhost:4000/model/info"]
    )
  }
})

test("litellm requires --models and reports /model/info auth failures without the key", async () => {
  await assert.rejects(
    runEvalRun({
      argv: [
        "node",
        "run-openai-ai-evals.mjs",
        "--provider=litellm",
        "--validate-only"
      ],
      env: { LITELLM_API_KEY: "sk-test" },
      fetchImpl: liteLLMFetch([]),
      stdout: { write: () => {} }
    }),
    /LiteLLM has no default models; pass --models/
  )
  await assert.rejects(
    runEvalRun({
      argv: [
        "node",
        "run-openai-ai-evals.mjs",
        "--provider=litellm",
        "--models=gpt-4.1-mini",
        "--validate-only"
      ],
      env: { LITELLM_API_KEY: "lt-live-secret" },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        text: async () =>
          '{"error":{"message":"Authentication Error, Received API Key = lt-live-secret"}}'
      }),
      stdout: { write: () => {} }
    }),
    (error) =>
      /LiteLLM \/model\/info 401/.test(error.message) &&
      error.message.includes("[REDACTED_API_KEY]") &&
      !error.message.includes("lt-live-secret")
  )
})
