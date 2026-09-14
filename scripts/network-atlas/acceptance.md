# Atlas acceptance and performance

The post-NA5 phase makes §10's automated acceptance executable and measures the
representative structure workload. The interactive `/examples/atlas-acceptance`
page uses the public Dependency Forest reader with an application-owned worker.
It is a synthetic stress fixture, not a production analysis or reader study.

## Reference measurements

The [recorded report](../../benchmarks/setup/network-atlas-performance.json)
contains input and complete prepared-evidence hashes, source revision and digest,
hardware/runtime, sample counts, matching output sizes, and browser samples.
Reference: Apple M3 Pro, macOS/arm64, Node 22.22.1. The synchronous measurements
exclude fixture construction, hashing, rendering and worker transfer. Each phase
has an untimed warm-up; the merged baseline has three samples and the candidate
has five. With so few kernel samples, p95 is only the largest sampled value.

| Workload | Phase | Merged baseline median | Indexed median |
| --- | --- | ---: | ---: |
| 1k vertices / 5k edges / 20 bands | Preparation | 214.7 ms | 7.1 ms |
| 10k vertices / 50k edges / 20 bands | Preparation | 20,077.8 ms | 71.2 ms |
| 10k vertices / 50k edges / 20 bands | Motif matching | 20,016.8 ms | 26.3 ms |
| 10k vertices / 50k edges / 20 bands | Dependency projection | 39.5 ms | 31.2 ms |

Input and prepared-evidence hashes agree with the merged baseline at both sizes.
The structure workload emits 10,000 fan-out and 10,000 fan-in matches, occupying
10,644,977 JSON bytes. Separate probes cover long chains, 9,999-neighbor fans
with full and 32-neighbor witnesses, and 1k/10k repeated episodes. The report
lists every emitted template: fan-in also emits leaf-to-hub serial chains, and
the existing chain catalog includes overlapping source/successor chains.
These are whole-catalog timings on different inputs, not isolated internal
function timings or a claim of constant matching cost for arbitrary output.

The browser run used headless Chromium 149, a 1280×900 viewport and DPR 1 on the
same reference machine. Fifty selections after three warm-ups measured **30.8 ms
median / 36.8 ms p95**, meeting the **under 50 ms p95** target on this run.
The probe scrolls the overview into view before starting. Each sample waits for
two animation frames after selection to include React,
canvas painting and browser scheduling. All 397 glyphs are drawn on a scrollable
2400×1400 canvas; the viewport shows a subset at a time. This measures selections
within an already-open region. Opening another region rebuilds its bounded
drawing and is correctness-tested, but is not included in that latency claim.
It is not an input-event/scanout latency measurement or a real-phone result.

The slow preparation came from scanning every edge repeatedly for each motif
vertex and witness. One input-order-preserving adjacency, edge-pair and section
index now serves the matching pass. Ledger node classification uses a set;
collapsed-branch rendering indexes nodes and hidden edge/count ownership once.
Parallel edge IDs, self-loops, section support, entity semantics and witness
truncation retain their existing behavior.

## Executable correctness

`npm run check:network-atlas-acceptance` runs the independent Python fixtures,
strict types for the lab/worker/benchmarks, existing Atlas tests and the new
acceptance tests. Ordinary CI also discovers the tests and checks the new
documentation types. The table maps the proposal's adversarial cases to tests
under `src/components/recipes/atlas/` unless another directory is named.

