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
 * schemas. Reports contain scored content, hashes, token usage, and estimated
 * standard-tier cost, but never credentials, project IDs, prompts, or raw
 * response bodies.
 */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { AI_EVAL_PROVIDERS } from "./lib/ai-eval-providers.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const defaultOpenAIPrices = AI_EVAL_PROVIDERS.openai.pricesPerMillion

const digest = (value) =>
  createHash("sha256").update(value).digest("hex")
const argValue = (name) =>
  process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
const hasArg = (name) => process.argv.includes(`--${name}`)
const argSet = (name) => {
  const value = argValue(name)
  if (!value) return null
  return new Set(
    value.split(",").map((entry) => entry.trim()).filter(Boolean)
  )
}
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const safeModelName = (model) => model.replace(/[^a-zA-Z0-9._-]/g, "-")
const roundCost = (value) => Number(value.toFixed(8))
const sanitizedApiError = (value) =>
  value.replace(/sk-[A-Za-z0-9_*.-]+/g, "[REDACTED_API_KEY]")

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
  prices = defaultOpenAIPrices,
) {
  if (!prices) return 0
  const rates = prices[model]
  if (!rates) throw new Error(`No price table for ${model}`)
  const cached = usage.input_tokens_details?.cached_tokens ?? 0
  const cacheWrite = usage.input_tokens_details?.cache_write_tokens ?? 0
  const input = Math.max(
    0,
    (usage.input_tokens ?? 0) - cached - cacheWrite
  )
  const output = usage.output_tokens ?? 0
  return roundCost(
    (input * rates.input +
      cached * rates.cachedInput +
      cacheWrite * rates.cacheWriteInput +
      output * rates.output) /
      1_000_000
  )
}

export function requestUpperBoundCost(model, request, prices = defaultOpenAIPrices) {
  if (!prices) return 0
  const rates = prices[model]
  if (!rates) throw new Error(`No price table for ${model}`)
  const serialized = JSON.stringify(request)
  const imageCount = (
    serialized.match(/"type":"input_image"/g) ?? []
  ).length
  const estimatedInputTokens =
    Math.ceil(serialized.length / 3) + imageCount * 2_000
  return roundCost(
    (estimatedInputTokens * Math.max(rates.input, rates.cacheWriteInput) +
      (request.max_output_tokens ?? 0) * rates.output) /
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

function keychainApiKey(service, account, apiKeyEnv = "OPENAI_API_KEY") {
  const envApiKey = process.env[apiKeyEnv]
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
      `No readable generic-password item found for Keychain service ${service}`
    )
  }
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
}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now()
    let response
    try {
      response = await globalThis.fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: globalThis.AbortSignal.timeout(180_000),
      })
    } catch (error) {
      if (attempt === retries) throw error
      await delay(1_000 * 2 ** attempt)
      continue
    }
    if (response.ok) {
      return {
        response: await response.json(),
        latencyMs: Date.now() - startedAt,
      }
    }
    const errorText = await response.text()
    const retryable =
      response.status === 429 ||
      (response.status >= 500 && response.status <= 504)
    if (!retryable || attempt === retries) {
      throw new Error(
        `${apiErrorPrefix} ${response.status}: ${sanitizedApiError(
          errorText
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

async function validateOnly({ apiKey, apiUrl, apiErrorPrefix, project, model, prices, requestReasoning, credentialCheckMaxTokens = 32 }) {
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
  })
  const rawOutput = extractOutputText(response)
  const parsed = JSON.parse(rawOutput)
  if (parsed.ok !== true) throw new Error("Credential check returned false")
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        requestedModel: model,
        resolvedModel: response.model,
        responseId: response.id,
        latencyMs,
        usage: response.usage,
        estimatedUsd: calculateResponseCost(model, response.usage, prices),
      },
      null,
      2
    )}\n`
  )
}

