# Realtime ingestion and readout audit

Measured against `3db480d84` on an Apple M3 Pro, macOS arm64, Node 22.22.1,
Vitest 4.1.11. Both runs use the six workloads in
`benchmarks/unit/realtime-aggregation.bench.ts`. The baseline classes were
bundled from that commit into a temporary module; the candidate imports the
working source. Runs were sequential, without concurrent builds or tests.

These are local microbenchmarks of ingestion and statistics, not browser frame
rates. Values are mean milliseconds per complete workload. Relative margins of
error were below 1% in both runs.

| Workload | Before (ms) | After (ms) | Speedup |
| --- | ---: | ---: | ---: |
| Session: 20,000 events, quantiles and distinct keys | 322.63 | 1.89 | 171× |
| Tumbling: 20,000 windows, retain 1,000 | 181.14 | 2.76 | 66× |
| Reorder: 20,000 events, 10,000-unit grace interval | 364.57 | 2.00 | 182× |
| T-digest: 3,000 quantile reads | 29.57 | 1.14 | 26× |
| HyperLogLog: 3,000 additions with a count after each | 45.37 | 0.128 | 353× |
| Emit 100 windows with quantiles and distinct counts | 1.05 | 0.056 | 19× |

Run the candidate workload with:

```sh
npx vitest bench benchmarks/unit/realtime-aggregation.bench.ts --run --outputJson realtime.json
```

For a fresh comparison, apply the same benchmark file to the baseline checkout,
or use the repository's `bench:pr-vs-main -- --baseline-ref=3db480d84` runner,
which overlays the candidate benchmark manifest onto the baseline runtime.

The changes remove repeated work:

- A stable min-heap replaces rescanning the reorder buffer on every arrival.
  Event time is captured once; equal timestamps retain arrival order.
- A min-heap evicts the oldest fixed windows without sorting all retained
  windows. Already-expired late windows do not allocate fresh sketches.
- Ordered session arrivals update the existing bucket. Late arrivals locate
  the matching session by binary search and merge adjacent sessions in place.
- T-digest batches pending observations independently of compressed centroid
  count, compacts owned centroids in place, and reuses compressed state on
  repeated reads.
- HyperLogLog maintains the harmonic sum and empty-register count when a
  register changes, so a read no longer scans all registers.

The related-surface audit covers late drop/keep policies, equal timestamps,
explicit flush boundaries, clear/reuse, hopping and tumbling retention,
backdated session bridges, merge/clone isolation, percentile accuracy, and
React/SSR percentile and distinct readouts. Regression tests also cover
150,000-event releases, large digest merges, and immediate aggregate
`getData()` reads during React batches.

Bundle cleanup keeps the full mutable validation API while generating compact
chart-name/text-prop metadata for accessibility auditing. Validation decoding is
a pure factory, so consumers that do not request validation can remove its
catalog. Chart names are shared between the two generated representations.
The combined AI + XY + network + geo + realtime consumer decreased from
399,353 to about 393,350 gzip bytes (5.9 KiB). All entry graphs and the combined
consumer pass the existing bundle budgets.

Verification on the final implementation:

- The source regression selection covering realtime, chart helpers, server
  rendering, AI, chart-spec round trips, and validation passed 2,886 tests
  across 181 files. Focused accumulator tests also passed after the final
  session and register-rank cleanup.
- The realtime and streaming browser specs passed all 30 Chromium checks,
  including the 150,000-event release and immediate aggregate readout.
- Both MCP protocol suites passed all 52 tests.
- Source and test TypeScript checks, repository preflight (including lint,
  custom lints and generated-contract checks), the production build, API
  surface comparison, package contract gates, packed consumer smoke tests,
  and documentation production build passed.
- Task-packet checks and adoption-eval tests/freshness passed. Task packets
  were regenerated before the adoption inventory to preserve its hashes.

The public API surface is unchanged. These checks are the scoped audit;
the complete release suite and cross-browser matrix were not run.
