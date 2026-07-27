import assert from "node:assert/strict"
import test from "node:test"
import {
  calculateResponseCost,
  extractOutputText,
  publicRequestRecord,
  requestUpperBoundCost,
  retryDelayMs,
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
