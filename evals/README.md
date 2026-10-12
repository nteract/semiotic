# Semiotic AI evaluations

This directory holds versioned, reproducible evidence for Semiotic's agent-facing
surfaces. The fixtures intentionally contain no private prompts or production data.

- `tool-discovery/golden-prompts.json` defines expected public-profile tool routing,
  including negative cases where Semiotic should not be called.
- `first-try/fixtures.json` defines 20+ static/push prompts and deterministic
  proposals used to measure validation, diagnosis, render evidence, and repair
  recovery.
- `grounding/fixtures.json` defines 50 answerable and deliberately
  unanswerable questions, expanded across PNG-only, combined, and
  grounding-only conditions.

The runners report their raw per-fixture results. They do not claim model
quality: model/client runs belong in separately versioned compatibility reports
with model IDs, dates, fixture/context revisions, and consent-safe traces.

The latest live compatibility evidence is the complete three-model
[`openai-gpt-5.6-2026-07-27`](./reports/openai-gpt-5.6-2026-07-27/README.md)
run: 516 requests covering the grounding and first-try suites. Its central
grounding result is mixed — the combined payload improved Sol's abstention,
tied PNG-only for Terra and Luna, and did not improve answerable reading — and
is preserved without reinterpretation.

The subsequent
[`openai-follow-up`](./reports/openai-follow-up/README.md) report adds three
targeted post-merge trials: 603 requests covering the seven generation fixtures
that previously failed and all twenty answerable grounding questions. It
reports only repeated cases and does not replace the complete baseline.

Run `npm run prepare:ai-evals` after an intentional fixture change, then
`npm run eval:ai` for the local render oracle. Provider result files conform
to the schemas in each suite and can be scored with
`--first-try-results=...` or `--grounding-results=...`.
Each suite's generated `jobs.json` is the uncontaminated provider run queue;
golden proposals and scoring expectations stay in `fixtures.json`.

The OpenAI compatibility runner reads `OPENAI_API_KEY` or a macOS Keychain
generic-password item, sends only the inputs allowed by each job, disables
response storage, and maintains a resumable usage/cost manifest:

```sh
npm run eval:ai:openai -- \
  --project=proj_... \
  --keychain-service=semiotic-evals \
  --models=gpt-5.6-sol,gpt-5.6-terra,gpt-5.6-luna \
  --max-usd=10 \
  --confirm-spend
```

The same runner accepts other registered OpenAI-compatible providers from
`scripts/lib/ai-eval-providers.mjs`. The `orcarouter` provider points the
Responses-API queue at the OrcaRouter AI gateway (`ORCAROUTER_API_KEY`, no
project ID, no per-model price table). Cost is treated as unknown rather than
estimated, so the runner records `null` USD and skips the `--max-usd` spend
ceiling:

```sh
npm run eval:ai:orcarouter -- \
  --models=orcarouter/auto \
  --suites=first-try \
  --output-dir=evals/reports/orcarouter/trial-a \
  --confirm-spend
```

The `cheaperinference` provider points the same queue at the Cheaper Inference
AI gateway (`CHEAPER_INFERENCE_API_KEY`, no project ID, no per-model price
table). Model ids have no lab prefix, and cost is also recorded as `null` USD:

```sh
npm run eval:ai:cheaperinference -- \
  --models=gpt-5.4-mini \
  --suites=first-try \
  --output-dir=evals/reports/cheaperinference/trial-a \
  --confirm-spend
```

The `apiroute` provider uses API Route's Responses endpoint with
`API_ROUTE_API_KEY` and exact model IDs. Model access depends on the key; choose
an available Responses-compatible model from the authenticated catalog. Start
with the strict JSON-schema credential check:

```sh
node scripts/run-openai-ai-evals.mjs --provider=apiroute \
  --models=gpt-6.1-sol --validate-only
```

To run a queue, replace `--validate-only` with `--suites=first-try`,
`--output-dir=evals/reports/apiroute/trial-a`, and `--confirm-spend`. Pricing is
unknown to this runner (`null` USD); it cannot enforce a USD spend ceiling for
API Route. See the [API documentation](https://github.com/DennyHo0917/api-route/blob/main/API.md)
for authentication and model discovery. This registers an evaluation provider;
it does not claim results for any chart-generation or grounding benchmark.

The `litellm` provider points the same queue at a self-hosted
[LiteLLM](https://github.com/BerriAI/litellm) proxy (`LITELLM_API_KEY`, a
virtual key or the master key). The proxy URL comes from `--base-url` or
`LITELLM_BASE_URL` (default `http://localhost:4000`, with or without `/v1`),
and `--models` takes the model names configured on the proxy. At startup the
runner reads the proxy's `/model/info` and builds the price table from its
per-token rates (the highest rate when a model has several deployments), so
LiteLLM runs record estimated USD and require a positive `--max-usd` like the
`openai` provider. `--validate-only` makes the same `/model/info` call before
its one request. A model served only through a wildcard route such as
`openai/*` is priced from that route's rates, which LiteLLM often leaves
empty. A model priced at `0` on the proxy counts as priced and adds $0 to the
estimate, so the ceiling never trips for it. If the proxy reports no input or
output price for any requested model, a run that passes `--max-usd` fails
before any request and names the unpriced models; without `--max-usd` the run
proceeds with cost recorded as `null` and no ceiling:

```sh
npm run eval:ai:litellm -- \
  --base-url=http://localhost:4000 \
  --models=gpt-4.1-mini,gemini-2.5-flash \
  --suites=first-try \
  --output-dir=evals/reports/litellm/trial-a \
  --max-usd=2 \
  --confirm-spend
```

Use `--validate-only` first for one minimal request. The live runner always
requires `--confirm-spend`. Providers with a locked price table also require a
positive `--max-usd`; the `orcarouter`, `cheaperinference`, and `apiroute` gateways have no
price table, so no spend ceiling is enforced and `--max-usd` is optional. The runner never writes the
credential, project ID, raw prompts, or raw API response bodies to its reports.
Scoring inputs necessarily retain parsed chart proposals and grounding answer
strings.

Targeted follow-ups can select suites, fixtures, and grounding conditions:

```sh
npm run eval:ai:openai -- \
  --project=proj_... \
  --suites=first-try,grounding \
  --first-try-fixtures=gauge-static,symbol-map-static \
  --grounding-fixtures=galton-values/count \
  --grounding-conditions=png-plus-grounding,grounding-only \
  --trial-id=follow-up-a \
  --output-dir=evals/reports/follow-up/trial-a \
  --max-usd=2 \
  --confirm-spend
```

Use a distinct `--trial-id` and output directory for every repeated trial.
The trial ID participates in the idempotency key, so a repeated trial receives
a fresh model response while an interrupted run with the same ID remains
resumable.

After two or more targeted runs complete, aggregate only the cases that were
actually repeated:

```sh
npm run eval:ai:trials -- \
  --runs=evals/reports/follow-up/trial-a,evals/reports/follow-up/trial-b \
  --output=evals/reports/follow-up/summary.json
```

The summarizer requires matching models, fixture revisions, and target filters
across trials. It does not carry forward untouched baseline cases.
