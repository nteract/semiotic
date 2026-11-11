#!/usr/bin/env node
/**
 * Run the provider-neutral Semiotic evaluation queues against an
 * OpenAI-Responses-compatible provider (OpenAI by default).
 *
 * The `openai` provider preserves the original hardcoded behavior: secrets are
 * read from OPENAI_API_KEY or a macOS Keychain generic-password item, and runs
 * are scoped by OPENAI_PROJECT_ID. Other registered providers (see
 * `scripts/lib/ai-eval-providers.mjs`), such as the OpenAI-compatible
 * `orcarouter` gateway, reuse the same request shapes, retries, and result
 * schemas. Providers with a locked per-model price table enforce a
 * `--max-usd` spend ceiling and record estimated USD cost; providers without
 * one (the `orcarouter` gateway) treat cost as unknown (`null`), record no
 * USD estimates, and require only `--confirm-spend` because no spend ceiling
 * can be enforced. The self-hosted `litellm` gateway takes its URL from
 * `--base-url` or LITELLM_BASE_URL and builds its price table from the proxy's
 * `/model/info`, so its runs get estimated USD and a `--max-usd` ceiling too.
 * The `anthropic` provider is the one non-Responses provider: the same request
 * shapes are translated to the Messages API by
 * `scripts/lib/ai-eval-anthropic-messages.mjs`.
 * `--dry-run` prints the request counts and the spend upper bound for a
 * selection without reading a credential or making a network call.
 * Reports contain scored content, hashes, and token usage, but never
 * credentials, project IDs, prompts, or raw response bodies.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { anthropicMessagesWire } from "./lib/ai-eval-anthropic-messages.mjs"
import { componentSignatureCard } from "./lib/ai-eval-component-card.mjs"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"
import { sanitizedApiError } from "./lib/api-key-redaction.mjs"
import {
  describeUnpricedModels,
  fetchLiteLLMModelInfo,
  liteLLMPriceTable,
  liteLLMProxyRoot
} from "./lib/litellm-model-prices.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const defaultOpenAIPrices = AI_EVAL_PROVIDERS.openai.pricesPerMillion

const digest = (value) =>
  createHash("sha256").update(value).digest("hex")
const argValue = (argv, name) =>
  argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
const hasArg = (argv, name) => argv.includes(`--${name}`)
const argSet = (argv, name) => {
  const value = argValue(argv, name)
  if (!value) return null
  return new Set(
    value.split(",").map((entry) => entry.trim()).filter(Boolean)
  )
}
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const safeModelName = (model) => model.replace(/[^a-zA-Z0-9._-]/g, "-")
const roundCost = (value) => Number(value.toFixed(8))

/**
 * How a provider's HTTP API is spoken. Every job is built in the Responses
 * shape; a wire encodes it for the provider and decodes the reply back.
 */
const openaiResponsesWire = {
  id: "openai-responses",
  headers: ({ apiKey, idempotencyKey }) => ({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  }),
  encode: (body) => body,
  decode: (response) => response,
  retryable: (status) =>
    status === 429 || (status >= 500 && status <= 504),
  budgetRequest: (body) => body,
}

export const FIRST_TRY_CONTEXTS = {
  // The full reference: about 54k tokens.
  llms: ["ai/reference.md", "docs/public/llms.txt"],
  skill: ["ai/reference.md", "agent-skill/semiotic-charts/SKILL.md"],
  // The system prompt plus one component's signature card: about 5k tokens.
  minimal: ["ai/system-prompt.md"],
}

