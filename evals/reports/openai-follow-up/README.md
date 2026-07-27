# Post-merge OpenAI evaluation follow-up

This report preserves three repeated, targeted trials run after the MCP
validation work merged on 2026-07-27. It tests the fixture revisions
`semiotic-first-try-2026-07-27-contracts` and
`semiotic-grounding-2026-07-27-source-facts` against `gpt-5.6-sol`,
`gpt-5.6-terra`, and `gpt-5.6-luna`.

The follow-up does not replace the complete 516-request baseline. It repeats the
cases changed by the implementation work:

- seven first-attempt generation fixtures that failed for at least one model in
  the baseline;
- all twenty answerable grounding questions;
- all three grounding conditions, so PNG-only remains an internal control.

The source of truth is [`summary.json`](./summary.json). The three trial
directories retain parsed proposals, answers, usage records, model IDs, fixture
revisions, response hashes, and resumable request ledgers. They do not retain
credentials, project IDs, prompts, or raw provider response bodies.

## Run ledger

| Trial | Requests | Estimated cost |
| --- | ---: | ---: |
| `postmerge-a` | 201 | $0.85890704 |
| `postmerge-b` | 201 | $0.55227145 |
| `postmerge-c` | 201 | $0.54865520 |
| **Total** | **603** | **$1.95983369** |

Each trial contains 21 generation outcomes and 180 grounding outcomes. The
runner used concurrency two after the complete baseline showed that higher
concurrency could exhaust Luna's token-per-minute allowance.

## First-attempt generation

| Model | Passing targeted proposals | Pass rate |
| --- | ---: | ---: |
| Sol | 21/21 | 100% |
| Terra | 21/21 | 100% |
| Luna | 19/21 | 90.5% |
| **All models** | **61/63** | **96.8%** |

Six fixtures passed all nine model/trial combinations:

- `line-push`
- `scatter-push`
- `bubble-static`
- `symbol-map-static`
- `galton-static`
- `unit-pile-push`

`gauge-static` passed 7/9. Luna chose the documented `BigNumber` component in
all three trials. Trial A validated and rendered with native evidence. Trials B
and C added the unsupported chart-HOC prop `accessibleTable` (`true` and
`false`, respectively), so validation correctly rejected both proposals.

This closes the original BigNumber render-evidence gap and Luna's empty
GaugeChart failure. The remaining miss is narrower: a model sometimes applies a
common HOC accessibility prop to a value component despite the component
contract explicitly excluding it. The result must remain a failure; accepting
or silently stripping the prop after the fact would weaken the first-attempt
measure.

## Answerable grounding

Every cell contains 60 outcomes: twenty questions repeated across three trials
for one model.

| Model | PNG only | PNG + grounding | Grounding only |
| --- | ---: | ---: | ---: |
| Sol | 47/60 (78.3%) | 60/60 (100%) | 60/60 (100%) |
| Terra | 48/60 (80.0%) | 60/60 (100%) | 60/60 (100%) |
| Luna | 44/60 (73.3%) | 60/60 (100%) | 60/60 (100%) |
| **All models** | **139/180 (77.2%)** | **180/180 (100%)** | **180/180 (100%)** |

The PNG-only control remained close to the complete baseline's one-response
answerable split of 47/60. The revised grounding payload recovered every
targeted answerable lookup in both conditions that supplied it.

This is evidence for the new source-fact projection on these twenty fixtures,
not a general chart-literacy claim. The follow-up deliberately omitted the
thirty unanswerable questions because that payload behavior did not change.
Therefore it does not update the baseline's abstention result or its complete
overall score.

Four PNG-only questions failed all nine model/trial combinations:

- `request-flow/failed`
- `storage-tree/largest`
- `storage-tree/backups`
- `galton-values/range`

All four passed 18/18 when grounding was present. This is the intended
information boundary: exact observed facts absent or difficult to recover from
pixels are explicit in the reader payload.

## Interpretation

The post-merge evidence supports two scoped conclusions:

1. The revised serialized formatter, push, geo, physics, and render-evidence
   contracts resolved the original targeted failures for Sol and Terra and six
   of seven fixtures across every model and trial.
2. The source-fact grounding revision recovered the tested answerable lookups
   consistently without changing the PNG-only control.

It also leaves one concrete follow-up: make the HOC/value-component boundary
harder to misread in constrained generation contexts, then retest
`gauge-static` under a new fixture revision. The current 7/9 result should not
be rewritten in place.
