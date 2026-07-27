# Grounding benchmark

The committed substrate contains 10 rendered Semiotic charts and 50 questions,
expanded across three conditions for 150 model trials:

- PNG only
- PNG plus `buildReaderGrounding` payload
- grounding payload only

`jobs.json` is the provider-neutral run queue. It contains only the question
and the paths permitted in that condition; the scoring expectations remain in
the golden fixture and are not exposed to the model.

Every chart has answerable questions and deliberately unanswerable questions.
The latter are scored for abstention because inventing causality, provenance,
or forecasts is the failure mode this benchmark is meant to expose.

Prepare or refresh the PNGs, grounding payloads, and hashed manifest:

```sh
npm run prepare:ai-evals
```

Run the local render/fixture oracle:

```sh
npm run eval:ai
```

To score a model run, produce a file conforming to `result-schema.json` and
pass it to the same runner:

```sh
node scripts/run-ai-evals.mjs --grounding-results=path/to/results.json
```

Run each model independently. Keep the model ID, client version, fixture
revision, and date in every result file; do not pool or silently discard
unfavorable conditions.
