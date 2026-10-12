/**
 * Price discovery for the `litellm` evaluation provider.
 *
 * LiteLLM is a self-hosted AI gateway, so model names and prices are whatever
 * the operator configured. Its `GET /model/info` endpoint reports per-token
 * USD rates for every deployment, which this module converts into the same
 * per-million-token price table the `openai` provider ships with. That lets
 * the runner estimate cost and enforce `--max-usd` through a gateway instead
 * of recording unknown (`null`) cost.
 */
import { sanitizedApiError } from "./api-key-redaction.mjs"

const usdPerMillion = (perToken) => perToken * 1_000_000

const rate = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null

/**
 * Normalize a LiteLLM proxy URL to its root. LiteLLM serves the OpenAI routes
 * under both `/` and `/v1`, so `http://host:4000/v1` and `http://host:4000`
 * resolve to the same proxy.
 */
export function liteLLMProxyRoot(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/, "")
}

const deploymentRates = (deployment) => {
  const info = deployment?.model_info ?? {}
  const input = rate(info.input_cost_per_token)
  const output = rate(info.output_cost_per_token)
  if (input === null || output === null) return null
  return {
    input: usdPerMillion(input),
    cachedInput: usdPerMillion(rate(info.cache_read_input_token_cost) ?? input),
    cacheWriteInput: usdPerMillion(
      rate(info.cache_creation_input_token_cost) ?? input
    ),
    output: usdPerMillion(output)
  }
}

const highestRates = (left, right) =>
  Object.fromEntries(
    Object.entries(left).map(([key, value]) => [
      key,
      Math.max(value, right[key])
    ])
  )

const wildcardPattern = (modelName) =>
  new RegExp(
    `^${modelName
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}$`
  )

/**
 * Build a per-million price table for `models` from a `/model/info` payload.
 * A model name can map to several deployments with different prices, so each
 * rate takes the highest deployment price to keep the spend ceiling
 * conservative. Missing cache rates fall back to the input rate, and a
 * deployment priced at 0 counts as priced (its cost estimate is $0).
 *
 * Exact `model_name` matches win. A model with no exact match is resolved
 * against wildcard routes such as `openai/*`, the way the proxy routes it;
 * those routes usually report no per-token rates, so such a model is
 * returned in `unpriced` and its route is recorded in `wildcardRoutes`.
 */
export function liteLLMPriceTable(modelInfo, models) {
  const deployments = modelInfo?.data ?? []
  const prices = {}
  const unpriced = []
  const wildcardRoutes = {}
  for (const model of models) {
    let matches = deployments.filter(
      (deployment) => deployment?.model_name === model
    )
    if (matches.length === 0) {
      matches = deployments.filter(
        (deployment) =>
          typeof deployment?.model_name === "string" &&
          deployment.model_name.includes("*") &&
          wildcardPattern(deployment.model_name).test(model)
      )
      if (matches.length > 0) {
        wildcardRoutes[model] = [
          ...new Set(matches.map((deployment) => deployment.model_name))
        ].join(", ")
      }
    }
    let rates = null
    for (const deployment of matches) {
      const candidate = deploymentRates(deployment)
      if (!candidate) continue
      rates = rates ? highestRates(rates, candidate) : candidate
    }
    if (rates) prices[model] = rates
    else unpriced.push(model)
  }
  return { prices, unpriced, wildcardRoutes }
}

/**
 * Describe unpriced models for error and warning messages, naming the
 * wildcard route a model was matched through when there was one.
 */
export function describeUnpricedModels({ unpriced, wildcardRoutes = {} }) {
  return unpriced
    .map((model) =>
      wildcardRoutes[model]
        ? `${model} (via wildcard route ${wildcardRoutes[model]})`
        : model
    )
    .join(", ")
}

/**
 * Fetch `/model/info` from a LiteLLM proxy with the run's API key.
 */
export async function fetchLiteLLMModelInfo({ proxyRoot, apiKey, fetchImpl }) {
  const response = await fetchImpl(`${proxyRoot}/model/info`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: globalThis.AbortSignal.timeout(30_000)
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `LiteLLM /model/info ${response.status}: ${sanitizedApiError(
        errorText,
        apiKey
      ).slice(0, 500)}`
    )
  }
  return response.json()
}
