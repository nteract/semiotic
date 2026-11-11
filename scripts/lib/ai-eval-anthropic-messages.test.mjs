import assert from "node:assert/strict"
import test from "node:test"
import {
  ANTHROPIC_API_VERSION,
  ANTHROPIC_THINKING_HEADROOM_TOKENS,
  anthropicMessagesWire,
  fromAnthropicMessagesResponse,
  toAnthropicMessagesRequest
} from "./ai-eval-anthropic-messages.mjs"

const groundingBody = {
  model: "claude-opus-5-5",
  store: false,
  reasoning: { effort: "none" },
  max_output_tokens: 96,
  text: {
    format: {
      type: "json_schema",
      name: "grounding_answer",
      strict: true,
      schema: {
        type: "object",
        properties: { answer: { type: "string" } },
        required: ["answer"],
        additionalProperties: false
      }
    }
  },
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Question: which region is highest?" },
        {
          type: "input_image",
          image_url: "data:image/png;base64,QUJD",
          detail: "auto"
        }
      ]
    }
  ]
}

test("a Responses request becomes a Messages request with structured output", () => {
  assert.deepEqual(toAnthropicMessagesRequest(groundingBody), {
    model: "claude-opus-5-5",
    max_tokens: 96 + ANTHROPIC_THINKING_HEADROOM_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Question: which region is highest?" },
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "QUJD" }
          }
        ]
      }
    ],
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: groundingBody.text.format.schema
      }
    }
  })
})

test("shared instructions become a cacheable system block and free-form JSON sends no format", () => {
  const request = toAnthropicMessagesRequest(
    {
      model: "claude-sonnet-5-5",
      max_output_tokens: 1_200,
      text: { format: { type: "json_object" } },
      instructions: "Return JSON only.",
      input: [
        { role: "user", content: [{ type: "input_text", text: "{}" }] }
      ]
    },
    { effort: "medium" }
  )
  assert.deepEqual(request.system, [
    {
      type: "text",
      text: "Return JSON only.",
      cache_control: { type: "ephemeral" }
    }
  ])
  assert.deepEqual(request.output_config, { effort: "medium" })
  // Fields that only the Responses API understands are not forwarded.
  for (const field of ["store", "reasoning", "text", "instructions", "input"]) {
    assert.equal(field in request, false, field)
  }
  assert.deepEqual(
    toAnthropicMessagesRequest({ model: "m", input: "Say ok." }).messages,
    [{ role: "user", content: "Say ok." }]
  )
})

test("only base64 data-URL images and known input parts are accepted", () => {
  assert.throws(
    () =>
      toAnthropicMessagesRequest({
        model: "m",
        input: [
          {
            role: "user",
            content: [
              { type: "input_image", image_url: "https://example.test/a.png" }
            ]
          }
        ]
      }),
    /base64 data-URL/
  )
  assert.throws(
    () =>
      toAnthropicMessagesRequest({
        model: "m",
        input: [{ role: "user", content: [{ type: "input_file" }] }]
      }),
    /cannot send input part/
  )
})

test("a Messages response reads as a Responses result with a total input count", () => {
  const normalized = fromAnthropicMessagesResponse(
    {
      id: "msg_1",
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "" },
        { type: "text", text: '{"answer":"North, 12"}' }
      ],
      usage: {
        input_tokens: 20,
        cache_creation_input_tokens: 50,
        cache_read_input_tokens: 30,
        output_tokens: 10
      }
    },
    groundingBody
  )
  assert.deepEqual(normalized, {
    id: "msg_1",
    model: "claude-opus-5-5",
    status: "completed",
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 30, cache_write_tokens: 50 },
      output_tokens: 10
    },
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: '{"answer":"North, 12"}' }]
      }
    ]
  })
})

test("one enclosing code fence is removed only for free-form JSON requests", () => {
  const message = {
    id: "msg_2",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [
      { type: "text", text: '```json\n{"component":"BarChart","props":{}}\n```' }
    ],
    usage: {}
  }
  const text = (body) =>
    fromAnthropicMessagesResponse(message, body).output[0].content[0].text
  assert.equal(
    text({ text: { format: { type: "json_object" } } }),
    '{"component":"BarChart","props":{}}'
  )
  assert.equal(text(groundingBody), message.content[0].text)
})

test("refusals, truncation, and missing text are reported, not hidden", () => {
  const refusal = fromAnthropicMessagesResponse({
    id: "msg_3",
    model: "claude-opus-5-5",
    stop_reason: "refusal",
    stop_details: { type: "refusal", category: "cyber", explanation: "declined" },
    content: [],
    usage: {}
  })
  assert.deepEqual(refusal.output[0].content, [
    { type: "refusal", refusal: "cyber: declined" }
  ])
  const truncated = fromAnthropicMessagesResponse({
    id: "msg_4",
    model: "claude-opus-5-5",
    stop_reason: "max_tokens",
    content: [{ type: "thinking", thinking: "" }],
    usage: { output_tokens: 4_192 }
  })
  assert.equal(truncated.status, "incomplete")
  assert.deepEqual(truncated.output, [])
})

test("the wire authenticates with an API key or an OAuth token and retries overload", () => {
  const wire = anthropicMessagesWire()
  assert.deepEqual(wire.headers({ apiKey: "sk-ant-test", idempotencyKey: "k" }), {
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_API_VERSION,
    "x-api-key": "sk-ant-test"
  })
  assert.deepEqual(
    anthropicMessagesWire({ credentialScheme: "bearer" }).headers({
      apiKey: "oauth-token"
    }),
    {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_API_VERSION,
      Authorization: "Bearer oauth-token",
      "anthropic-beta": "oauth-2025-04-20"
    }
  )
  for (const status of [429, 500, 503, 529]) {
    assert.equal(wire.retryable(status), true, String(status))
  }
  for (const status of [400, 401, 404]) {
    assert.equal(wire.retryable(status), false, String(status))
  }
  // The spend ceiling reserves the thinking headroom the request allows.
  assert.equal(
    wire.budgetRequest(groundingBody).max_output_tokens,
    96 + ANTHROPIC_THINKING_HEADROOM_TOKENS
  )
  assert.equal(wire.encode(groundingBody).output_config.effort, "low")
  assert.equal(
    anthropicMessagesWire({ effort: "high" }).encode(groundingBody).output_config
      .effort,
    "high"
  )
})
