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
project ID, no per-model price table), so a zero-markup trial never needs
`--max-usd` or `--confirm-spend`:

```sh
npm run eval:ai:orcarouter -- \
  --models=orcarouter/auto \
  --suites=first-try \
  --output-dir=evals/reports/orcarouter/trial-a
```

Use `--validate-only` first for one minimal request. The live runner refuses
paid work unless `--confirm-spend` and a positive `--max-usd` are both present.
It never writes the credential, project ID, raw prompts, or raw API response
bodies to its reports. Scoring inputs necessarily retain parsed chart proposals
and grounding answer strings.

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
