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
 * with a strict JSON-schema output format. `cheaperinference` is another
 * OpenAI-compatible AI gateway on the same terms: `/v1/responses`, bare model
 * ids, no price table (cost is `null`), and no `reasoning` field, because one
 * key serves models from several labs.
 *
 * `litellm` is a self-hosted AI gateway, so it has no fixed URL, model list, or
 * price table. The runner resolves `apiUrl` from `--base-url` or
 * `LITELLM_BASE_URL` (default `http://localhost:4000`) and, because
 * `priceSource` is `"litellm-model-info"`, reads per-token rates from the
 * proxy's `/model/info` at startup. `hasPriceTable` stays `false` because it
 * marks a locked table shipped here. When every requested model is priced the
 * run gets a real price table, estimated USD, and an enforced `--max-usd`
 * ceiling. Otherwise a run that passed `--max-usd` fails fast, and a run
 * without it records cost as unknown (`null`) as for the other gateways.
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
  cheaperinference: {
    id: "cheaperinference",
    label: "Cheaper Inference",
    apiUrl: "https://api.cheaperinference.com/v1/responses",
    apiKeyEnv: "CHEAPER_INFERENCE_API_KEY",
    projectEnv: null,
    keychainService: "semiotic-cheaperinference-evals",
    clientVersion: "semiotic-cheaperinference-eval/1",
    defaultModels: [
      "gpt-5.4-mini",
    ],
    hasPriceTable: false,
    priceRevision: null,
    reportPrefix: "cheaperinference",
    requestReasoning: false,
    credentialCheckMaxTokens: 64,
    pricesPerMillion: null,
  },
  litellm: {
    id: "litellm",
    label: "LiteLLM",
    apiUrl: null,
    baseUrlEnv: "LITELLM_BASE_URL",
    defaultBaseUrl: "http://localhost:4000",
    apiKeyEnv: "LITELLM_API_KEY",
    projectEnv: null,
    keychainService: "semiotic-litellm-evals",
    clientVersion: "semiotic-litellm-eval/1",
    // Model names are whatever the proxy operator configured, so runs must
    // pass --models explicitly.
    defaultModels: [],
    // No locked table ships with the provider; the runner builds one from
    // `/model/info` at startup (see `priceSource`).
    hasPriceTable: false,
    priceSource: "litellm-model-info",
    priceRevision: null,
    reportPrefix: "litellm",
    requestReasoning: false,
    // Headroom for proxied reasoning models: `reasoning` is not sent, so they
    // can spend hidden reasoning tokens before the credential-check JSON.
    credentialCheckMaxTokens: 256,
    pricesPerMillion: null
  }
}