async function main() {
  const provider = AI_EVAL_PROVIDERS[argValue("provider") ?? "openai"]
  if (!provider) {
    throw new Error(
      `Unknown --provider; expected one of: ${Object.keys(AI_EVAL_PROVIDERS).join(", ")}`
    )
  }
  const prices = provider.pricesPerMillion
  const project =
    argValue("project") ?? process.env[provider.projectEnv ?? ""] ?? null
  const keychainService = argValue("keychain-service") ?? provider.keychainService
  const keychainAccount = argValue("keychain-account")
  const models = (argValue("models") ?? provider.defaultModels.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  const maxUsd = Number(argValue("max-usd") ?? 0)
  const suites = argSet("suites")
  const firstTryFixtureIds = argSet("first-try-fixtures")
  const firstTryContext = argValue("first-try-context") ?? "llms"
  const groundingFixtureIds = argSet("grounding-fixtures")
  const groundingConditions = argSet("grounding-conditions")
  const trialId = argValue("trial-id") ?? "primary"
  const concurrency = Math.max(
    1,
    Math.min(8, Number(argValue("concurrency") ?? 4))
  )
  const outputDirectory = resolve(
    argValue("output-dir") ??
      join(
        root,
        "evals/reports",
        `${provider.reportPrefix}-${new Date().toISOString().slice(0, 10)}`
      )
  )
  const validate = hasArg("validate-only")
  if (provider.projectEnv && !project) {
    throw new Error("--project or OPENAI_PROJECT_ID is required")
  }
  if (prices && models.some((model) => !prices[model])) {
    throw new Error(
      `Models must have a locked price table: ${Object.keys(prices).join(", ")}`
    )
  }
  if (!validate && (!hasArg("confirm-spend") || maxUsd <= 0)) {
    throw new Error(
      "Paid evaluation requires --confirm-spend and a positive --max-usd"
    )
  }

  const apiKey = keychainApiKey(
    keychainService,
    keychainAccount,
    provider.apiKeyEnv,
  )
  if (!apiKey) throw new Error(`${provider.apiKeyEnv} was empty`)
  if (validate) {
    await validateOnly({
      apiKey,
      apiUrl: provider.apiUrl,
      apiErrorPrefix: `${provider.label} API`,
      project,
      model: models[0],
      prices,
      requestReasoning: provider.requestReasoning,
      credentialCheckMaxTokens: provider.credentialCheckMaxTokens,
    })
    return
  }

  const firstTryJobs = await readJson(
    join(root, "evals/first-try/jobs.json")
  )
  const firstTryContextPaths = {
    llms: ["ai/reference.md", "docs/public/llms.txt"],
    skill: ["ai/reference.md", "agent-skill/semiotic-charts/SKILL.md"],
  }
  if (!firstTryContextPaths[firstTryContext]) {
    throw new Error("--first-try-context must be llms or skill")
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
  const manifestPath = join(outputDirectory, "run-manifest.json")
  const manifest = await existingJson(manifestPath, {
    version: 1,
    provider: provider.id,
    clientVersion: provider.clientVersion,
    priceRevision: provider.priceRevision,
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
    manifest.projectFingerprint !== digest(project ?? provider.id).slice(0, 12) ||
    manifest.priceRevision !== provider.priceRevision ||
    manifest.trialId !== trialId
    || manifest.firstTryContext !== firstTryContext
    || manifest.provider !== provider.id
  ) {
    throw new Error("Existing output directory belongs to another run")
  }
  const completedRequestKeys = new Set(
    manifest.requests.map(
      ({ model, suite, fixtureId }) => `${model}/${suite}/${fixtureId}`
    )
  )
  let spentUsd = manifest.requests.reduce(
    (total, request) => total + request.estimatedUsd,
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
        context: firstTryContextPaths[firstTryContext],
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

  let completedThisRun = 0
  for (let offset = 0; offset < pending.length; ) {
    const candidates = pending.slice(offset, offset + concurrency)
    const prepared = []
    for (const candidate of candidates) {
      const body =
        candidate.suite === "first-try"
          ? firstTryRequest(
              candidate.model,
              candidate.job,
              contextText,
              provider.requestReasoning,
            )
          : await groundingRequest(
              candidate.model,
              candidate.job,
              provider.requestReasoning,
            )
      const upperBound = requestUpperBoundCost(candidate.model, body, prices)
      if (spentUsd + upperBound > maxUsd) {
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
      spentUsd += upperBound
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
          apiUrl: provider.apiUrl,
          apiErrorPrefix: `${provider.label} API`,
          body: candidate.body,
          idempotencyKey,
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
      spentUsd -= entry.upperBound
      spentUsd += entry.record.estimatedUsd
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
    process.stderr.write(
      `${provider.label} eval ${offset}/${pending.length} pending requests completed · $${spentUsd.toFixed(
        4
      )}/$${maxUsd.toFixed(2)}\n`
    )
  }

  manifest.completedAt = new Date().toISOString()
  manifest.estimatedUsd = roundCost(spentUsd)
  manifest.requestCount = manifest.requests.length
  await atomicWriteJson(manifestPath, manifest)
  process.stdout.write(
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
