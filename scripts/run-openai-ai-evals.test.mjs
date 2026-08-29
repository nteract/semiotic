import assert from "node:assert/strict"
import test from "node:test"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import {
  calculateResponseCost,
  extractOutputText,
  publicRequestRecord,
  requestUpperBoundCost,
  retryDelayMs,
  validateFilterValues,
} from "./run-openai-ai-evals.mjs"

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
  assert.equal(AI_EVAL_PROVIDERS.orcarouter.pricesPerMillion, null)
})

test("providers without a price table report zero cost", () => {
  assert.equal(calculateResponseCost("orcarouter/auto", {}, null), 0)
  assert.equal(requestUpperBoundCost("orcarouter/auto", {}, null), 0)
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
  assert.equal(record.estimatedUsd, 0)
})
