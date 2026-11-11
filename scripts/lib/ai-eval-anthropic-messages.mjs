/**
 * Anthropic Messages API wire adapter for the evaluation runner.
 *
 * The runner builds every job as an OpenAI-Responses-shaped request and reads
 * a Responses-shaped result, so one set of request builders, cost accounting,
 * and result schemas serves every provider. This module translates that shape
 * to `POST /v1/messages` and back.
 *
 * It uses raw HTTP through the runner's injectable `fetch`, like the other
 * providers, so the whole queue can be verified with a stub transport and the
 * runner needs no vendor SDK dependency.
 *
 * Differences from the Responses providers, each deliberate:
 *
 * - No server-side refusal fallback. An evaluation must report the model it
 *   names; a refusal is recorded as a refusal, not answered by another model.
 * - No reasoning switch. Current Claude models cannot all disable thinking, so
 *   requests set `output_config.effort` (default "low") and reserve
 *   `ANTHROPIC_THINKING_HEADROOM_TOKENS` on top of the job's output budget so
 *   thinking cannot starve the answer.
 * - No free-form JSON mode. A strict `json_schema` format maps to structured
 *   outputs. A `json_object` request (the first-try suite, whose `props` object
 *   is open-ended) relies on its instructions, and the adapter removes one
 *   enclosing Markdown code fence if the model adds one. It repairs nothing
 *   else.
 * - The shared instructions are sent as a cacheable system block, so repeated
 *   requests with the same reference context are billed at the cache-read rate.
 */

export const ANTHROPIC_API_VERSION = "2026-10-21"
export const ANTHROPIC_OAUTH_BETA = "oauth-2025-04-20"
export const ANTHROPIC_THINKING_HEADROOM_TOKENS = 4096
const DEFAULT_OUTPUT_TOKENS = 1024

export function anthropicMaxTokens(body) {
  return (
    (body.max_output_tokens ?? DEFAULT_OUTPUT_TOKENS) +
    ANTHROPIC_THINKING_HEADROOM_TOKENS
  )
}

function contentPart(part) {
  if (part.type === "input_text") return { type: "text", text: part.text }
  if (part.type === "input_image") {
    const match = /^data:([^;,]+);base64,(.*)$/s.exec(part.image_url ?? "")
    if (!match) {
      throw new Error("Anthropic adapter requires base64 data-URL images")
    }
    return {
      type: "image",
      source: { type: "base64", media_type: match[1], data: match[2] }
    }
  }
  throw new Error(`Anthropic adapter cannot send input part "${part.type}"`)
}

/** Translate a Responses-shaped request body into a Messages request body. */
export function toAnthropicMessagesRequest(body, { effort = "low" } = {}) {
  const messages =
    typeof body.input === "string"
      ? [{ role: "user", content: body.input }]
      : (body.input ?? []).map((message) => ({
          role: message.role,
          content: message.content.map(contentPart)
        }))
  const format = body.text?.format
  return {
    model: body.model,
    max_tokens: anthropicMaxTokens(body),
    ...(body.instructions
      ? {
          system: [
            {
              type: "text",
              text: body.instructions,
              cache_control: { type: "ephemeral" }
            }
          ]
        }
      : {}),
    messages,
    output_config: {
      effort,
      ...(format?.type === "json_schema"
        ? { format: { type: "json_schema", schema: format.schema } }
        : {})
    }
  }
}

function unwrapCodeFence(text) {
  const match = /^\s*```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n?```\s*$/.exec(text)
  return match ? match[1] : text
}

/** Translate a Messages response into the Responses shape the runner reads. */
export function fromAnthropicMessagesResponse(message, body = {}) {
  const usage = message.usage ?? {}
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const normalizedUsage = {
    // Messages reports uncached input separately; Responses reports a total.
    input_tokens: (usage.input_tokens ?? 0) + cacheRead + cacheWrite,
    input_tokens_details: {
      cached_tokens: cacheRead,
      cache_write_tokens: cacheWrite
    },
    // Thinking tokens are billed as output and are included in this total.
    output_tokens: usage.output_tokens ?? 0
  }
  const base = {
    id: message.id,
    model: message.model,
    status: message.stop_reason === "max_tokens" ? "incomplete" : "completed",
    usage: normalizedUsage
  }
  if (message.stop_reason === "refusal") {
    const details = message.stop_details ?? {}
    return {
      ...base,
      output: [
        {
          type: "message",
          content: [
            {
              type: "refusal",
              refusal:
                [details.category, details.explanation]
                  .filter(Boolean)
                  .join(": ") || "refusal"
            }
          ]
        }
      ]
    }
  }
  const text = (message.content ?? []).find(
    (block) => block.type === "text"
  )?.text
  return {
    ...base,
    output:
      typeof text === "string"
        ? [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text:
                    body.text?.format?.type === "json_object"
                      ? unwrapCodeFence(text)
                      : text
                }
              ]
            }
          ]
        : []
  }
}

/**
 * Wire description consumed by the runner's request loop. `credentialScheme`
 * is "api-key" for `ANTHROPIC_API_KEY` or "bearer" for an OAuth access token
 * (`ANTHROPIC_AUTH_TOKEN`, for example from
 * `ant auth print-credentials --access-token`).
 */
export function anthropicMessagesWire({
  effort = "low",
  credentialScheme = "api-key"
} = {}) {
  return {
    id: "anthropic-messages",
    headers: ({ apiKey }) => ({
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_API_VERSION,
      ...(credentialScheme === "bearer"
        ? {
            Authorization: `Bearer ${apiKey}`,
            "anthropic-beta": ANTHROPIC_OAUTH_BETA
          }
        : { "x-api-key": apiKey })
    }),
    encode: (body) => toAnthropicMessagesRequest(body, { effort }),
    decode: fromAnthropicMessagesResponse,
    // 529 is the API's "overloaded" status.
    retryable: (status) =>
      status === 429 || status === 529 || (status >= 500 && status <= 504),
    // Cost ceilings must reserve the thinking headroom the request allows.
    budgetRequest: (body) => ({
      ...body,
      max_output_tokens: anthropicMaxTokens(body)
    })
  }
}