| Acceptance case | Executable coverage |
| --- | --- |
| Shared middle state cannot create an observed route | `atlas.counterexamples.test.ts`, `atlas.braid.test.ts` |
| Overlapping motifs cannot multiply unique entities | `atlas.counterexamples.test.ts`, `atlas.braid.test.ts` |
| Section-crossing motifs and missing prehistory | `atlas.kernel.test.ts`, `atlas.counterexamples.test.ts`, `atlas.braid.test.ts` |
| Large fan output and disclosed witness limits | `scripts/network-atlas/acceptance.test.tsx` |
| Backbone order preserves full graph facts | `atlas.kernel.test.ts`, `dependencyAnalysis.test.ts`, `acceptance.test.tsx` |
| Bypass addition/removal and zero capacity | `dependencyAnalysis.test.ts`, `atlas.public.test.tsx` |
| AND prerequisites differ from ordinary reachability | `dependencyAnalysis.test.ts`, `flowCircuit.test.ts` |
| Attempt/root units and nonconserving ETL records | `flowCircuit.test.ts`, `atlas.validate.test.ts` |
| Particle budget, seed, resize and replay invariance | `FlowCircuitChart.test.tsx`, `flowCircuit.test.ts` |
| Obsolete worker results cannot publish | `docs/src/pages/examples/atlas-evaluation/workerClient.test.ts` and the lab browser test |
| Unknown upstream/queue evidence remains unknown | `atlas.validate.test.ts`, `atlas.integration.test.tsx`, `atlas.public.test.tsx` |
| Static, keyboard, observer and serialized readings | `atlas.integration.test.tsx`, `atlas.public.test.tsx`, reader SSR tests and lab CSR/SSR tests |

The new workload tests compare complete prepared-evidence hashes with the merged
implementation. An operation-count guard bounds edge reads without depending on
CPU speed. At 10k vertices, the layout test accounts for every original edge
exactly once as painted or internal to a collapsed region; every hidden vertex
also has an owner. Visual compression never filters the source graph or ledger.

## Interactive and accessible reading

The lab switches 1k/10k workloads, witness budgets and display backbone order.
Each request owns a worker; replacement, cancellation and unmount terminate it,
and both generation and worker identity guard publication. Preparation failures
offer retry. Region/vertex selection and hover do not request preparation.

Native controls and chart keyboard activation share selection. Canonical IDs
flow through linked selection and `ObservationReadout`. The exact vertex table
and original-edge disclosure work on phones without a scaled-down diagram.
JSON exports carry the complete prepared artifact, selected revision and timing
record. SVG exports preserve labels, hidden-edge counts, source totals,
limitations, selection and the current theme. Hidden tabs or unmount cancel an
unfinished timing run instead of publishing partial samples.

## Reader benefit remains a separate acceptance

No human diagnosis-time, learning or causal-interpretation result is asserted.
Before claiming the proposal's 20% faster diagnosis target:

1. Compare each of the five synthetic tasks separately, with equal information
   and training. Use ProcessSankey plus outcome tables for Braid, a filtered
   layered graph plus dependency table for X-Ray, and existing process charts
   plus queue metrics for Circuit.
2. Counterbalance task/chart order and use matched task variants. Retain time to
   a supported diagnosis, numerical and route accuracy, unknown identification,
   alternative interpretation, verification action and unsupported causal claims.
3. Include sections-only, sections+motifs, sections+forest and all-three variants.
   Record collapse/expansion errors and training time. Keep any task where a
   simpler baseline wins in the report.
4. Agree the recruitment, stopping and analysis protocol before collecting data.
   Report the 20% median-time target per task with no loss of numerical accuracy
   and no increase in unsupported claims. Manual assistive-technology review and
   real mobile-device timing remain separate, unmeasured work.

## Reproduce

```sh
npm run check:network-atlas-acceptance
npx playwright test --config playwright.docs-examples.config.ts integration-tests/docs-examples-atlas-acceptance.spec.ts
npm run bench:network-atlas -- --out /tmp/atlas-performance.json
npx vitest bench --run benchmarks/unit/network-atlas.bench.ts
```

The browser test saves `atlas-selection-performance.json` in its Playwright
output directory. Pass that file with `--selection-report <path>` to include it
in a kernel report. `--compare <baseline.json>` accepts only identical fixture
and prepared-evidence hashes. Capture comparisons on the same hardware/runtime;
do not treat the committed desktop timings as portable CI limits. The existing
PR benchmark runner copies the workload manifest into its baseline checkout.

