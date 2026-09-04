# Artifact-contract benchmark

This directory contains a deterministic benchmark for the portable artifact
contract and its evaluation surfaces. It is intended to expose what the current
APIs can prove, what they only flag for review, and what remains explicitly
unknown. It is not a composite quality score.

`fixtures.json` uses fixture format `0.2`. It defines four reusable base
artifacts and exactly 40 cases, balanced across operational, editorial/news,
agent authoring/reading, and public science/literacy tracks. Each base
explicitly labels its defensible positive-control outcome as `not-refuse`. Each
case declares the relations it exercises, deterministic mutation identifiers,
expected finding prefixes, and expected unknown paths.

`mutations.json` uses mutation format `0.1`. Its 12 definitions describe the
seeded defects independently of the runner. The runner applies each mutation to
cloned contract and chart inputs, then invokes the artifact evaluator, claim and
temporal audits, representation selection, agent grounding, and collection
audit. Artifact evaluation uses the real static LineChart frame renderer so
strict renderer-proof policies are measured rather than bypassed or left
unresolved. Fixture validation fails closed if a base names a component that the
benchmark renderer does not yet prove.

`baseline.json` is generated evidence. The same generator writes the complete
downloadable report to `docs/public/artifact-contract-benchmark.json` and a
compact page summary to
`docs/src/pages/artifacts/artifactBenchmarkSummary.generated.json`. A case is
`measured` only when all of its declared finding prefixes and unknown paths
appear. `partial` means at least one expected finding is observable but coverage
is incomplete. `not-currently-measurable` means none of its expected finding
prefixes is observable. Existing unknowns remain visible instead of being
interpreted as passes.

The report keeps refusal and mutation measurements separate:

- `refusalEvaluation` is a confusion matrix over the explicitly labeled base
  controls and reports their false-refusal rate.
- `pairedMutationDetection` reports whether every declared finding prefix
  appears only after the paired mutation set is applied.
- Mutated cases do not yet have complete `should-refuse` labels. The report
  therefore leaves `refusalPrecision` as `null` instead of treating finding
  detection as precision.

Run the benchmark with Node and the repository's TypeScript loader:

```sh
node --import tsx scripts/artifact-contract-benchmark.ts
node --import tsx scripts/artifact-contract-benchmark.ts --write
node --import tsx scripts/artifact-contract-benchmark.ts --check
node --import tsx --test scripts/artifact-contract-benchmark.test.mjs
```

`--write` refreshes all three generated outputs. `--check` compares every output
byte-for-byte and fails if any one is missing or stale. Do not edit or
separately format the generated files; change the fixtures or generator and
rerun `--write`.