export function validateFilterValues(name, values, knownValues) {
  if (!values) return
  const unknown = [...values].filter((value) => !knownValues.has(value))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown ${name}: ${unknown.join(", ")}. Expected one of: ${[
        ...knownValues,
      ].join(", ")}`
    )
  }
}

export function calculateResponseCost(
  model,
  usage = {},
  prices = defaultOpenAIPrices
) {
  if (!prices) return null
  const rates = prices[model]
  if (!rates) throw new Error(`No price table for ${model}`)
  const cached = usage.input_tokens_details?.cached_tokens ?? 0
  const cacheWrite = usage.input_tokens_details?.cache_write_tokens ?? 0
  const input = Math.max(0, (usage.input_tokens ?? 0) - cached - cacheWrite)
  const output = usage.output_tokens ?? 0
  // Responses usage includes reasoning tokens in the output total.
  const reasoning = Math.max(
    0,
    Math.min(output, usage.output_tokens_details?.reasoning_tokens ?? 0)
  )
  return roundCost(
    (input * rates.input +
      cached * rates.cachedInput +
      cacheWrite * rates.cacheWriteInput +
      (output - reasoning) * rates.output +
      reasoning * (rates.reasoningOutput ?? rates.output)) /
      1_000_000
  )
}

export function requestUpperBoundCost(
  model,
  request,
  prices = defaultOpenAIPrices
) {
  if (!prices) return null
  const rates = prices[model]
  if (!rates) throw new Error(`No price table for ${model}`)
  const serialized = JSON.stringify(request)
  const imageCount = (serialized.match(/"type":"input_image"/g) ?? []).length
  const estimatedInputTokens =
    Math.ceil(serialized.length / 3) + imageCount * 2_000
  return roundCost(
    (estimatedInputTokens *
      Math.max(rates.input, rates.cachedInput, rates.cacheWriteInput) +
      (request.max_output_tokens ?? 0) *
        Math.max(rates.output, rates.reasoningOutput ?? rates.output)) /
      1_000_000
  )
}

/**
 * A planning estimate for one request, used only by `--dry-run`: about four
 * characters per token, 1,500 tokens per image, and half of the job's output
 * budget. The shared instructions are billed at the cache-read rate when
 * `instructionsCached` says an earlier request already sent the same text,
 * and at the higher of the input and cache-write rates otherwise. It is a
 * rough figure; the spend ceiling uses `requestUpperBoundCost` instead.
 */
export function requestEstimatedCost(
  model,
  request,
  prices = defaultOpenAIPrices,
  { instructionsCached = false } = {}
) {
  if (!prices) return null
  const rates = prices[model]
  if (!rates) throw new Error(`No price table for ${model}`)
  let imageCount = 0
  const { instructions = "", ...rest } = request
  const text = JSON.stringify(rest, (key, value) => {
    if (key === "image_url") {
      imageCount += 1
      return ""
    }
    return value
  })
  const instructionTokens = Math.ceil(instructions.length / 4)
  const otherTokens = Math.ceil(text.length / 4) + imageCount * 1_500
  return roundCost(
    (instructionTokens *
      (instructionsCached
        ? rates.cachedInput
        : Math.max(rates.input, rates.cacheWriteInput)) +
      otherTokens * rates.input +
      0.5 * (request.max_output_tokens ?? 0) * rates.output) /
      1_000_000
  )
}

export function extractOutputText(response) {
  for (const output of response.output ?? []) {
    if (output.type !== "message") continue
    for (const content of output.content ?? []) {
      if (content.type === "refusal") {
        throw new Error(`Model refusal: ${content.refusal}`)
      }
      if (content.type === "output_text") return content.text
    }
  }
  throw new Error("Response contained no output_text")
}

export function retryDelayMs({ headers, errorText, attempt }) {
  const retryAfterMillisecondsHeader = headers.get("retry-after-ms")
  const retryAfterMilliseconds = Number(retryAfterMillisecondsHeader)
  if (
    retryAfterMillisecondsHeader != null &&
    Number.isFinite(retryAfterMilliseconds) &&
    retryAfterMilliseconds >= 0
  ) {
    return Math.ceil(retryAfterMilliseconds + 500)
  }
  const retryAfterSecondsHeader = headers.get("retry-after")
  const retryAfterSeconds = Number(retryAfterSecondsHeader)
  if (
    retryAfterSecondsHeader != null &&
    Number.isFinite(retryAfterSeconds) &&
    retryAfterSeconds >= 0
  ) {
    return Math.ceil(retryAfterSeconds * 1_000 + 500)
  }
  const messageDelay = errorText.match(
    /try again in ([\d.]+)\s*(ms|s)\b/i
  )
  if (messageDelay) {
    const value = Number(messageDelay[1])
    const milliseconds = messageDelay[2].toLowerCase() === "s"
      ? value * 1_000
      : value
    return Math.ceil(milliseconds + 500)
  }
  return Math.min(60_000, 1_000 * 2 ** attempt + 500)
}

export function publicRequestRecord({
  model,
  suite,
  fixtureId,
  response,
  rawOutput,
  latencyMs,
  prices = defaultOpenAIPrices,
}) {
  return {
    model,
    resolvedModel: response.model,
    suite,
    fixtureId,
    responseId: response.id,
    status: response.status,
    usage: response.usage,
    estimatedUsd: calculateResponseCost(model, response.usage, prices),
    latencyMs,
    rawOutputSha256: digest(rawOutput),
  }
}

function keychainApiKey(service, account, apiKeyEnv = "OPENAI_API_KEY", env = process.env) {
  const envApiKey = env[apiKeyEnv]
  if (envApiKey) return envApiKey.trim()
  if (process.platform !== "darwin") {
    throw new Error(
      `${apiKeyEnv} is required outside macOS; the key is never read from a repository file`
    )
  }
  const argumentsList = [
    "find-generic-password",
    "-s",
    service,
    ...(account ? ["-a", account] : []),
    "-w",
  ]
  try {
    return execFileSync("/usr/bin/security", argumentsList, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  } catch {
    throw new Error(
      `No readable generic-password item found for Keychain service ${service}; set ${apiKeyEnv} to supply the provider key`
    )
  }
}

/**
 * Resolve the provider credential and how it is presented. A provider with an
 * `authTokenEnv` (Anthropic) accepts an OAuth access token as a bearer
 * credential when no API key is set in the environment.
 */
function resolveCredential(provider, { keychainService, keychainAccount, env }) {
  const authToken = provider.authTokenEnv
    ? env[provider.authTokenEnv]?.trim()
    : null
  if (authToken && !env[provider.apiKeyEnv]) {
    return { apiKey: authToken, scheme: "bearer" }
  }
  return {
    apiKey: keychainApiKey(
      keychainService,
      keychainAccount,
      provider.apiKeyEnv,
      env
    ),
    scheme: "api-key",
  }
}

function wireFor(provider, { effort, credentialScheme } = {}) {
  return provider.api === "anthropic-messages"
    ? anthropicMessagesWire({ effort, credentialScheme })
    : openaiResponsesWire
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temporaryPath, path)
}

async function existingJson(path, fallback) {
  try {
    return await readJson(path)
  } catch (error) {
    if (error?.code === "ENOENT") return fallback
    throw error
  }
}

async function apiRequest({
  apiKey,
  apiUrl,
  apiErrorPrefix,
  body,
  idempotencyKey,
  retries = 6,
  fetchImpl = globalThis.fetch,
  wire = openaiResponsesWire,
}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now()
    let response
    try {
      response = await fetchImpl(apiUrl, {
        method: "POST",
        headers: wire.headers({ apiKey, idempotencyKey }),
        body: JSON.stringify(wire.encode(body)),
        signal: globalThis.AbortSignal.timeout(180_000),
      })
    } catch (error) {
      if (attempt === retries) throw error
      await delay(1_000 * 2 ** attempt)
      continue
    }
    if (response.ok) {
      return {
        response: wire.decode(await response.json(), body),
        latencyMs: Date.now() - startedAt,
      }
    }
    const errorText = await response.text()
    const retryable = wire.retryable(response.status)
    if (!retryable || attempt === retries) {
      throw new Error(
        `${apiErrorPrefix} ${response.status}: ${sanitizedApiError(
          errorText,
          apiKey
        ).slice(0, 1_000)}`
      )
    }
    await delay(
      retryDelayMs({
        headers: response.headers,
        errorText,
        attempt,
      })
    )
  }
  throw new Error("Unreachable API retry state")
}

function firstTryRequest(model, job, contextText, requestReasoning) {
  return {
    model,
    store: false,
    ...(requestReasoning ? { reasoning: { effort: "none" } } : {}),
    max_output_tokens: 1_200,
    text: { format: { type: "json_object" } },
    instructions: [
      "You are completing a first-attempt Semiotic chart-generation benchmark.",
      "Use only the supplied documentation, request, and input data.",
      "Return JSON only: one object with exactly component and props.",
      "props must include supplied chart data and all accessors needed to render, unless the push requirement explicitly says to omit data.",
      "Do not include markdown, JavaScript functions, commentary, or alternatives.",
      "",
      contextText,
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              request: job.prompt,
              family: job.family,
              mode: job.mode,
              input: job.input,
              pushRows: job.pushRows,
              pushRequirement: job.pushRequirement,
              requiredOutput: job.output,
            }),
          },
        ],
      },
    ],
  }
}

async function groundingRequest(model, job, requestReasoning) {
  const content = [
    {
      type: "input_text",
      text: [
        "Answer the chart question using only the supplied evidence.",
        "Be concise but include every requested label and value.",
        "If the evidence does not support an answer, explicitly say cannot determine.",
        `Question: ${job.question}`,
      ].join("\n"),
    },
  ]
  if (job.inputs.grounding) {
    const grounding = await readFile(
      join(root, "evals/grounding", job.inputs.grounding),
      "utf8"
    )
    content.push({
      type: "input_text",
      text: `Reader-grounding payload:\n${grounding}`,
    })
  }
  if (job.inputs.png) {
    const imagePath = join(root, "evals/grounding", job.inputs.png)
    const image = await readFile(imagePath)
    content.push({
      type: "input_image",
      image_url: `data:image/png;base64,${image.toString("base64")}`,
      detail: "auto",
    })
  }
  return {
    model,
    store: false,
    ...(requestReasoning ? { reasoning: { effort: "none" } } : {}),
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
          additionalProperties: false,
        },
      },
    },
    input: [{ role: "user", content }],
  }
}

function submissionMetadata(model, fixtureRevision, clientVersion) {
  return {
    modelId: model,
    clientVersion,
    fixtureRevision,
    date: new Date().toISOString().slice(0, 10),
  }
}

function parseFirstTry(rawOutput) {
  try {
    const parsed = JSON.parse(rawOutput)
    if (
      parsed &&
      typeof parsed.component === "string" &&
      parsed.props &&
      typeof parsed.props === "object" &&
      !Array.isArray(parsed.props)
    ) {
      return parsed
    }
  } catch {
    // A malformed first attempt is intentionally represented as a failing
    // proposal instead of being repaired or silently retried.
  }
  return {}
}

function parseGrounding(rawOutput) {
  const parsed = JSON.parse(rawOutput)
  if (typeof parsed.answer !== "string") {
    throw new Error("Grounding response did not contain an answer string")
  }
  return parsed.answer
}

async function loadContext(paths) {
  const sections = await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(join(root, path), "utf8")
      return `# ${path}\n${contents}`
    })
  )
  return sections.join("\n\n")
}

