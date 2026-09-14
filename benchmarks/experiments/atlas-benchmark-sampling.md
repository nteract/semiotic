# Atlas benchmark sampling investigation

The [failing CI comparison](https://github.com/nteract/semiotic/actions/runs/34907694182/job/104188059991)
compared candidate `f7cc40719` with main `e10998e4f` on Node v22.23.2.
The evidence points to insufficient sampling rather than a matcher regression.

## Evidence

The matcher, its two runtime dependencies (`ids.ts` and `types.ts`), the Atlas
fixtures, benchmark definition, test configuration/setup, and dependency lock
are unchanged between those revisions. Bundling `motifs.ts` from both checkouts
produced identical JavaScript, with SHA-256
`8f33626853fd9c5a2e7ab595ff37bf717df71ed9c5dcda6071d9415816997905`.
The React mount changes do not enter this matcher graph.

All 12 Atlas benchmarks used three timed iterations after one warm-up iteration,
with both time windows disabled. CI reported:

| Benchmark | Main mean | Candidate mean | Main relative margin of error | Candidate relative margin of error |
| --- | ---: | ---: | ---: | ---: |
| `match-serial-chain-1000-full` | 1.696 ms | 3.717 ms | 4.09% | 60.05% |
| `match-repeated-state-episode-1000-full` | 2.045 ms | 6.092 ms | 131.85% | 45.52% |
| `match-fan-in-10000-full` | 40.654 ms | 28.463 ms | 87.68% | 15.40% |

The apparent fan-in improvement is subject to the same measurement problem.
Three local before pairs, alternating checkout order in fresh Vitest processes,
also showed large uncertainty: a serial-chain capture had 116.49% relative
margin of error, and a repeated-state capture had 211.46%. The exact cause of
each timing spike was not profiled; these measurements cannot attribute it to
GC, JIT compilation, or scheduling individually.

## Change and verification

Every Atlas case now measures for at least 1,000 ms and 30 samples, following
at least 200 ms and 10 warm-up iterations. The minimum count also covers the
slower 10,000-node preparation case. The benchmark bodies and fixtures are
unchanged. The gate retains its 1 ms floor, 25% warning threshold, and 100%
single-case failure threshold. No committed timing baseline was refreshed.

Three further pairs used the updated benchmark manifest on both revisions,
in the order main/head, head/main, main/head. All 72 case captures had at least
30 samples and 1,000 ms of timed work. All 36 paired comparisons were below
the 25% warning threshold, including cases below the gate's 1 ms floor; the
largest increase was 10.04%.

| Benchmark | Samples per capture | Relative margin of error | Candidate change across the three pairs |
| --- | ---: | ---: | --- |
| `match-serial-chain-1000-full` | 1,504–1,681 | 0.60–1.71% | +0.98%, +7.22%, +1.06% |
| `match-repeated-state-episode-1000-full` | 2,681–3,000 | 1.83–2.80% | −5.72%, +6.13%, +8.90% |
| `match-fan-in-10000-full` | 76–87 | 4.08–4.77% | −1.43%, +9.62%, +8.17% |

Across all 12 cases, the largest after margin of error was 6.14%. These local
results use macOS/arm64, Node v22.22.1, and Vitest 4.1.11; their absolute times
are not comparable to the Linux CI times above.

Verification passed:

- Six before and six after captures of
  `npx vitest bench --run benchmarks/unit/network-atlas.bench.ts` with
  `--outputJson`. The after captures were checked for exact case membership,
  at least 30 samples, and at least 1,000 ms of timed work.
- `node --test scripts/bench-manifest.test.mjs scripts/bench-results.test.mjs`:
  six tests passed, covering manifest overlay, missing/non-finite measurements,
  sample counts, and comparison membership.
- `npx eslint benchmarks/unit/network-atlas.bench.ts`.
- `npm run bench:pr-vs-main -- --baseline-ref=e10998e4f`: all 202 benchmarks
  were valid on both revisions, with exact membership and no catastrophic
  regressions. One informational warning remained:
  `numeric-profile-100k-without-quartiles`, 8.89 ms to 11.58 ms (+30.3%);
  the systemic-warning count was 1 of 5.
- `git diff --check`.