Wall-clock performance is reported against the product target, while CI blocks
on evidence, operation counts, rendering and lifecycle regressions. No bundle
or correctness limits are relaxed for these optimizations.

## Related-surface audit and verification

The repeated-scan audit covered all four motif matchers, node/section/global
ledger classification and collapsed-branch ownership. Equivalent public Core
and lazy recipe imports, React readers, Node/edge SVG renderers and packed
ESM/CommonJS consumers remain compatible. Existing multigraph, self-loop,
unknown-evidence and entity-count tests passed; all prepared evidence and
reviewed Atlas screenshots were preserved.

Completed checks for this phase:

- `check:network-atlas-acceptance`: 14 independent evidence fixtures, strict
  lab/worker/benchmark TypeScript, and 205 Atlas/acceptance tests passed.
- Three lab browser tests passed: real module workers, replacement requests,
  keyboard selection, observation, canvas redraw, no preparation on selection
  or hover, light/dark axe audits, phone support tables and JSON/SVG exports.
  Desktop and mobile screenshots were reviewed.
- All 39 existing Atlas CSR/SSR comparisons passed on Chromium, Firefox and
  WebKit on macOS without changing snapshots or tolerances.
- The performance recorder and all 12 Vitest benchmarks completed. Source/test
  TypeScript, touched-file ESLint, custom lints, file-size checks, documentation
  registry/source/architecture tests and 18 cold-consumer helper tests passed.
- Production build, API surface, packed consumers, MCP bundle freshness and
  existing entry/combined-import bundle budgets passed. The preparation named
  import gains 210 raw bytes / 45 gzip bytes for indexing; no budget increased.
- The documentation build prerendered 351 pages; route, asset-size, protected
  boundary and LLM-document freshness checks passed.
- Cold-consumer measurements were regenerated and checked for all 37 exports.
  Task verification reran 14 source assertions and six browser tests before
  refreshing the receipt and task packets. Adoption inventory was regenerated;
  both freshness checks passed. No model or adoption-outcome result is claimed.

No full release suite, Linux screenshot run, manual screen-reader review or
real-phone performance measurement was performed in this phase.

## Acceptance review follow-up

The reachability gate now requires an explicit analysis and an exact partition
of source vertex IDs. Duplicate, overlapping, foreign and missing IDs fail,
including duplicates that previously concealed a missing vertex. The related
edge-ledger audit found that converting arrays to sets concealed duplicate
entries there too; both gates now use the same exact-partition check. The core
projection's existing edge-coverage assertion already rejects those duplicates.

The lab passes its selected ranking policy to `prepareDependencyForest`, and
its reported policy comes from the projection used by the chart. Tests verify
changed backbone membership, vertex order, canvas drawing and exported SVG
label positions, plus an ascending/descending/ascending browser round trip.
Original graph data, stock, motifs and declared-root analysis remain consistent.
Both workload sizes render through React SSR and static SVG in both orders.

The ranking audit covered projection calls in the library, stories, lab,
inspector, benchmark, chart documentation and packed-consumer fixture. Supplier
stories explicitly pass the policy, and circuit preparation forwards it. The
circuit inspector uses its projection only for the original-edge matrix, whose
rows follow the circuit's supplied order. Benchmark and introductory examples
use the public ascending default. No other ranking fix was needed.

Verification for these review fixes:

- Seven focused regressions reproduced the defects before the fixes.
- `check:network-atlas-acceptance` passed 14 independent fixtures, strict
  lab/worker/benchmark types and all 232 tests, including CSR/SSR preparation
  and serialized SVG coverage.
- All three lab Playwright tests passed, covering actual workers, reversed
  drawing and JSON exports, keyboard selection, light/dark accessibility audits
  and mobile SVG export.
- Touched-file ESLint, custom lints and file-size checks passed. The file-size
  gate retains its pre-existing `StreamPhysicsFrame.tsx` growth warning.
- `check:website-build:from-dist` prerendered 351 pages and passed route, asset
  budget and protected-boundary checks. Task-packet and adoption-output
  freshness checks passed without regenerating their committed artifacts.