async function validateOnly({ apiKey, apiUrl, apiErrorPrefix, project, model, prices, requestReasoning, credentialCheckMaxTokens = 32, fetchImpl = globalThis.fetch, stdout = process.stdout, wire = openaiResponsesWire }) {
  const body = {
    model,
    store: false,
    ...(requestReasoning ? { reasoning: { effort: "none" } } : {}),
    max_output_tokens: credentialCheckMaxTokens,
    text: {
      format: {
        type: "json_schema",
        name: "credential_check",
        strict: true,
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          additionalProperties: false,
        },
      },
    },
    input: "Return JSON confirming that this API request succeeded.",
  }
  const { response, latencyMs } = await apiRequest({
    apiKey,
    apiUrl,
    apiErrorPrefix,
    body,
    idempotencyKey: digest(
      `semiotic-evals/credential-check/${project}/${model}`
    ),
    fetchImpl,
    wire,
  })
  const rawOutput = extractOutputText(response)
  const parsed = JSON.parse(rawOutput)
  if (parsed.ok !== true) throw new Error("Credential check returned false")
  const estimatedUsd = calculateResponseCost(model, response.usage, prices)
  stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        requestedModel: model,
        resolvedModel: response.model,
        responseId: response.id,
        latencyMs,
        usage: response.usage,
        estimatedUsd,
      },
      null,
      2
    )}\n`
  )
}

export async function runEvalRun({ argv, env, fetchImpl, stdout, stderr = process.stderr }) {
  const provider = AI_EVAL_PROVIDERS[argValue(argv, "provider") ?? "openai"]
  if (!provider) {
    throw new Error(
      `Unknown --provider; expected one of: ${Object.keys(AI_EVAL_PROVIDERS).join(", ")}`
    )
  }
  const project =
    argValue(argv, "project") ?? env[provider.projectEnv ?? ""] ?? null
  const keychainService = argValue(argv, "keychain-service") ?? provider.keychainService
  const keychainAccount = argValue(argv, "keychain-account")
  const models = (argValue(argv, "models") ?? provider.defaultModels.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  const maxUsdArg = argValue(argv, "max-usd")
  const maxUsd = Number(maxUsdArg ?? 0)
  const suites = argSet(argv, "suites")
  const firstTryFixtureIds = argSet(argv, "first-try-fixtures")
  const firstTryContext = argValue(argv, "first-try-context") ?? "llms"
  const groundingFixtureIds = argSet(argv, "grounding-fixtures")
  const groundingConditions = argSet(argv, "grounding-conditions")
  const trialId = argValue(argv, "trial-id") ?? "primary"
  const concurrency = Math.max(
    1,
    Math.min(8, Number(argValue(argv, "concurrency") ?? 4))
  )
  const outputDirectory = resolve(
    argValue(argv, "output-dir") ??
      join(
        root,
        "evals/reports",
        `${provider.reportPrefix}-${new Date().toISOString().slice(0, 10)}`
      )
  )
  const validate = hasArg(argv, "validate-only")
  // A dry run builds every request to count it and bound its cost. It reads
  // no credential, sends nothing, and writes nothing.
  const dryRun = hasArg(argv, "dry-run")
  const effort = argValue(argv, "effort") ?? provider.effort ?? null
  if (models.length === 0) {
    throw new Error(`${provider.label} has no default models; pass --models`)
  }
  let apiUrl = provider.apiUrl
  let prices = provider.pricesPerMillion
  let priceRevision = provider.priceRevision
  let hasPriceTable = provider.hasPriceTable === true
  let apiKey = null
  let credentialScheme = "api-key"
  if (provider.priceSource === "litellm-model-info" && !dryRun) {
    const proxyRoot = liteLLMProxyRoot(
      argValue(argv, "base-url") ??
        env[provider.baseUrlEnv] ??
        provider.defaultBaseUrl
    )
    apiUrl = `${proxyRoot}/v1/responses`
    apiKey = keychainApiKey(
      keychainService,
      keychainAccount,
      provider.apiKeyEnv,
      env
    )
    if (!apiKey) throw new Error(`${provider.apiKeyEnv} was empty`)
    const modelInfo = await fetchLiteLLMModelInfo({
      proxyRoot,
      apiKey,
      fetchImpl
    })
    const discovered = liteLLMPriceTable(modelInfo, models)
    const unpriced = describeUnpricedModels(discovered)
    if (discovered.unpriced.length === 0) {
      prices = discovered.prices
      priceRevision = `litellm-model-info-${digest(
        JSON.stringify(discovered.prices)
      ).slice(0, 12)}`
      hasPriceTable = true
    } else if (maxUsdArg !== undefined) {
      // A ceiling the runner cannot enforce for every model is worse than no
      // ceiling, so refuse instead of silently dropping it.
      throw new Error(
        `--max-usd cannot be enforced: ${provider.label} /model/info has no ` +
          `input and output prices for ${unpriced}. Set input_cost_per_token ` +
          "and output_cost_per_token in the proxy's model_info, or omit " +
          "--max-usd to record cost as unknown (null)"
      )
    } else {
      stderr.write(
        `${provider.label} /model/info has no input and output prices for ` +
          `${unpriced}; cost is recorded as unknown (null) and no spend ` +
          "ceiling is enforced\n"
      )
    }
  }
  if (provider.projectEnv && !project && !dryRun) {
    throw new Error("--project or OPENAI_PROJECT_ID is required")
  }
  if (prices && models.some((model) => !prices[model])) {
    throw new Error(
      `Models must have a locked price table: ${Object.keys(prices).join(", ")}`
    )
  }
  if (!validate && !dryRun) {
    if (!hasArg(argv, "confirm-spend")) {
      throw new Error(
        "Paid evaluation requires --confirm-spend"
      )
    }
    if (hasPriceTable && maxUsd <= 0) {
      throw new Error(
        `${provider.label} ${
          provider.hasPriceTable
            ? "uses a locked price table"
            : "/model/info prices every requested model"
        }, so a positive --max-usd is required`
      )
    }
    if (hasPriceTable && Number.isNaN(maxUsd)) {
      throw new Error("--max-usd must be a number")
    }
  }

  if (!dryRun && !apiKey) {
    const credential = resolveCredential(provider, {
      keychainService,
      keychainAccount,
      env,
    })
    apiKey = credential.apiKey
    credentialScheme = credential.scheme
    if (!apiKey) throw new Error(`${provider.apiKeyEnv} was empty`)
  }
  const wire = wireFor(provider, { effort, credentialScheme })
  if (validate && !dryRun) {
    await validateOnly({
      apiKey,
      apiUrl,
      apiErrorPrefix: `${provider.label} API`,
      project,
      model: models[0],
      prices,
      requestReasoning: provider.requestReasoning,
      credentialCheckMaxTokens: provider.credentialCheckMaxTokens,
      fetchImpl,
      stdout,
      wire,
    })
    return
  }

  const firstTryJobs = await readJson(
    join(root, "evals/first-try/jobs.json")
  )
  const firstTryContextPaths = FIRST_TRY_CONTEXTS
  if (!firstTryContextPaths[firstTryContext]) {
    throw new Error(
      `--first-try-context must be one of: ${Object.keys(
        firstTryContextPaths
      ).join(", ")}`
    )
  }
  const groundingJobs = await readJson(
    join(root, "evals/grounding/jobs.json")
  )
  validateFilterValues(
    "suite",
    suites,
    new Set(["first-try", "grounding"])
  )
  validateFilterValues(
    "first-try fixture",
    firstTryFixtureIds,
    new Set(firstTryJobs.jobs.map(({ fixtureId }) => fixtureId))
  )
  validateFilterValues(
    "grounding fixture",
    groundingFixtureIds,
    new Set(groundingJobs.jobs.map(({ fixtureId }) => fixtureId))
  )
  validateFilterValues(
    "grounding condition",
    groundingConditions,
    new Set(groundingJobs.jobs.map(({ condition }) => condition))
  )
  const contextText = await loadContext(firstTryContextPaths[firstTryContext])
  // The minimal context adds the signature card of each fixture's reference
  // component. That discloses the component, so this condition measures
  // prop-level correctness after selection, not component choice.
  let contextFor = () => contextText
  if (firstTryContext === "minimal") {
    const schema = await readJson(join(root, "ai/schema.json"))
    const { metadataForComponent } = createRequire(import.meta.url)(
      "../ai/componentMetadata.cjs"
    )
    const fixtures = await readJson(join(root, "evals/first-try/fixtures.json"))
    const referenceComponents = new Map(
      fixtures.fixtures.map(({ id, proposal }) => [id, proposal?.component])
    )
    contextFor = (job) => {
      const component = referenceComponents.get(job.fixtureId)
      return `${contextText}\n\n# Component signature\n${componentSignatureCard(
        schema,
        component,
        { importPath: metadataForComponent(component).importPath }
      )}`
    }
  }
  const packageVersion = (await readJson(join(root, "package.json"))).version
  const manifestPath = join(outputDirectory, "run-manifest.json")
  const manifest = await existingJson(manifestPath, {
    version: 1,
    provider: provider.id,
    clientVersion: provider.clientVersion,
    // Identify the release and fixtures a result belongs to, so reports can
    // be tracked per release.
    packageVersion,
    fixtureRevisions: {
      firstTry: firstTryJobs.fixtureRevision,
      grounding: groundingJobs.fixtureRevision,
    },
    date: new Date().toISOString().slice(0, 10),
    ...(effort ? { effort } : {}),
    priceRevision,
    models,
    trialId,
    firstTryContext,
    filters: {
      suites: suites ? [...suites] : null,
      firstTryFixtureIds: firstTryFixtureIds ? [...firstTryFixtureIds] : null,
      groundingFixtureIds: groundingFixtureIds ? [...groundingFixtureIds] : null,
      groundingConditions: groundingConditions ? [...groundingConditions] : null,
    },
    projectFingerprint: digest(project ?? provider.id).slice(0, 12),
    maxUsd,
    startedAt: new Date().toISOString(),
    completedAt: null,
    requests: [],
  })
  if (
    !dryRun &&
    (manifest.projectFingerprint !==
      digest(project ?? provider.id).slice(0, 12) ||
      manifest.priceRevision !== priceRevision ||
      manifest.trialId !== trialId ||
      manifest.firstTryContext !== firstTryContext ||
      (manifest.provider ?? "openai") !== provider.id)
  ) {
    throw new Error("Existing output directory belongs to another run")
  }
  // Manifests written before the provider field existed resume under the
  // openai provider; persist that default so a later resume stays stable.
  manifest.provider ??= "openai"
  const completedRequestKeys = new Set(
    manifest.requests.map(
      ({ model, suite, fixtureId }) => `${model}/${suite}/${fixtureId}`
    )
  )
  let spentUsd = manifest.requests.reduce(
    (total, request) => total + (request.estimatedUsd ?? 0),
    0
  )

  const pending = []
  for (const model of models) {
    const modelDirectory = join(outputDirectory, safeModelName(model))
    const firstTryPath = join(modelDirectory, "first-try-results.json")
    const groundingPath = join(modelDirectory, "grounding-results.json")
    const firstTrySubmission = await existingJson(firstTryPath, {
      metadata: {
        ...submissionMetadata(
          model,
          firstTryJobs.fixtureRevision,
          provider.clientVersion,
        ),
        context:
          firstTryContext === "minimal"
            ? [
                ...firstTryContextPaths.minimal,
                "ai/schema.json#reference-component-signature",
              ]
            : firstTryContextPaths[firstTryContext],
      },
      results: [],
    })
    const groundingSubmission = await existingJson(groundingPath, {
      metadata: submissionMetadata(
        model,
        groundingJobs.fixtureRevision,
        provider.clientVersion,
      ),
      responses: [],
    })
    for (const job of groundingJobs.jobs) {
      if (suites && !suites.has("grounding")) continue
      if (groundingFixtureIds && !groundingFixtureIds.has(job.fixtureId)) continue
      if (groundingConditions && !groundingConditions.has(job.condition)) continue
      const requestKey = `${model}/grounding/${job.fixtureId}/${job.condition}`
      if (completedRequestKeys.has(requestKey)) continue
      pending.push({
        model,
        suite: "grounding",
        fixtureId: `${job.fixtureId}/${job.condition}`,
        job,
        path: groundingPath,
        submission: groundingSubmission,
      })
    }
    for (const job of firstTryJobs.jobs) {
      if (suites && !suites.has("first-try")) continue
      if (firstTryFixtureIds && !firstTryFixtureIds.has(job.fixtureId)) continue
      const requestKey = `${model}/first-try/${job.fixtureId}`
      if (completedRequestKeys.has(requestKey)) continue
      pending.push({
        model,
        suite: "first-try",
        fixtureId: job.fixtureId,
        job,
        path: firstTryPath,
        submission: firstTrySubmission,
      })
    }
  }

  const requestBody = async (candidate) =>
    candidate.suite === "first-try"
      ? firstTryRequest(
          candidate.model,
          candidate.job,
          contextFor(candidate.job),
          provider.requestReasoning,
        )
      : await groundingRequest(
          candidate.model,
          candidate.job,
          provider.requestReasoning,
        )
  const upperBoundFor = (candidate, body) =>
    requestUpperBoundCost(candidate.model, wire.budgetRequest(body), prices)

  if (dryRun) {
    const count = (key) => {
      const totals = {}
      for (const candidate of pending) {
        totals[candidate[key]] = (totals[candidate[key]] ?? 0) + 1
      }
      return totals
    }
    let upperBoundUsd = 0
    let estimatedUsd = 0
    // Requests with identical instructions share a cached prefix once the
    // first concurrent batch has been sent.
    const sharedInstructions = new Map()
    for (const candidate of pending) {
      const body = await requestBody(candidate)
      upperBoundUsd += upperBoundFor(candidate, body) ?? 0
      const shared = body.instructions
        ? `${candidate.model}\u0000${digest(body.instructions)}`
        : null
      const earlier = shared ? (sharedInstructions.get(shared) ?? 0) : 0
      if (shared) sharedInstructions.set(shared, earlier + 1)
      estimatedUsd +=
        requestEstimatedCost(candidate.model, body, prices, {
          instructionsCached: earlier >= concurrency,
        }) ?? 0
    }
    stdout.write(
      `${JSON.stringify(
        {
          dryRun: true,
          provider: provider.id,
          models,
          trialId,
          firstTryContext,
          packageVersion,
          fixtureRevisions: {
            firstTry: firstTryJobs.fixtureRevision,
            grounding: groundingJobs.fixtureRevision,
          },
          ...(effort ? { effort } : {}),
          requests: {
            total: pending.length,
            bySuite: count("suite"),
            byModel: count("model"),
          },
          priceRevision,
          // A rough planning estimate, and the bound the spend ceiling
          // reserves: every request at its highest input rate with its whole
          // output budget used. Null when prices are unknown.
          estimatedUsd: prices ? roundCost(estimatedUsd) : null,
          upperBoundUsd: prices ? roundCost(upperBoundUsd) : null,
        },
        null,
        2
      )}\n`
    )
    return
  }

  let completedThisRun = 0
  for (let offset = 0; offset < pending.length; ) {
    const candidates = pending.slice(offset, offset + concurrency)
    const prepared = []
    for (const candidate of candidates) {
      const body = await requestBody(candidate)
      const upperBound = upperBoundFor(candidate, body)
      if (prices && spentUsd + upperBound > maxUsd) {
        if (prepared.length === 0) {
          throw new Error(
            `Spend ceiling would be exceeded before ${candidate.model}/${candidate.suite}/${candidate.fixtureId}: spent $${spentUsd.toFixed(
              4
            )}, request upper bound $${upperBound.toFixed(4)}, ceiling $${maxUsd.toFixed(
              2
            )}`
          )
        }
        break
      }
      prepared.push({ ...candidate, body, upperBound })
      spentUsd += upperBound ?? 0
    }

    const completed = await Promise.all(
      prepared.map(async (candidate) => {
        const idempotencyKey = digest(
          [
            "semiotic-evals",
            candidate.model,
            candidate.suite,
            candidate.fixtureId,
            firstTryJobs.fixtureRevision,
            groundingJobs.fixtureRevision,
            trialId,
          ].join("/")
        )
        const { response, latencyMs } = await apiRequest({
          apiKey,
          apiUrl,
          apiErrorPrefix: `${provider.label} API`,
          body: candidate.body,
          idempotencyKey,
          fetchImpl,
          wire,
        })
        const rawOutput = extractOutputText(response)
        return {
          ...candidate,
          response,
          rawOutput,
          latencyMs,
          record: publicRequestRecord({
            model: candidate.model,
            suite: candidate.suite,
            fixtureId: candidate.fixtureId,
            response,
            rawOutput,
            latencyMs,
            prices,
          }),
        }
      })
    )

    for (const entry of completed) {
      spentUsd -= entry.upperBound ?? 0
      spentUsd += entry.record.estimatedUsd ?? 0
      manifest.requests.push(entry.record)
      if (entry.suite === "first-try") {
        entry.submission.results.push({
          fixtureId: entry.job.fixtureId,
          proposal: parseFirstTry(entry.rawOutput),
          rawOutputSha256: entry.record.rawOutputSha256,
        })
      } else {
        entry.submission.responses.push({
          fixtureId: entry.job.fixtureId,
          condition: entry.job.condition,
          answer: parseGrounding(entry.rawOutput),
        })
      }
      await atomicWriteJson(entry.path, entry.submission)
      completedThisRun += 1
    }
    await atomicWriteJson(manifestPath, manifest)
    offset += completed.length
    if (hasPriceTable) {
      stderr.write(
        `${provider.label} eval ${offset}/${pending.length} pending requests completed · $${spentUsd.toFixed(
          4
        )}/$${maxUsd.toFixed(2)}\n`
      )
    } else {
      stderr.write(
        `${provider.label} eval ${offset}/${pending.length} pending requests completed · ${offset} requests\n`
      )
    }
  }

  manifest.completedAt = new Date().toISOString()
  manifest.estimatedUsd = hasPriceTable ? roundCost(spentUsd) : null
  manifest.requestCount = manifest.requests.length
  // The model ids the provider reported serving, beside the ids requested.
  manifest.resolvedModels = [
    ...new Set(
      manifest.requests.map(({ resolvedModel }) => resolvedModel).filter(Boolean)
    ),
  ].sort()
  await atomicWriteJson(manifestPath, manifest)
  stdout.write(
    `${JSON.stringify(
      {
        completed: true,
        completedThisRun,
        totalRequests: manifest.requestCount,
        estimatedUsd: manifest.estimatedUsd,
        maxUsd,
        outputDirectory,
      },
      null,
      2
    )}\n`
  )
}

async function main() {
  await runEvalRun({
    argv: process.argv,
    env: process.env,
    fetchImpl: globalThis.fetch,
    stdout: process.stdout,
  })
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  })
}
