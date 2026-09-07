/**
 * Provider registry for the Semiotic AI evaluation runners.
 *
 * Each entry is a first-class, OpenAI-Responses-compatible provider the
 * evaluation queues can run against. The `openai` entry preserves the original
 * runner behavior exactly (locked standard-tier price table, gpt-5.6 model
 * family, OPENAI_PROJECT_ID scoping). `orcarouter` is the OpenAI-compatible AI
 * gateway integration: the same `/v1/responses` request shapes and result
 * schemas apply, but there is no per-model price table because the gateway is
 * zero-markup, so cost is treated as unknown (reported as `null`, never a
 * zero-dollar estimate) and no spend ceiling is enforced. The `reasoning`
 * request field is omitted because its upstream models reject it when combined
 * with a strict JSON-schema output format.
 */
export const AI_EVAL_PROVIDERS = {
  openai: {
    id: "openai",
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1/responses",
    apiKeyEnv: "OPENAI_API_KEY",
    projectEnv: "OPENAI_PROJECT_ID",
    keychainService: "semiotic-evals",
    clientVersion: "semiotic-openai-eval/1",
    defaultModels: [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
    ],
    hasPriceTable: true,
    priceRevision: "openai-standard-2026-07-26",
    reportPrefix: "openai-gpt-5.6",
    requestReasoning: true,
    credentialCheckMaxTokens: 32,
    pricesPerMillion: {
      "gpt-5.6-sol": {
        input: 5,
        cachedInput: 0.5,
        cacheWriteInput: 6.25,
        output: 30,
      },
      "gpt-5.6-terra": {
        input: 2.5,
        cachedInput: 0.25,
        cacheWriteInput: 3.125,
        output: 15,
      },
      "gpt-5.6-luna": {
        input: 1,
        cachedInput: 0.1,
        cacheWriteInput: 1.25,
        output: 6,
      },
    },
  },
  orcarouter: {
    id: "orcarouter",
    label: "OrcaRouter",
    apiUrl: "https://api.orcarouter.ai/v1/responses",
    apiKeyEnv: "ORCAROUTER_API_KEY",
    projectEnv: null,
    keychainService: "semiotic-orcarouter-evals",
    clientVersion: "semiotic-orcarouter-eval/1",
    defaultModels: [
      "orcarouter/auto",
    ],
    hasPriceTable: false,
    priceRevision: null,
    reportPrefix: "orcarouter",
    requestReasoning: false,
    credentialCheckMaxTokens: 512,
    pricesPerMillion: null,
  },
}
