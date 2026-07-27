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

Use `--validate-only` first for one minimal request. The live runner refuses
paid work unless `--confirm-spend` and a positive `--max-usd` are both present.
It never writes the credential, project ID, raw prompts, or raw API response
bodies to its reports. Scoring inputs necessarily retain parsed chart proposals
and grounding answer strings.
