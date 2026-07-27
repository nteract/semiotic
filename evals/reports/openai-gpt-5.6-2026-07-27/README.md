# OpenAI GPT-5.6 compatibility run — 2026-07-27

Status: complete.

This is the first live-model run of Semiotic's prove-track evaluations. It
contains one response per fixture and condition, so the results are descriptive
compatibility evidence rather than an estimate with repeated-trial confidence
intervals.

## Run

- Models: `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`; requested and
  resolved model IDs matched.
- Requests: 516 total, 172 per model.
- Grounding: 50 questions × 3 evidence conditions = 150 requests per model.
- First try: 22 generation requests per model; no repair pass.
- Settings: Responses API, `reasoning.effort: "none"`, `store: false`.
- Context: `CLAUDE.md` and `docs/public/llms.txt`.
- Fixture revisions: `semiotic-grounding-2026-07-26` and
  `semiotic-first-try-2026-07-26`.
- Grounding scorer: `semiotic-grounding-score-2026-07-27`.
- Client/rates: `semiotic-openai-eval/1`,
  `openai-standard-2026-07-26`.
- Duration: 17 minutes, including one resumable Luna TPM-limit pause.
- Estimated standard-tier cost: $2.27921653 against a $10 ceiling.

The per-model result files retain the parsed proposals and answer strings needed
for scoring. The run manifest retains response IDs, token usage, latency, cost
estimates, and SHA-256 hashes of raw outputs. None of the reports retain the API
credential, project ID, prompts, images, grounding payload bodies, or raw API
response bodies.

## First-try generatability

The score requires a valid configuration, non-empty render evidence, and no
error diagnostics on the model's first proposal.

| Model | Passed | Rate | Failed fixtures |
| --- | ---: | ---: | --- |
| Sol | 21/22 | 95.5% | `gauge-static` |
| Terra | 17/22 | 77.3% | `line-push`, `scatter-push`, `bubble-static`, `symbol-map-static`, `unit-pile-push` |
| Luna | 17/22 | 77.3% | `line-push`, `gauge-static`, `symbol-map-static`, `galton-static`, `unit-pile-push` |

Sol selected the real, documented `BigNumber` component, but the server
render-evidence oracle does not support it. This is a surface seam, not a
fabricated component.
Terra's two XY failures exposed a serializability/behavior ambiguity: it supplied
string `xFormat` values where the render path expected formatter functions.
Across Terra and Luna, the repeated failures otherwise cluster around required
or unsupported props for push, geo, and physics charts. Luna selected the
correct `GaugeChart`, but its proposal rendered empty.

## Reader grounding

Each cell reports total passes out of 50, followed by the answerable and
unanswerable split. Every condition contained 20 answerable and 30
deliberately unanswerable questions.

| Model | PNG only | PNG + grounding | Grounding only |
| --- | ---: | ---: | ---: |
| Sol | 43/50 (16/20 + 27/30) | 45/50 (15/20 + 30/30) | 42/50 (12/20 + 30/30) |
| Terra | 45/50 (16/20 + 29/30) | 45/50 (15/20 + 30/30) | 42/50 (12/20 + 30/30) |
| Luna | 44/50 (15/20 + 29/30) | 44/50 (15/20 + 29/30) | 41/50 (12/20 + 29/30) |

Adding `buildReaderGrounding` improved Sol by two answers (four percentage
points) and tied PNG-only for Terra and Luna. The gain was entirely
hallucination control: compared with PNG-only, the combined condition answered
one fewer answerable question for Sol and Terra, while correctly abstaining on
three more unanswerable questions for Sol and one more for Terra. Luna's split
was unchanged.

Grounding alone was worse overall than PNG-only and reduced answerable passes
from 16 to 12 for Sol and Terra and from 15 to 12 for Luna. Its strong
abstention scores partly hide that reading loss in the aggregate totals.

The result supports a narrow claim that structured grounding can improve
abstention for some models. It does not support the stronger claim that this
payload closes an answerable chart-reading gap.

### Scorer audit

Before publication, a manual audit of every PNG-only/combined score change
found three defects in the original lexical scorer: passive limitations such as
“cannot be determined” were missed, answerable abstentions could receive credit
merely for repeating the expected label, and numeric expectations used unsafe
substring matches. The scorer now recognizes explicit evidence limitations,
rejects abstentions on answerable questions, matches numeric terms at token
boundaries, and carries the revision above. Regression tests pin those cases.
The same model outputs were rescored; no requests were repeated.

The corrected paired changes are semantically coherent. Sol gained correct
abstentions on a forecast, incident severity, and funnel cohort question but
lost the Galton observed-row count. Terra gained a causal abstention and lost
the same Galton count. Luna had no PNG-only/combined score changes.

## Cost and latency

| Model | Requests | Estimated cost | Average latency | Max latency |
| --- | ---: | ---: | ---: | ---: |
| Sol | 172 | $1.42168725 | 1,854 ms | 6,265 ms |
| Terra | 172 | $0.63749808 | 1,308 ms | 3,286 ms |
| Luna | 172 | $0.22003120 | 1,208 ms | 3,895 ms |

Each model consumed 662,353 input tokens. Cache behavior differed by run order:
Sol reported 496,812 cached and 96,797 cache-write tokens; Terra 522,960 and
70,649; Luna 549,407 and 44,202. Cost figures are runner estimates from the
locked rate table, not an OpenAI billing ledger.

## Evidence-led follow-up

1. Inspect `buildReaderGrounding` for the answerable lookups lost in the
   combined and payload-only conditions, especially value, hierarchy, and
   physics projections. Revise the payload before making a reception claim.
2. Add schema behavior metadata and AI-facing examples for serializable
   formatting, push data, geo inputs, physics modes, and value-chart selection;
   then publish a new fixture revision before rerunning.
3. Add repeated trials only after a payload revision. This single-response
   baseline is sufficient to find contract failures, not to estimate small
   model differences precisely.

The per-model compatibility reports are the scored source of truth:

- [`gpt-5.6-sol/compatibility-report.json`](./gpt-5.6-sol/compatibility-report.json)
- [`gpt-5.6-terra/compatibility-report.json`](./gpt-5.6-terra/compatibility-report.json)
- [`gpt-5.6-luna/compatibility-report.json`](./gpt-5.6-luna/compatibility-report.json)

Request-level usage and hashes are in
[`run-manifest.json`](./run-manifest.json).
