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

## A release run in one command

`npm run eval:ai:release` runs both suites against two vendors, three times,
and writes one report that can be compared from release to release. Start with
a dry run. It prints the plan, the request count, and cost figures; it reads no
credential and makes no network call:

```sh
npm run eval:ai:release -- --dry-run
```

By default that plans 2,328 requests: the three `openai` default models and the
one `anthropic` default model, three trials each, 150 grounding requests per
trial, and the 22 first-try jobs once per context. The dry run prints two cost
figures. `estimatedUsd` is a rough planning number. `upperBoundUsd` is what the
spend ceiling reserves if every request used its whole output budget at its
highest input rate; a real run costs far less.

The paid run needs the built library for scoring, credentials for each vendor,
an explicit confirmation, and one spend ceiling for the whole run:

```sh
npm run dist
export OPENAI_API_KEY=... OPENAI_PROJECT_ID=proj_...
export ANTHROPIC_API_KEY=...
npm run eval:ai:release -- --max-usd=25 --confirm-spend
```

Rerunning the same command resumes an interrupted run. Options:

- `--providers=openai,anthropic` chooses vendors from
  `scripts/lib/ai-eval-providers.mjs`.
- `--openai-models=...` and `--anthropic-models=...` replace a vendor's default
  models, for example
  `--anthropic-models=claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5`.
- `--trials=3` sets how many times every request is repeated.
- `--contexts=llms,minimal` chooses what the first-try suite is given. `llms` is
  the full reference (`ai/reference.md` and `llms.txt`, about 54k tokens).
  `minimal` is `ai/system-prompt.md` plus the signature card of the fixture's
  reference component, about 5k tokens. Because the card names the component,
  `minimal` measures prop-level correctness after a component is chosen, not
  component choice. `skill` is also accepted.
- `--suites`, `--first-try-fixtures`, `--grounding-fixtures`, and
  `--grounding-conditions` narrow the run.

Results land in `evals/reports/release-<version>-<date>/`, one directory per
vendor, trial, and context, each a normal resumable runner directory. The run
ends by writing `release-report.json`, which records:

- the package version, date, fixture revisions, and for each vendor the price
  revision, the model ids requested, and the model ids the vendor reported
  serving;
- for each model and context (first-try) or condition (grounding), the pass
  rate of every trial, their mean, minimum, maximum, and standard deviation;
- for every fixture, how many trials passed, the variance of that outcome, and
  whether it is unstable (passed in some trials and failed in others).

The `anthropic` provider speaks the Messages API through
`scripts/lib/ai-eval-anthropic-messages.mjs`; every other provider speaks the
Responses API. Three differences affect how its numbers compare:

- Current Claude models cannot all switch thinking off, so requests set
  `effort` (default `low`, `--effort` to change) where the `openai` provider
  sends `reasoning: none`.
- The first-try suite asks for free-form JSON. The Messages API has no JSON
  mode for an open-ended object, so the adapter removes one enclosing Markdown
  code fence from a reply and repairs nothing else.
- Refusal fallbacks are left off, so a result always comes from the model the
  report names.

It reads `ANTHROPIC_API_KEY`, or an OAuth access token from
`ANTHROPIC_AUTH_TOKEN` (for example
`ant auth print-credentials --access-token`), or a Keychain item for the
`semiotic-anthropic-evals` service. To run it alone:

```sh
npm run eval:ai:anthropic -- --validate-only
npm run eval:ai:anthropic -- --max-usd=10 --confirm-spend
```

## Provider runners

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
estimate, so the ceiling never trips for it. Reasoning tokens use
`output_cost_per_reasoning_token` when supplied, otherwise the ordinary output
rate. The request budget reserves the higher output/reasoning rate. Every
matching deployment must be priced, including deployments on wildcard routes.
If any matching deployment lacks input or output prices, a run that passes
`--max-usd` fails before any request and names the unpriced models; without
`--max-usd` the run proceeds with cost recorded as `null` and no ceiling:

```sh
npm run eval:ai:litellm -- \
  --base-url=http://localhost:4000 \
  --models=gpt-4.1-mini,gemini-2.5-flash \
  --suites=first-try \
  --output-dir=evals/reports/litellm/trial-a \
  --max-usd=2 \
  --confirm-spend
```

The `runcrate` provider uses [Runcrate](https://runcrate.ai)'s Responses
endpoint (`https://api.runcrate.ai/v1/responses`) with `RUNCRATE_API_KEY` and
lab-prefixed open-weight model IDs such as `deepseek-ai/DeepSeek-V4.1-Flash`,
`zai-org/GLM-5.3`, or `moonshotai/Kimi-K3` (`GET /v1/models` lists them; Kimi K3
also accepts images). Start with the strict JSON-schema credential check:

```sh
node scripts/run-openai-ai-evals.mjs --provider=runcrate \
  --models=deepseek-ai/DeepSeek-V4.1-Flash --validate-only
```

To run a queue, replace `--validate-only` with `--suites=first-try`,
`--output-dir=evals/reports/runcrate/trial-a`, and `--confirm-spend`. Pricing is
unknown to this runner (`null` USD); it cannot enforce a USD spend ceiling for
Runcrate. See the [API documentation](https://runcrate.ai/docs) for
authentication and models. This registers an evaluation provider; it does not
claim results for any chart-generation or grounding benchmark.

Add `--dry-run` to any runner command to print its request counts and cost
figures without reading a credential or sending a request.
Use `--validate-only` first for one minimal request. The live runner always
requires `--confirm-spend`. Providers with a locked price table also require a
positive `--max-usd`; the `orcarouter`, `cheaperinference`, `apiroute`, and `runcrate` gateways have no
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
